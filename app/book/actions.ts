'use server'

import { createHmac } from 'node:crypto'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { confirmDeposit, createHold, getClient, getClientByPhone, getHold, reHold, startCheckout } from '@/lib/data/bookings'
import { getServiceById } from '@/lib/data/catalog'
import { applyCredit } from '@/lib/deposit'
import { otpCode } from '@/lib/ids'
import { demoPayments, payments } from '@/lib/payments'
import { toE164 } from '@/lib/phone'
import {
  clearPendingOtp,
  getClientSession,
  getPendingOtp,
  setClientSession,
  setPendingOtp,
} from '@/lib/session'

const uuid = z.string().uuid()

// ── Step 3: place a hold ──────────────────────────────────────
const HoldInput = z.object({
  serviceId: uuid,
  stylist: z.union([z.literal('any'), uuid]),
  startsAt: z.string().datetime(),
})

export async function holdSlot(input: z.input<typeof HoldInput>): Promise<{ ok: true; id: string } | { ok: false; reason: 'taken' | 'invalid' }> {
  const p = HoldInput.safeParse(input)
  if (!p.success) return { ok: false, reason: 'invalid' }
  const session = await getClientSession()
  const r = await createHold({ serviceId: p.data.serviceId, stylistId: p.data.stylist, startsAt: new Date(p.data.startsAt), clientId: session?.clientId })
  return r.ok ? { ok: true, id: r.booking.id } : r
}

export async function holdAgain(formData: FormData) {
  const id = uuid.safeParse(formData.get('id'))
  if (!id.success) redirect('/book')
  const r = await reHold(id.data)
  if (r.ok) redirect(`/book/hold/${r.booking.id}`)
  const old = await getHold(id.data)
  redirect(old ? `/book/time?service=${old.service.slug}&stylist=${old.stylist.slug}&notice=gone` : '/book')
}

// ── Step 4: who you are → checkout ────────────────────────────
export type CheckoutFormState = { errors?: { name?: string; phone?: string; form?: string }; values?: { name: string; phone: string } }

const Who = z.object({
  name: z.string().trim().min(2, 'Please add your name.').max(80, 'That name is a little long.'),
  phone: z.string().trim().min(1, 'We need a WhatsApp number for your receipt.'),
})

export async function beginCheckout(holdId: string, _prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const raw = { name: String(formData.get('name') ?? ''), phone: String(formData.get('phone') ?? '') }
  const p = Who.safeParse(raw)
  const errors: NonNullable<CheckoutFormState['errors']> = {}
  if (!p.success) for (const i of p.error.issues) errors[i.path[0] as 'name' | 'phone'] ??= i.message
  const phone = toE164(raw.phone)
  if (!errors.phone && !phone) errors.phone = 'This number looks short. Check and try again.'
  if (Object.keys(errors).length) return { errors, values: raw }

  const r = await startCheckout(holdId, { name: p.data!.name, phone: phone! })
  if (r.kind === 'error') {
    if (r.reason === 'expired') redirect(`/book/hold/${holdId}`)
    return { errors: { form: 'Something went wrong. Please try again.' }, values: raw }
  }
  if (r.kind === 'confirmed') redirect(`/book/confirmed/${r.ref}`)
  redirect(r.url)
}

// ── Step 5: simulated checkout ────────────────────────────────
const Sim = z.object({
  id: uuid,
  pref: z.string().min(4),
  outcome: z.enum(['success', 'failure']),
  method: z.enum(['card', 'bank_transfer', 'ussd']),
  card: z.string().optional(),
})

