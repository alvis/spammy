import { z } from 'zod';

import { AspectSchema, WordTimingSchema } from './production';
import { AwardSchema, CastMemberSchema, LookSchema, PersonaSchema } from './show';

/** one deterministic scene on the ceremony clock; word timings are relative to the scene */
export const CeremonySceneSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['open', 'show', 'intro', 'noms', 'env', 'finale']),
  startSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  line: z.string(),
  showName: z.string().optional(),
  award: AwardSchema.optional(),
  audioUrl: z.string().optional(),
  audioDurationSeconds: z.number().nonnegative().optional(),
  words: z.array(WordTimingSchema).optional(),
});

/** music under the ceremony; gain is reduced while a narration scene is speaking */
export const CeremonyMusicSchema = z.object({
  segmentId: z.string().min(1),
  audioUrl: z.string().min(1),
  startSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  volume: z.number().min(0).max(1).default(0.18),
  words: z.array(WordTimingSchema).optional(),
});

/** shared timeline consumed by the live player and local renderer */
export const CeremonyScriptSchema = z.object({
  showId: z.string().min(1),
  title: z.string().min(1),
  persona: PersonaSchema,
  look: LookSchema,
  cast: z.array(CastMemberSchema),
  scenes: z.array(CeremonySceneSchema).min(1),
  durationSeconds: z.number().positive(),
  music: z.array(CeremonyMusicSchema).optional(),
});

export type CeremonyScene = z.infer<typeof CeremonySceneSchema>;
export type CeremonyMusic = z.infer<typeof CeremonyMusicSchema>;
export type CeremonyScript = z.infer<typeof CeremonyScriptSchema>;

/** local export options shared by the HTTP and rendering boundaries */
export const ExportRequestSchema = z.object({
  kind: z.enum(['video', 'poster']).default('video'),
  aspect: AspectSchema.default('16:9'),
  draft: z.boolean().default(false),
});
