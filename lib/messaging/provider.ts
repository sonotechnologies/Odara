import type { MessageKind } from '@/db/schema'

/**
 * The seam between Ọdàrà and WhatsApp. The demo provider writes to the
 * `messages` table (the Studio outbox); a WhatsApp Business API provider would
 * send for real and keep the same table as its log.
 */
export type OutgoingMessage = {
  clientId: string
  bookingId?: string | null
  kind: MessageKind
  body: string
}

export interface MessagingProvider {
  readonly name: string
  /** Send now. */
  send(msg: OutgoingMessage): Promise<{ id: string }>
  /** Queue for later. Reminders are rows with scheduled_for = starts_at − 24h. */
  schedule(msg: OutgoingMessage, at: Date): Promise<{ id: string }>
}
