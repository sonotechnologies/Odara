import type { Metadata } from 'next'
import { BookingTop, Notice, StepTitle } from '@/components/booking/chrome'
import { ServicePicker } from '@/components/booking/service-picker'
import { servicesByCategory, getStylistBySlug, stylistsWithServices } from '@/lib/data/catalog'
import { formatMoney } from '@/lib/money'
import { fmtDuration } from '@/lib/time'

export const metadata: Metadata = { title: 'Book' }

type SP = Promise<{ stylist?: string; service?: string }>

export default async function ChooseService({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const stylist = await getStylistBySlug(sp.stylist)
  let menu = await servicesByCategory()
  if (stylist) {
    const offered = (await stylistsWithServices()).find((s) => s.id === stylist.id)?.services.map((s) => s.id) ?? []
    menu = menu.map((c) => ({ ...c, items: c.items.filter((s) => offered.includes(s.id)) })).filter((c) => c.items.length)
  }
  const categories = menu.map((c) => ({
    name: c.name,
    items: c.items.map((s) => ({
      slug: s.slug,
      name: s.name,
      meta: `${fmtDuration(s.durationMin)} · ${formatMoney(s.priceKobo)} · ${formatMoney(s.depositKobo)} to hold`,
      summary: `${fmtDuration(s.durationMin)} · ${formatMoney(s.priceKobo)}`,
    })),
  }))

  return (
    <>
      <BookingTop step={1} back={{ href: stylist ? '/stylists' : '/', label: 'Close' }} />
      <div className="md:mx-auto md:w-full md:max-w-[640px]">
        <StepTitle sub={stylist ? `With ${stylist.name}` : undefined}>What are we doing?</StepTitle>
        {sp.service && !categories.some((c) => c.items.some((i) => i.slug === sp.service)) && (
          <Notice tone="rust">That service isn’t available. Choose another.</Notice>
        )}
      </div>
      <ServicePicker
        categories={categories}
        action={stylist ? '/book/time' : '/book/stylist'}
        hidden={stylist ? { stylist: stylist.slug } : {}}
        initial={sp.service}
      />
    </>
  )
}
