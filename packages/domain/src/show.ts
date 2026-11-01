import { z } from 'zod';

import { ParsedChatSchema } from './chat';

/** one of the three fixed host personas, each bound to a fixed ElevenLabs voice */
export const PersonaSchema = z.enum(['goldie', 'velvet', 'disco']);

/** visual theme of the ceremony */
export const LookSchema = z.enum(['ivory', 'blacktie', 'champagne']);

/** how hard the script roasts the cast */
export const RoastLevelSchema = z.enum(['gentle', 'playful', 'savage']);

/** setup progress, mirroring the host flow */
export const ShowStageSchema = z.enum([
  'draft',
  'chat-uploaded',
  'analyzed',
  'awards-ready',
  'producing',
  'ready',
  'failed',
]);

/** inclusive date window of messages to analyze */
export const DateRangeSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
});

/** normalized face box inside an uploaded photo, coordinates in 0..1 */
export const FaceBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

/** a chat participant who appears in the show */
export const CastMemberSchema = z.object({
  id: z.string().min(1),
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  photoAssetId: z.string().nullable(),
  face: FaceBoxSchema.nullable(),
});

/** a quoted message backing an award; names of non-cast people are masked */
export const ReceiptSchema = z.object({
  messageId: z.string().min(1),
  authorId: z.string().min(1),
  quote: z.string().min(1),
  sentAt: z.iso.datetime({ local: true }),
});

/** one nominee card: who, the stat line, and the quote shown on the card */
export const NomineeSchema = z.object({
  participantId: z.string().min(1),
  stat: z.string().min(1),
  quote: z.string().min(1),
  receiptMessageId: z.string().min(1).nullable(),
});

/** an AI-suggested award; the host either seals it (AI picks, hidden) or picks the winner */
export const AwardSchema = z.object({
  id: z.string().min(1),
  /** show group the award belongs to, e.g. "The Golden Globes"; the AI may invent any name */
  showName: z.string().min(1),
  title: z.string().min(1),
  howJudged: z.string().min(1),
  nominees: z.array(NomineeSchema).min(1),
  decision: z.enum(['sealed', 'host-picked']),
  winnerId: z.string().min(1).nullable(),
  receipts: z.array(ReceiptSchema),
});

/** host choices collected during setup */
export const ShowSettingsSchema = z.object({
  groupKind: z.string().min(1),
  persona: PersonaSchema,
  look: LookSchema,
  roastLevel: RoastLevelSchema,
  range: DateRangeSchema.nullable(),
});

/** aggregate root persisted as one JSON file per show */
export const ShowSchema = z.object({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  stage: ShowStageSchema,
  settings: ShowSettingsSchema,
  chat: ParsedChatSchema.nullable(),
  cast: z.array(CastMemberSchema),
  groupPhotoAssetId: z.string().nullable(),
  awards: z.array(AwardSchema),
});

/** body of `POST /api/shows` */
export const CreateShowRequestSchema = ShowSettingsSchema.partial();

export type Persona = z.infer<typeof PersonaSchema>;
export type Look = z.infer<typeof LookSchema>;
export type RoastLevel = z.infer<typeof RoastLevelSchema>;
export type ShowStage = z.infer<typeof ShowStageSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type FaceBox = z.infer<typeof FaceBoxSchema>;
export type CastMember = z.infer<typeof CastMemberSchema>;
export type Receipt = z.infer<typeof ReceiptSchema>;
export type Nominee = z.infer<typeof NomineeSchema>;
export type Award = z.infer<typeof AwardSchema>;
export type ShowSettings = z.infer<typeof ShowSettingsSchema>;
export type Show = z.infer<typeof ShowSchema>;
export type CreateShowRequest = z.infer<typeof CreateShowRequestSchema>;
