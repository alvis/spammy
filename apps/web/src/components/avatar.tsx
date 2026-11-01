import { characterMotion, resolveCastAvatar } from '@spammy/domain';

import { costumeAssetUrl } from '../costumes';

import type { CastMember, CharacterMotionRole } from '@spammy/domain';
import type { ReactElement } from 'react';

/** props for a shared face and costume composition */
export type AvatarProps = {
  person: CastMember | undefined;
  showId: string;
  size?: 'small' | 'large';
  className?: string;
  motion?: { elapsedSeconds: number; role: CharacterMotionRole; index?: number };
};

/** displays the selected local costume with a cropped portrait or initial */
export function Avatar({
  person,
  showId,
  size = 'small',
  className = '',
  motion,
}: AvatarProps): ReactElement {
  const asset = person?.photoAssetId;
  const imageUrl = asset
    ? /^(data:|blob:|\/)/.test(asset)
      ? asset
      : `/api/shows/${encodeURIComponent(showId)}/assets/${encodeURIComponent(asset)}`
    : undefined;
  const avatar = resolveCastAvatar(
    person ?? { displayName: '?' },
    imageUrl,
    costumeAssetUrl(person?.costumeId),
  );

  return (
    <span
      className={`cast-avatar avatar--${size} ${className}`}
      style={
        motion
          ? {
              transform: characterMotion(motion.elapsedSeconds, motion.role, motion.index),
              transformOrigin: '50% 90%',
            }
          : undefined
      }
      role="img"
      aria-label={`${person?.displayName ?? 'Cast member'} in ${avatar.costume.label}`}
    >
      <img className="cast-avatar-costume" src={avatar.costumeUrl} alt="" />
      <span className="cast-avatar-face" aria-hidden="true">
        {avatar.photoUrl ? <img src={avatar.photoUrl} alt="" /> : avatar.initial}
      </span>
    </span>
  );
}
