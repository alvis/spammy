import { describe, expect, it, vi } from 'vitest';

import { OPENAI_MODELS } from '@spammy/domain';

import { writeStoryboard } from './script';

import type { Show } from '@spammy/domain';
import type { StoryboardDependencies } from './script';

const respond = vi.fn<StoryboardDependencies['respond']>(async (request) => {
  const input = request.input as { role: string; content: string }[];
  const payload = JSON.parse(input[1]!.content);
  return {
    output_text: JSON.stringify({
      ...payload,
      segments: payload.segments.map((segment: object) => ({
        ...segment,
        narration: 'P2 wins with style.',
      })),
    }),
  };
});

describe('fn:writeStoryboard', () => {
  it('should write structured persona beats using aliases and restore cast names locally', async () => {
    const show: Show = {
      id: 'show',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      stage: 'awards-ready',
      settings: {
        groupKind: 'friends',
        persona: 'velvet',
        look: 'ivory',
        roastLevel: 'playful',
        range: null,
      },
      chat: {
        format: 'android-txt',
        dateOrder: 'day-first',
        groupName: null,
        participants: [
          { id: 'alice', displayName: 'Alice', messageCount: 1 },
          { id: 'bob', displayName: 'Bob', messageCount: 0 },
        ],
        messages: [
          {
            id: 'm1',
            authorId: 'alice',
            text: 'Alice invited Bob',
            sentAt: '2026-01-01T00:00:00',
            kind: 'text',
          },
        ],
      },
      cast: [
        {
          id: 'cast-bob',
          participantId: 'bob',
          displayName: 'Bobby',
          photoAssetId: null,
          face: null,
        },
        {
          id: 'cast',
          participantId: 'alice',
          displayName: 'Ally',
          photoAssetId: null,
          face: null,
        },
      ],
      groupPhotoAssetId: null,
      awards: [
        {
          id: 'award',
          showName: 'Chat awards',
          title: 'Funniest',
          howJudged: 'Laughs',
          decision: 'host-picked',
          winnerId: 'alice',
          nominees: [
            {
              participantId: 'alice',
              stat: 'Alice: 9 laughs',
              quote: 'Alice invited Bob',
              receiptMessageId: 'm1',
            },
            {
              participantId: 'bob',
              stat: '2 laughs.',
              quote: '',
              receiptMessageId: null,
            },
          ],
          receipts: [
            {
              messageId: 'm1',
              authorId: 'alice',
              quote: 'Alice invited Bob',
              sentAt: '2026-01-01T00:00:00',
            },
          ],
        },
      ],
    };

    const storyboard = await writeStoryboard(show, { respond });

    expect(storyboard.segments.map((segment) => segment.id)).toEqual([
      'open',
      'show-0',
      'award-intro',
      'award-noms',
      'award-env',
      'finale',
    ]);
    expect(
      storyboard.segments
        .filter((segment) => segment.kind !== 'nominees')
        .every((segment) => segment.narration === 'Ally wins with style.'),
    ).toBe(true);
    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ model: OPENAI_MODELS.script, store: false }),
    );
    expect(JSON.stringify(respond.mock.calls[0])).not.toMatch(/Alice|Ally|Bob|Bobby/);
    expect(JSON.stringify(respond.mock.calls[0])).toContain('P2 invited [name]');
    expect(storyboard.segments.find((segment) => segment.kind === 'nominees')?.narration).toBe(
      'The nominees are… Ally. Ally: 9 laughs. Bobby. 2 laughs. Ally said: “Ally invited [name]”',
    );
  });
  it.todo('TODO(draft): reject changed scene identifiers and excessive narration');
});
