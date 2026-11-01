import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { Hono } from 'hono';
import { OpenAI } from 'openai';
import { expect, it, vi } from 'vitest';
import { createShowStore } from '@spammy/store';
import { registerCharacterRoutes } from './characters';

it('should generate and caches a locally assigned portrait without sending cast names', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-character-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    await store.writeShow({
      ...show,
      awards: [
        {
          id: 'award',
          showName: 'Awards',
          title: 'Best chatter',
          howJudged: 'Messages',
          nominees: [
            { participantId: 'person-a', stat: 'Chats', quote: 'Hello', receiptMessageId: null },
          ],
          decision: 'sealed' as const,
          winnerId: 'person-a',
          receipts: [],
        },
      ],
      cast: [
        {
          id: 'cast-a',
          participantId: 'person-a',
          displayName: 'Private Name',
          photoAssetId: null,
          face: null,
        },
      ],
    });
    const client = new OpenAI({ apiKey: 'offline-test' });
    const generate = vi
      .spyOn(client.images, 'edit')
      .mockResolvedValue({ created: 0, data: [{ b64_json: 'AQID' }] });
    const app = new Hono();
    registerCharacterRoutes(app, { store }, { client });
    const request = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        castMemberId: 'cast-a',
        costumeId: 'cosmic-cape',
        description: 'A cheerful fox',
      }),
    };

    const response = await app.request(`/api/shows/${show.id}/characters`, request);
    const result = z
      .object({ photoAssetId: z.string(), faces: z.array(z.unknown()).optional() })
      .parse(await response.json());
    const cached = await app.request(`/api/shows/${show.id}/characters`, request);

    expect(response.status).toBe(200);
    expect(await store.readAsset(show.id, result.photoAssetId)).toEqual(Buffer.from([1, 2, 3]));
    expect(z.object({ cached: z.boolean() }).parse(await cached.json()).cached).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-image-2.5-flare',
        prompt: expect.stringContaining('A cheerful fox'),
      }),
    );
    expect(generate.mock.calls[0]?.[0].prompt).not.toContain('Private Name');
    const uploaded = generate.mock.calls[0]?.[0].image;
    expect(uploaded).toBeInstanceOf(File);
    const reference = await readFile(
      new URL(
        '../../../../costumes/exec-05d16cb6-d43d-4f0d-b99f-e13e7048c90c.png',
        import.meta.url,
      ),
    );
    expect(Buffer.from(await (uploaded as File).arrayBuffer()).equals(reference)).toBe(true);
    const provenance = await store.readAsset(show.id, result.photoAssetId.replace('.png', '.json'));
    expect(JSON.parse(Buffer.from(provenance!).toString())).toEqual(
      expect.objectContaining({
        referencePath: 'costumes/exec-05d16cb6-d43d-4f0d-b99f-e13e7048c90c.png',
        referenceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    const changed = await app.request(`/api/shows/${show.id}/characters`, {
      ...request,
      body: JSON.stringify({
        castMemberId: 'cast-a',
        costumeId: 'ivory-tuxedo',
        description: 'A cheerful fox',
      }),
    });
    const changedResult = z
      .object({ photoAssetId: z.string(), cached: z.boolean() })
      .parse(await changed.json());
    expect(changedResult.cached).toBe(false);
    expect(changedResult.photoAssetId).not.toBe(result.photoAssetId);
    expect(generate).toHaveBeenCalledTimes(2);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

it('should preserve concurrent show edits when image generation completes', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-character-concurrent-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    const initial = {
      ...show,
      awards: [
        {
          id: 'award',
          showName: 'Awards',
          title: 'Best chatter',
          howJudged: 'Messages',
          nominees: [
            { participantId: 'person-a', stat: 'Chats', quote: 'Hello', receiptMessageId: null },
          ],
          decision: 'sealed' as const,
          winnerId: 'person-a',
          receipts: [],
        },
      ],
      cast: [
        {
          id: 'cast-a',
          participantId: 'person-a',
          displayName: 'Before',
          photoAssetId: null,
          face: null,
        },
      ],
    };
    await store.writeShow(initial);
    const client = new OpenAI({ apiKey: 'offline-test' });
    const started = deferred<void>();
    const completed = deferred<Awaited<ReturnType<typeof client.images.edit>>>();
    vi.spyOn(client.images, 'edit').mockImplementation(() => {
      started.resolve();
      return completed.promise as ReturnType<typeof client.images.edit>;
    });
    const app = new Hono();
    registerCharacterRoutes(app, { store }, { client });

    const pending = app.request(`/api/shows/${show.id}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        castMemberId: 'cast-a',
        costumeId: 'cosmic-cape',
        description: 'A cheerful fox',
      }),
    });
    await started.promise;
    await store.writeShow({
      ...initial,
      stage: 'ready',
      cast: initial.cast.map((person) => ({ ...person, displayName: 'After' })),
    });
    completed.resolve({ created: 0, data: [{ b64_json: 'AQID' }] });
    const response = await pending;

    expect(response.status).toBe(200);
    expect(await store.readShow(show.id)).toEqual(
      expect.objectContaining({
        stage: 'ready',
        cast: [
          expect.objectContaining({
            displayName: 'After',
            photoAssetId: expect.stringMatching(/^character-/),
          }),
        ],
      }),
    );
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

it('should reject characters processing without eligible nominees', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'spammy-characters-ineligible-'));
  try {
    const store = createShowStore({ dataDir });
    const show = await store.createShow({});
    await store.writeShow({
      ...show,
      cast: [
        { id: 'alex', participantId: 'alex', displayName: 'Alex', photoAssetId: null, face: null },
      ],
    });
    const app = new Hono();
    registerCharacterRoutes(app, { store });
    const body = JSON.stringify({
      castMemberId: 'alex',
      costumeId: 'cosmic-cape',
      description: 'A cheerful fox',
    });
    const response = await app.request(`/api/shows/${show.id}/characters`, {
      method: 'POST',
      body,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'not_nominated' });
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
