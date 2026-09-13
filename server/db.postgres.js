import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('[db.postgres] DATABASE_URL not set; PostgreSQL client is idle until migration is enabled.')
}

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null

export async function query(text, params = []) {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured for PostgreSQL migration.')
  }

  const result = await pool.query(text, params)
  return result
}

export async function transaction(callback) {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured for PostgreSQL migration.')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export { pool }
