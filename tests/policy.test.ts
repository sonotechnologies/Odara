import { describe, expect, it } from 'vitest'
import {
  clientCancelOutcome,
  clientRescheduleOutcome,
  currentRule,
  freeChangeDeadline,
  holdPolicyLines,
  noShowOutcome,
  salonCancelOutcome,
  type PolicyBooking,
} from '@/lib/policy'

// Wed 7 Oct 2026, 10:00 in Lagos (UTC+1) = 09:00Z
const startsAt = new Date('2026-10-07T09:00:00Z')
const booking: PolicyBooking = { startsAt, status: 'confirmed', depositKobo: 4_250_000 }
const hoursBefore = (h: number) => new Date(startsAt.getTime() - h * 3_600_000)

describe('freeChangeDeadline', () => {
  it('is 24 hours before the start', () => {
    expect(freeChangeDeadline(startsAt).toISOString()).toBe('2026-10-06T09:00:00.000Z')
  })
})

describe('client reschedule', () => {
  it('is free more than 24h before, and the deposit carries over', () => {
    const r = clientRescheduleOutcome(booking, hoursBefore(48))
    expect(r).toMatchObject({ allowed: true, kind: 'free' })
  })
  it('forfeits the deposit within 24h', () => {
    expect(clientRescheduleOutcome(booking, hoursBefore(23))).toEqual({ allowed: true, kind: 'forfeit', forfeitKobo: 4_250_000 })
  })
  it('treats exactly 24h before as inside the window', () => {
    expect(clientRescheduleOutcome(booking, hoursBefore(24))).toMatchObject({ kind: 'forfeit' })
  })
  it('is not allowed once the booking has started', () => {
    expect(clientRescheduleOutcome(booking, hoursBefore(0))).toEqual({ allowed: false, reason: 'started' })
  })
  it('is not allowed for non-confirmed bookings', () => {
    for (const status of ['hold', 'arrived', 'completed', 'no_show', 'cancelled_client', 'cancelled_salon', 'expired'] as const) {
      expect(clientRescheduleOutcome({ ...booking, status }, hoursBefore(72))).toEqual({ allowed: false, reason: 'not_confirmed' })
    }
  })
})

describe('client cancel', () => {
  it('offers refund or credit more than 24h before', () => {
    expect(clientCancelOutcome(booking, hoursBefore(25))).toMatchObject({ allowed: true, kind: 'refund_or_credit', amountKobo: 4_250_000 })
  })
  it('forfeits the deposit within 24h', () => {
    expect(clientCancelOutcome(booking, hoursBefore(2))).toEqual({ allowed: true, kind: 'forfeit', forfeitKobo: 4_250_000 })
  })
  it('is not allowed after the start', () => {
    expect(clientCancelOutcome(booking, new Date(startsAt.getTime() + 60_000))).toEqual({ allowed: false, reason: 'started' })
  })
})

describe('salon-side outcomes', () => {
  it('no-show forfeits the deposit', () => {
    expect(noShowOutcome(booking)).toEqual({ kind: 'forfeit', forfeitKobo: 4_250_000 })
  })
  it('salon cancel is always a full refund, even inside 24h', () => {
    expect(salonCancelOutcome(booking)).toEqual({ kind: 'full_refund', refundKobo: 4_250_000 })
  })
})

describe('currentRule', () => {
  it('names the free-reschedule deadline in salon time', () => {
    const r = currentRule(booking, hoursBefore(72))
    expect(r.tone).toBe('free')
    expect(r.headline).toBe('Free to reschedule until Tue 6 Oct, 10:00.')
  })
  it('states the forfeit amount inside 24h', () => {
    const r = currentRule(booking, hoursBefore(3))
    expect(r.tone).toBe('locked')
    expect(r.detail).toContain('₦42,500 deposit is kept')
  })
  it('closes after the start', () => {
    expect(currentRule(booking, hoursBefore(-1)).tone).toBe('closed')
  })
})

describe('holdPolicyLines', () => {
  it('shows three short lines with the deadline', () => {
    const lines = holdPolicyLines(startsAt, hoursBefore(96))
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('Free to reschedule until Tue 6 Oct, 10:00.')
  })
  it('warns up front when the slot is already inside 24h', () => {
    expect(holdPolicyLines(startsAt, hoursBefore(5))[1]).toContain('deposit is kept')
  })
})
