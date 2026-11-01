import { ShowSchema } from '@spammy/domain';

import { BRUNCH_CLUB_AWARDS, BRUNCH_CLUB_PEOPLE, BRUNCH_CLUB_SHOWS } from './brunch-club';

import type { Award, CostumeId, Show, ShowSettings } from '@spammy/domain';

const SAMPLE_COSTUMES: readonly CostumeId[] = [
  'cosmic-cape',
  'ivory-tuxedo',
  'scarlet-gown',
  'emerald-gown',
  'silver-jumpsuit',
  'royal-purple-cape',
];

/**
 * adapts the fictional design fixture into the shared show contract
 * @param settings host choices to preserve
 * @returns a fresh demo show
 */
export function createSampleShow(settings?: Partial<ShowSettings>): Show {
  const messages = BRUNCH_CLUB_AWARDS.flatMap((award) =>
    award.context.lines.map((line, index) => {
      const [authorId, time, ...text] = line.split('|');

      return {
        id: `${award.id}-${index}`,
        authorId: authorId === 'sys' ? null : (authorId ?? null),
        sentAt: `2026-${String(BRUNCH_CLUB_AWARDS.indexOf(award) + 1).padStart(2, '0')}-11T${time || '12:00'}:00`,
        text: text.join('|'),
        kind: authorId === 'sys' ? ('system' as const) : ('text' as const),
      };
    }),
  );
  const awards: Award[] = BRUNCH_CLUB_AWARDS.map((award) => ({
    id: award.id,
    showName:
      BRUNCH_CLUB_SHOWS.find((group) => group.awardIds.includes(award.id))?.name ?? 'The Spammys',
    title: award.title,
    howJudged: award.howJudged,
    nominees: award.nominees.map(([participantId, stat, quote]) => ({
      participantId,
      stat,
      quote,
      receiptMessageId: `${award.id}-${award.context.evidence}`,
    })),
    decision: 'sealed',
    winnerId: award.winnerId,
    receipts: messages
      .filter(
        (message) => message.id === `${award.id}-${award.context.evidence}` && message.authorId,
      )
      .map((message) => ({
        messageId: message.id,
        authorId: message.authorId!,
        quote: message.text,
        sentAt: message.sentAt,
      })),
  }));

  return ShowSchema.parse({
    id: 'sample-brunch-club',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    stage: 'draft',
    settings: {
      groupKind: 'Friends',
      persona: 'goldie',
      look: 'ivory',
      roastLevel: 'playful',
      range: null,
      ...settings,
    },
    chat: {
      format: 'iphone-txt',
      dateOrder: 'day-first',
      groupName: 'Brunch Club',
      messages,
      participants: BRUNCH_CLUB_PEOPLE.map((person) => ({
        id: person.id,
        displayName: person.raw,
        messageCount: person.messages,
      })),
    },
    cast: BRUNCH_CLUB_PEOPLE.map((person, index) => ({
      costumeId: SAMPLE_COSTUMES[index % SAMPLE_COSTUMES.length],
      id: person.id,
      participantId: person.id,
      displayName: person.name,
      photoAssetId: `/demo/faces/${person.id}.png`,
      face: null,
    })),
    groupPhotoAssetId: null,
    awards,
  });
}
