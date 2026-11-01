import { runInNewContext } from 'node:vm';

import { characterMotion } from '@spammy/domain';
import { describe, expect, it } from 'vitest';

import { compositionHtml } from './composition';

import type { CeremonyScript } from '@spammy/domain';

const script: CeremonyScript = {
  showId: 'sample',
  title: '<Friends>',
  persona: 'goldie',
  look: 'ivory',
  cast: [],
  durationSeconds: 3,
  scenes: [
    {
      id: 'open',
      kind: 'open',
      startSeconds: 0,
      durationSeconds: 3,
      line: 'Hello',
      audioUrl: 'voice.mp3',
      audioDurationSeconds: 2,
    },
  ],
  music: [
    {
      segmentId: 'score',
      audioUrl: 'score.mp3',
      startSeconds: 0,
      durationSeconds: 3,
      volume: 0.18,
    },
  ],
};

describe('fn:compositionHtml', () => {
  it('should place escaped copy, narration and ducked music on the shared clock', () => {
    const html = compositionHtml(script);

    expect(html).toContain('&lt;Friends&gt;');
    expect(html).toContain('src="voice.mp3" data-start="0" data-duration="2"');
    expect(html).toContain('data-duration="2" data-media-start="0" data-volume="0.18"');
    expect(html).toContain('data-duration="1" data-media-start="2" data-volume="0.36"');
  });
  it('should reuse the local costume and cropped face for nominees, reveal and finale', () => {
    const award = {
      id: 'a',
      title: 'Best',
      howJudged: 'Messages',
      showName: 'Friends',
      decision: 'host-picked' as const,
      winnerId: 'p',
      receipts: [],
      nominees: [{ participantId: 'p', stat: 'Most', quote: 'Hi', receiptMessageId: null }],
    };
    const html = compositionHtml({
      ...script,
      cast: [
        {
          id: 'p',
          participantId: 'p',
          displayName: '<Alex>',
          costumeId: 'scarlet-gown',
          photoAssetId: 'crop.png',
          face: { x: 0.4, y: 0.2, width: 0.1, height: 0.1 },
        },
      ],
      scenes: (['noms', 'env', 'finale'] as const).map((kind, index) => ({
        id: kind,
        kind,
        startSeconds: index,
        durationSeconds: 1,
        line: '',
        award,
      })),
    });
    expect(html.match(/src="costumes\/scarlet-gown.png"/g)).toHaveLength(3);
    expect(html.match(/src="crop.png"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="&lt;Alex&gt;"');
    expect(html).toContain('style="grid-template-columns:repeat(1,minmax(0,1fr))"');
    expect(html).toContain('object-fit:contain');
    expect(html).toContain('<img src="crop.png" alt=""/>');
  });
  it('should use the same character poses in the seekable export timeline', () => {
    const html = compositionHtml(script);
    const runtime = html.split('<script>')[1]!.split('</script>')[0]!;
    const poses: string[] = [];
    let update = (): void => {};
    let now = 1.25;
    const avatar = { style: { transform: '', transformOrigin: '' } };
    const timeline = {
      to() {
        return this;
      },
      fromTo() {
        return this;
      },
      set() {
        return this;
      },
      time() {
        return now;
      },
      eventCallback(_name: string, callback: () => void) {
        update = callback;
      },
    };
    runInNewContext(runtime, {
      gsap: { timeline: () => timeline },
      window: {},
      document: {
        querySelectorAll: () => [],
        querySelector: (selector: string) =>
          selector.endsWith('footer p')
            ? { textContent: '' }
            : {
                classList: { contains: (name: string) => name === 'scene-env' },
                querySelectorAll: () => [avatar],
              },
      },
    });
    for (const time of [1.25, 2, 1.25]) {
      now = time;
      update();
      poses.push(avatar.style.transform);
    }
    expect(poses).toEqual([1.25, 2, 1.25].map((time) => characterMotion(time, 'winner')));
    expect(avatar.style.transformOrigin).toBe('50% 90%');
  });
  it.todo('TODO(draft): covers portrait and remaining scene kinds');
});
