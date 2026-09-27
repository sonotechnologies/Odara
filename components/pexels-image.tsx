'use client'

import Image, { type ImageLoader } from 'next/image'
import { useState } from 'react'
import { cx } from '@/components/ui'

// Pexels resizes on its own CDN, so we skip Next's optimiser and ask for the exact width.
const pexelsLoader: ImageLoader = ({ src, width, quality }) =>
  `${src}?auto=compress&cs=tinysrgb&w=${width}${quality ? `&q=${quality}` : ''}`

export function PexelsImage({
  src,
  alt,
  sizes,
  priority,
  avgColor,
  className,
  credit,
}: {
  src: string
  alt: string
  sizes: string
  priority?: boolean
  avgColor: string
  className?: string
  credit?: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cx('relative overflow-hidden', className)} style={{ backgroundColor: avgColor }}>
      <Image
        loader={pexelsLoader}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        className={cx('object-cover transition-opacity duration-700 ease-out', loaded ? 'opacity-100' : 'opacity-0')}
      />
      {credit && (
        <span className="pointer-events-none absolute right-2 bottom-1.5 text-[10px] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
          {credit}
        </span>
      )}
    </div>
  )
}
