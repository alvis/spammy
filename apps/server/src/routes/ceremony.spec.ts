import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCeremonyScript } from '@spammy/domain';
import { createShowStore } from '@spammy/store';

import { createApp } from '../app';

describe('ceremony replay endpoint', () => {
  it('serves only a validated ready ceremony while keeping JSON assets and setup winners private', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ceremony-route-'));
    const store = createShowStore({ dataDir: directory });
    try {
      const show = await store.createShow({});
      show.awards = [
        {
          id: 'award',
          showName: 'Friends',
          title: 'Best',
          howJudged: 'Messages',
          decision: 'sealed',
          winnerId: 'p',
          nominees: [{ participantId: 'p', stat: 'Most', quote: 'Hi', receiptMessageId: null }],
          receipts: [],
        },
      ];
      await store.writeShow(show);
      const app = createApp({ store });
      const url = `http://localhost/api/shows/${show.id}`;
      const script = buildCeremonyScript(show);
      await store.writeAsset(show.id, 'ceremony-script.json', Buffer.from(JSON.stringify(script)));
      expect((await app.request(`${url}/ceremony`)).status).toBe(409);
      await store.writeShow({ ...show, stage: 'ready' });
      const replay = await app.request(`${url}/ceremony`);
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual(script);
      expect(await (await app.request(url)).json()).toMatchObject({ awards: [{ winnerId: null }] });
      expect((await app.request(`${url}/assets/ceremony-script.json`)).status).toBe(404);
      await store.writeAsset(show.id, 'production-manifest.json', Buffer.from('{}'));
      expect((await app.request(`${url}/assets/production-manifest.json`)).status).toBe(404);
      await store.writeAsset(show.id, 'ceremony-script.json', Buffer.from('{}'));
      expect((await app.request(`${url}/ceremony`)).status).toBe(409);
      const missing = await store.createShow({});
      await store.writeShow({ ...missing, stage: 'ready' });
      expect((await app.request(`http://localhost/api/shows/${missing.id}/ceremony`)).status).toBe(
        404,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
