import type { PaymentProvider, RefundResult, VerifyResult } from './provider'

/**
 * Stub for the real thing. Not wired up; see README → "Making it real".
 *
 * TODO: initDeposit → POST https://api.paystack.co/transaction/initialize
 *       { email|phone, amount: amountKobo, reference: bookingRef, callback_url: returnUrl }
 *       and return data.authorization_url as checkoutUrl.
 * TODO: verify → GET https://api.paystack.co/transaction/verify/:reference; map
 *       data.status ('success' | 'failed' | 'abandoned') and data.channel.
 * TODO: add a webhook route (app/api/paystack/webhook/route.ts) that checks the
 *       x-paystack-signature HMAC and calls confirmDeposit() so confirmation
 *       doesn't depend on the client returning to the site.
 * TODO: refund → POST https://api.paystack.co/refund { transaction, amount }.
 */
export class PaystackProvider implements PaymentProvider {
  readonly name = 'paystack'
  constructor(private readonly secretKey: string) {}

  async initDeposit(): Promise<never> {
    throw new Error('PaystackProvider.initDeposit is not implemented yet')
  }
  async verify(): Promise<VerifyResult> {
    throw new Error('PaystackProvider.verify is not implemented yet')
  }
  async refund(): Promise<RefundResult> {
    throw new Error('PaystackProvider.refund is not implemented yet')
  }
}
