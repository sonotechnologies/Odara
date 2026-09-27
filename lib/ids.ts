import { randomBytes, randomInt } from 'node:crypto'

// No 0/O/1/I/L so references survive being read aloud or typed from WhatsApp.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** "ODR-4K7Q" style booking reference. */
export function bookingRef(): string {
  let s = ''
  for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return `ODR-${s}`
}

export const urlToken = (bytes = 18) => randomBytes(bytes).toString('base64url')

export const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
