// Live availability, holds and payments: always rendered per request.
export const dynamic = 'force-dynamic'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-linen">{children}</div>
}
