'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { beginCheckout, type CheckoutFormState } from '@/app/book/actions'
import { cx, PolicyLines, Spinner, Split } from '@/components/ui'

export type HoldView = {
  id: string
  whenShort: string // "Wed 7 Oct · 10:00"
  whenRange: string // "Wed 7 Oct · 10:00 – 16:00"
  service: string // "Knotless braids · 6h"
  stylist: string
  stylistNote?: string // "(first available)"
  location: string
  now: string // "₦42,500"
  onDay: string
  total: string
  payLabel: string // "Pay ₦42,500 deposit"
  policy: string[]
  secondsLeft: number
  name: string
  phone: string
  phonePrefix: string
  phoneExample: string
}

function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial)
  useEffect(() => {
    const end = Date.now() + initial * 1000
    const t = setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 250)
    return () => clearInterval(t)
  }, [initial])
  return left
}

/** At zero, ask the server until it confirms the hold has ended (clocks can differ by a moment). */
function useExpiryRefresh(left: number, router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    if (left !== 0) return
    router.refresh()
    const t = setInterval(() => router.refresh(), 1500)
    return () => clearInterval(t)
  }, [left, router])
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function HoldTimer({ left, when, className }: { left: number; when: string; className?: string }) {
  const low = left <= 60
  return (
    <div
      className={cx(
        'flex h-9 items-center justify-between rounded-[2px] border border-dashed px-3.5 text-[13px] lg:h-10 lg:px-4 lg:text-sm',
        low ? 'border-rust text-rust' : 'border-olive text-olive',
        className,
      )}
    >
      <span>
        Slot held for{' '}
        <span className="font-medium tabular" role="timer" aria-live={left % 60 === 0 || left <= 10 ? 'polite' : 'off'}>
          {mmss(left)}
        </span>
      </span>
      <span className="text-xs lg:text-[13px]">{when}</span>
    </div>
  )
}

/** A ticking timer that hands back to the server when it reaches zero. */
export function LiveHoldTimer({ seconds, when, className }: { seconds: number; when: string; className?: string }) {
  const router = useRouter()
  const left = useCountdown(seconds)
  useExpiryRefresh(left, router)
  return <HoldTimer left={left} when={when} className={className} />
}

