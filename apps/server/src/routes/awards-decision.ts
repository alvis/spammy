import { z } from 'zod';

import type { Hono } from 'hono';
import type { AppContext } from '../app';

const DecisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('sealed') }),
  z.object({ decision: z.literal('host-picked'), winnerId: z.string().min(1) }),
]);

/**
 * registers host decisions without exposing sealed winners
 * @param app HTTP application
 * @param context persistence capabilities
 */
export function registerAwardDecisionRoutes(app: Hono, context: AppContext): void {
  app.put('/api/shows/:showId/awards/:awardId', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    const award = show?.awards.find(({ id }) => id === c.req.param('awardId'));
    if (!show || !award) return c.json({ error: 'not_found' }, 404);
    const request = DecisionSchema.safeParse(await c.req.json());
    if (!request.success) return c.json({ error: 'invalid_request' }, 400);
    const decision = request.data;
    if (
      decision.decision === 'host-picked' &&
      !award.nominees.some(({ participantId }) => participantId === decision.winnerId)
    )
      return c.json({ error: 'invalid_winner' }, 400);
    const updated = {
      ...award,
      decision: decision.decision,
      winnerId:
        decision.decision === 'host-picked'
          ? decision.winnerId
          : award.decision === 'sealed'
            ? award.winnerId
            : null,
    };
    await context.store.writeShow({
      ...show,
      awards: show.awards.map((candidate) => (candidate.id === award.id ? updated : candidate)),
      updatedAt: new Date().toISOString(),
    });
    return c.json({
      ...updated,
      winnerId: updated.decision === 'sealed' ? null : updated.winnerId,
    });
  });
}
