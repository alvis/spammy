import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

import type { ElevenLabs } from '@elevenlabs/elevenlabs-js';

const request = {
  modelId: 'music_v1',
  outputFormat: 'mp3_44100_128',
  seed: 20261101,
  respectSectionsDurations: true,
  compositionPlan: {
    positiveGlobalStyles: [
      'original joyful theatrical musical awards ceremony',
      '120 BPM, 4/4, disco-swing groove in C major',
      'bright piano, playful brass stabs, walking electric bass, handclaps, crisp drums',
      'warm funny celebratory ensemble, polished clean mix',
      'sparse sung hooks with long instrumental spaces for a host speaking over the music',
      'loop-friendly groove: immediate downbeat opening and matching energetic final bar',
    ],
    negativeGlobalStyles: [
      'spoken narration',
      'real artist imitation',
      'existing songs',
      'long fadeout',
      'dramatic silence',
      'aggressive distortion',
      'dense continuous vocals',
    ],
    sections: [
      {
        sectionName: 'Curtain up',
        durationMs: 20000,
        positiveLocalStyles: [
          'ten complete bars',
          'bright overture, brass fanfare into buoyant piano groove',
        ],
        negativeLocalStyles: ['slow introduction'],
        lines: ['Brunch Club, take a bow!', 'Spammy lights the stage right now!'],
      },
      {
        sectionName: 'The nominees',
        durationMs: 20000,
        positiveLocalStyles: [
          'ten complete bars',
          'playful instrumental piano and brass call and response',
        ],
        negativeLocalStyles: ['vocals'],
        lines: [],
      },
      {
        sectionName: 'Everybody wins a moment',
        durationMs: 20000,
        positiveLocalStyles: [
          'ten complete bars',
          'handclaps, joyful ensemble hook then instrumental dance break',
        ],
        negativeLocalStyles: ['long vocal solo'],
        lines: ['Big laughs, tiny crowns!', 'Best little brunch in town!'],
      },
      {
        sectionName: 'Keep the party going',
        durationMs: 20000,
        positiveLocalStyles: [
          'ten complete bars',
          'instrumental brass and piano reprise with rising celebratory energy',
          'last bar keeps the opening groove and resolves directly into opening C major downbeat',
        ],
        negativeLocalStyles: ['vocals', 'fadeout', 'final sustained chord'],
        lines: [],
      },
    ],
  },
} satisfies ElevenLabs.BodyComposeMusicV1MusicPost;

const run = promisify(execFile);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2);
const outputDirectory = resolve(
  args.find((arg) => !arg.startsWith('--')) ?? join(repository, 'apps/web/public/demo'),
);

async function main(): Promise<void> {
  if (args.includes('--dry-run')) {
    console.log(JSON.stringify({ outputDirectory, request }, null, 2));
    return;
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey)
    throw new Error(
      'Set ELEVENLABS_API_KEY in the server environment before generating demo music.',
    );
  // Verify the local measurement tool before making a paid request.
  await run('ffprobe', ['-version']);
  const client = new ElevenLabsClient({ apiKey });
  const bytes = new Uint8Array(
    await new Response(await client.music.compose(request)).arrayBuffer(),
  );
  const directory = await mkdtemp(join(tmpdir(), 'spammy-demo-music-'));
  try {
    const temporaryAudio = join(directory, 'brunch-club-musical.mp3');
    await writeFile(temporaryAudio, bytes);
    const { stdout } = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      temporaryAudio,
    ]);
    const durationSeconds = Number(stdout.trim());
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0)
      throw new Error('ElevenLabs returned audio without a measurable positive duration.');
    const metadata = {
      provider: 'elevenlabs',
      model: request.modelId,
      createdAt: new Date().toISOString(),
      file: 'brunch-club-musical.mp3',
      contentType: 'audio/mpeg',
      durationSeconds,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      title: 'Brunch Club Takes a Bow',
      description:
        'Original theatrical disco-swing backing with sparse Brunch Club and Spammy hooks.',
      request,
    };
    await mkdir(outputDirectory, { recursive: true });
    await copyFile(temporaryAudio, join(outputDirectory, metadata.file));
    await writeFile(
      join(outputDirectory, 'brunch-club-musical.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
    );
    console.log(
      `Saved ElevenLabs music (${durationSeconds.toFixed(2)} seconds) and provenance to ${outputDirectory}`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Demo music generation failed.');
  process.exitCode = 1;
});
