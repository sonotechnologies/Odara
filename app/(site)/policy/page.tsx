import type { Metadata } from 'next'
import Link from 'next/link'
import { salon } from '@/config/salon'
import { btn, cx } from '@/components/ui'
import { lateNote, policyFull } from '@/lib/copy'

export const metadata: Metadata = { title: 'Deposits & cancelling' }

const d = salon.deposit

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-[1440px] pb-14 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:px-16 lg:pb-[120px]">
      <header className="flex flex-col gap-4 px-6 pt-12 pb-8 lg:px-0 lg:pt-20">
        <h1 className="font-serif text-5xl leading-[1.1] lg:text-7xl">Deposits &amp; cancelling</h1>
        <p className="text-[15px] font-light leading-[1.7] text-ink-body text-pretty lg:max-w-[440px] lg:text-[17px]">
          A deposit is a promise from both sides. You promise to come; we promise your chair and your stylist are ready. It is{' '}
          {d.defaultPercent}% of the service ({d.longServicePercent}% for services of {d.longServiceMinutes / 60} hours or more) and comes off your total.
        </p>
      </header>
      <div className="lg:pt-20">
        <dl className="mx-6 flex flex-col lg:mx-0">
          {policyFull.map((p) => (
            <div key={p.when} className="flex flex-col gap-2 border-t border-line py-5 lg:py-7">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-serif text-[22px] lg:text-[28px]">{p.when}</dt>
                <span className={cx('whitespace-nowrap text-xs font-medium', p.tone === 'olive' ? 'text-olive' : 'text-rust')}>{p.tag}</span>
              </div>
              <dd className="text-sm leading-[1.6] text-ink-body lg:text-[15px]">{p.what}</dd>
            </div>
          ))}
        </dl>
        <p className="mx-6 mt-8 bg-parchment p-5 text-sm leading-[1.6] lg:mx-0">{lateNote}</p>
        <div className="mx-6 mt-10 flex flex-wrap items-center gap-6 lg:mx-0">
          <Link href="/book" className={btn.primary}>
            Book a chair
          </Link>
          <Link href="/booking" className="border-b border-ink pb-0.5 text-sm">
            Manage a booking
          </Link>
        </div>
      </div>
    </div>
  )
}
