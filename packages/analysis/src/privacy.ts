import { ParsedChatSchema } from '@spammy/domain';

import type { ParsedChat } from '@spammy/domain';

/** local exclusions and known alternative names */
export interface PseudonymizeChatOptions {
  /** eligible participant ids; omitted means every participant */
  includedParticipantIds?: readonly string[];
  /** individual messages omitted by the host */
  excludedMessageIds?: readonly string[];
  /** participant id to alternative names used inside messages */
  aliases?: Readonly<Record<string, readonly string[]>>;
}

/** safe model input with reverse mappings retained on the laptop */
export interface PseudonymizedChat {
  /** chat containing only pseudonyms and redacted contact details */
  chat: ParsedChat;
  /** pseudonym to display name, never sent to a model */
  aliases: Record<string, string>;
  /** pseudonym to original participant id, never sent to a model */
  participantIds: Record<string, string>;
}

/**
 * replaces names and contact details while applying the host's exclusions
 * @param chat parsed export
 * @param options local inclusion and alias choices
 * @returns detached safe chat and local reverse mappings
 */
export function pseudonymizeChat(
  chat: ParsedChat,
  options: PseudonymizeChatOptions = {},
): PseudonymizedChat {
  const source = ParsedChatSchema.parse(chat);
  const includedIds = new Set(
    options.includedParticipantIds ?? source.participants.map((person) => person.id),
  );
  const excludedMessages = new Set(options.excludedMessageIds ?? []);
  const eligible = source.participants.filter((person) => includedIds.has(person.id));
  const aliases = Object.fromEntries(
    eligible.map((person, index) => [`P${index + 1}`, person.displayName]),
  );
  const participantIds = Object.fromEntries(
    eligible.map((person, index) => [`P${index + 1}`, person.id]),
  );
  const pseudonyms = new Map(eligible.map((person, index) => [person.id, `P${index + 1}`]));
  const names = source.participants.flatMap((person) =>
    [person.displayName, ...(options.aliases?.[person.id] ?? [])]
      .filter(Boolean)
      .map((name) => ({ name, replacement: pseudonyms.get(person.id) ?? '[excluded]' })),
  );
  const replacementByName = new Map(
    names.map(({ name, replacement }) => [name.toLocaleLowerCase(), replacement]),
  );
  const escapedNames = names
    .map(({ name }) => escapeRegExp(name))
    .sort((left, right) => right.length - left.length);
  const namePattern =
    escapedNames.length === 0
      ? null
      : new RegExp(`(?<![\\p{L}\\p{N}_])@?(?:${escapedNames.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  const redactText = (text: string): string => {
    const renamed =
      namePattern === null
        ? text
        : text.replace(
            namePattern,
            (name) =>
              replacementByName.get(name.replace(/^@/, '').toLocaleLowerCase()) ?? '[redacted]',
          );

    return renamed
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
      .replace(/\b(?:https?:\/\/|www\.)[^\s<>]+/gi, '[link]')
      .replace(/(?<![\p{L}\p{N}])\+?\d[\d ().-]{6,}\d(?![\p{L}\p{N}])/gu, '[phone]');
  };
  const messages = source.messages
    .filter(
      (message) =>
        !excludedMessages.has(message.id) &&
        (message.authorId === null || includedIds.has(message.authorId)),
    )
    .map((message) => ({
      ...message,
      authorId: message.authorId === null ? null : (pseudonyms.get(message.authorId) ?? null),
      text: redactText(message.text),
    }));
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (message.authorId !== null)
      counts.set(message.authorId, (counts.get(message.authorId) ?? 0) + 1);
  }

  return {
    aliases,
    participantIds,
    chat: {
      ...source,
      groupName: null,
      participants: eligible.map((person) => {
        const pseudonym = pseudonyms.get(person.id)!;

        return { id: pseudonym, displayName: pseudonym, messageCount: counts.get(pseudonym) ?? 0 };
      }),
      messages,
    },
  };
}

/**
 * escapes a display name for literal matching in a combined expression
 * @param text literal name
 * @returns regular expression source
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
