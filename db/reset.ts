import 'dotenv/config'
import { Pool } from 'pg'

// Drops everything. Local/demo use only.
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
await pool.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;')
await pool.end()
console.log('Database reset.')
