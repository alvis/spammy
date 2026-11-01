import { randomUUID } from 'node:crypto';

import { OpenAI } from 'openai';

import { locateFaces } from '@spammy/agents';
import { NotImplementedError, getAwardNominees } from '@spammy/domain';

import type { Hono } from 'hono';

import type { AppContext } from '../app';

/** server-owned client for photo processing */
export interface FaceRouteOptions {
  /** optional injected client for offline verification */
  client?: Pick<OpenAI, 'responses'>;
}

/**
 * registers host-initiated face location, storing only local source assets
 * @param app HTTP application
 * @param context local show persistence
 * @param options optional Responses API capability
 */
export function registerFaceRoutes(
  app: Hono,
  context: AppContext,
  options: FaceRouteOptions = {},
): void {
  app.post('/api/shows/:showId/faces', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);

    if (getAwardNominees(show).length === 0) return c.json({ error: 'no_nominees' }, 400);

    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return c.json({ error: 'invalid_photo', message: 'Choose a PNG, JPEG or WebP photo.' }, 400);
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024)
      return c.json({ error: 'photo_too_large' }, 413);

    const client =
      options.client ??
      (process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : undefined);
    if (!client) throw new NotImplementedError('server.locateFaces');

    const bytes = new Uint8Array(await file.arrayBuffer());
    const faces = await locateFaces({ bytes, mimeType: file.type }, client);
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.slice('image/'.length);
    const photoAssetId = `group-${randomUUID()}.${extension}`;
    await context.store.writeAsset(show.id, photoAssetId, bytes);
    const current = await context.store.readShow(show.id);
    if (!current) return c.json({ error: 'not_found' }, 404);
    if (getAwardNominees(current).length === 0) return c.json({ error: 'no_nominees' }, 400);
    await context.store.writeShow({
      ...current,
      groupPhotoAssetId: photoAssetId,
      updatedAt: new Date().toISOString(),
    });

    return c.json({
      photoAssetId,
      photoUrl: `/api/shows/${show.id}/assets/${photoAssetId}`,
      faces,
    });
  });
}
