import { describe, expect, it, vi } from 'vitest';

import { composeScore, recordNarration } from './production';

import type { ProductionDependencies } from './production';

const synthesize = vi.fn<ProductionDependencies['synthesize']>(async () => ({
  audioBase64: Buffer.from('audio').toString('base64'),
  alignment: {
    characters: ['H', 'i'],
    characterStartTimesSeconds: [0, 0.3],
    characterEndTimesSeconds: [0.3, 0.8],
  },
}));
const compose = vi.fn<ProductionDependencies['compose']>(async () => new Uint8Array([1, 2]));
const transcribe = vi.fn<ProductionDependencies['transcribe']>(async () => [
  { word: 'Who', start: 0, end: 0.4 },
]);

describe('narration-led production', () => {
  it('should cache timestamped narration and compose whole-bar ducked hook cues', async () => {
    const files = new Map<string, Uint8Array>();
    const dependencies = {
      voiceId: 'fixed-goldie',
      measureDuration: async () => 0.8,
      synthesize,
      compose,
      transcribe,
      readAsset: async (_showId: string, fileName: string) => files.get(fileName) ?? null,
      writeAsset: async (showId: string, fileName: string, bytes: Uint8Array) => {
        files.set(fileName, bytes);
        return `shows/${showId}/assets/${fileName}`;
      },
    } satisfies ProductionDependencies;
    const storyboard = {
      showId: 'show',
      persona: 'goldie' as const,
      segments: [
        { id: 'open', kind: 'intro' as const, awardId: null, narration: 'Hi', visualBrief: '' },
      ],
    };

    const first = await recordNarration(storyboard, 'goldie', dependencies);
    const second = await recordNarration(storyboard, 'goldie', dependencies);
    const score = await composeScore(first.timing, dependencies);

    expect(second).toEqual(first);
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(synthesize).toHaveBeenCalledWith('fixed-goldie', {
      text: 'Hi',
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });
    expect(first.timing).toEqual({
      showId: 'show',
      durationSeconds: 8,
      segments: [
        { segmentId: 'open', start: 0, end: 8, words: [{ word: 'Hi', start: 0, end: 0.8 }] },
      ],
    });
    expect(compose).toHaveBeenCalledWith(
      expect.objectContaining({
        compositionPlan: expect.objectContaining({
          sections: [expect.objectContaining({ durationMs: 8000, lines: ['Who ate 2026?'] })],
        }),
      }),
    );
    expect(score.cues).toEqual([
      {
        segmentId: 'open',
        audioUrl: expect.stringContaining('/api/shows/show/assets/music-'),
        startSeconds: 0,
        durationSeconds: 8,
        volume: 0.18,
        words: [{ word: 'Who', start: 0, end: 0.4 }],
      },
    ]);
  });
  it.todo('TODO(draft): reject missing and malformed provider alignments');
  it.todo('TODO(draft): reuse cached score and transcribed hooks');
});
