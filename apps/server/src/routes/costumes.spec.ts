import { readFile } from 'node:fs/promises';
import { Hono } from 'hono';
import { expect, it } from 'vitest';
import { CostumeOptionSchema } from '@spammy/domain';
import { registerCostumeRoutes } from './costumes';

it('should serve original costume references from the curated catalog only', async () => {
  const app = new Hono();
  registerCostumeRoutes(app);

  const response = await app.request('/api/costumes');
  const catalog = CostumeOptionSchema.array().parse(await response.json());
  const image = await app.request(catalog[0]!.previewUrl);
  const unknown = await app.request('/api/costumes/not-a-costume/image');

  expect(image.headers.get('Content-Type')).toBe('image/png');
  expect(
    Buffer.from(await image.arrayBuffer()).equals(
      await readFile(
        new URL(
          '../../../../costumes/exec-05d16cb6-d43d-4f0d-b99f-e13e7048c90c.png',
          import.meta.url,
        ),
      ),
    ),
  ).toBe(true);
  expect(unknown.status).toBe(404);
});
