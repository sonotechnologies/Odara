/**
 * Every locale- and salon-specific value lives here. Nothing location-specific
 * should be hard-coded anywhere else in the app.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday, matches Date#getDay

export type OpeningHours = { open: string; close: string } | null // "HH:mm", null = closed

export const salon = {
  name: 'Ọdàrà',
  slug: 'odara',
  tagline: 'Hair, nails and lashes, done slowly and done well.',
  address: {
    line: 'Lekki Phase 1, Lagos',
    area: 'Lekki Phase 1',
    city: 'Lagos',
    country: 'NG',
    note: 'Parking on site. Directions sent with your booking.',
  },
  timezone: 'Africa/Lagos',
  locale: 'en-NG',
  currency: {
    code: 'NGN',
    symbol: '₦',
    /** Minor units per major unit (kobo per naira). */
    minorPerMajor: 100,
  },
  phone: {
    countryCode: '234',
    /** Display prefix shown in front of phone inputs. */
    prefix: '+234',
    /** National significant number length (without the leading 0). */
    nationalLength: 10,
    example: '803 555 0192',
  },
  /** The salon's own WhatsApp number, E.164 without the plus (for wa.me links). */
  whatsapp: '2348035550100',
  instagram: 'https://instagram.com/',

  /** Salon opening hours per weekday. Stylists' own hours sit inside these. */
  hours: {
    0: { open: '12:00', close: '18:00' },
    1: null,
    2: { open: '09:00', close: '19:00' },
    3: { open: '09:00', close: '19:00' },
    4: { open: '09:00', close: '19:00' },
    5: { open: '09:00', close: '19:00' },
    6: { open: '09:00', close: '19:00' },
  } satisfies Record<Weekday, OpeningHours>,

  booking: {
    /** Grid step for start times. */
    slotMinutes: 30,
    /** How many days ahead the date strip shows. */
    horizonDays: 21,
    /** How long a hold lasts while the client pays the deposit. */
    holdMinutes: 10,
    /** Clients can't book a start time sooner than this from now. */
    minLeadMinutes: 60,
  },

  deposit: {
    defaultPercent: 30,
    /** Services at or above this length take the long-service percentage. */
    longServiceMinutes: 180,
    longServicePercent: 50,
    /** In kobo. */
    minimumKobo: 200_000,
    /** Deposits are rounded to the nearest multiple of this, in kobo (₦500). */
    roundToKobo: 50_000,
  },

  policy: {
    /** Free reschedule / refundable cancel window, in hours before the start. */
    freeChangeHours: 24,
    /** How long a simulated refund takes to land, shown to the client. */
    refundCopy: '3–5 business days',
    /** Grace period for late arrivals, shown on the policy page. */
    lateGraceMinutes: 15,
  },

  messaging: {
    /** 24h reminder is scheduled this many hours before the start. */
    reminderHoursBefore: 24,
    /** A rebook nudge is queued this many days after a completed visit. */
    rebookAfterDays: 28,
    /** Rebook links stay valid for this many days. */
    rebookTokenDays: 60,
  },

  client: {
    /** "Remember this device" cookie lifetime. */
    rememberDays: 90,
    otpMinutes: 5,
  },
} as const

export type SalonConfig = typeof salon
