import type { Metadata } from 'next'
import Link from 'next/link'
import { findBooking } from './actions'
import { BookingTop } from '@/components/booking/chrome'
import { btn, textLink } from '@/components/ui'

export const metadata: Metadata = { title: 'Manage booking' }

const ERR: Record<string, string> = {
  format: 'References look like ODR-4K7Q. Check your WhatsApp receipt.',
  notfound: 'We couldn’t find that booking. Check the reference and try again.',
}

export default async function FindBooking({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <div className="flex min-h-dvh flex-col">
      <BookingTop back={{ href: '/', label: 'Close' }} />
      <div className="flex flex-1 flex-col px-5 pt-12 lg:mx-auto lg:w-full lg:max-w-[480px] lg:px-0">
        <h1 className="font-serif text-4xl leading-[1.1]">Manage a booking</h1>
        <p className="mt-3 text-[15px] font-light leading-[1.6] text-ink-body">Your reference is in the WhatsApp receipt we sent when you paid the deposit.</p>
        <form action={findBooking} className="mt-10 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ref" className="text-[13px] text-ink-soft">
              Booking reference
            </label>
            <input
              id="ref"
              name="ref"
              placeholder="ODR-4K7Q"
              autoCapitalize="characters"
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby="ref-help"
              className={`h-[52px] border-0 border-b bg-transparent font-mono text-lg tracking-[0.08em] uppercase outline-none focus:border-b-2 focus:border-ink ${error ? 'border-b-2 border-rust' : 'border-stone'}`}
            />
            <p id="ref-help" className={`text-xs ${error ? 'text-rust' : 'text-ink-soft'}`}>
              {error ? ERR[error] : 'Four letters and numbers after ODR-.'}
            </p>
          </div>
          <button className={btn.primary}>Find my booking</button>
        </form>
        <p className="mt-10 text-sm text-ink-soft">
          Booked with us before?{' '}
          <Link href="/book/again" className={textLink}>
            Book again in one step
          </Link>
        </p>
      </div>
    </div>
  )
}
