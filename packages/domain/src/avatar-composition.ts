import { getCostume } from './costume';

import type { Costume } from './costume';
import type { CastMember } from './show';

/** resolved artwork and cropped portrait shared by setup, playback and exports */
export interface CastAvatar {
  costume: Costume;
  costumeUrl: string;
  photoUrl: string | undefined;
  initial: string;
}

/**
 * composes local artwork with an already-cropped cast portrait
 * @param member saved cast identity and optional costume choice
 * @param photoUrl resolved cropped photo asset, never the original group photo
 * @param costumeUrl bundled or localized original costume asset
 * @returns presentation metadata without applying the original face box twice
 */
export function resolveCastAvatar(
  member: Pick<CastMember, 'displayName' | 'costumeId'>,
  photoUrl?: string,
  costumeUrl?: string,
): CastAvatar {
  const costume = getCostume(member.costumeId);
  return {
    costume,
    costumeUrl: costumeUrl ?? `/api/costumes/${costume.id}/image`,
    photoUrl,
    initial: Array.from(member.displayName.trim())[0]?.toUpperCase() ?? '?',
  };
}

/** proportional layout for the original portrait artwork in browser and renderer */
export const AVATAR_CSS = `
.cast-avatar{position:relative;display:block;aspect-ratio:2/3;overflow:hidden;isolation:isolate;container-type:inline-size;border-radius:12%;background:#17110e}
.cast-avatar>.cast-avatar-costume{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;border-radius:0}
.cast-avatar>.cast-avatar-face{position:absolute;left:39%;top:2%;width:22%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;background:#ead0a0;color:#382411;font:bold 13cqw/1 Georgia,serif}
.cast-avatar>.cast-avatar-face>img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%}
`;
