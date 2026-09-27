import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { findRebookToken } from '@/lib/data/bookings'
import { setClientSession } from '@/lib/session'

/** One-tap rebook from WhatsApp: the link itself identifies the client. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const t = await findRebookToken(token)
  if (!t) return NextResponse.redirect(new URL('/book/again', req.url))
  const db = getDb()
  const [[service], [stylist]] = await Promise.all([
    db.select({ slug: schema.services.slug }).from(schema.services).where(eq(schema.services.id, t.serviceId)),
    t.stylistId ? db.select({ slug: schema.stylists.slug }).from(schema.stylists).where(eq(schema.stylists.id, t.stylistId)) : Promise.resolve([undefined]),
  ])
  await setClientSession({ clientId: t.clientId }, false)
  const q = new URLSearchParams({ service: service?.slug ?? '', stylist: stylist?.slug ?? 'any' })
  return NextResponse.redirect(new URL(`/book/again?${q}`, req.url))
}
