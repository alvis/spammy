import { describe, expect, it } from 'vitest';

import { buildCeremonyScript } from './build-ceremony-script';
import { ShowSchema } from './show';

const show = ShowSchema.parse({
  id: 'demo',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  stage: 'draft',
  settings: {
    persona: 'goldie',
    look: 'ivory',
    groupKind: 'friends',
    roastLevel: 'gentle',
    range: null,
  },
  chat: null,
  cast: [],
  groupPhotoAssetId: null,
  awards: [
    {
      id: 'a',
      title: 'Best',
      howJudged: 'Messages',
      showName: 'Friends',
      nominees: [{ participantId: 'p', stat: 'Most', quote: 'Hi', receiptMessageId: null }],
      decision: 'sealed',
      winnerId: 'p',
      receipts: [],
    },
  ],
});

describe('fn:buildCeremonyScript', () => {
  it('should build a contiguous show clock with an envelope and finale', () => {
    const script = buildCeremonyScript(show);

    expect(
      script.scenes.map(({ kind, startSeconds, durationSeconds }) => ({
        kind,
        startSeconds,
        durationSeconds,
      })),
    ).toEqual([
      { kind: 'open', startSeconds: 0, durationSeconds: 7 },
      { kind: 'show', startSeconds: 7, durationSeconds: 4 },
      { kind: 'intro', startSeconds: 11, durationSeconds: 4.5 },
      { kind: 'noms', startSeconds: 15.5, durationSeconds: 9 },
      { kind: 'env', startSeconds: 24.5, durationSeconds: 6.5 },
      { kind: 'finale', startSeconds: 31, durationSeconds: 9 },
    ]);
    expect(script.durationSeconds).toEqual(40);
  });
  it('masks other people and applies the speaker rename without changing source evidence', () => {
    const source = structuredClone(show);
    source.cast = [
      { id: 'c1', participantId: 'p', displayName: 'Alex', photoAssetId: null, face: null },
      { id: 'c2', participantId: 'q', displayName: 'Jamie', photoAssetId: null, face: null },
    ];
    source.chat = {
      format: 'android-txt',
      dateOrder: 'day-first',
      groupName: null,
      participants: [
        { id: 'p', displayName: 'Alice', messageCount: 1 },
        { id: 'q', displayName: 'Bob', messageCount: 0 },
      ],
      messages: [
        {
          id: 'm1',
          authorId: 'p',
          text: 'Alice invited Bob and Jamie',
          sentAt: '2026-01-01T00:00:00Z',
          kind: 'text',
        },
      ],
    };
    source.awards[0]!.nominees[0]!.quote = 'Alice invited Bob and Jamie';
    source.awards[0]!.nominees[0]!.receiptMessageId = 'm1';
    source.awards[0]!.receipts = [
      {
        messageId: 'm1',
        authorId: 'p',
        quote: 'Alice invited Bob and Jamie',
        sentAt: '2026-01-01T00:00:00Z',
      },
    ];
    const before = structuredClone(source);

    const script = buildCeremonyScript(source);

    for (const scene of script.scenes.filter((scene) => scene.award)) {
      expect(scene.award!.nominees[0]!.quote).toBe('Alex invited [name] and [name]');
      expect(scene.award!.receipts[0]!.quote).toBe('Alex invited [name] and [name]');
    }
    expect(script.scenes.find((scene) => scene.kind === 'noms')?.line).toBe(
      'The nominees are… Alex. Most.',
    );
    expect(source).toEqual(before);
  });
  it.todo('TODO(draft): covers multiple groups and host-picked winners');
});
