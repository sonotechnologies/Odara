import 'server-only'
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import { getDb, schema, type Tx } from '@/db'
import type { Booking, Client, Service, Stylist } from '@/db/schema'
import { salon } from '@/config/salon'
import { getDaySlots } from '@/lib/availability'
import { applyCredit, depositSplit } from '@/lib/deposit'
import { bookingRef, urlToken } from '@/lib/ids'
import { messaging } from '@/lib/messaging/demo'
import * as T from '@/lib/messaging/templates'
import { payments, type PaymentMethod } from '@/lib/payments'
import { clientCancelOutcome, clientRescheduleOutcome, salonCancelOutcome } from '@/lib/policy'
import { dateKeyOf } from '@/lib/time'
import { appUrl, manageUrl, rebookUrl } from '@/lib/urls'
import { loadStylistDays } from './availability'
import { stylistsForService } from './catalog'

const { bookings, clients, payments: paymentsT, rebookTokens, services, stylists } = schema

const MIN = 60_000
const HOUR = 60 * MIN

export type BookingDetail = Booking & { service: Service; stylist: Stylist; client: Client | null }

/** Postgres exclusion_violation: someone else got the chair first. */
const isOverlap = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } }
  return err?.code === '23P01' || err?.cause?.code === '23P01'
}
const isUniqueRef = (e: unknown) => {
  const err = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } }
  const c = err?.cause ?? err
  return c?.code === '23505' && (c?.constraint ?? '').includes('ref')
}

// ── Reads ─────────────────────────────────────────────────────

async function detailWhere(where: ReturnType<typeof eq>, tx?: Tx): Promise<BookingDetail | null> {
  const db = tx ?? getDb()
  const [row] = await db
    .select({ b: bookings, service: services, stylist: stylists, client: clients })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(stylists, eq(stylists.id, bookings.stylistId))
    .leftJoin(clients, eq(clients.id, bookings.clientId))
    .where(where)
  return row ? { ...row.b, service: row.service, stylist: row.stylist, client: row.client } : null
}

export const getBookingById = (id: string, tx?: Tx) =>
  /^[0-9a-f-]{36}$/i.test(id) ? detailWhere(eq(bookings.id, id), tx) : Promise.resolve(null)

export const getBookingByRef = (ref: string, tx?: Tx) => detailWhere(eq(bookings.ref, ref.toUpperCase()), tx)

/** Lazy cleanup: any hold past its expiry releases its slot. */
export async function expireStaleHolds(tx: Tx, now = new Date()) {
  await tx
    .update(bookings)
    .set({ status: 'expired' })
    .where(and(eq(bookings.status, 'hold'), lt(bookings.holdExpiresAt, now)))
}

/** A hold, with its expiry applied if it has run out. */
export async function getHold(id: string, now = new Date()) {
  const b = await getBookingById(id)
  if (!b) return null
  if (b.status === 'hold' && b.holdExpiresAt && b.holdExpiresAt <= now) {
    await getDb().update(bookings).set({ status: 'expired' }).where(and(eq(bookings.id, id), eq(bookings.status, 'hold')))
    return { ...b, status: 'expired' as const }
  }
  return b
}

// ── Holds ─────────────────────────────────────────────────────

export type HoldResult = { ok: true; booking: Booking } | { ok: false; reason: 'taken' | 'invalid' }

/**
 * Place a 10-minute hold on a slot. Runs in a transaction: stale holds are
 * released, the slot is re-checked against live availability, the stylist is
 * assigned (least-booked for "Any available"), and the row is inserted. The
 * exclusion constraint is the final word if two people race for the same chair.
 */
