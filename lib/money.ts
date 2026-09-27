import { salon } from '@/config/salon'

const { symbol, minorPerMajor } = salon.currency

/** "₦85,000", or "₦25,500.00" with `decimals: true`. Money is always integer kobo. */
export function formatMoney(kobo: number, opts: { decimals?: boolean } = {}): string {
  const major = kobo / minorPerMajor
  const digits = opts.decimals ? 2 : Number.isInteger(major) ? 0 : 2
  const sign = major < 0 ? '−' : ''
  return (
    sign +
    symbol +
    Math.abs(major).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  )
}

export const toKobo = (naira: number) => Math.round(naira * minorPerMajor)
