import { analyzeChat, estimateTokens, pseudonymizeChat } from '@spammy/analysis';
import { NotImplementedError } from '@spammy/domain';

import type { Show } from '@spammy/domain';
import type { Hono } from 'hono';
import type { AppContext } from '../app';

/** registers the private analysis pass and local preflight estimate */
export function registerAnalysisRoutes(app: Hono, context: AppContext): void {
  const pending = new Map<string, symbol>();
  app.post('/api/shows/:showId/analysis', async (c) => {
    if (!context.openai) throw new NotImplementedError('server.analyzeChat');
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    if (!show.chat) return c.json({ error: 'chat_required' }, 409);
    const token = Symbol();
    pending.set(show.id, token);
    const signature = analysisSignature(show);
    try {
      const safe = pseudonymizeChat(show.chat, {
        includedParticipantIds: show.cast.map((person) => person.participantId),
        aliases: Object.fromEntries(
          show.cast.map((person) => [person.participantId, [person.displayName]]),
        ),
      });
      const input = { chat: safe.chat, range: show.settings.range };
      const analysis = await analyzeChat(input, { client: context.openai });
      const current = await context.store.readShow(show.id);
      if (pending.get(show.id) !== token || !current || analysisSignature(current) !== signature)
        return c.json({ error: 'stale_analysis' }, 409);
      await context.store.writeAsset(
        show.id,
        'analysis.json',
        new TextEncoder().encode(
          JSON.stringify({
            analysis,
            signature: JSON.stringify({
              chat: show.chat,
              cast: show.cast,
              range: show.settings.range,
            }),
          }),
        ),
      );
      await context.store.writeShow({
        ...current,
        stage: 'analyzed',
        awards: [],
        updatedAt: new Date().toISOString(),
      });
      return c.json({
        stats: analysis.stats,
        moments: analysis.moments,
        estimatedTokens: estimateTokens(input),
      });
    } finally {
      if (pending.get(show.id) === token) pending.delete(show.id);
    }
  });
  app.get('/api/shows/:showId/analysis/estimate', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    if (!show.chat) return c.json({ error: 'chat_required' }, 409);
    const { chat } = pseudonymizeChat(show.chat, {
      includedParticipantIds: show.cast.map((person) => person.participantId),
    });
    return c.json({ estimatedTokens: estimateTokens({ chat, range: show.settings.range }) });
  });
}

function analysisSignature(show: Show): string {
  return JSON.stringify([show.settings, show.cast, show.chat, show.awards, show.stage]);
}
