import { z } from 'zod';

import { PersonaSchema } from './show';

/** output aspect ratio of a rendered ceremony */
export const AspectSchema = z.enum(['16:9', '9:16']);

/** one storyboard beat; every award gets one signature moment */
export const StoryboardSegmentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['intro', 'nominees', 'envelope', 'winner', 'receipt', 'outro']),
  awardId: z.string().min(1).nullable(),
  narration: z.string(),
  visualBrief: z.string(),
});

/** ordered beats authored by the script agent before any audio is generated */
export const StoryboardSchema = z.object({
  showId: z.string().min(1),
  persona: PersonaSchema,
  segments: z.array(StoryboardSegmentSchema).min(1),
});

/** measured word timing, in seconds from the start of the ceremony */
export const WordTimingSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

/** measured segment timing that picture and music are cut to */
export const TimingLockSchema = z.object({
  showId: z.string().min(1),
  durationSeconds: z.number().positive(),
  segments: z.array(
    z.object({
      segmentId: z.string().min(1),
      start: z.number().nonnegative(),
      end: z.number().nonnegative(),
      words: z.array(WordTimingSchema),
    }),
  ),
});

/** where a generated or uploaded file came from */
export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['photo', 'narration', 'music', 'composition', 'video', 'poster']),
  path: z.string().min(1),
  provider: z.enum(['upload', 'openai', 'elevenlabs', 'hyperframes']),
  model: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

/** per-show record of every production asset and its provenance */
export const ProductionManifestSchema = z.object({
  showId: z.string().min(1),
  storyboard: StoryboardSchema.nullable(),
  timing: TimingLockSchema.nullable(),
  assets: z.array(AssetSchema),
});

export type Aspect = z.infer<typeof AspectSchema>;
export type StoryboardSegment = z.infer<typeof StoryboardSegmentSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
export type TimingLock = z.infer<typeof TimingLockSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type ProductionManifest = z.infer<typeof ProductionManifestSchema>;