export async function createHold(input: {
  serviceId: string
  stylistId: string | 'any'
  startsAt: Date
  clientId?: string | null
  now?: Date
}): Promise<HoldResult> {
  const now = input.now ?? new Date()
  const db = getDb()
  const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true)))
  if (!service || Number.isNaN(input.startsAt.getTime())) return { ok: false, reason: 'invalid' }

  const qualified = await stylistsForService(service.id)
  const candidates = input.stylistId === 'any' ? qualified : qualified.filter((s) => s.id === input.stylistId)
  if (!candidates.length) return { ok: false, reason: 'invalid' }

  const split = depositSplit(service.priceKobo, service.depositPercent)
  const dateKey = dateKeyOf(input.startsAt)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const booking = await db.transaction(async (tx) => {
        await expireStaleHolds(tx, now)
        const sd = await loadStylistDays(
          candidates.map((c) => c.id),
          dateKey,
          dateKey,
          now,
          { tx },
        )
        const day = getDaySlots({ dateKey, durationMin: service.durationMin, stylists: sd, now })
        const slot = day.slots.find((s) => s.startsAt.getTime() === input.startsAt.getTime())
        if (!slot) return 'invalid' as const
        if (!slot.available || !slot.stylistId) return 'taken' as const

        const [row] = await tx
          .insert(bookings)
          .values({
            ref: bookingRef(),
            clientId: input.clientId ?? null,
            stylistId: slot.stylistId,
            serviceId: service.id,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: 'hold',
            priceKobo: split.totalKobo,
            depositKobo: split.depositKobo,
            balanceKobo: split.balanceKobo,
            holdExpiresAt: new Date(now.getTime() + salon.booking.holdMinutes * MIN),
          })
          .returning()
        return row
      })
      if (booking === 'invalid' || booking === 'taken') return { ok: false, reason: booking }
      return { ok: true, booking }
    } catch (e) {
      if (isOverlap(e)) return { ok: false, reason: 'taken' }
      if (isUniqueRef(e)) continue // astronomically rare ref collision; try a new one
      throw e
    }
  }
  return { ok: false, reason: 'taken' }
}

/** "Hold it again" after expiry: same service, stylist and time, if it's still free. */
export async function reHold(expiredId: string) {
  const b = await getBookingById(expiredId)
  if (!b || b.status !== 'expired') return { ok: false as const, reason: 'invalid' as const }
  return createHold({ serviceId: b.serviceId, stylistId: b.stylistId, startsAt: b.startsAt, clientId: b.clientId })
}

// ── Checkout ──────────────────────────────────────────────────

export async function upsertClient(tx: Tx, phone: string, name: string) {
  const [c] = await tx
    .insert(clients)
    .values({ phone, name })
    .onConflictDoUpdate({ target: clients.phone, set: { name } })
    .returning()
  return c
}

export type CheckoutStart =
  | { kind: 'redirect'; url: string }
  | { kind: 'confirmed'; ref: string }
  | { kind: 'error'; reason: 'expired' | 'invalid' }

/**
 * The client has named themselves on the hold screen. Attach them, apply any
 * salon credit, and either hand off to the payment provider or — if credit
 * covers the whole deposit — confirm straight away.
 */
export async function startCheckout(holdId: string, who: { name: string; phone: string }): Promise<CheckoutStart> {
  const now = new Date()
  const db = getDb()
  const res = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, holdId)).for('update')
    if (!b) return { kind: 'error', reason: 'invalid' } as const
    if (b.status !== 'hold' || !b.holdExpiresAt || b.holdExpiresAt <= now) return { kind: 'error', reason: 'expired' } as const
    const client = await upsertClient(tx, who.phone, who.name)
    await tx.update(bookings).set({ clientId: client.id }).where(eq(bookings.id, b.id))
    return { kind: 'ok', booking: { ...b, clientId: client.id }, client } as const
  })
  if (res.kind === 'error') return res

  const { dueNowKobo } = applyCredit(res.booking.depositKobo, res.client.creditKobo)
  if (dueNowKobo === 0) {
    const c = await confirmDeposit(holdId, null)
    return c.ok ? { kind: 'confirmed', ref: c.ref } : { kind: 'error', reason: 'expired' }
  }
  const init = await payments.initDeposit({
    bookingId: res.booking.id,
    bookingRef: res.booking.ref,
    amountKobo: dueNowKobo,
    client: { name: res.client.name, phone: res.client.phone },
    returnUrl: appUrl(`/book/checkout/${res.booking.id}`),
  })
  return { kind: 'redirect', url: init.checkoutUrl }
}

export type ConfirmResult = { ok: true; ref: string } | { ok: false; reason: 'expired' | 'slot_lost' | 'invalid' | 'amount' }

/**
 * Deposit received → booking exists. One transaction: the hold becomes
 * `confirmed`, payments are recorded, credit is drawn down, the receipt goes
 * out and the 24h reminder is queued. Until this commits there is no booking.
 *
 * `paid` is null when salon credit covers the whole deposit.
 */
