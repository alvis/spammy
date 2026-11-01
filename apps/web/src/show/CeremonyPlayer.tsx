import { audienceMotion, nomineeCameraTime, nomineeChoreography } from '@spammy/domain';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CSSProperties, ReactElement } from 'react';

import type { CeremonyScene, CeremonyScript, Look } from '@spammy/domain';

import { HostAvatar } from '../components/host-avatar';
import { Avatar } from '../components/avatar';

import './ceremony.css';

/** live ceremony controls and navigation callbacks */
export type CeremonyPlayerProps = {
  script: CeremonyScript;
  onExit: () => void;
  onShare: () => void;
  initialLook?: Look;
};

/** plays one seekable scene clock, stopping sealed envelopes before the winner is rendered */
export function CeremonyPlayer({
  script,
  onExit,
  onShare,
  initialLook,
}: CeremonyPlayerProps): ReactElement {
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [look, setLook] = useState<Look>(initialLook ?? script.look);
  const [openedAwardIds, setOpenedAwardIds] = useState<ReadonlySet<string>>(new Set());
  const [audioNotice, setAudioNotice] = useState('');
  const narration = useRef<HTMLAudioElement>(null);
  const music = useRef<HTMLAudioElement>(null);
  const scene =
    script.scenes.find(
      (candidate) =>
        timeSeconds >= candidate.startSeconds &&
        timeSeconds < candidate.startSeconds + candidate.durationSeconds,
    ) ?? script.scenes.at(-1)!;
  const elapsedSeconds = Math.max(0, timeSeconds - scene.startSeconds);
  const isSealed =
    scene.kind === 'env' &&
    scene.award?.decision === 'sealed' &&
    !openedAwardIds.has(scene.award.id);
  const isFinished = timeSeconds >= script.durationSeconds;
  const musicCue = script.music?.find(
    (cue) =>
      timeSeconds >= cue.startSeconds && timeSeconds < cue.startSeconds + cue.durationSeconds,
  );
  const hostName = `${script.persona[0]?.toUpperCase()}${script.persona.slice(1)}`;
  const cameraSeconds = nomineeCameraTime(
    elapsedSeconds,
    scene.award?.nominees.map((nominee) => ({
      name:
        script.cast.find((member) => member.participantId === nominee.participantId)?.displayName ??
        nominee.participantId,
      stat: nominee.stat,
    })) ?? [],
    scene.audioUrl ? (scene.words ?? []) : [],
  );
  const focus = nomineeChoreography(cameraSeconds, scene.award?.nominees.length ?? 3).focus;
  const focusedNominee = scene.award?.nominees[focus];
  const nomineeLine = focusedNominee
    ? `${script.cast.find((member) => member.participantId === focusedNominee.participantId)?.displayName ?? focusedNominee.participantId}. ${focusedNominee.stat}.`
    : 'The nominees are…';
  const spokenLine = isSealed
    ? 'The envelope, please.'
    : scene.kind === 'noms' && !scene.audioUrl
      ? nomineeLine
      : scene.line;
  const caption = isSealed
    ? spokenLine
    : scene.words?.length
      ? scene.words
          .filter((word) => word.start <= elapsedSeconds)
          .map((word) => word.word)
          .join(' ')
      : scene.kind === 'noms' && !scene.audioUrl
        ? spokenLine
        : spokenLine.slice(0, Math.floor(elapsedSeconds * 84) + 1);

  const openEnvelope = useCallback((): void => {
    const awardId = scene.award?.id;
    setTimeSeconds(scene.startSeconds);
    if (awardId) setOpenedAwardIds((previous) => new Set([...previous, awardId]));
    setIsPlaying(true);
  }, [scene.award?.id, scene.startSeconds]);

  useEffect(() => {
    if (!isPlaying || isFinished || isSealed) return;
    let previousMilliseconds: number | undefined;
    let animationFrame = 0;
    const advance = (nowMilliseconds: number): void => {
      const deltaSeconds =
        previousMilliseconds === undefined
          ? 0
          : Math.min((nowMilliseconds - previousMilliseconds) / 1000, 0.1);
      previousMilliseconds = nowMilliseconds;
      setTimeSeconds((previousSeconds) => {
        const proposedSeconds = Math.min(previousSeconds + deltaSeconds, script.durationSeconds);
        const unopened = script.scenes.find(
          (candidate) =>
            candidate.kind === 'env' &&
            candidate.award?.decision === 'sealed' &&
            !openedAwardIds.has(candidate.award.id) &&
            candidate.startSeconds >= previousSeconds &&
            candidate.startSeconds <= proposedSeconds,
        );

        return unopened?.startSeconds ?? proposedSeconds;
      });
      animationFrame = requestAnimationFrame(advance);
    };
    animationFrame = requestAnimationFrame(advance);

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, isFinished, isSealed, openedAwardIds, script]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      const target = event.target;
      if (
        event.code === 'Space' &&
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLButtonElement
        )
      ) {
        event.preventDefault();
        if (isSealed) openEnvelope();
        else setIsPlaying((previous) => !previous);
      }
      if (event.code === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKey);

    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit, isSealed, openEnvelope]);

  useEffect(() => {
    const audio = narration.current;
    if (!audio || !scene.audioUrl) return;
    if (Math.abs(audio.currentTime - elapsedSeconds) > 0.25) audio.currentTime = elapsedSeconds;
    if (isPlaying && !isSealed && !isFinished) {
      if (audio.paused)
        void audio
          .play()
          .catch(() =>
            setAudioNotice(
              'Voice playback needs another tap on Play. Captions are still available.',
            ),
          );
    } else audio.pause();
  }, [scene.audioUrl, elapsedSeconds, isPlaying, isSealed, isFinished]);

  useEffect(() => {
    const audio = music.current;
    if (!audio || !musicCue) return;
    const cueSeconds = Math.max(0, timeSeconds - musicCue.startSeconds);
    if (Math.abs(audio.currentTime - cueSeconds) > 0.25) audio.currentTime = cueSeconds;
    audio.volume =
      scene.audioUrl && elapsedSeconds < (scene.audioDurationSeconds ?? scene.durationSeconds)
        ? musicCue.volume
        : Math.min(musicCue.volume * 2, 0.5);
    if (isPlaying && !isSealed && !isFinished) {
      if (audio.paused)
        void audio
          .play()
          .catch(() =>
            setAudioNotice('Music is unavailable in this browser. You can keep watching.'),
          );
    } else audio.pause();
  }, [
    musicCue,
    timeSeconds,
    elapsedSeconds,
    scene.audioUrl,
    scene.audioDurationSeconds,
    scene.durationSeconds,
    isPlaying,
    isSealed,
    isFinished,
  ]);

  const restart = (): void => {
    setOpenedAwardIds(new Set());
    setTimeSeconds(0);
    setIsPlaying(true);
  };

  return (
    <section className={`ceremony-player ceremony-look-${look}`} aria-label="The Spammy ceremony">
      <div className="ceremony-stage">
        <div className="ceremony-rays" style={{ transform: `rotate(${timeSeconds * 2}deg)` }} />
        {scene.kind === 'open' && (
          <>
            <div
              className="ceremony-curtain ceremony-curtain-left"
              style={{ transform: `translateX(${-Math.min(elapsedSeconds / 1.6, 1) * 100}%)` }}
            />
            <div
              className="ceremony-curtain ceremony-curtain-right"
              style={{ transform: `translateX(${Math.min(elapsedSeconds / 1.6, 1) * 100}%)` }}
            />
          </>
        )}
        <SceneContent
          script={script}
          scene={scene}
          elapsedSeconds={elapsedSeconds}
          cameraSeconds={cameraSeconds}
          isSealed={isSealed}
          onOpen={openEnvelope}
          openedAwardIds={openedAwardIds}
        />
        {scene.kind === 'env' && !isSealed && elapsedSeconds < 6.4 && (
          <div className="ceremony-confetti" aria-hidden="true">
            {Array.from({ length: 48 }, (_, index) => {
              const progress = Math.min(elapsedSeconds / 6.4, 1);
              const style: CSSProperties = {
                left: `${(index * 37) % 100}%`,
                top: `${-10 + progress * (110 + (index % 30))}%`,
                background: ['#c99a3e', '#c94b5a', '#5a86a2', '#f0d48a'][index % 4],
                transform: `rotate(${index * 24 + elapsedSeconds * 110}deg)`,
                opacity: 1 - Math.max(0, progress - 0.8) * 5,
              };

              return <i key={index} style={style} />;
            })}
          </div>
        )}
        <div className="ceremony-stage-edge" aria-hidden="true" />
        <div className="ceremony-audience" aria-hidden="true">
          {Array.from({ length: 37 }, (_, index) => {
            const front = index >= 22;
            const position = front ? index - 22 : index;
            return (
              <i
                key={index}
                className={front ? 'audience-front' : 'audience-back'}
                style={{
                  left: `${(position / (front ? 15 : 22)) * 106 - 3}%`,
                  transform: audienceMotion(
                    elapsedSeconds,
                    (scene.kind === 'env' && !isSealed && elapsedSeconds < 6.4) ||
                      scene.kind === 'finale',
                    index,
                  ),
                }}
              />
            );
          })}
        </div>
        <div className="ceremony-host">
          <HostAvatar
            persona={script.persona}
            className="ceremony-host-avatar"
            isTalking={
              isPlaying &&
              !isSealed &&
              !isFinished &&
              (scene.words?.length
                ? scene.words.some(
                    (word) => elapsedSeconds >= word.start && elapsedSeconds < word.end,
                  )
                : caption.length < spokenLine.length)
            }
          />
          <div>
            <small>{hostName} · your AI host</small>
            <p aria-live="off">{caption || ' '}</p>
          </div>
        </div>
        {isFinished && (
          <div className="ceremony-end">
            <h2>That's a wrap.</h2>
            <button type="button" onClick={restart}>
              ↺ Play again
            </button>
            <button type="button" onClick={onShare}>
              Share it →
            </button>
          </div>
        )}
      </div>
      {scene.audioUrl && (
        <audio key={scene.audioUrl} ref={narration} src={scene.audioUrl} preload="auto" />
      )}
      {musicCue && (
        <audio key={musicCue.audioUrl} ref={music} src={musicCue.audioUrl} preload="auto" />
      )}
      <div className="ceremony-controls">
        <button
          type="button"
          onClick={() => setIsPlaying((previous) => !previous)}
          aria-label={isPlaying ? 'Pause ceremony' : 'Play ceremony'}
        >
          {isPlaying ? 'Ⅱ Pause' : '▶ Play'}
        </button>
        <span>
          {formatTime(timeSeconds)} / {formatTime(script.durationSeconds)}
        </span>
        <label className="ceremony-seek">
          <span className="visually-hidden">Seek ceremony</span>
          <input
            type="range"
            min="0"
            max={script.durationSeconds}
            step="0.05"
            value={timeSeconds}
            onChange={(event) => setTimeSeconds(Number(event.target.value))}
          />
          <span className="ceremony-chapters" aria-hidden="true">
            {script.scenes
              .filter((candidate) => candidate.kind === 'intro')
              .map((candidate) => (
                <i
                  key={candidate.id}
                  style={{ left: `${(candidate.startSeconds / script.durationSeconds) * 100}%` }}
                />
              ))}
          </span>
        </label>
        <label>
          <span className="visually-hidden">Ceremony look</span>
          <select value={look} onChange={(event) => setLook(event.target.value as Look)}>
            <option value="ivory">Ivory</option>
            <option value="blacktie">Black tie</option>
            <option value="champagne">Champagne</option>
          </select>
        </label>
        <button type="button" onClick={onExit}>
          Exit
        </button>
      </div>
      {audioNotice && (
        <p className="ceremony-audio-notice" role="status">
          {audioNotice}
        </p>
      )}
    </section>
  );
}

