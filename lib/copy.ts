/** Shared marketing and policy copy. Numbers come from config, never typed in. */
import { salon } from '@/config/salon'

const d = salon.deposit
const h = salon.policy.freeChangeHours
const longHours = d.longServiceMinutes / 60

export const depositRuleShort = `The deposit is ${d.defaultPercent}%, or ${d.longServicePercent}% for services of ${longHours} hours or more, and comes off your total.`

export const howBookingWorks = [
  { n: '1', title: 'Choose', body: 'Pick a service, a stylist and a time. Taken times stay visible so you can see how the week looks.' },
  {
    n: '2',
    title: 'Hold your chair',
    body: `Pay a deposit of ${d.defaultPercent}% (${d.longServicePercent}% for longer services). Your slot is held from that moment, and your receipt arrives on WhatsApp.`,
  },
  { n: '3', title: 'Pay the rest on the day', body: `The deposit comes off your total. We remind you ${salon.messaging.reminderHoursBefore} hours before.` },
]

export const policySummary = [
  { when: `Up to ${h}h before`, what: 'Reschedule for free.' },
  { when: `Cancel more than ${h}h before`, what: 'Refund or salon credit, your choice.' },
  { when: `Within ${h}h, or no-show`, what: 'The deposit is kept.' },
  { when: 'If we cancel', what: 'You get a full refund.' },
]

export const policyFull = [
  {
    when: `More than ${h}h before`,
    tag: 'Free',
    tone: 'olive' as const,
    what: `Move your booking to any open slot, as many times as you need. Or cancel and choose a full refund (${salon.policy.refundCopy}) or instant salon credit.`,
  },
  {
    when: `Within ${h}h`,
    tag: 'Deposit kept',
    tone: 'rust' as const,
    what: 'Your stylist has kept the time for you and turned others away. The deposit covers that time, whether you cancel or move the booking.',
  },
  {
    when: 'No-show',
    tag: 'Deposit kept',
    tone: 'rust' as const,
    what: 'If you don’t arrive and don’t message us, the deposit is kept and the booking closes.',
  },
  {
    when: 'If we cancel',
    tag: 'Full refund',
    tone: 'olive' as const,
    what: 'If we ever need to cancel, you get your whole deposit back. Always.',
  },
]

export const lateNote = `Running late? Message us on WhatsApp. We hold your chair for ${salon.policy.lateGraceMinutes} minutes, then we may need to shorten or move the service.`
