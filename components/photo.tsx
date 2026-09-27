import { PexelsImage } from '@/components/pexels-image'
import { Placeholder } from '@/components/ui'
import type { Photo as PhotoData } from '@/lib/pexels'
import { getPhoto, slotNote } from '@/lib/photos'

type Props = {
  slot: string
  className?: string
  /** Responsive width hint for the browser, e.g. "(min-width: 1024px) 40vw, 100vw". */
  sizes: string
  priority?: boolean
  /** Pre-fetched photo (use getPhotos for a page's worth at once). */
  photo?: PhotoData | null
  credit?: boolean
}

/** A Pexels photo for a spot on the site, or the striped placeholder with its art direction. */
export async function Photo({ slot, className, sizes, priority, photo, credit }: Props) {
  const p = photo === undefined ? await getPhoto(slot) : photo
  if (!p) return <Placeholder className={className} note={slotNote(slot)} />
  return (
    <PexelsImage
      src={p.src}
      alt={p.alt}
      sizes={sizes}
      priority={priority}
      avgColor={p.avgColor}
      className={className}
      credit={credit ? `Photo: ${p.photographer}` : undefined}
    />
  )
}
