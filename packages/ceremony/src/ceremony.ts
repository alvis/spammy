import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';

import { buildCeremonyScript, CeremonyScriptSchema, getCostume } from '@spammy/domain';

import { compositionHtml } from './composition';

import type { Aspect, Asset, CeremonyScript, ProductionManifest, Show } from '@spammy/domain';

/** injected filesystem boundary for projects and local asset copies */
export interface CeremonyOptions {
  directory?: string;
  script?: CeremonyScript;
  readAsset?: (fileName: string) => Promise<Uint8Array | null>;
  run?: (args: string[], directory: string, progress?: (message: string) => void) => Promise<void>;
  onProgress?: (message: string) => void;
}

/** render request for a ceremony video */
export interface RenderRequest {
  aspect: Aspect;
  draft: boolean;
  onProgress?: (message: string) => void;
  run?: CeremonyOptions['run'];
}

/** local prerequisites or renderer failure with actionable CLI diagnostics */
export class RenderUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RenderUnavailableError';
  }
}

const require = createRequire(import.meta.url);
const asset = (kind: Asset['kind'], path: string): Asset => ({
  id: randomUUID(),
  kind,
  path,
  provider: 'hyperframes',
  model: null,
  createdAt: new Date().toISOString(),
});

/**
 * runs the pinned local CLI while forwarding render output
 * @param args CLI arguments
 * @param directory project directory
 * @param progress optional progress observer
 * @returns completion after successful CLI exit
 */
