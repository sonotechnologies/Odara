/**
 * Every photo spot on the site, with the Pexels search that fills it and the
 * art direction from the design brief. Tune a query here, then re-run
 * `npm run photos:pick` to choose new photos.
 */
export type PhotoSlot = {
  query: string
  orientation: 'portrait' | 'landscape' | 'square'
  /** Alt text used when the photo's own description is empty. */
  alt: string
  /** Art direction, shown on the striped placeholder until a photo exists. */
  note: string
}

export const PHOTO_SLOTS = {
  hero: {
    query: 'silk press black woman hair',
    orientation: 'portrait',
    alt: 'Glossy silk-pressed hair catching window light',
    note: 'hero · silk press catching window light, close crop from the side, warm late-morning tone',
  },
  'gallery-braids': {
    query: 'knotless braids back view',
    orientation: 'portrait',
    alt: 'Knotless braids seen from behind',
    note: 'knotless braids, back view, soft shadow',
  },
  'gallery-nails': {
    query: 'manicure hands nails neutral',
    orientation: 'landscape',
    alt: 'Hands with fresh gel nails',
    note: 'hands, fresh gel nails on linen',
  },
  'gallery-lashes': {
    query: 'eyelash extensions close up closed eyes',
    orientation: 'landscape',
    alt: 'Close-up of lash extensions, eyes closed',
    note: 'lashes, eyes closed, macro',
  },
  'gallery-locs': {
    query: 'locs hair texture close up',
    orientation: 'landscape',
    alt: 'Retwisted locs in side light',
    note: 'locs, retwisted, texture detail in side light',
  },
  'stylist-adaeze': {
    query: 'black woman braids hairstylist portrait',
    orientation: 'portrait',
    alt: 'Portrait of Adaeze',
    note: 'portrait · Adaeze',
  },
  'stylist-tolu': {
    query: 'black woman hairdresser salon portrait',
    orientation: 'portrait',
    alt: 'Portrait of Tolu',
    note: 'portrait · Tolu',
  },
  'stylist-bisi': {
    query: 'woman with locs portrait natural light',
    orientation: 'portrait',
    alt: 'Portrait of Bisi',
    note: 'portrait · Bisi',
  },
  'stylist-kemi': {
    query: 'black woman nail technician',
    orientation: 'portrait',
    alt: 'Portrait of Kemi',
    note: 'portrait · Kemi',
  },
  'stylist-ifeoma': {
    query: 'black woman beautician portrait',
    orientation: 'portrait',
    alt: 'Portrait of Ifeoma',
    note: 'portrait · Ifeoma',
  },
} satisfies Record<string, PhotoSlot>

export type PhotoSlotKey = keyof typeof PHOTO_SLOTS

export const stylistSlot = (slug: string) => `stylist-${slug}` as PhotoSlotKey
