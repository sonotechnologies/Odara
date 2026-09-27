import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { BookingStatus } from '@/db/schema'
import { salon } from '@/config/salon'

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

/** The wordmark. Line-height stays ≥ 1.1 so the dot under Ọ is never clipped. */
export function Wordmark({ className, href = '/' }: { className?: string; href?: string | null }) {
  const mark = <span className={cx('font-serif leading-[1.2]', className)}>{salon.name}</span>
  return href ? (
    <Link href={href} aria-label={`${salon.name}, home`} className="hover:text-ink">
      {mark}
    </Link>
  ) : (
    mark
  )
}

const btnBase =
  'inline-flex items-center justify-center gap-3 rounded-[2px] font-medium tracking-[0.02em] transition-colors duration-200 disabled:cursor-not-allowed'
export const btn = {
  primary: cx(btnBase, 'h-[52px] px-7 text-[15px] bg-ink text-linen hover:bg-olive disabled:bg-line disabled:text-ink-faint'),
  primaryLg: cx(btnBase, 'h-14 px-8 text-base bg-ink text-linen hover:bg-olive disabled:bg-line disabled:text-ink-faint'),
  secondary: cx(btnBase, 'h-[52px] px-7 text-[15px] border border-ink text-ink hover:bg-parchment'),
  destructive: cx(btnBase, 'h-[52px] px-7 text-[15px] border border-rust text-rust hover:bg-rust-mist'),
  danger: cx(btnBase, 'h-[52px] px-7 text-[15px] bg-rust text-linen hover:bg-[#74301f]'),
  quiet: cx(btnBase, 'h-[52px] px-7 text-[15px] text-ink hover:bg-parchment'),
}
export const textLink = 'border-b border-ink pb-[2px] hover:text-olive hover:border-olive transition-colors'

export function Eyebrow({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'h2' | 'h3' | 'p' }) {
  return <As className={cx('eyebrow', className)}>{children}</As>
}

/** Striped image slot with an art-direction note, until real photography lands. */
export function Placeholder({ note, className }: { note: string; className?: string }) {
  return (
    <div role="img" aria-label={note} className={cx('stripes flex items-end p-3 font-mono text-[11px] leading-[1.5] text-placeholder-ink', className)}>
      <span aria-hidden>{note}</span>
    </div>
  )
}

// ── Status chip ───────────────────────────────────────────────
const CHIP: Record<BookingStatus, { label: string; cls: string; dot: string }> = {
  hold: { label: 'Held', cls: 'border border-dashed border-olive text-olive', dot: 'bg-olive' },
  confirmed: { label: 'Confirmed', cls: 'bg-olive-mist text-olive border border-olive-mist', dot: 'bg-olive' },
  arrived: { label: 'Arrived', cls: 'bg-olive text-linen border border-olive', dot: 'bg-linen' },
  completed: { label: 'Completed', cls: 'bg-ink text-linen border border-ink', dot: 'bg-linen' },
  no_show: { label: 'No-show', cls: 'bg-rust-mist text-rust border border-rust-mist', dot: 'bg-rust' },
  cancelled_client: { label: 'Cancelled', cls: 'text-ink-soft border border-line', dot: 'bg-closed' },
  cancelled_salon: { label: 'Cancelled by salon', cls: 'text-rust border border-line', dot: 'bg-rust' },
  expired: { label: 'Expired', cls: 'bg-parchment text-ink-soft border border-parchment', dot: 'bg-closed' },
}
export const statusLabel = (s: BookingStatus) => CHIP[s].label

export function StatusChip({ status, size = 'md' }: { status: BookingStatus; size?: 'sm' | 'md' }) {
  const c = CHIP[status]
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-300',
        size === 'sm' ? 'h-6 px-[9px] text-[11px]' : 'h-[26px] px-2.5 text-xs',
        c.cls,
      )}
    >
      <span aria-hidden className={cx('rounded-full', size === 'sm' ? 'size-[5px]' : 'size-1.5', c.dot)} />
      {c.label}
    </span>
  )
}

