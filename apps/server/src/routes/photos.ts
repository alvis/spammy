import { randomUUID } from 'node:crypto';

import { FaceBoxSchema, getAwardNominees } from '@spammy/domain';

import type { Hono } from 'hono';
import type { AppContext } from '../app';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * registers cast photo uploads and local asset downloads
 * @param app HTTP application
 * @param context persistence capabilities
 */
export function registerPhotoRoutes(app: Hono, context: AppContext): void {
  app.post('/api/shows/:showId/photos', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const form = await c.req.parseBody();
    const file = form.file;
    const member = show.cast.find(({ id }) => id === form.castMemberId);
    if (!member || !(file instanceof File) || !IMAGE_EXTENSIONS[file.type])
      return c.json({ error: 'invalid_photo' }, 400);
    if (!getAwardNominees(show).some((person) => person.id === member.id))
      return c.json({ error: 'not_nominated' }, 400);
    if (file.size === 0 || file.size > 10 * 1024 * 1024)
      return c.json({ error: 'photo_too_large' }, 413);
    const face =
      form.face === undefined ? null : FaceBoxSchema.parse(JSON.parse(String(form.face)));
    if (
      face &&
      (face.width <= 0 || face.height <= 0 || face.x + face.width > 1 || face.y + face.height > 1)
    )
      return c.json({ error: 'invalid_face' }, 400);
    const fileName = `${randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
    await context.store.writeAsset(show.id, fileName, new Uint8Array(await file.arrayBuffer()));
    const current = await context.store.readShow(show.id);
    if (!current || !current.cast.some((candidate) => candidate.id === member.id))
      return c.json({ error: 'not_found' }, 404);
    if (!getAwardNominees(current).some((person) => person.id === member.id))
      return c.json({ error: 'not_nominated' }, 400);
    const updated = {
      ...current,
      cast: current.cast.map((candidate) =>
        candidate.id === member.id ? { ...candidate, photoAssetId: fileName, face } : candidate,
      ),
      updatedAt: new Date().toISOString(),
    };
    await context.store.writeShow(updated);
    return c.json({
      ...updated,
      awards: updated.awards.map((award) => ({
        ...award,
        winnerId: award.decision === 'sealed' ? null : award.winnerId,
      })),
    });
  });
  app.get('/api/shows/:showId/assets/:assetId', async (c) => {
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const assetId = c.req.param('assetId');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(assetId))
      return c.json({ error: 'invalid_asset' }, 400);
    if (!/\.(?:png|jpe?g|webp|mp3|mp4|wav)$/i.test(assetId))
      return c.json({ error: 'not_found' }, 404);
    const bytes = await context.store.readAsset(show.id, assetId);
    if (!bytes) return c.json({ error: 'not_found' }, 404);
    const extension = assetId.split('.').at(-1);
    const contentType =
      extension === 'png'
        ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : extension === 'webp'
            ? 'image/webp'
            : extension === 'mp3'
              ? 'audio/mpeg'
              : extension === 'mp4'
                ? 'video/mp4'
                : 'application/octet-stream';
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
