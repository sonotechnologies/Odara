import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const bookingStatus = pgEnum('booking_status', [
  'hold',
  'confirmed',
  'arrived',
  'completed',
  'no_show',
  'cancelled_client',
  'cancelled_salon',
  'expired',
])

export const paymentType = pgEnum('payment_type', ['deposit', 'balance', 'refund', 'credit_applied'])
export const paymentStatus = pgEnum('payment_status', ['pending', 'succeeded', 'failed'])
export const messageKind = pgEnum('message_kind', ['receipt', 'reminder_24h', 'rebook', 'cancellation', 'rescheduled', 'no_show'])
export const messageStatus = pgEnum('message_status', ['queued', 'sent', 'failed', 'cancelled'])

export const stylists = pgTable('stylists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  bio: text('bio').notNull().default(''),
  specialties: text('specialties').notNull().default(''),
  photoUrl: text('photo_url'),
  sortOrder: smallint('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  durationMin: integer('duration_min').notNull(),
  priceKobo: integer('price_kobo').notNull(),
  depositPercent: smallint('deposit_percent').notNull(),
  featured: boolean('featured').notNull().default(false),
  sortOrder: smallint('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const stylistServices = pgTable(
  'stylist_services',
  {
    stylistId: uuid('stylist_id')
      .notNull()
      .references(() => stylists.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.stylistId, t.serviceId] })],
)

export const workingHours = pgTable(
  'working_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stylistId: uuid('stylist_id')
      .notNull()
      .references(() => stylists.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(), // 0 = Sunday
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (t) => [uniqueIndex('working_hours_stylist_weekday').on(t.stylistId, t.weekday)],
)

export const timeOff = pgTable('time_off', {
  id: uuid('id').primaryKey().defaultRandom(),
  stylistId: uuid('stylist_id')
    .notNull()
    .references(() => stylists.id, { onDelete: 'cascade' }),
  startsAt: ts('starts_at').notNull(),
  endsAt: ts('ends_at').notNull(),
  reason: text('reason').notNull().default(''),
})

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(), // E.164
  name: text('name').notNull(),
  creditKobo: integer('credit_kobo').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ref: text('ref').notNull().unique(),
    // Null while a hold is in progress: we only learn who the client is on the hold screen.
    clientId: uuid('client_id').references(() => clients.id),
    stylistId: uuid('stylist_id')
      .notNull()
      .references(() => stylists.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    startsAt: ts('starts_at').notNull(),
    endsAt: ts('ends_at').notNull(),
    status: bookingStatus('status').notNull(),
    priceKobo: integer('price_kobo').notNull(),
    depositKobo: integer('deposit_kobo').notNull(),
    balanceKobo: integer('balance_kobo').notNull(),
    holdExpiresAt: ts('hold_expires_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('bookings_starts_at').on(t.startsAt),
    index('bookings_stylist_starts').on(t.stylistId, t.startsAt),
    index('bookings_client').on(t.clientId),
    // The exclusion constraint that makes double booking impossible lives in
    // drizzle/0001_no_double_booking.sql (drizzle-kit can't express it).
  ],
)

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    type: paymentType('type').notNull(),
    amountKobo: integer('amount_kobo').notNull(),
    method: text('method').notNull(), // card | bank_transfer | ussd | credit | in_salon
    status: paymentStatus('status').notNull(),
    providerRef: text('provider_ref'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('payments_booking').on(t.bookingId), index('payments_created').on(t.createdAt)],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    kind: messageKind('kind').notNull(),
    body: text('body').notNull(),
    scheduledFor: ts('scheduled_for').notNull(),
    sentAt: ts('sent_at'),
    status: messageStatus('status').notNull(),
  },
  (t) => [index('messages_scheduled').on(t.status, t.scheduledFor)],
)

export const rebookTokens = pgTable('rebook_tokens', {
  token: text('token').primaryKey(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id),
  stylistId: uuid('stylist_id').references(() => stylists.id),
  expiresAt: ts('expires_at').notNull(),
})

/** Studio owners. One seeded demo account. */
export const owners = pgTable('owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export type Stylist = typeof stylists.$inferSelect
export type Service = typeof services.$inferSelect
export type Client = typeof clients.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type BookingStatus = (typeof bookingStatus.enumValues)[number]
export type Payment = typeof payments.$inferSelect
export type Message = typeof messages.$inferSelect
export type MessageKind = (typeof messageKind.enumValues)[number]
export type WorkingHours = typeof workingHours.$inferSelect
export type TimeOff = typeof timeOff.$inferSelect
