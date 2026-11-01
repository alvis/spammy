import { useEffect, useMemo, useState } from 'react';

import { HostAvatar } from '../components/host-avatar';
import { api, canUseSample } from '../api/client';
import { readSavedScript, readSavedShows } from '../storage';
import { createSampleShow } from '../sample/show';
import './range.css';

import type { CSSProperties, FC } from 'react';
import type { DateOrder, Persona, RoastLevel } from '@spammy/domain';
import type { StepProps } from './types';

/** fixed persona copy from the design reference */
export const PERSONAS: { id: Persona; name: string; icon: string; vibe: string; sample: string }[] =
  [
    {
      id: 'goldie',
      name: 'Goldie',
      icon: '★',
      vibe: 'Classic charm',
      sample: '“Darling, you were robbed. Not really.”',
    },
    {
      id: 'velvet',
      name: 'Velvet',
      icon: '♥',
      vibe: 'Red-carpet diva',
      sample: '“I’ve read your messages. I need a lie down.”',
    },
    {
      id: 'disco',
      name: 'Disco',
      icon: '✦',
      vibe: 'Pure party hype',
      sample: '“EVERYONE’S A WINNER! Except Tomás.”',
    },
  ];

const GROUP_KINDS = [
  ['Friends', '✌', 'The group that knows too much'],
  ['Couple', '♡', 'A love story. With receipts.'],
  ['Family', '⌂', 'Runs in the family chat'],
  ['Housemates', '☕', 'Who left that in the sink?'],
  ['Work team', '▣', 'This meeting could be an award'],
  ['Trip crew', '✈', 'What happened on holiday…'],
  ['Sports club', '⚽', 'All talk, some game'],
  ['Wedding party', '♧', 'For better or for the group chat'],
];

