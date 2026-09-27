'use client'

import { useState } from 'react'
import { PexelsImage } from '@/components/pexels-image'
import { btn, cx, Radio } from '@/components/ui'
import { BookingFooter } from './chrome'

export type PickerStylist = { slug: string; name: string; spec: string; next: string | null; photo?: { src: string; avgColor: string } | null }

export function StylistPicker({
  serviceSlug,
  serviceSummary,
  stylists,
  anyNext,
  note,
  initial = 'any',
}: {
  serviceSlug: string
  serviceSummary: string
  stylists: PickerStylist[]
  anyNext: string | null
  note?: string
  initial?: string
}) {
  const [sel, setSel] = useState(initial)
  const chosen = sel === 'any' ? 'Any available' : (stylists.find((s) => s.slug === sel)?.name ?? 'Any available')
  const row = (on: boolean) =>
    cx(
      'flex items-center gap-4 rounded-[2px] border p-5 transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive',
      on ? 'border-olive bg-olive-mist' : 'border-line hover:bg-parchment',
    )
  return (
    <form action="/book/time" method="get" className="flex flex-1 flex-col">
      <input type="hidden" name="service" value={serviceSlug} />
      <fieldset className="flex flex-1 flex-col gap-3 px-5 pt-6 pb-8 md:mx-auto md:w-full md:max-w-[640px] md:px-0">
        <legend className="sr-only">Choose a stylist</legend>
        <label className={row(sel === 'any')}>
          <input type="radio" name="stylist" value="any" checked={sel === 'any'} onChange={() => setSel('any')} className="sr-only" />
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full border border-olive font-serif text-[22px] text-olive">
            ∗
          </span>
          <span className="flex flex-1 flex-col gap-[3px]">
            <span className="font-serif text-[22px]">Any available</span>
            <span className="text-[13px] text-olive">Most open times. We match you with the first free stylist.</span>
            {anyNext && <span className="text-xs text-ink-soft">Next open · {anyNext}</span>}
          </span>
          <Radio checked={sel === 'any'} />
        </label>
        {stylists.map((p) => (
          <label key={p.slug} className={row(sel === p.slug)}>
            <input type="radio" name="stylist" value={p.slug} checked={sel === p.slug} onChange={() => setSel(p.slug)} className="sr-only" />
            {p.photo ? (
              <PexelsImage src={p.photo.src} alt="" sizes="56px" avgColor={p.photo.avgColor} className="size-14 shrink-0 rounded-full" />
            ) : (
              <span aria-hidden className="stripes size-14 shrink-0 rounded-full" />
            )}
            <span className="flex flex-1 flex-col gap-[3px]">
              <span className="font-serif text-[22px]">{p.name}</span>
              <span className="text-[13px] text-ink-soft">{p.spec}</span>
              <span className="text-xs text-ink-soft">{p.next ? `Next open · ${p.next}` : 'No open times in the next three weeks'}</span>
            </span>
            <Radio checked={sel === p.slug} />
          </label>
        ))}
        {note && <p className="pt-2 text-[13px] leading-[1.6] text-ink-soft">{note}</p>}
      </fieldset>
      <BookingFooter title={chosen} sub={serviceSummary}>
        <button type="submit" className={cx(btn.primary, 'lg:h-14 lg:px-9')}>
          Continue
        </button>
      </BookingFooter>
    </form>
  )
}
