import { OpenAIProvider, Runner } from '@openai/agents';
import { OpenAI } from 'openai';
import { Hono } from 'hono';
import { z, ZodError } from 'zod';

import { registerCeremonyRoutes } from './routes/ceremony';
import { registerExportRoutes } from './routes/exports';
import { registerAnalysisRoutes } from './routes/analysis';
import { registerAwardRoutes } from './routes/awards';
import { registerProductionRoutes } from './routes/production';
import { registerChatRoutes } from './routes/chat';
import { registerPhotoRoutes } from './routes/photos';
import { registerCastRoutes } from './routes/cast';
import { registerAwardDecisionRoutes } from './routes/awards-decision';
import { registerFaceRoutes } from './routes/faces';
import { registerCharacterRoutes } from './routes/characters';

import { validateShowAwards } from '@spammy/agents';

import {
  awardTitleError,
  AwardSchema,
  CreateShowRequestSchema,
  NotImplementedError,
  ShowSettingsSchema,
} from '@spammy/domain';

import type { Show } from '@spammy/domain';
import type { ShowStore } from '@spammy/store';

/** capabilities the HTTP layer needs */
export interface AppContext {
  /** show persistence */
  store: ShowStore;
  /** server-owned OpenAI client */
  openai?: OpenAI;
  /** tracing-disabled award runner */
  awardRunner?: Runner;
}

/**
 * builds the Spammy HTTP API; every route below `/api/shows` mirrors one step of the host flow
 * @param context injected capabilities
 * @returns Hono application
 */
export function createApp(context: AppContext): Hono {
  const openai =
    context.openai ??
    (process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : undefined);
  context = {
    ...context,
    openai,
    awardRunner:
      context.awardRunner ??
      (openai
        ? new Runner({
            modelProvider: new OpenAIProvider({ openAIClient: openai }),
            tracingDisabled: true,
          })
        : undefined),
  };
  const app = new Hono();

  app.use('/api/*', async (c, next) => {
    const target = new URL(c.req.url);
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    const host = c.req.header('host');
    if (
      !localHosts.has(target.hostname) ||
      (host && !localHosts.has(new URL(`http://${host}`).hostname))
    )
      return c.json({ error: 'forbidden_host' }, 403);
    const origin = c.req.header('origin');
    if (origin) {
      const allowedOrigins = new Set([
        target.origin,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://[::1]:5173',
      ]);
      if (!allowedOrigins.has(origin)) return c.json({ error: 'forbidden_origin' }, 403);
    }
    await next();
  });

  app.onError((error, c) => {
    if (error instanceof NotImplementedError) {
      return c.json({ error: 'not_implemented', feature: error.feature }, 501);
    }

    if (error instanceof ZodError || error instanceof SyntaxError) {
      return c.json({ error: 'invalid_request' }, 400);
    }

    return c.json({ error: 'internal_error' }, 500);
  });

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/shows', async (c) => c.json((await context.store.listShows()).map(publicShow)));
  app.post('/api/shows', async (c) => {
    const request = CreateShowRequestSchema.safeParse(await c.req.json());
    if (!request.success) {
      return c.json({ error: 'invalid_request', issues: request.error.issues }, 400);
    }

    return c.json(await context.store.createShow(request.data), 201);
  });
  app.get('/api/shows/:showId', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));

    return show ? c.json(publicShow(show)) : c.json({ error: 'not_found' }, 404);
  });

  registerChatRoutes(app, context);
  registerPhotoRoutes(app, context);
  registerCastRoutes(app, context);
  registerAwardDecisionRoutes(app, context);
  registerFaceRoutes(app, context);
  registerCharacterRoutes(app, context);
  registerAnalysisRoutes(app, context);
  registerAwardRoutes(app, context);
  app.put('/api/shows/:showId/settings', async (c) => {
    const settings = ShowSettingsSchema.partial().parse(await c.req.json());
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const next = {
      ...show,
      settings: { ...show.settings, ...settings },
      updatedAt: new Date().toISOString(),
    };
    if (next.settings.range && next.settings.range.from > next.settings.range.to)
      return c.json({ error: 'invalid_range' }, 400);
    await context.store.writeShow(next);
    return c.json(publicShow(next));
  });
  app.put('/api/shows/:showId/awards', async (c) => {
    const { awards } = z.object({ awards: z.array(AwardSchema) }).parse(await c.req.json());
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const invalidTitle = awards.find(
      (award) =>
        award.title !== show.awards.find((previous) => previous.id === award.id)?.title &&
        awardTitleError(award.title) !== null,
    );
    if (invalidTitle)
      return c.json(
        { error: 'invalid_award_title', message: awardTitleError(invalidTitle.title) },
        400,
      );
    const nextAwards = awards.map((award) => {
      if (award.decision !== 'sealed') return award;
      const previous = show.awards.find((candidate) => candidate.id === award.id);
      const unchanged =
        previous?.decision === 'sealed' &&
        JSON.stringify({ ...previous, winnerId: null }) ===
          JSON.stringify({ ...award, winnerId: null });
      return { ...award, winnerId: unchanged ? previous.winnerId : null };
    });
    if (
      new Set(nextAwards.map((award) => award.id)).size !== nextAwards.length ||
      nextAwards.some(
        (award) =>
          award.winnerId !== null &&
          !award.nominees.some((nominee) => nominee.participantId === award.winnerId),
      )
    )
      return c.json({ error: 'invalid_awards' }, 400);
    const next = { ...show, awards: nextAwards, updatedAt: new Date().toISOString() };
    try {
      validateShowAwards(next);
    } catch (error) {
      if (error instanceof TypeError) return c.json({ error: 'invalid_award_evidence' }, 400);
      throw error;
    }
    await context.store.writeShow(next);
    return c.json(publicShow(next));
  });
  registerProductionRoutes(app, context);
  registerCeremonyRoutes(app, context);
  registerExportRoutes(app, context);

  return app;
}

function publicShow(show: Show): Show {
  return {
    ...show,
    awards: show.awards.map((award) =>
      award.decision === 'sealed' ? { ...award, winnerId: null } : award,
    ),
  };
}
