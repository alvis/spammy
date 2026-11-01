import { expect, it } from 'vitest';

import { getAwardNominees } from './nominees';
import { AwardSchema, CastMemberSchema } from './show';

it('should include every nominee regardless of sealed winner and preserve the full cast', () => {
  const cast = ['a', 'b', 'c'].map((id) =>
    CastMemberSchema.parse({
      id: `cast-${id}`,
      participantId: id,
      displayName: id,
      photoAssetId: null,
      face: null,
    }),
  );
  const award = AwardSchema.parse({
    id: 'award',
    showName: 'Awards',
    title: 'Best chatter',
    howJudged: 'Messages',
    nominees: ['a', 'b'].map((participantId) => ({
      participantId,
      stat: 'Chats',
      quote: 'Hello',
      receiptMessageId: null,
    })),
    decision: 'sealed',
    winnerId: 'a',
    receipts: [],
  });
  const show = { cast, awards: [award] };
  expect(getAwardNominees(show).map((person) => person.id)).toEqual(['cast-a', 'cast-b']);
  expect(getAwardNominees({ ...show, awards: [{ ...award, winnerId: null }] })).toEqual(
    getAwardNominees(show),
  );
  expect(getAwardNominees({ ...show, awards: [] })).toEqual([]);
  expect(show.cast).toHaveLength(3);
});
