import { describe, expect, it } from 'vitest';

import { formatReceiptQuote } from './receipt-display';

import type { Show } from './show';

describe('fn:formatReceiptQuote', () => {
  it('should reflect a renamed speaker and mask other people without changing verified evidence', () => {
    const show: Pick<Show, 'chat' | 'cast'> = {
      chat: {
        format: 'android-txt',
        dateOrder: 'day-first',
        groupName: null,
        participants: [
          { id: 'a', displayName: 'Alice', messageCount: 1 },
          { id: 'b', displayName: 'Bob', messageCount: 0 },
          { id: 'c', displayName: 'Chris', messageCount: 0 },
        ],
        messages: [
          {
            id: 'm1',
            authorId: 'a',
            text: 'Alice told @Bob and Chris: call alice@example.com',
            sentAt: '2026-01-01T00:00:00',
            kind: 'text',
          },
        ],
      },
      cast: [
        { id: 'cast-a', participantId: 'a', displayName: 'Ally', photoAssetId: null, face: null },
        { id: 'cast-b', participantId: 'b', displayName: 'Bobby', photoAssetId: null, face: null },
      ],
    };
    const receipt = {
      messageId: 'm1',
      authorId: 'a',
      quote: 'Old Alice told Bob and Chris: call [email]',
    };
    expect(formatReceiptQuote(receipt, show)).toBe('Ally told [name] and [name]: call [email]');
    expect(receipt.quote).toBe('Old Alice told Bob and Chris: call [email]');
    expect(show.chat!.messages[0]!.text).toContain('alice@example.com');
  });
});
