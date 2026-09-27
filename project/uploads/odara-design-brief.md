# Ọdàrà — Design Brief (for Claude Design)

## The project
Ọdàrà is a fictional salon in Lekki, Lagos, and a portfolio piece for a web developer. It's a full website plus a booking system with one big idea: **you hold your slot by paying a deposit.** No deposit, no booking. This cuts no-shows, which is where salons actually lose money.

Design the client-facing site, the booking flow, and a simple owner dashboard. **Mobile-first (375px)**, since most visitors arrive from Instagram and WhatsApp links. Then adapt the key screens to desktop.

## The feeling
**Luxury and calm, without trying.** The page should feel expensive because of restraint, space and care, not because it says so.

Aim for:
- Generous whitespace, a slow rhythm, few elements per screen
- Confident typography doing most of the work
- Warm, natural-light imagery of Black women's hair, nails and skin
- Quiet, precise copy
- Small details done well: alignment, spacing, subtle motion

Avoid:
- Gold gradients, foil textures, glitter, marble backgrounds
- Script or calligraphy fonts
- Words like "luxury", "premium", "exquisite", "indulge"
- Busy hero carousels, stock-photo smiles, heavy drop shadows
- Anything that feels like it's shouting

## Visual direction (starting point; refine freely)
- **Palette:** a warm off-white base (like unbleached linen), a deep near-black ink for type, and one restrained accent (a muted clay, a deep olive, or a dark cocoa; pick one and use it sparingly). Add a soft neutral for surfaces and dividers.
- **Type:** a refined display serif for headings and the wordmark, paired with a clean, quiet sans for UI and body text. **Both must render the Yoruba diacritics in Ọdàrà correctly:** Ọ (dot below) and à (grave). Check this before committing to a font.
- **Wordmark:** "Ọdàrà" set in the display serif. Let the diacritics be a feature, not an afterthought. No icon needed.
- **Imagery:** use placeholder slots with art direction notes: close crops of braids, a silk press catching light, hands with fresh gel nails, lashes. Warm tones, soft shadows, real textures.
- **Motion:** minimal. Gentle fades and slides on page load; a satisfying state change when a slot is held and when a booking is confirmed. Nothing bouncy.

## Screens to design

### Public site
1. **Home:**
   - Hero with the wordmark, one line of copy and a "Book" CTA
   - Short intro
   - Featured services
   - Stylists
   - Gallery
   - A calm "How booking works" section (explains the deposit in 3 steps, in plain words)
   - Policy summary
   - Hours and location
   - Footer
2. **Services:** a menu grouped as Hair, Nails, Lashes & Brows. Each item shows name, duration, price and deposit. It should read like a well-set restaurant menu, not a product grid.
3. **Stylists:** portrait, name, specialties and the services each offers.
4. **Policy:** deposit and cancellation rules, presented simply (a clean table or short blocks).

### Booking flow (the most important part)
5. **Choose service**
6. **Choose stylist:** "Any available" is the first, default option.
7. **Choose slot:** a date strip plus a time grid.
   - **Taken slots are visible but struck through and disabled, not hidden.** This signals that the salon is in demand. Make taken, available, selected and closed-day states all clearly distinct and elegant.
8. **Hold with deposit:** the key screen.
   - Booking summary
   - **The split is the hero:** "₦25,500 now · ₦59,500 on the day", with the total smaller beneath. The split should be the first thing the eye lands on.
   - The cancellation policy in 3 short lines, visible on the page, not hidden
   - Name and WhatsApp number fields
   - A countdown: "Slot held for 9:41"
   - Pay button with the exact amount: "Pay ₦25,500 deposit"
9. **Demo checkout:** neutral and unbranded (it must not look like Paystack or any real provider). Tabs for Card, Bank transfer and USSD, and a subtle "Demo mode — no real charge" label.
10. **Confirmed:**
    - Booking reference
    - Deposit paid and balance due on the day
    - A **WhatsApp receipt preview** styled as a message bubble
    - "Open in WhatsApp" and "Add to calendar" buttons
    - A note about the 24h reminder
11. **Returning-client fast path:** one screen. Last service and stylist are pre-filled, the next 3 open slots appear as chips, the deposit split is visible, and there's one pay button. It should feel noticeably faster than the full flow. If they have salon credit, show it applied.
12. **Manage booking:** details, the policy rule that applies right now (for example "Free to reschedule until Fri 14:00"), and Reschedule and Cancel actions. The cancel confirmation must state clearly what happens to the deposit.
13. **Hold expired** state and **payment failed** state.

### Owner dashboard (Studio)
14. **Today:**
    - Summary cards: bookings today, deposits collected, balance due today, and 30-day no-show rate
    - A day timeline with one column per stylist
15. **Bookings list** with status chips and actions (Mark arrived, Completed, No-show, Cancel by salon).
16. **Staff availability:** weekly hours and time off.
17. **Messages:** the WhatsApp outbox, showing sent receipts and queued reminders.

The dashboard can be denser and more utilitarian than the public site, but it should use the same palette and type so it clearly belongs to the same brand.

## Content to use
- Salon: Ọdàrà, Lekki Phase 1, Lagos. Open Tue–Sat 9am–7pm, Sun 12–6pm, closed Mon.
- Stylists:
  - **Adaeze:** braids and protective styles
  - **Tolu:** silk press and colour
  - **Bisi:** locs and natural hair
  - **Kemi:** nails
  - **Ifeoma:** lashes and brows
- Sample services:
  - Knotless braids, 6h, ₦85,000 (deposit ₦42,500)
  - Silk press, 2h, ₦35,000 (deposit ₦10,500)
  - Gel manicure, 1h, ₦15,000 (deposit ₦4,500)
  - Classic lash set, 1h 30m, ₦25,000 (deposit ₦7,500)
- Policy, in short:
  - Reschedule free up to 24h before.
  - Cancel more than 24h before: refund or credit.
  - Within 24h or no-show: deposit kept.
  - If we cancel, you get a full refund.

## Copy voice
Quiet, warm and direct. Short sentences with no hype. Explain the deposit as a mutual promise, not a penalty. For example: "Your deposit holds your chair. The rest is paid on the day."

## Deliverables
- Mobile designs for all screens above
- Desktop versions of Home, Services, Slot picker, Hold with deposit and Studio Today
- All states for slots, buttons, fields and status chips
- A small design system: colours, type scale, spacing, and core components (button, input, slot cell, service card, status chip, message bubble)