// ── Message bubble ────────────────────────────────────────────
export function MessageBubble({
  body,
  meta,
  from,
  variant = 'sent',
  className,
}: {
  body: ReactNode
  meta?: ReactNode
  from?: string
  variant?: 'sent' | 'queued' | 'failed'
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex max-w-[300px] flex-col gap-1.5 self-start rounded-[2px_12px_12px_12px] px-3.5 pt-3 pb-2',
        variant === 'sent' && 'bg-bubble',
        variant === 'queued' && 'border border-dashed border-taken text-ink-soft',
        variant === 'failed' && 'border border-rust-line text-ink-soft',
        className,
      )}
    >
      {from && <div className="text-xs font-medium text-olive">{from}</div>}
      <div className="whitespace-pre-line text-sm leading-[1.5] [overflow-wrap:anywhere]">{body}</div>
      {meta && <div className="self-end text-[11px] text-ink-soft">{meta}</div>}
    </div>
  )
}

// ── The split: the deposit is always now + on the day ─────────
export function Split({
  now,
  onDay,
  size = 'md',
  nowLabel = 'now',
}: {
  now: string
  onDay: string
  size?: 'sm' | 'md' | 'lg'
  nowLabel?: string
}) {
  if (size === 'lg') {
    return (
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1">
          <div className="font-serif text-[80px] leading-none lining-nums">{now}</div>
          <div className="text-sm uppercase tracking-[0.1em]">{nowLabel}</div>
        </div>
        <div className="flex flex-col gap-1 text-ink-soft">
          <div className="font-serif text-[40px] leading-none lining-nums">{onDay}</div>
          <div className="text-sm uppercase tracking-[0.1em]">on the day</div>
        </div>
      </div>
    )
  }
  const big = size === 'md' ? 'text-[50px]' : 'text-[42px]'
  const small = size === 'md' ? 'text-[30px]' : 'text-[26px]'
  return (
    <div className="flex items-end gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <div className={cx('font-serif leading-none lining-nums', big)}>{now}</div>
        <div className="text-[13px] uppercase tracking-[0.08em]">{nowLabel}</div>
      </div>
      <div aria-hidden className={cx('w-px bg-line-strong', size === 'md' ? 'h-14' : 'h-[46px]')} />
      <div className="flex flex-col gap-0.5 text-ink-soft">
        <div className={cx('font-serif leading-none lining-nums', small)}>{onDay}</div>
        <div className="text-[13px] uppercase tracking-[0.08em]">on the day</div>
      </div>
    </div>
  )
}

export function PolicyLines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <ul className={cx('flex flex-col gap-1.5 text-[13px] leading-[1.5]', className)}>
      {lines.map((l) => (
        <li key={l} className="flex gap-2.5">
          <span aria-hidden className="text-olive">
            —
          </span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  )
}

/** Label / value rows with hairlines, used for references and money. */
export function KeyRows({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cx('border-t border-line', className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex justify-between gap-4 border-b border-line py-3.5 text-sm">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="text-right">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        checked ? 'border-olive' : 'border-stone',
      )}
    >
      <span className={cx('size-2 rounded-full transition-colors', checked ? 'bg-olive' : 'bg-transparent')} />
    </span>
  )
}

export function Spinner() {
  return <span aria-hidden className="size-3.5 animate-spin rounded-full border-[1.5px] border-ink-soft border-t-linen" />
}

export function ConfirmMark() {
  return (
    <div aria-hidden className="flex size-11 animate-rise items-center justify-center rounded-full bg-olive">
      <div className="h-2 w-3.5 -translate-y-0.5 -rotate-45 border-b-[1.5px] border-l-[1.5px] border-linen" />
    </div>
  )
}

export function ExternalLink(props: ComponentProps<'a'>) {
  return <a target="_blank" rel="noopener noreferrer" {...props} />
}
