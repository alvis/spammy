import { CeremonyScriptSchema, refreshCeremonyCostumes } from '@spammy/domain';

import type { Hono } from 'hono';
import type { AppContext } from '../app';

/**
 * exposes the produced replay without opening arbitrary JSON assets to downloads
 * @param app HTTP application
 * @param context persistence capabilities
 */
export function registerCeremonyRoutes(app: Hono, context: AppContext): void {
  app.get('/api/shows/:showId/ceremony', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    if (show.stage !== 'ready') return c.json({ error: 'ceremony_not_ready' }, 409);
    const bytes = await context.store.readAsset(show.id, 'ceremony-script.json');
    if (!bytes) return c.json({ error: 'not_found' }, 404);
    let data: unknown;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return c.json({ error: 'invalid_ceremony' }, 409);
    }
    const script = CeremonyScriptSchema.safeParse(data);
    if (!script.success || script.data.showId !== show.id)
      return c.json({ error: 'invalid_ceremony' }, 409);
    c.header('Cache-Control', 'private, no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    return c.json(refreshCeremonyCostumes(script.data, show.cast));
  });
}
