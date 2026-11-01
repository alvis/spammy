import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';
import { expect, it } from 'vitest';
import { createShowStore } from '@spammy/store';

import { registerAwardDecisionRoutes } from './awards-decision';

it('should record a host pick and hides a subsequently sealed winner', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-route-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    const app = new Hono();
    registerAwardDecisionRoutes(app, { store });
    await store.writeShow({
      ...show,
      awards: [
        {
          id: 'award',
          showName: 'Show',
          title: 'Winner',
          howJudged: 'Votes',
          nominees: [
            { participantId: 'alex', stat: 'One', quote: 'Hello', receiptMessageId: null },
          ],
          decision: 'sealed',
          winnerId: 'alex',
          receipts: [],
        },
      ],
    });
    const response = await app.request(`/api/shows/${show.id}/awards/award`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'host-picked', winnerId: 'alex' }),
    });
    expect(await response.json()).toMatchObject({ decision: 'host-picked', winnerId: 'alex' });
    const sealed = await app.request(`/api/shows/${show.id}/awards/award`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'sealed' }),
    });

    expect(await sealed.json()).toMatchObject({ decision: 'sealed', winnerId: null });
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
