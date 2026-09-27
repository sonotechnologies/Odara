/**
 * Create or update the studio owner login without touching any bookings.
 *
 *   npm run studio:owner -- you@example.com "a long password" "Your name"
 *
 * Uses DATABASE_URL from .env. Afterwards set STUDIO_SHOW_DEMO_LOGIN=false so
 * the login page stops showing the demo credentials.
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'
import { hashPassword } from '../lib/password'

const [email, password, name = 'Ọdàrà Studio'] = process.argv.slice(2)
if (!email || !password) {
  console.error('Usage: npm run studio:owner -- <email> <password> [name]')
  process.exit(1)
}
if (password.length < 10) {
  console.error('Use a password of at least 10 characters.')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle({ client: pool, schema })
const passwordHash = await hashPassword(password)
const clean = email.trim().toLowerCase()
const [existing] = await db.select().from(schema.owners).where(eq(schema.owners.email, clean))
if (existing) await db.update(schema.owners).set({ passwordHash, name }).where(eq(schema.owners.id, existing.id))
else await db.insert(schema.owners).values({ email: clean, name, passwordHash })
console.log(`${existing ? 'Updated' : 'Created'} studio login for ${clean}.`)

// Retire the demo account once a real one exists.
const demo = (process.env.STUDIO_DEMO_EMAIL ?? 'owner@odara.demo').toLowerCase()
if (demo !== clean && process.argv.includes('--remove-demo')) {
  await db.delete(schema.owners).where(eq(schema.owners.email, demo))
  console.log(`Removed the demo login ${demo}.`)
}
await pool.end()
