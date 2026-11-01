import { useState } from 'react';
import { buildCeremonyScript } from '@spammy/domain';
import type { FC } from 'react';
import { CeremonyPlayer } from '../show/CeremonyPlayer';
import { HostAvatar } from '../components/host-avatar';
import { buildSampleCeremonyScript } from '../sample/media';
import type { StepProps } from './types';

/** starts new ceremonies from a poster and autoplays saved replays */
export const ShowStep: FC<StepProps> = ({ show, ceremonyScript, onNavigate, isReplay }) => {
  const [hasStarted, setStarted] = useState(isReplay);
  const exit = (): void => onNavigate(isReplay ? 'hello' : 'people');
  if (!hasStarted)
    return (
      <section className="show-poster-gate">
        <span className="eyebrow">THE SPAMMY PRESENTS</span>
        <HostAvatar persona={show.settings.persona} />
        <h1 className="foil">{show.chat?.groupName ?? 'Your big night'}</h1>
        <p>
          {show.settings.range
            ? `${show.settings.range.from} — ${show.settings.range.to}`
            : show.settings.groupKind}{' '}
          · {show.awards.length} awards
        </p>
        <button className="button button--gold" type="button" onClick={() => setStarted(true)}>
          ▶ Play the show
        </button>
        <button className="text-button" type="button" onClick={exit}>
          ← Back
        </button>
      </section>
    );
  return (
    <CeremonyPlayer
      script={
        ceremonyScript ??
        (show.id.startsWith('sample-')
          ? buildSampleCeremonyScript(show)
          : buildCeremonyScript(show))
      }
      initialLook={show.settings.look}
      onExit={exit}
      onShare={() => onNavigate('share')}
    />
  );
};
