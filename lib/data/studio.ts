import 'server-only'
import { and, asc, count, desc, eq, gte, inArray, lt, sql, sum } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import type { BookingStatus } from '@/db/schema'
import { addDaysToKey, atSalonTime, todayKey, weekdayOfKey, type DateKey } from '@/lib/time'

const { bookings, clients, messages, payments, services, stylists, stylistServices, timeOff, workingHours } = schema

/** What the studio sees. Holds are never shown: no deposit, no booking. */
export const VISIBLE: BookingStatus[] = ['confirmed', 'arrived', 'completed', 'no_show', 'cancelled_client', 'cancelled_salon']

const dayRange = (from: DateKey, days = 1) => ({ start: atSalonTime(from, '00:00'), end: atSalonTime(addDaysToKey(from, days), '00:00') })

export async function listBookings(f: { from: DateKey; days: number; stylistId?: string; status?: BookingStatus }) {
  const r = dayRange(f.from, f.days)
  return getDb()
    .select({
      id: bookings.id,
      ref: bookings.ref,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      priceKobo: bookings.priceKobo,
      depositKobo: bookings.depositKobo,
      balanceKobo: bookings.balanceKobo,
      clientName: clients.name,
      clientPhone: clients.phone,
      serviceName: services.name,
      stylistId: stylists.id,
      stylistName: stylists.name,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(stylists, eq(stylists.id, bookings.stylistId))
    .innerJoin(clients, eq(clients.id, bookings.clientId))
    .where(
      and(
        gte(bookings.startsAt, r.start),
        lt(bookings.startsAt, r.end),
        f.status ? eq(bookings.status, f.status) : inArray(bookings.status, VISIBLE),
        f.stylistId ? eq(bookings.stylistId, f.stylistId) : sql`true`,
      ),
    )
    .orderBy(asc(bookings.startsAt), asc(stylists.sortOrder))
}

export type StudioBooking = Awaited<ReturnType<typeof listBookings>>[number]

async function sumPayments(type: 'deposit' | 'balance', from: Date, to: Date) {
  const [row] = await getDb()
    .select({ total: sum(payments.amountKobo) })
    .from(payments)
    .where(and(eq(payments.type, type), eq(payments.status, 'succeeded'), gte(payments.createdAt, from), lt(payments.createdAt, to)))
  return Number(row?.total ?? 0)
}

export async function todayOverview(key: DateKey = todayKey(), now = new Date()) {
  const today = dayRange(key)
  const weekFrom = addDaysToKey(key, -6)
  const [dayBookings, depositsToday, depositsWeek, noShow] = await Promise.all([
    listBookings({ from: key, days: 1 }),
    sumPayments('deposit', today.start, today.end),
    sumPayments('deposit', atSalonTime(weekFrom, '00:00'), today.end),
    noShowRate(now),
  ])
  const live = dayBookings.filter((b) => b.status !== 'cancelled_client' && b.status !== 'cancelled_salon')
  return {
    bookings: dayBookings,
    count: live.length,
    done: live.filter((b) => b.status === 'completed').length,
    inChair: live.filter((b) => b.status === 'arrived').length,
    depositsToday,
    depositsWeek,
    balanceDue: live.filter((b) => b.status === 'confirmed' || b.status === 'arrived').reduce((a, b) => a + b.balanceKobo, 0),
    balanceCollected: live.filter((b) => b.status === 'completed').reduce((a, b) => a + b.balanceKobo, 0),
    noShow,
  }
}

/** No-shows as a share of bookings that reached their day (completed + no-show) over 30 days. */
export async function noShowRate(now = new Date()) {
  const from = new Date(now.getTime() - 30 * 24 * 3_600_000)
  const rows = await getDb()
    .select({ status: bookings.status, n: count() })
    .from(bookings)
    .where(and(gte(bookings.startsAt, from), lt(bookings.startsAt, now), inArray(bookings.status, ['completed', 'no_show'])))
    .groupBy(bookings.status)
  const noShows = Number(rows.find((r) => r.status === 'no_show')?.n ?? 0)
  const total = rows.reduce((a, r) => a + Number(r.n), 0)
  return { noShows, total, rate: total ? noShows / total : 0 }
}

export async function staffOverview(now = new Date()) {
  const db = getDb()
  const [all, hours, off, links, svc] = await Promise.all([
    db.select().from(stylists).where(eq(stylists.active, true)).orderBy(asc(stylists.sortOrder)),
    db.select().from(workingHours),
    db.select().from(timeOff).where(gte(timeOff.endsAt, now)).orderBy(asc(timeOff.startsAt)),
    db.select().from(stylistServices),
    db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder)),
  ])
  // Bookings that fall inside time off: the owner needs to move these.
  const clashes = off.length
    ? await db
        .select({ timeOffId: timeOff.id, n: count() })
        .from(timeOff)
        .innerJoin(
          bookings,
          and(
            eq(bookings.stylistId, timeOff.stylistId),
            lt(bookings.startsAt, timeOff.endsAt),
            sql`${bookings.endsAt} > ${timeOff.startsAt}`,
            inArray(bookings.status, ['confirmed', 'arrived']),
          ),
        )
        .where(gte(timeOff.endsAt, now))
        .groupBy(timeOff.id)
    : []

  return all.map((s) => ({
    ...s,
    hours: Object.fromEntries(
      hours.filter((h) => h.stylistId === s.id).map((h) => [h.weekday, { start: h.startTime.slice(0, 5), end: h.endTime.slice(0, 5) }]),
    ) as Record<number, { start: string; end: string } | undefined>,
    timeOff: off
      .filter((t) => t.stylistId === s.id)
      .map((t) => ({ ...t, clashes: Number(clashes.find((c) => c.timeOffId === t.id)?.n ?? 0) })),
    services: svc.filter((x) => links.some((l) => l.stylistId === s.id && l.serviceId === x.id)),
  }))
}

export async function outbox(status?: 'queued' | 'sent' | 'failed' | 'cancelled') {
  const db = getDb()
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: messages.id,
        kind: messages.kind,
        body: messages.body,
        status: messages.status,
        scheduledFor: messages.scheduledFor,
        sentAt: messages.sentAt,
        clientName: clients.name,
        clientPhone: clients.phone,
        ref: bookings.ref,
      })
      .from(messages)
      .innerJoin(clients, eq(clients.id, messages.clientId))
      .leftJoin(bookings, eq(bookings.id, messages.bookingId))
      .where(status ? eq(messages.status, status) : sql`true`)
      .orderBy(
        ...(status === 'queued'
          ? [asc(messages.scheduledFor)]
          : [
              // Far-future queued messages (rebook nudges weeks out) sink below recent activity.
              asc(sql`case when ${messages.status} = 'queued' and ${messages.scheduledFor} > now() + interval '2 days' then 1 else 0 end`),
              desc(sql`coalesce(${messages.sentAt}, ${messages.scheduledFor})`),
            ]),
      )
      .limit(80),
    db.select({ status: messages.status, n: count() }).from(messages).groupBy(messages.status),
  ])
  const c = Object.fromEntries(counts.map((r) => [r.status, Number(r.n)])) as Partial<Record<string, number>>
  const [due] = await db
    .select({ n: count() })
    .from(messages)
    .where(and(eq(messages.status, 'queued'), lt(messages.scheduledFor, new Date())))
  return { rows, counts: c, due: Number(due?.n ?? 0) }
}

export const isOpenDay = (key: DateKey, hours: Record<number, unknown>) => !!hours[weekdayOfKey(key)]
