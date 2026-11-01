import { pseudonymizeChat } from '@spammy/analysis';
import { AwardSchema } from '@spammy/domain';

import { judgeSealedAwards } from './awards';

import type { Award, Show } from '@spammy/domain';
import type { AwardDependencies } from './awards';

/** validates edited awards against the included source messages before persistence */
export function validateShowAwards(show: Show): void {
  prepareShowAwards(show);
}

/** privately resolves newly added or resealed awards using only sanitized evidence */
export async function judgeShowAwards(
  show: Show,
  dependencies?: AwardDependencies,
): Promise<Award[]> {
  const prepared = prepareShowAwards(show);
  const pending = prepared.awards.filter(
    (award) => award.decision === 'sealed' && award.winnerId === null,
  );
  if (pending.length === 0) return show.awards;
  const judged = await judgeSealedAwards(pending, dependencies);
  const winners = new Map(judged.map((award) => [award.id, award.winnerId]));
  return show.awards.map((award, index) => {
    const winner = winners.get(`A${index + 1}`);
    return winner ? { ...award, winnerId: prepared.participantIds[winner]! } : award;
  });
}

/** verifies local evidence and constructs a detached pseudonymous judging request */
function prepareShowAwards(show: Show): {
  awards: Award[];
  participantIds: Record<string, string>;
} {
  if (!show.chat) throw new TypeError('award verification requires a chat');
  const chat = show.chat;
  const options = {
    includedParticipantIds: show.cast.map((person) => person.participantId),
    aliases: Object.fromEntries(
      chat.participants.map((person) => [
        person.id,
        [
          person.id,
          ...show.cast
            .filter((member) => member.participantId === person.id)
            .map((member) => member.displayName),
        ],
      ]),
    ),
  };
  const safe = pseudonymizeChat(chat, options);
  const safeIds = new Map(
    Object.entries(safe.participantIds).map(([pseudonym, id]) => [id, pseudonym]),
  );
  const messages = new Map(
    safe.chat.messages
      .filter(
        (message) =>
          show.settings.range === null ||
          (message.sentAt.slice(0, 10) >= show.settings.range.from &&
            message.sentAt.slice(0, 10) <= show.settings.range.to),
      )
      .map((message, index) => [message.id, { ...message, remoteId: `M${index + 1}` }]),
  );
  const protect = (text: string): string =>
    pseudonymizeChat(
      {
        ...chat,
        messages: [
          { id: 'text', authorId: null, text, sentAt: '2026-01-01T00:00:00', kind: 'text' },
        ],
      },
      options,
    ).chat.messages[0]!.text;
  if (new Set(show.awards.map((award) => award.id)).size !== show.awards.length)
    throw new TypeError('award ids must be unique');
  const awards = show.awards.map((value, index) => {
    const award = AwardSchema.parse(value);
    if (
      new Set(award.nominees.map((nominee) => nominee.participantId)).size !== award.nominees.length
    )
      throw new TypeError('nominees must be unique');
    if (
      award.winnerId !== null &&
      !award.nominees.some((nominee) => nominee.participantId === award.winnerId)
    )
      throw new TypeError('winner must be a nominee');
    if (award.decision === 'host-picked' && award.winnerId === null)
      throw new TypeError('host-picked award requires a winner');
    const nominees = award.nominees.map((nominee) => {
      const participantId = safeIds.get(nominee.participantId);
      const message = messages.get(nominee.receiptMessageId ?? '');
      if (
        !participantId ||
        !message ||
        message.authorId !== participantId ||
        protect(nominee.quote) !== message.text
      )
        throw new TypeError('nominee evidence does not match an included message');
      return {
        ...nominee,
        participantId,
        stat: protect(nominee.stat),
        quote: message.text,
        receiptMessageId: message.remoteId,
      };
    });
    if (award.receipts.length === 0) throw new TypeError('award requires verified receipts');
    const receipts = award.receipts.map((receipt) => {
      const authorId = safeIds.get(receipt.authorId);
      const message = messages.get(receipt.messageId);
      if (
        !authorId ||
        !message ||
        message.authorId !== authorId ||
        protect(receipt.quote) !== message.text ||
        receipt.sentAt !== message.sentAt
      )
        throw new TypeError('receipt does not match an included message');
      return { ...receipt, messageId: message.remoteId, authorId, quote: message.text };
    });
    return {
      ...award,
      id: `A${index + 1}`,
      title: protect(award.title),
      showName: protect(award.showName),
      howJudged: protect(award.howJudged),
      nominees,
      receipts,
      winnerId: award.winnerId === null ? null : safeIds.get(award.winnerId)!,
    };
  });
  return { awards, participantIds: safe.participantIds };
}
