import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { buildComposition, renderCeremony } from '@spammy/ceremony';
import { createShowStore } from '@spammy/store';
import { buildCeremonyScript } from '@spammy/domain';

import { registerExportRoutes } from './exports';
import { registerCastRoutes } from './cast';
import { registerCeremonyRoutes } from './ceremony';

import type { renderPoster } from '@spammy/ceremony';

describe('fn:registerExportRoutes', () => {
  it('should replay and export the latest local costume without changing the produced timeline', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'export-route-test-'));
    const store = createShowStore({ dataDir: directory });
    const poster: typeof renderPoster = async (_show, options) => {
      const path = join(options!.directory!, 'poster.png');
      await writeFile(path, JSON.stringify(options!.script));
      await writeFile(join(options!.directory!, 'index.html'), '<html></html>');
      await writeFile(join(options!.directory!, 'gsap.min.js'), '');
      await writeFile(join(options!.directory!, 'fredoka-latin-700-normal.woff2'), '');
      await writeFile(join(options!.directory!, 'nunito-latin-800-normal.woff2'), '');
      return {
        id: 'poster',
        kind: 'poster',
        path,
        provider: 'hyperframes',
        model: null,
        createdAt: '2026-01-01T00:00:00Z',
      };
    };
    try {
      const show = await store.createShow({});
      const cast = [
        {
          id: 'alex',
          participantId: 'alex',
          displayName: 'Alex',
          photoAssetId: null,
          face: null,
          costumeId: 'black-tuxedo' as const,
        },
      ];
      const produced = buildCeremonyScript({ ...show, cast });
      await store.writeShow({ ...show, cast, stage: 'ready' });
      await store.writeAsset(
        show.id,
        'ceremony-script.json',
        Buffer.from(JSON.stringify(produced)),
      );
      const app = new Hono();
      registerCastRoutes(app, { store });
      registerCeremonyRoutes(app, { store });
      registerExportRoutes(
        app,
        { store },
        { buildComposition, renderCeremony, renderPoster: poster },
      );

      const update = await app.request(`/api/shows/${show.id}/cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cast: [{ id: 'alex', costumeId: 'scarlet-gown' }] }),
      });
      expect(update.status).toBe(200);
      const expected = { ...produced, cast: [{ ...cast[0], costumeId: 'scarlet-gown' }] };
      expect(await (await app.request(`/api/shows/${show.id}/ceremony`)).json()).toEqual(expected);
      const response = await app.request(`/api/shows/${show.id}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'poster' }),
      });

      expect(response.status).toEqual(200);
      expect(await response.json()).toMatchObject({
        url: `/api/shows/${show.id}/assets/poster-poster.png`,
        asset: { kind: 'poster', path: `shows/${show.id}/assets/poster-poster.png` },
      });
      expect(
        JSON.parse(
          new TextDecoder().decode((await store.readAsset(show.id, 'poster-poster.png'))!),
        ),
      ).toEqual(expected);
      expect(
        JSON.parse(
          new TextDecoder().decode((await store.readAsset(show.id, 'ceremony-script.json'))!),
        ),
      ).toEqual(produced);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it.todo('TODO(draft): covers invalid requests, missing shows and local renderer failures');
});
