'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { cancelByClient, getBookingByRef, rescheduleByClient } from '@/lib/data/bookings'

const Ref = z.string().regex(/^ODR-[A-Z0-9]{4}$/i)

export async function findBooking(formData: FormData) {
  const ref = String(formData.get('ref') ?? '').trim().toUpperCase().replace(/^(ODR)?-?/, 'ODR-')
  if (!Ref.safeParse(ref).success) redirect('/booking?error=format')
  const b = await getBookingByRef(ref)
  if (!b || b.status === 'hold' || b.status === 'expired') redirect('/booking?error=notfound')
  redirect(`/booking/${b.ref}`)
}

export async function cancelBooking(ref: string, formData: FormData) {
  if (!Ref.safeParse(ref).success) redirect('/booking')
  const choice = formData.get('choice') === 'credit' ? 'credit' : 'refund'
  const r = await cancelByClient(ref, choice)
  redirect(`/booking/${ref}?${r.ok ? `cancelled=${choice}` : `error=${r.reason}`}`)
}

export async function rescheduleBooking(ref: string, iso: string): Promise<{ ok: false; reason: string }> {
  const at = z.string().datetime().safeParse(iso)
  if (!Ref.safeParse(ref).success || !at.success) return { ok: false, reason: 'invalid' }
  const r = await rescheduleByClient(ref, new Date(at.data))
  if (r.ok) redirect(`/booking/${ref}?moved=1`)
  return r
}

/** Inside 24h a move is a new booking: the old deposit is kept, a new one holds the new time. */
export async function cancelAndRebook(ref: string) {
  if (!Ref.safeParse(ref).success) redirect('/booking')
  const b = await getBookingByRef(ref)
  if (!b) redirect('/booking')
  const r = await cancelByClient(ref, 'refund')
  if (!r.ok) redirect(`/booking/${ref}?error=${r.reason}`)
  redirect(`/book/time?service=${b.service.slug}&stylist=${b.stylist.slug}`)
}
