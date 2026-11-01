import { z } from 'zod';
import { CostumeIdSchema } from '@spammy/domain';

import type { Hono } from 'hono';
import type { AppContext } from '../app';

const CastUpdateSchema = z.object({
  cast: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().trim().min(1).optional(),
      excluded: z.boolean().optional(),
      costumeId: CostumeIdSchema.optional(),
    }),
  ),
});

/**
 * registers cast renaming, local costume selection and exclusion while preserving the original chat
 * @param app HTTP application
 * @param context persistence capabilities
 */
export function registerCastRoutes(app: Hono, context: AppContext): void {
  app.post('/api/shows/:showId/cast', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const request = CastUpdateSchema.safeParse(await c.req.json());
    if (!request.success) return c.json({ error: 'invalid_request' }, 400);
    const updates = new Map(request.data.cast.map((member) => [member.id, member]));
    if (request.data.cast.some(({ id }) => !show.cast.some((member) => member.id === id)))
      return c.json({ error: 'unknown_cast_member' }, 400);
    const cast = show.cast
      .filter((member) => !updates.get(member.id)?.excluded)
      .map((member) => ({
        ...member,
        displayName: updates.get(member.id)?.displayName ?? member.displayName,
        costumeId: updates.get(member.id)?.costumeId ?? member.costumeId,
      }));
    const included = new Set(cast.map(({ participantId }) => participantId));
    const awards = show.awards
      .map((award) => ({
        ...award,
        nominees: award.nominees.filter(({ participantId }) => included.has(participantId)),
        receipts: award.receipts.filter(({ authorId }) => included.has(authorId)),
        winnerId: award.winnerId && included.has(award.winnerId) ? award.winnerId : null,
      }))
      .filter(({ nominees }) => nominees.length > 0);
    const updated = { ...show, cast, awards, updatedAt: new Date().toISOString() };
    await context.store.writeShow(updated);
    return c.json({
      ...updated,
      awards: updated.awards.map((award) => ({
        ...award,
        winnerId: award.decision === 'sealed' ? null : award.winnerId,
      })),
    });
  });
}
