import { NotImplementedError } from '@wrapa/domain';

import type { Show, Storyboard } from '@wrapa/domain';

/**
 * writes the ceremony storyboard and narration in the host persona's voice
 * @param show show with decided awards
 * @returns storyboard with one signature moment per award
 * @throws {NotImplementedError} until implemented
 */
export async function writeStoryboard(show: Show): Promise<Storyboard> {
  throw new NotImplementedError('agents.writeStoryboard');
}
