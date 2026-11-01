import { createHash } from 'node:crypto';

import { OpenAI, toFile } from 'openai';

import { readCostume, registerCostumeRoutes } from './costumes';
import { z } from 'zod';

import { NotImplementedError, getAwardNominees } from '@spammy/domain';

import type { Hono } from 'hono';

import type { AppContext } from '../app';

/** controls the server-owned OpenAI image generator */
export interface CharacterRouteOptions {
  /** optional injected image capability */
  client?: Pick<OpenAI, 'images'>;
  /** defaults to the current fast GPT Image model */
  model?: string;
}

const characterRequestSchema = z.object({
  castMemberId: z.string().min(1),
  costumeId: z.string().min(1),
  description: z.string().trim().min(3).max(500),
});

/**
 * registers character portrait generation without sending chat content or cast names
 * @param app HTTP application
 * @param context local show persistence
 * @param options optional image API capability and model
 */
export function registerCharacterRoutes(
  app: Hono,
  context: AppContext,
  options: CharacterRouteOptions = {},
): void {
  registerCostumeRoutes(app);
  app.post('/api/shows/:showId/characters', async (c) => {
    const request = characterRequestSchema.safeParse(await c.req.json());
    if (!request.success)
      return c.json({ error: 'invalid_request', issues: request.error.issues }, 400);

    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    if (!show.cast.some((person) => person.id === request.data.castMemberId))
      return c.json({ error: 'cast_not_found' }, 404);

    if (!getAwardNominees(show).some((person) => person.id === request.data.castMemberId))
      return c.json({ error: 'not_nominated' }, 400);

    const costume = await readCostume(request.data.costumeId);
    if (!costume) return c.json({ error: 'invalid_costume' }, 400);
    const referenceHash = createHash('sha256').update(costume.bytes).digest('hex');
    const model = options.model ?? process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare';
    const description = request.data.description;
    const prompt = `Create a charming fictional award-show character portrait, centered waist-up with the costume clearly visible, warm ivory background, playful polished illustration with gold accents, suitable for a circular avatar. No text, lettering or watermarks. Dress the character in the supplied reference image costume, preserving its colors, silhouette, fabric, trim and accessories. Use the reference as clothing design, not as a person identity. Character description: ${description}`;
    const identity = createHash('sha256')
      .update(JSON.stringify({ model, prompt, referenceHash }))
      .digest('hex');
    const photoAssetId = `character-${identity}.png`;
    const cached = await context.store.readAsset(show.id, photoAssetId);
    if (!cached) {
      const client =
        options.client ??
        (process.env.OPENAI_API_KEY
          ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
          : undefined);
      if (!client) throw new NotImplementedError('server.generateCharacter');

      const result = await client.images.edit({
        image: await toFile(costume.bytes, costume.path.split('/').at(-1)!, { type: 'image/png' }),
        model,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'low',
        output_format: 'png',
      });
      const encoded = result.data?.[0]?.b64_json;
      if (!encoded)
        return c.json(
          {
            error: 'image_generation_failed',
            message: 'OpenAI returned no portrait. Please try again.',
          },
          502,
        );

      await context.store.writeAsset(show.id, photoAssetId, Buffer.from(encoded, 'base64'));
      await context.store.writeAsset(
        show.id,
        `character-${identity}.json`,
        Buffer.from(
          JSON.stringify({
            provider: 'openai',
            referencePath: costume.path,
            referenceHash,
            model,
            prompt,
            createdAt: new Date().toISOString(),
          }),
        ),
      );
    }

    const current = await context.store.readShow(show.id);
    if (!current) return c.json({ error: 'not_found' }, 404);
    if (!current.cast.some((person) => person.id === request.data.castMemberId))
      return c.json({ error: 'cast_not_found' }, 404);
    if (!getAwardNominees(current).some((person) => person.id === request.data.castMemberId))
      return c.json({ error: 'not_nominated' }, 400);
    const nextShow = {
      ...current,
      cast: current.cast.map((person) =>
        person.id === request.data.castMemberId ? { ...person, photoAssetId, face: null } : person,
      ),
      updatedAt: new Date().toISOString(),
    };
    await context.store.writeShow(nextShow);

    return c.json({
      show: {
        ...nextShow,
        awards: nextShow.awards.map((award) =>
          award.decision === 'sealed' ? { ...award, winnerId: null } : award,
        ),
      },
      photoAssetId,
      photoUrl: `/api/shows/${show.id}/assets/${photoAssetId}`,
      cached: Boolean(cached),
    });
  });
}
