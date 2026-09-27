/**
 * Cancellation and reschedule policy as pure functions. Every number comes
 * from config/salon.ts; every screen that talks about the rules asks here.
 *
 * | Situation                         | Outcome                                   |
 * | --------------------------------- | ----------------------------------------- |
 * | Client reschedules > 24h before   | Free, deposit carries over                |
 * | Client cancels > 24h before       | Refund to original method, or credit      |
 * | Client cancels/reschedules ≤ 24h  | Deposit forfeited (stated before confirm) |
 * | No-show (marked by salon)         | Deposit forfeited                         |
 * | Salon cancels                     | Full refund, always                       |
 */
import { salon } from '@/config/salon'
import type { BookingStatus } from '@/db/schema'
import { formatMoney } from '@/lib/money'
import { fmtDayTimeComma } from '@/lib/time'

const HOUR = 3_600_000

export type PolicyBooking = {
  startsAt: Date
  status: BookingStatus
  depositKobo: number
}

export type ClientChange =
  | { allowed: false; reason: 'not_confirmed' | 'started' }
  | { allowed: true; kind: 'free'; deadline: Date }
  | { allowed: true; kind: 'forfeit'; forfeitKobo: number }

export type ClientCancel =
  | { allowed: false; reason: 'not_confirmed' | 'started' }
  | { allowed: true; kind: 'refund_or_credit'; amountKobo: number; deadline: Date }
  | { allowed: true; kind: 'forfeit'; forfeitKobo: number }

/** The last moment a client can move or cancel without losing the deposit. */
export const freeChangeDeadline = (startsAt: Date) =>
  new Date(startsAt.getTime() - salon.policy.freeChangeHours * HOUR)

export const isInFreeWindow = (startsAt: Date, now: Date) => now < freeChangeDeadline(startsAt)

function manageable(b: PolicyBooking, now: Date): { ok: true } | { ok: false; reason: 'not_confirmed' | 'started' } {
  if (b.status !== 'confirmed') return { ok: false, reason: 'not_confirmed' }
  if (now >= b.startsAt) return { ok: false, reason: 'started' }
  return { ok: true }
}

export function clientRescheduleOutcome(b: PolicyBooking, now: Date): ClientChange {
  const m = manageable(b, now)
  if (!m.ok) return { allowed: false, reason: m.reason }
  if (isInFreeWindow(b.startsAt, now)) return { allowed: true, kind: 'free', deadline: freeChangeDeadline(b.startsAt) }
  return { allowed: true, kind: 'forfeit', forfeitKobo: b.depositKobo }
}

export function clientCancelOutcome(b: PolicyBooking, now: Date): ClientCancel {
  const m = manageable(b, now)
  if (!m.ok) return { allowed: false, reason: m.reason }
  if (isInFreeWindow(b.startsAt, now))
    return { allowed: true, kind: 'refund_or_credit', amountKobo: b.depositKobo, deadline: freeChangeDeadline(b.startsAt) }
  return { allowed: true, kind: 'forfeit', forfeitKobo: b.depositKobo }
}

/** No-show, marked by the salon: the deposit covers the stylist's time. */
export const noShowOutcome = (b: PolicyBooking) => ({ kind: 'forfeit' as const, forfeitKobo: b.depositKobo })

/** Salon cancels: always a full refund of whatever was paid, including credit used. */
export const salonCancelOutcome = (b: PolicyBooking) => ({ kind: 'full_refund' as const, refundKobo: b.depositKobo })

export type CurrentRule = {
  tone: 'free' | 'locked' | 'closed'
  headline: string
  detail: string
}

/** The rule that applies right now, in the words the booking page shows. */
export function currentRule(b: PolicyBooking, now: Date): CurrentRule {
  const deposit = formatMoney(b.depositKobo)
  const m = manageable(b, now)
  if (!m.ok) {
    return m.reason === 'started'
      ? { tone: 'closed', headline: 'This booking has started.', detail: 'Message us on WhatsApp if anything has changed.' }
      : { tone: 'closed', headline: 'This booking is closed.', detail: 'It can no longer be changed online.' }
  }
  if (isInFreeWindow(b.startsAt, now)) {
    return {
      tone: 'free',
      headline: `Free to reschedule until ${fmtDayTimeComma(freeChangeDeadline(b.startsAt))}.`,
      detail: 'Cancel before then and your deposit comes back as a refund or credit.',
    }
  }
  return {
    tone: 'locked',
    headline: `You’re within ${salon.policy.freeChangeHours} hours of your booking.`,
    detail: `Cancelling or moving it now means the ${deposit} deposit is kept. Your stylist has turned others away for this time.`,
  }
}

/** The three short lines shown on the hold screen, before anyone pays. */
export function holdPolicyLines(startsAt: Date, now: Date): string[] {
  const h = salon.policy.freeChangeHours
  if (!isInFreeWindow(startsAt, now)) {
    return [
      `This time is less than ${h}h away.`,
      'If you cancel or move it, the deposit is kept.',
      'If we cancel, you get a full refund.',
    ]
  }
  return [
    `Free to reschedule until ${fmtDayTimeComma(freeChangeDeadline(startsAt))}.`,
    'Cancel before then for a refund or credit.',
    `Within ${h}h or no-show, the deposit is kept.`,
  ]
}
