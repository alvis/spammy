import { describe, expect, it } from 'vitest';

import { pseudonymizeChat } from './privacy';

import type { ParsedChat } from '@spammy/domain';

const chat: ParsedChat = {
  format: 'android-txt',
  dateOrder: 'day-first',
  groupName: 'Alex and Bea',
  participants: [
    { id: 'alex', displayName: 'Alex', messageCount: 1 },
    { id: 'bea', displayName: 'Bea', messageCount: 1 },
    { id: 'chris', displayName: 'Chris', messageCount: 1 },
  ],
  messages: [
    {
      id: 'm1',
      sentAt: '2026-01-01T01:00:00',
      authorId: 'alex',
      text: '@Bea call +44 7700 900123 or alex@example.com https://example.com Chris',
      kind: 'text',
    },
    { id: 'm2', sentAt: '2026-01-01T01:01:00', authorId: 'bea', text: 'Al!', kind: 'text' },
    { id: 'm3', sentAt: '2026-01-01T01:02:00', authorId: 'chris', text: 'private', kind: 'text' },
  ],
};

describe('fn:pseudonymizeChat', () => {
  it('should redact contact details and names, omit excluded people and preserve the input', () => {
    const result = pseudonymizeChat(chat, {
      includedParticipantIds: ['alex', 'bea'],
      aliases: { alex: ['Al'] },
    });

    expect(result).toMatchObject({
      aliases: { P1: 'Alex', P2: 'Bea' },
      participantIds: { P1: 'alex', P2: 'bea' },
      chat: {
        groupName: null,
        participants: [
          { id: 'P1', displayName: 'P1', messageCount: 1 },
          { id: 'P2', displayName: 'P2', messageCount: 1 },
        ],
        messages: [
          { id: 'm1', authorId: 'P1', text: 'P2 call [phone] or [email] [link] [excluded]' },
          { id: 'm2', authorId: 'P2', text: 'P1!' },
        ],
      },
    });
    expect(chat.messages[0]?.text).toContain('alex@example.com');
  });
});
