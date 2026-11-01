import type { CeremonyScript } from './ceremony';
import type { CastMember } from './show';

/**
 * applies current local costumes while preserving the produced narration and reveals
 * @param script validated produced timeline
 * @param cast current saved cast selections
 * @returns replay presentation with the latest costumes and unchanged production content
 */
export function refreshCeremonyCostumes(
  script: CeremonyScript,
  cast: readonly CastMember[],
): CeremonyScript {
  const current = new Map(cast.map((member) => [member.id, member]));
  return {
    ...script,
    cast: script.cast.map((member) => {
      const saved = current.get(member.id);
      return saved ? { ...member, costumeId: saved.costumeId } : member;
    }),
  };
}
