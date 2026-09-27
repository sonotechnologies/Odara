import { cx } from '@/components/ui'

export const Bone = ({ className }: { className?: string }) => <div aria-hidden className={cx('animate-pulse rounded-[2px] bg-parchment', className)} />

/** Shown instantly while a booking step loads, so a tap always answers. */
export function BookingSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-[640px]">
      <div className="flex h-14 items-center justify-between px-5 lg:h-[88px]">
        <Bone className="h-4 w-12" />
        <Bone className="h-5 w-16" />
        <Bone className="h-4 w-8" />
      </div>
      <div className="px-5 pt-8">
        <Bone className="h-9 w-3/4" />
        <Bone className="mt-3 h-4 w-1/2" />
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Bone key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function StudioSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4 px-4 pt-5 lg:gap-6 lg:px-10 lg:pt-7">
      <Bone className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-24 lg:h-[120px]" />
        ))}
      </div>
      <Bone className="h-[420px] w-full" />
    </div>
  )
}
