import type { CastMember, Show } from './show';

/** returns cast members nominated for any selected award without consulting winners */
export function getAwardNominees(show: Pick<Show, 'cast' | 'awards'>): CastMember[] {
  const participantIds = new Set(
    show.awards.flatMap((award) => award.nominees.map((nominee) => nominee.participantId)),
  );
  return show.cast.filter((person) => participantIds.has(person.participantId));
}
