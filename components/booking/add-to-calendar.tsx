import { btn, cx, ExternalLink } from '@/components/ui'

/** No-JS disclosure: .ics download for Apple/Outlook, or Google Calendar. */
export function AddToCalendar({ ics, google, className }: { ics: string; google: string; className?: string }) {
  return (
    <details className={cx('group relative', className)}>
      <summary className={cx(btn.secondary, 'w-full list-none [&::-webkit-details-marker]:hidden')}>Add to calendar</summary>
      <div className="mt-2 flex animate-fade flex-col border border-line bg-linen text-[15px]">
        <a href={ics} download className="border-b border-line px-4 py-3.5 hover:bg-parchment">
          Apple, Outlook and others (.ics)
        </a>
        <ExternalLink href={google} className="px-4 py-3.5 hover:bg-parchment">
          Google Calendar
        </ExternalLink>
      </div>
    </details>
  )
}
