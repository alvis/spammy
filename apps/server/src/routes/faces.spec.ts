import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { Hono } from 'hono';
import { OpenAI } from 'openai';
import { expect, it, vi } from 'vitest';
import { createShowStore } from '@spammy/store';
import { registerFaceRoutes } from './faces';

it('should store the group photo and returns numbered-box input for host assignment', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-face-'));
  try {
    const store = createShowStore({ dataDir });
    const show = {
      ...(await store.createShow({})),
      awards: [
        {
          id: 'award',
          showName: 'Awards',
          title: 'Best chatter',
          howJudged: 'Messages',
          nominees: [
            { participantId: 'alex', stat: 'Chats', quote: 'Hello', receiptMessageId: null },
          ],
          decision: 'sealed' as const,
          winnerId: 'alex',
          receipts: [],
        },
      ],
      cast: [
        { id: 'alex', participantId: 'alex', displayName: 'Alex', photoAssetId: null, face: null },
      ],
    };
    await store.writeShow(show);
    const client = new OpenAI({ apiKey: 'offline-test' });
    const faces = [{ x: 0.1, y: 0.1, width: 0.2, height: 0.3 }];
    vi.spyOn(client.responses, 'parse').mockResolvedValue({ output_parsed: { faces } } as Awaited<
      ReturnType<typeof client.responses.parse>
    >);
    const app = new Hono();
    registerFaceRoutes(app, { store }, { client });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' }));

    const response = await app.request(`/api/shows/${show.id}/faces`, {
      method: 'POST',
      body: form,
    });
    const result = z
      .object({ photoAssetId: z.string(), faces: z.array(z.unknown()).optional() })
      .parse(await response.json());

    expect(response.status).toBe(200);
    expect(result.faces).toEqual(faces);
    expect(await store.readAsset(show.id, result.photoAssetId)).toEqual(Buffer.from([1, 2, 3]));
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

it('should preserve concurrent show edits when face location completes', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-face-concurrent-'));
  try {
    const store = createShowStore({ dataDir });
    const show = {
      ...(await store.createShow({})),
      awards: [
        {
          id: 'award',
          showName: 'Awards',
          title: 'Best chatter',
          howJudged: 'Messages',
          nominees: [
            { participantId: 'alex', stat: 'Chats', quote: 'Hello', receiptMessageId: null },
          ],
          decision: 'sealed' as const,
          winnerId: 'alex',
          receipts: [],
        },
      ],
      cast: [
        { id: 'alex', participantId: 'alex', displayName: 'Alex', photoAssetId: null, face: null },
      ],
    };
    await store.writeShow(show);
    const client = new OpenAI({ apiKey: 'offline-test' });
    const started = deferred<void>();
    const completed = deferred<Awaited<ReturnType<typeof client.responses.parse>>>();
    vi.spyOn(client.responses, 'parse').mockImplementation(() => {
      started.resolve();
      return completed.promise as ReturnType<typeof client.responses.parse>;
    });
    const app = new Hono();
    registerFaceRoutes(app, { store }, { client });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' }));

    const pending = app.request(`/api/shows/${show.id}/faces`, { method: 'POST', body: form });
    await started.promise;
    await store.writeShow({
      ...show,
      stage: 'ready',
      settings: { ...show.settings, look: 'blacktie' },
    });
    completed.resolve({ output_parsed: { faces: [] } } as Awaited<
      ReturnType<typeof client.responses.parse>
    >);
    const response = await pending;

    expect(response.status).toBe(200);
    expect(await store.readShow(show.id)).toEqual(
      expect.objectContaining({
        stage: 'ready',
        settings: expect.objectContaining({ look: 'blacktie' }),
        groupPhotoAssetId: expect.stringMatching(/^group-/),
      }),
    );
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

it('should reject faces processing without eligible nominees', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-faces-ineligible-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    await store.writeShow({
      ...show,
      cast: [
        { id: 'alex', participantId: 'alex', displayName: 'Alex', photoAssetId: null, face: null },
      ],
    });
    const app = new Hono();
    registerFaceRoutes(app, { store });
    const body = new FormData();
    body.set('file', new File([new Uint8Array([1])], 'photo.png', { type: 'image/png' }));
    const response = await app.request(`/api/shows/${show.id}/faces`, { method: 'POST', body });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'no_nominees' });
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
