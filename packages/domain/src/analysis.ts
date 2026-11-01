import { z } from 'zod';

import { ParsedChatSchema } from './chat';

/** model-selected moment backed by source message ids */
export const MomentSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  theme: z.string().min(1),
  why: z.string().min(1),
  people: z.array(z.string().min(1)),
});

/** structured result of the single long-context read */
export const BulkReadResultSchema = z.object({ moments: z.array(MomentSchema) });

/** deterministic measurements for a pseudonymous participant */
export const ParticipantStatsSchema = z.object({
  participantId: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
  shareOfChat: z.number().min(0).max(1),
  lateNightCount: z.number().int().nonnegative(),
  mediaCount: z.number().int().nonnegative(),
  voiceNoteCount: z.number().int().nonnegative(),
  deletedCount: z.number().int().nonnegative(),
  longestMessage: z.number().int().nonnegative(),
  laughCount: z.number().int().nonnegative(),
  averageReplyGapSeconds: z.number().nonnegative(),
  topEmoji: z.string().nullable(),
});

/** cached safe analysis used by the award agent */
export const ChatAnalysisSchema = z.object({
  stats: z.array(ParticipantStatsSchema),
  highlights: z.array(z.object({ messageId: z.string().min(1), reason: z.string() })),
  moments: z.array(MomentSchema),
  sourceChat: ParsedChatSchema,
});

export type Moment = z.infer<typeof MomentSchema>;
export type ParticipantStats = z.infer<typeof ParticipantStatsSchema>;
export type ChatAnalysis = z.infer<typeof ChatAnalysisSchema>;
