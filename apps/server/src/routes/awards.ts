import { z } from 'zod';

import { suggestAwards } from '@spammy/agents';
import { pseudonymizeChat } from '@spammy/analysis';
import { ChatAnalysisSchema, NotImplementedError } from '@spammy/domain';

import type { Show } from '@spammy/domain';
import type { Hono } from 'hono';
import type { AppContext } from '../app';

const CachedAnalysisSchema = z.object({ analysis: ChatAnalysisSchema, signature: z.string() });

/** generates verified awards and persists their winners privately */
export function registerAwardRoutes(app: Hono, context: AppContext): void {
  const pending = new Map<string, symbol>();
  app.post('/api/shows/:showId/awards', async (c) => {
    if (!context.awardRunner) throw new NotImplementedError('server.suggestAwards');
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    if (!show.chat) return c.json({ error: 'chat_required' }, 409);
    const token = Symbol();
    pending.set(show.id, token);
    const signature = awardSignature(show);
    try {
      const bytes = await context.store.readAsset(show.id, 'analysis.json');
      if (!bytes) return c.json({ error: 'analysis_required' }, 409);
      const cached = CachedAnalysisSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
      if (
        cached.signature !==
        JSON.stringify({ chat: show.chat, cast: show.cast, range: show.settings.range })
      )
        return c.json({ error: 'analysis_stale' }, 409);
      const safe = pseudonymizeChat(show.chat, {
        includedParticipantIds: show.cast.map((person) => person.participantId),
      });
      const groupKind = pseudonymizeChat(
        {
          ...show.chat,
          messages: [
            {
              id: 'group',
              authorId: null,
              sentAt: '2026-01-01T00:00:00',
              kind: 'text',
              text: show.settings.groupKind,
            },
          ],
        },
        {
          includedParticipantIds: show.cast.map((person) => person.participantId),
          aliases: Object.fromEntries(
            show.cast.map((person) => [person.participantId, [person.displayName]]),
          ),
        },
      ).chat.messages[0]!.text;
      const awards = await suggestAwards(
        {
          cast: show.cast,
          groupKind,
          roastLevel: show.settings.roastLevel,
          analysis: cached.analysis,
          participantIds: safe.participantIds,
        },
        { runner: context.awardRunner },
      );
      const current = await context.store.readShow(show.id);
      if (pending.get(show.id) !== token || !current || awardSignature(current) !== signature)
        return c.json({ error: 'stale_awards' }, 409);
      await context.store.writeShow({
        ...current,
        awards,
        stage: 'awards-ready',
        updatedAt: new Date().toISOString(),
      });
      return c.json({
        awards: awards.map((award) => ({
          ...award,
          winnerId: award.decision === 'sealed' ? null : award.winnerId,
        })),
      });
    } finally {
      if (pending.get(show.id) === token) pending.delete(show.id);
    }
  });
}

function awardSignature(show: Show): string {
  return JSON.stringify([show.settings, show.cast, show.chat, show.awards, show.stage]);
}
