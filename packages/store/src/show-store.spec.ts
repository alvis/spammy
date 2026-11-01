import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createShowStore } from './show-store';

describe('fn:createShowStore', () => {
  it('should persist a show and its assets across store instances', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'spammy-store-'));
    const store = createShowStore({ dataDir });
    try {
      const show = await store.createShow({ persona: 'velvet' });
      await store.writeAsset(show.id, 'portrait.png', new Uint8Array([1, 2, 3]));
      const reopened = createShowStore({ dataDir });

      expect(await reopened.readShow(show.id)).toEqual(show);
      expect(await reopened.listShows()).toEqual([show]);
      expect(
        JSON.parse(await readFile(join(dataDir, 'shows', show.id, 'show.json'), 'utf8')),
      ).toEqual(show);
      expect(Array.from((await reopened.readAsset(show.id, 'portrait.png'))!)).toEqual([1, 2, 3]);
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
  // TODO(draft): finalize missing-record, corrupt-file and atomic replacement coverage
  it.todo('should return null when reading an unknown show');
  it.todo('should list shows newest first');
  it.todo('should write shows atomically via temp file and rename');
  it.todo('should reject show files that fail ShowSchema');
});
