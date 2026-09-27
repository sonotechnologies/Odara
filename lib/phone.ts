import { salon } from '@/config/salon'

const { countryCode, nationalLength } = salon.phone

/**
 * Normalise what someone types into E.164. Accepts "0803 555 0192",
 * "803 555 0192", "+234 803 555 0192", "2348035550192". Returns null if it
 * doesn't look like a valid mobile number.
 */
export function toE164(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith(countryCode)) digits = digits.slice(countryCode.length)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length !== nationalLength) return null
  return `+${countryCode}${digits}`
}

/** "+2348035550192" → "+234 803 555 0192" */
export function formatPhone(e164: string): string {
  const n = e164.replace(`+${countryCode}`, '')
  return `+${countryCode} ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

/** "+234 803 ··· 0192" for places where the full number isn't needed. */
export function maskPhone(e164: string): string {
  const n = e164.replace(`+${countryCode}`, '')
  return `+${countryCode} ${n.slice(0, 3)} ··· ${n.slice(-4)}`
}
