'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { fastPay } from '@/app/book/actions'
import { cx, Spinner, Split } from '@/components/ui'

export type FastSlot = { iso: string; day: string; time: string }
export type FastOption = { value: string; label: string }

/**
 * One screen: last service and stylist pre-selected, next three open times,
 * the split, one button. Service and stylist can change inline.
 */
export function FastPath(props: {
  serviceId: string
  serviceSlug: string
  stylistValue: string // stylist id or 'any'
  stylistSlug: string // slug or 'any'
  heading: string // "Silk press with Tolu"
  meta: string // "2h · ₦35,000 · last visit 14 Aug"
  slotsHeading: string
  slots: FastSlot[]
  services: FastOption[]
  stylists: FastOption[]
  now: string
  onDay: string
  depositLine: string
  creditLine?: string
  total: string
  payLabel: string
  footnote: string
  moreHref: string
}) {
  const router = useRouter()
  const [changing, setChanging] = useState(false)
  const [sel, setSel] = useState(0)

  const go = (service: string, stylist: string) => router.push(`/book/again?service=${service}&stylist=${stylist}`)

  return (
    <>
      <div className="mx-5 flex items-center justify-between border-y border-line py-[18px] lg:mx-0">
        <div className="flex flex-col gap-[3px]">
          <div className="font-serif text-[22px]">{props.heading}</div>
          <div className="text-[13px] text-ink-soft">{props.meta}</div>
        </div>
        <button type="button" onClick={() => setChanging((c) => !c)} aria-expanded={changing} className="border-b border-ink text-[13px]">
          {changing ? 'Done' : 'Change'}
        </button>
      </div>

      {changing && (
        <div className="mx-5 grid animate-fade-up grid-cols-2 gap-4 border-b border-line py-4 lg:mx-0">
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
            Service
            <select
              value={props.serviceSlug}
              onChange={(e) => go(e.target.value, props.stylistSlug)}
              className="h-11 border-0 border-b border-stone bg-transparent text-[15px] text-ink outline-none focus:border-ink"
            >
              {props.services.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
            Stylist
            <select
              value={props.stylistSlug}
              onChange={(e) => go(props.serviceSlug, e.target.value)}
              className="h-11 border-0 border-b border-stone bg-transparent text-[15px] text-ink outline-none focus:border-ink"
            >
              {props.stylists.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <form action={fastPay} className="flex flex-1 flex-col">
        <input type="hidden" name="serviceId" value={props.serviceId} />
        <input type="hidden" name="stylist" value={props.stylistValue} />
        <fieldset className="flex flex-col gap-3 px-5 pt-6 lg:px-0">
          <legend className="eyebrow mb-3">{props.slotsHeading}</legend>
          {props.slots.length ? (
            <div className="flex flex-col gap-2">
              {props.slots.map((q, i) => (
                <label
                  key={q.iso}
                  className={cx(
                    'flex h-[52px] items-center justify-between rounded-[2px] border px-4 text-[15px] transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-olive',
                    sel === i ? 'border-olive bg-olive text-linen' : 'border-stone hover:bg-parchment',
                  )}
                >
                  <input type="radio" name="startsAt" value={q.iso} checked={sel === i} onChange={() => setSel(i)} className="sr-only" />
                  <span>{q.day}</span>
                  <span className="font-medium">{q.time}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No open times in the next three weeks. Try another stylist.</p>
          )}
          <a href={props.moreHref} className="self-start text-[13px] text-ink-soft underline underline-offset-2">
            Other times
          </a>
        </fieldset>

        <div className="flex flex-col gap-2.5 px-5 pt-7 lg:px-0">
          <Split size="sm" now={props.now} onDay={props.onDay} />
          <div className="flex justify-between text-[13px] text-ink-soft">
            <span>{props.depositLine}</span>
            {props.creditLine && <span className="text-olive">{props.creditLine}</span>}
          </div>
          <div className="text-[13px] text-ink-soft">Total {props.total}</div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 px-5 pt-6 pb-7 lg:mt-10 lg:px-0">
          <PayButton label={props.payLabel} disabled={!props.slots.length} />
          <p className="text-center text-xs text-ink-soft">{props.footnote}</p>
        </div>
      </form>
    </>
  )
}

function PayButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cx(
        'inline-flex h-14 items-center justify-center gap-3 rounded-[2px] text-base font-medium transition-colors duration-300',
        disabled ? 'bg-line text-ink-faint' : pending ? 'bg-olive text-linen' : 'bg-ink text-linen hover:bg-olive',
      )}
    >
      {pending && <Spinner />}
      {pending ? 'Holding your chair…' : label}
    </button>
  )
}
