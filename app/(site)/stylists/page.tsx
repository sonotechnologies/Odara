import type { Metadata } from 'next'
import Link from 'next/link'
import { Photo } from '@/components/photo'
import { textLink } from '@/components/ui'
import { stylistSlot } from '@/config/photo-slots'
import { stylistsWithServices } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Stylists' }

export default async function StylistsPage() {
  const stylists = await stylistsWithServices()
  return (
    <div className="mx-auto max-w-[1440px] pb-12 lg:px-16 lg:pb-[120px]">
      <h1 className="px-6 pt-12 pb-6 font-serif text-5xl leading-[1.1] lg:px-0 lg:pt-20 lg:pb-16 lg:text-8xl">Stylists</h1>
      <ul className="lg:grid lg:grid-cols-2 lg:gap-x-16">
        {stylists.map((p) => (
          <li key={p.id} id={p.slug} className="mx-6 grid scroll-mt-6 grid-cols-[128px_1fr] gap-5 border-t border-line pt-6 pb-8 lg:mx-0 lg:grid-cols-[220px_1fr] lg:gap-8 lg:pt-8 lg:pb-12">
            <Photo slot={stylistSlot(p.slug)} sizes="(min-width: 1024px) 220px, 128px" className="h-[164px] p-2 text-[10px] leading-[1.4] lg:h-[280px]" />
            <div className="flex flex-col gap-2 lg:gap-3">
              <h2 className="font-serif text-[26px] leading-[1.1] lg:text-4xl">{p.name}</h2>
              <div className="text-[13px] text-olive lg:text-sm">{p.specialties}</div>
              {p.bio && <p className="hidden text-sm font-light leading-[1.65] text-ink-body lg:block">{p.bio}</p>}
              <p className="text-[13px] leading-[1.7] text-ink-body lg:text-sm">{p.services.map((s) => s.name).join(' · ')}</p>
              <Link href={`/book?stylist=${p.slug}`} className={`mt-1 self-start text-[13px] lg:text-sm ${textLink}`}>
                Book with {p.name}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
