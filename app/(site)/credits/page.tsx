import type { Metadata } from 'next'
import { ExternalLink } from '@/components/ui'
import { PHOTO_SLOTS } from '@/config/photo-slots'
import { getPhotos } from '@/lib/photos'

export const metadata: Metadata = { title: 'Photo credits' }

export default async function Credits() {
  const photos = Object.values(await getPhotos(Object.keys(PHOTO_SLOTS))).filter((p) => p !== null)
  const unique = [...new Map(photos.map((p) => [p.id, p])).values()]
  return (
    <div className="mx-auto max-w-[720px] px-6 pt-12 pb-20 lg:pt-20">
      <h1 className="font-serif text-5xl leading-[1.1]">Photo credits</h1>
      <p className="mt-4 text-[15px] font-light leading-[1.7] text-ink-body">
        This is a portfolio demo. Photography is from{' '}
        <ExternalLink href="https://www.pexels.com" className="border-b border-ink">
          Pexels
        </ExternalLink>
        , used under the Pexels licence. With thanks to:
      </p>
      {unique.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">No photos yet. The site is showing art-direction placeholders.</p>
      ) : (
        <ul className="mt-10">
          {unique.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-4 border-t border-line py-3.5 text-sm">
              <ExternalLink href={p.photographerUrl} className="hover:text-olive">
                {p.photographer}
              </ExternalLink>
              <ExternalLink href={p.url} className="truncate text-ink-soft hover:text-olive">
                {p.alt}
              </ExternalLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
