import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cancelBooking } from '../actions'
import { AddToCalendar } from '@/components/booking/add-to-calendar'
import { CancelSheet, type CancelView } from '@/components/booking/cancel-sheet'
import { btn, cx, KeyRows, MessageBubble, StatusChip, Wordmark } from '@/components/ui'
import { salon } from '@/config/salon'
import { calendarLinks } from '@/lib/booking-links'
import { depositOutcome, getBookingByRef, getLatestMessage } from '@/lib/data/bookings'
import { formatMoney } from '@/lib/money'
import { clientCancelOutcome, clientRescheduleOutcome, currentRule } from '@/lib/policy'
import { fmtDay, fmtDayTimeComma, fmtDuration, fmtTime } from '@/lib/time'

export const metadata: Metadata = { title: 'Your booking' }

type SP = Promise<{ cancelled?: string; moved?: string; error?: string }>

export default async function ManageBooking({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: SP }) {
  const { ref } = await params
  const sp = await searchParams
  const b = await getBookingByRef(ref)
  if (!b || b.status === 'hold' || b.status === 'expired') notFound()

  const now = new Date()
  const rule = currentRule(b, now)
  const cancel = clientCancelOutcome(b, now)
  const move = clientRescheduleOutcome(b, now)
  const amount = formatMoney(b.depositKobo)
  const cancelled = b.status === 'cancelled_client' || b.status === 'cancelled_salon'
  const settled = cancelled ? await depositOutcome(b.id) : null
  const lastMsg = cancelled ? await getLatestMessage(b.id, 'cancellation') : sp.moved ? await getLatestMessage(b.id, 'rescheduled') : null

  const cancelView: CancelView | null = !cancel.allowed
    ? null
    : cancel.kind === 'forfeit'
      ? { kind: 'forfeit', amount, title: `Cancel ${fmtDay(b.startsAt)}?`, hours: salon.policy.freeChangeHours }
      : { kind: 'refund_or_credit', amount, title: `Cancel ${fmtDay(b.startsAt)}?`, refundCopy: salon.policy.refundCopy, method: 'original payment method' }

  const cal = calendarLinks(b)

  return (
    <div className="flex min-h-dvh flex-col lg:mx-auto lg:w-full lg:max-w-[560px]">
      <header className="flex h-14 flex-none items-center justify-center lg:h-[88px]">
        <Wordmark className="text-[21px] lg:text-[30px]" />
      </header>

      <div className="flex flex-col gap-3 px-5 pt-9 pb-6 lg:px-0">
        <span className="self-start">
          <StatusChip status={b.status} />
        </span>
        <h1 className={cx('font-serif text-4xl leading-[1.1]', cancelled && 'text-ink-soft line-through decoration-1')}>{fmtDayTimeComma(b.startsAt)}</h1>
        <p className="text-[15px] text-ink-body">
          {b.service.name} with {b.stylist.name} · {fmtDuration(b.service.durationMin)}
        </p>
      </div>

      {sp.moved && (
        <p role="status" className="mx-5 mb-4 animate-fade-up bg-olive-mist px-4 py-3 text-[13px] text-olive lg:mx-0">
          Moved. Your deposit came with you, and a new reminder is set.
        </p>
      )}
      {sp.error && (
        <p role="alert" className="mx-5 mb-4 bg-rust-mist px-4 py-3 text-[13px] text-rust lg:mx-0">
          That change couldn’t be made. The booking is as shown below.
        </p>
      )}

      <KeyRows
        className="mx-5 lg:mx-0"
        rows={[
          ['Reference', <span key="r" className="font-mono tracking-[0.08em]">{b.ref}</span>],
          ['Deposit paid', amount],
          ...(cancelled ? [] : ([[b.status === 'completed' ? 'Paid on the day' : 'Due on the day', formatMoney(b.balanceKobo)]] as [string, string][])),
        ]}
      />

      {cancelled ? (
        <div className="mx-5 mt-7 flex flex-col gap-3 lg:mx-0">
          <div className="flex flex-col gap-1.5 bg-parchment p-5">
            <div className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">What happens to your deposit</div>
            <p className="font-serif text-2xl leading-[1.2]">
              {settled!.kept
                ? `The ${amount} deposit was kept.`
                : settled!.refundKobo && settled!.creditKobo
                  ? `${formatMoney(settled!.refundKobo)} is on its way back, and ${formatMoney(settled!.creditKobo)} is salon credit again.`
                  : settled!.refundKobo
                    ? `${formatMoney(settled!.refundKobo)} is on its way back to you.`
                    : `${formatMoney(settled!.creditKobo)} is now salon credit.`}
            </p>
            {settled!.refundKobo > 0 && <p className="text-[13px] text-ink-soft">Refunds take {salon.policy.refundCopy} to land.</p>}
            {settled!.kept && <p className="text-[13px] text-ink-soft">It was cancelled within {salon.policy.freeChangeHours} hours of the start.</p>}
          </div>
          {lastMsg && (
            <div className="flex flex-col gap-2 bg-chat p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Sent to your WhatsApp</div>
              <MessageBubble from={salon.name} body={lastMsg.body} meta={lastMsg.sentAt ? fmtTime(lastMsg.sentAt) : undefined} />
            </div>
          )}
          <Link href="/book" className={cx(btn.primary, 'mt-4')}>
            Book another time
          </Link>
        </div>
      ) : (
        <>
          <div
            className={cx(
              'mx-5 mt-7 flex flex-col gap-1.5 p-5 lg:mx-0',
              rule.tone === 'free' && 'bg-olive-mist',
              rule.tone === 'locked' && 'bg-rust-mist',
              rule.tone === 'closed' && 'bg-parchment',
            )}
          >
            <div className={cx('text-[11px] uppercase tracking-[0.1em]', rule.tone === 'locked' ? 'text-rust' : rule.tone === 'free' ? 'text-olive' : 'text-ink-soft')}>
              Right now
            </div>
            <p className="font-serif text-2xl leading-[1.2]">{rule.headline}</p>
            <p className={cx('text-[13px] leading-[1.5]', rule.tone === 'locked' ? 'text-rust' : rule.tone === 'free' ? 'text-olive' : 'text-ink-soft')}>
              {rule.detail}
            </p>
          </div>
          {lastMsg && (
            <div className="mx-5 mt-4 flex flex-col gap-2 bg-chat p-4 lg:mx-0">
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Sent to your WhatsApp</div>
              <MessageBubble from={salon.name} body={lastMsg.body} />
            </div>
          )}
          <div className="mt-auto flex flex-col gap-2.5 px-5 pt-10 pb-7 lg:mt-10 lg:px-0">
            {move.allowed && (
              <Link href={`/booking/${b.ref}/reschedule`} className={btn.primary}>
                Reschedule
              </Link>
            )}
            {(b.status === 'confirmed' || b.status === 'arrived') && <AddToCalendar ics={cal.ics} google={cal.google} />}
            {cancelView && <CancelSheet view={cancelView} action={cancelBooking.bind(null, b.ref)} />}
          </div>
        </>
      )}
    </div>
  )
}
