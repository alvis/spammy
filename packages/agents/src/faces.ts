import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { FaceBoxSchema, NotImplementedError, OPENAI_MODELS } from '@spammy/domain';

import type { OpenAI } from 'openai';
import type { FaceBox } from '@spammy/domain';

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
 * @param client server-owned Responses API capability
 * @returns validated face locations, without inferring identities
 * @throws {NotImplementedError} when no server client was supplied
 */
export async function locateFaces(
  photo: PhotoInput,
  client?: Pick<OpenAI, 'responses'>,
): Promise<FaceBox[]> {
  if (!client) throw new NotImplementedError('agents.locateFaces');

  const resultSchema = z.object({ faces: z.array(FaceBoxSchema) });
  const response = await client.responses.parse({
    model: OPENAI_MODELS.faceLocation,
    store: false,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Locate visible human faces. Return bounding boxes normalized to image width and height. Include each face once. Do not identify people or infer personal attributes. Return an empty array if none are visible.',
          },
          {
            type: 'input_image',
            image_url: `data:${photo.mimeType};base64,${Buffer.from(photo.bytes).toString('base64')}`,
            detail: 'high',
          },
        ],
      },
    ],
    text: { format: zodTextFormat(resultSchema, 'face_locations') },
  });
  const result = resultSchema.parse(response.output_parsed);

  return result.faces.filter(
    (face) =>
      face.width > 0 && face.height > 0 && face.x + face.width <= 1 && face.y + face.height <= 1,
  );
}
