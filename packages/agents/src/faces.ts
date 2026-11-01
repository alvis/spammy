import { NotImplementedError } from '@wrapa/domain';

import type { FaceBox } from '@wrapa/domain';

/** an uploaded photo to scan for faces */
export interface PhotoInput {
  /** image bytes */
  bytes: Uint8Array;
  /** image MIME type, e.g. `image/jpeg` */
  mimeType: string;
}

/**
 * locates candidate faces in a photo so the host can pick the right person
 * @param photo uploaded image
 * @returns face boxes ordered by confidence
 * @throws {NotImplementedError} until implemented
 */
export async function locateFaces(photo: PhotoInput): Promise<FaceBox[]> {
  throw new NotImplementedError('agents.locateFaces');
}
