'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { btn, cx, Wordmark } from '@/components/ui'

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/stylists', label: 'Stylists' },
  { href: '/policy', label: 'Policy' },
  { href: '/#visit', label: 'Visit' },
]

export function SiteHeader() {
  const path = usePathname()
  return (
    <header className="relative z-20">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:h-[88px] lg:px-16">
        <Wordmark className="text-[26px] lg:text-[30px]" />
        <nav aria-label="Main" className="hidden items-center gap-10 text-sm lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path === n.href ? 'page' : undefined}
              className={cx('pb-0.5 hover:text-olive', path === n.href && 'border-b border-ink')}
            >
              {n.label}
            </Link>
          ))}
          <Link href="/book" className={cx(btn.primary, 'h-11 px-[22px] text-sm')}>
            Book
          </Link>
        </nav>
        <div className="flex items-center gap-5 text-sm lg:hidden">
          <Link href="/book" className="border-b border-ink pb-0.5">
            Book
          </Link>
          <details className="group">
            <summary className="list-none [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Menu</span>
              <span className="hidden group-open:inline">Close</span>
            </summary>
            <nav aria-label="Main" className="absolute inset-x-0 top-16 flex animate-fade flex-col border-t border-line bg-linen px-6 pb-8 shadow-[0_24px_24px_-24px_rgba(29,27,23,0.25)]">
              {[...NAV, { href: '/book/again', label: 'Book again' }, { href: '/booking', label: 'Manage booking' }].map((n) => (
                <Link key={n.href} href={n.href} className="border-b border-line py-4 font-serif text-2xl">
                  {n.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
