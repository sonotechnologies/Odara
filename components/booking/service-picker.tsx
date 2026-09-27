'use client'

import { useState } from 'react'
import { btn, cx, Radio } from '@/components/ui'
import { BookingFooter } from './chrome'

export type PickerService = { slug: string; name: string; meta: string; summary: string }

/**
 * A plain GET form with radio buttons: works without JavaScript, and the
 * footer summary updates as you choose when it's there.
 */
export function ServicePicker({
  categories,
  action,
  hidden,
  initial,
}: {
  categories: { name: string; items: PickerService[] }[]
  action: string
  hidden: Record<string, string>
  initial?: string
}) {
  const all = categories.flatMap((c) => c.items)
  const [sel, setSel] = useState(initial ?? all[0]?.slug)
  const chosen = all.find((s) => s.slug === sel)
  return (
    <form action={action} method="get" className="flex flex-1 flex-col">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <fieldset className="flex-1 px-5 pb-8 lg:mx-auto lg:w-full lg:max-w-[640px] lg:px-0">
        <legend className="sr-only">Choose a service</legend>
        {categories.map((cat) => (
          <div key={cat.name} role="group" aria-label={cat.name}>
            <div className="eyebrow pt-6 pb-2">{cat.name}</div>
            {cat.items.map((s) => {
              const on = s.slug === sel
              return (
                <label
                  key={s.slug}
                  className={cx(
                    '-mx-3 flex items-center gap-3.5 border-t border-line px-3 py-3.5 transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive',
                    on ? 'bg-olive-mist shadow-[inset_3px_0_0_var(--color-olive)]' : 'hover:bg-parchment',
                  )}
                >
                  <input type="radio" name="service" value={s.slug} checked={on} onChange={() => setSel(s.slug)} className="sr-only" />
                  <span className="flex flex-1 flex-col gap-[3px]">
                    <span className="font-serif text-xl">{s.name}</span>
                    <span className="text-xs text-ink-soft">{s.meta}</span>
                  </span>
                  <Radio checked={on} />
                </label>
              )
            })}
          </div>
        ))}
      </fieldset>
      <BookingFooter title={chosen?.name ?? 'Choose a service'} sub={chosen?.summary}>
        <button type="submit" className={cx(btn.primary, 'lg:h-14 lg:px-9')} disabled={!chosen}>
          Continue
        </button>
      </BookingFooter>
    </form>
  )
}
