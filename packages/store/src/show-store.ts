import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import { CreateShowRequestSchema, ShowSchema } from '@spammy/domain';

import type { CreateShowRequest, Show } from '@spammy/domain';

/** persistence for shows and their assets */
export interface ShowStore {
  /** creates and persists a new draft show */
  createShow(request: CreateShowRequest): Promise<Show>;
  /** reads a show, or null when it does not exist */
  readShow(showId: string): Promise<Show | null>;
  /** lists all shows, newest first */
  listShows(): Promise<Show[]>;
  /** replaces a show atomically */
  writeShow(show: Show): Promise<void>;
  /** stores an asset and returns its path relative to the data directory */
  writeAsset(showId: string, fileName: string, bytes: Uint8Array): Promise<string>;
  /** reads asset bytes, or null when the asset does not exist */
  readAsset(showId: string, fileName: string): Promise<Uint8Array | null>;
}

/** store location */
export interface ShowStoreOptions {
  /** root directory; shows live under `<dataDir>/shows/<id>/show.json` */
  dataDir: string;
}

const SAFE_COMPONENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * creates a file-backed show store with schema-validated reads and atomic writes
 * @param options store location
 * @returns show persistence capabilities
 */
export function createShowStore(options: ShowStoreOptions): ShowStore {
  const dataDir = resolve(options.dataDir);
  const showPath = (showId: string): string => join(dataDir, 'shows', validateComponent(showId));

  const readShow = async (showId: string): Promise<Show | null> => {
    try {
      const bytes = await readFile(join(showPath(showId), 'show.json'), 'utf8');
      const show = ShowSchema.parse(JSON.parse(bytes));
      if (show.id !== showId)
        throw new TypeError('stored show identifier does not match its directory');
      return show;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  };

  const writeShow = async (show: Show): Promise<void> => {
    const record = ShowSchema.parse(show);
    const directory = showPath(record.id);
    await mkdir(join(directory, 'assets'), { recursive: true });
    const temporaryPath = join(directory, `${randomUUID()}.tmp`);
    await writeFile(temporaryPath, JSON.stringify(record, null, 2), { mode: 0o600 });
    await rename(temporaryPath, join(directory, 'show.json'));
  };

  return {
    async createShow(request): Promise<Show> {
      const settings = CreateShowRequestSchema.parse(request);
      const timestamp = new Date().toISOString();
      const show: Show = {
        id: randomUUID(),
        createdAt: timestamp,
        updatedAt: timestamp,
        stage: 'draft',
        settings: {
          groupKind: 'friends',
          persona: 'goldie',
          look: 'ivory',
          roastLevel: 'playful',
          range: null,
          ...settings,
        },
        chat: null,
        cast: [],
        groupPhotoAssetId: null,
        awards: [],
      };
      await writeShow(show);
      return show;
    },
    readShow,
    async listShows(): Promise<Show[]> {
      let entries;
      try {
        entries = await readdir(join(dataDir, 'shows'), { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
      }
      const shows = await Promise.all(
        entries.filter((entry) => entry.isDirectory()).map((entry) => readShow(entry.name)),
      );
      return shows
        .filter((show): show is Show => show !== null)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    writeShow,
    async writeAsset(showId, fileName, bytes): Promise<string> {
      const directory = join(showPath(showId), 'assets');
      const path = join(directory, validateComponent(fileName));
      await mkdir(directory, { recursive: true });
      await writeFile(path, bytes, { mode: 0o600 });
      return relative(dataDir, path);
    },
    async readAsset(showId, fileName): Promise<Uint8Array | null> {
      try {
        return await readFile(join(showPath(showId), 'assets', validateComponent(fileName)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
  };
}

function validateComponent(component: string): string {
  if (!SAFE_COMPONENT.test(component)) throw new TypeError('invalid show or asset identifier');
  return component;
}
