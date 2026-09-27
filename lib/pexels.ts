/** Minimal Pexels API client. Used by the pick script and the live fallback. */
import type { PhotoSlot } from '@/config/photo-slots'

export type Photo = {
  id: number
  /** Original image URL without query; sized on demand with Pexels' own resizer. */
  src: string
  width: number
  height: number
  alt: string
  avgColor: string
  photographer: string
  photographerUrl: string
  /** The photo's page on Pexels. */
  url: string
}

type PexelsPhoto = {
  id: number
  width: number
  height: number
  url: string
  alt: string
  avg_color: string
  photographer: string
  photographer_url: string
  src: { original: string }
}

export async function searchPexels(slot: PhotoSlot, key: string, perPage = 15): Promise<Photo[]> {
  const q = new URLSearchParams({ query: slot.query, orientation: slot.orientation, per_page: String(perPage), size: 'large' })
  const res = await fetch(`https://api.pexels.com/v1/search?${q}`, { headers: { Authorization: key }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text().catch(() => '')}`)
  const data = (await res.json()) as { photos: PexelsPhoto[] }
  return data.photos.map((p) => ({
    id: p.id,
    src: p.src.original.split('?')[0],
    width: p.width,
    height: p.height,
    alt: p.alt?.trim() || slot.alt,
    avgColor: p.avg_color || '#EBE4D8',
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    url: p.url,
  }))
}
