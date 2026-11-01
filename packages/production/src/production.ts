import { createHash } from 'node:crypto';

import { AssetSchema, NotImplementedError, TimingLockSchema } from '@spammy/domain';

import type { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import type {
  Asset,
  CeremonyMusic,
  Persona,
  Storyboard,
  TimingLock,
  WordTiming,
} from '@spammy/domain';

/** server-owned provider and asset capabilities */
export interface ProductionDependencies {
  voiceId: string;
  measureDuration(bytes: Uint8Array): Promise<number>;
  synthesize(
    voiceId: string,
    request: ElevenLabs.BodyTextToSpeechFullWithTimestamps,
  ): Promise<ElevenLabs.AudioWithTimestampsResponse>;
  compose(request: ElevenLabs.BodyComposeMusicV1MusicPost): Promise<Uint8Array>;
  transcribe(bytes: Uint8Array): Promise<WordTiming[]>;
  readAsset(showId: string, fileName: string): Promise<Uint8Array | null>;
  writeAsset(showId: string, fileName: string, bytes: Uint8Array): Promise<string>;
}

/** narration assets plus measured word timing */
export interface NarrationTake {
  audio: Asset;
  timing: TimingLock;
  segments: { segmentId: string; audio: Asset; durationSeconds: number }[];
}

/** composed assets and playback cues */
export interface ScoreTake extends Asset {
  cues: CeremonyMusic[];
  assets: Asset[];
}

/**
 * records and caches each line, locking scene windows to complete musical bars
 * @param storyboard approved persona script
 * @param persona selected host
 * @param dependencies server-owned provider capabilities
 * @returns per-line audio and measured timing
 */
export async function recordNarration(
  storyboard: Storyboard,
  persona: Persona,
  dependencies?: ProductionDependencies,
): Promise<NarrationTake> {
  if (!dependencies) throw new NotImplementedError('production.recordNarration');
  if (persona !== storyboard.persona)
    throw new RangeError('narration persona differs from storyboard');
  const segments: NarrationTake['segments'] = [];
  const timing: TimingLock = { showId: storyboard.showId, durationSeconds: 0, segments: [] };
  for (const segment of storyboard.segments) {
    const key = createHash('sha256')
      .update(
        JSON.stringify([
          segment.narration,
          dependencies.voiceId,
          'eleven_multilingual_v2',
          'measured-v2',
        ]),
      )
      .digest('hex');
    const fileName = `narration-${key}.mp3`;
    const metadata = await dependencies.readAsset(storyboard.showId, `${key}.json`);
    let words: WordTiming[];
    let audio: Asset;
    let durationSeconds: number;
    if (metadata && (await dependencies.readAsset(storyboard.showId, fileName))) {
      const cached = JSON.parse(Buffer.from(metadata).toString('utf8'));
      audio = AssetSchema.parse(cached.audio);
      const cachedTiming = TimingLockSchema.parse(cached.timing);
      words = cachedTiming.segments[0]!.words;
      durationSeconds = cachedTiming.durationSeconds;
    } else {
      const response = await dependencies.synthesize(dependencies.voiceId, {
        text: segment.narration,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
      });
      const alignment = response.normalizedAlignment ?? response.alignment;
      if (
        !alignment ||
        alignment.characters.length !== alignment.characterEndTimesSeconds.length ||
        alignment.characters.length !== alignment.characterStartTimesSeconds.length
      )
        throw new TypeError('narration lacks character timestamps');
      words = [];
      let word = '';
      let start = 0;
      let end = 0;
      for (const [index, character] of alignment.characters.entries()) {
        if (/\s/u.test(character)) {
          if (word) words.push({ word, start, end });
          word = '';
        } else {
          if (!word) start = alignment.characterStartTimesSeconds[index]!;
          word += character;
          end = alignment.characterEndTimesSeconds[index]!;
        }
      }
      if (word) words.push({ word, start, end });
      const bytes = Buffer.from(response.audioBase64, 'base64');
      const duration = await dependencies.measureDuration(bytes);
      durationSeconds = duration;
      if (
        !(duration > 0) ||
        !words.length ||
        words.at(-1)!.end > duration + 0.1 ||
        words.some((item) => !Number.isFinite(item.start) || item.end < item.start)
      )
        throw new TypeError('narration has invalid timestamps');
      const path = await dependencies.writeAsset(storyboard.showId, fileName, bytes);
      audio = {
        id: key,
        kind: 'narration',
        path,
        provider: 'elevenlabs',
        model: 'eleven_multilingual_v2',
        createdAt: new Date().toISOString(),
      };
      await dependencies.writeAsset(
        storyboard.showId,
        `${key}.json`,
        Buffer.from(
          JSON.stringify({
            audio,
            timing: {
              showId: storyboard.showId,
              durationSeconds: duration,
              segments: [{ segmentId: segment.id, start: 0, end: duration, words }],
            },
          }),
        ),
      );
    }
    const start = timing.durationSeconds;
    const minimum =
      segment.id === 'open'
        ? 8
        : segment.id === 'finale'
          ? 10
          : segment.kind === 'envelope' || segment.kind === 'nominees'
            ? 8
            : 6;
    const end = start + Math.max(minimum, Math.ceil((durationSeconds + 0.5) / 2) * 2);
    timing.segments.push({
      segmentId: segment.id,
      start,
      end,
      words: words.map((item) => ({ ...item, start: item.start + start, end: item.end + start })),
    });
    timing.durationSeconds = end;
    segments.push({ segmentId: segment.id, audio, durationSeconds });
  }
  return { audio: segments[0]!.audio, segments, timing: TimingLockSchema.parse(timing) };
}

/**
 * composes complete bars at a fixed tempo under the measured scene windows
 * @param timing narration-led scene timing
 * @param dependencies server-owned provider capabilities
 * @returns music assets and ducked playback cues
 */
export async function composeScore(
  timing: TimingLock,
  dependencies?: ProductionDependencies,
): Promise<ScoreTake> {
  if (!dependencies) throw new NotImplementedError('production.composeScore');
  const cues: CeremonyMusic[] = [];
  const assets: Asset[] = [];
  for (const segment of timing.segments) {
    const durationSeconds = segment.end - segment.start;
    if (durationSeconds < 4 || durationSeconds % 2 !== 0)
      throw new RangeError('music windows must contain complete bars at 120 BPM');
    const hook = segment.segmentId === 'open' || segment.segmentId === 'finale';
    const request: ElevenLabs.BodyComposeMusicV1MusicPost = {
      modelId: 'music_v1',
      respectSectionsDurations: true,
      compositionPlan: {
        positiveGlobalStyles: ['awards ceremony orchestral disco', '120 BPM', '4/4 time'],
        negativeGlobalStyles: ['spoken words'],
        sections: [
          {
            sectionName: segment.segmentId,
            durationMs: durationSeconds * 1000,
            positiveLocalStyles: [
              hook ? 'short celebratory sung hook' : 'instrumental underscore',
              `${durationSeconds / 2} complete bars`,
            ],
            negativeLocalStyles: hook ? [] : ['vocals'],
            lines: hook ? ['Who ate 2026?'] : [],
          },
        ],
      },
    };
    const key = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const fileName = `music-${key}.mp3`;
    const cached = await dependencies.readAsset(timing.showId, `music-${key}.json`);
    if (cached && (await dependencies.readAsset(timing.showId, fileName))) {
      const saved = JSON.parse(Buffer.from(cached).toString('utf8'));
      assets.push(AssetSchema.parse(saved.asset));
      const words = TimingLockSchema.parse(saved.timing).segments[0]!.words;
      cues.push({
        segmentId: segment.segmentId,
        audioUrl: `/api/shows/${timing.showId}/assets/${fileName}`,
        startSeconds: segment.start,
        durationSeconds,
        volume: 0.18,
        words,
      });
      continue;
    }
    const bytes = await dependencies.compose(request);
    const words = hook ? await dependencies.transcribe(bytes) : [];
    const path = await dependencies.writeAsset(timing.showId, fileName, bytes);
    const asset: Asset = {
      id: key,
      kind: 'music',
      path,
      provider: 'elevenlabs',
      model: 'music_v1',
      createdAt: new Date().toISOString(),
    };
    const validated = TimingLockSchema.parse({
      showId: timing.showId,
      durationSeconds,
      segments: [{ segmentId: segment.segmentId, start: 0, end: durationSeconds, words }],
    });
    await dependencies.writeAsset(
      timing.showId,
      `music-${key}.json`,
      Buffer.from(JSON.stringify({ asset, timing: validated })),
    );
    assets.push(asset);
    cues.push({
      segmentId: segment.segmentId,
      audioUrl: `/api/shows/${timing.showId}/assets/${fileName}`,
      startSeconds: segment.start,
      durationSeconds,
      volume: 0.18,
      words,
    });
  }
  return { ...assets[0]!, cues, assets };
}
