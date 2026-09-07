import bcrypt from 'bcryptjs'
import express from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { db, toPublicUser } from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json())

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')

  db.prepare(
    `
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
    `,
  ).run(userId, hashToken(token), expiresAt)

  return token
}

function getBearerToken(request) {
  const authorization = String(request.headers.authorization ?? '')
  const [type, token] = authorization.split(' ')

  if (type !== 'Bearer' || !token) return ''

  return token
}

function getRequestUser(request) {
  const token = getBearerToken(request)

  if (!token) return null

  return db
    .prepare(
      `
      SELECT users.id, users.name, users.email, user_roles.name AS role
      FROM user_sessions
      JOIN users ON users.id = user_sessions.user_id
      JOIN user_roles ON user_roles.id = users.role_id
      WHERE user_sessions.token_hash = ?
        AND user_sessions.revoked_at IS NULL
        AND datetime(user_sessions.expires_at) > datetime('now')
        AND users.is_active = 1
      `,
    )
    .get(hashToken(token))
}

function requireUser(request, response) {
  const user = getRequestUser(request)

  if (!user) {
    response.status(401).json({ message: 'Sessao invalida ou expirada.' })
    return null
  }

  return user
}


function getTrainerByUserId(userId) {
  return db.prepare('SELECT id, user_id AS userId FROM trainers WHERE user_id = ?').get(userId)
}

function ensureTrainerForUser(userId) {
  db.prepare('INSERT OR IGNORE INTO trainers (user_id, specialty) VALUES (?, ?)').run(
    userId,
    'Assessoria fitness online',
  )
  return getTrainerByUserId(userId)
}

function requireRole(request, response, allowedRoles) {
  const user = requireUser(request, response)

  if (!user) return null

  if (!allowedRoles.includes(user.role)) {
    response.status(403).json({ message: 'Usuario sem permissao para esta acao.' })
    return null
  }

  return user
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'APP-FIT API' })
})

app.get('/api/auth/me', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return

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

  response.json({ user: toPublicUser(user), token: createSession(user.id) })
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

  if (roleRecord.name === 'personal') {
    ensureTrainerForUser(user.id)
  }

  response.status(201).json({ user, token: createSession(user.id) })
})

app.get('/api/trainers', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const whereClause = user.role === 'personal' ? 'WHERE users.id = ?' : ''
  const params = user.role === 'personal' ? [user.id] : []

  const trainers = db
    .prepare(
      `
      SELECT
        trainers.id,
        users.name,
        users.email,
        COALESCE(trainers.specialty, '') AS specialty
      FROM trainers
      JOIN users ON users.id = trainers.user_id
      ${whereClause}
      ORDER BY users.name
      `,
    )
    .all(...params)

  response.json({ trainers })
})

app.get('/api/students', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const baseSelect = `
    SELECT
      students.id,
      students.name,
      COALESCE(students.goal, '') AS goal,
      COALESCE(students.start_date, '') AS start,
      COALESCE(students.restrictions, '') AS restrictions,
      0 AS adherence,
      'Agendar' AS nextReview,
      COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers
    FROM students
    LEFT JOIN student_trainers ON student_trainers.student_id = students.id
      AND student_trainers.is_active = 1
      AND student_trainers.ended_at IS NULL
    LEFT JOIN trainers ON trainers.id = student_trainers.trainer_id
    LEFT JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
  `

  if (user.role === 'admin') {
    const students = db
      .prepare(
        `${baseSelect}
        GROUP BY students.id
        ORDER BY students.name`,
      )
      .all()

    response.json({ students })
    return
  }

  const trainer = getTrainerByUserId(user.id)

  if (!trainer) {
    response.json({ students: [] })
    return
  }

  const students = db
    .prepare(
      `${baseSelect}
      WHERE students.id IN (
        SELECT student_id
        FROM student_trainers
        WHERE trainer_id = ?
          AND is_active = 1
          AND ended_at IS NULL
      )
      GROUP BY students.id
      ORDER BY students.name`,
    )
    .all(trainer.id)

  response.json({ students })
})

