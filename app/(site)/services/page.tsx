import type { Metadata } from 'next'
import Link from 'next/link'
import { btn } from '@/components/ui'
import { depositRuleShort } from '@/lib/copy'
import { servicesByCategory } from '@/lib/data/catalog'
import { formatMoney } from '@/lib/money'
import { fmtDuration } from '@/lib/time'

export const metadata: Metadata = { title: 'Services' }

const NUMERALS = ['i', 'ii', 'iii', 'iv', 'v']
const split = 'lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16'

export default async function ServicesPage() {
  const menu = await servicesByCategory()
  return (
    <div className="mx-auto max-w-[1440px] pb-12 lg:pb-[120px]">
      <header className={`flex flex-col gap-3 px-6 pt-12 pb-4 lg:items-end lg:px-16 lg:pt-20 lg:pb-16 ${split}`}>
        <h1 className="font-serif text-5xl leading-[1.1] lg:text-8xl lg:leading-[1.05]">Services</h1>
        <p className="max-w-[520px] text-sm font-light leading-[1.6] text-ink-body lg:text-[17px] lg:leading-[1.7]">
          Prices include products. {depositRuleShort} Pay the rest on the day.
        </p>
      </header>

      {menu.map((cat, ci) => (
        <section key={cat.name} aria-labelledby={`cat-${ci}`} className={`px-6 pt-10 lg:px-16 lg:pt-14 ${split}`}>
          <div className="flex items-baseline gap-3 pb-3 lg:gap-4 lg:border-t lg:border-ink lg:pt-7 lg:pb-0">
            <span className="font-serif text-[15px] italic text-olive lg:text-[22px]">{NUMERALS[ci]}</span>
            <h2 id={`cat-${ci}`} className="text-xs uppercase tracking-[0.14em] lg:font-serif lg:text-[40px] lg:normal-case lg:tracking-normal">
              {cat.name}
            </h2>
          </div>
          <ul className="lg:border-t lg:border-ink">
            {cat.items.map((s) => (
              <li key={s.id} className="border-t border-line lg:border-t-0 lg:border-b">
                <Link
                  href={`/book/stylist?service=${s.slug}`}
                  className="group flex flex-col gap-1 py-4 lg:flex-row lg:items-baseline lg:gap-4 lg:py-[22px]"
                  aria-label={`${s.name}, ${fmtDuration(s.durationMin)}, ${formatMoney(s.priceKobo)}, ${formatMoney(s.depositKobo)} to hold. Book.`}
                >
                  <div className="flex items-baseline gap-2.5 lg:contents">
                    <span className="font-serif text-[21px] group-hover:text-olive lg:text-[26px]">{s.name}</span>
                    <span className="hidden text-sm text-ink-soft lg:inline">{fmtDuration(s.durationMin)}</span>
                    <span aria-hidden className="leader lg:-translate-y-1.5" />
                    <span className="hidden text-sm text-ink-soft lg:inline">{formatMoney(s.depositKobo)} to hold</span>
                    <span className="text-[15px] lg:w-[100px] lg:text-right lg:text-[17px]">{formatMoney(s.priceKobo)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-ink-soft lg:hidden">
                    <span>{fmtDuration(s.durationMin)}</span>
                    <span>{formatMoney(s.depositKobo)} to hold</span>
                  </div>
                  {s.description && <p className="text-[13px] leading-[1.5] text-ink-soft lg:hidden">{s.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="px-6 pt-12 lg:hidden">
        <Link href="/book" className={`${btn.primary} w-full`}>
          Book a chair
        </Link>
      </div>
    </div>
  )
}
