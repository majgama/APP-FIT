import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const dataDir = join(rootDir, 'data')
const dbPath = process.env.DATABASE_PATH ?? join(dataDir, 'app-fit.db')
const schemaPath = join(rootDir, 'database', 'schema.sql')

mkdirSync(dataDir, { recursive: true })

export const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const schema = readFileSync(schemaPath, 'utf8')
db.exec(schema)

const demoUsers = [
  { name: 'Administrador', email: 'admin@appfit.local', password: '123456', role: 'admin' },
  { name: 'Personal JC', email: 'personal@appfit.local', password: '123456', role: 'personal' },
  { name: 'Aline Costa', email: 'aluno@appfit.local', password: '123456', role: 'aluno' },
]

const findRole = db.prepare('SELECT id, name FROM user_roles WHERE name = ?')
const findUser = db.prepare('SELECT id FROM users WHERE email = ?')
const insertUser = db.prepare(`
  INSERT INTO users (role_id, name, email, password_hash)
  VALUES (@roleId, @name, @email, @passwordHash)
`)

for (const user of demoUsers) {
  const role = findRole.get(user.role)
  const exists = findUser.get(user.email)

  if (!role || exists) continue

  insertUser.run({
    roleId: role.id,
    name: user.name,
    email: user.email,
    passwordHash: bcrypt.hashSync(user.password, 10),
  })
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}
