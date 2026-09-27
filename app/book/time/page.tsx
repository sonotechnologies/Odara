import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BookingTop } from '@/components/booking/chrome'
import { SlotPicker } from '@/components/booking/slot-picker'
import { salon } from '@/config/salon'
import { getSlotsForRange, horizonDays } from '@/lib/data/availability'
import { getServiceBySlug, getStylistBySlug, stylistsForService } from '@/lib/data/catalog'
import { formatMoney } from '@/lib/money'
import { toPickerDays } from '@/lib/picker'
import { fmtDuration, isDateKey, todayKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Choose a time' }

const NOTICES: Record<string, string> = {
  expired: 'Your hold ended before payment, so the time went back on the calendar. Nothing was charged.',
  lost: 'Your payment went through just after the hold ended, and someone else had taken the time. The deposit is being refunded in full. Please pick another time.',
  gone: 'That time has been taken since your hold ended. Here’s what’s still open.',
}

type SP = Promise<{ service?: string; stylist?: string; date?: string; notice?: string }>

export default async function ChooseTime({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const service = await getServiceBySlug(sp.service)
  if (!service) redirect('/book')
  const qualified = await stylistsForService(service.id)
  const named = sp.stylist && sp.stylist !== 'any' ? await getStylistBySlug(sp.stylist) : null
  if (named && !qualified.some((q) => q.id === named.id)) redirect(`/book/stylist?service=${service.slug}`)
  const ids = named ? [named.id] : qualified.map((q) => q.id)

  const days = toPickerDays(
    await getSlotsForRange({ stylistIds: ids, durationMin: service.durationMin, fromKey: todayKey(), days: horizonDays }),
  )
  const dur = fmtDuration(service.durationMin)

  const aside = (
    <div key="aside" className="hidden flex-col gap-7 lg:flex">
      <h1 className="font-serif text-[56px] leading-[1.05]">When suits you?</h1>
      <dl className="flex flex-col border-t border-line">
        {[
          ['Service', `${service.name} · ${dur}`],
          ['Stylist', named?.name ?? 'Any available'],
          ['Price', `${formatMoney(service.priceKobo)} · ${formatMoney(service.depositKobo)} to hold`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-4 text-sm">
            <dt className="text-ink-soft">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-[1.7] text-ink-soft">
        Times show your start. Taken times stay visible so you can see how the week is filling. Once you hold a time, it’s yours for{' '}
        {salon.booking.holdMinutes} minutes while you pay the deposit.
      </p>
    </div>
  )

  return (
    <>
      <BookingTop step={3} back={{ href: `/book/stylist?service=${service.slug}${named ? `&stylist=${named.slug}` : ''}`, label: 'Back' }} />
      <div className="flex flex-col gap-2 px-5 pt-8 pb-1 lg:hidden">
        <h1 className="font-serif text-[34px] leading-[1.15]">When suits you?</h1>
      </div>
      <SlotPicker
        days={days}
        initialDay={isDateKey(sp.date) ? sp.date : undefined}
        serviceId={service.id}
        stylist={named?.id ?? 'any'}
        serviceLabel={`${service.name} · ${dur}`}
        durationLabel={dur}
        notice={sp.notice ? NOTICES[sp.notice] : undefined}
        desktopAside={aside}
        holdMinutes={salon.booking.holdMinutes}
      />
    </>
  )
}
