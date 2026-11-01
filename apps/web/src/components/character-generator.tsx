import { useEffect, useState } from 'react';
import { CostumeOptionSchema, ShowSchema, getAwardNominees } from '@spammy/domain';
import type { CostumeOption, Show } from '@spammy/domain';

/** renders fictional character generation for a host-selected cast member */
export function CharacterGenerator({
  show,
  onChange,
}: {
  show: Show;
  onChange(nextShow: Show): void;
}) {
  const nominees = getAwardNominees(show);
  const [selectedPersonId, setPersonId] = useState('');
  const personId = nominees.some((person) => person.id === selectedPersonId)
    ? selectedPersonId
    : (nominees[0]?.id ?? '');
  const [costumes, setCostumes] = useState<CostumeOption[]>([]);
  const [costumeId, setCostumeId] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function loadCostumes() {
      try {
        const response = await fetch('/api/costumes', { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load costume references.');
        const catalog = CostumeOptionSchema.array().parse(await response.json());
        setCostumes(catalog);
        setCostumeId(catalog[0]?.id ?? '');
      } catch (cause) {
        if (!controller.signal.aborted) setError((cause as Error).message);
      }
    }
    void loadCostumes();
    return () => controller.abort();
  }, []);
  async function generate() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/shows/${show.id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castMemberId: personId, description, costumeId }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 501
            ? 'Character generation needs an OpenAI key on the server.'
            : 'Could not generate a character. Please retry.',
        );
      const result = await response.json();
      onChange(ShowSchema.parse(result.show));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>Create a character portrait</h3>
      <p>
        Your description and selected costume reference are sent to OpenAI. The generated portrait
        is saved locally.
      </p>
      <label>
        Portrait for{' '}
        <select
          value={personId}
          disabled={busy}
          onChange={(event) => setPersonId(event.target.value)}
        >
          {nominees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </label>
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
        <legend>Choose a costume reference</legend>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 10,
            maxHeight: 360,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {costumes.map((costume) => (
            <label
              key={costume.id}
              style={{
                border: costumeId === costume.id ? '3px solid #b8862f' : '3px solid transparent',
                borderRadius: 14,
                padding: 6,
                background: '#fffdf9',
              }}
            >
              <input
                type="radio"
                name={`costume-${show.id}`}
                value={costume.id}
                checked={costumeId === costume.id}
                onChange={() => setCostumeId(costume.id)}
              />
              <img
                src={costume.previewUrl}
                alt={costume.label}
                loading="lazy"
                style={{ width: '100%', height: 120, objectFit: 'contain', display: 'block' }}
              />
              <span>{costume.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Describe a fictional character{' '}
        <textarea
          value={description}
          maxLength={500}
          disabled={busy}
          placeholder="A cheerful fox with a confident smile"
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy || !personId || !costumeId || description.trim().length < 3}
        onClick={() => void generate()}
      >
        {busy ? 'Creating portrait…' : 'Generate portrait'}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
