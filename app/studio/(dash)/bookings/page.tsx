import type { Metadata } from 'next'
import Link from 'next/link'
import { bookingAction } from '../../actions'
import { cx, StatusChip } from '@/components/ui'
import type { BookingStatus } from '@/db/schema'
import { listStylists } from '@/lib/data/catalog'
import { listBookings, VISIBLE, type StudioBooking } from '@/lib/data/studio'
import { formatMoney } from '@/lib/money'
import { formatPhone } from '@/lib/phone'
import { requireOwner } from '@/lib/studio-auth'
import { statusLabel } from '@/components/ui'
import { addDaysToKey, fmtDay, fmtKey, fmtTime, isDateKey, todayKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Bookings' }

type SP = Promise<{ range?: string; date?: string; stylist?: string; status?: string; open?: string }>

function money(b: StudioBooking) {
  const dep = formatMoney(b.depositKobo)
  switch (b.status) {
    case 'no_show':
      return `Deposit ${dep} kept`
    case 'cancelled_salon':
      return `Deposit ${dep} refunded`
    case 'cancelled_client':
      return 'Cancelled by client'
    case 'completed':
      return `Paid in full ${formatMoney(b.priceKobo)}`
    default:
      return `Paid ${dep} · ${formatMoney(b.balanceKobo)} due`
  }
}

type Act = { action: 'arrived' | 'completed' | 'no_show' | 'cancel_salon'; label: string; tone: 'primary' | 'plain' | 'rust' }

function actionsFor(b: StudioBooking): Act[] {
  const complete = `Completed · ${formatMoney(b.balanceKobo)} paid`
  if (b.status === 'confirmed')
    return [
      { action: 'arrived', label: 'Mark arrived', tone: 'primary' },
      { action: 'completed', label: complete, tone: 'plain' },
      { action: 'no_show', label: `No-show · keep ${formatMoney(b.depositKobo)}`, tone: 'rust' },
      { action: 'cancel_salon', label: `Cancel by salon · refund ${formatMoney(b.depositKobo)}`, tone: 'rust' },
    ]
  if (b.status === 'arrived')
    return [
      { action: 'completed', label: complete, tone: 'primary' },
      { action: 'cancel_salon', label: `Cancel by salon · refund ${formatMoney(b.depositKobo)}`, tone: 'rust' },
    ]
  return []
}

const TONE = {
  primary: 'bg-ink text-linen border-ink hover:bg-olive hover:border-olive',
  plain: 'border-stone text-ink hover:bg-parchment',
  rust: 'border-rust-line text-rust hover:bg-rust-mist',
}

export default async function Bookings({ searchParams }: { searchParams: SP }) {
  await requireOwner()
  const sp = await searchParams
  const today = todayKey()
  const range = sp.range === 'tomorrow' || sp.range === 'week' ? sp.range : 'day'
  const dayKey = isDateKey(sp.date) ? sp.date : range === 'tomorrow' ? addDaysToKey(today, 1) : today
  const from = range === 'week' ? today : dayKey
  const days = range === 'week' ? 7 : 1
  const status = VISIBLE.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined
  const [stylists, rows, todayRows] = await Promise.all([
    listStylists(),
    listBookings({ from, days, stylistId: sp.stylist || undefined, status }),
    listBookings({ from: today, days: 1 }),
  ])
  const stylistId = stylists.find((s) => s.id === sp.stylist)?.id
  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { range: range === 'day' ? undefined : range, date: sp.date, stylist: stylistId, status, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/studio/bookings?${p}`
  }
  const chip = (on: boolean) =>
    cx('flex h-[30px] items-center rounded-full px-3 whitespace-nowrap', on ? 'bg-ink text-linen' : 'border border-line hover:bg-parchment')
  const isToday = range === 'day' && dayKey === today
  const liveToday = todayRows.filter((b) => b.status !== 'cancelled_client' && b.status !== 'cancelled_salon').length

  return (
    <div className="flex flex-col px-4 pt-5 pb-8 lg:px-10 lg:pt-7">
      <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-end lg:justify-between lg:pb-5">
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-3xl leading-[1.1] lg:text-[44px]">Bookings</h1>
          <nav aria-label="Range" className="flex gap-1.5 overflow-x-auto text-xs">
            <Link href={q({ range: undefined, date: undefined })} className={chip(isToday)} aria-current={isToday ? 'true' : undefined}>
              Today · {liveToday}
            </Link>
            <Link href={q({ range: 'tomorrow', date: undefined })} className={chip(range === 'tomorrow')}>
              Tomorrow
            </Link>
            <Link href={q({ range: 'week', date: undefined })} className={chip(range === 'week')}>
              This week
            </Link>
            {range === 'day' && !isToday && <span className={chip(true)}>{fmtKey(dayKey)}</span>}
          </nav>
        </div>
        <form className="flex flex-wrap items-end gap-3 text-[13px]" action="/studio/bookings">
          {range !== 'day' && <input type="hidden" name="range" value={range} />}
          {sp.date && <input type="hidden" name="date" value={sp.date} />}
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Stylist
            <select name="stylist" defaultValue={stylistId ?? ''} className="h-9 min-w-32 border-0 border-b border-stone bg-transparent text-[13px] text-ink outline-none">
              <option value="">Everyone</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Status
            <select name="status" defaultValue={status ?? ''} className="h-9 min-w-32 border-0 border-b border-stone bg-transparent text-[13px] text-ink outline-none">
              <option value="">All</option>
              {VISIBLE.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <button className="h-9 rounded-[2px] border border-stone px-4 hover:bg-parchment">Filter</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-line py-10 text-sm text-ink-soft">No bookings match.</p>
      ) : (
        <ul>
          {rows.map((b, i) => {
            const acts = actionsFor(b)
            const newDay = range === 'week' && (i === 0 || fmtDay(rows[i - 1].startsAt) !== fmtDay(b.startsAt))
            return (
              <li key={b.id} id={`b-${b.id}`} className="scroll-mt-20">
                {newDay && <div className="eyebrow pt-6 pb-2">{fmtDay(b.startsAt)}</div>}
                <details open={sp.open === b.id} className="group border-t border-line">
                  <summary className="grid list-none grid-cols-[44px_1fr_auto] items-start gap-2.5 py-3 lg:grid-cols-[64px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:py-4 [&::-webkit-details-marker]:hidden">
                    <span className="pt-px text-[13px] tabular lg:text-sm">{fmtTime(b.startsAt)}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{b.clientName}</span>
                      <span className="text-xs text-ink-soft lg:hidden">
                        {b.serviceName} · {b.stylistName}
                      </span>
                      <span className="text-xs text-ink-soft lg:hidden">{money(b)}</span>
                      <span className="hidden text-xs text-ink-soft lg:block">{formatPhone(b.clientPhone)}</span>
                    </span>
                    <span className="hidden text-sm lg:block">
                      {b.serviceName}
                      <span className="block text-xs text-ink-soft">with {b.stylistName}</span>
                    </span>
                    <span className="hidden text-[13px] text-ink-soft lg:block">{money(b)}</span>
                    <StatusChip status={b.status} size="sm" />
                  </summary>
                  <div className="flex flex-col gap-3 pb-4 pl-[54px] lg:pl-[88px]">
                    {acts.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5 lg:flex lg:flex-wrap lg:gap-2">
                        {acts.map((a) => (
                          <form key={a.action} action={bookingAction} className="contents">
                            <input type="hidden" name="id" value={b.id} />
                            <button
                              name="action"
                              value={a.action}
                              className={cx('min-h-[38px] rounded-[2px] border px-3 py-1.5 text-xs font-medium transition-colors', TONE[a.tone])}
                            >
                              {a.label}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-soft">Closed. No actions left.</p>
                    )}
                    <p className="text-xs text-ink-soft">
                      <span className="font-mono tracking-[0.06em]">{b.ref}</span> ·{' '}
                      <Link href={`/booking/${b.ref}`} className="underline underline-offset-2 hover:text-ink">
                        Client’s view
                      </Link>
                    </p>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
