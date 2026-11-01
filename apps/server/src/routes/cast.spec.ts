import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';
import { expect, it } from 'vitest';
import { createShowStore } from '@spammy/store';
import { DEFAULT_COSTUME_ID, resolveCastAvatar } from '@spammy/domain';

import { registerCastRoutes } from './cast';

it('should rename and excludes cast members', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-route-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    const app = new Hono();
    registerCastRoutes(app, { store });
    await store.writeShow({
      ...show,
      cast: ['alex', 'sam'].map((id) => ({
        id,
        participantId: id,
        displayName: id,
        photoAssetId: null,
        face: null,
      })),
    });
    const response = await app.request(`/api/shows/${show.id}/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cast: [
          { id: 'alex', displayName: 'Alexandra' },
          { id: 'sam', excluded: true },
        ],
      }),
    });

    expect(response.status).toBe(200);
    expect((await store.readShow(show.id))?.cast).toEqual([
      {
        id: 'alex',
        participantId: 'alex',
        displayName: 'Alexandra',
        photoAssetId: null,
        face: null,
      },
    ]);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

it('should persist a local costume through reload and resolve older cast without changing photos', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-costume-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    const member = {
      id: 'alex',
      participantId: 'alex',
      displayName: 'Alex',
      photoAssetId: 'cropped.png',
      face: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
    };
    await store.writeShow({ ...show, cast: [member] });
    const app = new Hono();
    registerCastRoutes(app, { store });
    const oldShow = await createShowStore({ dataDir }).readShow(show.id);
    expect(resolveCastAvatar(oldShow!.cast[0]!)).toMatchObject({
      costume: { id: DEFAULT_COSTUME_ID },
      photoUrl: undefined,
      initial: 'A',
    });
    const response = await app.request(`/api/shows/${show.id}/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cast: [{ id: 'alex', costumeId: 'scarlet-gown' }] }),
    });
    expect(response.status).toBe(200);
    const reloaded = await createShowStore({ dataDir }).readShow(show.id);
    expect(reloaded!.cast[0]).toEqual({ ...member, costumeId: 'scarlet-gown' });
    const avatar = resolveCastAvatar(reloaded!.cast[0]!, '/cropped.png', '/local-costume.png');
    expect({
      id: avatar.costume.id,
      photo: avatar.photoUrl,
      costume: avatar.costumeUrl,
      initial: avatar.initial,
    }).toEqual({
      id: 'scarlet-gown',
      photo: '/cropped.png',
      costume: '/local-costume.png',
      initial: 'A',
    });
    const invalid = await app.request(`/api/shows/${show.id}/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cast: [{ id: 'alex', costumeId: '../../unknown' }] }),
    });
    expect(invalid.status).toBe(400);
    expect((await store.readShow(show.id))!.cast[0]).toEqual(reloaded!.cast[0]);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
