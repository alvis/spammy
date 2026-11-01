import { NotImplementedError } from '@wrapa/domain';

import type { Aspect, Asset, ProductionManifest, Show } from '@wrapa/domain';

/** render request for a ceremony video */
export interface RenderRequest {
  /** output aspect ratio */
  aspect: Aspect;
  /** renders a low-fps draft for review instead of the final MP4 */
  draft: boolean;
}

/**
 * writes the HyperFrames composition for the show, cut to the locked timing
 * @param show show with decided awards and cast photos
 * @param manifest production manifest with storyboard, timing, narration, and music
 * @returns stored composition asset
 * @throws {NotImplementedError} until implemented
 */
export async function buildComposition(show: Show, manifest: ProductionManifest): Promise<Asset> {
  throw new NotImplementedError('ceremony.buildComposition');
}

/**
 * renders the composition locally with the HyperFrames CLI
 * @param composition composition asset
 * @param request aspect and draft flag
 * @returns stored video asset
 * @throws {NotImplementedError} until implemented
 */
export async function renderCeremony(composition: Asset, request: RenderRequest): Promise<Asset> {
  throw new NotImplementedError('ceremony.renderCeremony');
}

/**
 * renders the shareable winners poster as PNG
 * @param show show with decided awards
 * @returns stored poster asset
 * @throws {NotImplementedError} until implemented
 */
export async function renderPoster(show: Show): Promise<Asset> {
  throw new NotImplementedError('ceremony.renderPoster');
}
