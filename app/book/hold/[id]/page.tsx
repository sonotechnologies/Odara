import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { holdAgain } from '@/app/book/actions'
import { BookingTop } from '@/components/booking/chrome'
import { HoldScreen, LiveHoldTimer } from '@/components/booking/hold-screen'
import { btn, cx } from '@/components/ui'
import { salon } from '@/config/salon'
import { getSlotsForRange } from '@/lib/data/availability'
import { getClient, getHold } from '@/lib/data/bookings'
import { applyCredit } from '@/lib/deposit'
import { formatMoney } from '@/lib/money'
import { formatPhone } from '@/lib/phone'
import { holdPolicyLines } from '@/lib/policy'
import { getClientSession } from '@/lib/session'
import { dateKeyOf, fmtDay, fmtDayTime, fmtDuration, fmtTime } from '@/lib/time'

export const metadata: Metadata = { title: 'Hold your chair' }

type Params = Promise<{ id: string }>
type SP = Promise<{ failed?: string; card?: string }>

export default async function HoldPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { id } = await params
  const sp = await searchParams
  const now = new Date()
  const hold = await getHold(id, now)
  if (!hold) notFound()
  if (hold.status === 'confirmed') redirect(`/book/confirmed/${hold.ref}`)
  if (hold.status !== 'hold' && hold.status !== 'expired') notFound()

  const back = { href: `/book/time?service=${hold.service.slug}&stylist=${hold.stylist.slug}&date=${dateKeyOf(hold.startsAt)}`, label: 'Back' }
  const whenShort = fmtDayTime(hold.startsAt)

  // ── 13a · Hold expired ───────────────────────────────────
  if (hold.status === 'expired') {
    const day = await getSlotsForRange({ stylistIds: [hold.stylistId], durationMin: hold.service.durationMin, fromKey: dateKeyOf(hold.startsAt), days: 1, now })
    const stillOpen = day[0]?.slots.some((s) => s.startsAt.getTime() === hold.startsAt.getTime() && s.available)
    return (
      <>
        <BookingTop step={4} back={back} />
        <div className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-[640px]">
          <div className="mx-5 mt-4 flex h-9 items-center rounded-[2px] bg-parchment px-3.5 text-[13px] text-ink-soft tabular md:mx-0">Slot held for 0:00</div>
          <div className="flex animate-fade-up flex-col gap-3.5 px-5 pt-14 md:px-0">
            <h1 className="font-serif text-[38px] leading-[1.1] lg:text-5xl">Your hold has ended.</h1>
            <p className="text-[15px] font-light leading-[1.65] text-ink-body">
              We kept {fmtDay(hold.startsAt)} at {fmtTime(hold.startsAt)} for you for {salon.booking.holdMinutes} minutes. Nothing was charged.
            </p>
          </div>
          <div className="mx-5 mt-8 flex items-center justify-between border-y border-line py-[18px] md:mx-0">
            <div className="flex flex-col gap-[3px]">
              <div className="text-[15px]">{whenShort}</div>
              <div className={cx('text-[13px]', stillOpen ? 'text-olive' : 'text-rust')}>{stillOpen ? 'Still open' : 'Taken since'}</div>
            </div>
            <div className="text-[13px] text-ink-soft">{hold.service.name}</div>
          </div>
          <div className="mt-auto flex flex-col gap-2.5 px-5 pt-4 pb-7 lg:mt-10 md:px-0">
            {stillOpen && (
              <form action={holdAgain}>
                <input type="hidden" name="id" value={hold.id} />
                <button className={cx(btn.primary, 'w-full')}>Hold it again</button>
              </form>
            )}
            <Link href={`${back.href}&notice=expired`} className={stillOpen ? btn.secondary : btn.primary}>
              Choose another time
            </Link>
          </div>
        </div>
      </>
    )
  }

  const secondsLeft = Math.max(0, Math.ceil((hold.holdExpiresAt!.getTime() - now.getTime()) / 1000))
  const client = hold.client ?? (await getClientSession().then((s) => (s ? getClient(s.clientId) : null)))
  const { dueNowKobo, creditUsedKobo } = applyCredit(hold.depositKobo, client?.creditKobo ?? 0)
  const nowAmount = formatMoney(hold.depositKobo)

  // ── 13b · Payment failed ─────────────────────────────────
  if (sp.failed) {
    const retry = `/book/checkout/${hold.id}`
    return (
      <>
        <BookingTop step={4} back={back} />
        <div className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-[640px]">
          <FailedTimer seconds={secondsLeft} when={whenShort} />
          <div className="flex animate-fade-up flex-col gap-3.5 px-5 pt-14 md:px-0">
            <div className="text-xs uppercase tracking-[0.1em] text-rust">Payment didn’t go through</div>
            <h1 className="font-serif text-[38px] leading-[1.1] lg:text-5xl">Nothing was taken.</h1>
            <p className="text-[15px] font-light leading-[1.65] text-ink-body">
              {sp.failed === 'card' ? 'Your bank declined' : 'We didn’t receive'} the {formatMoney(dueNowKobo)} charge. Your slot is still held, so there’s time to try
              again.
            </p>
          </div>
          <div className="mx-5 mt-7 rounded-[2px] bg-rust-mist px-4 py-3.5 text-[13px] leading-[1.5] text-rust md:mx-0">
            {sp.failed === 'card' ? `Card${sp.card ? ` ending ${sp.card}` : ''} · declined by issuer` : sp.failed === 'ussd' ? 'USSD payment not completed' : 'Transfer not received'}
          </div>
          <div className="mt-auto flex flex-col gap-2.5 px-5 pt-4 pb-7 lg:mt-10 md:px-0">
            <Link href={retry} className={btn.primaryLg}>
              Try again · {formatMoney(dueNowKobo)}
            </Link>
            <Link href={`${retry}?tab=${sp.failed === 'card' ? 'bank_transfer' : 'card'}`} className={btn.secondary}>
              {sp.failed === 'card' ? 'Pay by bank transfer or USSD' : 'Pay by card instead'}
            </Link>
          </div>
        </div>
      </>
    )
  }

  // ── 08 · Hold with deposit ───────────────────────────────
  const natl = client ? formatPhone(client.phone).replace(`+${salon.phone.countryCode} `, '') : ''
  return (
    <>
      <BookingTop step={4} back={back} />
      <HoldScreen
        v={{
          id: hold.id,
          whenShort,
          whenRange: `${fmtDay(hold.startsAt)} · ${fmtTime(hold.startsAt)} – ${fmtTime(hold.endsAt)}`,
          service: `${hold.service.name} · ${fmtDuration(hold.service.durationMin)}`,
          stylist: hold.stylist.name,
          location: salon.address.line,
          now: nowAmount,
          onDay: formatMoney(hold.balanceKobo),
          total: formatMoney(hold.priceKobo),
          payLabel:
            dueNowKobo === 0
              ? 'Confirm with credit'
              : creditUsedKobo > 0
                ? `Pay ${formatMoney(dueNowKobo)} deposit · ${formatMoney(creditUsedKobo)} credit applied`
                : `Pay ${nowAmount} deposit`,
          policy: holdPolicyLines(hold.startsAt, now),
          secondsLeft,
          name: client?.name ?? '',
          phone: natl,
          phonePrefix: salon.phone.prefix,
          phoneExample: salon.phone.example,
        }}
      />
    </>
  )
}

function FailedTimer({ seconds, when }: { seconds: number; when: string }) {
  return <LiveHoldTimer seconds={seconds} when={when} className="mx-5 mt-4 md:mx-0" />
}
