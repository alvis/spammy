import { getCostume } from '@spammy/domain';

import type { CostumeId } from '@spammy/domain';

const costumeAssets = import.meta.glob<string>('../../../costumes/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** resolves original costume artwork through Vite for development and production */
export function costumeAssetUrl(costumeId?: CostumeId): string {
  const costume = getCostume(costumeId);
  const url = costumeAssets[`../../../${costume.path}`];
  if (!url) throw new Error(`Missing costume artwork: ${costume.id}`);
  return url;
}
