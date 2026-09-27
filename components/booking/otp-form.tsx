'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { requestOtp, verifyOtp, type OtpState } from '@/app/book/actions'
import { btn, cx, Spinner, textLink } from '@/components/ui'

export function OtpForm({ prefix, example, demoPhone }: { prefix: string; example: string; demoPhone: string }) {
  const [reqState, request, requesting] = useActionState<OtpState, FormData>(requestOtp, { step: 'phone' })
  const [verState, verify, verifying] = useActionState<OtpState, FormData>(verifyOtp, { step: 'code' })
  const [toast, setToast] = useState<string | null>(null)
  // Which form shows is driven by whichever action answered last.
  const [stage, setStage] = useState<'phone' | 'code'>('phone')
  useEffect(() => setStage(reqState.step), [reqState])
  useEffect(() => {
    if (verState.step === 'phone' && verState.error) setStage('phone')
  }, [verState])
  const onCode = stage === 'code'
  const phoneError = reqState.error ?? (verState.step === 'phone' ? verState.error : undefined)

  useEffect(() => {
    if (reqState.demoCode) {
      setToast(reqState.demoCode)
      const t = setTimeout(() => setToast(null), 12000)
      return () => clearTimeout(t)
    }
  }, [reqState])

  const input = (err?: string) =>
    cx('h-[52px] w-full border-0 border-b bg-transparent text-lg outline-none focus:border-b-2 focus:border-ink', err ? 'border-b-2 border-rust' : 'border-stone')

  return (
    <>
      {toast && (
        <div role="status" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-[400px] animate-fade-up items-center justify-between gap-4 rounded-[2px] bg-ink px-4 py-3.5 text-linen lg:top-6">
          <span className="text-sm">
            Demo code: <span className="font-mono text-lg tracking-[0.2em]">{toast}</span>
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-xs text-footer-soft" aria-label="Dismiss">
            Close
          </button>
        </div>
      )}
      {!onCode ? (
        <form action={request} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otp-phone" className="text-[13px] text-ink-soft">
              WhatsApp number
            </label>
            <div className="relative">
              <span aria-hidden className="absolute top-1/2 left-0 -translate-y-1/2 text-lg text-ink-soft">
                {prefix}
              </span>
              <input
                id="otp-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={example}
                className={cx(input(phoneError), 'pl-14')}
                aria-invalid={!!phoneError}
                aria-describedby="otp-phone-help"
              />
            </div>
            <p id="otp-phone-help" className={cx('text-xs leading-[1.5]', phoneError ? 'text-rust' : 'text-ink-soft')}>
              {phoneError ?? 'We’ll send a six-digit code to check it’s you.'}
            </p>
          </div>
          <button disabled={requesting} className={btn.primary}>
            {requesting && <Spinner />}
            Send code
          </button>
          <p className="text-xs leading-[1.6] text-ink-soft">
            Demo: try <span className="font-medium text-ink">{demoPhone}</span>. It belongs to a returning client with ₦5,000 credit.
          </p>
          {reqState.error?.startsWith('We don’t have') && (
            <Link href="/book" className={textLink + ' self-start text-sm'}>
              Start a new booking
            </Link>
          )}
        </form>
      ) : (
        <form action={verify} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otp-code" className="text-[13px] text-ink-soft">
              Code sent to {reqState.phone}
            </label>
            <input
              id="otp-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              className={cx(input(verState.step === 'code' ? verState.error : undefined), 'font-mono tracking-[0.4em]')}
              aria-invalid={!!verState.error}
              aria-describedby="otp-code-help"
            />
            <p id="otp-code-help" className={cx('text-xs', verState.step === 'code' && verState.error ? 'text-rust' : 'text-ink-soft')}>
              {(verState.step === 'code' && verState.error) || 'In demo mode the code appears at the top of the screen.'}
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="remember" defaultChecked className="size-4 accent-olive" />
            Remember this device for 90 days
          </label>
          <button disabled={verifying} className={btn.primary}>
            {verifying && <Spinner />}
            Continue
          </button>
        </form>
      )}
    </>
  )
}
