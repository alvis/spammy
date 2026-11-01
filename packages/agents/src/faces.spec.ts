import { OpenAI } from 'openai';
import { expect, it, vi } from 'vitest';
import { locateFaces } from './faces';
import { OPENAI_MODELS } from '@spammy/domain';

it('should locate faces through private structured image input', async () => {
  const client = new OpenAI({ apiKey: 'offline-test' });
  const faces = [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }];
  const parse = vi
    .spyOn(client.responses, 'parse')
    .mockResolvedValue({ output_parsed: { faces } } as Awaited<
      ReturnType<typeof client.responses.parse>
    >);

  const result = await locateFaces(
    { bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' },
    client,
  );

  expect(result).toEqual(faces);
  expect(parse).toHaveBeenCalledWith(
    expect.objectContaining({
      model: OPENAI_MODELS.faceLocation,
      store: false,
      input: [
        expect.objectContaining({
          content: expect.arrayContaining([
            { type: 'input_image', image_url: 'data:image/png;base64,AQID', detail: 'high' },
          ]),
        }),
      ],
    }),
  );
});
