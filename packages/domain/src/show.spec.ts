import { describe, expect, it } from 'vitest';

import { AwardSchema, ShowSchema } from './show';

const show = {
  id: 'show-1',
  createdAt: '2026-11-01T14:30:00Z',
  updatedAt: '2026-11-01T14:30:00Z',
  stage: 'draft',
  settings: {
    groupKind: 'friends',
    persona: 'goldie',
    look: 'champagne',
    roastLevel: 'playful',
    range: { from: '2026-01-01', to: '2026-12-31' },
  },
  chat: null,
  cast: [],
  groupPhotoAssetId: null,
  awards: [],
};

describe('ShowSchema', () => {
  it('should accept a freshly created draft show', () => {
    expect(ShowSchema.parse(show)).toEqual(show);
  });

  it('should reject an unknown persona', () => {
    const result = ShowSchema.safeParse({ ...show, settings: { ...show.settings, persona: 'elvis' } });

    expect(result.success).toBe(false);
  });
});

describe('AwardSchema', () => {
  it('should accept a sealed award with no winner yet', () => {
    const award = {
      id: 'award-1',
      title: 'Most Likely To Reply At 3am',
      howJudged: 'share of messages sent between midnight and 5am',
      showName: 'The Golden Globes',
      nominees: [
        { participantId: 'p-1', stat: '412 voice notes', quote: 'sorry that was long', receiptMessageId: 'm-1' },
        { participantId: 'p-2', stat: '97 voice notes', quote: 'ok voice note incoming', receiptMessageId: null },
      ],
      decision: 'sealed',
      winnerId: null,
      receipts: [],
    };

    expect(AwardSchema.parse(award)).toEqual(award);
  });
});