export async function confirmDeposit(
  holdId: string,
  paid: { providerRef: string; amountKobo: number; method: PaymentMethod } | null,
): Promise<ConfirmResult> {
  const now = new Date()
  const db = getDb()
  try {
    return await db.transaction(async (tx) => {
      const [b] = await tx.select().from(bookings).where(eq(bookings.id, holdId)).for('update')
      if (!b || !b.clientId) return { ok: false, reason: 'invalid' } as const
      if (b.status === 'confirmed') return { ok: true, ref: b.ref } as const // idempotent
      // A payment that lands just after expiry still wins the chair if nobody else took it;
      // the exclusion constraint decides.
      if (b.status !== 'hold' && b.status !== 'expired') return { ok: false, reason: 'invalid' } as const
      if (!paid && b.holdExpiresAt && b.holdExpiresAt <= now) return { ok: false, reason: 'expired' } as const

      const [client] = await tx.select().from(clients).where(eq(clients.id, b.clientId)).for('update')
      const paidKobo = paid?.amountKobo ?? 0
      const creditUsed = b.depositKobo - paidKobo
      if (creditUsed < 0 || creditUsed > client.creditKobo) return { ok: false, reason: 'amount' } as const

      await tx.update(bookings).set({ status: 'confirmed', holdExpiresAt: null }).where(eq(bookings.id, b.id))
      if (paid && paidKobo > 0) {
        await tx.insert(paymentsT).values({
          bookingId: b.id,
          type: 'deposit',
          amountKobo: paidKobo,
          method: paid.method,
          status: 'succeeded',
          providerRef: paid.providerRef,
        })
      }
      if (creditUsed > 0) {
        await tx.insert(paymentsT).values({ bookingId: b.id, type: 'credit_applied', amountKobo: creditUsed, method: 'credit', status: 'succeeded' })
        await tx.update(clients).set({ creditKobo: client.creditKobo - creditUsed }).where(eq(clients.id, client.id))
      }

      const [service] = await tx.select().from(services).where(eq(services.id, b.serviceId))
      const [stylist] = await tx.select().from(stylists).where(eq(stylists.id, b.stylistId))
      const tpl = { ref: b.ref, clientName: client.name, serviceName: service.name, stylistName: stylist.name, startsAt: b.startsAt, depositKobo: b.depositKobo, balanceKobo: b.balanceKobo }
      const m = messaging.withTx(tx)
      await m.send({ clientId: client.id, bookingId: b.id, kind: 'receipt', body: T.receipt(tpl) })
      await queueReminder(tx, b, tpl, client.id, service.id, stylist.id, now)
      return { ok: true, ref: b.ref } as const
    })
  } catch (e) {
    if (isOverlap(e)) {
      if (paid) await payments.refund({ providerRef: paid.providerRef, amountKobo: paid.amountKobo, reason: 'slot_lost' })
      return { ok: false, reason: 'slot_lost' }
    }
    throw e
  }
}

async function queueReminder(
  tx: Tx,
  b: Pick<Booking, 'id' | 'ref' | 'startsAt'>,
  tpl: Parameters<typeof T.receipt>[0],
  clientId: string,
  serviceId: string,
  stylistId: string,
  now: Date,
) {
  const at = new Date(b.startsAt.getTime() - salon.messaging.reminderHoursBefore * HOUR)
  if (at <= now) return // booked inside 24h: the receipt is the reminder
  const token = await createRebookToken(tx, clientId, serviceId, stylistId)
  await messaging
    .withTx(tx)
    .schedule(
      { clientId, bookingId: b.id, kind: 'reminder_24h', body: T.reminder24h({ ...tpl, manageUrl: manageUrl(b.ref), rebookUrl: rebookUrl(token) }) },
      at,
    )
}

export async function createRebookToken(tx: Tx, clientId: string, serviceId: string, stylistId: string | null) {
  const token = urlToken(12)
  await tx.insert(rebookTokens).values({
    token,
    clientId,
    serviceId,
    stylistId,
    expiresAt: new Date(Date.now() + salon.messaging.rebookTokenDays * 24 * HOUR),
  })
  return token
}

// ── Client changes ────────────────────────────────────────────

/** Where the money goes back to: card portion via the provider, credit portion back to credit. */
async function paidBreakdown(tx: Tx, bookingId: string) {
  const rows = await tx
    .select()
    .from(paymentsT)
    .where(and(eq(paymentsT.bookingId, bookingId), inArray(paymentsT.type, ['deposit', 'credit_applied']), eq(paymentsT.status, 'succeeded')))
  const card = rows.filter((r) => r.type === 'deposit')
  return {
    cardKobo: card.reduce((a, r) => a + r.amountKobo, 0),
    creditKobo: rows.filter((r) => r.type === 'credit_applied').reduce((a, r) => a + r.amountKobo, 0),
    providerRef: card[0]?.providerRef ?? null,
    method: card[0]?.method ?? 'card',
  }
}

