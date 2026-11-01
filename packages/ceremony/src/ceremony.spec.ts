import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCostume, ShowSchema } from '@spammy/domain';

import { buildComposition, renderCeremony } from './ceremony';

import type { Asset } from '@spammy/domain';

const script = {
  showId: 'demo',
  title: 'Demo',
  persona: 'goldie',
  look: 'ivory',
  cast: [],
  durationSeconds: 3,
  scenes: [{ id: 'open', kind: 'open', startSeconds: 0, durationSeconds: 3, line: 'Hello' }],
};

describe('fn:renderCeremony', () => {
  it('should check prerequisites and renders a draft before the final at the requested aspect', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ceremony-test-'));
    const commands: string[][] = [];
    const composition: Asset = {
      id: 'composition',
      kind: 'composition',
      path: join(directory, 'index.html'),
      provider: 'hyperframes',
      model: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    try {
      await writeFile(join(directory, 'ceremony-script.json'), JSON.stringify(script));
      const result = await renderCeremony(composition, {
        aspect: '9:16',
        draft: false,
        run: async (args) => {
          commands.push(args);
        },
      });

      expect(commands).toEqual([
        ['doctor'],
        ['check', '.'],
        [
          'render',
          '.',
          '--fps',
          '1',
          '--quality',
          'draft',
          '--output',
          join(directory, 'draft.mp4'),
        ],
        [
          'render',
          '.',
          '--fps',
          '24',
          '--quality',
          'delivery',
          '--output',
          join(directory, 'ceremony.mp4'),
        ],
      ]);
      expect(result.path).toEqual(join(directory, 'ceremony.mp4'));
      expect(await readFile(composition.path, 'utf8')).toContain(
        'data-width="1080" data-height="1920"',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it.todo('TODO(draft): covers missing dependencies and poster capture');
});

describe('fn:buildComposition', () => {
  it('should copy original selected and legacy costume PNGs into a portable project', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'costume-composition-'));
    const show = ShowSchema.parse({
      id: 'costumes',
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
      chat: null,
      groupPhotoAssetId: null,
      awards: [],
      cast: [
        {
          id: 'a',
          participantId: 'a',
          displayName: 'Alex',
          photoAssetId: null,
          face: null,
          costumeId: 'scarlet-gown',
        },
        { id: 'b', participantId: 'b', displayName: 'Blair', photoAssetId: null, face: null },
      ],
    });
    try {
      await buildComposition(
        show,
        { showId: show.id, storyboard: null, timing: null, assets: [] },
        { directory },
      );
      for (const id of ['scarlet-gown', 'black-tuxedo'] as const) {
        expect(
          (await readFile(join(directory, 'costumes', `${id}.png`))).equals(
            await readFile(new URL(`../../../${getCostume(id).path}`, import.meta.url)),
          ),
        ).toBe(true);
      }
      const localized = JSON.parse(await readFile(join(directory, 'ceremony-script.json'), 'utf8'));
      expect(localized.cast.map((member: { costumeId: string }) => member.costumeId)).toEqual([
        'scarlet-gown',
        'black-tuxedo',
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
