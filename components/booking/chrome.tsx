import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx, Wordmark } from '@/components/ui'

const STEPS = ['Service', 'Stylist', 'Time', 'Hold'] as const

/** Top bar: Back/Close · wordmark · step count, then the four-segment progress rule. */
export function BookingTop({
  step,
  back,
  right,
}: {
  step?: 1 | 2 | 3 | 4
  back?: { href: string; label: string } | null
  right?: ReactNode
}) {
  return (
    <header className="flex-none">
      {/* Mobile */}
      <div className="flex h-14 items-center justify-between px-5 lg:hidden">
        <div className="w-16 text-sm">{back ? <Link href={back.href}>{back.label}</Link> : null}</div>
        <Wordmark className="text-[21px]" />
        <div className="w-16 text-right text-[13px] text-ink-soft">{right ?? (step ? `${step} / 4` : null)}</div>
      </div>
      {step && (
        <div className="flex gap-1 px-5 lg:hidden" aria-hidden>
          {STEPS.map((_, i) => (
            <div key={i} className={cx('h-0.5 flex-1 transition-colors duration-500', i < step ? 'bg-ink' : 'bg-line')} />
          ))}
        </div>
      )}
      {/* Desktop */}
      <div className="hidden h-[88px] items-center justify-between px-16 lg:flex">
        <Wordmark className="text-[30px]" />
        {step ? (
          <ol className="flex gap-8 text-[13px]" aria-label="Booking steps">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i + 1 === step ? 'step' : undefined}
                className={cx(i + 1 <= step ? 'text-ink' : 'text-ink-soft', i + 1 === step && 'border-b border-ink')}
              >
                {i + 1} {s}
              </li>
            ))}
          </ol>
        ) : (
          <span />
        )}
        <div className="min-w-12 text-right text-sm">{back ? <Link href={back.href}>{back.label}</Link> : right}</div>
      </div>
      {step && <p className="sr-only">Step {step} of 4: {STEPS[step - 1]}</p>}
    </header>
  )
}

/** Sticky bottom bar: what you've picked, and the one next action. */
export function BookingFooter({ title, sub, children, className }: { title: ReactNode; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('sticky bottom-0 z-10 flex-none border-t border-line bg-linen', className)}>
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 pt-4 pb-7 md:max-w-[720px] md:px-0 lg:h-[104px] lg:max-w-[1440px] lg:justify-end lg:gap-8 lg:px-16 lg:py-0">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:flex-none lg:text-right" aria-live="polite">
          <div className="truncate text-sm lg:text-[15px]">{title}</div>
          {sub && <div className="truncate text-xs text-ink-soft lg:text-[13px]">{sub}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function StepTitle({ children, sub, className }: { children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-2 px-5 pt-8 pb-2 md:px-0 lg:pt-12', className)}>
      <h1 className="font-serif text-[34px] leading-[1.15] lg:text-[56px] lg:leading-[1.05]">{children}</h1>
      {sub && <p className="text-sm text-ink-soft lg:text-[15px]">{sub}</p>}
    </div>
  )
}

export function Notice({ children, tone = 'olive' }: { children: ReactNode; tone?: 'olive' | 'rust' }) {
  return (
    <div
      role="status"
      className={cx(
        'mx-5 mt-4 animate-fade-up rounded-[2px] px-4 py-3 text-[13px] leading-[1.5] md:mx-0',
        tone === 'olive' ? 'bg-olive-mist text-olive' : 'bg-rust-mist text-rust',
      )}
    >
      {children}
    </div>
  )
}
