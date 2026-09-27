import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
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

export async function listServices(): Promise<ServiceWithSplit[]> {
  const rows = await getDb().select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder))
  return rows.map(withSplit)
}

export async function servicesByCategory() {
  const all = await listServices()
  return CATEGORIES.map((name) => ({ name, items: all.filter((s) => s.category === name) })).filter((c) => c.items.length)
}

export async function getServiceBySlug(slug: string | undefined | null) {
  if (!slug) return null
  const [row] = await getDb()
    .select()
    .from(services)
    .where(and(eq(services.slug, slug), eq(services.active, true)))
  return row ? withSplit(row) : null
}

export async function getServiceById(id: string) {
  const [row] = await getDb().select().from(services).where(eq(services.id, id))
  return row ? withSplit(row) : null
}

export async function listStylists(): Promise<Stylist[]> {
  return getDb().select().from(stylists).where(eq(stylists.active, true)).orderBy(asc(stylists.sortOrder))
}

export async function getStylistBySlug(slug: string | undefined | null) {
  if (!slug) return null
  const [row] = await getDb()
    .select()
    .from(stylists)
    .where(and(eq(stylists.slug, slug), eq(stylists.active, true)))
  return row ?? null
}

/** Active stylists who perform a service, in display order. */
export async function stylistsForService(serviceId: string): Promise<Stylist[]> {
  const rows = await getDb()
    .select({ s: stylists })
    .from(stylistServices)
    .innerJoin(stylists, eq(stylists.id, stylistServices.stylistId))
    .where(and(eq(stylistServices.serviceId, serviceId), eq(stylists.active, true)))
    .orderBy(asc(stylists.sortOrder))
  return rows.map((r) => r.s)
}

/** Every stylist with the services they perform. */
export async function stylistsWithServices() {
  const [all, links, svc] = await Promise.all([
    listStylists(),
    getDb().select().from(stylistServices),
    listServices(),
  ])
  return all.map((st) => ({
    ...st,
    services: svc.filter((s) => links.some((l) => l.stylistId === st.id && l.serviceId === s.id)),
  }))
}

export async function stylistsByIds(ids: string[]) {
  if (!ids.length) return []
  return getDb().select().from(stylists).where(inArray(stylists.id, ids))
}