async function returnMoney(tx: Tx, b: Booking, clientId: string, to: 'original' | 'credit') {
  const paid = await paidBreakdown(tx, b.id)
  let creditBack = paid.creditKobo
  if (to === 'credit') creditBack += paid.cardKobo
  else if (paid.cardKobo > 0) {
    const r = await payments.refund({ providerRef: paid.providerRef ?? b.ref, amountKobo: paid.cardKobo, reason: 'cancel' })
    await tx.insert(paymentsT).values({ bookingId: b.id, type: 'refund', amountKobo: paid.cardKobo, method: paid.method, status: r.status, providerRef: r.providerRef })
  }
  if (creditBack > 0) {
    await tx.insert(paymentsT).values({ bookingId: b.id, type: 'refund', amountKobo: creditBack, method: 'credit', status: 'succeeded' })
    await tx.update(clients).set({ creditKobo: sql`${clients.creditKobo} + ${creditBack}` }).where(eq(clients.id, clientId))
  }
}

export type ChangeResult = { ok: true } | { ok: false; reason: string }

export async function cancelByClient(ref: string, choice: 'refund' | 'credit'): Promise<ChangeResult> {
  const now = new Date()
  return getDb().transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.ref, ref)).for('update')
    if (!b || !b.clientId) return { ok: false, reason: 'not_found' }
    const outcome = clientCancelOutcome(b, now)
    if (!outcome.allowed) return { ok: false, reason: outcome.reason }

    await tx.update(bookings).set({ status: 'cancelled_client' }).where(eq(bookings.id, b.id))
    if (outcome.kind === 'refund_or_credit') await returnMoney(tx, b, b.clientId, choice === 'credit' ? 'credit' : 'original')

    const d = (await getBookingById(b.id, tx))!
    const m = messaging.withTx(tx)
    await m.cancelQueued(b.id, ['reminder_24h'])
    await m.send({
      clientId: b.clientId,
      bookingId: b.id,
      kind: 'cancellation',
      body: T.cancellation({
        ...tplOf(d),
        outcome: outcome.kind === 'forfeit' ? 'forfeit' : choice,
        amountKobo: b.depositKobo,
      }),
    })
    return { ok: true }
  })
}

/** Free reschedule (more than 24h out): same stylist, new time, deposit carries over. */
export async function rescheduleByClient(ref: string, newStartsAt: Date): Promise<ChangeResult> {
  const now = new Date()
  try {
    return await getDb().transaction(async (tx) => {
      const [b] = await tx.select().from(bookings).where(eq(bookings.ref, ref)).for('update')
      if (!b || !b.clientId) return { ok: false, reason: 'not_found' }
      const outcome = clientRescheduleOutcome(b, now)
      if (!outcome.allowed) return { ok: false, reason: outcome.reason }
      if (outcome.kind !== 'free') return { ok: false, reason: 'forfeit_required' }

      const [service] = await tx.select().from(services).where(eq(services.id, b.serviceId))
      await expireStaleHolds(tx, now)
      const key = dateKeyOf(newStartsAt)
      const sd = await loadStylistDays([b.stylistId], key, key, now, { tx, excludeBookingId: b.id })
      const day = getDaySlots({ dateKey: key, durationMin: service.durationMin, stylists: sd, now })
      const slot = day.slots.find((s) => s.startsAt.getTime() === newStartsAt.getTime())
      if (!slot?.available) return { ok: false, reason: 'taken' }

      await tx.update(bookings).set({ startsAt: slot.startsAt, endsAt: slot.endsAt }).where(eq(bookings.id, b.id))
      const d = (await getBookingById(b.id, tx))!
      const m = messaging.withTx(tx)
      await m.cancelQueued(b.id, ['reminder_24h'])
      await queueReminder(tx, d, tplOf(d), b.clientId, d.serviceId, d.stylistId, now)
      await m.send({ clientId: b.clientId, bookingId: b.id, kind: 'rescheduled', body: T.rescheduled(tplOf(d)) })
      return { ok: true }
    })
  } catch (e) {
    if (isOverlap(e)) return { ok: false, reason: 'taken' }
    throw e
  }
}

const tplOf = (d: BookingDetail) => ({
  ref: d.ref,
  clientName: d.client?.name ?? 'there',
  serviceName: d.service.name,
  stylistName: d.stylist.name,
  startsAt: d.startsAt,
  depositKobo: d.depositKobo,
  balanceKobo: d.balanceKobo,
})

// ── Studio actions ────────────────────────────────────────────

type StudioAction = 'arrived' | 'completed' | 'no_show' | 'cancel_salon'

