/**
 * WhatsApp message templates. Short, plain, warm. No hype.
 */
import { salon } from '@/config/salon'
import { formatMoney } from '@/lib/money'
import { fmtDay, fmtTime } from '@/lib/time'

type B = {
  ref: string
  clientName: string
  serviceName: string
  stylistName: string
  startsAt: Date
  depositKobo: number
  balanceKobo: number
}

const first = (name: string) => name.trim().split(/\s+/)[0]
const when = (d: Date) => `${fmtDay(d)} at ${fmtTime(d)}`

export function receipt(b: B): string {
  return `Hi ${first(b.clientName)}, your chair is held. ${b.serviceName} with ${b.stylistName}, ${when(b.startsAt)}. Deposit ${formatMoney(b.depositKobo)} received, ${formatMoney(b.balanceKobo)} on the day. Ref ${b.ref}.`
}

export function reminder24h(b: B & { manageUrl: string; rebookUrl?: string }): string {
  const lines = [
    `See you tomorrow at ${fmtTime(b.startsAt)} with ${b.stylistName} for your ${b.serviceName.toLowerCase()}. ${formatMoney(b.balanceKobo)} is due on the day.`,
    `Need to change something? ${b.manageUrl}`,
  ]
  if (b.rebookUrl) lines.push(`Book again in one tap: ${b.rebookUrl}`)
  return lines.join('\n')
}

export function cancellation(
  b: B & { outcome: 'refund' | 'credit' | 'forfeit' | 'salon_refund'; amountKobo: number },
): string {
  const amt = formatMoney(b.amountKobo)
  const tail = {
    refund: `Your ${amt} deposit is on its way back to you (${salon.policy.refundCopy}).`,
    credit: `${amt} is now salon credit, applied to your next booking.`,
    forfeit: `As it was within ${salon.policy.freeChangeHours} hours, the ${amt} deposit is kept.`,
    salon_refund: `We’re sorry. Your full ${amt} deposit is on its way back to you.`,
  }[b.outcome]
  const who = b.outcome === 'salon_refund' ? 'We’ve had to cancel' : 'We’ve cancelled'
  return `Hi ${first(b.clientName)}. ${who} ${b.serviceName.toLowerCase()} with ${b.stylistName}, ${when(b.startsAt)} (Ref ${b.ref}). ${tail}`
}

export function rescheduled(b: B): string {
  return `Hi ${first(b.clientName)}, you’re moved to ${when(b.startsAt)} with ${b.stylistName}. Your deposit came with you. Ref ${b.ref}.`
}

export function rebook(b: { clientName: string; serviceName: string; stylistName?: string | null; url: string }): string {
  const withWho = b.stylistName ? ` with ${b.stylistName}` : ''
  return `Hi ${first(b.clientName)}, ready for your next ${b.serviceName.toLowerCase()}${withWho}? Your usual is one tap away: ${b.url}`
}

export function noShow(b: B): string {
  return `We missed you at ${fmtTime(b.startsAt)} today. Your ${formatMoney(b.depositKobo)} deposit covers ${b.stylistName}’s time. We’d love to see you another day.`
}
