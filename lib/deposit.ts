import { salon } from '@/config/salon'

const cfg = salon.deposit

/** 30% by default, 50% for services of three hours or more. */
export function defaultDepositPercent(durationMin: number): number {
  return durationMin >= cfg.longServiceMinutes ? cfg.longServicePercent : cfg.defaultPercent
}

/**
 * deposit = max(round(price × pct), minimum), rounded to the nearest ₦500 and
 * never more than the price itself. All values in kobo.
 */
export function calculateDeposit(priceKobo: number, percent: number): number {
  if (priceKobo <= 0) return 0
  const raw = Math.max(Math.round((priceKobo * percent) / 100), cfg.minimumKobo)
  const rounded = Math.round(raw / cfg.roundToKobo) * cfg.roundToKobo
  return Math.min(rounded, priceKobo)
}

export type Split = { totalKobo: number; depositKobo: number; balanceKobo: number }

/** The deposit is always presented as a split, never as a lone total. */
export function depositSplit(priceKobo: number, percent: number): Split {
  const depositKobo = calculateDeposit(priceKobo, percent)
  return { totalKobo: priceKobo, depositKobo, balanceKobo: priceKobo - depositKobo }
}

/** Salon credit comes off what's paid now; the deposit's value is unchanged. */
export function applyCredit(depositKobo: number, creditKobo: number) {
  const creditUsedKobo = Math.max(0, Math.min(depositKobo, creditKobo))
  return { creditUsedKobo, dueNowKobo: depositKobo - creditUsedKobo }
}
