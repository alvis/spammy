import { buildCeremonyScript } from '@spammy/domain';

import { BRUNCH_CLUB_PEOPLE } from './brunch-club';

import type { CeremonyScript, Show } from '@spammy/domain';

/** bundled backing track shared by new and saved fictional demo ceremonies */
export const SAMPLE_MUSIC_URL = '/demo/brunch-club-musical.mp3';

/** measured duration of the bundled track, used to repeat it on the ceremony clock */
export const SAMPLE_MUSIC_DURATION_SECONDS = 60;

/** fills missing fictional portraits while preserving host-uploaded photos */
export function withSamplePortraits(show: Show): Show {
  return {
    ...show,
    cast: show.cast.map((person) => ({
      ...person,
      photoAssetId:
        person.photoAssetId ??
        (BRUNCH_CLUB_PEOPLE.some((sample) => sample.id === person.participantId)
          ? `/demo/faces/${person.participantId}.png`
          : null),
    })),
  };
}

/** adds bundled faces and repeating music to a new or previously saved demo timeline */
export function buildSampleCeremonyScript(
  show: Show,
  saved?: CeremonyScript | null,
): CeremonyScript {
  const sample = withSamplePortraits(show);
  const script = saved ?? buildCeremonyScript(sample);
  return {
    ...script,
    cast: withSamplePortraits({ ...sample, cast: script.cast }).cast,
    music: Array.from(
      { length: Math.ceil(script.durationSeconds / SAMPLE_MUSIC_DURATION_SECONDS) },
      (_, index) => ({
        segmentId: `brunch-musical-${index}`,
        audioUrl: SAMPLE_MUSIC_URL,
        startSeconds: index * SAMPLE_MUSIC_DURATION_SECONDS,
        durationSeconds: Math.min(
          SAMPLE_MUSIC_DURATION_SECONDS,
          script.durationSeconds - index * SAMPLE_MUSIC_DURATION_SECONDS,
        ),
        volume: 0.24,
      }),
    ),
  };
}