export async function simulatePayment(formData: FormData) {
  const p = Sim.safeParse(Object.fromEntries(formData))
  if (!p.success) redirect('/book')
  const { id, pref, method, card } = p.data
  const hold = await getHold(id)
  if (!hold || !hold.client) redirect('/book')
  if (hold.status === 'confirmed') redirect(`/book/confirmed/${hold.ref}`)

  // What's due now is always recomputed on the server, never trusted from the form.
  const { dueNowKobo } = applyCredit(hold.depositKobo, hold.client.creditKobo)
  const declined = p.data.outcome === 'failure' || (method === 'card' && (card ?? '').replace(/\D/g, '').endsWith('0000'))
  demoPayments.simulate(
    pref,
    dueNowKobo,
    declined ? { ok: false, reason: method === 'card' ? 'declined_by_issuer' : 'not_received' } : { ok: true, method },
  )

  const v = await payments.verify(pref)
  if (v.status !== 'succeeded') {
    const last4 = (card ?? '').replace(/\D/g, '').slice(-4)
    redirect(`/book/hold/${id}?failed=${method}${last4 ? `&card=${last4}` : ''}`)
  }
  const c = await confirmDeposit(id, { providerRef: v.providerRef, amountKobo: v.amountKobo, method: v.method })
  if (c.ok) redirect(`/book/confirmed/${c.ref}`)
  if (c.reason === 'slot_lost') redirect(`/book/time?service=${hold.service.slug}&stylist=${hold.stylist.slug}&notice=lost`)
  redirect(`/book/hold/${id}`)
}

// ── Returning clients: phone + simulated OTP ──────────────────
export type OtpState = { step: 'phone' | 'code'; phone?: string; demoCode?: string; error?: string }

const hashCode = (phone: string, code: string) =>
  createHmac('sha256', process.env.SESSION_SECRET ?? 'odara-dev-secret-not-for-production').update(`${phone}:${code}`).digest('base64url')

export async function requestOtp(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const phone = toE164(String(formData.get('phone') ?? ''))
  if (!phone) return { step: 'phone', error: 'That number doesn’t look right. Check and try again.' }
  const client = await getClientByPhone(phone)
  if (!client) return { step: 'phone', phone, error: 'We don’t have a booking for this number yet. Book below and we’ll remember you next time.' }
  const code = otpCode()
  await setPendingOtp({ phone, codeHash: hashCode(phone, code), attempts: 0 })
  // Demo: the code is shown in a toast instead of sent by WhatsApp/SMS.
  return { step: 'code', phone, demoCode: code }
}

export async function verifyOtp(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const pending = await getPendingOtp()
  if (!pending) return { step: 'phone', error: 'That code has expired. Ask for a new one.' }
  const code = String(formData.get('code') ?? '').replace(/\D/g, '')
  if (pending.attempts >= 5) {
    await clearPendingOtp()
    return { step: 'phone', error: 'Too many tries. Ask for a new code.' }
  }
  if (hashCode(pending.phone, code) !== pending.codeHash) {
    await setPendingOtp({ ...pending, attempts: pending.attempts + 1 })
    return { step: 'code', phone: pending.phone, error: 'That code isn’t right. Check the message and try again.' }
  }
  const client = await getClientByPhone(pending.phone)
  if (!client) return { step: 'phone', error: 'We couldn’t find that number.' }
  await clearPendingOtp()
  await setClientSession({ clientId: client.id }, formData.get('remember') === 'on')
  redirect('/book/again')
}

// ── Returning clients: one-screen hold + pay ──────────────────
export async function fastPay(formData: FormData) {
  const session = await getClientSession()
  if (!session) redirect('/book/again')
  const client = await getClient(session.clientId)
  if (!client) redirect('/book/again')
  const p = HoldInput.safeParse({ serviceId: formData.get('serviceId'), stylist: formData.get('stylist'), startsAt: formData.get('startsAt') })
  if (!p.success) redirect('/book/again?notice=pick')
  const service = await getServiceById(p.data.serviceId)
  if (!service) redirect('/book/again')

  const hold = await createHold({ serviceId: service.id, stylistId: p.data.stylist, startsAt: new Date(p.data.startsAt), clientId: client.id })
  if (!hold.ok) redirect(`/book/again?service=${service.slug}&notice=taken`)
  const r = await startCheckout(hold.booking.id, { name: client.name, phone: client.phone })
  if (r.kind === 'confirmed') redirect(`/book/confirmed/${r.ref}`)
  if (r.kind === 'redirect') redirect(r.url)
  redirect(`/book/hold/${hold.booking.id}`)
}

export async function signOutClient() {
  const { clearClientSession } = await import('@/lib/session')
  await clearClientSession()
  redirect('/book/again')
}
