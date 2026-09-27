import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { getDb, schema } from '@/db'
import type { Service, Stylist } from '@/db/schema'
import { depositSplit } from '@/lib/deposit'

const { services, stylists, stylistServices } = schema

export const CATEGORIES = ['Hair', 'Nails', 'Lashes & Brows'] as const

export type ServiceWithSplit = Service & { depositKobo: number; balanceKobo: number }

export const withSplit = (s: Service): ServiceWithSplit => {
  const { depositKobo, balanceKobo } = depositSplit(s.priceKobo, s.depositPercent)
  return { ...s, depositKobo, balanceKobo }
}

/**
 * The catalogue (services, stylists and who does what) changes rarely, so it is
 * loaded in one round trip and cached across requests for ten minutes. Every
 * lookup below reads from it instead of going back to the database.
 */
const loadCatalog = unstable_cache(
  async () => {
    const db = getDb()
    const [svc, sty, links] = await Promise.all([
      db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder)),
      db.select().from(stylists).where(eq(stylists.active, true)).orderBy(asc(stylists.sortOrder)),
      db.select().from(stylistServices),
    ])
    return { services: svc, stylists: sty, links }
  },
  ['catalog-v1'],
  { revalidate: 600, tags: ['catalog'] },
)

export async function listServices(): Promise<ServiceWithSplit[]> {
  return (await loadCatalog()).services.map(withSplit)
}

export async function servicesByCategory() {
  const all = await listServices()
  return CATEGORIES.map((name) => ({ name, items: all.filter((s) => s.category === name) })).filter((c) => c.items.length)
}

export async function getServiceBySlug(slug: string | undefined | null) {
  if (!slug) return null
  return (await listServices()).find((s) => s.slug === slug) ?? null
}

/** By id, including inactive services (old bookings may point at them). */
export async function getServiceById(id: string) {
  const hit = (await listServices()).find((s) => s.id === id)
  if (hit) return hit
  const [row] = await getDb().select().from(services).where(eq(services.id, id))
  return row ? withSplit(row) : null
}

export async function listStylists(): Promise<Stylist[]> {
  return (await loadCatalog()).stylists
}

export async function getStylistBySlug(slug: string | undefined | null) {
  if (!slug) return null
  return (await listStylists()).find((s) => s.slug === slug) ?? null
}

/** Active stylists who perform a service, in display order. */
export async function stylistsForService(serviceId: string): Promise<Stylist[]> {
  const { stylists: all, links } = await loadCatalog()
  return all.filter((st) => links.some((l) => l.stylistId === st.id && l.serviceId === serviceId))
}

/** Every stylist with the services they perform. */
export async function stylistsWithServices() {
  const { stylists: all, links } = await loadCatalog()
  const svc = await listServices()
  return all.map((st) => ({
    ...st,
    services: svc.filter((s) => links.some((l) => l.stylistId === st.id && l.serviceId === s.id)),
  }))
}
