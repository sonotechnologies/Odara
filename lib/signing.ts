/**
 * Tiny signed-token helper (HMAC-SHA256 over a JSON payload) using Web Crypto,
 * so it works in both the Node runtime and proxy.ts.
 */
const enc = new TextEncoder()

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set (16+ chars) in production.')
  return 'odara-dev-secret-not-for-production'
}

let keyPromise: Promise<CryptoKey> | null = null
const key = () =>
  (keyPromise ??= crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']))

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export async function sign<T extends object>(payload: T, ttlSeconds: number): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })))
  const sig = b64url(await crypto.subtle.sign('HMAC', await key(), enc.encode(body)))
  return `${body}.${sig}`
}

export async function verify<T extends object>(token: string | undefined | null): Promise<(T & { exp: number }) | null> {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), fromB64url(sig), enc.encode(body))
    if (!ok) return null
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body)))
    if (typeof data.exp !== 'number' || data.exp < Date.now() / 1000) return null
    return data
  } catch {
    return null
  }
}
