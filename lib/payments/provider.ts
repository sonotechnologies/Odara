/**
 * The seam between Ọdàrà and whoever moves the money. The demo provider
 * simulates everything; PaystackProvider is where the real one goes.
 */
export type PaymentMethod = 'card' | 'bank_transfer' | 'ussd'

export type InitDepositInput = {
  bookingId: string
  bookingRef: string
  amountKobo: number
  client: { name: string; phone: string }
  /** Where the provider sends the client back to after paying. */
  returnUrl: string
}

export type InitDepositResult = {
  /** The provider's reference for this payment attempt. */
  providerRef: string
  /** Where to send the client to pay. */
  checkoutUrl: string
}

export type VerifyResult =
  | { status: 'succeeded'; providerRef: string; amountKobo: number; method: PaymentMethod }
  | { status: 'failed'; providerRef: string; reason: string }
  | { status: 'pending'; providerRef: string }

export type RefundResult = { status: 'pending' | 'succeeded' | 'failed'; providerRef: string }

export interface PaymentProvider {
  readonly name: string
  initDeposit(input: InitDepositInput): Promise<InitDepositResult>
  verify(providerRef: string): Promise<VerifyResult>
  refund(input: { providerRef: string; amountKobo: number; reason: string }): Promise<RefundResult>
}
