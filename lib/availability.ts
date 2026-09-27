/**
 * The availability engine. Pure: give it a day, a service length and each
 * candidate stylist's hours, time off and existing bookings, and it returns the
 * full time grid with every slot marked available or taken.
 *
 * Taken slots are returned, not dropped. The UI shows them struck through.
 */
import { salon, type OpeningHours } from '@/config/salon'
import { addDaysToKey, atSalonTime, fromMinutes, toMinutes, weekdayOfKey, type DateKey } from '@/lib/time'

export type Interval = { start: Date; end: Date }

export type StylistDay = {
  id: string
  /** Stylist's hours per weekday ("HH:mm"). Missing weekday = not working. */
  hours: Partial<Record<number, { start: string; end: string }>>
  timeOff: Interval[]
  /** Existing holds and bookings that occupy the chair. */
  busy: Interval[]
}

export type Slot = {
  time: string // "HH:mm", salon time
  startsAt: Date
  endsAt: Date
  available: boolean
  /** The stylist this slot would go to. With "Any available", the least-booked free one. */
  stylistId: string | null
}

export type DaySlots = {
  dateKey: DateKey
  closed: boolean
  /** Open, has start times, but every one is taken. */
  full: boolean
  slots: Slot[]
}

export type DayQuery = {
  dateKey: DateKey
  durationMin: number
  /** Qualified stylists. One entry for a named stylist, several for "Any available". */
  stylists: StylistDay[]
  now: Date
  salonHours?: Record<number, OpeningHours>
  stepMin?: number
  minLeadMin?: number
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

export function isStylistFree(s: StylistDay, dateKey: DateKey, slot: Interval): boolean {
  const h = s.hours[weekdayOfKey(dateKey)]
  if (!h) return false
  if (slot.start < atSalonTime(dateKey, h.start) || slot.end > atSalonTime(dateKey, h.end)) return false
  if (s.timeOff.some((t) => overlaps(t, slot))) return false
  if (s.busy.some((b) => overlaps(b, slot))) return false
  return true
}

/** Bookings a stylist already has on this salon day. Used to spread work evenly. */
function loadOnDay(s: StylistDay, dateKey: DateKey): number {
  const day = { start: atSalonTime(dateKey, '00:00'), end: atSalonTime(addDaysToKey(dateKey, 1), '00:00') }
  return s.busy.filter((b) => overlaps(b, day)).length
}

export function getDaySlots(q: DayQuery): DaySlots {
  const salonHours: Record<number, OpeningHours> = q.salonHours ?? salon.hours
  const step = q.stepMin ?? salon.booking.slotMinutes
  const lead = q.minLeadMin ?? salon.booking.minLeadMinutes
  const open = salonHours[weekdayOfKey(q.dateKey)]
  if (!open) return { dateKey: q.dateKey, closed: true, full: false, slots: [] }

  const earliest = new Date(q.now.getTime() + lead * 60_000)
  // Least-loaded first; stable on input order for ties.
  const ranked = q.stylists
    .map((s, i) => ({ s, i, load: loadOnDay(s, q.dateKey) }))
    .sort((a, b) => a.load - b.load || a.i - b.i)
    .map((r) => r.s)

  const slots: Slot[] = []
  const lastStart = toMinutes(open.close) - q.durationMin
  for (let m = toMinutes(open.open); m <= lastStart; m += step) {
    const time = fromMinutes(m)
    const startsAt = atSalonTime(q.dateKey, time)
    if (startsAt < earliest) continue // past times aren't "taken", they're gone
    const endsAt = new Date(startsAt.getTime() + q.durationMin * 60_000)
    const free = ranked.find((s) => isStylistFree(s, q.dateKey, { start: startsAt, end: endsAt }))
    slots.push({ time, startsAt, endsAt, available: !!free, stylistId: free?.id ?? null })
  }
  return {
    dateKey: q.dateKey,
    closed: false,
    full: slots.length > 0 && slots.every((s) => !s.available),
    slots,
  }
}

/** Walk forward from a day and collect the first `count` open slots. */
export function nextOpenSlots(days: DaySlots[], count: number): Slot[] {
  const out: Slot[] = []
  for (const d of days) {
    for (const s of d.slots) {
      if (s.available) out.push(s)
      if (out.length >= count) return out
    }
  }
  return out
}
