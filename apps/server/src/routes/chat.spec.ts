import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';
import { expect, it } from 'vitest';
import { createShowStore } from '@spammy/store';

import { registerChatRoutes } from './chat';

it('should persist an uploaded chat and reports its date distribution', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-route-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    const app = new Hono();
    registerChatRoutes(app, { store });
    const form = new FormData();
    form.set('file', new File(['14/02/2026, 09:12 - Alex: hello'], 'chat.txt'));
    const response = await app.request(`/api/shows/${show.id}/chat`, {
      method: 'POST',
      body: form,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      messages: 1,
      months: [{ month: '2026-02', count: 1 }],
      dateOrder: 'day-first',
    });
    expect(await store.readShow(show.id)).toMatchObject({
      stage: 'chat-uploaded',
      cast: [{ id: 'alex', displayName: 'Alex' }],
    });
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
