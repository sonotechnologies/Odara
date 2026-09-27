'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/components/ui'

const TABS = [
  { href: '/studio', label: 'Today' },
  { href: '/studio/bookings', label: 'Bookings' },
  { href: '/studio/staff', label: 'Staff' },
  { href: '/studio/messages', label: 'Messages' },
]

const isActive = (path: string, href: string) => (href === '/studio' ? path === '/studio' : path.startsWith(href))

export function StudioSideNav({ badge }: { badge?: number }) {
  const path = usePathname()
  return (
    <nav aria-label="Studio" className="flex flex-col gap-0.5 text-sm">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={isActive(path, t.href) ? 'page' : undefined}
          className={cx(
            'flex h-[38px] items-center justify-between rounded-[2px] px-3',
            isActive(path, t.href) ? 'bg-parchment font-medium' : 'text-ink-soft hover:text-ink',
          )}
        >
          {t.label}
          {t.href === '/studio/messages' && badge ? <span className="text-[11px] text-rust">{badge}</span> : null}
        </Link>
      ))}
    </nav>
  )
}

export function StudioTabBar() {
  const path = usePathname()
  return (
    <nav aria-label="Studio" className="sticky bottom-0 z-20 grid h-[60px] flex-none grid-cols-4 border-t border-line bg-linen text-xs lg:hidden">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={isActive(path, t.href) ? 'page' : undefined}
          className={cx('flex items-center justify-center', isActive(path, t.href) ? 'font-medium shadow-[inset_0_2px_0_var(--color-ink)]' : 'text-ink-soft')}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
