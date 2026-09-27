import Link from 'next/link'
import { btn, Wordmark } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Wordmark className="text-3xl" />
      <h1 className="font-serif text-4xl leading-[1.1]">We couldn’t find that page.</h1>
      <p className="max-w-[340px] text-[15px] font-light leading-[1.6] text-ink-body">If you followed a booking link, check the reference in your WhatsApp receipt.</p>
      <div className="flex items-center gap-6">
        <Link href="/book" className={btn.primary}>
          Book a chair
        </Link>
        <Link href="/booking" className="border-b border-ink pb-0.5 text-sm">
          Manage a booking
        </Link>
      </div>
    </div>
  )
}
