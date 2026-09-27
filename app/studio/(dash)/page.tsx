import type { Metadata } from 'next'
import Link from 'next/link'
import { cx } from '@/components/ui'
import { salon } from '@/config/salon'
import { listStylists } from '@/lib/data/catalog'
import { todayOverview, type StudioBooking } from '@/lib/data/studio'
import { formatMoney } from '@/lib/money'
import { requireOwner } from '@/lib/studio-auth'
import { statusLabel } from '@/components/ui'
import { addDaysToKey, atSalonTime, fmtKey, fmtLongDay, fmtTime, isDateKey, todayKey, toMinutes, weekdayOfKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Today' }

const BLOCK: Partial<Record<StudioBooking['status'], string>> = {
  confirmed: 'bg-olive-mist text-olive-deep border-olive-line',
  arrived: 'bg-olive text-linen border-olive',
  completed: 'bg-parchment text-ink-soft border-line',
  no_show: 'bg-rust-mist text-rust border-rust-mist',
  cancelled_salon: 'bg-transparent text-rust border-line',
  cancelled_client: 'bg-transparent text-ink-soft border-line',
}
const struck = (s: StudioBooking['status']) => s === 'no_show' || s === 'cancelled_salon' || s === 'cancelled_client'

export default async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireOwner()
  const { date } = await searchParams
  const today = todayKey()
  const key = isDateKey(date) ? date : today
  const now = new Date()
  const [o, stylists] = await Promise.all([todayOverview(key, now), listStylists()])
  const hours = salon.hours[weekdayOfKey(key) as keyof typeof salon.hours]
  const openMin = hours ? toMinutes(hours.open) : 9 * 60
  const closeMin = hours ? toMinutes(hours.close) : 19 * 60
  const hourMarks = Array.from({ length: (closeMin - openMin) / 60 }, (_, i) => openMin / 60 + i)
  const nowMin = key === today ? (now.getTime() - atSalonTime(key, '00:00').getTime()) / 60_000 : -1
  const showNow = nowMin >= openMin && nowMin <= closeMin
  const pct = (min: number) => `${((min - openMin) / (closeMin - openMin)) * 100}%`
  const minsOf = (d: Date) => (d.getTime() - atSalonTime(key, '00:00').getTime()) / 60_000

  const stats = [
    { label: key === today ? 'Bookings today' : 'Bookings', value: String(o.count), sub: `${o.done} done · ${o.inChair} in the chair` },
    { label: 'Deposits collected', value: formatMoney(o.depositsToday), sub: `${formatMoney(o.depositsWeek)} over 7 days` },
    { label: key === today ? 'Balance due today' : 'Balance due', value: formatMoney(o.balanceDue), sub: `${formatMoney(o.balanceCollected)} collected in the studio` },
    {
      label: 'No-show rate · 30 days',
      value: `${(o.noShow.rate * 100).toFixed(1)}%`,
      sub: `${o.noShow.noShows} of ${o.noShow.total} bookings`,
    },
  ]
  const live = o.bookings.filter((b) => b.status !== 'cancelled_client')
  const heightMobile = ((closeMin - openMin) / 60) * 44
  const heightDesktop = ((closeMin - openMin) / 60) * 56

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8 lg:gap-6 lg:px-10 lg:pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-4">
          <h1 className="font-serif text-3xl leading-[1.1] lg:text-[44px]">
            <span className="lg:hidden">{fmtKey(key)}</span>
            <span className="hidden lg:inline">{fmtLongDay(atSalonTime(key, '12:00'))}</span>
          </h1>
          {key === today && <span className="text-[13px] text-ink-soft lg:text-sm">Now {fmtTime(now)}</span>}
        </div>
        <nav aria-label="Change day" className="flex gap-2 text-[13px]">
          <Link href={`/studio?date=${addDaysToKey(key, -1)}`} className="flex h-[38px] items-center rounded-[2px] border border-stone px-4 hover:bg-parchment">
            Previous
          </Link>
          {key !== today && (
            <Link href="/studio" className="flex h-[38px] items-center rounded-[2px] border border-stone px-4 hover:bg-parchment">
              Today
            </Link>
          )}
          <Link href={`/studio?date=${addDaysToKey(key, 1)}`} className="flex h-[38px] items-center rounded-[2px] border border-stone px-4 hover:bg-parchment">
            Next
          </Link>
        </nav>
      </div>

      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {stats.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-[2px] bg-parchment p-3 lg:gap-1.5 lg:px-5 lg:py-[18px]">
            <dt className="text-[11px] leading-[1.3] text-ink-soft lg:text-xs">{k.label}</dt>
            <dd className="font-serif text-[26px] leading-[1.1] lg:text-[38px] lg:leading-[1.05]">{k.value}</dd>
            <dd className="text-[11px] text-ink-soft lg:text-xs">{k.sub}</dd>
          </div>
        ))}
      </dl>

      {!hours ? (
        <p className="border-t border-line py-10 font-serif text-2xl">Closed. The studio rests on {fmtKey(key).split(' ')[0]}days.</p>
      ) : (
        <section aria-label="Day timeline" className="pt-2 pr-2 lg:pr-0">
          <div className="grid grid-cols-[32px_repeat(5,minmax(0,1fr))] gap-[3px] border-line pb-1.5 lg:grid-cols-[52px_repeat(5,minmax(0,1fr))] lg:gap-2 lg:border-b lg:pb-2.5">
            <div />
            {stylists.map((s) => (
              <div key={s.id} className="flex items-baseline justify-center text-[11px] font-medium lg:justify-between lg:text-sm">
                <span>{s.name}</span>
                <span className="hidden text-xs font-normal text-ink-soft lg:inline">{live.filter((b) => b.stylistId === s.id).length}</span>
              </div>
            ))}
          </div>
          <div
            className="relative grid grid-cols-[32px_repeat(5,minmax(0,1fr))] gap-[3px] [height:var(--h-m)] lg:grid-cols-[52px_repeat(5,minmax(0,1fr))] lg:gap-2 lg:[height:var(--h-d)]"
            style={{ ['--h-m' as string]: `${heightMobile}px`, ['--h-d' as string]: `${heightDesktop}px` }}
          >
            <div className="relative" aria-hidden>
              {hourMarks.map((h) => (
                <div key={h} className="absolute right-1 -translate-y-[5px] text-[9px] text-ink-soft lg:right-auto lg:left-0 lg:-translate-y-1.5 lg:text-[11px]" style={{ top: pct(h * 60) }}>
                  <span className="lg:hidden">{h}</span>
                  <span className="hidden lg:inline">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            {stylists.map((s) => (
              <ul
                key={s.id}
                aria-label={s.name}
                className="relative bg-[repeating-linear-gradient(180deg,var(--color-line)_0_1px,transparent_1px_44px)] lg:bg-[repeating-linear-gradient(180deg,var(--color-taken-line)_0_1px,transparent_1px_56px)]"
              >
                {live
                  .filter((b) => b.stylistId === s.id)
                  .map((b) => {
                    const top = Math.max(minsOf(b.startsAt), openMin)
                    const end = Math.min(minsOf(b.endsAt), closeMin)
                    return (
                      <li key={b.id} className="absolute inset-x-0" style={{ top: pct(top), height: `calc(${((end - top) / (closeMin - openMin)) * 100}% - 3px)` }}>
                        <Link
                          href={`/studio/bookings?date=${key}&open=${b.id}#b-${b.id}`}
                          className={cx(
                            'flex h-full flex-col gap-px overflow-hidden rounded-[2px] border px-1 py-[3px] transition-colors lg:gap-[3px] lg:px-2.5 lg:py-2',
                            BLOCK[b.status],
                          )}
                        >
                          <span className="flex justify-between gap-1.5 text-[10px] font-medium leading-[1.2] lg:text-[13px]">
                            <span className={cx('truncate', struck(b.status) && 'line-through')}>{b.clientName.split(' ')[0]}</span>
                            <span className="hidden text-[11px] font-normal whitespace-nowrap opacity-85 lg:inline">{statusLabel(b.status)}</span>
                          </span>
                          <span className="truncate text-[9px] leading-[1.2] opacity-80 lg:text-xs lg:opacity-85">
                            {b.serviceName}
                          </span>
                          <span className="hidden text-[11px] opacity-75 lg:block">
                            {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
              </ul>
            ))}
            {showNow && (
              <div aria-hidden className="pointer-events-none absolute right-0 left-7 h-px bg-rust lg:left-12" style={{ top: pct(nowMin) }}>
                <span className="absolute -top-[3px] -left-1 size-[7px] rounded-full bg-rust lg:-top-1 lg:size-[9px]" />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
