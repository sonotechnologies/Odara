import 'server-only'
import { cookies } from 'next/headers'
import { salon } from '@/config/salon'
import { sign, verify } from '@/lib/signing'

export const STUDIO_COOKIE = 'odara_studio'
const CLIENT_COOKIE = 'odara_client'
const OTP_COOKIE = 'odara_otp'

const secure = process.env.NODE_ENV === 'production'
const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' }

// ── Studio owner ──────────────────────────────────────────────
export type StudioSession = { ownerId: string; name: string }

export async function setStudioSession(s: StudioSession) {
  const ttl = 60 * 60 * 12
  ;(await cookies()).set(STUDIO_COOKIE, await sign(s, ttl), { ...base, maxAge: ttl })
}
export async function getStudioSession() {
  return verify<StudioSession>((await cookies()).get(STUDIO_COOKIE)?.value)
}
export async function clearStudioSession() {
  ;(await cookies()).delete(STUDIO_COOKIE)
}

// ── Client (phone-verified) ───────────────────────────────────
export type ClientSession = { clientId: string }

/** `remember` keeps the device signed in for 90 days; otherwise it lasts the browser session. */
export async function setClientSession(s: ClientSession, remember: boolean) {
  const long = 60 * 60 * 24 * salon.client.rememberDays
  const token = await sign(s, remember ? long : 60 * 60 * 12)
  ;(await cookies()).set(CLIENT_COOKIE, token, remember ? { ...base, maxAge: long } : base)
}
export async function getClientSession() {
  return verify<ClientSession>((await cookies()).get(CLIENT_COOKIE)?.value)
}
export async function clearClientSession() {
  ;(await cookies()).delete(CLIENT_COOKIE)
}

// ── Pending OTP (stateless: a signed hash, never the code itself) ──
export type PendingOtp = { phone: string; codeHash: string; attempts: number }

export async function setPendingOtp(p: PendingOtp) {
  const ttl = 60 * salon.client.otpMinutes
  ;(await cookies()).set(OTP_COOKIE, await sign(p, ttl), { ...base, maxAge: ttl })
}
export async function getPendingOtp() {
  return verify<PendingOtp>((await cookies()).get(OTP_COOKIE)?.value)
}
export async function clearPendingOtp() {
  ;(await cookies()).delete(OTP_COOKIE)
}
