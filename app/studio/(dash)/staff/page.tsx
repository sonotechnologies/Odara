import type { Metadata } from 'next'
import Link from 'next/link'
import { addTimeOff, removeTimeOff, saveHours } from '../../actions'
import { btn, cx } from '@/components/ui'
import { salon } from '@/config/salon'
import { staffOverview } from '@/lib/data/studio'
import { requireOwner } from '@/lib/studio-auth'
import { addDaysToKey, dateKeyOf, fmtDay, fmtDuration, todayKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Staff' }

const WEEK = [1, 2, 3, 4, 5, 6, 0]
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function Staff({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireOwner()
  const { s } = await searchParams
  const staff = await staffOverview()
  const cur = staff.find((x) => x.slug === s) ?? staff[0]
  const today = todayKey()

  return (
    <div className="flex flex-col px-4 pt-5 pb-8 lg:px-10 lg:pt-7">
      <h1 className="font-serif text-3xl leading-[1.1] lg:text-[44px]">Staff</h1>
      <nav aria-label="Stylist" className="mt-3.5 flex border-b border-line lg:mt-6">
        {staff.map((x) => (
          <Link
            key={x.id}
            href={`/studio/staff?s=${x.slug}`}
            aria-current={x.id === cur.id ? 'page' : undefined}
            className={cx(
              '-mb-px flex h-[38px] flex-1 items-center justify-center border-b-2 text-[13px] lg:flex-none lg:px-6 lg:text-sm',
              x.id === cur.id ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {x.name}
          </Link>
        ))}
      </nav>

      <div className="lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        {/* Weekly hours */}
        <form action={saveHours} className="flex flex-col pt-4 lg:pt-0">
          <input type="hidden" name="stylistId" value={cur.id} />
          <div className="flex items-baseline justify-between pb-2">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">Weekly hours · {cur.name}</h2>
            <button className="border-b border-ink text-[13px]">Save</button>
          </div>
          {WEEK.map((wd) => {
            const h = cur.hours[wd]
            const salonH = salon.hours[wd as keyof typeof salon.hours]
            return (
              <div key={wd} className="grid h-12 grid-cols-[44px_40px_1fr] items-center gap-2.5 border-t border-line">
                <span className={cx('text-sm', h ? 'text-ink' : 'text-ink-soft')}>{DAY[wd]}</span>
                {salonH ? (
                  <>
                    <label className="relative inline-flex h-5 w-[34px] items-center">
                      <span className="sr-only">Works on {DAY[wd]}</span>
                      <input type="checkbox" name={`on-${wd}`} defaultChecked={!!h} className="peer sr-only" />
                      <span className="absolute inset-0 rounded-full bg-line transition-colors peer-checked:bg-olive peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive" />
                      <span className="absolute left-0.5 size-4 rounded-full bg-linen transition-transform peer-checked:translate-x-3.5" />
                    </label>
                    <span className="flex items-center gap-1.5 text-[13px]">
                      <input
                        type="time"
                        name={`start-${wd}`}
                        defaultValue={h?.start ?? salonH.open}
                        min={salonH.open}
                        max={salonH.close}
                        step={1800}
                        aria-label={`${DAY[wd]} start`}
                        className="w-[74px] bg-transparent text-xs tabular sm:w-[92px] sm:text-[13px] [&::-webkit-calendar-picker-indicator]:hidden"
                      />
                      –
                      <input
                        type="time"
                        name={`end-${wd}`}
                        defaultValue={h?.end ?? salonH.close}
                        min={salonH.open}
                        max={salonH.close}
                        step={1800}
                        aria-label={`${DAY[wd]} end`}
                        className="w-[74px] bg-transparent text-xs tabular sm:w-[92px] sm:text-[13px] [&::-webkit-calendar-picker-indicator]:hidden"
                      />
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden className="relative h-5 w-[34px] rounded-full bg-line">
                      <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-linen" />
                    </span>
                    <span className="text-[13px] text-ink-soft">Salon closed</span>
                  </>
                )}
              </div>
            )
          })}
          <p className="border-t border-line pt-3 text-xs text-ink-soft">Hours sit inside the salon’s opening hours. Changes apply to new bookings straight away.</p>
        </form>

        <div className="flex flex-col gap-8 pt-7 lg:pt-0">
          {/* Time off */}
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">Time off</h2>
            {cur.timeOff.length === 0 && <p className="text-[13px] text-ink-soft">None planned.</p>}
            {cur.timeOff.map((t) => {
              const lastDay = dateKeyOf(new Date(t.endsAt.getTime() - 1))
              const oneDay = dateKeyOf(t.startsAt) === lastDay
              return (
                <div key={t.id} className="flex flex-col gap-2 rounded-[2px] bg-parchment px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm">{oneDay ? fmtDay(t.startsAt) : `${fmtDay(t.startsAt)} – ${fmtDay(new Date(t.endsAt.getTime() - 1))}`}</div>
                    <div className="text-xs text-ink-soft">
                      {oneDay ? 'Full day' : 'Days off'}
                      {t.reason ? ` · ${t.reason}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className={cx('text-xs', t.clashes ? 'text-rust' : 'text-ink-soft')}>
                      {t.clashes ? `${t.clashes} booking${t.clashes > 1 ? 's' : ''} to move` : '0 clashes'}
                    </span>
                    <form action={removeTimeOff}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs underline underline-offset-2" aria-label={`Remove time off starting ${fmtDay(t.startsAt)}`}>
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
            <details className="group mt-1">
              <summary className="list-none self-start text-[13px] [&::-webkit-details-marker]:hidden">
                <span className="border-b border-ink">Add time off</span>
              </summary>
              <form action={addTimeOff} className="mt-3 grid animate-fade-up grid-cols-2 gap-3 border border-line p-4">
                <input type="hidden" name="stylistId" value={cur.id} />
                <label className="flex flex-col gap-1 text-xs text-ink-soft">
                  From
                  <input type="date" name="from" required min={today} defaultValue={addDaysToKey(today, 7)} className="h-10 border-0 border-b border-stone bg-transparent text-sm text-ink" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-soft">
                  To
                  <input type="date" name="to" required min={today} defaultValue={addDaysToKey(today, 7)} className="h-10 border-0 border-b border-stone bg-transparent text-sm text-ink" />
                </label>
                <label className="col-span-2 flex flex-col gap-1 text-xs text-ink-soft">
                  Reason (optional)
                  <input name="reason" maxLength={60} placeholder="Leave, training…" className="h-10 border-0 border-b border-stone bg-transparent text-sm text-ink" />
                </label>
                <button className={cx(btn.primary, 'col-span-2 h-11')}>Add</button>
              </form>
            </details>
          </section>

          {/* Services */}
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">Services {cur.name} offers</h2>
            <ul>
              {cur.services.map((x) => (
                <li key={x.id} className="flex justify-between border-t border-line py-2.5 text-sm">
                  <span>{x.name}</span>
                  <span className="text-ink-soft">{fmtDuration(x.durationMin)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
