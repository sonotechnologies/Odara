import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AddToCalendar } from '@/components/booking/add-to-calendar'
import { btn, ConfirmMark, ExternalLink, KeyRows, MessageBubble, textLink, Wordmark } from '@/components/ui'
import { salon } from '@/config/salon'
import { calendarLinks } from '@/lib/booking-links'
import { getBookingByRef, getLatestMessage } from '@/lib/data/bookings'
import { formatMoney } from '@/lib/money'
import * as T from '@/lib/messaging/templates'
import { freeChangeDeadline, isInFreeWindow } from '@/lib/policy'
import { fmtDay, fmtDayTimeComma, fmtDurationProse, fmtTime } from '@/lib/time'
import { waLink } from '@/lib/urls'

export const metadata: Metadata = { title: 'Your chair is held' }

export default async function Confirmed({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const b = await getBookingByRef(ref)
  if (!b || !b.client) notFound()
  if (b.status !== 'confirmed') redirect(`/booking/${b.ref}`)

  const receiptMsg = await getLatestMessage(b.id, 'receipt')
  const receipt =
    receiptMsg?.body ??
    T.receipt({ ref: b.ref, clientName: b.client.name, serviceName: b.service.name, stylistName: b.stylist.name, startsAt: b.startsAt, depositKobo: b.depositKobo, balanceKobo: b.balanceKobo })
  const sentAt = receiptMsg?.sentAt ?? new Date()
  const cal = calendarLinks(b)
  const reminderAt = new Date(b.startsAt.getTime() - salon.messaging.reminderHoursBefore * 3_600_000)
  const free = isInFreeWindow(b.startsAt, new Date())

  return (
    <div className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[560px]">
      <header className="flex h-14 flex-none items-center justify-center lg:h-[88px]">
        <Wordmark className="text-[21px] lg:text-[30px]" />
      </header>
      <div className="flex flex-col gap-3.5 px-5 pt-8 pb-7 lg:px-0">
        <ConfirmMark />
        <h1 className="animate-fade-up font-serif text-[40px] leading-[1.1] [animation-delay:200ms]">Your chair is held.</h1>
        <p className="animate-fade-up text-[15px] font-light leading-[1.6] text-ink-body [animation-delay:300ms]">
          {fmtDay(b.startsAt)} at {fmtTime(b.startsAt)} with {b.stylist.name}. {b.service.name}, {fmtDurationProse(b.service.durationMin)}.
        </p>
      </div>
      <KeyRows
        className="mx-5 lg:mx-0"
        rows={[
          ['Reference', <span key="r" className="font-mono tracking-[0.08em]">{b.ref}</span>],
          ['Deposit paid', <span key="d" className="text-olive">{formatMoney(b.depositKobo)}</span>],
          ['Due on the day', <span key="b" className="font-medium">{formatMoney(b.balanceKobo)}</span>],
        ]}
      />
      <div className="mx-5 mt-6 flex flex-col gap-2 bg-chat p-4 lg:mx-0">
        <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Sent to your WhatsApp</div>
        <MessageBubble from={salon.name} body={receipt} meta={`${fmtTime(sentAt)} ✓✓`} className="max-w-[290px]" />
      </div>
      <div className="flex flex-col gap-2.5 px-5 pt-6 lg:px-0">
        <ExternalLink href={waLink(receipt)} className={btn.primary}>
          Open in WhatsApp
        </ExternalLink>
        <AddToCalendar ics={cal.ics} google={cal.google} />
      </div>
      <p className="px-5 pt-5 text-[13px] leading-[1.6] text-ink-soft lg:px-0">
        {reminderAt > new Date()
          ? `We’ll message you ${salon.messaging.reminderHoursBefore} hours before, on ${fmtDay(reminderAt)} at ${fmtTime(reminderAt)}. ${free ? 'Until then you can reschedule for free.' : ''}`
          : `It’s less than a day away, so this receipt is your reminder.${free ? ` You can reschedule for free until ${fmtDayTimeComma(freeChangeDeadline(b.startsAt))}.` : ''}`}
      </p>
      <div className="mt-auto px-5 pt-8 pb-7 text-[13px] lg:px-0">
        <Link href={`/booking/${b.ref}`} className={textLink}>
          Manage booking
        </Link>
      </div>
    </div>
  )
}
