// Booking pages show live status and policy windows: always rendered per request.
export const dynamic = 'force-dynamic'

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-linen">{children}</div>
}
