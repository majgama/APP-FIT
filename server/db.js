import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required. PostgreSQL is the active database engine for this project.')
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeSql(sql, params) {
  const values = Array.isArray(params) ? params : [params]
  const normalizedValues = values.flatMap((value) => Array.isArray(value) ? value : [value])

  let index = 1
  let normalized = sql

  if (normalizedValues.length === 1 && normalizedValues[0] && typeof normalizedValues[0] === 'object' && !Array.isArray(normalizedValues[0])) {
    const entries = normalizedValues[0]
    normalized = normalized.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => `$<${name}>`)
    return { text: normalized, values: entries }
  }

  normalized = normalized.replace(/\?/g, () => `$${index++}`)
  return { text: normalized, values: normalizedValues }
}

class PreparedStatement {
  constructor(sql) {
    this.sql = sql
  }

  async _query(method, rawParams = []) {
    const { text, values } = normalizeSql(this.sql, rawParams)
    const result = await pool.query(text, values)

    if (method === 'get') return result.rows[0] ?? undefined
    if (method === 'all') return result.rows
    if (method === 'run') {
      const row = result.rows[0]
      const lastInsertRowid = row && Object.prototype.hasOwnProperty.call(row, 'id') ? row.id : null
      return { changes: result.rowCount ?? 0, lastInsertRowid }
    }

    return result
  }

  get(...params) {
    return this._query('get', params)
  }

  all(...params) {
    return this._query('all', params)
  }

  run(...params) {
    return this._query('run', params)
  }
}

export const db = {
  prepare(sql) {
    return new PreparedStatement(sql)
  },
  exec(sql) {
    return pool.query(sql)
  },
  transaction(callback) {
    return async () => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const statement = (sql) => new PreparedStatement(sql)
        const result = await callback({
          ...db,
          prepare: statement,
          exec: (query) => client.query(query),
          transaction: () => {
            throw new Error('Nested transactions are not supported in this PostgreSQL compatibility layer.')
          },
        })
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
  },
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}
