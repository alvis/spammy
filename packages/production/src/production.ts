import { NotImplementedError } from '@wrapa/domain';

import type { Asset, Persona, Storyboard, TimingLock } from '@wrapa/domain';

/** narration audio plus measured word timing */
export interface NarrationTake {
  /** stored narration audio */
  audio: Asset;
  /** measured timing that locks the picture */
  timing: TimingLock;
}

/**
 * synthesizes narration for every storyboard segment with the persona voice and measures word timing
 * @param storyboard approved storyboard
 * @param persona host persona selecting the voice
 * @returns narration asset and measured timing
 * @throws {NotImplementedError} until implemented
 */
export async function recordNarration(storyboard: Storyboard, persona: Persona): Promise<NarrationTake> {
  throw new NotImplementedError('production.recordNarration');
}

/**
 * composes music to the locked timing: one cue per segment plus a sung theme hook
 * @param timing locked narration timing
 * @returns stored music asset
 * @throws {NotImplementedError} until implemented
 */
export async function composeScore(timing: TimingLock): Promise<Asset> {
  throw new NotImplementedError('production.composeScore');
}
