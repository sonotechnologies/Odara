import { toIcs } from '@/lib/calendar'
import { calendarEvent } from '@/lib/booking-links'
import { getBookingByRef } from '@/lib/data/bookings'

export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params
  const b = await getBookingByRef(ref)
  if (!b || !['confirmed', 'arrived'].includes(b.status)) return new Response('Not found', { status: 404 })
  return new Response(toIcs(calendarEvent(b)), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="odara-${b.ref}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
