import { salon } from '@/config/salon'
import type { BookingDetail } from '@/lib/data/bookings'
import { googleCalendarUrl, type CalEvent } from '@/lib/calendar'
import { formatMoney } from '@/lib/money'
import { manageUrl } from '@/lib/urls'

export function calendarEvent(b: BookingDetail): CalEvent {
  return {
    uid: b.id,
    title: `${b.service.name} with ${b.stylist.name} · ${salon.name}`,
    description: `Ref ${b.ref}. Deposit ${formatMoney(b.depositKobo)} paid, ${formatMoney(b.balanceKobo)} on the day.\nManage: ${manageUrl(b.ref)}`,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    url: manageUrl(b.ref),
  }
}

export const calendarLinks = (b: BookingDetail) => ({
  ics: `/booking/${b.ref}/calendar`,
  google: googleCalendarUrl(calendarEvent(b)),
})
