import { describe, expect, it } from 'vitest'
import { applyCredit, calculateDeposit, defaultDepositPercent, depositSplit } from '@/lib/deposit'
import { formatMoney, toKobo } from '@/lib/money'

describe('defaultDepositPercent', () => {
  it('is 30% for services under three hours', () => {
    expect(defaultDepositPercent(30)).toBe(30)
    expect(defaultDepositPercent(150)).toBe(30)
    expect(defaultDepositPercent(179)).toBe(30)
  })
  it('is 50% for services of three hours or more', () => {
    expect(defaultDepositPercent(180)).toBe(50)
    expect(defaultDepositPercent(360)).toBe(50)
  })
})

describe('calculateDeposit', () => {
  it.each([
    ['Silk press', 35_000, 120, 10_500],
    ['Gel manicure', 15_000, 60, 4_500],
    ['Classic lash set', 25_000, 90, 7_500],
    ['Knotless braids', 85_000, 360, 42_500],
    ['Frontal wig install', 45_000, 180, 22_500],
    ['Loc retwist & style', 28_000, 120, 8_500], // 8,400 → nearest ₦500
    ['Wash, treat & style', 20_000, 90, 6_000],
    ['Brow shape & tint', 10_000, 30, 3_000],
  ])('%s: ₦%i → ₦%i', (_name, price, duration, expected) => {
    expect(calculateDeposit(toKobo(price), defaultDepositPercent(duration))).toBe(toKobo(expected))
  })

  it('never goes below the ₦2,000 minimum', () => {
    expect(calculateDeposit(toKobo(5_000), 30)).toBe(toKobo(2_000))
    expect(calculateDeposit(toKobo(6_000), 30)).toBe(toKobo(2_000))
  })

  it('rounds to the nearest ₦500', () => {
    expect(calculateDeposit(toKobo(8_000), 30)).toBe(toKobo(2_500)) // 2,400
    expect(calculateDeposit(toKobo(41_000), 30)).toBe(toKobo(12_500)) // 12,300
    expect(calculateDeposit(toKobo(40_500), 30)).toBe(toKobo(12_000)) // 12,150
  })

  it('never exceeds the price', () => {
    expect(calculateDeposit(toKobo(1_500), 30)).toBe(toKobo(1_500))
  })

  it('always returns integer kobo', () => {
    for (let p = 1_000; p < 100_000; p += 777) expect(Number.isInteger(calculateDeposit(toKobo(p), 30))).toBe(true)
  })
})

describe('depositSplit', () => {
  it('splits into now and on the day, adding back up to the total', () => {
    const s = depositSplit(toKobo(85_000), 50)
    expect(s).toEqual({ totalKobo: 8_500_000, depositKobo: 4_250_000, balanceKobo: 4_250_000 })
    const t = depositSplit(toKobo(35_000), 30)
    expect(t.depositKobo + t.balanceKobo).toBe(t.totalKobo)
  })
})

describe('applyCredit', () => {
  it('takes credit off what is paid now', () => {
    expect(applyCredit(toKobo(10_500), toKobo(5_000))).toEqual({ creditUsedKobo: 500_000, dueNowKobo: 550_000 })
  })
  it('caps at the deposit when credit covers it all', () => {
    expect(applyCredit(toKobo(4_500), toKobo(5_000))).toEqual({ creditUsedKobo: 450_000, dueNowKobo: 0 })
  })
  it('does nothing with no credit', () => {
    expect(applyCredit(toKobo(4_500), 0)).toEqual({ creditUsedKobo: 0, dueNowKobo: 450_000 })
  })
})

describe('formatMoney', () => {
  it('formats naira from kobo', () => {
    expect(formatMoney(8_500_000)).toBe('₦85,000')
    expect(formatMoney(2_550_000, { decimals: true })).toBe('₦25,500.00')
    expect(formatMoney(-500_000)).toBe('−₦5,000')
  })
})
