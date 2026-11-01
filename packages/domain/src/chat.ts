import { z } from 'zod';

/** source format of an uploaded WhatsApp export */
export const ExportFormatSchema = z.enum(['android-txt', 'iphone-txt', 'iphone-zip']);

/** day/month order detected from timestamps; `ambiguous` means the host must choose */
export const DateOrderSchema = z.enum(['day-first', 'month-first', 'ambiguous']);

/** one chat author as seen in the export */
export const ParticipantSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
});

/** one message after parsing; continuation lines are folded into `text` */
export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  sentAt: z.iso.datetime({ local: true }),
  authorId: z.string().min(1).nullable(),
  text: z.string(),
  kind: z.enum(['text', 'media-omitted', 'system', 'deleted']),
});

/** normalized result of parsing one export */
export const ParsedChatSchema = z.object({
  format: ExportFormatSchema,
  dateOrder: DateOrderSchema,
  groupName: z.string().nullable(),
  participants: z.array(ParticipantSchema),
  messages: z.array(ChatMessageSchema),
});

export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type DateOrder = z.infer<typeof DateOrderSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ParsedChat = z.infer<typeof ParsedChatSchema>;
