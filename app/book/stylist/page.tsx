import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BookingTop, StepTitle } from '@/components/booking/chrome'
import { StylistPicker } from '@/components/booking/stylist-picker'
import { nextOpenSlots } from '@/lib/availability'
import { getSlotsForRange, horizonDays } from '@/lib/data/availability'
import { getServiceBySlug, listStylists, stylistsForService } from '@/lib/data/catalog'
import { fmtDayTimeComma, fmtDuration, todayKey } from '@/lib/time'

export const metadata: Metadata = { title: 'Choose a stylist' }

const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

export default async function ChooseStylist({ searchParams }: { searchParams: Promise<{ service?: string; stylist?: string }> }) {
  const sp = await searchParams
  const service = await getServiceBySlug(sp.service)
  if (!service) redirect('/book')

  const [qualified, everyone] = await Promise.all([stylistsForService(service.id), listStylists()])
  const from = todayKey()
  const next = await Promise.all(
    qualified.map(async (s) => {
      const days = await getSlotsForRange({ stylistIds: [s.id], durationMin: service.durationMin, fromKey: from, days: horizonDays })
      return nextOpenSlots(days, 1)[0]?.startsAt ?? null
    }),
  )
  const anyNext = next.filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0] ?? null
  const others = everyone.filter((e) => !qualified.some((q) => q.id === e.id)).map((e) => e.name)

  return (
    <>
      <BookingTop step={2} back={{ href: `/book?service=${service.slug}`, label: 'Back' }} />
      <div className="lg:mx-auto lg:w-full lg:max-w-[640px]">
        <StepTitle sub={`For ${service.name.toLowerCase()}`}>With whom?</StepTitle>
      </div>
      <StylistPicker
        serviceSlug={service.slug}
        serviceSummary={`${service.name} · ${fmtDuration(service.durationMin)}`}
        stylists={qualified.map((s, i) => ({ slug: s.slug, name: s.name, spec: s.specialties, next: next[i] ? fmtDayTimeComma(next[i]!) : null }))}
        anyNext={anyNext ? fmtDayTimeComma(anyNext) : null}
        note={others.length ? `${listJoin(others)} ${others.length === 1 ? 'doesn’t' : 'don’t'} offer ${service.name.toLowerCase()}.` : undefined}
        initial={sp.stylist}
      />
    </>
  )
}
