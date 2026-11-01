import { CeremonyScriptSchema, ShowSchema } from '@spammy/domain';

import type { CeremonyScript, Show } from '@spammy/domain';

const SAVED_SHOWS_KEY = 'spammy.saved-shows';

/**
 * reads locally saved shows while ignoring malformed or older records
 * @returns validated shows available on this device
 */
export function readSavedShows(): Show[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_SHOWS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((candidate: unknown) => {
      const show = ShowSchema.safeParse(candidate);

      return show.success ? [show.data] : [];
    });
  } catch {
    return [];
  }
}

/**
 * saves an edited show on this device without creating a remote share link
 * @param show ceremony to preserve
 * @returns whether storage accepted the show
 */
export function saveShowLocally(show: Show, script?: CeremonyScript | null): boolean {
  try {
    const updated = { ...show, updatedAt: new Date().toISOString() };
    const shows = [updated, ...readSavedShows().filter((saved) => saved.id !== show.id)];
    localStorage.setItem(SAVED_SHOWS_KEY, JSON.stringify(shows));
    if (script) localStorage.setItem(`spammy.script.${show.id}`, JSON.stringify(script));

    return true;
  } catch {
    return false;
  }
}

/** reads the completed ceremony clock retained with a saved show */
export function readSavedScript(showId: string): CeremonyScript | null {
  try {
    const result = CeremonyScriptSchema.safeParse(
      JSON.parse(localStorage.getItem(`spammy.script.${showId}`) ?? 'null'),
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
