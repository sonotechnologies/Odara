import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool as PgPool } from 'pg'
import ws from 'ws'
import * as schema from './schema'

export type DB = NodePgDatabase<typeof schema>
/** A transaction handle. Anything that accepts `Tx` also accepts the root `db`. */
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0] | DB

function connect(): DB {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.')

  // Neon: use the serverless driver over WebSockets (supports interactive
  // transactions, which hold creation and deposit confirmation rely on).
  if (/\.neon\.tech/.test(url)) {
    neonConfig.webSocketConstructor = ws
    const pool = new NeonPool({ connectionString: url })
    return drizzleNeon({ client: pool, schema }) as unknown as DB
  }
  // Anywhere else (local Postgres, CI): plain node-postgres.
  const pool = new PgPool({ connectionString: url, max: 10 })
  return drizzlePg({ client: pool, schema })
}

const globalForDb = globalThis as unknown as { __odaraDb?: DB }

export function getDb(): DB {
  if (!globalForDb.__odaraDb) globalForDb.__odaraDb = connect()
  return globalForDb.__odaraDb
}

export { schema }
