import { readFile } from 'node:fs/promises';

import type { Hono } from 'hono';

import { COSTUMES } from '@spammy/domain';

export { COSTUMES } from '@spammy/domain';

/**
 * loads only a curated reference, never a caller-supplied filesystem path
 * @param id public costume identifier
 * @returns reference metadata and original PNG bytes, or null for unknown ids
 */
export async function readCostume(id: string) {
  const costume = COSTUMES.find((entry) => entry.id === id);
  if (!costume) return null;
  const bytes = await readFile(new URL(`../../../../${costume.path}`, import.meta.url));
  return { ...costume, bytes };
}

/**
 * serves the curated catalog and original local preview assets
 * @param app HTTP application
 */
export function registerCostumeRoutes(app: Hono): void {
  app.get('/api/costumes', (c) =>
    c.json(
      COSTUMES.map(({ id, label }) => ({ id, label, previewUrl: `/api/costumes/${id}/image` })),
    ),
  );
  app.get('/api/costumes/:costumeId/image', async (c) => {
    const costume = await readCostume(c.req.param('costumeId'));
    if (!costume) return c.json({ error: 'costume_not_found' }, 404);
    return new Response(new Uint8Array(costume.bytes), {
      headers: { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff' },
    });
  });
}