export async function runHyperframes(
  args: string[],
  directory: string,
  progress?: (message: string) => void,
): Promise<void> {
  const executable = join(
    dirname(require.resolve('hyperframes/package.json')),
    'bin/hyperframes.mjs',
  );
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(process.execPath, [executable, ...args], {
      cwd: directory,
      env: { ...process.env, DO_NOT_TRACK: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let diagnostics = '';
    const output = (chunk: Buffer): void => {
      diagnostics = (diagnostics + chunk.toString()).slice(-8000);
      progress?.(chunk.toString());
    };
    child.stdout.on('data', output);
    child.stderr.on('data', output);
    child.once('error', (cause) =>
      reject(
        new RenderUnavailableError(
          'Local rendering could not start. Run hyperframes doctor and install Chrome and FFmpeg.',
          { cause },
        ),
      ),
    );
    child.once('close', (code, signal) =>
      code === 0
        ? resolveRun()
        : reject(
            new RenderUnavailableError(
              `Local rendering failed (${args[0]}, exit ${code}, signal ${signal}). Run hyperframes doctor; Chrome and FFmpeg are required. ${diagnostics}`,
            ),
          ),
    );
  });
}

/**
 * writes a self-contained HyperFrames project using the live ceremony script
 * @param show decided show
 * @param manifest production provenance
 * @param options injected script and local asset reader
 * @returns composition asset pointing at its entry document
 */
export async function buildComposition(
  show: Show,
  manifest: ProductionManifest,
  options: CeremonyOptions = {},
): Promise<Asset> {
  const script = CeremonyScriptSchema.parse(options.script ?? buildCeremonyScript(show));
  const directory =
    options.directory ??
    resolve(
      process.env.SPAMMY_DATA_DIR ?? './data',
      'shows',
      show.id,
      'assets',
      `composition-${randomUUID()}`,
    );
  await mkdir(directory, { recursive: true });
  const localize = async (url: string): Promise<string> => {
    const fileName = basename(url);
    const bytes = await options.readAsset?.(fileName);
    if (!bytes)
      throw new RenderUnavailableError(
        `The ceremony asset ${fileName} is missing. Produce the show again before exporting.`,
      );
    await writeFile(join(directory, fileName), bytes);
    return fileName;
  };
  const localized: CeremonyScript = { ...script, scenes: [], cast: [], music: [] };
  for (const scene of script.scenes)
    localized.scenes.push({
      ...scene,
      audioUrl: scene.audioUrl ? await localize(scene.audioUrl) : undefined,
    });
  await mkdir(join(directory, 'costumes'), { recursive: true });
  for (const member of script.cast) {
    const costume = getCostume(member.costumeId);
    await writeFile(
      join(directory, 'costumes', `${costume.id}.png`),
      await readFile(new URL(`../../../${costume.path}`, import.meta.url)),
    );
    localized.cast.push({
      ...member,
      costumeId: costume.id,
      photoAssetId: member.photoAssetId ? await localize(member.photoAssetId) : null,
    });
  }
  for (const cue of script.music ?? [])
    localized.music!.push({ ...cue, audioUrl: await localize(cue.audioUrl) });
  for (const [family, weight] of [
    ['fredoka', 700],
    ['nunito', 800],
  ] as const) {
    const fontName = `${family}-latin-${weight}-normal.woff2`;
    await writeFile(
      join(directory, fontName),
      await readFile(require.resolve(`@fontsource/${family}/files/${fontName}`)),
    );
  }
  await writeFile(
    join(directory, 'gsap.min.js'),
    await readFile(require.resolve('gsap/dist/gsap.min.js')),
  );
  await writeFile(join(directory, 'ceremony-script.json'), JSON.stringify(localized));
  await writeFile(join(directory, 'production-manifest.json'), JSON.stringify(manifest));
  await writeFile(join(directory, 'index.html'), compositionHtml(localized));
  return asset('composition', join(directory, 'index.html'));
}

/**
 * checks local prerequisites and renders a draft before the final video
 * @param composition local project entry
 * @param request aspect, draft mode and progress observer
 * @returns rendered video asset
 */
export async function renderCeremony(composition: Asset, request: RenderRequest): Promise<Asset> {
  const directory = dirname(composition.path);
  const run = request.run ?? runHyperframes;
  const script = CeremonyScriptSchema.parse(
    JSON.parse(await readFile(join(directory, 'ceremony-script.json'), 'utf8')),
  );
  await writeFile(
    join(directory, 'index.html'),
    compositionHtml(script, request.aspect === '9:16'),
  );
  await run(['doctor'], directory, request.onProgress);
  await run(['check', '.'], directory, request.onProgress);
  const draftPath = join(directory, 'draft.mp4');
  await run(
    ['render', '.', '--fps', '1', '--quality', 'draft', '--output', draftPath],
    directory,
    request.onProgress,
  );
  if (request.draft) return asset('video', draftPath);
  const finalPath = join(directory, 'ceremony.mp4');
  await run(
    ['render', '.', '--fps', '24', '--quality', 'delivery', '--output', finalPath],
    directory,
    request.onProgress,
  );
  return asset('video', finalPath);
}

/**
 * captures the complete winners grid as a PNG
 * @param show decided show
 * @param options local asset capabilities
 * @returns poster image asset
 */
export async function renderPoster(show: Show, options: CeremonyOptions = {}): Promise<Asset> {
  const script = options.script ?? buildCeremonyScript(show);
  const composition = await buildComposition(
    show,
    { showId: show.id, storyboard: null, timing: null, assets: [] },
    { ...options, script },
  );
  const directory = dirname(composition.path);
  const run = options.run ?? runHyperframes;
  const finale = script.scenes.find((scene) => scene.kind === 'finale')!;
  const output = join(directory, 'poster');
  await run(['doctor'], directory, options.onProgress);
  await run(
    [
      'snapshot',
      '.',
      '--at',
      String(finale.startSeconds + Math.min(1, finale.durationSeconds / 2)),
      '--no-end',
      '--output',
      output,
    ],
    directory,
    options.onProgress,
  );
  const fileName = (await readdir(output)).find((name) => name.endsWith('.png'));
  if (!fileName)
    throw new RenderUnavailableError(
      'The local renderer did not produce a poster PNG. Run hyperframes doctor.',
    );
  return asset('poster', join(output, fileName));
}
