# Ọdàrà — Build Brief (for Claude Code)

## What we're building
A portfolio demo: a full website and booking system for **Ọdàrà**, a fictional salon in Lekki Phase 1, Lagos. The core idea is that **the deposit is the gate**. A booking does not exist until a deposit is paid. That is the whole product thesis, so the code should reflect it: there is no "booked but unpaid" state visible to anyone.

It has two sides:
1. **Client side:** a marketing site that funnels into a mobile-first booking flow (service → stylist → slot → deposit → confirmed), plus a one-screen fast path for returning clients.
2. **Owner side (`/studio`):** a simple dashboard for today's bookings, deposits collected, no-show tracking and stylist availability.

Payments and WhatsApp are **simulated** for the demo, behind clean interfaces so real Paystack and the WhatsApp Business API can drop in later.

## Stack
- **Next.js** (App Router, TypeScript, Server Actions / Route Handlers)
- **Tailwind CSS**
- **Neon** (serverless Postgres) with **Drizzle ORM** and migrations
- **Vercel** hosting
- `date-fns` + `date-fns-tz`. All scheduling runs in **Africa/Lagos**, and times are stored as UTC `timestamptz`.
- Money is stored as **integer kobo**, never floats.
- Validation with **Zod**.
- No external auth provider. Owner login is a seeded demo account with a signed session cookie. Client identity is phone number plus a simulated OTP.

Put all locale values in `config/salon.ts`: salon name, address, currency, phone format, WhatsApp number, timezone, opening hours and policy numbers. Nothing location-specific should be hard-coded elsewhere.

## Pages and routes

### Public site
- `/`: hero, short intro, featured services, stylists, gallery, "how booking works" (explains the deposit plainly), policy summary, hours and location, booking CTA
- `/services`: full menu grouped by category (Hair, Nails, Lashes & Brows), with price, duration and deposit shown on each item
- `/stylists`: profiles showing specialties and the services each stylist offers
- `/policy`: the full deposit and cancellation policy
- `/book`: the booking flow (see below)
- `/booking/[ref]`: a client's booking page, where they can view, reschedule, cancel (policy-aware) and add to calendar
- `/r/[token]`: the one-tap rebook link (from WhatsApp messages) that opens the fast path pre-filled

### Studio (owner)
- `/studio/login`: demo credentials, shown on the login page for easy portfolio viewing
- `/studio`: today at a glance, with a timeline in columns per stylist and summary cards (bookings today, deposits collected today/week, balance due today, no-show rate over 30 days)
- `/studio/bookings`: filterable list (date, stylist, status) with actions: **Mark arrived**, **Mark completed** (records balance paid on the day), **Mark no-show** (deposit forfeited), **Cancel by salon** (full refund)
- `/studio/staff`: per-stylist weekly hours, time off (date ranges) and services they perform
- `/studio/messages`: the simulated WhatsApp outbox, listing sent receipts, queued 24h reminders and rebook links, each with a status

## Booking flow (client)

**Step 1: Service.** The client picks one service. Show price, duration and deposit amount on each card.

**Step 2: Stylist.** Show stylists who perform the chosen service, plus **"Any available"** as the default first option.

**Step 3: Slot.** Show a date strip for the next 21 days, then a time grid.
- **Taken slots are shown struck through and disabled, never hidden.** This is a deliberate scarcity signal. Use real `<button disabled>` elements with an `aria-label` like "10:30, taken".
- Slots are on a 30-minute grid. A slot is available only if the stylist is free for the **full service duration**, within opening hours, and not in time off.
- With "Any available", a slot is open if at least one qualified stylist is free. Assign the stylist with the fewest bookings that day.
- Closed days are shown but visually muted.

**Step 4: Hold with deposit.** This is the heart of the product. The screen shows:
- A summary (service, stylist, date and time, duration)
- **The split, stated plainly:** "₦25,500 now · ₦59,500 on the day" with total ₦85,000. The split must be the visual focus, not the total.
- The cancellation policy in 3 short lines, visible on the page, not behind a link, with a link to the full `/policy`
- A phone number field (WhatsApp) and name
- A pay button labelled with the exact amount: "Pay ₦25,500 deposit"

