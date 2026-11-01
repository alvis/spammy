import type { AwardDependencies } from './awards';
import { describe, expect, it, vi } from 'vitest';

import { judgeShowAwards, validateShowAwards } from './awards-show';

import type { Show } from '@spammy/domain';

const show: Show = {
  id: 'show',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  stage: 'awards-ready',
  settings: {
    groupKind: 'friends',
    persona: 'goldie',
    look: 'ivory',
    roastLevel: 'gentle',
    range: null,
  },
  cast: [
    {
      id: 'cast-alice',
      participantId: 'alice-id',
      displayName: 'Ally',
      face: null,
      photoAssetId: null,
    },
  ],
  groupPhotoAssetId: null,
  chat: {
    format: 'android-txt',
    dateOrder: 'day-first',
    groupName: 'Alice private',
    participants: [{ id: 'alice-id', displayName: 'Alice', messageCount: 1 }],
    messages: [
      {
        id: 'private-message-id',
        authorId: 'alice-id',
        sentAt: '2026-01-01T01:00:00',
        text: 'Alice lol',
        kind: 'text',
      },
    ],
  },
  awards: [
    {
      id: 'private-award-id',
      title: 'Ally laughs',
      showName: 'Alice awards',
      howJudged: 'Ally laughs',
      decision: 'sealed',
      winnerId: null,
      nominees: [
        {
          participantId: 'alice-id',
          stat: 'Ally: one laugh',
          quote: 'Ally lol',
          receiptMessageId: 'private-message-id',
        },
      ],
      receipts: [
        {
          messageId: 'private-message-id',
          authorId: 'alice-id',
          quote: 'Ally lol',
          sentAt: '2026-01-01T01:00:00',
        },
      ],
    },
  ],
};

describe('fn:judgeShowAwards', () => {
  it('should resolve an added sealed award privately and preserves host-picked winners', async () => {
    const run = vi.fn<AwardDependencies['runner']['run']>(async () => ({
      finalOutput: { winners: [{ awardId: 'A1', participantId: 'P1' }] },
    }));
    const input: Show = {
      ...show,
      awards: [
        ...show.awards,
        { ...show.awards[0]!, id: 'host', decision: 'host-picked', winnerId: 'alice-id' },
      ],
    };
    const result = await judgeShowAwards(input, { runner: { run } });
    expect(result.map((award) => award.winnerId)).toEqual(['alice-id', 'alice-id']);
    expect(input.awards[0]!.winnerId).toBeNull();
    const request = run.mock.calls[0]![1];
    expect(request).toContain('P1 lol');
    for (const privateText of [
      'Alice',
      'Ally',
      'alice-id',
      'private-message-id',
      'private-award-id',
    ])
      expect(request).not.toContain(privateText);
    expect(run).toHaveBeenCalledOnce();
  });
  it('should reject forged evidence before a remote request', async () => {
    const run = vi.fn<AwardDependencies['runner']['run']>();
    const forged = {
      ...show,
      awards: show.awards.map((award) => ({
        ...award,
        nominees: award.nominees.map((nominee) => ({ ...nominee, quote: 'invented quote' })),
      })),
    };
    expect(() => validateShowAwards(forged)).toThrow('nominee evidence');
    await expect(judgeShowAwards(forged, { runner: { run } })).rejects.toThrow('nominee evidence');
    expect(run).not.toHaveBeenCalled();
  });
});
