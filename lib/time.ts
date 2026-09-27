import { addDays, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { salon } from '@/config/salon'

/** All scheduling happens in the salon's timezone. Dates are stored as UTC. */
export const TZ = salon.timezone

/** A calendar day in salon time, "yyyy-MM-dd". */
export type DateKey = string

export const dateKeyOf = (d: Date): DateKey => formatInTimeZone(d, TZ, 'yyyy-MM-dd')
export const todayKey = (now = new Date()): DateKey => dateKeyOf(now)

export function addDaysToKey(key: DateKey, n: number): DateKey {
  return formatInTimeZone(addDays(parseISO(`${key}T12:00:00Z`), n), 'UTC', 'yyyy-MM-dd')
}

/** 0 = Sunday. */
export const weekdayOfKey = (key: DateKey): number => parseISO(`${key}T12:00:00Z`).getUTCDay()

/** "2026-10-07" + "10:00" in salon time → UTC Date. */
export const atSalonTime = (key: DateKey, hm: string): Date => fromZonedTime(`${key}T${hm.slice(0, 5)}:00`, TZ)

export const isDateKey = (s: unknown): s is DateKey => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

export const toMinutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
export const fromMinutes = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const f = (d: Date, pattern: string) => formatInTimeZone(d, TZ, pattern)

/** "10:00" */
export const fmtTime = (d: Date) => f(d, 'HH:mm')
/** "Wed 7 Oct" */
export const fmtDay = (d: Date) => f(d, 'EEE d MMM')
/** "Wed 7 Oct · 10:00" */
export const fmtDayTime = (d: Date) => `${fmtDay(d)} · ${fmtTime(d)}`
/** "Wed 7 Oct, 10:00" */
export const fmtDayTimeComma = (d: Date) => `${fmtDay(d)}, ${fmtTime(d)}`
/** "Wednesday 7 October" */
export const fmtLongDay = (d: Date) => f(d, 'EEEE d MMMM')
/** "October" */
export const fmtMonth = (d: Date) => f(d, 'MMMM')
/** "Wed 7 Oct" from a date key. */
export const fmtKey = (key: DateKey) => fmtDay(atSalonTime(key, '12:00'))

/** "6h", "1h 30m", "30m" */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/** "about 6 hours", "about 90 minutes" for prose. */
export function fmtDurationProse(min: number): string {
  if (min % 60 === 0) return `about ${min / 60} hour${min === 60 ? '' : 's'}`
  return `about ${min} minutes`
}
