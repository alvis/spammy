import { z } from 'zod';

/** curated costume references supplied with the application */
export const COSTUMES = [
  {
    id: 'cosmic-cape',
    label: 'Cosmic cape',
    path: 'costumes/exec-05d16cb6-d43d-4f0d-b99f-e13e7048c90c.png',
  },
  {
    id: 'ivory-tuxedo',
    label: 'Ivory tuxedo',
    path: 'costumes/exec-091c9f4f-f3df-415c-96e3-a252ec246a5b.png',
  },
  {
    id: 'midnight-gold-tuxedo',
    label: 'Midnight gold tuxedo',
    path: 'costumes/exec-25e89f81-015a-47c5-8f36-7f7e776d56c0.png',
  },
  {
    id: 'scarlet-gown',
    label: 'Scarlet gown',
    path: 'costumes/exec-26712feb-f61f-4dfc-a24b-c9cc60bab117.png',
  },
  {
    id: 'burgundy-gown',
    label: 'Burgundy gown',
    path: 'costumes/exec-2cf19dae-90e8-4b09-97d8-93f30ba679ed.png',
  },
  {
    id: 'ivory-gown',
    label: 'Ivory gown',
    path: 'costumes/exec-3e2902d8-9606-4c1c-9a8e-903c465d73c1.png',
  },
  {
    id: 'royal-purple-cape',
    label: 'Royal purple cape',
    path: 'costumes/exec-4607c698-0f69-458f-a261-e9b859191e37.png',
  },
  {
    id: 'tangerine-gown',
    label: 'Tangerine gown',
    path: 'costumes/exec-4743aff8-6c9e-47ae-8005-c63365a24bfa.png',
  },
  {
    id: 'silver-jumpsuit',
    label: 'Silver jumpsuit',
    path: 'costumes/exec-57598981-3df2-422a-badd-509368e68eb9.png',
  },
  {
    id: 'silver-gown',
    label: 'Silver gown',
    path: 'costumes/exec-5ad843e0-4497-4caf-b49d-fa7361dacb2a.png',
  },
  {
    id: 'burgundy-tuxedo',
    label: 'Burgundy tuxedo',
    path: 'costumes/exec-5b898480-4343-436a-b1cc-370d59c95c68.png',
  },
  {
    id: 'emerald-gown',
    label: 'Emerald gown',
    path: 'costumes/exec-607c9a27-d339-423b-be26-9455bc91cdf2.png',
  },
  {
    id: 'emerald-gold-tuxedo',
    label: 'Emerald gold tuxedo',
    path: 'costumes/exec-64a523c0-b71e-4c46-aa8a-48ad00881c88.png',
  },
  {
    id: 'silver-tuxedo',
    label: 'Silver tuxedo',
    path: 'costumes/exec-65d54f49-a9f5-4ad9-8b4f-05d765cdfc20.png',
  },
  {
    id: 'navy-tuxedo',
    label: 'Navy tuxedo',
    path: 'costumes/exec-6652a8d2-1fa1-446c-a0ef-bbe56ecd39d3.png',
  },
  {
    id: 'feathered-black-gown',
    label: 'Feathered black gown',
    path: 'costumes/exec-780b3c5d-9854-49ef-a6be-729e33ca5ac4.png',
  },
  {
    id: 'purple-gown',
    label: 'Purple gown',
    path: 'costumes/exec-8464b673-211a-4b1b-985d-5a73818b32e6.png',
  },
  {
    id: 'black-gold-tailcoat',
    label: 'Black gold tailcoat',
    path: 'costumes/exec-8eee86b6-b7cc-47b9-b1a1-e526a4472c62.png',
  },
  {
    id: 'silver-armor',
    label: 'Silver armor',
    path: 'costumes/exec-91fb9dcf-431f-4ad3-91b6-ed6ed82cc837.png',
  },
  {
    id: 'gold-tuxedo',
    label: 'Gold tuxedo',
    path: 'costumes/exec-9d2c6068-6f43-4111-b09e-6662a2d1cfa8.png',
  },
  {
    id: 'navy-double-breasted-suit',
    label: 'Navy double-breasted suit',
    path: 'costumes/exec-9f1fe9db-42ad-432a-a7aa-1863cea55ecc.png',
  },
  {
    id: 'purple-suit',
    label: 'Purple suit',
    path: 'costumes/exec-a3b554df-1cec-43c9-9101-c5512adf78db.png',
  },
  {
    id: 'black-tuxedo',
    label: 'Black tuxedo',
    path: 'costumes/exec-b938e04c-0c56-4291-bd61-8011b9515825.png',
  },
  {
    id: 'pink-ruffle-gown',
    label: 'Pink ruffle gown',
    path: 'costumes/exec-b93d71d0-57aa-4677-9647-8fa97f4fdeca.png',
  },
  {
    id: 'gold-star-flares',
    label: 'Gold star flares',
    path: 'costumes/exec-cda53bea-20e0-4913-b557-b8b5bd8fd5ac.png',
  },
  {
    id: 'royal-blue-cape',
    label: 'Royal blue cape',
    path: 'costumes/exec-d21d7e0d-69db-4083-87ff-645887e3a818.png',
  },
  {
    id: 'patchwork-party-suit',
    label: 'Patchwork party suit',
    path: 'costumes/exec-dbc0c361-27ba-4d62-bf6a-6f1df4f994fc.png',
  },
  {
    id: 'black-gown',
    label: 'Black gown',
    path: 'costumes/exec-e1068549-c820-4b85-8241-13669fa838c4.png',
  },
  {
    id: 'holographic-flares',
    label: 'Holographic flares',
    path: 'costumes/exec-ebccb9c7-9f6c-4bf2-a0a3-ffa8bb7a8125.png',
  },
  {
    id: 'rose-suit',
    label: 'Rose suit',
    path: 'costumes/exec-ee05b5b3-e8b5-4992-b895-70e1a3252a7a.png',
  },
  {
    id: 'gold-gown',
    label: 'Gold gown',
    path: 'costumes/exec-fe868b10-149e-4ffb-aa73-7bffbaa0c7e4.png',
  },
] as const;

/** stable identifiers shared by saved shows and optional portrait references */
export const CostumeIdSchema = z.enum(COSTUMES.map(({ id }) => id));

/** original local costume artwork metadata */
export const CostumeSchema = z.object({
  id: CostumeIdSchema,
  label: z.string().min(1),
  path: z.string().startsWith('costumes/').endsWith('.png'),
});

export type CostumeId = z.infer<typeof CostumeIdSchema>;
export type Costume = z.infer<typeof CostumeSchema>;

/** deterministic costume for shows saved before costume selection existed */
export const DEFAULT_COSTUME_ID: CostumeId = 'black-tuxedo';

/**
 * resolves a saved selection or the legacy-show default
 * @param costumeId optional validated cast selection
 * @returns original artwork metadata
 */
export function getCostume(costumeId: CostumeId = DEFAULT_COSTUME_ID): Costume {
  return COSTUMES.find(({ id }) => id === costumeId)!;
}

/** public preview metadata for a curated local costume reference */
export const CostumeOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  previewUrl: z.string().startsWith('/api/costumes/'),
});

export type CostumeOption = z.infer<typeof CostumeOptionSchema>;
