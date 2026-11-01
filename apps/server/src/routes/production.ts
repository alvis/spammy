import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import OpenAI from 'openai';

import { judgeShowAwards, writeStoryboard } from '@spammy/agents';
import {
  buildCeremonyScript,
  CeremonyScriptSchema,
  NotImplementedError,
  StoryboardSchema,
} from '@spammy/domain';
import { composeScore, PERSONA_VOICE_ENV, recordNarration } from '@spammy/production';

import type { Show } from '@spammy/domain';
import type { Hono } from 'hono';
import type { StoryboardDependencies } from '@spammy/agents';
import type { ProductionDependencies } from '@spammy/production';
import type { AppContext } from '../app';

/** injected production capabilities used by HTTP tests and local integrations */
export interface ProductionContext extends AppContext {
  production?: ProductionDependencies;
  storyboard?: StoryboardDependencies;
}

/**
 * registers the narrated and scored ceremony production endpoint
 * @param app HTTP application
 * @param context persistence and optional provider capabilities
 */
export function registerProductionRoutes(app: Hono, context: ProductionContext): void {
  app.post('/api/shows/:showId/production', async (c) => {
    let show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const voiceEnvironment = PERSONA_VOICE_ENV[show.settings.persona];
    const voiceId = process.env[voiceEnvironment];
    const missingConfiguration = [
      ...(!context.production
        ? [
            ...(!process.env.ELEVENLABS_API_KEY ? ['ELEVENLABS_API_KEY'] : []),
            ...(!voiceId ? [voiceEnvironment] : []),
          ]
        : []),
      ...(!context.storyboard && !process.env.OPENAI_API_KEY ? ['OPENAI_API_KEY'] : []),
    ];
    if (missingConfiguration.length)
      return c.json(
        {
          error: 'missing_production_configuration',
          message: `Set ${missingConfiguration.join(', ')} in the server .env and restart the server, then retry production. Your uploaded chat and award choices are saved.`,
        },
        503,
      );
    const originalSignature = productionSignature(show);
    if (show.awards.some((award) => award.decision === 'sealed' && !award.winnerId)) {
      if (!context.awardRunner) throw new NotImplementedError('server.production.award_judging');
      const awards = await judgeShowAwards(show, { runner: context.awardRunner });
      const current = await context.store.readShow(show.id);
      if (!current || productionSignature(current) !== originalSignature)
        return c.json({ error: 'stale_production' }, 409);
      show = { ...current, awards };
      await context.store.writeShow(show);
    }
    if (!show.awards.length || show.awards.some((award) => !award.winnerId))
      return c.json({ error: 'awards_not_decided' }, 409);
    const signature = productionSignature(show);
    const client = context.production
      ? null
      : new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const dependencies: ProductionDependencies = context.production ?? {
      voiceId: voiceId!,
      measureDuration: measureAudioDuration,
      synthesize: (voice, request) => client!.textToSpeech.convertWithTimestamps(voice, request),
      compose: async (request) =>
        new Uint8Array(await new Response(await client!.music.compose(request)).arrayBuffer()),
      transcribe: async (bytes) => {
        const transcript = await client!.speechToText.convert({
          file: new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' }),
          modelId: 'scribe_v2',
          timestampsGranularity: 'word',
        });
        if (!('words' in transcript)) throw new TypeError('music transcription lacks word timings');
        return transcript.words
          .filter((word) => word.type === 'word')
          .map((word) => ({ word: word.text, start: word.start ?? 0, end: word.end ?? 0 }));
      },
      readAsset: context.store.readAsset,
      writeAsset: context.store.writeAsset,
    };
    const storyboardDependencies = context.storyboard ?? {
      respond: (request: Parameters<StoryboardDependencies['respond']>[0]) =>
        new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).responses.create(request),
    };
    await context.store.writeShow({
      ...show,
      stage: 'producing',
      updatedAt: new Date().toISOString(),
    });
    try {
      const storyboardFile = `storyboard-${createHash('sha256').update(signature).digest('hex')}.json`;
      const cachedStoryboard = await context.store.readAsset(show.id, storyboardFile);
      const storyboard = cachedStoryboard
        ? StoryboardSchema.parse(JSON.parse(Buffer.from(cachedStoryboard).toString('utf8')))
        : await writeStoryboard(show, storyboardDependencies);
      if (!cachedStoryboard)
        await context.store.writeAsset(
          show.id,
          storyboardFile,
          Buffer.from(JSON.stringify(storyboard)),
        );
      const narration = await recordNarration(storyboard, show.settings.persona, dependencies);
      const score = await composeScore(narration.timing, dependencies);
      const base = buildCeremonyScript(show);
      const scenes = base.scenes.map((scene) => {
        const segment = narration.timing.segments.find((item) => item.segmentId === scene.id)!;
        const take = narration.segments.find((item) => item.segmentId === scene.id)!;
        const line = storyboard.segments.find((item) => item.id === scene.id)!.narration;
        return {
          ...scene,
          line,
          startSeconds: segment.start,
          durationSeconds: segment.end - segment.start,
          audioDurationSeconds: take.durationSeconds,
          audioUrl: `/api/shows/${show.id}/assets/${take.audio.path.split('/').at(-1)}`,
          words: segment.words.map((word) => ({
            ...word,
            start: word.start - segment.start,
            end: word.end - segment.start,
          })),
        };
      });
      const script = CeremonyScriptSchema.parse({
        ...base,
        scenes,
        durationSeconds: narration.timing.durationSeconds,
        music: score.cues,
      });
      const current = await context.store.readShow(show.id);
      if (!current || productionSignature(current) !== signature)
        return c.json({ error: 'stale_production' }, 409);
      await context.store.writeAsset(
        show.id,
        'ceremony-script.json',
        Buffer.from(JSON.stringify(script)),
      );
      await context.store.writeAsset(
        show.id,
        'production-manifest.json',
        Buffer.from(
          JSON.stringify({
            showId: show.id,
            storyboard,
            timing: narration.timing,
            assets: [...narration.segments.map((segment) => segment.audio), ...score.assets],
          }),
        ),
      );
      await context.store.writeShow({
        ...current,
        stage: 'ready',
        updatedAt: new Date().toISOString(),
      });
      return c.json(script);
    } catch (error) {
      const current = await context.store.readShow(show.id);
      if (!current || productionSignature(current) !== signature)
        return c.json({ error: 'stale_production' }, 409);
      await context.store.writeShow({
        ...current,
        stage: 'failed',
        updatedAt: new Date().toISOString(),
      });
      const processError = error as NodeJS.ErrnoException;
      if (processError.code === 'ENOENT' && processError.syscall === 'spawn ffprobe') {
        return c.json(
          {
            error: 'missing_audio_prerequisite',
            message:
              'Install FFmpeg with ffprobe and make ffprobe available on PATH, then retry production.',
          },
          503,
        );
      }
      throw error;
    }
  });
}

function productionSignature(show: Show): string {
  return JSON.stringify([show.settings, show.cast, show.awards, show.chat, show.groupPhotoAssetId]);
}

async function measureAudioDuration(bytes: Uint8Array): Promise<number> {
  const directory = await mkdtemp(join(tmpdir(), 'spammy-audio-'));
  try {
    const file = join(directory, 'narration.mp3');
    await writeFile(file, bytes);
    const { stdout } = await promisify(execFile)('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0)
      throw new TypeError('audio duration is invalid');
    return duration;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
