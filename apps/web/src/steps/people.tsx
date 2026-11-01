import { useRef } from 'react';
import { COSTUMES, CostumeIdSchema, getCostume, getAwardNominees } from '@spammy/domain';
import { api, canUseSample } from '../api/client';
import { Avatar } from '../components/avatar';
import { FacePicker } from '../components/face-picker';
import { CharacterGenerator } from '../components/character-generator';

import type { FC } from 'react';
import type { CostumeId, Show } from '@spammy/domain';
import type { StepProps } from './types';

/** renders cast names and local portrait uploads */
export const PeopleStep: FC<StepProps> = ({ show, onChange, onNotice, isBusy, setBusy }) => {
  const nominees = getAwardNominees(show);
  const latestShow = useRef(show);
  latestShow.current = show;
  function mergePortraits(next: Show): void {
    onChange({
      ...next,
      cast: next.cast.map((person) => ({
        ...person,
        costumeId: latestShow.current.cast.find((current) => current.id === person.id)?.costumeId,
        displayName:
          latestShow.current.cast.find((current) => current.id === person.id)?.displayName ??
          person.displayName,
      })),
    });
  }
  function chooseCostume(personId: string, costumeId: CostumeId): void {
    const next = {
      ...latestShow.current,
      cast: latestShow.current.cast.map((person) =>
        person.id === personId ? { ...person, costumeId } : person,
      ),
    };
    latestShow.current = next;
    onChange(next);
    if (next.id.startsWith('sample-')) return;
    setBusy(true);
    void (async () => {
      try {
        await api.updateCast(next.id, [{ id: personId, costumeId }]);
      } catch (error) {
        onNotice(
          `Costume preview kept in this browser. Saving failed: ${(error as Error).message}. Roll the show to retry.`,
        );
      } finally {
        setBusy(false);
      }
    })();
  }
  async function uploadPortrait(personId: string, file: File): Promise<void> {
    const preview = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const updated = {
      ...show,
      cast: show.cast.map((person) =>
        person.id === personId ? { ...person, photoAssetId: preview } : person,
      ),
    };
    onChange(updated);
    if (show.id.startsWith('sample-')) return;
    try {
      mergePortraits(await api.uploadPhoto(show.id, personId, file));
    } catch (error) {
      onNotice(
        canUseSample(error)
          ? 'Photo preview saved in this browser; the local server is unavailable.'
          : `Photo upload failed: ${(error as Error).message}`,
      );
    }
  }
  return (
    <>
      <div className="step-heading">
        <span className="eyebrow">READY FOR YOUR CLOSE-UP?</span>
        <h1>
          Who’s <span className="foil">who?</span>
        </h1>
        <p>Give your award nominees a red-carpet upgrade.</p>
      </div>
      {nominees.length === 0 && <p>Choose awards to add photos for their nominees.</p>}
      {show.id.startsWith('sample-') && (
        <p>
          Meet the fictional Brunch Club, dressed for a fun musical award show. The demo’s music and
          portraits are ready to play.
        </p>
      )}
      <div className="people-grid">
        {nominees.map((person) => (
          <article className="person-card" key={person.id}>
            <label className="portrait-picker">
              <Avatar person={person} showId={show.id} size="large" />
              <span>{person.photoAssetId ? 'Change photo' : '+ Photo'}</span>
              <input
                type="file"
                className="visually-hidden"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPortrait(person.id, file);
                }}
              />
            </label>
            <small>
              In the chat as “
              {
                show.chat?.participants.find(
                  (participant) => participant.id === person.participantId,
                )?.displayName
              }
              ”
            </small>
            <input
              aria-label={`Display name for ${person.displayName}`}
              value={person.displayName}
              onChange={(event) =>
                onChange({
                  ...show,
                  cast: show.cast.map((current) =>
                    current.id === person.id
                      ? { ...current, displayName: event.target.value }
                      : current,
                  ),
                })
              }
            />
            <label className="costume-picker">
              Costume
              <select
                aria-label={`Costume for ${person.displayName}`}
                disabled={isBusy}
                value={getCostume(person.costumeId).id}
                onChange={(event) =>
                  chooseCostume(person.id, CostumeIdSchema.parse(event.target.value))
                }
              >
                {COSTUMES.map((costume) => (
                  <option key={costume.id} value={costume.id}>
                    {costume.label}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Wins:{' '}
              {show.awards
                .filter(
                  (award) =>
                    award.decision === 'host-picked' && award.winnerId === person.participantId,
                )
                .map((award) => award.title)
                .join(', ') || 'No host-picked wins'}
            </p>
            <small>
              {
                show.awards.filter(
                  (award) =>
                    award.decision === 'sealed' &&
                    award.nominees.some(
                      (nominee) => nominee.participantId === person.participantId,
                    ),
                ).length
              }{' '}
              sealed
            </small>
          </article>
        ))}
      </div>
      <FacePicker show={show} onChange={mergePortraits} />
      <CharacterGenerator show={show} onChange={mergePortraits} />
    </>
  );
};
