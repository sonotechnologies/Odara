import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { DemoCheckout } from '@/components/booking/checkout'
import { salon } from '@/config/salon'
import { getHold } from '@/lib/data/bookings'
import { applyCredit } from '@/lib/deposit'
import { formatMoney } from '@/lib/money'
import { payments } from '@/lib/payments'
import { formatPhone } from '@/lib/phone'
import { appUrl } from '@/lib/urls'

export const metadata: Metadata = { title: 'Checkout (demo)' }

type SP = Promise<{ pref?: string; tab?: string }>

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params
  const sp = await searchParams
  const hold = await getHold(id)
  if (!hold) notFound()
  if (hold.status === 'confirmed') redirect(`/book/confirmed/${hold.ref}`)
  if (hold.status !== 'hold' || !hold.client) redirect(`/book/hold/${id}`)

  const { dueNowKobo, creditUsedKobo } = applyCredit(hold.depositKobo, hold.client.creditKobo)
  if (dueNowKobo === 0) redirect(`/book/hold/${id}`)

  // Retries arrive without a provider reference; start a fresh attempt.
  const pref =
    sp.pref ??
    (
      await payments.initDeposit({
        bookingId: hold.id,
        bookingRef: hold.ref,
        amountKobo: dueNowKobo,
        client: { name: hold.client.name, phone: hold.client.phone },
        returnUrl: appUrl(`/book/checkout/${hold.id}`),
      })
    ).providerRef

  const secs = Math.max(0, Math.round((hold.holdExpiresAt!.getTime() - Date.now()) / 1000))
  const tab = sp.tab === 'bank_transfer' || sp.tab === 'ussd' ? sp.tab : 'card'

  return (
    <DemoCheckout
      id={hold.id}
      pref={pref}
      amount={formatMoney(dueNowKobo, { decimals: true })}
      payee={salon.name}
      who={`${hold.client.name.split(' ')[0].toLowerCase()} · ${formatPhone(hold.client.phone)}`}
      credit={creditUsedKobo ? `${formatMoney(creditUsedKobo)} salon credit applied` : undefined}
      cancelHref={`/book/hold/${hold.id}`}
      initialTab={tab}
      expiresIn={`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}
    />
  )
}
