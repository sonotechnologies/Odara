import 'server-only'
import { salon } from '@/config/salon'
import type { DaySlots } from '@/lib/availability'
import type { PickerDay } from '@/components/booking/slot-picker'
import { fmtHour } from '@/lib/hours'
import { addDaysToKey, atSalonTime, fmtDay, fmtMonth, weekdayOfKey } from '@/lib/time'
import { formatInTimeZone } from 'date-fns-tz'

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Server-side shaping of engine output into what the slot picker renders. */
export function toPickerDays(days: DaySlots[]): PickerDay[] {
  return days.map((d) => {
    const noon = atSalonTime(d.dateKey, '12:00')
    const wd = weekdayOfKey(d.dateKey)
    let closedSub: string | undefined
    if (d.closed) {
      for (let i = 1; i <= 7; i++) {
        const k = addDaysToKey(d.dateKey, i)
        const h = salon.hours[weekdayOfKey(k) as keyof typeof salon.hours]
        if (h) {
          closedSub = `We rest, then open again ${DAY_NAME[weekdayOfKey(k)]} at ${fmtHour(h.open)}.`
          break
        }
      }
    }
    return {
      key: d.dateKey,
      dow: formatInTimeZone(noon, salon.timezone, 'EEE'),
      d: Number(d.dateKey.slice(8)),
      label: fmtDay(noon),
      month: fmtMonth(noon),
      closed: d.closed,
      full: d.full,
      closedNote: d.closed ? `Closed on ${DAY_NAMES[wd]}.` : undefined,
      closedSub,
      slots: d.slots.map((s) => ({ time: s.time, iso: s.startsAt.toISOString(), available: s.available })),
    }
  })
}
