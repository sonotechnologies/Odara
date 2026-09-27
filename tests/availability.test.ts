import { describe, expect, it } from 'vitest'
import { getDaySlots, nextOpenSlots, type StylistDay } from '@/lib/availability'
import { atSalonTime } from '@/lib/time'

const WED = '2026-10-07' // Wednesday
const SUN = '2026-10-11'
const MON = '2026-10-12'
const past = new Date('2026-09-01T00:00:00Z')

const allWeek = { 0: { start: '12:00', end: '18:00' }, 2: { start: '09:00', end: '19:00' }, 3: { start: '09:00', end: '19:00' }, 4: { start: '09:00', end: '19:00' }, 5: { start: '09:00', end: '19:00' }, 6: { start: '09:00', end: '19:00' } }
const stylist = (id: string, over: Partial<StylistDay> = {}): StylistDay => ({ id, hours: allWeek, timeOff: [], busy: [], ...over })
const at = (key: string, hm: string) => atSalonTime(key, hm)
const iv = (key: string, a: string, b: string) => ({ start: at(key, a), end: at(key, b) })

describe('getDaySlots', () => {
  it('builds a 30-minute grid inside opening hours that fits the full service', () => {
    const d = getDaySlots({ dateKey: WED, durationMin: 360, stylists: [stylist('a')], now: past })
    expect(d.closed).toBe(false)
    expect(d.slots.map((s) => s.time)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00'])
    expect(d.slots.every((s) => s.available)).toBe(true)
  })

  it('marks closed days closed (Monday)', () => {
    const d = getDaySlots({ dateKey: MON, durationMin: 60, stylists: [stylist('a')], now: past })
    expect(d).toMatchObject({ closed: true, slots: [] })
  })

  it('uses Sunday hours', () => {
    const d = getDaySlots({ dateKey: SUN, durationMin: 120, stylists: [stylist('a')], now: past })
    expect(d.slots[0].time).toBe('12:00')
    expect(d.slots.at(-1)!.time).toBe('16:00')
  })

  it('keeps taken slots in the grid, marked unavailable', () => {
    const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [stylist('a', { busy: [iv(WED, '10:00', '11:00')] })], now: past })
    const t = Object.fromEntries(d.slots.map((s) => [s.time, s.available]))
    expect(t['09:00']).toBe(true)
    expect(t['09:30']).toBe(false) // would run into 10:00
    expect(t['10:00']).toBe(false)
    expect(t['10:30']).toBe(false)
    expect(t['11:00']).toBe(true) // back-to-back is fine
  })

  it('requires the stylist free for the full duration', () => {
    const d = getDaySlots({ dateKey: WED, durationMin: 360, stylists: [stylist('a', { busy: [iv(WED, '15:00', '16:00')] })], now: past })
    expect(d.slots.filter((s) => s.available).map((s) => s.time)).toEqual(['09:00'])
  })

  it('respects the stylist’s own hours inside salon hours', () => {
    const s = stylist('a', { hours: { ...allWeek, 3: { start: '10:00', end: '17:00' } } })
    const d = getDaySlots({ dateKey: WED, durationMin: 120, stylists: [s], now: past })
    const open = d.slots.filter((x) => x.available).map((x) => x.time)
    expect(open[0]).toBe('10:00')
    expect(open.at(-1)).toBe('15:00')
    expect(d.slots.find((x) => x.time === '09:00')!.available).toBe(false)
  })

  it('treats a stylist who does not work that weekday as unavailable', () => {
    const { 3: _wed, ...rest } = allWeek
    const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [stylist('a', { hours: rest })], now: past })
    expect(d.full).toBe(true)
  })

  it('blocks time off', () => {
    const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [stylist('a', { timeOff: [iv(WED, '00:00', '23:59')] })], now: past })
    expect(d.full).toBe(true)
    expect(d.slots.length).toBeGreaterThan(0)
  })

  it('drops start times that are in the past or inside the lead time', () => {
    const now = at(WED, '11:10')
    const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [stylist('a')], now, minLeadMin: 60 })
    expect(d.slots[0].time).toBe('12:30')
  })

  describe('Any available', () => {
    it('is open if at least one qualified stylist is free', () => {
      const a = stylist('a', { busy: [iv(WED, '09:00', '19:00')] })
      const b = stylist('b')
      const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [a, b], now: past })
      expect(d.slots.every((s) => s.available && s.stylistId === 'b')).toBe(true)
    })

    it('assigns the stylist with the fewest bookings that day', () => {
      const a = stylist('a', { busy: [iv(WED, '17:00', '18:00'), iv(WED, '18:00', '19:00')] })
      const b = stylist('b', { busy: [iv(WED, '18:00', '19:00')] })
      const c = stylist('c', { busy: [iv(WED, '09:00', '10:00')] })
      const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [a, b, c], now: past })
      expect(d.slots.find((s) => s.time === '12:00')!.stylistId).toBe('b') // b and c tie on 1; b listed first
      expect(d.slots.find((s) => s.time === '09:00')!.stylistId).toBe('b') // c busy
    })

    it('is taken only when every stylist is busy', () => {
      const a = stylist('a', { busy: [iv(WED, '10:00', '11:00')] })
      const b = stylist('b', { busy: [iv(WED, '10:00', '11:00')] })
      const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [a, b], now: past })
      expect(d.slots.find((s) => s.time === '10:00')!.available).toBe(false)
    })
  })

  it('reports a full day when every slot is taken', () => {
    const d = getDaySlots({ dateKey: WED, durationMin: 60, stylists: [stylist('a', { busy: [iv(WED, '09:00', '19:00')] })], now: past })
    expect(d.full).toBe(true)
  })
})

describe('nextOpenSlots', () => {
  it('collects the first N open slots across days', () => {
    const busy = [iv(WED, '09:00', '19:00')]
    const days = [WED, '2026-10-08'].map((k) => getDaySlots({ dateKey: k, durationMin: 120, stylists: [stylist('a', { busy })], now: past }))
    const next = nextOpenSlots(days, 3)
    expect(next.map((s) => s.time)).toEqual(['09:00', '09:30', '10:00'])
    expect(next[0].startsAt.toISOString()).toBe('2026-10-08T08:00:00.000Z')
  })
})