Entering this step creates a **`hold`** with a **10-minute expiry**. Show a countdown ("Slot held for 9:41"). If the hold expires, release the slot and send the client back to the slot picker with a clear message.

**Step 5: Simulated checkout.** A neutral, **unbranded** demo checkout. It must not imitate Paystack's or Flutterwave's branding. It offers Card, Bank transfer and USSD tabs, and a visible "Demo mode — no real charge" label. It has two buttons: **Simulate success** and **Simulate failure**. On success, the hold becomes a `confirmed` booking in one transaction. On failure, the hold is kept until expiry and the client can retry.

**Step 6: Confirmed.**
- Booking reference, for example `ODR-4K7Q`
- The split again (deposit paid, balance due on the day)
- A **WhatsApp receipt preview** rendered as a message bubble, plus an "Open in WhatsApp" `wa.me` link with the receipt pre-filled
- **Add to calendar:** an `.ics` download and a Google Calendar link
- A note that a reminder will arrive 24 hours before, with a link to manage the booking

### Returning-client fast path
- The client enters a phone number and gets a simulated OTP. For the demo, show the code in a toast. A "remember this device" option sets a signed cookie for 90 days.
- A recognised client lands on **one screen**: last service and stylist pre-selected, the next 3 open slots shown as chips, the deposit split visible, and a single "Pay ₦X deposit" button. They can still change the service, stylist or slot inline without leaving the screen.
- `/r/[token]` from a WhatsApp message goes straight to this screen.
- A client with **credit on file** (from an earlier cancellation) sees it applied to the deposit automatically. If the credit covers the whole deposit, the button reads "Confirm with credit".

## Deposit rules
- Each service has a `deposit_percent`: **30% by default, 50% for services of 3 hours or more.**
- Minimum deposit is **₦2,000**, so deposit = `max(round(price × pct), 200000 kobo)`.
- Round deposits to the nearest ₦500 for clean numbers.
- The deposit is always shown as a split, never as a lone total.

## Cancellation and reschedule policy
Encode this as pure functions in `lib/policy.ts` with unit tests. Pull the numbers from `config/salon.ts`.

| Situation | Outcome |
|---|---|
| Client reschedules **more than 24h** before | Free. Deposit carries over. |
| Client cancels **more than 24h** before | Client chooses a refund to the original method (shown as "3–5 business days", simulated) or instant salon credit. |
| Client cancels or reschedules **within 24h** | Deposit forfeited. The UI states this clearly before they confirm. |
| **No-show** (marked by salon) | Deposit forfeited. |
| **Salon cancels** | Full refund, always. |

The booking page (`/booking/[ref]`) must show which rule applies **right now**, for example "You can reschedule free until Fri 14:00".

## Data model (Drizzle / Postgres)
- `stylists`: id, name, slug, bio, specialties, photo_url, active
- `services`: id, category, name, description, duration_min, price_kobo, deposit_percent, active
- `stylist_services`: stylist_id, service_id
- `working_hours`: stylist_id, weekday, start_time, end_time
- `time_off`: stylist_id, starts_at, ends_at, reason
- `clients`: id, phone (E.164, unique), name, credit_kobo, created_at
- `bookings`: id, ref, client_id, stylist_id, service_id, starts_at, ends_at, status (`hold` | `confirmed` | `arrived` | `completed` | `no_show` | `cancelled_client` | `cancelled_salon` | `expired`), price_kobo, deposit_kobo, balance_kobo, hold_expires_at, created_at
- `payments`: id, booking_id, type (`deposit` | `balance` | `refund` | `credit_applied`), amount_kobo, method, status, provider_ref, created_at
- `messages`: id, booking_id, client_id, kind (`receipt` | `reminder_24h` | `rebook` | `cancellation`), body, scheduled_for, sent_at, status
- `rebook_tokens`: token, client_id, service_id, stylist_id, expires_at

