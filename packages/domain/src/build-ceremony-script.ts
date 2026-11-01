import { CeremonyScriptSchema } from './ceremony';
import { formatReceiptQuote } from './receipt-display';

import type { CeremonyScene, CeremonyScript } from './ceremony';
import type { Show } from './show';

/** builds the sample-capable ceremony timeline from decided awards without revealing sealed winners in setup */
export function buildCeremonyScript(show: Show): CeremonyScript {
  const hostName = `${show.settings.persona[0]?.toUpperCase()}${show.settings.persona.slice(1)}`;
  const awards = show.awards.map((award) => ({
    ...award,
    nominees: award.nominees.map((nominee) => ({
      ...nominee,
      quote: formatReceiptQuote(
        {
          messageId: nominee.receiptMessageId ?? '',
          authorId: nominee.participantId,
          quote: nominee.quote,
        },
        show,
      ),
    })),
    receipts: award.receipts.map((receipt) => ({
      ...receipt,
      quote: formatReceiptQuote(receipt, show),
    })),
  }));
  const groups = [...new Set(awards.map((award) => award.showName))];
  const beats: Omit<CeremonyScene, 'startSeconds'>[] = [
    {
      id: 'open',
      kind: 'open',
      durationSeconds: 7,
      line: `Good evening, and welcome to The Spammy. I'm ${hostName}, and I have read every single one of your messages. I'm so sorry.`,
    },
    ...groups.flatMap((showName, groupIndex) => [
      {
        id: `show-${groupIndex}`,
        kind: 'show' as const,
        durationSeconds: 4,
        showName,
        line: `Now presenting ${showName}. The most prestigious awards a group chat can give.`,
      },
      ...awards
        .filter((award) => award.showName === showName)
        .flatMap((award) => {
          const winner = show.cast.find((person) => person.participantId === award.winnerId);

          return [
            {
              id: `${award.id}-intro`,
              kind: 'intro' as const,
              durationSeconds: 4.5,
              showName,
              award,
              line: `The award for ${award.title}. ${award.howJudged}`,
            },
            {
              id: `${award.id}-noms`,
              kind: 'noms' as const,
              durationSeconds: 9,
              showName,
              award,
              line: `The nominees are… ${award.nominees
                .map((nominee) => {
                  const name =
                    show.cast.find((person) => person.participantId === nominee.participantId)
                      ?.displayName ?? nominee.participantId;
                  return `${name}. ${nominee.stat.replace(/[.!?]+$/u, '')}.`;
                })
                .join(' ')}`,
            },
            {
              id: `${award.id}-env`,
              kind: 'env' as const,
              durationSeconds: 6.5,
              showName,
              award,
              line: winner
                ? `And the award goes to ${winner.displayName}! The group chat will never let you forget this.`
                : 'The envelope, please. Your host is still deciding the winner.',
            },
          ];
        }),
    ]),
    {
      id: 'finale',
      kind: 'finale',
      durationSeconds: 9,
      line: "That's our show. Thank you for being this unwell in the group chat. See you next year.",
    },
  ];
  const scenes = beats.reduce<CeremonyScene[]>((previous, beat) => {
    const last = previous.at(-1);
    const durationSeconds = Math.max(beat.durationSeconds, beat.audioDurationSeconds ?? 0);

    return [
      ...previous,
      {
        ...beat,
        durationSeconds,
        startSeconds: last ? last.startSeconds + last.durationSeconds : 0,
      },
    ];
  }, []);
  const last = scenes.at(-1);

  return CeremonyScriptSchema.parse({
    showId: show.id,
    title: 'Who ate 2026?',
    persona: show.settings.persona,
    look: show.settings.look,
    cast: show.cast,
    scenes,
    durationSeconds: last ? last.startSeconds + last.durationSeconds : 7,
  });
}
