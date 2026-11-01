import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import { buildComposition, renderCeremony, renderPoster, runHyperframes } from './ceremony';

import type { CeremonyScript, Show } from '@spammy/domain';

// opt-in local browser and encoder integration, never calls a paid API
if (process.env.RUN_RENDER_TESTS === '1') {
  it('should render a three-second local composition', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'spammy-render-smoke-'));
    const show: Show = {
      id: 'smoke',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      stage: 'ready',
      settings: {
        persona: 'goldie',
        look: 'ivory',
        groupKind: 'friends',
        roastLevel: 'gentle',
        range: null,
      },
      cast: [],
      awards: [],
      chat: null,
      groupPhotoAssetId: null,
    };
    const script: CeremonyScript = {
      showId: show.id,
      title: 'The Spammy',
      persona: 'goldie',
      look: 'ivory',
      cast: [
        {
          id: 'a',
          participantId: 'a',
          displayName: 'Alex',
          photoAssetId: 'portrait.svg',
          face: null,
          costumeId: 'scarlet-gown',
        },
        { id: 'b', participantId: 'b', displayName: 'Blair', photoAssetId: null, face: null },
      ],
      durationSeconds: 3,
      scenes: [
        ...(['noms', 'env'] as const).map((kind, index) => ({
          id: kind,
          kind,
          startSeconds: index,
          durationSeconds: 1,
          line: '',
          award: {
            id: 'award',
            title: 'The dramatic entrance',
            howJudged: 'Style',
            showName: 'Friends',
            decision: 'host-picked' as const,
            winnerId: 'a',
            receipts: [],
            nominees: [
              {
                participantId: 'a',
                stat: 'Selected costume',
                quote: 'Hello!',
                receiptMessageId: null,
              },
              {
                participantId: 'b',
                stat: 'Legacy default',
                quote: 'Hello!',
                receiptMessageId: null,
              },
            ],
          },
        })),
        {
          id: 'finale',
          kind: 'finale',
          startSeconds: 2,
          durationSeconds: 1,
          line: 'Welcome to The Spammy.',
        },
      ],
    };
    const readAsset = async (): Promise<Uint8Array> =>
      new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#dba87b"/><circle cx="32" cy="40" r="5"/><circle cx="68" cy="40" r="5"/><path d="M25 65 Q50 88 75 65" fill="none" stroke="black" stroke-width="4"/></svg>',
      );
    try {
      const composition = await buildComposition(
        show,
        { showId: show.id, storyboard: null, timing: null, assets: [] },
        { directory, script, readAsset },
      );
      const video = await renderCeremony(composition, { aspect: '16:9', draft: false });

      expect((await stat(video.path)).size).toBeGreaterThan(0);
      await runHyperframes(
        ['snapshot', '.', '--at', '0.7,1.8', '--no-end', '--output', join(directory, 'scenes')],
        directory,
      );
      await renderCeremony(composition, { aspect: '9:16', draft: true });
      const poster = await renderPoster(show, { directory, script, readAsset });
      expect((await stat(poster.path)).size).toBeGreaterThan(0);
    } finally {
      if (process.env.KEEP_RENDER_TESTS === '1') console.log(`Render evidence: ${directory}`);
      else await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);
} else {
  it.todo('run the local render smoke with RUN_RENDER_TESTS=1');
}