app.post('/api/students', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const name = String(request.body?.name ?? '').trim()
  const goal = String(request.body?.goal ?? '').trim()
  const start = String(request.body?.start ?? '').trim()
  const restrictions = String(request.body?.restrictions ?? '').trim()
  const trainerIds = Array.isArray(request.body?.trainerIds) ? request.body.trainerIds : []
  const startDate = start || new Date().toISOString().slice(0, 10)

  if (!name) {
    response.status(400).json({ message: 'Informe o nome do aluno.' })
    return
  }

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `
        INSERT INTO students (name, goal, start_date, restrictions)
        VALUES (?, ?, ?, ?)
        `,
      )
      .run(name, goal, startDate, restrictions)

    const studentId = result.lastInsertRowid
    const linkTrainer = db.prepare(`
      INSERT OR IGNORE INTO student_trainers (student_id, trainer_id, relationship_type)
      VALUES (?, ?, ?)
    `)

    if (user.role === 'personal') {
      const trainer = ensureTrainerForUser(user.id)
      linkTrainer.run(studentId, trainer.id, 'primary')
      db.prepare('UPDATE students SET trainer_id = ? WHERE id = ?').run(trainer.id, studentId)
    }

    if (user.role === 'admin') {
      const validTrainerIds = trainerIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)

      for (const trainerId of validTrainerIds) {
        linkTrainer.run(studentId, trainerId, 'secondary')
      }

      if (validTrainerIds[0]) {
        db.prepare('UPDATE students SET trainer_id = ? WHERE id = ?').run(validTrainerIds[0], studentId)
      }
    }

    return studentId
  })

  const studentId = transaction()

  response.status(201).json({
    student: {
      id: studentId,
      name,
      goal,
      start: startDate,
      restrictions,
      adherence: 0,
      nextReview: 'Agendar',
      trainers: user.role === 'personal' ? user.name : '',
    },
  })
})

app.post('/api/students/:studentId/trainers', (request, response) => {
  const user = requireRole(request, response, ['admin'])
  if (!user) return

  const studentId = Number(request.params.studentId)
  const trainerId = Number(request.body?.trainerId)
  const relationshipType = String(request.body?.relationshipType ?? 'secondary')

  if (!Number.isInteger(studentId) || !Number.isInteger(trainerId)) {
    response.status(400).json({ message: 'Aluno ou personal invalido.' })
    return
  }

  if (!['primary', 'secondary'].includes(relationshipType)) {
    response.status(400).json({ message: 'Tipo de vinculo invalido.' })
    return
  }

  const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId)
  const trainer = db.prepare('SELECT id FROM trainers WHERE id = ?').get(trainerId)

  if (!student || !trainer) {
    response.status(404).json({ message: 'Aluno ou personal nao encontrado.' })
    return
  }

  db.prepare(
    `
    INSERT INTO student_trainers (student_id, trainer_id, relationship_type, is_active, ended_at)
    VALUES (?, ?, ?, 1, NULL)
    ON CONFLICT(student_id, trainer_id) DO UPDATE SET
      relationship_type = excluded.relationship_type,
      is_active = 1,
      ended_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    `,
  ).run(studentId, trainerId, relationshipType)

  response.status(201).json({ ok: true })
})

app.delete('/api/students/:studentId/trainers/:trainerId', (request, response) => {
  const user = requireRole(request, response, ['admin'])
  if (!user) return

  const studentId = Number(request.params.studentId)
  const trainerId = Number(request.params.trainerId)

  db.prepare(
    `
    UPDATE student_trainers
    SET is_active = 0,
      ended_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE student_id = ? AND trainer_id = ?
    `,
  ).run(studentId, trainerId)

  response.json({ ok: true })
})

app.get('/api/exercises', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return

  const exercises = db
    .prepare(
      `
      SELECT
        id,
        name,
        muscle_name AS muscle,
        COALESCE(video_or_gif_path, '') AS media,
        COALESCE(audio_path, '') AS audio,
        COALESCE(CAST(default_sets AS TEXT), '') AS sets,
        COALESCE(default_reps, '') AS reps,
        COALESCE(default_load, 'moderado') AS load,
        COALESCE(rest_text, '') AS rest,
        COALESCE(observation_text, '') AS notes
      FROM exercises
      ORDER BY name
      `,
    )
    .all()

  response.json({ exercises })
})

app.post('/api/exercises', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const name = String(request.body?.name ?? '').trim()
  const muscle = String(request.body?.muscle ?? '').trim()
  const media = String(request.body?.media ?? '').trim()
  const audio = String(request.body?.audio ?? '').trim()
  const sets = Number(request.body?.sets ?? 0)
  const reps = String(request.body?.reps ?? '').trim()
  const load = String(request.body?.load ?? 'moderado').trim()
  const rest = String(request.body?.rest ?? '').trim()
  const notes = String(request.body?.notes ?? '').trim()

  if (!name || !muscle) {
    response.status(400).json({ message: 'Informe nome e musculo do exercicio.' })
    return
  }

  if (!['leve', 'moderado', 'pesado', 'muito pesado'].includes(load)) {
    response.status(400).json({ message: 'Carga invalida.' })
    return
  }

  const result = db
    .prepare(
      `
      INSERT INTO exercises (
        name,
        muscle_name,
        video_or_gif_path,
        audio_path,
        default_sets,
        default_reps,
        default_load,
        rest_text,
        observation_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(name, muscle, media, audio, sets || null, reps, load, rest, notes)

  response.status(201).json({
    exercise: {
      id: result.lastInsertRowid,
      name,
      muscle,
      media,
      audio,
      sets: sets ? String(sets) : '',
      reps,
      load,
      rest,
      notes,
    },
  })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`APP-FIT API rodando em http://127.0.0.1:${port}`)
})
