import type { Metadata } from 'next'
import Link from 'next/link'
import { sendDueNow } from '../../actions'
import { btn, cx, MessageBubble } from '@/components/ui'
import type { MessageKind } from '@/db/schema'
import { outbox } from '@/lib/data/studio'
import { requireOwner } from '@/lib/studio-auth'
import { fmtDay, fmtTime, todayKey, dateKeyOf } from '@/lib/time'

export const metadata: Metadata = { title: 'Messages' }

const KIND: Record<MessageKind, string> = {
  receipt: 'Receipt',
  reminder_24h: 'Reminder · 24h',
  rebook: 'Rebook link',
  cancellation: 'Cancellation',
  rescheduled: 'Rescheduled',
  no_show: 'No-show',
}

const when = (d: Date) => (dateKeyOf(d) === todayKey() ? fmtTime(d) : `${fmtDay(d)} ${fmtTime(d)}`)

export default async function Messages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireOwner()
  const { status: raw } = await searchParams
  const status = raw === 'sent' || raw === 'queued' || raw === 'failed' ? raw : undefined
  const { rows, counts, due } = await outbox(status)
  const chip = (on: boolean, extra?: string) =>
    cx('flex h-[30px] items-center rounded-full px-3 whitespace-nowrap', on ? 'bg-ink text-linen' : 'border border-line hover:bg-parchment', extra)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-5 pb-3 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pt-7 lg:pb-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-3xl leading-[1.1] lg:text-[44px]">Outbox</h1>
            <span className="text-[13px] text-ink-soft">WhatsApp · simulated</span>
          </div>
          <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto text-xs">
            <Link href="/studio/messages" className={chip(!status)}>
              All
            </Link>
            <Link href="/studio/messages?status=sent" className={chip(status === 'sent')}>
              Sent · {counts.sent ?? 0}
            </Link>
            <Link href="/studio/messages?status=queued" className={chip(status === 'queued')}>
              Queued · {counts.queued ?? 0}
            </Link>
            <Link href="/studio/messages?status=failed" className={chip(status === 'failed', status === 'failed' ? '' : 'text-rust')}>
              Failed · {counts.failed ?? 0}
            </Link>
          </nav>
        </div>
        <form action={sendDueNow} className="flex items-center gap-3">
          <span className="text-xs text-ink-soft">{due ? `${due} due now` : 'Nothing due'}</span>
          <button disabled={!due} className={cx(btn.primary, 'h-10 px-5 text-[13px]')}>
            Send due now
          </button>
        </form>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 bg-chat p-4 lg:mx-10 lg:mb-8 lg:grid lg:flex-none lg:grid-cols-2 lg:gap-5 lg:p-6 xl:grid-cols-3">
        {rows.length === 0 && <p className="text-sm text-ink-soft">Nothing here.</p>}
        {rows.map((m) => {
          const overdue = m.status === 'queued' && m.scheduledFor < new Date()
          const stat =
            m.status === 'sent'
              ? { text: `Sent · ${when(m.sentAt ?? m.scheduledFor)}`, cls: 'text-olive' }
              : m.status === 'queued'
                ? { text: `${overdue ? 'Due' : 'Queued'} · ${when(m.scheduledFor)}`, cls: overdue ? 'text-rust' : 'text-ink-soft' }
                : m.status === 'failed'
                  ? { text: 'Failed · not on WhatsApp', cls: 'text-rust' }
                  : { text: 'Cancelled', cls: 'text-ink-soft' }
          return (
            <article key={m.id} className="flex flex-col gap-1">
              <header className="flex justify-between gap-3 text-[11px] text-ink-soft">
                <span className="truncate">
                  <span className="font-medium text-ink">{m.clientName.split(' ')[0]}</span> · {KIND[m.kind]}
                  {m.ref ? ` · ${m.ref}` : ''}
                </span>
                <span className={cx('whitespace-nowrap', stat.cls)}>{stat.text}</span>
              </header>
              <MessageBubble
                className="max-w-none"
                body={m.status === 'failed' ? `${m.body}\n\nNumber not on WhatsApp. Send by SMS or call.` : m.body}
                variant={m.status === 'sent' ? 'sent' : m.status === 'failed' ? 'failed' : 'queued'}
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}
