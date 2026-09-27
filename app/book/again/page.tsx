import type { Metadata } from 'next'
import { signOutClient } from '@/app/book/actions'
import { BookingTop, Notice } from '@/components/booking/chrome'
import { FastPath } from '@/components/booking/fast-path'
import { OtpForm } from '@/components/booking/otp-form'
import { salon } from '@/config/salon'
import { nextOpenSlots } from '@/lib/availability'
import { getSlotsForRange, horizonDays } from '@/lib/data/availability'
import { getClient, lastVisit } from '@/lib/data/bookings'
import { getServiceBySlug, listServices, stylistsForService, getStylistBySlug, withSplit } from '@/lib/data/catalog'
import { applyCredit } from '@/lib/deposit'
import { formatMoney } from '@/lib/money'
import { maskPhone } from '@/lib/phone'
import { getClientSession } from '@/lib/session'
import { fmtDay, fmtDuration, fmtTime, todayKey } from '@/lib/time'
import { formatInTimeZone } from 'date-fns-tz'

export const metadata: Metadata = { title: 'Book again' }

type SP = Promise<{ service?: string; stylist?: string; notice?: string }>

export default async function BookAgain({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const session = await getClientSession()
  const client = session ? await getClient(session.clientId) : null

  if (!client) {
    return (
      <>
        <BookingTop back={{ href: '/', label: 'Close' }} />
        <div className="flex flex-1 flex-col px-5 pt-9 pb-7 md:mx-auto md:w-full md:max-w-[480px] md:px-0 lg:pt-16">
          <h1 className="font-serif text-4xl leading-[1.1]">Book again.</h1>
          <p className="mt-2 mb-10 text-sm text-ink-soft">Been before? Confirm your number and we’ll have your usual ready.</p>
          <OtpForm prefix={salon.phone.prefix} example={salon.phone.example} demoPhone="+234 803 555 0192" />
        </div>
      </>
    )
  }

  const last = await lastVisit(client.id)
  const service = (await getServiceBySlug(sp.service)) ?? (last ? withSplit(last.service) : null)
  const allServices = await listServices()
  const svc = service ?? allServices[0]
  const qualified = await stylistsForService(svc.id)
  const wanted = sp.stylist === 'any' ? null : ((await getStylistBySlug(sp.stylist)) ?? (sp.stylist ? null : last?.stylist ?? null))
  const stylist = wanted && qualified.some((q) => q.id === wanted.id) ? wanted : null

  const days = await getSlotsForRange({
    stylistIds: stylist ? [stylist.id] : qualified.map((q) => q.id),
    durationMin: svc.durationMin,
    fromKey: todayKey(),
    days: horizonDays,
  })
  const slots = nextOpenSlots(days, 3)
  const { creditUsedKobo, dueNowKobo } = applyCredit(svc.depositKobo, client.creditKobo)
  const same = last && last.service.id === svc.id && (!stylist || last.stylist.id === stylist.id)
  const first = client.name.split(' ')[0]

  return (
    <>
      <BookingTop back={{ href: '/', label: 'Close' }} right={<span />} />
      <div className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-[520px]">
        <div className="flex flex-col gap-1.5 px-5 pt-9 pb-6 md:px-0">
          <h1 className="font-serif text-4xl leading-[1.1]">Welcome back, {first}.</h1>
          <p className="text-sm text-ink-soft">{same ? 'Same again?' : 'Here’s what’s open.'}</p>
        </div>
        {sp.notice === 'taken' && <Notice tone="rust">That time was just taken. Here are the next open ones.</Notice>}
        <FastPath
          serviceId={svc.id}
          serviceSlug={svc.slug}
          stylistValue={stylist?.id ?? 'any'}
          stylistSlug={stylist?.slug ?? 'any'}
          heading={`${svc.name}${stylist ? ` with ${stylist.name}` : ''}`}
          meta={`${fmtDuration(svc.durationMin)} · ${formatMoney(svc.priceKobo)}${last ? ` · last visit ${formatInTimeZone(last.b.startsAt, salon.timezone, 'd MMM')}` : ''}`}
          slotsHeading={stylist ? `${stylist.name}’s next open times` : 'Next open times'}
          slots={slots.map((s) => ({ iso: s.startsAt.toISOString(), day: fmtDay(s.startsAt), time: fmtTime(s.startsAt) }))}
          services={allServices.map((s) => ({ value: s.slug, label: s.name }))}
          stylists={[{ value: 'any', label: 'Any available' }, ...qualified.map((q) => ({ value: q.slug, label: q.name }))]}
          now={formatMoney(dueNowKobo)}
          onDay={formatMoney(svc.balanceKobo)}
          depositLine={`Deposit ${formatMoney(svc.depositKobo)}`}
          creditLine={creditUsedKobo ? `− ${formatMoney(creditUsedKobo)} salon credit` : undefined}
          total={formatMoney(svc.priceKobo)}
          payLabel={dueNowKobo === 0 ? 'Confirm with credit' : `Pay ${formatMoney(dueNowKobo)} deposit`}
          footnote={`Receipt to ${maskPhone(client.phone)} · free to reschedule until ${salon.policy.freeChangeHours}h before`}
          moreHref={`/book/time?service=${svc.slug}&stylist=${stylist?.slug ?? 'any'}`}
        />
        <form action={signOutClient} className="px-5 pb-7 text-center md:px-0">
          <button className="text-xs text-ink-soft underline underline-offset-2">Not {first}? Use another number</button>
        </form>
      </div>
    </>
  )
}
