import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

// Marketing pages are prerendered and served from the CDN, refreshed every 10 minutes.
export const revalidate = 600

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-linen">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="animate-fade">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
