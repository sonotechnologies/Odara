'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { simulatePayment } from '@/app/book/actions'
import { cx } from '@/components/ui'

type Method = 'card' | 'bank_transfer' | 'ussd'
const TABS: { id: Method; label: string }[] = [
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'ussd', label: 'USSD' },
]

/**
 * Deliberately neutral and unbranded: grey, system-like, no logos. It must not
 * look like any real payment provider.
 */
export function DemoCheckout({
  id,
  pref,
  amount,
  payee,
  who,
  cancelHref,
  credit,
  initialTab = 'card',
  expiresIn,
}: {
  id: string
  pref: string
  amount: string
  payee: string
  who: string
  cancelHref: string
  credit?: string
  initialTab?: Method
  expiresIn: string
}) {
  const [tab, setTab] = useState<Method>(initialTab)
  const [card, setCard] = useState('4084 0840 8408 4081')

  return (
    <form action={simulatePayment} className="flex min-h-dvh flex-col bg-co-bg text-co-ink lg:items-center lg:justify-center lg:py-12">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="pref" value={pref} />
      <input type="hidden" name="method" value={tab} />
      <div className="flex w-full flex-1 flex-col lg:max-w-[440px] lg:flex-none lg:rounded-[10px] lg:border lg:border-co-line lg:bg-co-bg">
        <div className="flex h-8 flex-none items-center justify-center border-b border-co-line text-[11px] tracking-[0.06em] text-co-soft">
          Demo mode — no real charge
        </div>
        <div className="flex flex-none items-start justify-between px-6 pt-7 pb-6">
          <div className="flex flex-col gap-1">
            <div className="text-[13px] text-co-soft">Paying {payee}</div>
            <div className="text-[30px] font-medium tracking-[-0.01em]">{amount}</div>
            <div className="text-xs text-co-soft">{who}</div>
            {credit && <div className="text-xs text-co-soft">{credit}</div>}
          </div>
          <a href={cancelHref} className="text-[13px] text-co-soft hover:text-co-ink">
            Cancel
          </a>
        </div>

        <div role="tablist" aria-label="Payment method" className="mx-6 grid flex-none grid-cols-3 rounded-md bg-co-seg p-[3px]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cx('h-[38px] rounded text-[13px] transition-colors', tab === t.id ? 'bg-white font-medium' : 'text-[#55534e] hover:text-co-ink')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex-none animate-fade">
          {tab === 'card' && (
            <>
              <div className="mx-6 mt-5 flex flex-col rounded-md border border-co-line bg-white">
                <label className="flex flex-col gap-1 border-b border-co-line px-3.5 py-3">
                  <span className="text-[11px] text-co-soft">Card number</span>
                  <input
                    name="card"
                    inputMode="numeric"
                    autoComplete="off"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    className="bg-transparent text-base tracking-[0.06em] outline-none"
                  />
                </label>
                <div className="grid grid-cols-2">
                  <label className="flex flex-col gap-1 border-r border-co-line px-3.5 py-3">
                    <span className="text-[11px] text-co-soft">Expiry</span>
                    <input defaultValue="12 / 29" autoComplete="off" className="bg-transparent text-base outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 px-3.5 py-3">
                    <span className="text-[11px] text-co-soft">CVV</span>
                    <input defaultValue="123" type="password" autoComplete="off" className="bg-transparent text-base outline-none" />
                  </label>
                </div>
              </div>
              <p className="mx-6 mt-3 text-xs leading-[1.5] text-co-soft">Use any test card. Ending in 0000 simulates a decline.</p>
            </>
          )}
          {tab === 'bank_transfer' && (
            <div className="mx-6 mt-5 flex flex-col gap-2.5">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-co-line bg-white p-3.5 text-[13px]">
                <span className="text-co-soft">Bank</span>
                <span>Demo Bank</span>
                <span className="text-co-soft">Account</span>
                <span className="tabular">0123 456 789</span>
                <span className="text-co-soft">Amount</span>
                <span>{amount}</span>
                <span className="text-co-soft">Expires</span>
                <span>in {expiresIn}</span>
              </div>
              <p className="text-xs leading-[1.5] text-co-soft">Transfer the exact amount. In demo mode, choose an outcome below.</p>
            </div>
          )}
          {tab === 'ussd' && (
            <div className="mx-6 mt-5 flex flex-col gap-2.5">
              <div className="rounded-md border border-co-line bg-white p-3.5">
                <div className="text-[11px] text-co-soft">Dial on the phone linked to your bank</div>
                <div className="mt-1 font-mono text-xl tracking-[0.04em]">*000*{pref.slice(-6).toUpperCase()}#</div>
              </div>
              <p className="text-xs leading-[1.5] text-co-soft">Follow the prompts to approve. In demo mode, choose an outcome below.</p>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-none flex-col gap-3 px-6 pt-8 pb-7">
          <div className="text-[11px] uppercase tracking-[0.08em] text-co-soft">Demo outcome</div>
          <SimButton outcome="success" className="bg-co-ink text-white hover:bg-black">
            Simulate success · {amount}
          </SimButton>
          <SimButton outcome="failure" className="border border-co-line bg-white text-co-ink hover:bg-co-seg">
            Simulate failure
          </SimButton>
          <p className="text-center text-[11px] text-[#76736b]">Demo checkout · not a real payment provider</p>
        </div>
      </div>
    </form>
  )
}

function SimButton({ outcome, className, children }: { outcome: 'success' | 'failure'; className: string; children: React.ReactNode }) {
  const { pending, data } = useFormStatus()
  const mine = pending && data?.get('outcome') === outcome
  return (
    <button
      type="submit"
      name="outcome"
      value={outcome}
      disabled={pending}
      className={cx('flex h-[52px] items-center justify-center gap-3 rounded-md text-[15px] font-medium transition-colors disabled:opacity-70', className)}
    >
      {mine ? 'Processing…' : children}
    </button>
  )
}
