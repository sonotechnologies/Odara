import type { Metadata } from 'next'
import { logout } from '../actions'
import { StudioSideNav, StudioTabBar } from '@/components/studio-nav'
import { Wordmark } from '@/components/ui'
import { salon } from '@/config/salon'
import { failedMessageCount } from '@/lib/data/studio'
import { todayHoursLine } from '@/lib/hours'
import { requireOwner } from '@/lib/studio-auth'
import { todayKey, weekdayOfKey } from '@/lib/time'

export const metadata: Metadata = { title: { default: 'Studio', template: `%s · Studio · ${salon.name}` }, robots: { index: false } }

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner()
  const failed = await failedMessageCount()
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 flex-none items-center justify-between border-b border-line bg-linen px-4 lg:hidden">
        <div className="flex items-baseline gap-2">
          <Wordmark href="/studio" className="text-[21px]" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">Studio</span>
        </div>
        <form action={logout}>
          <button aria-label={`Signed in as ${owner.name}. Sign out`} className="flex size-[30px] items-center justify-center rounded-full bg-parchment text-xs">
            O
          </button>
        </form>
      </header>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-10 border-r border-line px-6 py-7 lg:flex">
        <div className="flex flex-col gap-0.5">
          <Wordmark href="/studio" className="text-[30px]" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">Studio</span>
        </div>
        <StudioSideNav badge={failed} />
        <div className="mt-auto flex flex-col gap-4 text-xs leading-[1.6] text-ink-soft">
          <div>
            {salon.address.area}
            <br />
            {todayHoursLine(weekdayOfKey(todayKey()))}
          </div>
          <form action={logout}>
            <button className="underline underline-offset-2 hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <StudioTabBar />
    </div>
  )
}
