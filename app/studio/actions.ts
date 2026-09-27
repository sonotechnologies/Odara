'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { studioAction } from '@/lib/data/bookings'
import { messaging } from '@/lib/messaging/demo'
import { verifyPassword } from '@/lib/password'
import { clearStudioSession, setStudioSession } from '@/lib/session'
import { requireOwner } from '@/lib/studio-auth'
import { addDaysToKey, atSalonTime, isDateKey } from '@/lib/time'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const [owner] = await getDb().select().from(schema.owners).where(eq(schema.owners.email, email))
  if (!owner || !(await verifyPassword(password, owner.passwordHash))) return { error: 'That email and password don’t match.' }
  await setStudioSession({ ownerId: owner.id, name: owner.name })
  const next = String(formData.get('next') ?? '')
  redirect(next.startsWith('/studio') ? next : '/studio')
}

export async function logout() {
  await clearStudioSession()
  redirect('/studio/login')
}

const Act = z.object({ id: z.string().uuid(), action: z.enum(['arrived', 'completed', 'no_show', 'cancel_salon']) })

export async function bookingAction(formData: FormData) {
  await requireOwner()
  const p = Act.safeParse({ id: formData.get('id'), action: formData.get('action') })
  if (!p.success) return
  await studioAction(p.data.id, p.data.action)
  revalidatePath('/studio', 'layout')
}

export async function sendDueNow() {
  await requireOwner()
  await messaging.dispatchDue()
  revalidatePath('/studio/messages')
}

const Off = z.object({
  stylistId: z.string().uuid(),
  from: z.string().refine(isDateKey),
  to: z.string().refine(isDateKey),
  reason: z.string().trim().max(60).default(''),
})

export async function addTimeOff(formData: FormData) {
  await requireOwner()
  const p = Off.safeParse(Object.fromEntries(formData))
  if (!p.success || p.data.to < p.data.from) return
  await getDb()
    .insert(schema.timeOff)
    .values({
      stylistId: p.data.stylistId,
      startsAt: atSalonTime(p.data.from, '00:00'),
      endsAt: atSalonTime(addDaysToKey(p.data.to, 1), '00:00'),
      reason: p.data.reason,
    })
  revalidatePath('/studio/staff')
}

export async function removeTimeOff(formData: FormData) {
  await requireOwner()
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return
  await getDb().delete(schema.timeOff).where(eq(schema.timeOff.id, id.data))
  revalidatePath('/studio/staff')
}

const HM = /^\d{2}:\d{2}$/

export async function saveHours(formData: FormData) {
  await requireOwner()
  const stylistId = z.string().uuid().safeParse(formData.get('stylistId'))
  if (!stylistId.success) return
  const db = getDb()
  await db.transaction(async (tx) => {
    for (let wd = 0; wd < 7; wd++) {
      const on = formData.get(`on-${wd}`) === 'on'
      const start = String(formData.get(`start-${wd}`) ?? '')
      const end = String(formData.get(`end-${wd}`) ?? '')
      const where = and(eq(schema.workingHours.stylistId, stylistId.data), eq(schema.workingHours.weekday, wd))
      await tx.delete(schema.workingHours).where(where)
      if (on && HM.test(start) && HM.test(end) && start < end) {
        await tx.insert(schema.workingHours).values({ stylistId: stylistId.data, weekday: wd, startTime: start, endTime: end })
      }
    }
  })
  revalidatePath('/studio', 'layout')
}
