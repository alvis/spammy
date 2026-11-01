import { describe, expect, it, vi } from 'vitest';

import { analyzeChat, estimateTokens } from './analysis';
import type { AnalyzeChatDependencies } from './analysis';

import type { ParsedChat } from '@spammy/domain';

describe('fn:analyzeChat', () => {
  it('should compute local stats and makes one structured, private request for the selected range', async () => {
    const chat: ParsedChat = {
      format: 'android-txt',
      dateOrder: 'day-first',
      groupName: 'Private',
      participants: [{ id: 'alice', displayName: 'Alice', messageCount: 2 }],
      messages: [
        { id: 'old', authorId: 'alice', sentAt: '2025-01-01T01:00:00', kind: 'text', text: 'old' },
        {
          id: 'm1',
          authorId: 'alice',
          sentAt: '2026-01-01T01:00:00',
          kind: 'text',
          text: 'Alice lol 😂',
        },
      ],
    };
    const parse = vi.fn<AnalyzeChatDependencies['client']['responses']['parse']>(async () => ({
      output_parsed: {
        moments: [{ messageIds: ['m1'], people: ['P1'], theme: 'laughs', why: 'funny' }],
      },
    }));
    const input = { chat, range: { from: '2026-01-01', to: '2026-12-31' } };
    const result = await analyzeChat(input, {
      client: { responses: { parse } },
    });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]?.[0]).toMatchObject({
      store: false,
      input: 'm1|2026-01-01T01:00:00|P1: P1 lol 😂',
    });
    expect(result.stats[0]).toMatchObject({
      participantId: 'P1',
      messageCount: 1,
      shareOfChat: 1,
      lateNightCount: 1,
      laughCount: 1,
      topEmoji: '😂',
    });
    expect(result.moments).toHaveLength(1);
    expect(estimateTokens(input)).toBeGreaterThan(180);
  });
  it.todo('TODO(draft): rejects invalid provider output and covers all media statistics');
});
