/**
 * Seeds a believable salon: five stylists, twelve services, ~60 upcoming
 * bookings (busier on Friday and Saturday), a month of history with a few
 * no-shows, the WhatsApp outbox, and one returning client with ₦5,000 credit.
 *
 * Everything is relative to "now" so the demo always looks current.
 * Deterministic: a fixed PRNG seed produces the same salon every time.
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { salon } from '../config/salon'
import { getDaySlots, type StylistDay } from '../lib/availability'
import { calculateDeposit, defaultDepositPercent } from '../lib/deposit'
import * as T from '../lib/messaging/templates'
import { hashPassword } from '../lib/password'
import { addDaysToKey, atSalonTime, todayKey, weekdayOfKey } from '../lib/time'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle({ client: pool, schema })
const APP = process.env.APP_URL ?? 'http://localhost:3000'

/**
 * Stable ids for the catalogue, derived from slugs, so re-seeding never
 * invalidates ids the app has cached (see lib/data/catalog.ts).
 */
const stableId = (kind: string, slug: string) => {
  const h = createHash('sha256').update(`odara:${kind}:${slug}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

// ── Deterministic randomness ──────────────────────────────────
let seed = 20261007
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]
const chance = (p: number) => rand() < p
const HOUR = 3_600_000
const DAY = 24 * HOUR
const now = new Date()
const today = todayKey(now)

// Unique refs (seed-local).
const usedRefs = new Set<string>()
const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
function ref() {
  for (;;) {
    let s = 'ODR-'
    for (let i = 0; i < 4; i++) s += ALPHA[Math.floor(rand() * ALPHA.length)]
    if (!usedRefs.has(s) && s !== 'ODR-4K7Q') return usedRefs.add(s), s
  }
}
let tok = 0
const token = () => `seed${(tok++).toString(36).padStart(4, '0')}${Math.floor(rand() * 1e9).toString(36)}`

// ── Catalogue ─────────────────────────────────────────────────
const SERVICES = [
  ['Hair', 'silk-press', 'Silk press', 120, 35_000, 'Wash, treatment and a press that moves.', true],
  ['Hair', 'wash-treat-style', 'Wash, treat & style', 90, 20_000, 'A deep cleanse, a mask, and a simple finished style.', false],
  ['Hair', 'knotless-braids', 'Knotless braids', 360, 85_000, 'Medium, mid-back. Pre-stretched hair included.', true],
  ['Hair', 'feed-in-cornrows', 'Feed-in cornrows', 150, 30_000, 'Six to ten neat rows, your pattern or ours.', false],
  ['Hair', 'loc-retwist', 'Loc retwist & style', 120, 28_000, 'Retwist, a light oil, and a simple style.', false],
  ['Hair', 'frontal-wig-install', 'Frontal wig install', 180, 45_000, 'Custom fit, melt and style. Bring your unit.', false],
  ['Hair', 'trim', 'Trim', 30, 8_000, 'Ends only, on dry, stretched hair.', false],
  ['Nails', 'gel-manicure', 'Gel manicure', 60, 15_000, 'Shape, cuticle care and gel colour.', true],
  ['Nails', 'acrylic-full-set', 'Acrylic full set', 120, 28_000, 'Your length and shape, gel colour on top.', false],
  ['Nails', 'pedicure', 'Pedicure', 60, 15_000, 'Soak, scrub, shape and polish.', false],
  ['Lashes & Brows', 'classic-lash-set', 'Classic lash set', 90, 25_000, 'One extension per natural lash. Soft and even.', true],
  ['Lashes & Brows', 'brow-shape-tint', 'Brow shape & tint', 30, 10_000, 'Threaded shape and a tint matched to your hair.', false],
] as const

type Hours = Record<number, [string, string]>
const TUE_SAT: Hours = { 2: ['09:00', '19:00'], 3: ['09:00', '19:00'], 4: ['09:00', '19:00'], 5: ['09:00', '19:00'], 6: ['09:00', '19:00'] }
const STYLISTS: { slug: string; name: string; specialties: string; bio: string; hours: Hours; services: string[] }[] = [
  {
    slug: 'adaeze',
    name: 'Adaeze',
    specialties: 'Braids and protective styles',
    bio: 'Twelve years of braiding. Neat parts, light tension, styles that last.',
    hours: TUE_SAT,
    services: ['knotless-braids', 'feed-in-cornrows', 'frontal-wig-install'],
  },
  {
    slug: 'tolu',
    name: 'Tolu',
    specialties: 'Silk press and colour',
    bio: 'Healthy heat and quiet colour. Tolu’s presses move and last the week.',
    hours: { ...TUE_SAT, 0: ['12:00', '18:00'] },
    services: ['silk-press', 'wash-treat-style', 'frontal-wig-install', 'trim'],
  },
  {
    slug: 'bisi',
    name: 'Bisi',
    specialties: 'Locs and natural hair',
    bio: 'Starter locs to long-term care, and natural hair left to be itself.',
    hours: { 3: ['09:00', '19:00'], 4: ['09:00', '19:00'], 5: ['09:00', '19:00'], 6: ['09:00', '19:00'], 0: ['12:00', '18:00'] },
    services: ['loc-retwist', 'wash-treat-style', 'knotless-braids', 'feed-in-cornrows', 'trim'],
  },
  {
    slug: 'kemi',
    name: 'Kemi',
    specialties: 'Nails',
    bio: 'Clean cuticles, even colour, and shapes that suit your hands.',
    hours: { ...TUE_SAT, 0: ['12:00', '18:00'] },
    services: ['gel-manicure', 'acrylic-full-set', 'pedicure'],
  },
  {
    slug: 'ifeoma',
    name: 'Ifeoma',
    specialties: 'Lashes and brows',
    bio: 'Soft, even sets and brows that frame without shouting.',
    hours: { 2: ['10:00', '19:00'], 4: ['10:00', '19:00'], 5: ['10:00', '19:00'], 6: ['09:00', '19:00'], 0: ['12:00', '18:00'] },
    services: ['classic-lash-set', 'brow-shape-tint'],
  },
]

const FIRST = ['Funke', 'Yewande', 'Ngozi', 'Ronke', 'Dami', 'Zainab', 'Temi', 'Amina', 'Kiki', 'Chioma', 'Lola', 'Halima', 'Tomi', 'Bola', 'Ada', 'Nneka', 'Folake', 'Ifeyinwa', 'Simi', 'Titi', 'Aisha', 'Morayo', 'Uche', 'Kemi', 'Oyin', 'Jumoke', 'Eniola', 'Chiamaka', 'Hauwa', 'Busola', 'Adanna', 'Toyin', 'Obiageli', 'Rukayat', 'Deola', 'Ebele', 'Fisayo', 'Ijeoma', 'Mide', 'Sade']
const LAST = ['Adeyemi', 'Okafor', 'Bello', 'Balogun', 'Eze', 'Ogunleye', 'Nwosu', 'Lawal', 'Okeke', 'Afolabi', 'Chukwu', 'Ibrahim', 'Adebayo', 'Obi', 'Ojo', 'Mohammed', 'Onyeka', 'Salami', 'Uzor', 'Babatunde']

async function main() {
  // Wipe in dependency order.
  await db.delete(schema.messages)
  await db.delete(schema.payments)
  await db.delete(schema.rebookTokens)
  await db.delete(schema.bookings)
  await db.delete(schema.timeOff)
  await db.delete(schema.workingHours)
  await db.delete(schema.stylistServices)
  await db.delete(schema.clients)
  await db.delete(schema.services)
  await db.delete(schema.stylists)
  await db.delete(schema.owners)

  // Owner
  await db.insert(schema.owners).values({
    email: process.env.STUDIO_DEMO_EMAIL ?? 'owner@odara.demo',
    name: 'Ọdàrà Studio',
    passwordHash: await hashPassword(process.env.STUDIO_DEMO_PASSWORD ?? 'odara-demo'),
  })

  // Services
  const svc = await db
    .insert(schema.services)
    .values(
      SERVICES.map(([category, slug, name, durationMin, naira, description, featured], i) => ({
        id: stableId('service', slug),
        category,
        slug,
        name,
        description,
        durationMin,
        priceKobo: naira * 100,
        depositPercent: defaultDepositPercent(durationMin),
        featured,
        sortOrder: i,
      })),
    )
    .returning()
  const svcBySlug = Object.fromEntries(svc.map((s) => [s.slug, s]))

  // Stylists, hours, services
  const sty = await db
    .insert(schema.stylists)
    .values(STYLISTS.map((s, i) => ({ id: stableId('stylist', s.slug), slug: s.slug, name: s.name, specialties: s.specialties, bio: s.bio, sortOrder: i })))
    .returning()
  const styBySlug = Object.fromEntries(sty.map((s) => [s.slug, s]))
  for (const s of STYLISTS) {
    const id = styBySlug[s.slug].id
    await db.insert(schema.workingHours).values(
      Object.entries(s.hours).map(([wd, [a, b]]) => ({ stylistId: id, weekday: Number(wd), startTime: a, endTime: b })),
    )
    await db.insert(schema.stylistServices).values(s.services.map((slug) => ({ stylistId: id, serviceId: svcBySlug[slug].id })))
  }

  // Time off: one day for Adaeze in ~3 weeks, a few days' leave for Ifeoma in ~4.
  const nextWeekday = (from: string, wd: number) => {
    let k = from
    while (weekdayOfKey(k) !== wd) k = addDaysToKey(k, 1)
    return k
  }
  const adaezeOff = nextWeekday(addDaysToKey(today, 18), 5)
  const ifeomaOff = nextWeekday(addDaysToKey(today, 26), 2)
  const offRows = [
    { stylistId: styBySlug.adaeze.id, startsAt: atSalonTime(adaezeOff, '00:00'), endsAt: atSalonTime(addDaysToKey(adaezeOff, 1), '00:00'), reason: 'Family event' },
    { stylistId: styBySlug.ifeoma.id, startsAt: atSalonTime(ifeomaOff, '00:00'), endsAt: atSalonTime(addDaysToKey(ifeomaOff, 3), '00:00'), reason: 'Leave' },
  ]
  await db.insert(schema.timeOff).values(offRows)

  // Clients
  const names = new Set<string>()
  while (names.size < 56) names.add(`${pick(FIRST)} ${pick(LAST)}`)
  const clientRows = await db
    .insert(schema.clients)
    .values([...names].map((name, i) => ({ name, phone: `+23480${String(35550200 + i * 7).padStart(8, '0')}`, createdAt: new Date(now.getTime() - (60 + i) * DAY) })))
    .returning()
  const [amaka] = await db
    .insert(schema.clients)
    .values({ name: 'Amaka Obi', phone: '+2348035550192', creditKobo: 500_000, createdAt: new Date(now.getTime() - 200 * DAY) })
    .returning()

  // In-memory calendar so seeded bookings never overlap and respect hours/time off.
  const cal: Record<string, StylistDay> = Object.fromEntries(
    STYLISTS.map((s) => {
      const id = styBySlug[s.slug].id
      return [
        id,
        {
          id,
          hours: Object.fromEntries(Object.entries(s.hours).map(([wd, [a, b]]) => [wd, { start: a, end: b }])),
          timeOff: offRows.filter((o) => o.stylistId === id).map((o) => ({ start: o.startsAt, end: o.endsAt })),
          busy: [],
        } satisfies StylistDay,
      ]
    }),
  )

  type Row = typeof schema.bookings.$inferInsert & { id?: string }
  const rows: Row[] = []
  const epoch = new Date(0)

  function place(stylistSlug: string, key: string, status: Row['status'], clientId: string, target: number) {
    const st = STYLISTS.find((s) => s.slug === stylistSlug)!
    const day = cal[styBySlug[stylistSlug].id]
    const h = day.hours[weekdayOfKey(key)]
    if (!h) return
    const minutesOpen = (atSalonTime(key, h.end).getTime() - atSalonTime(key, h.start).getTime()) / 60_000
    let booked = 0
    for (let tries = 0; tries < 40 && booked / minutesOpen < target; tries++) {
      const s = svcBySlug[pick(st.services)]
      const slots = getDaySlots({ dateKey: key, durationMin: s.durationMin, stylists: [day], now: epoch }).slots.filter((x) => x.available)
      if (!slots.length) continue
      const slot = pick(slots)
      day.busy.push({ start: slot.startsAt, end: slot.endsAt })
      booked += s.durationMin
      const deposit = calculateDeposit(s.priceKobo, s.depositPercent)
      rows.push({
        ref: ref(),
        clientId: clientId || pick(clientRows).id,
        stylistId: day.id,
        serviceId: s.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status,
        priceKobo: s.priceKobo,
        depositKobo: deposit,
        balanceKobo: s.priceKobo - deposit,
        createdAt: new Date(Math.min(slot.startsAt.getTime() - (1 + rand() * 9) * DAY, now.getTime() - rand() * 6 * DAY)),
      })
    }
  }

  // Amaka's history: a silk press with Tolu about six weeks ago (the fast path pre-fills this).
  const amakaLast = addDaysToKey(today, -44)
  {
    const s = svcBySlug['silk-press']
    const k = weekdayOfKey(amakaLast) === 1 ? addDaysToKey(amakaLast, 1) : amakaLast
    const startsAt = atSalonTime(k, weekdayOfKey(k) === 0 ? '13:00' : '11:00')
    const deposit = calculateDeposit(s.priceKobo, s.depositPercent)
    rows.push({ ref: ref(), clientId: amaka.id, stylistId: styBySlug.tolu.id, serviceId: s.id, startsAt, endsAt: new Date(startsAt.getTime() + s.durationMin * 60_000), status: 'completed', priceKobo: s.priceKobo, depositKobo: deposit, balanceKobo: s.priceKobo - deposit, createdAt: new Date(startsAt.getTime() - 5 * DAY) })
    cal[styBySlug.tolu.id].busy.push({ start: startsAt, end: new Date(startsAt.getTime() + s.durationMin * 60_000) })
  }

  // Past 30 days: completed, a few no-shows, the odd client cancellation.
  for (let d = -30; d <= -1; d++) {
    const key = addDaysToKey(today, d)
    const wd = weekdayOfKey(key)
    const busyDay = wd === 5 || wd === 6
    for (const s of STYLISTS) if (busyDay || chance(0.55)) place(s.slug, key, 'completed', '', busyDay ? 0.3 : 0.01)
  }
  for (const r of rows) {
    if (r.status !== 'completed' || r.clientId === amaka.id) continue
    const x = rand()
    if (x < 0.035) r.status = 'no_show'
    else if (x < 0.06) r.status = 'cancelled_client'
  }

  // Today: before now → completed, in progress → arrived, later → confirmed.
  for (const s of STYLISTS) place(s.slug, today, 'confirmed', '', 0.4)

  // Next 14 days: heavier on Friday and Saturday.
  for (let d = 1; d <= 14; d++) {
    const key = addDaysToKey(today, d)
    const wd = weekdayOfKey(key)
    const busyDay = wd === 5 || wd === 6
    for (const s of STYLISTS) if (busyDay || chance(0.25)) place(s.slug, key, 'confirmed', '', busyDay ? 0.36 : 0.01)
  }
  for (const r of rows) {
    if (r.status !== 'confirmed') continue
    if (r.endsAt <= now) r.status = chance(0.93) ? 'completed' : 'no_show'
    else if (r.startsAt <= now) r.status = 'arrived'
  }

  const inserted = await db.insert(schema.bookings).values(rows).returning()
  const cById = Object.fromEntries([...clientRows, amaka].map((c) => [c.id, c]))
  const sById = Object.fromEntries(svc.map((s) => [s.id, s]))
  const stById = Object.fromEntries(sty.map((s) => [s.id, s]))

  // Payments and messages
  const pays: (typeof schema.payments.$inferInsert)[] = []
  const msgs: (typeof schema.messages.$inferInsert)[] = []
  const tokens: (typeof schema.rebookTokens.$inferInsert)[] = []
  let queuedDue = 0
  for (const b of inserted) {
    const client = cById[b.clientId!]
    const service = sById[b.serviceId]
    const stylist = stById[b.stylistId]
    const tpl = { ref: b.ref, clientName: client.name, serviceName: service.name, stylistName: stylist.name, startsAt: b.startsAt, depositKobo: b.depositKobo, balanceKobo: b.balanceKobo }
    const method = pick(['card', 'card', 'card', 'bank_transfer', 'ussd'])
    pays.push({ bookingId: b.id, type: 'deposit', amountKobo: b.depositKobo, method, status: 'succeeded', providerRef: `demo_seed_${b.ref}`, createdAt: b.createdAt })
    msgs.push({ bookingId: b.id, clientId: client.id, kind: 'receipt', body: T.receipt(tpl), scheduledFor: b.createdAt, sentAt: new Date(b.createdAt.getTime() + 20_000), status: 'sent' })

    const remindAt = new Date(b.startsAt.getTime() - 24 * HOUR)
    const t = token()
    tokens.push({ token: t, clientId: client.id, serviceId: service.id, stylistId: stylist.id, expiresAt: new Date(now.getTime() + 60 * DAY) })
    const reminderBody = T.reminder24h({ ...tpl, manageUrl: `${APP}/booking/${b.ref}`, rebookUrl: `${APP}/r/${t}` })
    if (remindAt > b.createdAt) {
      if (b.status === 'cancelled_client') {
        msgs.push({ bookingId: b.id, clientId: client.id, kind: 'cancellation', body: T.cancellation({ ...tpl, outcome: 'credit', amountKobo: b.depositKobo }), scheduledFor: new Date(b.startsAt.getTime() - 3 * DAY), sentAt: new Date(b.startsAt.getTime() - 3 * DAY), status: 'sent' })
        pays.push({ bookingId: b.id, type: 'refund', amountKobo: b.depositKobo, method: 'credit', status: 'succeeded', createdAt: new Date(b.startsAt.getTime() - 3 * DAY) })
      } else if (remindAt > now) {
        msgs.push({ bookingId: b.id, clientId: client.id, kind: 'reminder_24h', body: reminderBody, scheduledFor: remindAt, status: 'queued' })
      } else if (b.status === 'confirmed' && queuedDue < 4) {
        // Leave a few due-but-unsent so "Send due now" has something to do.
        queuedDue++
        msgs.push({ bookingId: b.id, clientId: client.id, kind: 'reminder_24h', body: reminderBody, scheduledFor: remindAt, status: 'queued' })
      } else {
        const failed = b.status === 'confirmed' && chance(0.05)
        msgs.push({ bookingId: b.id, clientId: client.id, kind: 'reminder_24h', body: reminderBody, scheduledFor: remindAt, sentAt: failed ? null : remindAt, status: failed ? 'failed' : 'sent' })
      }
    }
    if (b.status === 'completed') {
      pays.push({ bookingId: b.id, type: 'balance', amountKobo: b.balanceKobo, method: 'in_salon', status: 'succeeded', createdAt: b.endsAt })
      const rebookAt = new Date(b.endsAt.getTime() + salon.messaging.rebookAfterDays * DAY)
      msgs.push({ bookingId: b.id, clientId: client.id, kind: 'rebook', body: T.rebook({ clientName: client.name, serviceName: service.name, stylistName: stylist.name, url: `${APP}/r/${t}` }), scheduledFor: rebookAt, sentAt: rebookAt <= now ? rebookAt : null, status: rebookAt <= now ? 'sent' : 'queued' })
    }
    if (b.status === 'no_show') {
      msgs.push({ bookingId: b.id, clientId: client.id, kind: 'no_show', body: T.noShow(tpl), scheduledFor: new Date(b.startsAt.getTime() + 20 * 60_000), sentAt: new Date(b.startsAt.getTime() + 20 * 60_000), status: 'sent' })
    }
  }
  // Amaka's credit came from an earlier cancellation.
  // A stable demo rebook link for the README and the fast-path screen.
  tokens.push({ token: 'amaka', clientId: amaka.id, serviceId: svcBySlug['silk-press'].id, stylistId: styBySlug.tolu.id, expiresAt: new Date(now.getTime() + 3650 * DAY) })

  for (let i = 0; i < pays.length; i += 500) await db.insert(schema.payments).values(pays.slice(i, i + 500))
  for (let i = 0; i < msgs.length; i += 500) await db.insert(schema.messages).values(msgs.slice(i, i + 500))
  await db.insert(schema.rebookTokens).values(tokens)

  const upcoming = inserted.filter((b) => b.startsAt > now && b.status === 'confirmed').length
  const past = inserted.filter((b) => b.startsAt < now)
  console.log(
    `Seeded ${svc.length} services, ${sty.length} stylists, ${clientRows.length + 1} clients, ${inserted.length} bookings ` +
      `(${upcoming} upcoming confirmed, ${past.filter((b) => b.status === 'completed').length} completed, ${past.filter((b) => b.status === 'no_show').length} no-shows), ` +
      `${pays.length} payments, ${msgs.length} messages.`,
  )
  console.log(`Returning client: Amaka Obi, +234 803 555 0192, ₦5,000 credit. Rebook link: ${APP}/r/amaka`)
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e)
    await pool.end()
    process.exit(1)
  })
