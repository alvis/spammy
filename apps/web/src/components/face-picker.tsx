import { useState } from 'react';
import { FaceBoxSchema, ShowSchema, getAwardNominees } from '@spammy/domain';
import type { FaceBox, Show } from '@spammy/domain';

/** renders host-controlled face assignment and local portrait cropping */
export function FacePicker({ show, onChange }: { show: Show; onChange(nextShow: Show): void }) {
  const nominees = getAwardNominees(show);
  const [photo, setPhoto] = useState<string>();
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function upload(file: File) {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/shows/${show.id}/faces`, { method: 'POST', body: form });
      if (!response.ok)
        throw new Error(
          response.status === 501
            ? 'Face location needs an OpenAI key on the server.'
            : 'Could not locate faces. Try another photo.',
        );
      const result = await response.json();
      setFaces(FaceBoxSchema.array().parse(result.faces));
      setPhoto(result.photoUrl);
      setAssignments({});
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!photo) return;
    setBusy(true);
    setError('');
    try {
      const image = new Image();
      image.src = photo;
      await image.decode();
      for (const [index, face] of faces.entries()) {
        const castMemberId = assignments[index];
        if (!castMemberId || !nominees.some((person) => person.id === castMemberId)) continue;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(face.width * image.naturalWidth));
        canvas.height = Math.max(1, Math.round(face.height * image.naturalHeight));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('This browser cannot crop photos.');
        context.drawImage(
          image,
          face.x * image.naturalWidth,
          face.y * image.naturalHeight,
          face.width * image.naturalWidth,
          face.height * image.naturalHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) => (value ? resolve(value) : reject(new Error('Could not crop this face.'))),
            'image/png',
          ),
        );
        const form = new FormData();
        form.append('file', blob, 'portrait.png');
        form.append('castMemberId', castMemberId);
        form.append('face', JSON.stringify(face));
        const response = await fetch(`/api/shows/${show.id}/photos`, {
          method: 'POST',
          body: form,
        });
        if (!response.ok) throw new Error('Could not save a portrait. Please retry.');
        onChange(ShowSchema.parse(await response.json()));
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>Pick faces from a group photo</h3>
      <p>
        Photos are sent to OpenAI to locate faces, without identifying anyone. Photos, crops and
        your assignments are saved locally. OpenAI processing is subject to its data policies.
      </p>
      <label>
        Choose group photo{' '}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy || nominees.length === 0}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {photo && (
        <>
          <div style={{ position: 'relative', maxWidth: 640 }}>
            <img
              src={photo}
              alt="Uploaded group with numbered face locations"
              style={{ display: 'block', width: '100%' }}
            />
            {faces.map((face, index) => (
              <span
                key={index}
                style={{
                  position: 'absolute',
                  left: `${face.x * 100}%`,
                  top: `${face.y * 100}%`,
                  width: `${face.width * 100}%`,
                  height: `${face.height * 100}%`,
                  border: '3px solid #b8862f',
                  color: '#fff',
                  textShadow: '0 1px 3px #000',
                }}
              >
                {index + 1}
              </span>
            ))}
          </div>
          {faces.length === 0 && (
            <p>No faces found. Try a clearer photo or upload individual portraits.</p>
          )}
          {faces.map((_, index) => (
            <label key={index}>
              Face {index + 1}{' '}
              <select
                disabled={busy || nominees.length === 0}
                value={assignments[index] ?? ''}
                onChange={(event) =>
                  setAssignments({ ...assignments, [index]: event.target.value })
                }
              >
                <option value="">Leave unassigned</option>
                {nominees.map((person) => (
                  <option
                    key={person.id}
                    value={person.id}
                    disabled={Object.entries(assignments).some(
                      ([key, value]) => Number(key) !== index && value === person.id,
                    )}
                  >
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {faces.length > 0 && (
            <button
              type="button"
              disabled={
                busy ||
                !Object.values(assignments).some((id) =>
                  nominees.some((person) => person.id === id),
                )
              }
              onClick={() => void save()}
            >
              Save assigned portraits
            </button>
          )}
        </>
      )}
      {busy && <p role="status">Working on your portraits…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
