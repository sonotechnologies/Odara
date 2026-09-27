import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cancelAndRebook, rescheduleBooking } from '../../actions'
import { BookingTop } from '@/components/booking/chrome'
import { SlotPicker } from '@/components/booking/slot-picker'
import { btn } from '@/components/ui'
import { salon } from '@/config/salon'
import { getSlotsForRange, horizonDays } from '@/lib/data/availability'
import { getBookingByRef } from '@/lib/data/bookings'
import { formatMoney } from '@/lib/money'
import { toPickerDays } from '@/lib/picker'
import { clientRescheduleOutcome } from '@/lib/policy'
import { dateKeyOf, fmtDayTimeComma, fmtDuration, todayKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Reschedule' }

export default async function Reschedule({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const b = await getBookingByRef(ref)
  if (!b) notFound()
  const outcome = clientRescheduleOutcome(b, new Date())
  if (!outcome.allowed) redirect(`/booking/${b.ref}`)
  const back = { href: `/booking/${b.ref}`, label: 'Back' }

  if (outcome.kind === 'forfeit') {
    return (
      <div className="flex min-h-dvh flex-col">
        <BookingTop back={back} />
        <div className="flex flex-1 flex-col px-5 pt-12 lg:mx-auto lg:w-full lg:max-w-[560px] lg:px-0">
          <div className="text-xs uppercase tracking-[0.1em] text-rust">Within {salon.policy.freeChangeHours} hours</div>
          <h1 className="mt-3 font-serif text-[38px] leading-[1.1]">Moving now starts a new booking.</h1>
          <p className="mt-4 text-[15px] font-light leading-[1.65] text-ink-body">
            {b.stylist.name} has kept {fmtDayTimeComma(b.startsAt)} for you and turned others away, so the {formatMoney(b.depositKobo)} deposit is kept. You’ll
            pay a new deposit to hold a new time.
          </p>
          <div className="mt-auto flex flex-col gap-2.5 pt-10 pb-7">
            <form action={cancelAndRebook.bind(null, b.ref)}>
              <button className={`${btn.danger} w-full`}>Cancel this one and choose a new time</button>
            </form>
            <Link href={back.href} className={btn.quiet}>
              Keep my booking
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const days = toPickerDays(
    await getSlotsForRange({ stylistIds: [b.stylistId], durationMin: b.service.durationMin, fromKey: todayKey(), days: horizonDays, excludeBookingId: b.id }),
  )
  const dur = fmtDuration(b.service.durationMin)
  const aside = (
    <div key="aside" className="hidden flex-col gap-7 lg:flex">
      <h1 className="font-serif text-[56px] leading-[1.05]">Pick a new time.</h1>
      <dl className="flex flex-col border-t border-line">
        {[
          ['Now', fmtDayTimeComma(b.startsAt)],
          ['Service', `${b.service.name} · ${dur}`],
          ['Stylist', b.stylist.name],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-4 text-sm">
            <dt className="text-ink-soft">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-[1.7] text-ink-soft">Free, because you’re more than {salon.policy.freeChangeHours} hours out. Your deposit moves with you.</p>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <BookingTop back={back} />
      <div className="flex flex-col gap-2 px-5 pt-8 pb-1 lg:hidden">
        <h1 className="font-serif text-[34px] leading-[1.15]">Pick a new time.</h1>
        <p className="text-sm text-ink-soft">
          Now {fmtDayTimeComma(b.startsAt)} with {b.stylist.name}. Free to move, the deposit comes with you.
        </p>
      </div>
      <SlotPicker
        days={days}
        initialDay={dateKeyOf(b.startsAt)}
        serviceId={b.serviceId}
        stylist={b.stylistId}
        serviceLabel={`${b.service.name} with ${b.stylist.name}`}
        durationLabel={dur}
        onConfirm={rescheduleBooking.bind(null, b.ref)}
        confirmText="Move to this time"
        desktopAside={aside}
      />
    </div>
  )
}