function SceneContent({
  script,
  scene,
  elapsedSeconds,
  cameraSeconds,
  isSealed,
  onOpen,
  openedAwardIds,
}: {
  script: CeremonyScript;
  scene: CeremonyScene;
  elapsedSeconds: number;
  cameraSeconds: number;
  isSealed: boolean;
  onOpen: () => void;
  openedAwardIds: ReadonlySet<string>;
}): ReactElement {
  const award = scene.award;
  const choreography = nomineeChoreography(cameraSeconds, award?.nominees.length ?? 3);
  const winner = script.cast.find((person) => person.participantId === award?.winnerId);

  if (scene.kind === 'open')
    return (
      <div className="ceremony-center">
        <p className="ceremony-kicker">The Spammy presents</p>
        <h1 className="ceremony-foil">{script.title}</h1>
        <p>A year of messages. A night of receipts.</p>
        <span className="ceremony-star">✦</span>
      </div>
    );
  if (scene.kind === 'show')
    return (
      <div className="ceremony-center">
        <p className="ceremony-kicker">Now presenting</p>
        <h1 className="ceremony-foil">{scene.showName}</h1>
        <p>Prestige. Drama. Group chat behavior.</p>
      </div>
    );
  if (scene.kind === 'intro')
    return (
      <div className="ceremony-center">
        <p className="ceremony-kicker">{scene.showName}</p>
        <p>The award for</p>
        <h1 className="ceremony-foil">{award?.title}</h1>
      </div>
    );
  if (scene.kind === 'noms')
    return (
      <div className="ceremony-center">
        <p className="ceremony-kicker">{award?.title}</p>
        <h2 style={{ opacity: choreography.titleOpacity }}>The nominees are…</h2>
        <div className="ceremony-nominee-window">
          <div
            className="ceremony-nominees"
            style={{
              transform: choreography.camera,
              gridTemplateColumns: `repeat(${Math.max(1, award?.nominees.length ?? 0)}, minmax(0, 1fr))`,
            }}
          >
            {award?.nominees.map((nominee, index) => {
              const person = script.cast.find(
                (candidate) => candidate.participantId === nominee.participantId,
              );
              const pose = choreography.cards[index]!;
              const visibility = pose.entrance;

              return (
                <article
                  key={nominee.participantId}
                  style={{
                    opacity: visibility * pose.opacity,
                    transform: `translateY(${(1 - visibility) * 20}px)`,
                  }}
                >
                  <Avatar
                    person={person}
                    showId={script.showId}
                    className="ceremony-avatar"
                    motion={{ elapsedSeconds, role: 'nominee', index }}
                  />
                  <h3>{person?.displayName ?? nominee.participantId}</h3>
                  <small>{nominee.stat}</small>
                  <blockquote style={{ opacity: pose.quoteOpacity }}>“{nominee.quote}”</blockquote>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  if (scene.kind === 'env')
    return (
      <div className="ceremony-center">
        <p className="ceremony-kicker">{award?.title}</p>
        {isSealed ? (
          <button type="button" className="ceremony-envelope" onClick={onOpen}>
            <span aria-hidden="true">✉</span>
            <strong>The envelope, please.</strong>
            <small>Tap to break the seal</small>
          </button>
        ) : (
          <div className="ceremony-reveal">
            <div
              className="ceremony-opening-envelope"
              aria-hidden="true"
              style={{ opacity: Math.max(0, 1 - Math.max(0, elapsedSeconds - 0.8) / 0.6) }}
            >
              <i style={{ transform: `rotateX(${Math.min(elapsedSeconds / 0.7, 1) * 180}deg)` }} />
            </div>
            <div
              className="ceremony-winner-card"
              style={{
                opacity: Math.min(Math.max(0, elapsedSeconds - 0.4) / 0.6, 1),
                transform: `translateY(${Math.max(0, 1 - elapsedSeconds / 1.2) * 70}px)`,
              }}
            >
              <p>And the award goes to</p>
              <Avatar
                person={winner}
                showId={script.showId}
                className="ceremony-avatar"
                motion={{ elapsedSeconds, role: 'winner' }}
              />
              <h1 className="ceremony-foil">{winner?.displayName ?? 'Awaiting judgement'}</h1>
              <p>
                {award?.nominees.find((nominee) => nominee.participantId === award.winnerId)?.stat}
              </p>
            </div>
          </div>
        )}
      </div>
    );

  return (
    <div className="ceremony-center">
      <p className="ceremony-kicker">The Spammys · 2026</p>
      <h1 className="ceremony-foil">That's a wrap.</h1>
      <div className="ceremony-winners">
        {script.scenes
          .filter(
            (candidate) =>
              candidate.kind === 'env' &&
              (candidate.award?.decision !== 'sealed' || openedAwardIds.has(candidate.award.id)),
          )
          .map((candidate, index) => (
            <article key={candidate.id}>
              <Avatar
                person={script.cast.find(
                  (person) => person.participantId === candidate.award?.winnerId,
                )}
                showId={script.showId}
                className="ceremony-avatar"
                motion={{ elapsedSeconds, role: 'finale', index }}
              />
              <div>
                <small>{candidate.award?.title}</small>
                <strong>
                  {script.cast.find((person) => person.participantId === candidate.award?.winnerId)
                    ?.displayName ?? 'Awaiting judgement'}
                </strong>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}
