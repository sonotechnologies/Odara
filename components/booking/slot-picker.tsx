'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from 'react'
import { holdSlot } from '@/app/book/actions'
import { btn, cx } from '@/components/ui'
import { BookingFooter, Notice } from './chrome'

export type PickerDay = {
  key: string
  dow: string
  d: number
  label: string // "Wed 7 Oct"
  month: string
  closed: boolean
  full: boolean
  closedNote?: string
  closedSub?: string
  slots: { time: string; iso: string; available: boolean }[]
}

type Props = {
  days: PickerDay[]
  initialDay?: string
  serviceId: string
  stylist: string // 'any' | stylist id
  serviceLabel: string // "Knotless braids · 6h"
  durationLabel: string // "6h"
  /** Reschedule mode: call this instead of placing a hold. */
  onConfirm?: (iso: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  confirmText?: string
  notice?: string
  desktopAside?: React.ReactNode
  holdMinutes?: number
}

export function SlotPicker({ days, initialDay, serviceId, stylist, serviceLabel, durationLabel, onConfirm, confirmText, notice, desktopAside, holdMinutes = 10 }: Props) {
  const router = useRouter()
  const firstOpen = days.find((d) => !d.closed && d.slots.some((s) => s.available))?.key ?? days[0]?.key
  const [dayKey, setDayKey] = useState(initialDay && days.some((d) => d.key === initialDay) ? initialDay : firstOpen)
  const [time, setTime] = useState<string | null>(null)
  const [held, setHeld] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const stripRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const day = days.find((d) => d.key === dayKey) ?? days[0]
  const slot = day?.slots.find((s) => s.time === time && s.available)
  const valid = !!slot && !day.closed

  // Keep the chosen day in view in the scrolling strip.
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [dayKey])

  // If a refresh shows our selected time was taken, drop it.
  useEffect(() => {
    if (time && !day?.slots.some((s) => s.time === time && s.available)) setTime(null)
  }, [day, time])

  const groups = useMemo(() => {
    if (!day) return []
    const am = day.slots.filter((s) => s.time < '12:00')
    const pm = day.slots.filter((s) => s.time >= '12:00')
    return [am.length ? { label: 'Morning', slots: am } : null, pm.length ? { label: 'Afternoon', slots: pm } : null].filter(Boolean) as {
      label: string
      slots: PickerDay['slots']
    }[]
  }, [day])

  const alternatives = useMemo(() => {
    const i = days.findIndex((d) => d.key === dayKey)
    return days
      .slice(i + 1)
      .filter((d) => !d.closed && !d.full && d.slots.some((s) => s.available))
      .slice(0, 2)
      .map((d) => `${d.dow} ${d.d}`)
  }, [days, dayKey])

  function pickDay(k: string) {
    setDayKey(k)
    setHeld(false)
    setError(null)
    if (k !== dayKey) setTime(null)
  }

  function confirm() {
    if (!slot) return
    setError(null)
    start(async () => {
      if (onConfirm) {
        const r = await onConfirm(slot.iso)
        if (!r.ok) {
          setError(r.reason === 'taken' ? `Someone has just taken ${slot.time}. Here’s what’s still open.` : 'That didn’t work. Please try again.')
          router.refresh()
        }
        return
      }
      const r = await holdSlot({ serviceId, stylist, startsAt: slot.iso })
      if (!r.ok) {
        setError(
          r.reason === 'taken'
            ? `Someone has just taken ${slot.time}. Here’s what’s still open.`
            : 'That time isn’t available any more. Please pick another.',
        )
        setTime(null)
        router.refresh()
        return
      }
      // Let the held state land before moving on: the satisfying beat.
      setHeld(true)
      setTimeout(() => router.push(`/book/hold/${r.id}`), 650)
    })
  }

  /** Arrow keys move between open times in the grid (3 columns). */
  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }
    if (!(e.key in keys)) return
    const buttons = Array.from(gridRef.current?.querySelectorAll<HTMLButtonElement>('button[data-slot]') ?? [])
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    e.preventDefault()
    let j = i + keys[e.key]
    while (j >= 0 && j < buttons.length && buttons[j].disabled) j += Math.sign(keys[e.key])
    buttons[j]?.focus()
  }

  const title = day?.closed
    ? 'Pick another day'
    : day?.full
      ? 'Fully booked'
      : valid
        ? `${day.label} · ${slot!.time}`
        : 'Pick a time'
  const sub = day?.full
    ? alternatives.length
      ? `Try ${alternatives.join(' or ')}`
      : serviceLabel
    : valid && held
      ? `Held for you · ${holdMinutes}:00 to pay`
      : serviceLabel

  const cta = onConfirm ? (confirmText ?? 'Move to this time') : held ? 'Held · Continue' : 'Hold this time'

  return (
    <>
      <div className="flex-1 lg:mx-auto lg:grid lg:w-full lg:max-w-[1440px] lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-24 lg:px-16 lg:pt-12">
        {desktopAside}
        <div className="flex flex-col lg:gap-8">
          <p className="px-5 text-sm text-ink-soft lg:hidden">
            {day?.month} · times show your start, {durationLabel} each
          </p>
          {notice && <Notice tone="rust">{notice}</Notice>}

          {/* Date strip */}
          <div
            ref={stripRef}
            role="group"
            aria-label="Choose a day"
            className="flex snap-x overflow-x-auto px-3 pt-5 [scrollbar-width:none] lg:px-0 lg:pt-0 [&::-webkit-scrollbar]:hidden"
          >
            {days.map((d) => {
              const on = d.key === dayKey
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${d.label}${d.closed ? ', closed' : d.full ? ', fully booked' : ''}`}
                  onClick={() => pickDay(d.key)}
                  className={cx(
                    'flex h-[78px] w-[calc((100vw-24px)/7)] min-w-12 shrink-0 snap-start flex-col items-center justify-center gap-[3px] transition-colors duration-200 lg:h-24 lg:w-[12.5%] lg:gap-1',
                    on ? 'border-b-2 border-ink text-ink' : 'border-b border-line',
                    !on && (d.closed ? 'text-closed' : 'text-ink-soft hover:text-ink'),
                  )}
                >
                  <span className="text-[11px] uppercase tracking-[0.1em] lg:text-xs lg:tracking-[0.12em]">{d.dow}</span>
                  <span className="font-serif text-2xl leading-[1.1] lg:text-[34px]">{d.d}</span>
                  <span className="h-3 text-[10px] lg:h-3.5 lg:text-[11px]">{d.closed ? 'Closed' : d.full ? 'Full' : ''}</span>
                </button>
              )
            })}
          </div>

          {error && <Notice tone="rust">{error}</Notice>}

          {/* Time grid */}
          <div className="flex flex-col gap-5 px-5 pt-6 pb-8 lg:px-0 lg:pt-0" aria-live="polite">
            {day?.closed ? (
              <div className="flex flex-col gap-2 border-t border-line py-8 lg:py-10">
                <div className="font-serif text-2xl lg:text-3xl">{day.closedNote ?? 'Closed.'}</div>
                <div className="text-sm text-ink-soft lg:text-[15px]">{day.closedSub ?? 'We rest, then open again the next day.'}</div>
              </div>
            ) : day && day.slots.length === 0 ? (
              <div className="flex flex-col gap-2 border-t border-line py-8">
                <div className="font-serif text-2xl">No more times today.</div>
                <div className="text-sm text-ink-soft">Try tomorrow or later in the week.</div>
              </div>
            ) : (
              <>
                <div ref={gridRef} onKeyDown={onGridKey} className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-12">
                  {groups.map((g) => (
                    <div key={g.label} role="group" aria-label={g.label} className="flex flex-col gap-2.5 lg:gap-3.5">
                      <div className="eyebrow">{g.label}</div>
                      <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
                        {g.slots.map((s) => {
                          const sel = s.time === time && s.available
                          const heldSel = sel && held
                          return (
                            <button
                              key={s.time}
                              type="button"
                              data-slot
                              disabled={!s.available}
                              aria-pressed={s.available ? sel : undefined}
                              aria-label={s.available ? s.time : `${s.time}, taken`}
                              onClick={() => {
                                setTime(s.time)
                                setHeld(false)
                                setError(null)
                              }}
                              className={cx(
                                'h-12 rounded-[2px] text-[15px] transition-colors duration-200 lg:h-14 lg:text-base',
                                !s.available && 'border border-taken-line text-taken line-through',
                                s.available && !sel && 'border border-stone hover:border-ink hover:bg-parchment',
                                sel && !heldSel && 'border border-olive bg-olive font-medium text-linen',
                                heldSel && 'animate-rise border border-dashed border-olive bg-olive-mist font-medium text-olive',
                              )}
                            >
                              {s.time}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-xs text-ink-soft">
                  <span aria-hidden className="line-through">
                    09:00
                  </span>
                  <span>Taken times stay visible.</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <BookingFooter title={title} sub={sub}>
        <button
          type="button"
          onClick={confirm}
          disabled={!valid || pending || held}
          className={cx(
            'inline-flex h-[52px] items-center gap-3 rounded-[2px] px-6 text-[15px] font-medium transition-colors duration-[400ms] lg:h-14 lg:px-9',
            !valid ? 'bg-line text-ink-faint' : held ? 'bg-olive text-linen' : 'bg-ink text-linen hover:bg-olive',
          )}
        >
          {pending && !held && <span aria-hidden className="size-3.5 animate-spin rounded-full border-[1.5px] border-ink-soft border-t-linen" />}
          {cta}
        </button>
      </BookingFooter>
    </>
  )
}
