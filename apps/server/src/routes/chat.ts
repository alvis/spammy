import { parseExport } from '@spammy/parser';
import { z } from 'zod';

import type { Hono } from 'hono';
import type { AppContext } from '../app';

/**
 * registers chat upload and initializes the cast from parsed participants
 * @param app HTTP application
 * @param context persistence capabilities
 */
export function registerChatRoutes(app: Hono, context: AppContext): void {
  app.post('/api/shows/:showId/chat', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const form = await c.req.parseBody();
    const file = form.file;
    const order = z.enum(['day-first', 'month-first']).optional().safeParse(form.dateOrder);
    if (!(file instanceof File) || !order.success) return c.json({ error: 'invalid_request' }, 400);
    if (file.size > 64 * 1024 * 1024) return c.json({ error: 'export_too_large' }, 413);
    let chat;
    try {
      chat = parseExport(
        { fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        order.data ? { dateOrder: order.data } : {},
      );
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError)
        return c.json({ error: 'invalid_export' }, 400);
      throw error;
    }
    await context.store.writeShow({
      ...show,
      chat,
      stage: 'chat-uploaded',
      awards: [],
      cast: chat.participants.map((participant) => ({
        id: participant.id,
        participantId: participant.id,
        displayName: participant.displayName,
        photoAssetId: null,
        face: null,
      })),
      updatedAt: new Date().toISOString(),
    });
    const months = new Map<string, number>();
    const timestamps = chat.messages.map(({ sentAt }) => sentAt).sort();
    for (const timestamp of timestamps) {
      const month = timestamp.slice(0, 7);
      months.set(month, (months.get(month) ?? 0) + 1);
    }
    return c.json({
      messages: chat.messages.length,
      participants: chat.participants,
      months: [...months].map(([month, count]) => ({ month, count })),
      from: timestamps[0],
      to: timestamps.at(-1),
      dateOrder: chat.dateOrder,
    });
  });
}
