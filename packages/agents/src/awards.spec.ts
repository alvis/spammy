import type { AwardDependencies } from './awards';
import { describe, expect, it, vi } from 'vitest';

import { suggestAwards } from './awards';

import { awardTitleError } from '@spammy/domain';
import type { Award, ChatAnalysis } from '@spammy/domain';

describe('fn:suggestAwards', () => {
  it('should verify exact source receipts, privately judges and restores cast identities locally', async () => {
    const receipt = {
      messageId: 'm1',
      authorId: 'P1',
      quote: 'lol P1',
      sentAt: '2026-01-01T01:00:00',
    };
    const awards: Award[] = Array.from({ length: 6 }, (_, index) => ({
      id: `a${index}`,
      title:
        index === 0
          ? 'P1 laughs'
          : 'The person who always sends incredibly long voice notes every morning',
      showName: index < 3 ? 'Laughs' : 'Legends',
      howJudged: 'Laugh count',
      decision: 'sealed',
      winnerId: null,
      nominees: [
        { participantId: 'P1', stat: 'one laugh', quote: receipt.quote, receiptMessageId: 'm1' },
      ],
      receipts: [receipt],
    }));
    const run = vi
      .fn<AwardDependencies['runner']['run']>()
      .mockResolvedValueOnce({ finalOutput: { awards } })
      .mockResolvedValueOnce({
        finalOutput: {
          winners: awards.map((award) => ({ awardId: award.id, participantId: 'P1' })),
        },
      });
    const analysis: ChatAnalysis = {
      stats: [],
      moments: [],
      highlights: [],
      sourceChat: {
        format: 'android-txt',
        dateOrder: 'day-first',
        groupName: null,
        participants: [{ id: 'P1', displayName: 'P1', messageCount: 1 }],
        messages: [
          { id: 'm1', authorId: 'P1', text: receipt.quote, sentAt: receipt.sentAt, kind: 'text' },
        ],
      },
    };
    const result = await suggestAwards(
      {
        cast: [
          {
            id: 'cast',
            participantId: 'alice',
            displayName: 'Alice With Several Middle Names',
            face: null,
            photoAssetId: null,
          },
        ],
        roastLevel: 'gentle',
        groupKind: 'friends',
        participantIds: { P1: 'alice' },
        analysis,
      },
      { runner: { run } },
    );
    expect(result).toHaveLength(6);
    expect(result.every((award) => awardTitleError(award.title) === null)).toBe(true);
    expect(result[1]?.title).toBe('Voice Note Virtuoso');
    expect(result[0]).toMatchObject({
      title: 'Laughter Legend',
      winnerId: 'alice',
      nominees: [{ participantId: 'alice', quote: 'lol Alice With Several Middle Names' }],
    });
    expect(JSON.stringify(run.mock.calls)).not.toContain('Alice');
    expect(run).toHaveBeenCalledTimes(2);
  });
  it.todo('TODO(draft): drops fabricated quotes and rejects insufficient verified award groups');
  it.todo('TODO(draft): rejects judges selecting non-nominees and preserves host choices');
});
