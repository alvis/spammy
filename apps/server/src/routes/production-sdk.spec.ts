import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { CeremonyScriptSchema, ProductionManifestSchema } from '@spammy/domain';

import { registerCeremonyRoutes } from './ceremony';
import { registerPhotoRoutes } from './photos';
import { registerProductionRoutes } from './production';

import type { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { Show } from '@spammy/domain';
import type { ShowStore } from '@spammy/store';

type AsyncMethod<T extends (...args: never[]) => unknown> = (
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>;

type AsyncMethods<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? AsyncMethod<T[K]> : never;
};

type SdkMethods = {
  synthesize: AsyncMethod<ElevenLabsClient['textToSpeech']['convertWithTimestamps']>;
  compose: AsyncMethod<ElevenLabsClient['music']['compose']>;
  transcribe: AsyncMethod<ElevenLabsClient['speechToText']['convert']>;
};

const sdk = vi.hoisted(
  () =>
    ({
      synthesize: vi.fn<SdkMethods['synthesize']>(async () => ({
        audioBase64: Buffer.from('narration bytes').toString('base64'),
        alignment: {
          characters: ['H', 'i'],
          characterStartTimesSeconds: [0, 0.2],
          characterEndTimesSeconds: [0.2, 0.5],
        },
      })),
      compose: vi.fn<SdkMethods['compose']>(
        async () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('music bytes'));
              controller.close();
            },
          }),
      ),
      transcribe: vi.fn<SdkMethods['transcribe']>(async () => ({
        languageCode: 'en',
        languageProbability: 1,
        text: 'Who',
        words: [
          { text: 'Who', type: 'word', start: 0, end: 0.3, logprob: 0 },
          { text: '[music]', type: 'audio_event', start: 0.3, end: 0.5, logprob: 0 },
        ],
      })),
    }) satisfies SdkMethods,
);
const construct = vi.hoisted(
  () =>
    vi.fn<(...args: ConstructorParameters<typeof ElevenLabsClient>) => void>(() => {}) satisfies (
      ...args: ConstructorParameters<typeof ElevenLabsClient>
    ) => void,
);
vi.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: class {
    constructor(options: ConstructorParameters<typeof ElevenLabsClient>[0]) {
      construct(options);
    }
    textToSpeech = { convertWithTimestamps: sdk.synthesize } satisfies AsyncMethods<
      Pick<ElevenLabsClient['textToSpeech'], 'convertWithTimestamps'>
    >;
    music = { compose: sdk.compose } satisfies AsyncMethods<
      Pick<ElevenLabsClient['music'], 'compose'>
    >;
    speechToText = { convert: sdk.transcribe } satisfies AsyncMethods<
      Pick<ElevenLabsClient['speechToText'], 'convert'>
    >;
  },
}));
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  const { promisify } = await import('node:util');
  return {
    execFile: Object.assign(vi.fn(actual.execFile), actual.execFile, {
      [promisify.custom]: vi.fn(async () => ({
        stdout: '0.5\n',
        stderr: '',
      })) satisfies AsyncMethod<typeof actual.execFile.__promisify__>,
    }),
  } satisfies Partial<typeof import('node:child_process')>;
});

function setup() {
  let show: Show = {
    id: 'sdk-show',
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
    chat: {
      format: 'android-txt',
      dateOrder: 'day-first',
      groupName: null,
      participants: [{ id: 'p', displayName: 'Sam', messageCount: 1 }],
      messages: [
        { id: 'm', authorId: 'p', text: 'Hi', sentAt: '2026-01-01T00:00:00', kind: 'text' },
      ],
    },
    cast: [{ id: 'c', participantId: 'p', displayName: 'Sam', photoAssetId: null, face: null }],
    groupPhotoAssetId: null,
    awards: [
      {
        id: 'a',
        title: 'Best',
        showName: 'Awards',
        howJudged: 'Votes',
        decision: 'host-picked',
        winnerId: 'p',
        nominees: [{ participantId: 'p', stat: '9 votes', quote: 'Hi', receiptMessageId: null }],
        receipts: [],
      },
    ],
  };
  const files = new Map<string, Uint8Array>();
  const store = {
    readShow: async (_id: string) => show,
    listShows: async () => [show],
    createShow: async () => show,
    writeShow: vi.fn(async (next) => {
      show = next;
    }),
    readAsset: async (_id, name) => files.get(name) ?? null,
    writeAsset: async (id, name, bytes) => {
      files.set(name, bytes);
      return `shows/${id}/assets/${name}`;
    },
  } satisfies ShowStore;
  const app = new Hono();
  app.onError((_error, c) => c.json({ error: 'internal_error' }, 500));
  registerProductionRoutes(app, {
    store,
    storyboard: {
      respond: async (request) => {
        const data = JSON.parse((request.input as { content: string }[])[1]!.content);
        return {
          output_text: JSON.stringify({
            ...data,
            segments: data.segments.map((segment: { id: string }) => ({
              ...segment,
              narration: `Welcome ${segment.id}.`,
            })),
          }),
        };
      },
    },
  });
  registerCeremonyRoutes(app, { store });
  registerPhotoRoutes(app, { store });
  return { app, store, files };
}

