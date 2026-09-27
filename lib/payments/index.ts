import { DemoProvider } from './demo'
import type { PaymentProvider } from './provider'

// Swap for `new PaystackProvider(process.env.PAYSTACK_SECRET_KEY!)` when it's real.
const demo = new DemoProvider()
export const payments: PaymentProvider = demo
export const demoPayments = demo
export type { PaymentMethod } from './provider'