**No double booking:** use a Postgres exclusion constraint (`btree_gist`) on `(stylist_id, tstzrange(starts_at, ends_at))` over rows whose status is `hold` or `confirmed` or `arrived`. Hold creation runs in a transaction. Treat expired holds as free; a lazy cleanup at query time is enough, and a Vercel Cron job that marks them `expired` is optional.

## Interfaces for the demo-to-real swap
- `lib/payments/provider.ts` defines a `PaymentProvider` interface (`initDeposit`, `verify`, `refund`). Implement `DemoProvider` now and leave a stub `PaystackProvider` with TODOs.
- `lib/messaging/provider.ts` defines a `MessagingProvider` interface (`send`, `schedule`). Implement `DemoWhatsAppProvider`, which writes to the `messages` table. Reminders are rows with `scheduled_for = starts_at − 24h`. `/studio/messages` shows them, and a "send due now" button simulates the job running.
- Message templates live in `lib/messaging/templates.ts`: receipt, 24h reminder (with a manage link and the rebook link) and cancellation. Keep them short and plain.

## Seed data
- Salon: Ọdàrà, Lekki Phase 1, Lagos. Open Tue–Sat 09:00–19:00, Sun 12:00–18:00, closed Mon.
- Stylists:
  - **Adaeze:** braids and protective styles
  - **Tolu:** silk press and colour
  - **Bisi:** locs and natural hair
  - **Kemi:** nails
  - **Ifeoma:** lashes and brows
- Services:

| Category | Service | Duration | Price |
|---|---|---|---|
| Hair | Silk press | 2h | ₦35,000 |
| Hair | Wash, treat & style | 1h 30m | ₦20,000 |
| Hair | Knotless braids (medium, mid-back) | 6h | ₦85,000 |
| Hair | Feed-in cornrows | 2h 30m | ₦30,000 |
| Hair | Loc retwist & style | 2h | ₦28,000 |
| Hair | Frontal wig install | 3h | ₦45,000 |
| Hair | Trim | 30m | ₦8,000 |
| Nails | Gel manicure | 1h | ₦15,000 |
| Nails | Acrylic full set | 2h | ₦28,000 |
| Nails | Pedicure | 1h | ₦15,000 |
| Lashes & Brows | Classic lash set | 1h 30m | ₦25,000 |
| Lashes & Brows | Brow shape & tint | 30m | ₦10,000 |

- **Busy-looking calendar:** seed about 60 confirmed bookings over the next 14 days, heavier on Fri–Sat (around 60–70% taken), so the struck-through slots are visible in the demo.
- Seed some past bookings with a mix of completed and no-show so the dashboard stats look real.
- Seed one returning client (a demo phone number shown on the fast-path screen) with ₦5,000 credit.

## Quality bar
- **Mobile-first**, designed at 375px, and works up to desktop.
- Accessible: keyboard navigable slot grid, visible focus, correct ARIA on disabled slots, and colour contrast of at least 4.5:1.
- Fast: server components by default, images through `next/image`, no heavy UI libraries.
- Use the diacritics **Ọdàrà** everywhere in the UI. Use the ASCII slug `odara` in URLs and the package name.
- Unit tests for `lib/policy.ts`, deposit calculation and slot availability (Vitest).
- A README covering the concept (deposit as gate), how to run it locally with Neon, demo credentials, and the list of simulated parts and how to make them real.

## Suggested build order
1. Scaffold, config, Drizzle schema, migrations, seed
2. Availability engine and tests
3. Booking flow (steps 1–6) with the hold, expiry and demo checkout
4. Booking management page and the policy engine
5. Returning-client fast path and rebook tokens
6. Studio dashboard
7. Marketing pages, using the design from the design brief
8. Polish, accessibility pass, README, deploy to Vercel
