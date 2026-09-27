'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { btn, cx, Radio } from '@/components/ui'

export type CancelView =
  | { kind: 'refund_or_credit'; amount: string; refundCopy: string; title: string; method: string }
  | { kind: 'forfeit'; amount: string; title: string; hours: number }

/** Bottom sheet on phones, centred dialog on desktop. States plainly what happens to the deposit. */
export function CancelSheet({ view, action }: { view: CancelView; action: (fd: FormData) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [choice, setChoice] = useState<'refund' | 'credit'>('refund')
  const option = (on: boolean) =>
    cx(
      'flex items-center gap-3.5 rounded-[2px] border p-4 text-left transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive',
      on ? 'border-olive bg-olive-mist' : 'border-line hover:bg-parchment',
    )
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={btn.destructive}>
        Cancel booking
      </button>
      <dialog
        ref={ref}
        aria-labelledby="cancel-title"
        className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-[#8a8479]/80 open:animate-fade-up lg:m-auto lg:max-w-[480px]"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <form action={action} className="flex flex-col gap-4 rounded-t-xl bg-linen px-5 pt-3 pb-7 lg:rounded-[2px] lg:px-8 lg:pt-8">
          <div aria-hidden className="h-1 w-9 self-center rounded-sm bg-line lg:hidden" />
          <h2 id="cancel-title" className="pt-2 font-serif text-3xl leading-[1.15]">
            {view.title}
          </h2>
          {view.kind === 'refund_or_credit' ? (
            <>
              <p className="text-[15px] leading-[1.6] text-ink-body">
                You’re more than 24 hours out, so your <strong className="font-medium text-ink">{view.amount} deposit comes back to you</strong>. Choose how.
              </p>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">How you’d like your deposit back</legend>
                <label className={option(choice === 'refund')}>
                  <input type="radio" name="choice" value="refund" checked={choice === 'refund'} onChange={() => setChoice('refund')} className="sr-only" />
                  <Radio checked={choice === 'refund'} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px]">Refund {view.amount}</span>
                    <span className={cx('text-xs', choice === 'refund' ? 'text-olive' : 'text-ink-soft')}>
                      Back to your {view.method}, {view.refundCopy}
                    </span>
                  </span>
                </label>
                <label className={option(choice === 'credit')}>
                  <input type="radio" name="choice" value="credit" checked={choice === 'credit'} onChange={() => setChoice('credit')} className="sr-only" />
                  <Radio checked={choice === 'credit'} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px]">Keep {view.amount} as salon credit</span>
                    <span className={cx('text-xs', choice === 'credit' ? 'text-olive' : 'text-ink-soft')}>Instant. Applied to your next booking</span>
                  </span>
                </label>
              </fieldset>
            </>
          ) : (
            <p className="text-[15px] leading-[1.6] text-ink-body">
              You’re within {view.hours} hours, so cancelling now means the <strong className="font-medium text-rust">{view.amount} deposit is kept</strong>. Your
              stylist has turned others away for this time.
            </p>
          )}
          <div className="flex flex-col gap-2.5 pt-2">
            <Submit>
              {view.kind === 'forfeit'
                ? `Cancel · ${view.amount} deposit kept`
                : choice === 'refund'
                  ? `Cancel and refund ${view.amount}`
                  : `Cancel and keep ${view.amount} as credit`}
            </Submit>
            <button type="button" onClick={() => ref.current?.close()} className={btn.quiet} autoFocus>
              Keep my booking
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={cx(btn.danger, 'disabled:opacity-70')}>
      {pending ? 'Cancelling…' : children}
    </button>
  )
}
