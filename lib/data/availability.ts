import 'server-only'
import { and, eq, gt, inArray, lt, ne, or, sql } from 'drizzle-orm'
import { getDb, schema, type Tx } from '@/db'
import { salon } from '@/config/salon'
import { getDaySlots, type DaySlots, type StylistDay } from '@/lib/availability'
import { addDaysToKey, atSalonTime, type DateKey } from '@/lib/time'

const { bookings, timeOff, workingHours } = schema

/** Rows that occupy a chair: live holds, confirmed bookings and clients in the chair. */
export const occupying = (now: Date) =>
  or(
    inArray(bookings.status, ['confirmed', 'arrived']),
    and(eq(bookings.status, 'hold'), gt(bookings.holdExpiresAt, now)),
  )

/** Load hours, time off and busy intervals for a set of stylists over [fromKey, toKey]. */
export async function loadStylistDays(
  stylistIds: string[],
  fromKey: DateKey,
  toKey: DateKey,
  now: Date,
  opts: { tx?: Tx; excludeBookingId?: string } = {},
): Promise<StylistDay[]> {
  if (!stylistIds.length) return []
  const db = opts.tx ?? getDb()
  const winStart = atSalonTime(fromKey, '00:00')
  const winEnd = atSalonTime(addDaysToKey(toKey, 1), '00:00')

  const qHours = () => db.select().from(workingHours).where(inArray(workingHours.stylistId, stylistIds))
  const qOff = () =>
    db
      .select()
      .from(timeOff)
      .where(and(inArray(timeOff.stylistId, stylistIds), lt(timeOff.startsAt, winEnd), gt(timeOff.endsAt, winStart)))
  const qBusy = () =>
    db
      .select({ stylistId: bookings.stylistId, start: bookings.startsAt, end: bookings.endsAt })
      .from(bookings)
      .where(
        and(
          inArray(bookings.stylistId, stylistIds),
          lt(bookings.startsAt, winEnd),
          gt(bookings.endsAt, winStart),
          occupying(now),
          opts.excludeBookingId ? ne(bookings.id, opts.excludeBookingId) : sql`true`,
        ),
      )
  // A transaction is one connection: its queries must run one after another.
  const [hours, off, busy] = opts.tx
    ? [await qHours(), await qOff(), await qBusy()]
    : await Promise.all([qHours(), qOff(), qBusy()])

  return stylistIds.map((id) => ({
    id,
    hours: Object.fromEntries(
      hours.filter((h) => h.stylistId === id).map((h) => [h.weekday, { start: h.startTime.slice(0, 5), end: h.endTime.slice(0, 5) }]),
    ),
    timeOff: off.filter((t) => t.stylistId === id).map((t) => ({ start: t.startsAt, end: t.endsAt })),
    busy: busy.filter((b) => b.stylistId === id).map((b) => ({ start: b.start, end: b.end })),
  }))
}

export async function getSlotsForRange(args: {
  stylistIds: string[]
  durationMin: number
  fromKey: DateKey
  days: number
  now?: Date
  tx?: Tx
  excludeBookingId?: string
}): Promise<DaySlots[]> {
  const now = args.now ?? new Date()
  const toKey = addDaysToKey(args.fromKey, args.days - 1)
  const sd = await loadStylistDays(args.stylistIds, args.fromKey, toKey, now, args)
  return Array.from({ length: args.days }, (_, i) =>
    getDaySlots({ dateKey: addDaysToKey(args.fromKey, i), durationMin: args.durationMin, stylists: sd, now }),
  )
}

export const horizonDays = salon.booking.horizonDays

/** Each stylist's first open start time, from one load of everyone's calendar. */
export async function nextOpenPerStylist(args: { stylistIds: string[]; durationMin: number; fromKey: DateKey; days: number; now?: Date }) {
  const now = args.now ?? new Date()
  const sd = await loadStylistDays(args.stylistIds, args.fromKey, addDaysToKey(args.fromKey, args.days - 1), now)
  return Object.fromEntries(
    sd.map((s) => {
      for (let i = 0; i < args.days; i++) {
        const day = getDaySlots({ dateKey: addDaysToKey(args.fromKey, i), durationMin: args.durationMin, stylists: [s], now })
        const open = day.slots.find((x) => x.available)
        if (open) return [s.id, open.startsAt]
      }
      return [s.id, null]
    }),
  ) as Record<string, Date | null>
}
