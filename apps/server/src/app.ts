import { Hono } from 'hono';

import { CreateShowRequestSchema, NotImplementedError } from '@wrapa/domain';

import type { ShowStore } from '@wrapa/store';

/** capabilities the HTTP layer needs */
export interface AppContext {
  /** show persistence */
  store: ShowStore;
}

/**
 * builds the Wrapa HTTP API; every route below `/api/shows` mirrors one step of the host flow
 * @param context injected capabilities
 * @returns Hono application
 */
export function createApp(context: AppContext): Hono {
  const app = new Hono();
  const notImplemented = (feature: string) => (): never => {
    throw new NotImplementedError(feature);
  };

  app.onError((error, c) => {
    if (error instanceof NotImplementedError) {
      return c.json({ error: 'not_implemented', feature: error.feature }, 501);
    }

    console.error(error);

    return c.json({ error: 'internal_error' }, 500);
  });

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/shows', async (c) => c.json(await context.store.listShows()));
  app.post('/api/shows', async (c) => {
    const request = CreateShowRequestSchema.safeParse(await c.req.json());
    if (!request.success) {
      return c.json({ error: 'invalid_request', issues: request.error.issues }, 400);
    }

    return c.json(await context.store.createShow(request.data), 201);
  });
  app.get('/api/shows/:showId', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));

    return show ? c.json(show) : c.json({ error: 'not_found' }, 404);
  });

  app.post('/api/shows/:showId/chat', notImplemented('server.uploadChat'));
  app.post('/api/shows/:showId/photos', notImplemented('server.uploadPhoto'));
  app.post('/api/shows/:showId/analysis', notImplemented('server.analyzeChat'));
  app.post('/api/shows/:showId/awards', notImplemented('server.suggestAwards'));
  app.put('/api/shows/:showId/awards/:awardId', notImplemented('server.decideAward'));
  app.post('/api/shows/:showId/production', notImplemented('server.produceShow'));
  app.post('/api/shows/:showId/exports', notImplemented('server.exportShow'));

  return app;
}
