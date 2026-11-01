import { useEffect, useState } from 'react';

import { FLOW_STEPS } from './flow';

import type { FlowStep } from './flow';

type ServerStatus = 'checking' | 'ok' | 'down';

/** root shell: step navigation placeholder until each screen is built */
export function App() {
  const [step, setStep] = useState<FlowStep>('hello');
  const [server, setServer] = useState<ServerStatus>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setServer(response.ok ? 'ok' : 'down'))
      .catch(() => setServer('down'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Wrapa — Who ate 2026?</h1>
      <p>server: {server}</p>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FLOW_STEPS.map((candidate) => (
          <button key={candidate} type="button" disabled={candidate === step} onClick={() => setStep(candidate)}>
            {candidate}
          </button>
        ))}
      </nav>
      <section>
        <h2>{step}</h2>
        <p>Screen not built yet.</p>
      </section>
    </main>
  );
}