/** renders the opening marquee and locally saved shows */
export const StartStep: FC<StepProps> = ({
  onChange,
  onNavigate,
  onUploaded,
  onNewShow,
  onReplay,
  show,
  hostLine,
  isHostTalking,
  isBusy,
}) => {
  const [savedShows, setSavedShows] = useState(readSavedShows);
  const [durations, setDurations] = useState<Record<string, number>>({});
  useEffect(() => {
    let isCancelled = false;
    void api
      .listShows()
      .then(async (remote) => {
        const ready = remote.filter((candidate) => candidate.stage === 'ready');
        if (!isCancelled)
          setSavedShows((local) => [
            ...local,
            ...ready.filter((candidate) => !local.some((saved) => saved.id === candidate.id)),
          ]);
        await Promise.allSettled(
          ready.map(async (saved) => {
            const script = readSavedScript(saved.id) ?? (await api.readCeremony(saved.id));
            if (!isCancelled)
              setDurations((previous) => ({ ...previous, [saved.id]: script.durationSeconds }));
          }),
        );
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <>
      <HostAvatar
        persona={show.settings.persona}
        isTalking={isHostTalking}
        className="host-avatar--hero"
      />
      <p className="hero-welcome">{hostLine}</p>
      <section className="hero-card">
        <span className="hero-spark hero-spark--left" aria-hidden="true">
          ✦
        </span>
        <span className="eyebrow">YOUR GROUP CHAT. ITS BIG NIGHT.</span>
        <h1>
          Who ate
          <br />
          <span className="foil">this year?</span>
        </h1>
        <p>
          A whole year of messages.
          <br />
          An awards show they’ll never live down.
        </p>
        <button type="button" className="button button--gold" disabled={isBusy} onClick={onNewShow}>
          Make a new show <span aria-hidden="true">↗</span>
        </button>
        <span className="hero-spark hero-spark--right" aria-hidden="true">
          ✧
        </span>
        <div className="hero-awards" aria-hidden="true">
          <span>✦</span>
          <span>♜</span>
          <span>✦</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>Your previous shows</h2>
        <span>THE GOOD, THE BAD, THE GROUP CHAT.</span>
      </div>
      <div className="previous-grid">
        {savedShows.map((saved) => (
          <button
            type="button"
            className="previous-show"
            key={saved.id}
            onClick={() => onReplay(saved)}
          >
            <span className={`show-thumb show-thumb--${saved.settings.look}`}>
              <span>✦</span>
              <strong>
                {saved.chat?.groupName ?? 'Your group'}
                <br />
                <em>The Spammys</em>
              </strong>
              <small>
                ▶{' '}
                {formatDuration(readSavedScript(saved.id)?.durationSeconds ?? durations[saved.id])}
              </small>
            </span>
            <strong>
              {saved.chat?.groupName ?? 'Your group'} · {new Date(saved.createdAt).getFullYear()}
            </strong>
            <span>
              {saved.settings.groupKind} · {saved.awards.length} awards ·{' '}
              {new Date(saved.updatedAt).toLocaleDateString('en-GB')}
            </span>
          </button>
        ))}
        <button
          type="button"
          className="previous-show previous-show--sample"
          onClick={() => {
            const sample = createSampleShow();
            onChange(sample);
            onUploaded(sample);
            onNavigate('awards');
          }}
        >
          <span className="show-thumb">
            <span>✦</span>
            <strong>
              Brunch Club
              <br />
              <em>The Spammys</em>
            </strong>
            <small>Fictional sample</small>
          </span>
          <strong>Meet the Brunch Club</strong>
          <span>Try the demo · no upload needed</span>
        </button>
        {!savedShows.length && (
          <div className="previous-empty">
            <span aria-hidden="true">✧</span>
            <p>
              Your legends start here.
              <br />
              Saved shows stay on this device.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

/** renders the group kind selection */
export const KindStep: FC<StepProps> = ({ show, onChange }) => (
  <>
    <div className="step-heading">
      <span className="eyebrow">THE CAST OF CHARACTERS</span>
      <h1>
        What kind of <span className="foil">chaos?</span>
      </h1>
      <p>Every chat has a personality. Let’s find yours.</p>
    </div>
    <div className="choice-grid choice-grid--kinds">
      {GROUP_KINDS.map(([name, icon, subtitle]) => (
        <button
          key={name}
          type="button"
          className={`choice-card ${show.settings.groupKind === name ? 'is-selected' : ''}`}
          aria-pressed={show.settings.groupKind === name}
          onClick={() => onChange({ ...show, settings: { ...show.settings, groupKind: name! } })}
        >
          <span className="choice-icon" aria-hidden="true">
            {icon}
          </span>
          <strong>{name}</strong>
          <span>{subtitle}</span>
          <span className="selected-check" aria-hidden="true">
            ✓
          </span>
        </button>
      ))}
    </div>
  </>
);

/** renders the fixed host persona selection */
export const HostStep: FC<StepProps> = ({ show, onChange, isHostTalking }) => (
  <>
    <div className="step-heading">
      <span className="eyebrow">YOUR HOST FOR THE EVENING</span>
      <h1>
        Pick your <span className="foil">main character.</span>
      </h1>
      <p>Three hosts. Absolutely no neutral opinions.</p>
    </div>
    <div className="choice-grid choice-grid--three">
      {PERSONAS.map((persona) => (
        <button
          type="button"
          key={persona.id}
          className={`choice-card persona-card persona-card--${persona.id} ${show.settings.persona === persona.id ? 'is-selected' : ''}`}
          aria-pressed={show.settings.persona === persona.id}
          onClick={() => onChange({ ...show, settings: { ...show.settings, persona: persona.id } })}
        >
          <HostAvatar
            persona={persona.id}
            isTalking={show.settings.persona === persona.id && isHostTalking}
          />
          <strong>{persona.name}</strong>
          <span className="persona-vibe">{persona.vibe}</span>
          <blockquote>{persona.sample}</blockquote>
          <span className="selected-check" aria-hidden="true">
            ✓
          </span>
        </button>
      ))}
    </div>
  </>
);

/** renders export upload and its parsing status */
export const UploadStep: FC<StepProps> = ({
  show,
  onUploaded,
  onNotice,
  isBusy,
  setBusy,
  isUploaded,
}) => {
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setDragging] = useState(false);

  async function uploadExport(
    selectedFile: File,
    dateOrder?: Exclude<DateOrder, 'ambiguous'>,
  ): Promise<void> {
    setFile(selectedFile);
    setBusy(true);
    setProgress(0);
    try {
      const created = show.id.startsWith('sample-')
        ? await api.createShow(show.settings)
        : await api.updateSettings(show.id, show.settings);
      setProgress(0);
      const uploaded = await api.uploadChat(created.id, selectedFile, dateOrder);
      setProgress(100);
      onUploaded(uploaded);
      onNotice('Export parsed locally. Choose the dates you want to celebrate.');
    } catch (error) {
      if (canUseSample(error)) {
        onUploaded(createSampleShow(show.settings));
        setProgress(100);
        onNotice(
          'The local server is unavailable. You’re exploring the fictional Brunch Club sample. Your selected file was not read.',
        );
      } else {
        setProgress(0);
        onNotice(
          `Could not read this export: ${(error as Error).message}. Try a WhatsApp .txt or .zip export.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="step-heading">
        <span className="eyebrow">BRING THE RECEIPTS</span>
        <h1>
          Drop the chat.
          <br />
          <span className="foil">We’ll bring the drama.</span>
        </h1>
        <p>WhatsApp exports only. Your chat stays on this laptop until you choose AI analysis.</p>
      </div>
      <div
        className={`upload-card ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const selected = event.dataTransfer.files[0];
          if (selected && !isBusy) void uploadExport(selected);
        }}
      >
        <span className="upload-icon" aria-hidden="true">
          ↥
        </span>
        <span className="file-pill">.TXT & .ZIP</span>
        <h2>Drop your WhatsApp export here</h2>
        <p>Open the group → tap its name → Export chat → Without media</p>
        <label className="button button--secondary file-label">
          Choose a file
          <input
            className="visually-hidden"
            type="file"
            accept=".txt,.zip,text/plain,application/zip"
            disabled={isBusy}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) void uploadExport(selected);
            }}
          />
        </label>
        <div className="sample-divider">
          <span>or skip the upload</span>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={isBusy}
          onClick={() => {
            onUploaded(createSampleShow(show.settings));
            setProgress(100);
            onNotice('Fictional Brunch Club sample loaded. Every person and message is made up.');
          }}
        >
          Try the sample: <strong>Brunch Club ↗</strong>
        </button>
      </div>
      {(isBusy || isUploaded) && (
        <div className="upload-progress" role="status">
          <div>
            <strong>
              {isBusy
                ? 'Parsing your export…'
                : `${show.chat?.groupName ?? file?.name ?? 'Your chat'} · ready`}
            </strong>
            <span>{isBusy ? 'In progress' : '100%'}</span>
          </div>
          <progress max="100" value={isBusy ? undefined : progress} />
          <ul>
            <li>
              {isBusy ? 'Reading and parsing' : '✓ Parsed'} {file?.name ?? 'Brunch Club sample'}
              {file ? ` · ${(file.size / 1024).toFixed(1)} KB` : ''}
            </li>
            {isUploaded && !isBusy && (
              <>
                <li>
                  ✓ Parsed {(show.chat?.messages.length ?? 0).toLocaleString('en-GB')} messages
                </li>
                <li>✓ Found {show.cast.length} people</li>
                <li>✓ Message dates mapped</li>
              </>
            )}
          </ul>
        </div>
      )}
      {isUploaded && show.chat?.dateOrder === 'ambiguous' && file && (
        <label className="date-order">
          Your export’s dates are ambiguous. Which format is right?
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                void uploadExport(file, event.target.value as Exclude<DateOrder, 'ambiguous'>);
            }}
          >
            <option value="" disabled>
              Choose date format
            </option>
            <option value="day-first">Day / month / year</option>
            <option value="month-first">Month / day / year</option>
          </select>
        </label>
      )}
    </>
  );
};

/** renders a selectable monthly message chart and date presets */
export const DatesStep: FC<StepProps> = ({ show, onChange }) => {
  const [startMonth, setStartMonth] = useState<string | null>(null);
  const counts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const message of show.chat?.messages ?? []) {
      const month = message.sentAt.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0) + 1);
    }
    const months = [...totals.keys()].sort();
    const first = months[0];
    const last = months.at(-1);
    if (!first || !last) return [];
    const result = [];
    const cursor = new Date(`${first}-01T12:00:00Z`);
    for (let month = first; month <= last; month = cursor.toISOString().slice(0, 7)) {
      result.push({
        month,
        label: cursor.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
        year: month.slice(0, 4),
        count: totals.get(month) ?? 0,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return result;
  }, [show.chat?.messages]);
  const maximum = counts.reduce((largest, month) => Math.max(largest, month.count), 1);
  const first = counts[0]?.month;
  const last = counts.at(-1)?.month;
  const from = show.settings.range?.from.slice(0, 7) ?? first;
  const to = show.settings.range?.to.slice(0, 7) ?? last;
  const formatMonth = (month: string): string =>
    new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const rangeLabel =
    from && to
      ? from === to
        ? formatMonth(from)
        : `${formatMonth(from)} – ${formatMonth(to)}`
      : 'No messages';

  function selectRange(from: string, to: string): void {
    const finalDate = new Date(`${to}-01T12:00:00`);
    finalDate.setMonth(finalDate.getMonth() + 1, 0);
    onChange({
      ...show,
      settings: {
        ...show.settings,
        range: { from: `${from}-01`, to: `${to}-${String(finalDate.getDate()).padStart(2, '0')}` },
      },
    });
  }

  return (
    <>
      <div className="step-heading">
        <span className="eyebrow">THE YEAR IN YAP</span>
        <h1>
          Which era are we <span className="foil">celebrating?</span>
        </h1>
        <p>Tap a start month, then an end month. The mess is yours to curate.</p>
      </div>
      <div className="chart-card range-chart-card">
        <div className="chart-header">
          <strong>{rangeLabel}</strong>
          <span>
            {counts
              .reduce(
                (total, month) =>
                  from && to && month.month >= from && month.month <= to
                    ? total + month.count
                    : total,
                0,
              )
              .toLocaleString('en-GB')}{' '}
            messages
          </span>
        </div>
        <p className="range-scroll-hint">
          Scroll through the months. Each bar includes its year; empty months show 0.
        </p>
        <div
          className="range-chart-scroll"
          role="region"
          aria-label="Monthly message counts"
          tabIndex={0}
        >
          <div className="range-month-chart" aria-label="Messages per month">
            {counts.map((month) => {
              const isSelected =
                !show.settings.range ||
                (month.month >= show.settings.range.from.slice(0, 7) &&
                  month.month <= show.settings.range.to.slice(0, 7));
              const barStyle = {
                height: month.count ? `${Math.max(4, (month.count / maximum) * 150)}px` : '2px',
              } as CSSProperties;
              return (
                <button
                  type="button"
                  key={month.month}
                  className={`range-month-bar ${isSelected ? 'is-selected' : ''} ${startMonth === month.month ? 'is-start' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`${month.label} ${month.year}: ${month.count.toLocaleString('en-GB')} messages`}
                  onClick={() => {
                    if (!startMonth) {
                      setStartMonth(month.month);
                      selectRange(month.month, month.month);
                    } else {
                      selectRange(...([startMonth, month.month].sort() as [string, string]));
                      setStartMonth(null);
                    }
                  }}
                >
                  <span className="range-bar-count">{month.count.toLocaleString('en-GB')}</span>
                  <span className="range-bar-track">
                    <span className="range-bar-fill" style={barStyle} />
                  </span>
                  <span className="range-bar-label">
                    {month.label}
                    <small>{month.year}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {!counts.length && <p>No messages to select. Go back and upload a chat.</p>}
        <div className="range-caption" role="status">
          {startMonth
            ? 'Now choose the end month'
            : show.settings.range
              ? `${show.settings.range.from} → ${show.settings.range.to}`
              : 'The whole chat'}
        </div>
      </div>
      <div className="preset-row">
        {['Whole year', 'Last 3 months', 'Summer', 'First half'].map((preset) => (
          <button
            type="button"
            className="chip"
            disabled={!first || !last}
            key={preset}
            onClick={() => {
              if (!first || !last) return;
              const year = (to ?? last).slice(0, 4);
              setStartMonth(null);
              if (preset === 'Whole year') selectRange(first, last);
              else if (preset === 'Last 3 months')
                selectRange(counts[Math.max(0, counts.length - 3)]?.month ?? first, last);
              else if (preset === 'Summer') selectRange(`${year}-06`, `${year}-08`);
              else selectRange(`${year}-01`, `${year}-06`);
            }}
          >
            {preset}
          </button>
        ))}
      </div>
    </>
  );
};

/** renders the requested roast intensity */
export const RoastStep: FC<StepProps> = ({ show, onChange }) => {
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateNotice, setEstimateNotice] = useState('');
  useEffect(() => {
    let isCancelled = false;
    setEstimate(null);
    setEstimateNotice('Estimating your selected messages…');
    if (show.id.startsWith('sample-')) {
      setEstimateNotice('Fictional sample · no AI request or token usage');
      return;
    }
    async function loadEstimate(): Promise<void> {
      try {
        await api.updateSettings(show.id, show.settings);
        const tokens = await api.estimateAnalysis(show.id);
        if (!isCancelled) {
          setEstimate(tokens);
          setEstimateNotice('');
        }
      } catch {
        if (!isCancelled)
          setEstimateNotice(
            'Token estimate unavailable. Check the local server before starting AI analysis.',
          );
      }
    }
    void loadEstimate();
    return () => {
      isCancelled = true;
    };
  }, [show.id, show.settings]);

  const levels: { id: RoastLevel; name: string; description: string; dots: string }[] = [
    { id: 'gentle', name: 'Gentle', description: 'Compliments with a wink', dots: '•' },
    { id: 'playful', name: 'Playful roast', description: 'Teasing, never cruel', dots: '••' },
    { id: 'savage', name: 'Savage', description: 'Nobody leaves unhurt', dots: '•••' },
  ];

  return (
    <>
      <div className="step-heading">
        <span className="eyebrow">SEASON TO TASTE</span>
        <h1>
          How much <span className="foil">heat?</span>
        </h1>
        <p>We roast the behaviour. Never who someone is.</p>
      </div>
      <div className="choice-grid choice-grid--three">
        {levels.map((level) => (
          <button
            type="button"
            className={`choice-card roast-card ${show.settings.roastLevel === level.id ? 'is-selected' : ''}`}
            aria-pressed={show.settings.roastLevel === level.id}
            key={level.id}
            onClick={() =>
              onChange({ ...show, settings: { ...show.settings, roastLevel: level.id } })
            }
          >
            <span className={`flame-dots flame-dots--${level.id}`} aria-hidden="true">
              {level.dots}
            </span>
            <strong>{level.name}</strong>
            <span>{level.description}</span>
            <blockquote>
              {level.id === 'gentle'
                ? '“Marco, your voice notes are a gift. A long gift.”'
                : level.id === 'playful'
                  ? '“Marco sent 412 voice notes. We’ve submitted them to a podcast network.”'
                  : '“Marco, we timed your voice notes. It’s a full season of TV.”'}
            </blockquote>
            <span className="selected-check" aria-hidden="true">
              ✓
            </span>
          </button>
        ))}
      </div>
      <p className="privacy-note" role="status">
        {estimate === null
          ? estimateNotice
          : `Estimated input: ${estimate.toLocaleString('en-GB')} tokens for your selected dates. Actual usage may differ.`}
      </p>
      <p className="privacy-note">
        Before AI analysis, names become pseudonyms and contact details are removed. The selected
        messages are sent to OpenAI; originals and photos stay in your local show folder.
      </p>
    </>
  );
};

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return 'Play show';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
