import type { FC } from 'react';
import type { Persona } from '@spammy/domain';

/** animated trophy host, rebuilt from the visual prototype */
export type HostAvatarProps = { persona: Persona; isTalking?: boolean; className?: string };

/** renders a floating persona with a mouth synchronized to captions */
export const HostAvatar: FC<HostAvatarProps> = ({ persona, isTalking = false, className = '' }) => (
  <span
    className={`host-avatar host-avatar--${persona} ${isTalking ? 'is-talking' : ''} ${className}`}
    aria-hidden="true"
  >
    <span className="host-shadow" />
    <span className="host-base" />
    <span className="host-stem" />
    <span className="host-orb">
      <span className="host-glint" />
      <span className="host-eye host-eye--left">
        <i />
      </span>
      <span className="host-eye host-eye--right">
        <i />
      </span>
      <span className="host-cheek host-cheek--left" />
      <span className="host-cheek host-cheek--right" />
      <span className="host-mouth" />
      <span className="host-moustache">
        <i />
        <i />
      </span>
    </span>
    <span className="host-bow" />
    {persona === 'velvet' && <span className="host-hat" />}
    {persona === 'disco' && <span className="host-string" />}
  </span>
);
