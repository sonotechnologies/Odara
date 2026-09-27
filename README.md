# Ọdàrà

A website and booking system for Ọdàrà, a fictional salon in Lekki Phase 1, Lagos. It is a portfolio demo built around one idea:

> **The deposit is the gate.** A booking doesn't exist until a deposit is paid.

Salons lose money to no-shows. Here, a client holds a slot for 10 minutes while they pay a deposit (30%, or 50% for services of three hours or more). Only when the deposit lands does the hold become a booking. There is no "booked but unpaid" state anywhere: the studio never sees holds, and nothing is reserved without money on the table. The deposit is framed as a mutual promise: *your deposit holds your chair; the rest is paid on the day.*

- **Client side:** a calm marketing site that funnels into a mobile-first booking flow (service → stylist → slot → deposit → confirmed), a booking page that knows which policy rule applies right now, and a one-screen fast path for returning clients.
- **Owner side (`/studio`):** today's timeline per stylist, deposits collected, balance due, 30-day no-show rate, booking actions, staff hours and time off, and the WhatsApp outbox.

Payments and WhatsApp are **simulated**, behind interfaces that a real Paystack and WhatsApp Business API integration can drop into.

## Stack

Next.js 16 (App Router, Server Actions, Route Handlers) · TypeScript · Tailwind CSS 4 · Neon Postgres with Drizzle ORM · Zod · date-fns / date-fns-tz · Vitest. Deploys to Vercel.

- Every schedule is computed in `Africa/Lagos`. Times are stored as UTC `timestamptz`.
- Money is integer kobo, never floats.
- Every salon- and locale-specific value (name, address, currency, phone format, WhatsApp number, timezone, opening hours, deposit and policy numbers) lives in [`config/salon.ts`](config/salon.ts).

## Run it locally

