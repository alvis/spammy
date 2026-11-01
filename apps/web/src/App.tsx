import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AVATAR_CSS,
  awardTitleError,
  buildCeremonyScript,
  CeremonyScriptSchema,
  ShowSchema,
} from '@spammy/domain';
import type { Award, CeremonyScript, Show } from '@spammy/domain';
import type { ReactElement } from 'react';
import { FLOW_STEPS } from './flow';
import type { FlowStep } from './flow';
import { STEP_REGISTRY } from './steps';
import { PERSONAS } from './steps/setup';
import { createSampleShow } from './sample/show';
import { buildSampleCeremonyScript, withSamplePortraits } from './sample/media';
import { api, canUseSample } from './api/client';
import { HostAvatar } from './components/host-avatar';
import { readSavedScript } from './storage';
import { ReceiptsDrawer } from './components/receipts-drawer';
import './styles.css';
import { SubmissionProgress } from './components/submission-progress';

const DRAFT_KEY = 'spammy.current-draft';

interface JourneyDraft {
  show: Show;
  step: FlowStep;
}

function readDraft(): JourneyDraft | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!value || typeof value !== 'object' || !('show' in value) || !('step' in value))
      return null;
    const parsed = ShowSchema.safeParse(value.show);
    const step = FLOW_STEPS.find((candidate) => candidate === value.step);
    if (!parsed.success || !step) return null;
    // A reload returns to setup so production audio is never restarted unexpectedly.
    return {
      show: parsed.data.id.startsWith('sample-') ? withSamplePortraits(parsed.data) : parsed.data,
      step: step === 'show' || step === 'share' ? 'people' : step,
    };
  } catch {
    return null;
  }
}

