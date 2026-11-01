import { useEffect, useRef, useState } from 'react';

import type { ReactElement } from 'react';

/** current submission phase and cancellation controls */
export type SubmissionProgressProps = {
  phase: string;
  startedAt: number;
  onCancel: () => void;
};

/** shows the current server request without inventing completion percentages */
export function SubmissionProgress({
  phase,
  startedAt,
  onCancel,
}: SubmissionProgressProps): ReactElement {
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    status.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = (): void => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return (
    <div ref={status} className="notice submission-progress">
      <strong role="status">{phase}…</strong>
      <p>
        {Math.floor(elapsed / 60)}m {elapsed % 60}s elapsed · Waiting for the server. Large chats
        can take several minutes.
      </p>
      <p>
        Your upload and choices are kept. Each AI request waits up to{' '}
        {phase === 'Producing your ceremony' ? '30' : '10'} minutes.
      </p>
      <button type="button" className="text-button" onClick={onCancel}>
        Cancel waiting
      </button>
    </div>
  );
}
