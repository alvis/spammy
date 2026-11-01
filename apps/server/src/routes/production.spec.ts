import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { CeremonyScriptSchema, NotImplementedError } from '@spammy/domain';

import { registerProductionRoutes } from './production';

import type { Show } from '@spammy/domain';
import type { ProductionDependencies } from '@spammy/production';
import type { ShowStore } from '@spammy/store';
import type { StoryboardDependencies } from '@spammy/agents';

const synthesize = vi.fn<ProductionDependencies['synthesize']>(async () => ({
  audioBase64: 'YQ==',
  alignment: {
    characters: ['H', 'i'],
    characterStartTimesSeconds: [0, 0.2],
    characterEndTimesSeconds: [0.2, 0.5],
  },
}));
const compose = vi.fn<ProductionDependencies['compose']>(async () => new Uint8Array([1]));
const transcribe = vi.fn<ProductionDependencies['transcribe']>(async () => [
  { word: 'Who', start: 0, end: 0.3 },
]);
const respond = vi.fn<StoryboardDependencies['respond']>(async (request) => {
  const input = request.input as { content: string }[];
  const data = JSON.parse(input[1]!.content);
  return {
    output_text: JSON.stringify({
      ...data,
      segments: data.segments.map((segment: object) => ({ ...segment, narration: 'P1 wins.' })),
    }),
  };
});

const show: Show = {
  id: 's',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  stage: 'awards-ready',
  settings: {
    persona: 'goldie',
    look: 'ivory',
    roastLevel: 'playful',
    groupKind: 'friends',
    range: null,
  },
  chat: null,
  cast: [{ id: 'c', participantId: 'p', displayName: 'Sam', photoAssetId: null, face: null }],
  groupPhotoAssetId: null,
  awards: [
    {
      id: 'a',
      title: 'Best',
      showName: 'Awards',
      howJudged: 'Votes',
      decision: 'sealed',
      winnerId: 'p',
      nominees: [{ participantId: 'p', stat: '9 votes', quote: 'Hi', receiptMessageId: null }],
      receipts: [],
    },
  ],
};

describe('production route', () => {
  it('should persist playable narration and scored timeline with measured scene clocks', async () => {
    const files = new Map<string, Uint8Array>();
    const store = {
      readShow: async () => show,
      listShows: async () => [show],
      createShow: async () => show,
      writeShow: vi.fn<ShowStore['writeShow']>(async () => {}),
      readAsset: async (_id: string, name: string) => files.get(name) ?? null,
      writeAsset: async (id: string, name: string, bytes: Uint8Array) => {
        files.set(name, bytes);
        return `shows/${id}/assets/${name}`;
      },
    } satisfies ShowStore;
    const app = new Hono();
    registerProductionRoutes(app, {
      store,
      storyboard: { respond },
      production: {
        voiceId: 'fixed',
        measureDuration: async () => 0.5,
        synthesize,
        compose,
        transcribe,
        readAsset: store.readAsset,
        writeAsset: store.writeAsset,
      },
    });

    const response = await app.request('/api/shows/s/production', { method: 'POST' });
    const script = CeremonyScriptSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(script).toEqual(JSON.parse(Buffer.from(files.get('ceremony-script.json')!).toString()));
    expect(script.scenes.map((scene: { startSeconds: number }) => scene.startSeconds)).toEqual([
      0, 8, 14, 20, 28, 36,
    ]);
    expect(script.music).toHaveLength(6);
    expect(store.writeShow).toHaveBeenLastCalledWith(expect.objectContaining({ stage: 'ready' }));
  });
  it.each(['stale', 'unresolved', 'missing-ffprobe'] as const)(
    'should protect current show state for %s production',
    async (scenario) => {
      let current: Show =
        scenario === 'unresolved'
          ? { ...show, awards: show.awards.map((award) => ({ ...award, winnerId: null })) }
          : show;
      const files = new Map<string, Uint8Array>();
      const store = {
        readShow: async () => current,
        listShows: async () => [current],
        createShow: async () => current,
        writeShow: vi.fn<ShowStore['writeShow']>(async (value) => {
          current = value;
        }),
        readAsset: async (_id: string, name: string) => files.get(name) ?? null,
        writeAsset: async (id: string, name: string, bytes: Uint8Array) => {
          files.set(name, bytes);
          return `shows/${id}/assets/${name}`;
        },
      } satisfies ShowStore;
      const app = new Hono();
      app.onError((error, c) =>
        c.json(
          { error: error instanceof NotImplementedError ? 'not_implemented' : 'internal' },
          error instanceof NotImplementedError ? 501 : 500,
        ),
      );
      registerProductionRoutes(app, {
        store,
        storyboard: {
          respond: async (request) => {
            if (scenario === 'stale')
              current = { ...current, settings: { ...current.settings, look: 'blacktie' } };
            return respond(request);
          },
        },
        production: {
          voiceId: 'fixed',
          measureDuration: async () => {
            if (scenario === 'missing-ffprobe')
              throw Object.assign(new Error('spawn ffprobe ENOENT'), {
                code: 'ENOENT',
                syscall: 'spawn ffprobe',
              });
            return 0.5;
          },
          synthesize,
          compose,
          transcribe,
          readAsset: store.readAsset,
          writeAsset: store.writeAsset,
        },
      });

      const response = await app.request('/api/shows/s/production', { method: 'POST' });

      expect(response.status).toBe(
        scenario === 'stale' ? 409 : scenario === 'unresolved' ? 501 : 503,
      );
      expect(await response.json()).toEqual(
        scenario === 'missing-ffprobe'
          ? {
              error: 'missing_audio_prerequisite',
              message:
                'Install FFmpeg with ffprobe and make ffprobe available on PATH, then retry production.',
            }
          : { error: scenario === 'stale' ? 'stale_production' : 'not_implemented' },
      );
      expect(files.has('ceremony-script.json')).toBe(false);
      expect(current.settings.look).toBe(scenario === 'stale' ? 'blacktie' : 'ivory');
      expect(store.writeShow).toHaveBeenCalledTimes(
        scenario === 'stale' ? 1 : scenario === 'unresolved' ? 0 : 2,
      );
    },
  );
});
