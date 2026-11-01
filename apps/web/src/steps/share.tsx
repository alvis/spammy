import { useState } from 'react';
import type { FC } from 'react';
import { api, canUseSample } from '../api/client';
import { Avatar } from '../components/avatar';
import { saveShowLocally } from '../storage';
import type { StepProps } from './types';

/** renders the ceremony poster and local export actions */
export const ShareStep: FC<StepProps> = ({
  show,
  ceremonyScript,
  onNavigate,
  onReplay,
  onNotice,
  isBusy,
  setBusy,
}) => {
  const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
  const awards =
    ceremonyScript?.scenes
      .filter((scene) => scene.kind === 'env')
      .flatMap((scene) => (scene.award ? [scene.award] : [])) ?? show.awards;
  async function download(kind: 'video' | 'poster'): Promise<void> {
    setBusy(true);
    try {
      if (show.id.startsWith('sample-')) {
        onNotice(
          'The sample plays in your browser. Upload a chat and start the local renderer to download an MP4 or poster.',
        );
        return;
      }
      const result = await api.exportShow(show.id, kind, aspect);
      if (
        result &&
        typeof result === 'object' &&
        'url' in result &&
        typeof result.url === 'string'
      ) {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = kind === 'video' ? 'the-spammys.mp4' : 'the-spammys.png';
        link.click();
        onNotice('Rendering complete. Saved to Downloads.');
      } else onNotice('The export is preparing. Please try again shortly.');
    } catch (error) {
      onNotice(
        canUseSample(error)
          ? 'The local renderer isn’t available yet. You can still watch your ceremony and save it on this device.'
          : `Export failed: ${(error as Error).message}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="step-heading">
        <span className="eyebrow">THE GROUP CHAT WILL NEVER RECOVER</span>
        <h1>
          That’s a <span className="foil">wrap.</span>
        </h1>
        <p>The winners. The receipts. The memories nobody asked for.</p>
      </div>
      <div className="share-layout">
        <section className="winners-poster">
          <span className="eyebrow">THE SPAMMY PRESENTS</span>
          <h2 className="foil">{show.chat?.groupName ?? 'The Spammys'}</h2>
          <p>
            {show.settings.range
              ? `${show.settings.range.from} — ${show.settings.range.to}`
              : 'A year worth celebrating'}
          </p>
          <span className="poster-star">✦</span>
          {awards.map((award) => {
            const winner = show.cast.find((person) => person.participantId === award.winnerId);
            return (
              <div className="poster-winner" key={award.id}>
                <Avatar person={winner} showId={show.id} />
                <span>
                  <small>{award.title}</small>
                  <strong>{winner?.displayName ?? 'Awaiting the envelope'}</strong>
                </span>
                <span aria-hidden="true">✦</span>
              </div>
            );
          })}
          <footer>WHO ATE THIS YEAR?</footer>
        </section>
        <div className="share-actions">
          <label>
            Video format
            <select
              value={aspect}
              onChange={(event) => setAspect(event.target.value as '16:9' | '9:16')}
            >
              <option value="16:9">16:9 · landscape</option>
              <option value="9:16">9:16 · portrait</option>
            </select>
          </label>
          <h2>Keep the big night.</h2>
          <p>Save your show on this device, or export it to send to the group.</p>
          <button
            className="button"
            type="button"
            disabled={isBusy}
            onClick={() => void download('video')}
          >
            {isBusy ? 'Preparing export…' : '↓ Download video (MP4)'}
          </button>
          <button
            className="button button--secondary"
            type="button"
            disabled={isBusy}
            onClick={() => void download('poster')}
          >
            ↓ Download poster (PNG)
          </button>
          <button
            className="button button--gold"
            type="button"
            onClick={() =>
              onNotice(
                saveShowLocally({ ...show, awards }, ceremonyScript)
                  ? 'Saved. It’s on the start screen.'
                  : 'This browser is out of storage. Try downloading your show instead.',
              )
            }
          >
            Save to my shows
          </button>
          <button className="text-button" type="button" onClick={() => onReplay()}>
            ↺ Watch again
          </button>
          <button className="text-button" type="button" onClick={() => onNavigate('hello')}>
            Back to start
          </button>
        </div>
      </div>
    </>
  );
};