const allowedFrom: Record<StudioAction, Booking['status'][]> = {
  arrived: ['confirmed'],
  completed: ['confirmed', 'arrived'],
  no_show: ['confirmed'],
  cancel_salon: ['confirmed', 'arrived'],
}

export async function studioAction(bookingId: string, action: StudioAction): Promise<ChangeResult> {
  return getDb().transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for('update')
    if (!b || !b.clientId) return { ok: false, reason: 'not_found' }
    if (!allowedFrom[action].includes(b.status)) return { ok: false, reason: 'wrong_status' }
    const d = (await getBookingById(b.id, tx))!
    const m = messaging.withTx(tx)

    switch (action) {
      case 'arrived':
        await tx.update(bookings).set({ status: 'arrived' }).where(eq(bookings.id, b.id))
        break
      case 'completed': {
        await tx.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, b.id))
        if (b.balanceKobo > 0)
          await tx.insert(paymentsT).values({ bookingId: b.id, type: 'balance', amountKobo: b.balanceKobo, method: 'in_salon', status: 'succeeded' })
        await m.cancelQueued(b.id, ['reminder_24h'])
        const token = await createRebookToken(tx, b.clientId, b.serviceId, b.stylistId)
        await m.schedule(
          { clientId: b.clientId, bookingId: b.id, kind: 'rebook', body: T.rebook({ clientName: d.client!.name, serviceName: d.service.name, stylistName: d.stylist.name, url: rebookUrl(token) }) },
          new Date(Date.now() + salon.messaging.rebookAfterDays * 24 * HOUR),
        )
        break
      }
      case 'no_show':
        await tx.update(bookings).set({ status: 'no_show' }).where(eq(bookings.id, b.id))
        await m.cancelQueued(b.id, ['reminder_24h'])
        await m.send({ clientId: b.clientId, bookingId: b.id, kind: 'no_show', body: T.noShow(tplOf(d)) })
        break
      case 'cancel_salon': {
        const { refundKobo } = salonCancelOutcome(b)
        await tx.update(bookings).set({ status: 'cancelled_salon' }).where(eq(bookings.id, b.id))
        await returnMoney(tx, b, b.clientId, 'original')
        await m.cancelQueued(b.id, ['reminder_24h'])
        await m.send({ clientId: b.clientId, bookingId: b.id, kind: 'cancellation', body: T.cancellation({ ...tplOf(d), outcome: 'salon_refund', amountKobo: refundKobo }) })
        break
      }
    }
    return { ok: true }
  })
}

// ── Returning clients ─────────────────────────────────────────

export async function lastVisit(clientId: string) {
  const [row] = await getDb()
    .select({ b: bookings, service: services, stylist: stylists })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(stylists, eq(stylists.id, bookings.stylistId))
    .where(and(eq(bookings.clientId, clientId), inArray(bookings.status, ['completed', 'arrived', 'confirmed'])))
    .orderBy(desc(bookings.startsAt))
    .limit(1)
  return row ?? null
}

export async function getClient(id: string) {
  const [c] = await getDb().select().from(clients).where(eq(clients.id, id))
  return c ?? null
}

export async function getClientByPhone(phone: string) {
  const [c] = await getDb().select().from(clients).where(eq(clients.phone, phone))
  return c ?? null
}

export async function findRebookToken(token: string) {
  const [t] = await getDb().select().from(rebookTokens).where(eq(rebookTokens.token, token))
  if (!t || t.expiresAt < new Date()) return null
  return t
}

export async function getLatestMessage(bookingId: string, kind: 'receipt' | 'rescheduled' | 'cancellation') {
  const { messages } = schema
  const [m] = await getDb()
    .select()
    .from(messages)
    .where(and(eq(messages.bookingId, bookingId), eq(messages.kind, kind)))
    .orderBy(desc(messages.scheduledFor))
    .limit(1)
  return m ?? null
}

/** How a cancelled booking's deposit was settled: refunded, turned into credit, or kept. */
export async function depositOutcome(bookingId: string) {
  const rows = await getDb()
    .select()
    .from(paymentsT)
    .where(and(eq(paymentsT.bookingId, bookingId), eq(paymentsT.type, 'refund')))
  const credit = rows.filter((r) => r.method === 'credit').reduce((a, r) => a + r.amountKobo, 0)
  const original = rows.filter((r) => r.method !== 'credit').reduce((a, r) => a + r.amountKobo, 0)
  return { creditKobo: credit, refundKobo: original, kept: credit + original === 0 }
}
