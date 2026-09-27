import { and, eq, inArray, lte } from 'drizzle-orm'
import { getDb, schema, type Tx } from '@/db'
import type { MessagingProvider, OutgoingMessage } from './provider'

const { messages } = schema

export class DemoWhatsAppProvider implements MessagingProvider {
  readonly name = 'demo-whatsapp'
  constructor(private readonly tx?: Tx) {}

  private get db() {
    return this.tx ?? getDb()
  }

  /** Same provider, bound to a transaction so messages commit with the booking. */
  withTx(tx: Tx) {
    return new DemoWhatsAppProvider(tx)
  }

  async send(msg: OutgoingMessage) {
    const now = new Date()
    const [row] = await this.db
      .insert(messages)
      .values({ ...msg, bookingId: msg.bookingId ?? null, scheduledFor: now, sentAt: now, status: 'sent' })
      .returning({ id: messages.id })
    return row
  }

  async schedule(msg: OutgoingMessage, at: Date) {
    const [row] = await this.db
      .insert(messages)
      .values({ ...msg, bookingId: msg.bookingId ?? null, scheduledFor: at, status: 'queued' })
      .returning({ id: messages.id })
    return row
  }

  /** What a cron job would do: send everything that's due. Returns how many went out. */
  async dispatchDue(now = new Date()) {
    const rows = await this.db
      .update(messages)
      .set({ status: 'sent', sentAt: now })
      .where(and(eq(messages.status, 'queued'), lte(messages.scheduledFor, now)))
      .returning({ id: messages.id })
    return rows.length
  }

  /** Cancel queued messages for a booking (e.g. its reminder, once it's cancelled). */
  async cancelQueued(bookingId: string, kinds: OutgoingMessage['kind'][]) {
    await this.db
      .update(messages)
      .set({ status: 'cancelled' })
      .where(and(eq(messages.bookingId, bookingId), eq(messages.status, 'queued'), inArray(messages.kind, kinds)))
  }
}

export const messaging = new DemoWhatsAppProvider()