You need Node 20+ and a Postgres 15+ database: a free [Neon](https://neon.tech) project, or a local Postgres.

```bash
npm install
cp .env.example .env         # set DATABASE_URL (Neon: use the pooled connection string)
npm run db:migrate           # schema + the no-double-booking exclusion constraint
npm run db:seed              # stylists, services, ~2 weeks of bookings, a month of history
npm run dev                  # http://localhost:3000
```

The seed is relative to "now", so the calendar always looks current. Re-run `npm run db:seed` at any time to reset the demo, or `npm run db:reset` to drop everything and rebuild.

```bash
npm test                     # Vitest: policy, deposit maths, availability engine
npm run lint                 # tsc --noEmit
```

### Deploy to Vercel

1. Create a Neon project and copy the **pooled** connection string.
2. Import the repo into Vercel. Set `DATABASE_URL`, `SESSION_SECRET` (a long random string), `APP_URL` (your deployment URL) and, optionally, `STUDIO_DEMO_EMAIL` / `STUDIO_DEMO_PASSWORD`.
3. Run `npm run db:migrate && npm run db:seed` once against the Neon database, from your machine.

The app picks its driver from the URL: the Neon serverless driver (WebSockets, with interactive transactions) for `*.neon.tech`, and `node-postgres` for anything else.

## Demo walkthrough

| What | Where | Notes |
|---|---|---|
| Book a chair | `/book` | Pick a service, a stylist ("Any available" is the default) and a time. Taken times are struck through, never hidden. |
| Checkout | after the hold screen | Neutral demo checkout. **Simulate success** or **Simulate failure**. A card number ending `0000` also declines. |
| Hold expiry | hold screen | Let the 10-minute countdown run out, and the slot is released. |
| Manage a booking | `/booking/ODR-XXXX` | Shows the rule that applies right now. Reschedule or cancel. |
| Returning client | `/book/again` | Phone **+234 803 555 0192** (Amaka, ₦5,000 credit). The OTP appears in a toast. |
| One-tap rebook | `/r/amaka` | The link a WhatsApp reminder would carry. It opens the fast path pre-filled. |
| Studio | `/studio` | **owner@odara.demo / odara-demo** (also shown on the login page). |

## How it works

### Holds, and why double booking can't happen

`lib/data/bookings.ts → createHold()` runs in one transaction:

1. Lazily expire stale holds (`status = 'hold' AND hold_expires_at < now()` → `expired`).
2. Re-run the availability engine for that exact slot against live data.
3. Assign the stylist. With "Any available", this is the qualified stylist with the fewest bookings that day.
4. Insert a `hold` row with a 10-minute expiry.

The last word belongs to Postgres itself ([`drizzle/0001_no_double_booking.sql`](drizzle/0001_no_double_booking.sql)):

```sql
EXCLUDE USING gist (stylist_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status IN ('hold', 'confirmed', 'arrived'))
```

If eight people race for the same chair, one gets it and seven see "Someone has just taken 10:00".

### Deposit → booking

`confirmDeposit()` turns the hold into a `confirmed` booking in **one transaction**. It records the payment, draws down salon credit, sends the WhatsApp receipt and queues the 24h reminder. A payment that arrives just after the hold expired still wins the chair if nobody else took it. If someone did, the constraint rejects the confirmation and the deposit is refunded.

### Availability engine

`lib/availability.ts` is pure and unit-tested. Slots sit on a 30-minute grid. A slot is open only if a qualified stylist is free for the **full service duration**, inside both salon and stylist hours, and not on time off. Closed days are returned as closed, fully booked days as full, and taken slots stay in the grid.

### Policy engine

`lib/policy.ts` is pure and unit-tested. Every screen that talks about the rules asks it.

| Situation | Outcome |
|---|---|
| Client reschedules more than 24h before | Free. Deposit carries over. |
| Client cancels more than 24h before | Refund to original method (3–5 business days, simulated) or instant salon credit. |
| Client cancels or reschedules within 24h | Deposit kept. The UI says so before they confirm. |
| No-show (marked by the salon) | Deposit kept. |
| Salon cancels | Full refund, always. |

### Deposit maths

`lib/deposit.ts`: `deposit = max(round(price × pct), ₦2,000)`, rounded to the nearest ₦500 and never more than the price. The rate is 30% by default and 50% for services of three hours or more. Salon credit comes off what's paid now; the deposit's value is unchanged.

## Simulated parts, and how to make them real

| Simulated | Where | To make it real |
|---|---|---|
| Payments | `lib/payments/demo.ts` (`DemoProvider`) | Implement `lib/payments/paystack.ts` (stub with TODOs): `initialize` → `authorization_url`, `verify`, `refund`. Add a webhook route that checks `x-paystack-signature` and calls `confirmDeposit()`. Swap the export in `lib/payments/index.ts`. |
| Refunds | `DemoProvider.refund` records `pending` | The Paystack refund API; update the payment row from the webhook. |
| WhatsApp | `lib/messaging/demo.ts` writes to `messages` | A WhatsApp Business API provider implementing `send` / `schedule`, using approved templates from `lib/messaging/templates.ts`. Keep the table as the log. |
| Reminder job | "Send due now" in `/studio/messages` | A Vercel Cron hitting a route that calls `dispatchDue()`. The same job can mark stale holds `expired` (they are already released lazily). |
| OTP | Code shown in a toast; signed hash in a cookie | Send the code by WhatsApp or SMS. Add rate limiting per phone and IP. |
| Studio login | One seeded owner, scrypt hash, signed cookie | Real accounts and roles (owner, front desk, stylist). |

**Hardening for production:** booking pages are reachable by reference alone, like an airline PNR. Pair the reference with the phone number, or send a signed manage link. Add rate limits to hold creation and OTP requests, and CSRF-safe origin checks on the webhook.

## Project map

```
app/
  (site)/            marketing: home, services, stylists, policy
  book/              booking flow, checkout, confirmation, returning-client fast path
  booking/           find / manage / reschedule / calendar (.ics)
  r/[token]/         one-tap rebook links
  studio/            owner dashboard (login, today, bookings, staff, messages)
components/          UI kit (buttons, chips, bubbles, split) and booking pieces
config/salon.ts      every salon and locale value
db/                  schema, client, migrate, seed
drizzle/             SQL migrations, including the exclusion constraint
lib/                 availability, policy, deposit, time, money, payments, messaging, data access
tests/               Vitest unit tests
design/              the original Claude Design handoff: prototypes, chat and both briefs
```

## Design

The visual system comes from the Claude Design prototypes in [`design/project`](design/project):

- **Colour:** linen `#F4EFE6`, ink `#1D1B17`, deep olive `#474E31` as the single accent, and rust `#8B3A26` only for errors and destructive actions.
- **Type:** EB Garamond for headings and the wordmark, Be Vietnam Pro for UI. Both ship the Vietnamese subset, so **Ọ** and **à** render properly.
- **Shape and depth:** 2px radius on controls, no shadows.

Photos are striped placeholders with art-direction notes until real photography is dropped in.

Where the build brief and the prototypes disagree, the build brief wins. Notably, knotless braids (6h) take a 50% deposit (₦42,500 now · ₦42,500 on the day), not the 30% shown in the mockups.
