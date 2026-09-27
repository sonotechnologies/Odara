import 'server-only'
import pinned from '@/config/photos.json'
import { PHOTO_SLOTS, type PhotoSlotKey } from '@/config/photo-slots'
import { searchPexels, type Photo } from '@/lib/pexels'

const pins = pinned as Partial<Record<string, Photo>>
const DAY = 86_400_000

// Live fallback cache, per server instance. Pinned photos never hit the API.
const g = globalThis as unknown as { __odaraPhotos?: Map<string, { at: number; photo: Photo | null }> }
const cache = (g.__odaraPhotos ??= new Map())

/**
 * The photo for a spot on the site: the pinned one from config/photos.json,
 * else a live Pexels search (cached a day) if PEXELS_API_KEY is set, else null
 * and the caller shows the striped placeholder.
 */
export async function getPhoto(slot: string): Promise<Photo | null> {
  if (pins[slot]) return pins[slot]!
  const def = PHOTO_SLOTS[slot as PhotoSlotKey]
  const key = process.env.PEXELS_API_KEY
  if (!def || !key) return null
  const hit = cache.get(slot)
  if (hit && Date.now() - hit.at < DAY) return hit.photo
  try {
    const [first] = await searchPexels(def, key, 1)
    cache.set(slot, { at: Date.now(), photo: first ?? null })
    return first ?? null
  } catch (e) {
    console.error(`[photos] ${slot}:`, (e as Error).message)
    cache.set(slot, { at: Date.now() - DAY + 5 * 60_000, photo: null }) // retry in 5 minutes
    return null
  }
}

export async function getPhotos<K extends string>(slots: readonly K[]): Promise<Record<K, Photo | null>> {
  const found = await Promise.all(slots.map(getPhoto))
  return Object.fromEntries(slots.map((s, i) => [s, found[i]])) as Record<K, Photo | null>
}

export const slotNote = (slot: string) => PHOTO_SLOTS[slot as PhotoSlotKey]?.note ?? slot
