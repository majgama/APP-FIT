import bcrypt from 'bcryptjs'
import express from 'express'
import { db, toPublicUser } from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'APP-FIT API' })
})

app.get('/api/auth/me', (request, response) => {
  const userId = request.headers['x-user-id']

  if (!userId) {
    response.status(401).json({ message: 'Sessao nao informada.' })
    return
  }

  const user = db
    .prepare(
      `
      SELECT users.id, users.name, users.email, user_roles.name AS role
      FROM users
      JOIN user_roles ON user_roles.id = users.role_id
      WHERE users.id = ? AND users.is_active = 1
      `,
    )
    .get(userId)

  if (!user) {
    response.status(401).json({ message: 'Usuario nao encontrado.' })
    return
  }

  response.json({ user: toPublicUser(user) })
})

app.post('/api/auth/login', (request, response) => {
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const password = String(request.body?.password ?? '')

  if (!email || !password) {
    response.status(400).json({ message: 'Informe e-mail e senha.' })
    return
  }

  const user = db
    .prepare(
      `
      SELECT users.id, users.name, users.email, users.password_hash, user_roles.name AS role
      FROM users
      JOIN user_roles ON user_roles.id = users.role_id
      WHERE users.email = ? AND users.is_active = 1
      `,
    )
    .get(email)

  if (!user || !bcrypt.compareSync(password, user.password_hash ?? '')) {
    response.status(401).json({ message: 'E-mail ou senha invalidos.' })
    return
  }

  response.json({ user: toPublicUser(user) })
})

app.post('/api/auth/register', (request, response) => {
  const name = String(request.body?.name ?? '').trim()
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const password = String(request.body?.password ?? '')
  const role = String(request.body?.role ?? 'aluno').trim().toLowerCase()

  if (!name || !email || password.length < 6) {
    response.status(400).json({ message: 'Preencha nome, e-mail e senha com pelo menos 6 caracteres.' })
    return
  }

  const roleRecord = db.prepare('SELECT id, name FROM user_roles WHERE name = ?').get(role)

  if (!roleRecord) {
    response.status(400).json({ message: 'Tipo de usuario invalido.' })
    return
  }

  const emailAlreadyExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)

  if (emailAlreadyExists) {
    response.status(409).json({ message: 'Este e-mail ja esta cadastrado.' })
    return
  }

  const result = db
    .prepare(
      `
      INSERT INTO users (role_id, name, email, password_hash)
      VALUES (?, ?, ?, ?)
      `,
    )
    .run(roleRecord.id, name, email, bcrypt.hashSync(password, 10))

  const user = {
    id: result.lastInsertRowid,
    name,
    email,
    role: roleRecord.name,
  }

  response.status(201).json({ user })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`APP-FIT API rodando em http://127.0.0.1:${port}`)
})