describe('official ElevenLabs SDK production boundary', () => {
  it('should generate, persist, serve and replay narration and music with hook word cues, then reuse both caches', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key');
    vi.stubEnv('ELEVENLABS_VOICE_GOLDIE', 'test-goldie');
    const { app, files } = setup();
    const response = await app.request('/api/shows/sdk-show/production', { method: 'POST' });
    expect(response.status).toBe(200);
    const script = CeremonyScriptSchema.parse(await response.json());
    expect(construct.mock.calls).toEqual([[{ apiKey: 'test-key' }]]);
    const narrationCalls = script.scenes.map((scene) => [
      'test-goldie',
      {
        text: scene.line,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
      },
    ]);
    const musicCalls = script.scenes.map((scene) => [
      expect.objectContaining({
        modelId: 'music_v1',
        respectSectionsDurations: true,
        compositionPlan: expect.objectContaining({
          sections: [
            expect.objectContaining({
              sectionName: scene.id,
              durationMs: scene.durationSeconds * 1000,
            }),
          ],
        }),
      }),
    ]);
    const transcriptionCalls = Array.from({ length: 2 }, () => [
      {
        file: expect.any(Blob),
        modelId: 'scribe_v2',
        timestampsGranularity: 'word',
      },
    ]);
    expect(sdk.synthesize.mock.calls).toEqual(narrationCalls);
    expect(sdk.compose.mock.calls).toEqual(musicCalls);
    expect(sdk.transcribe.mock.calls).toEqual(transcriptionCalls);
    expect(
      await Promise.all(
        sdk.transcribe.mock.calls.map(async ([request]) => {
          if (!(request.file instanceof Blob)) throw new TypeError('expected uploaded music Blob');
          return request.file.text();
        }),
      ),
    ).toEqual(['music bytes', 'music bytes']);
    for (const scene of script.scenes) {
      expect(scene.words).toEqual([{ word: 'Hi', start: 0, end: 0.5 }]);
      expect(scene.audioDurationSeconds).toBe(0.5);
      const audio = await app.request(scene.audioUrl!);
      expect(audio.status).toBe(200);
      expect(await audio.text()).toBe('narration bytes');
    }
    expect(script.music).toHaveLength(script.scenes.length);
    for (const cue of script.music!) {
      const scene = script.scenes.find((item) => item.id === cue.segmentId)!;
      expect(cue.startSeconds).toBe(scene.startSeconds);
      expect(cue.durationSeconds).toBe(scene.durationSeconds);
      expect(cue.volume).toBe(0.18);
      expect(cue.words).toEqual(
        ['open', 'finale'].includes(cue.segmentId) ? [{ word: 'Who', start: 0, end: 0.3 }] : [],
      );
      expect(await (await app.request(cue.audioUrl)).text()).toBe('music bytes');
    }
    const manifest = ProductionManifestSchema.parse(
      JSON.parse(Buffer.from(files.get('production-manifest.json')!).toString()),
    );
    expect(manifest.assets).toHaveLength(script.scenes.length * 2);
    expect(manifest.assets.every((asset) => asset.provider === 'elevenlabs')).toBe(true);
    const replay = await app.request('/api/shows/sdk-show/ceremony');
    expect(await replay.json()).toEqual(script);
    const retry = await app.request('/api/shows/sdk-show/production', { method: 'POST' });
    expect(await retry.json()).toEqual(script);
    expect(sdk.synthesize.mock.calls).toEqual(narrationCalls);
    expect(sdk.compose.mock.calls).toEqual(musicCalls);
    expect(sdk.transcribe.mock.calls).toEqual(transcriptionCalls);
  });

  it.each(['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_GOLDIE'])(
    'should explain missing %s without changing saved chat or awards',
    async (missing) => {
      vi.stubEnv('ELEVENLABS_API_KEY', 'test-key');
      vi.stubEnv('ELEVENLABS_VOICE_GOLDIE', 'test-goldie');
      vi.stubEnv(missing, '');
      const { app, store, files } = setup();
      const original = await store.readShow('sdk-show');
      const response = await app.request('/api/shows/sdk-show/production', { method: 'POST' });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: 'missing_production_configuration',
        message: expect.stringContaining(missing),
      });
      expect(await store.readShow('sdk-show')).toEqual(original);
      expect(store.writeShow).not.toHaveBeenCalled();
      expect(files.size).toBe(0);
      expect(construct).not.toHaveBeenCalled();
    },
  );

  it('should preserve chat and choices without publishing a playable script when music generation fails', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key');
    vi.stubEnv('ELEVENLABS_VOICE_GOLDIE', 'test-goldie');
    sdk.compose.mockRejectedValueOnce(new Error('provider unavailable'));
    const { app, store, files } = setup();
    const original = await store.readShow('sdk-show');
    const response = await app.request('/api/shows/sdk-show/production', { method: 'POST' });
    expect(response.status).toBe(500);
    const current = await store.readShow('sdk-show');
    expect(current).toMatchObject({
      chat: original!.chat,
      awards: original!.awards,
      stage: 'failed',
    });
    expect(files.has('ceremony-script.json')).toBe(false);
    expect(files.has('production-manifest.json')).toBe(false);
    expect((await app.request('/api/shows/sdk-show/ceremony')).status).toBe(409);
  });
});
