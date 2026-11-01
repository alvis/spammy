import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';
import { expect, it } from 'vitest';
import { createShowStore } from '@spammy/store';

import { registerPhotoRoutes } from './photos';

it('should persist a cast photo and serves its bytes', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-route-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    const app = new Hono();
    registerPhotoRoutes(app, { store });
    await store.writeShow({
      ...show,
      awards: [
        {
          id: 'award',
          showName: 'Awards',
          title: 'Best chatter',
          howJudged: 'Messages',
          nominees: [
            { participantId: 'alex', stat: 'Chats', quote: 'Hello', receiptMessageId: null },
          ],
          decision: 'sealed',
          winnerId: 'alex',
          receipts: [],
        },
      ],
      cast: [
        { id: 'alex', participantId: 'alex', displayName: 'Alex', photoAssetId: null, face: null },
      ],
    });
    const form = new FormData();
    form.set('castMemberId', 'alex');
    form.set('face', JSON.stringify({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }));
    form.set(
      'file',
      new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' }),
    );
    const response = await app.request(`/api/shows/${show.id}/photos`, {
      method: 'POST',
      body: form,
    });
    const saved = await store.readShow(show.id);
    const asset = await app.request(`/api/shows/${show.id}/assets/${saved?.cast[0]?.photoAssetId}`);

    expect(response.status).toBe(200);
    expect(saved?.cast[0]?.face).toEqual({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
    expect(asset.headers.get('Content-Type')).toBe('image/png');
    expect(Array.from(new Uint8Array(await asset.arrayBuffer()))).toEqual([137, 80, 78, 71]);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

it('should reject portrait and group-face assignments for a cast member without nominations', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-photo-ineligible-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    await store.writeShow({
      ...show,
      cast: [
        {
          id: 'alex',
          participantId: 'alex',
          displayName: 'Alex',
          photoAssetId: 'existing.png',
          face: null,
        },
      ],
    });
    const app = new Hono();
    registerPhotoRoutes(app, { store });
    for (const cropped of [false, true]) {
      const form = new FormData();
      form.set('castMemberId', 'alex');
      form.set('file', new File([new Uint8Array([1])], 'photo.png', { type: 'image/png' }));
      if (cropped) form.set('face', JSON.stringify({ x: 0, y: 0, width: 1, height: 1 }));
      const response = await app.request(`/api/shows/${show.id}/photos`, {
        method: 'POST',
        body: form,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'not_nominated' });
    }
    expect((await store.readShow(show.id))?.cast[0]?.photoAssetId).toBe('existing.png');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