/** orchestrates the host journey while preserving uploaded chats on request failures */
export function App(): ReactElement {
  const [draft] = useState(readDraft);
  const [step, setStep] = useState<FlowStep>(draft?.step ?? 'hello');
  const [show, setShow] = useState<Show>(() => draft?.show ?? createSampleShow());
  const [isUploaded, setUploaded] = useState(Boolean(draft?.show.chat));
  const [isBusy, setBusy] = useState(false);
  const operation = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [retry, setRetry] = useState(false);
  useEffect(() => () => operation.current?.abort(), []);
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState<Award | null>(null);
  const [ceremonyScript, setScript] = useState<CeremonyScript | null>(null);
  const [isReplay, setReplay] = useState(false);
  const [furthestStep, setFurthestStep] = useState(FLOW_STEPS.indexOf(draft?.step ?? 'hello'));
  const [typedLine, setTypedLine] = useState('');
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ show, step }));
    } catch {
      setNotice('Browser storage is full. Keep this tab open until you save the show.');
    }
  }, [show, step]);
  const persona = PERSONAS.find((candidate) => candidate.id === show.settings.persona)!;
  const position = FLOW_STEPS.indexOf(step);
  const dates = useMemo(() => {
    let first = '';
    let last = '';
    for (const message of show.chat?.messages ?? []) {
      const date = message.sentAt.slice(0, 10);
      if (!first || date < first) first = date;
      if (date > last) last = date;
    }
    return [first, last];
  }, [show.chat]);
  const hostLines: Record<FlowStep, string> = {
    hello: `Welcome to The Spammy! I’m ${persona.name}. Give me a group chat and I’ll throw it the awards show it deserves. Or rewatch an old one below.`,
    kind: 'First, what kind of chat are we roasting? It changes which awards I hand out.',
    host: 'Who’s hosting? Pick me. Or don’t. I’ll be fine. Probably.',
    chat: isBusy
      ? `Having a quick look… oh. Oh no.${isUploaded ? ` Oh, ${[...(show.chat?.participants ?? [])].sort((left, right) => right.messageCount - left.messageCount)[0]?.displayName ?? 'the group'}.` : ''}`
      : isUploaded
        ? `Quick look done: ${show.chat?.messages.length ?? 0} messages, ${dates[0] ? new Date(dates[0]).toLocaleDateString('en-GB', { month: 'short' }) : ''} to ${dates.at(-1) ? new Date(dates.at(-1)!).toLocaleDateString('en-GB', { month: 'short' }) : ''}. Next, pick the dates.`
        : 'Drop in your WhatsApp export. I’ll take a quick look before reading properly.',
    range: 'Which stretch should count? The whole year, or just that one chaotic summer?',
    spice: `How hard should I go on them? ${show.settings.roastLevel} it is, unless you say otherwise.`,
    awards: `I came up with ${show.awards.length} awards. Swap any you don’t like, shuffle the lot, or tap a quote to read the whole conversation.`,
    people:
      'Last thing. WhatsApp names are a mess. Fix them here and add photos for the red carpet.',
    show: '',
    share: 'Send it to the group. Then mute the group.',
  };
  const line = hostLines[step];
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedLine(line);
      return;
    }
    let length = 0;
    setTypedLine('');
    const timer = window.setInterval(() => {
      length += 2;
      setTypedLine(line.slice(0, length));
      if (length >= line.length) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, [line]);
  function navigate(next: FlowStep): void {
    setRetry(false);
    setStep(next);
    setFurthestStep((previous) => Math.max(previous, FLOW_STEPS.indexOf(next)));
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function uploaded(next: Show): void {
    setShow(next);
    setUploaded(true);
    setScript(null);
  }
  async function newShow(): Promise<void> {
    setBusy(true);
    setNotice('');
    try {
      setShow(await api.createShow({}));
      setUploaded(false);
      setScript(null);
      setReplay(false);
      setFurthestStep(1);
      navigate('kind');
    } catch (error) {
      if (canUseSample(error)) {
        setShow(createSampleShow());
        setUploaded(false);
        setScript(null);
        setReplay(false);
        setFurthestStep(1);
        navigate('kind');
        setNotice(
          'The local server is unavailable. You can explore the fictional Brunch Club sample.',
        );
      } else setNotice(`Could not create a show: ${(error as Error).message}. Please retry.`);
    } finally {
      setBusy(false);
    }
  }
  async function replay(saved?: Show): Promise<void> {
    const source = saved ?? show;
    const next = source.id.startsWith('sample-') ? withSamplePortraits(source) : source;
    setBusy(true);
    try {
      let script = saved ? readSavedScript(next.id) : ceremonyScript;
      if (!script && !next.id.startsWith('sample-')) script = await api.readCeremony(next.id);
      setShow(next);
      setUploaded(true);
      setScript(
        next.id.startsWith('sample-')
          ? buildSampleCeremonyScript(next, script)
          : (script ?? buildCeremonyScript(next)),
      );
      setReplay(true);
      navigate('show');
    } catch (error) {
      setNotice(
        `Could not replay this show: ${(error as Error).message}. Please retry when the local server is available.`,
      );
    } finally {
      setBusy(false);
    }
  }
  function cancelSubmission(): void {
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
    setPhase('');
    setRetry(true);
    setNotice(
      'Stopped waiting. Your chat and settings are kept. The server may still finish the current request.',
    );
  }
  async function advance(): Promise<void> {
    if (isBusy || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const { signal } = controller;
    const wait = async <T,>(promise: Promise<T>): Promise<T> => {
      const result = await promise;
      signal.throwIfAborted();
      return result;
    };
    setStartedAt(Date.now());
    setRetry(false);
    setBusy(true);
    setNotice('');
    try {
      if (step === 'awards' && show.awards.some((award) => awardTitleError(award.title))) {
        setNotice('Keep every award name to four words or fewer before continuing.');
        return;
      }
      if (step === 'spice' && !show.id.startsWith('sample-')) {
        setPhase('Saving your settings');
        await wait(api.updateSettings(show.id, show.settings, signal));
        setPhase('Reading your chat');
        await wait(api.analyze(show.id, signal));
        setPhase('Writing your awards');
        const awards = await wait(api.suggestAwards(show.id, signal));
        setShow({ ...show, awards });
      }
      if (step === 'awards' && !show.id.startsWith('sample-')) {
        setPhase('Saving your awards');
        await wait(api.saveAwards(show.id, show.awards, signal));
        for (const award of show.awards)
          await wait(
            api.decideAward(
              show.id,
              award.id,
              award.decision === 'sealed'
                ? { decision: 'sealed' }
                : { decision: 'host-picked', winnerId: award.winnerId! },
              signal,
            ),
          );
      }
      if (step === 'people') {
        setReplay(false);
        if (show.cast.some((person) => !person.displayName.trim())) {
          setNotice('Give each person a display name before rolling the show.');
          return;
        }
        if (show.id.startsWith('sample-')) setScript(buildSampleCeremonyScript(show));
        else {
          setPhase('Saving your cast');
          await wait(
            api.updateCast(
              show.id,
              show.cast.map((person) => ({
                id: person.id,
                displayName: person.displayName,
                costumeId: person.costumeId,
              })),
              signal,
            ),
          );
          setPhase('Producing your ceremony');
          const result = await wait(api.produceShow(show.id, signal));
          const parsed = CeremonyScriptSchema.safeParse(
            result && typeof result === 'object' && 'script' in result ? result.script : result,
          );
          if (parsed.success) setScript(parsed.data);
          else {
            setRetry(true);
            setNotice(
              'Production did not return a playable ceremony. Your chat and settings are kept. Please retry.',
            );
            return;
          }
        }
      }
      navigate(FLOW_STEPS[position + 1] ?? 'hello');
    } catch (error) {
      if (operation.current !== controller || signal.aborted) return;
      setRetry(true);
      const failure = error as Error;
      const message =
        failure.name === 'TimeoutError'
          ? 'The request took too long. The server may still be finishing it.'
          : failure.message;
      setNotice(`Could not continue: ${message} Your chat and settings are kept. Please retry.`);
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setPhase('');
        setBusy(false);
      }
    }
  }

  const stepNames = [
    'Start',
    'Chat type',
    'Host',
    'Upload',
    'Dates',
    'Roast level',
    'Awards',
    'Who’s who',
    'The show',
    'Share',
  ];
  const Screen = STEP_REGISTRY[step];
  const labels: Partial<Record<FlowStep, string>> = {
    host: `${persona.name} it is`,
    spice: 'Write the awards',
    awards: 'Lock them in',
    people: 'Roll the show',
  };
  return (
    <div className="app-shell">
      <style>{AVATAR_CSS}</style>
      <header className="site-header">
        <button className="brand" type="button" disabled={isBusy} onClick={() => navigate('hello')}>
          the <strong>Spammy</strong>
          <span>✦</span>
        </button>
        <div className="journey-progress">
          <span>
            {stepNames[position]} · {position + 1} of 10
          </span>
          <div aria-label={`Step ${position + 1} of 10`}>
            {FLOW_STEPS.map((candidate, index) => (
              <button
                type="button"
                key={candidate}
                aria-label={`Go to ${stepNames[index]}`}
                aria-current={index === position ? 'step' : undefined}
                disabled={
                  isBusy ||
                  index >= furthestStep ||
                  index === position ||
                  (['show', 'share'].includes(candidate) && !ceremonyScript)
                }
                onClick={() => navigate(candidate)}
                className={index <= position ? 'is-active' : ''}
              />
            ))}
          </div>
        </div>
        <span className="localhost-badge">● localhost</span>
      </header>
      <main className={step === 'show' ? 'main-content main-content--show' : 'main-content'}>
        {line && step !== 'hello' && (
          <aside className="host-bubble">
            <HostAvatar
              persona={persona.id}
              isTalking={typedLine.length < line.length}
              className="host-avatar--small"
            />
            <div>
              <small>{persona.name} · your AI host</small>
              <p aria-label={line}>
                {typedLine}
                <span aria-hidden="true" className="typing-cursor">
                  |
                </span>
              </p>
            </div>
          </aside>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        <fieldset disabled={Boolean(phase)} style={{ display: 'contents' }}>
          <Screen
            onNewShow={() => void newShow()}
            isReplay={isReplay}
            onReplay={(saved) => void replay(saved)}
            hostLine={typedLine}
            isHostTalking={typedLine.length < line.length}
            show={show}
            onChange={(next) => {
              setShow(next);
              setScript(null);
            }}
            onNavigate={navigate}
            onNotice={setNotice}
            isBusy={isBusy}
            setBusy={setBusy}
            isUploaded={isUploaded}
            onUploaded={uploaded}
            onReceipts={setReceipt}
            ceremonyScript={ceremonyScript}
            onScript={setScript}
          />
        </fieldset>
        {phase && (
          <SubmissionProgress phase={phase} startedAt={startedAt} onCancel={cancelSubmission} />
        )}
        {!['hello', 'show', 'share'].includes(step) && (
          <footer className="step-navigation">
            <button
              type="button"
              className="text-button"
              disabled={isBusy}
              onClick={() => navigate(FLOW_STEPS[position - 1] ?? 'hello')}
            >
              ← Back
            </button>
            <span>MADE FOR YOUR PEOPLE.</span>
            <button
              type="button"
              className="button"
              disabled={
                isBusy ||
                (step === 'chat' && (!isUploaded || show.chat?.dateOrder === 'ambiguous')) ||
                (step === 'awards' &&
                  (show.awards.length < 3 ||
                    show.awards.some((award) => awardTitleError(award.title))))
              }
              onClick={() => void advance()}
            >
              {isBusy
                ? phase
                  ? `${phase}…`
                  : 'Working…'
                : retry
                  ? 'Retry'
                  : (labels[step] ?? 'Next')}{' '}
              <span aria-hidden="true">→</span>
            </button>
          </footer>
        )}
      </main>
      <footer className="site-footer">
        <span>THE SPAMMY</span>
        <p>Small chat. Big main-character energy.</p>
        <span>✦</span>
      </footer>
      {receipt && <ReceiptsDrawer show={show} award={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
