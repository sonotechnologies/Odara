import { urlToken } from '@/lib/ids'
import type { PaymentMethod, PaymentProvider, VerifyResult } from './provider'

/**
 * Simulated payments. The demo checkout page records the outcome the visitor
 * picked ("Simulate success" / "Simulate failure") and verify() reads it back,
 * the same shape a real webhook-or-verify round trip would have.
 *
 * simulate() and verify() always run in the same request (the checkout form
 * action), so the in-memory map is safe on serverless as well.
 */
type Attempt = { amountKobo: number; outcome?: { ok: true; method: PaymentMethod } | { ok: false; reason: string } }

const g = globalThis as unknown as { __odaraDemoPayments?: Map<string, Attempt> }
const attempts = (g.__odaraDemoPayments ??= new Map())

export class DemoProvider implements PaymentProvider {
  readonly name = 'demo'

  async initDeposit(input: Parameters<PaymentProvider['initDeposit']>[0]) {
    const providerRef = `demo_${urlToken(9)}`
    attempts.set(providerRef, { amountKobo: input.amountKobo })
    const url = new URL(input.returnUrl)
    url.searchParams.set('pref', providerRef)
    return { providerRef, checkoutUrl: url.pathname + url.search }
  }

  /** Demo-only: what the checkout page's buttons call. */
  simulate(providerRef: string, amountKobo: number, outcome: Attempt['outcome']) {
    attempts.set(providerRef, { amountKobo, outcome })
  }

  async verify(providerRef: string): Promise<VerifyResult> {
    const a = attempts.get(providerRef)
    if (!a?.outcome) return { status: 'pending', providerRef }
    return a.outcome.ok
      ? { status: 'succeeded', providerRef, amountKobo: a.amountKobo, method: a.outcome.method }
      : { status: 'failed', providerRef, reason: a.outcome.reason }
  }

  async refund({ providerRef }: { providerRef: string; amountKobo: number; reason: string }) {
    // Real refunds take days to land; the demo records them as pending.
    return { status: 'pending' as const, providerRef: `${providerRef}_refund` }
  }
}
