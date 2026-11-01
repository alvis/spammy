import { NotImplementedError } from '@wrapa/domain';

import type { CreateShowRequest, Show } from '@wrapa/domain';

/** persistence for shows: one JSON file per show plus an assets directory */
export interface ShowStore {
  /** creates and persists a new draft show */
  createShow(request: CreateShowRequest): Promise<Show>;
  /** reads a show, or null when it does not exist */
  readShow(showId: string): Promise<Show | null>;
  /** lists all shows, newest first */
  listShows(): Promise<Show[]>;
  /** replaces a show atomically */
  writeShow(show: Show): Promise<void>;
  /** stores an asset file and returns its path relative to the data directory */
  writeAsset(showId: string, fileName: string, bytes: Uint8Array): Promise<string>;
}

/** store location */
export interface ShowStoreOptions {
  /** root directory; shows live under `<dataDir>/shows/<id>/show.json` */
  dataDir: string;
}

/**
 * creates a file-backed show store
 * @param options store location
 * @returns show store
 */
export function createShowStore(options: ShowStoreOptions): ShowStore {
  const notImplemented = async (): Promise<never> => {
    throw new NotImplementedError('store.ShowStore');
  };

  return {
    createShow: notImplemented,
    readShow: notImplemented,
    listShows: notImplemented,
    writeShow: notImplemented,
    writeAsset: notImplemented,
  };
}