export function HoldScreen({ v }: { v: HoldView }) {
  const router = useRouter()
  const left = useCountdown(v.secondsLeft)
  const [state, action, pending] = useActionState<CheckoutFormState, FormData>(beginCheckout.bind(null, v.id), {})
  const values = state.values ?? { name: v.name, phone: v.phone }

  // When the clock runs out, let the server release the slot and show the expired state.
  useExpiryRefresh(left, router)

  const field = (name: 'name' | 'phone') =>
    cx(
      'h-[46px] w-full border-0 bg-transparent text-base outline-none lg:h-[50px] lg:text-[17px]',
      'border-b focus:border-b-2 focus:border-ink',
      state.errors?.[name] ? 'border-b-2 border-rust' : 'border-stone',
    )

  const form = (p: string) => (
    <form action={action} className="flex flex-col gap-[18px] lg:gap-9" noValidate>
      <div className="grid gap-[18px] lg:max-w-[640px] lg:grid-cols-2 lg:gap-8">
        <div className="group flex flex-col gap-1.5">
          <label htmlFor={`${p}-name`} className={cx('text-[13px] group-focus-within:text-ink', state.errors?.name ? 'text-rust' : 'text-ink-soft')}>
            Your name
          </label>
          <input
            id={`${p}-name`}
            name="name"
            autoComplete="name"
            defaultValue={values.name}
            className={field('name')}
            aria-invalid={!!state.errors?.name}
            aria-describedby={state.errors?.name ? `${p}-name-err` : undefined}
            required
          />
          {state.errors?.name && (
            <p id={`${p}-name-err`} className="text-xs text-rust">
              {state.errors.name}
            </p>
          )}
        </div>
        <div className="group flex flex-col gap-1.5">
          <label htmlFor={`${p}-phone`} className={cx('text-[13px] group-focus-within:text-ink', state.errors?.phone ? 'text-rust' : 'text-ink-soft')}>
            WhatsApp number
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-base text-ink-soft lg:text-[17px]">
              {v.phonePrefix}
            </span>
            <input
              id={`${p}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={v.phoneExample}
              defaultValue={values.phone}
              className={cx(field('phone'), 'pl-[52px] lg:pl-14')}
              aria-invalid={!!state.errors?.phone}
              aria-describedby={`${p}-phone-help`}
              required
            />
          </div>
          <p id={`${p}-phone-help`} className={cx('text-xs', state.errors?.phone ? 'text-rust' : 'text-ink-soft')}>
            {state.errors?.phone ?? 'Your receipt and reminder go here.'}
          </p>
        </div>
      </div>
      {state.errors?.form && (
        <p role="alert" className="text-sm text-rust">
          {state.errors.form}
        </p>
      )}
      <PayButton label={v.payLabel} pending={pending} />
    </form>
  )

  return (
    <>
      {/* ── Mobile ─────────────────────────────── */}
      <div className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-[560px] lg:hidden">
        <HoldTimer left={left} when={v.whenShort} className="mx-5 mt-4 md:mx-0" />
        <div className="flex flex-col gap-4 px-5 pt-9 pb-7 md:px-0">
          <Split now={v.now} onDay={v.onDay} />
          <div className="text-[13px] text-ink-soft">Total {v.total} · deposit comes off your total</div>
        </div>
        <dl className="mx-5 md:mx-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-y border-line py-4 text-sm">
          <dt className="text-ink-soft">Service</dt>
          <dd>{v.service}</dd>
          <dt className="text-ink-soft">Stylist</dt>
          <dd>
            {v.stylist} {v.stylistNote && <span className="text-ink-soft">{v.stylistNote}</span>}
          </dd>
          <dt className="text-ink-soft">When</dt>
          <dd>{v.whenRange}</dd>
        </dl>
        <div className="px-5 pt-5 md:px-0">
          <PolicyLines lines={v.policy} />
          <Link href="/policy" className="mt-2 inline-block text-xs text-ink-soft underline underline-offset-2">
            Full policy
          </Link>
        </div>
        <div className="mt-auto px-5 pt-6 pb-7 md:mt-4 md:px-0">{form('m')}</div>
      </div>

      {/* ── Desktop ────────────────────────────── */}
      <div className="hidden flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="flex flex-col gap-9 py-16 pr-24 pl-16">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-[52px] leading-[1.05]">Hold your chair.</h1>
            <p className="text-base font-light text-ink-body">Your deposit holds your chair. The rest is paid on the day.</p>
          </div>
          <div className="flex max-w-[640px] flex-col gap-2.5 border-t border-line pt-6">
            <div className="eyebrow">If plans change</div>
            <div className="grid grid-cols-3 gap-6 text-sm leading-[1.55]">
              {v.policy.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
            <Link href="/policy" className="self-start text-xs text-ink-soft underline underline-offset-2">
              Full policy
            </Link>
          </div>
          <div className="mt-auto">{form('d')}</div>
        </div>
        <aside className="flex flex-col gap-8 bg-parchment px-14 py-16">
          <HoldTimer left={left} when={v.whenShort} />
          <div className="flex flex-col gap-[18px] pt-4">
            <Split size="lg" now={v.now} onDay={v.onDay} />
            <div className="border-t border-line-strong pt-3.5 text-sm text-ink-soft">Total {v.total} · deposit comes off your total</div>
          </div>
          <dl className="mt-auto grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
            <dt className="text-ink-soft">Service</dt>
            <dd>{v.service}</dd>
            <dt className="text-ink-soft">Stylist</dt>
            <dd>
              {v.stylist} {v.stylistNote}
            </dd>
            <dt className="text-ink-soft">When</dt>
            <dd>{v.whenRange}</dd>
            <dt className="text-ink-soft">Where</dt>
            <dd>{v.location}</dd>
          </dl>
        </aside>
      </div>
    </>
  )
}

function PayButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-6">
      <button
        type="submit"
        disabled={pending}
        className={cx(
          'inline-flex h-14 items-center justify-center gap-3 rounded-[2px] text-base font-medium text-linen transition-colors duration-300 lg:h-[60px] lg:px-10',
          pending ? 'bg-olive' : 'bg-ink hover:bg-olive',
        )}
      >
        {pending && <Spinner />}
        {pending ? 'Opening checkout…' : label}
      </button>
      <p className="text-center text-xs text-ink-soft lg:text-[13px]">Card, bank transfer or USSD on the next step.</p>
    </div>
  )
}
