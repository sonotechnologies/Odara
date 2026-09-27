import Link from 'next/link'
import { salon } from '@/config/salon'
import { Photo } from '@/components/photo'
import { btn, Eyebrow, Placeholder, textLink } from '@/components/ui'
import { stylistSlot } from '@/config/photo-slots'
import { getPhotos } from '@/lib/photos'
import { listServices, listStylists } from '@/lib/data/catalog'
import { groupedHours } from '@/lib/hours'
import { howBookingWorks, policySummary } from '@/lib/copy'
import { formatMoney } from '@/lib/money'
import { fmtDuration } from '@/lib/time'

const split = 'lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16'
const wrap = 'mx-auto max-w-[1440px] px-6 lg:px-16'

export default async function Home() {
  const [services, stylists] = await Promise.all([listServices(), listStylists()])
  const photos = await getPhotos(['hero', 'gallery-braids', 'gallery-nails', 'gallery-lashes', 'gallery-locs', ...stylists.map((p) => stylistSlot(p.slug))])
  const featured = services.filter((s) => s.featured)
  const hours = groupedHours()

  return (
    <>
      {/* Hero */}
      <section className={`${wrap} ${split} pt-14 pb-10 lg:items-end lg:pt-12 lg:pb-[120px]`}>
        <div className="flex flex-col gap-5 lg:gap-7 lg:pb-6">
          <Eyebrow>{salon.address.line}</Eyebrow>
          <h1 className="font-serif text-[88px] leading-[1.1] tracking-[-0.01em] lg:-ml-2 lg:text-[clamp(120px,12.8vw,184px)] lg:tracking-[-0.02em]">
            {salon.name}
          </h1>
          <p className="max-w-[280px] text-[17px] font-light leading-[1.6] text-pretty lg:max-w-[380px] lg:text-xl">{salon.tagline}</p>
          <div className="mt-2 flex items-center gap-4 lg:gap-6">
            <Link href="/book" className={`${btn.primary} lg:h-14 lg:px-8`}>
              Book a chair
            </Link>
            <Link href="/services" className={`text-sm lg:text-[15px] ${textLink}`}>
              <span className="lg:hidden">Services</span>
              <span className="hidden lg:inline">See services</span>
            </Link>
          </div>
        </div>
        <Photo
          slot="hero"
          photo={photos.hero}
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="-mx-6 mt-10 h-[460px] lg:mx-0 lg:mt-0 lg:h-[680px] lg:p-[18px] lg:text-xs"
        />
      </section>

      {/* Intro */}
      <section className={`${wrap} ${split} py-[72px] lg:pt-0 lg:pb-[140px]`}>
        <Eyebrow className="hidden pt-3 lg:block">The studio</Eyebrow>
        <div className="flex max-w-[620px] flex-col gap-4 lg:gap-5">
          <h2 className="font-serif text-[30px] leading-[1.25] text-pretty lg:text-[44px] lg:leading-[1.2]">
            A small studio with five chairs and good light.
          </h2>
          <p className="text-[15px] font-light leading-[1.7] text-ink-body text-pretty lg:text-[17px]">
            We take one client per stylist at a time, so nobody is rushed. Come in, sit down, and let the work take the time it needs.
          </p>
        </div>
      </section>

      {/* Featured services */}
      <section className={`${wrap} ${split} pb-[72px] lg:pb-[140px]`} aria-labelledby="h-services">
        <div className="flex items-baseline justify-between pb-4 lg:flex-col lg:justify-start lg:gap-4 lg:pt-3">
          <Eyebrow as="h2">
            <span id="h-services">Services</span>
          </Eyebrow>
          <Link href="/services" className={`text-[13px] lg:text-sm ${textLink}`}>
            Full menu
          </Link>
        </div>
        <ul>
          {featured.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 border-t border-line py-[18px] lg:flex-row lg:items-baseline lg:gap-4 lg:py-6">
              <div className="flex items-baseline gap-2.5 lg:contents">
                <Link href={`/book/stylist?service=${s.slug}`} className="font-serif text-[22px] hover:text-olive lg:text-[30px]">
                  {s.name}
                </Link>
                <span className="hidden text-sm text-ink-soft lg:inline">{fmtDuration(s.durationMin)}</span>
                <span aria-hidden className="leader lg:-translate-y-1.5" />
                <span className="hidden text-sm text-ink-soft lg:inline">{formatMoney(s.depositKobo)} to hold</span>
                <span className="text-[15px] lg:w-[110px] lg:text-right lg:text-lg">{formatMoney(s.priceKobo)}</span>
              </div>
              <div className="text-[13px] text-ink-soft lg:hidden">
                {fmtDuration(s.durationMin)} · {formatMoney(s.depositKobo)} to hold
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Stylists */}
      <section className="pb-[72px] lg:pb-[140px]" aria-labelledby="h-stylists">
        <div className={`${wrap} flex flex-col gap-5 lg:gap-8`}>
          <Eyebrow as="h2">
            <span id="h-stylists">Stylists</span>
          </Eyebrow>
        </div>
        <ul className="mx-auto mt-5 flex max-w-[1440px] snap-x gap-3 overflow-x-auto scroll-pl-6 px-6 pb-2 [scrollbar-width:none] md:grid md:grid-cols-5 md:gap-4 md:overflow-visible lg:mt-8 lg:gap-6 lg:px-16">
          {stylists.map((p) => (
            <li key={p.id} className="flex flex-[0_0_150px] snap-start flex-col gap-2.5 lg:gap-3.5">
              <Link href={`/stylists#${p.slug}`} className="group flex flex-col gap-2.5 lg:gap-3.5">
                <Photo
                  slot={stylistSlot(p.slug)}
                  photo={photos[stylistSlot(p.slug)]}
                  sizes="(min-width: 1024px) 18vw, 150px"
                  className="h-[190px] p-2.5 text-[10px] leading-[1.4] lg:h-[340px] lg:p-3 lg:text-[11px]"
                />
                <div className="flex flex-col gap-0.5 lg:gap-1">
                  <div className="font-serif text-xl group-hover:text-olive lg:text-[26px]">{p.name}</div>
                  <div className="text-xs leading-[1.4] text-ink-soft lg:text-[13px]">{p.specialties}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Gallery */}
      <section className={`${wrap} flex flex-col gap-5 pb-[72px] lg:pb-[140px]`} aria-label="Recent work">
        <Eyebrow className="lg:hidden">Recent work</Eyebrow>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-12 lg:gap-4">
          <Photo slot="gallery-braids" photo={photos['gallery-braids']} sizes="(min-width: 1024px) 38vw, 50vw" className="row-span-2 h-[328px] p-2.5 text-[10px] lg:col-span-5 lg:h-[620px] lg:p-3 lg:text-[11px]" />
          <div className="contents lg:col-span-7 lg:grid lg:grid-cols-2 lg:gap-4">
            <Photo slot="gallery-nails" photo={photos['gallery-nails']} sizes="(min-width: 1024px) 27vw, 50vw" className="h-40 p-2.5 text-[10px] lg:h-[302px] lg:p-3 lg:text-[11px]" />
            <Photo slot="gallery-lashes" photo={photos['gallery-lashes']} sizes="(min-width: 1024px) 27vw, 50vw" className="h-40 p-2.5 text-[10px] lg:h-[302px] lg:p-3 lg:text-[11px]" />
            <Photo slot="gallery-locs" photo={photos['gallery-locs']} sizes="(min-width: 1024px) 54vw, 100vw" className="col-span-2 h-[200px] p-2.5 text-[10px] lg:h-[302px] lg:p-3 lg:text-[11px]" />
          </div>
        </div>
      </section>

      {/* How booking works */}
      <section className="bg-parchment" aria-labelledby="h-how">
        <div className={`${wrap} ${split} flex flex-col gap-8 py-[72px] lg:py-[120px]`}>
          <div className="flex flex-col gap-3 lg:gap-4">
            <Eyebrow as="h2">
              <span id="h-how">How booking works</span>
            </Eyebrow>
            <p className="max-w-[460px] font-serif text-[30px] leading-[1.25] text-pretty lg:text-[44px] lg:leading-[1.2]">
              Your deposit holds your chair. The rest is paid on the day.
            </p>
          </div>
          <ol className="flex flex-col gap-8 md:grid md:grid-cols-3 md:gap-6 lg:gap-8">
            {howBookingWorks.map((st) => (
              <li key={st.n} className="grid grid-cols-[40px_1fr] gap-3 border-t border-line pt-5 md:flex md:flex-col md:border-line-strong lg:pt-6">
                <div className="font-serif text-[26px] leading-none text-olive lg:text-4xl">{st.n}</div>
                <div className="flex flex-col gap-1.5 md:gap-3">
                  <div className="text-base font-medium">{st.title}</div>
                  <div className="text-sm font-light leading-[1.6] text-ink-body lg:leading-[1.65]">{st.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Policy + hours + map */}
      <section id="visit" className={`${wrap} flex scroll-mt-4 flex-col gap-[72px] py-[72px] md:grid md:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16 lg:py-[120px]`}>
        <div className="flex flex-col gap-4 lg:gap-4">
          <div className="flex items-baseline justify-between">
            <Eyebrow as="h2">Our promise, and yours</Eyebrow>
            <Link href="/policy" className={`text-[13px] lg:hidden ${textLink}`}>
              Full policy
            </Link>
          </div>
          <ul className="flex flex-col gap-4">
            {policySummary.map((p) => (
              <li key={p.when} className="flex flex-col gap-1 border-t border-line pt-3.5">
                <div className="text-xs text-ink-soft">{p.when}</div>
                <div className="text-[15px] leading-[1.5]">{p.what}</div>
              </li>
            ))}
          </ul>
          <Link href="/policy" className={`mt-2 hidden self-start text-sm lg:inline ${textLink}`}>
            Full policy
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          <Eyebrow as="h2">Hours</Eyebrow>
          <dl>
            {hours.map((h) => (
              <div key={h.label} className={`flex justify-between border-t border-line py-3 text-[15px] lg:py-3.5 ${h.closed ? 'text-ink-soft' : ''}`}>
                <dt>{h.label}</dt>
                <dd>{h.value}</dd>
              </div>
            ))}
          </dl>
          <Placeholder className="mt-3 h-[180px] p-2.5 text-[10px] lg:hidden" note={`map · ${salon.address.area}, muted monochrome style`} />
          <address className="mt-0 text-[15px] leading-[1.6] not-italic lg:mt-4">
            {salon.address.line}
            <br />
            <span className="text-sm text-ink-soft">{salon.address.note}</span>
          </address>
        </div>
        <Placeholder className="hidden h-[340px] p-3 text-[11px] lg:flex" note={`map · ${salon.address.area}, muted monochrome style`} />
      </section>

      <section className={`${wrap} pb-[72px] lg:hidden`}>
        <Link href="/book" className={`${btn.primary} w-full`}>
          Book a chair
        </Link>
      </section>
    </>
  )
}
