import 'dotenv/config'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// Migrations run over plain TCP for both Neon and local Postgres.
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' })
await pool.end()
console.log('Migrations applied.')
