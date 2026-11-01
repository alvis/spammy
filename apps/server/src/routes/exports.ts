import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { streamSSE } from 'hono/streaming';

import {
  buildComposition,
  renderCeremony,
  renderPoster,
  RenderUnavailableError,
} from '@spammy/ceremony';
import {
  buildCeremonyScript,
  CeremonyScriptSchema,
  ExportRequestSchema,
  refreshCeremonyCostumes,
} from '@spammy/domain';

import type { Hono } from 'hono';
import type { AppContext } from '../app';

/**
 * registers local exports; SSE clients receive progress and a final download event
 * @param app HTTP application
 * @param context persistence boundary
 * @param renderer injectable local render capabilities
 */
export function registerExportRoutes(
  app: Hono,
  context: AppContext,
  renderer = { buildComposition, renderCeremony, renderPoster },
): void {
  app.post('/api/shows/:showId/exports', async (c) => {
    const request = ExportRequestSchema.safeParse(await c.req.json());
    if (!request.success)
      return c.json({ error: 'invalid_request', issues: request.error.issues }, 400);
    const show = await context.store.readShow(c.req.param('showId'));
    if (!show) return c.json({ error: 'not_found' }, 404);
    const bytes = await context.store.readAsset(show.id, 'ceremony-script.json');
    const produced = bytes
      ? CeremonyScriptSchema.parse(JSON.parse(new TextDecoder().decode(bytes)))
      : buildCeremonyScript(show);
    const script = refreshCeremonyCostumes(produced, show.cast);
    const produce = async (onProgress?: (message: string) => void) => {
      const directory = await mkdtemp(join(tmpdir(), 'spammy-export-'));
      try {
        const options = {
          directory,
          script,
          onProgress,
          readAsset: (fileName: string) => context.store.readAsset(show.id, fileName),
        };
        const rendered =
          request.data.kind === 'poster'
            ? await renderer.renderPoster(show, options)
            : await renderer.renderCeremony(
                await renderer.buildComposition(
                  show,
                  { showId: show.id, storyboard: null, timing: null, assets: [] },
                  options,
                ),
                { ...request.data, onProgress },
              );
        await context.store.writeAsset(
          show.id,
          `composition-${rendered.id}.html`,
          await readFile(join(directory, 'index.html')),
        );
        await context.store.writeAsset(
          show.id,
          'gsap.min.js',
          await readFile(join(directory, 'gsap.min.js')),
        );
        for (const fontName of [
          'fredoka-latin-700-normal.woff2',
          'nunito-latin-800-normal.woff2',
        ]) {
          await context.store.writeAsset(
            show.id,
            fontName,
            await readFile(join(directory, fontName)),
          );
        }
        const fileName = `${rendered.id}-${basename(rendered.path)}`;
        const path = await context.store.writeAsset(
          show.id,
          fileName,
          await readFile(rendered.path),
        );
        const url = `/api/shows/${encodeURIComponent(show.id)}/assets/${encodeURIComponent(fileName)}`;
        return { asset: { ...rendered, path }, url };
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    };
    if (c.req.header('Accept')?.includes('text/event-stream')) {
      return streamSSE(c, async (stream) => {
        let pending = Promise.resolve();
        try {
          const result = await produce((message) => {
            pending = pending.then(() => stream.writeSSE({ event: 'progress', data: message }));
          });
          await pending;
          await stream.writeSSE({ event: 'complete', data: JSON.stringify(result) });
        } catch (error) {
          await pending;
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              error: 'render_unavailable',
              message:
                error instanceof RenderUnavailableError
                  ? error.message
                  : 'Export failed. Run hyperframes doctor and retry.',
            }),
          });
        }
      });
    }
    try {
      return c.json(await produce());
    } catch (error) {
      if (error instanceof RenderUnavailableError)
        return c.json({ error: 'render_unavailable', message: error.message }, 503);
      throw error;
    }
  });
}
