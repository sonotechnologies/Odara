import Link from 'next/link'
import { salon } from '@/config/salon'
import { ExternalLink } from '@/components/ui'

export function SiteFooter() {
  const links: [string, string, boolean?][] = [
    ['Services', '/services'],
    ['Stylists', '/stylists'],
    ['Policy', '/policy'],
    ['Manage booking', '/booking'],
    ['Instagram', salon.instagram, true],
    ['WhatsApp', `https://wa.me/${salon.whatsapp}`, true],
  ]
  return (
    <footer className="bg-ink text-linen">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 pt-14 pb-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 lg:pt-20 lg:pb-12">
        <div className="flex flex-col gap-6">
          <div className="font-serif text-5xl leading-[1.15] lg:text-8xl">{salon.name}</div>
          <div className="hidden text-xs text-footer-soft lg:block">
            © {new Date().getFullYear()} {salon.name}, {salon.address.line}
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-3 text-sm font-light lg:grid-cols-3 lg:gap-x-14 lg:gap-y-4">
          {links.map(([label, href, ext]) =>
            ext ? (
              <ExternalLink key={label} href={href} className="hover:text-olive-mist">
                {label}
              </ExternalLink>
            ) : (
              <Link key={label} href={href} className="hover:text-olive-mist">
                {label}
              </Link>
            ),
          )}
        </nav>
        <div className="text-xs text-footer-soft lg:hidden">
          © {new Date().getFullYear()} {salon.name}, {salon.address.line}
        </div>
      </div>
    </footer>
  )
}
