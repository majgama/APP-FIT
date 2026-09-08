import bcrypt from 'bcryptjs'
import express from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, toPublicUser } from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const uploadDir = join(rootDir, 'data', 'uploads')

mkdirSync(uploadDir, { recursive: true })

app.use(express.json({ limit: '25mb' }))

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = toSqlDateTime(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30))

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

function canAccessStudent(user, studentId, includeInactive = true) {
  if (user.role === 'admin') return true

  if (user.role === 'aluno') {
    const student = db.prepare('SELECT id FROM students WHERE id = ? AND user_id = ?').get(studentId, user.id)
    return Boolean(student)
  }

  if (user.role === 'personal') {
    const trainer = getTrainerByUserId(user.id)
    if (!trainer) return false

    const activeClause = includeInactive ? '' : 'AND is_active = 1 AND ended_at IS NULL'
    const link = db
      .prepare(
        `SELECT id FROM student_trainers WHERE student_id = ? AND trainer_id = ? ${activeClause}`,
      )
      .get(studentId, trainer.id)

    return Boolean(link)
  }

  return false
}

function getStudentTrainer(user, studentId) {
  if (user.role === 'admin') return null
  if (user.role !== 'personal') return null

  const trainer = getTrainerByUserId(user.id)
  if (!trainer) return null

  const link = db
    .prepare(
      `
      SELECT trainers.id
      FROM trainers
      JOIN student_trainers ON student_trainers.trainer_id = trainers.id
      WHERE student_trainers.student_id = ?
        AND trainers.id = ?
        AND student_trainers.is_active = 1
        AND student_trainers.ended_at IS NULL
      `,
    )
    .get(studentId, trainer.id)

  return link ?? null
}

function saveAssessmentPhoto(studentId, photo) {
  const dataUrl = String(photo?.dataUrl ?? '')
  const angle = String(photo?.angle ?? 'front')

  if (!['front', 'side', 'back'].includes(angle)) return null
  if (!dataUrl.startsWith('data:image/')) return null

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1]
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return null

  const fileBuffer = Buffer.from(match[2], 'base64')
  if (!fileBuffer.length || fileBuffer.length > 6 * 1024 * 1024) return null

  const extension = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg'
  const fileName = `assessment-${studentId}-${Date.now()}-${randomBytes(4).toString('hex')}${extension}`
  writeFileSync(join(uploadDir, fileName), fileBuffer)

  return { angle, fileName }
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

function getBaseUrl(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] ?? '').split(',')[0]
  const protocol = forwardedProto || request.protocol || 'http'
  const host = request.headers.host ?? `127.0.0.1:${port}`

  return `${protocol}://${host}`
}

function getInvitationByToken(token) {
  return db
    .prepare(
      `
      SELECT
        invitations.id,
        invitations.email,
        invitations.invite_code AS code,
        invitations.trainer_id AS trainerId,
        invitations.status,
        invitations.expires_at AS expiresAt,
        trainer_users.name AS trainerName
      FROM invitations
      JOIN trainers ON trainers.id = invitations.trainer_id
      JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
      WHERE invitations.token_hash = ?
      `,
    )
    .get(hashToken(token))
}

function isInvitationUsable(invitation) {
  if (!invitation || invitation.status !== 'pending') return false
  if (!invitation.expiresAt) return true

  return new Date(invitation.expiresAt.replace(' ', 'T')) > new Date()
}

function createStudentInvite({ request, invitedByUserId, trainerId, email }) {
  const token = randomBytes(32).toString('hex')
  const code = randomBytes(4).toString('hex').toUpperCase()
  const role = db.prepare("SELECT id FROM user_roles WHERE name = 'aluno'").get()
  const expiresAt = toSqlDateTime(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14))

  db.prepare(
    `
    INSERT INTO invitations (invited_by_user_id, trainer_id, email, invite_code, role_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(invitedByUserId, trainerId, email, code, role.id, hashToken(token), expiresAt)

  return {
    code,
    token,
    url: `${getBaseUrl(request)}/?invite=${token}`,
    expiresAt,
  }
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

app.get('/api/invitations/student/:token', (request, response) => {
  const token = String(request.params.token ?? '')
  const invitation = getInvitationByToken(token)

  if (!isInvitationUsable(invitation)) {
    response.status(404).json({ message: 'Convite invalido ou expirado.' })
    return
  }

  response.json({
    invitation: {
      code: invitation.code,
      email: invitation.email,
      trainerName: invitation.trainerName,
      expiresAt: invitation.expiresAt,
    },
  })
})

app.post('/api/auth/register', (request, response) => {
  const name = String(request.body?.name ?? '').trim()
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const password = String(request.body?.password ?? '')
  const invitationToken = String(request.body?.invitationToken ?? '').trim()
  const invitation = invitationToken ? getInvitationByToken(invitationToken) : null
  const requestedRole = String(request.body?.role ?? 'aluno').trim().toLowerCase()
  const role = invitation ? 'aluno' : requestedRole

  if (!name || !email || password.length < 6) {
    response.status(400).json({ message: 'Preencha nome, e-mail e senha com pelo menos 6 caracteres.' })
    return
  }

  if (invitationToken && !isInvitationUsable(invitation)) {
    response.status(400).json({ message: 'Convite invalido ou expirado.' })
    return
  }

  if (invitation?.email && invitation.email !== email) {
    response.status(400).json({ message: 'Este convite foi gerado para outro e-mail.' })
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

  const transaction = db.transaction(() => {
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

    if (invitation) {
      const studentResult = db
        .prepare(
          `
          INSERT INTO students (user_id, trainer_id, name, start_date, status)
          VALUES (?, ?, ?, date('now'), 'active')
          `,
        )
        .run(user.id, invitation.trainerId, name)

      db.prepare(
        `
        INSERT INTO student_trainers (student_id, trainer_id, relationship_type, is_active, inactive_reason, ended_at)
        VALUES (?, ?, 'primary', 1, NULL, NULL)
        ON CONFLICT(student_id, trainer_id) DO UPDATE SET
          is_active = 1,
          inactive_reason = NULL,
          ended_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        `,
      ).run(studentResult.lastInsertRowid, invitation.trainerId)

      db.prepare(
        `
        UPDATE invitations
        SET status = 'accepted', accepted_student_id = ?, accepted_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
      ).run(studentResult.lastInsertRowid, invitation.id)
    }

    return user
  })

  const user = transaction()

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

app.post('/api/invitations/student', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const requestedTrainerId = Number(request.body?.trainerId)
  const trainer = user.role === 'personal'
    ? ensureTrainerForUser(user.id)
    : db.prepare('SELECT id FROM trainers WHERE id = ?').get(requestedTrainerId)

  if (!trainer) {
    response.status(400).json({ message: 'Selecione um personal valido para o convite.' })
    return
  }

  const invitation = createStudentInvite({
    request,
    invitedByUserId: user.id,
    trainerId: trainer.id,
    email,
  })

  response.status(201).json({ invitation })
})

app.get('/api/students/me', (request, response) => {
  const user = requireRole(request, response, ['aluno'])
  if (!user) return

  const student = db
    .prepare(
      `
      SELECT
        students.id,
        students.name,
        COALESCE(students.goal, '') AS goal,
        COALESCE(students.start_date, '') AS start,
        COALESCE(students.restrictions, '') AS restrictions,
        students.status AS linkStatus,
        0 AS adherence,
        'Agendar' AS nextReview,
        COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers
      FROM students
      LEFT JOIN student_trainers ON student_trainers.student_id = students.id
        AND student_trainers.is_active = 1
        AND student_trainers.ended_at IS NULL
      LEFT JOIN trainers ON trainers.id = student_trainers.trainer_id
      LEFT JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
      WHERE students.user_id = ?
      GROUP BY students.id
      `,
    )
    .get(user.id)

  response.json({ student: student ?? null })
})

app.get('/api/students', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const status = String(request.query.status ?? 'active')

  if (!['active', 'inactive', 'all'].includes(status)) {
    response.status(400).json({ message: 'Status invalido.' })
    return
  }

  if (user.role === 'admin') {
    const whereClause = status === 'all' ? '' : 'WHERE students.status = ?'
    const params = status === 'all' ? [] : [status]
    const students = db
      .prepare(
        `
        SELECT
          students.id,
          students.name,
          COALESCE(students.goal, '') AS goal,
          COALESCE(students.start_date, '') AS start,
          COALESCE(students.restrictions, '') AS restrictions,
          students.status AS linkStatus,
          0 AS adherence,
          'Agendar' AS nextReview,
          COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers
        FROM students
        LEFT JOIN student_trainers ON student_trainers.student_id = students.id
          AND student_trainers.is_active = 1
          AND student_trainers.ended_at IS NULL
        LEFT JOIN trainers ON trainers.id = student_trainers.trainer_id
        LEFT JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
        ${whereClause}
        GROUP BY students.id
        ORDER BY students.name
        `,
      )
      .all(...params)

    response.json({ students })
    return
  }

  const trainer = getTrainerByUserId(user.id)

  if (!trainer) {
    response.json({ students: [] })
    return
  }

  const statusClause = status === 'all' ? '' : 'AND own_link.is_active = ?'
  const params = status === 'all' ? [trainer.id] : [trainer.id, status === 'active' ? 1 : 0]
  const students = db
    .prepare(
      `
      SELECT
        students.id,
        students.name,
        COALESCE(students.goal, '') AS goal,
        COALESCE(students.start_date, '') AS start,
        COALESCE(students.restrictions, '') AS restrictions,
        CASE own_link.is_active WHEN 1 THEN 'active' ELSE 'inactive' END AS linkStatus,
        COALESCE(own_link.inactive_reason, '') AS inactiveReason,
        0 AS adherence,
        'Agendar' AS nextReview,
        COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers
      FROM students
      JOIN student_trainers AS own_link ON own_link.student_id = students.id
        AND own_link.trainer_id = ?
        ${statusClause}
      LEFT JOIN student_trainers AS visible_links ON visible_links.student_id = students.id
        AND visible_links.is_active = 1
        AND visible_links.ended_at IS NULL
      LEFT JOIN trainers ON trainers.id = visible_links.trainer_id
      LEFT JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
      GROUP BY students.id, own_link.is_active, own_link.inactive_reason
      ORDER BY students.name
      `,
    )
    .all(...params)

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
      linkStatus: 'active',
      trainers: user.role === 'personal' ? user.name : '',
    },
  })
})

app.patch('/api/students/:studentId/status', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const studentId = Number(request.params.studentId)
  const status = String(request.body?.status ?? '').trim()
  const reason = String(request.body?.reason ?? '').trim()

  if (!Number.isInteger(studentId) || !['active', 'inactive'].includes(status)) {
    response.status(400).json({ message: 'Aluno ou status invalido.' })
    return
  }

  if (user.role === 'admin') {
    db.prepare('UPDATE students SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, studentId)
    response.json({ ok: true })
    return
  }

  const trainer = getTrainerByUserId(user.id)

  if (!trainer) {
    response.status(403).json({ message: 'Personal nao encontrado.' })
    return
  }

  const result = status === 'active'
    ? db.prepare(
      `
      UPDATE student_trainers
      SET is_active = 1,
        inactive_reason = NULL,
        ended_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ? AND trainer_id = ?
      `,
    ).run(studentId, trainer.id)
    : db.prepare(
      `
      UPDATE student_trainers
      SET is_active = 0,
        inactive_reason = ?,
        ended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ? AND trainer_id = ?
      `,
    ).run(reason, studentId, trainer.id)

  if (result.changes === 0) {
    response.status(404).json({ message: 'Aluno nao vinculado a este personal.' })
    return
  }

  response.json({ ok: true })
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
    INSERT INTO student_trainers (student_id, trainer_id, relationship_type, is_active, inactive_reason, ended_at)
    VALUES (?, ?, ?, 1, NULL, NULL)
    ON CONFLICT(student_id, trainer_id) DO UPDATE SET
      relationship_type = excluded.relationship_type,
      is_active = 1,
      inactive_reason = NULL,
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
      inactive_reason = 'Removido pelo administrador',
      ended_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE student_id = ? AND trainer_id = ?
    `,
  ).run(studentId, trainerId)

  response.json({ ok: true })
})

app.get('/api/body-goals', (_request, response) => {
  response.json({
    goals: [
      { name: 'Homem A', url: '/body-goals/homem%20%20A.png' },
      { name: 'Homem B', url: '/body-goals/homem%20B.png' },
      { name: 'Homem C', url: '/body-goals/homem%20C.png' },
      { name: 'Mulher A', url: '/body-goals/mulher%20A.png' },
      { name: 'Mulher B', url: '/body-goals/mulher%20B.png' },
      { name: 'Mulher C', url: '/body-goals/mulher%20C.png' },
    ],
  })
})

app.get('/api/assessment-photos/:photoId', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal', 'aluno'])
  if (!user) return

  const photoId = Number(request.params.photoId)
  const photo = db
    .prepare(
      `
      SELECT assessment_photos.file_path AS fileName, physical_assessments.student_id AS studentId
      FROM assessment_photos
      JOIN physical_assessments ON physical_assessments.id = assessment_photos.assessment_id
      WHERE assessment_photos.id = ?
      `,
    )
    .get(photoId)

  if (!photo || !canAccessStudent(user, photo.studentId)) {
    response.status(404).json({ message: 'Foto nao encontrada.' })
    return
  }

  const filePath = join(uploadDir, photo.fileName)
  if (!existsSync(filePath)) {
    response.status(404).json({ message: 'Arquivo nao encontrado.' })
    return
  }

  response.sendFile(filePath)
})

app.get('/api/students/:studentId/assessments', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal', 'aluno'])
  if (!user) return

  const studentId = Number(request.params.studentId)

  if (!Number.isInteger(studentId) || !canAccessStudent(user, studentId)) {
    response.status(403).json({ message: 'Sem acesso a este aluno.' })
    return
  }

  const assessments = db
    .prepare(
      `
      SELECT
        id,
        assessment_date AS date,
        COALESCE(weight_kg, '') AS weight,
        COALESCE(height_cm, '') AS height,
        COALESCE(chest_cm, '') AS chest,
        COALESCE(waist_cm, '') AS waist,
        COALESCE(abdomen_cm, '') AS abdomen,
        COALESCE(hip_cm, '') AS hip,
        COALESCE(right_arm_cm, '') AS rightArm,
        COALESCE(left_arm_cm, '') AS leftArm,
        COALESCE(right_thigh_cm, '') AS rightThigh,
        COALESCE(left_thigh_cm, '') AS leftThigh,
        COALESCE(right_calf_cm, '') AS rightCalf,
        COALESCE(left_calf_cm, '') AS leftCalf,
        COALESCE(body_model_target, '') AS targetBody,
        COALESCE(notes, '') AS notes
      FROM physical_assessments
      WHERE student_id = ?
      ORDER BY assessment_date DESC, id DESC
      `,
    )
    .all(studentId)

  const photos = db.prepare('SELECT id, angle, file_path AS fileName FROM assessment_photos WHERE assessment_id = ?')

  function photoToPayload(photo) {
    const filePath = join(uploadDir, photo.fileName)
    if (!existsSync(filePath)) return { id: photo.id, angle: photo.angle, dataUrl: '' }

    const extension = photo.fileName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : photo.fileName.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg'

    return {
      id: photo.id,
      angle: photo.angle,
      dataUrl: `data:${extension};base64,${readFileSync(filePath).toString('base64')}`,
    }
  }

  response.json({
    assessments: assessments.map((assessment) => ({
      ...assessment,
      photos: photos.all(assessment.id).map(photoToPayload),
    })),
  })
})

app.post('/api/students/:studentId/assessments', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal', 'aluno'])
  if (!user) return

  const studentId = Number(request.params.studentId)

  if (!Number.isInteger(studentId) || !canAccessStudent(user, studentId, false)) {
    response.status(403).json({ message: 'Sem acesso a este aluno ativo.' })
    return
  }

  const trainer = getStudentTrainer(user, studentId)
  const body = request.body ?? {}
  const date = String(body.date ?? new Date().toISOString().slice(0, 10))
  const photos = Array.isArray(body.photos) ? body.photos : []

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `
        INSERT INTO physical_assessments (
          student_id,
          trainer_id,
          assessment_date,
          weight_kg,
          height_cm,
          chest_cm,
          waist_cm,
          abdomen_cm,
          hip_cm,
          right_arm_cm,
          left_arm_cm,
          right_thigh_cm,
          left_thigh_cm,
          right_calf_cm,
          left_calf_cm,
          body_model_target,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        studentId,
        trainer?.id ?? null,
        date,
        Number(body.weight) || null,
        Number(body.height) || null,
        Number(body.chest) || null,
        Number(body.waist) || null,
        Number(body.abdomen) || null,
        Number(body.hip) || null,
        Number(body.rightArm) || null,
        Number(body.leftArm) || null,
        Number(body.rightThigh) || null,
        Number(body.leftThigh) || null,
        Number(body.rightCalf) || null,
        Number(body.leftCalf) || null,
        String(body.targetBody ?? ''),
        String(body.notes ?? ''),
      )

    const insertPhoto = db.prepare('INSERT INTO assessment_photos (assessment_id, angle, file_path) VALUES (?, ?, ?)')

    for (const photo of photos) {
      const saved = saveAssessmentPhoto(studentId, photo)
      if (saved) insertPhoto.run(result.lastInsertRowid, saved.angle, saved.fileName)
    }

    return result.lastInsertRowid
  })

  response.status(201).json({ id: transaction() })
})

app.get('/api/students/:studentId/plans', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal', 'aluno'])
  if (!user) return

  const studentId = Number(request.params.studentId)

  if (!Number.isInteger(studentId) || !canAccessStudent(user, studentId)) {
    response.status(403).json({ message: 'Sem acesso a este aluno.' })
    return
  }

  const workouts = db
    .prepare(
      `
      SELECT id, name, week_start_date AS weekStartDate, COALESCE(notes, '') AS notes, created_at AS createdAt
      FROM weekly_plans
      WHERE student_id = ?
      ORDER BY week_start_date DESC, id DESC
      `,
    )
    .all(studentId)

  const diets = db
    .prepare(
      `
      SELECT id, name, COALESCE(plan_date, week_start_date, '') AS planDate, COALESCE(notes, '') AS notes, created_at AS createdAt
      FROM diet_plans
      WHERE student_id = ?
      ORDER BY COALESCE(plan_date, week_start_date, created_at) DESC, id DESC
      `,
    )
    .all(studentId)

  response.json({ workouts, diets })
})

app.post('/api/students/:studentId/workout-plans', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const studentId = Number(request.params.studentId)

  if (!Number.isInteger(studentId) || !canAccessStudent(user, studentId, false)) {
    response.status(403).json({ message: 'Sem acesso a este aluno ativo.' })
    return
  }

  const trainer = getStudentTrainer(user, studentId)
  const name = String(request.body?.name ?? '').trim()
  const weekStartDate = String(request.body?.weekStartDate ?? new Date().toISOString().slice(0, 10)).trim()
  const notes = String(request.body?.notes ?? '').trim()

  if (!name) {
    response.status(400).json({ message: 'Informe o nome do plano de treinamento.' })
    return
  }

  const result = db
    .prepare(
      `
      INSERT INTO weekly_plans (student_id, trainer_id, name, week_start_date, notes)
      VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(studentId, trainer?.id ?? null, name, weekStartDate, notes)

  response.status(201).json({ plan: { id: result.lastInsertRowid, name, weekStartDate, notes } })
})

app.post('/api/students/:studentId/diet-plans', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const studentId = Number(request.params.studentId)

  if (!Number.isInteger(studentId) || !canAccessStudent(user, studentId, false)) {
    response.status(403).json({ message: 'Sem acesso a este aluno ativo.' })
    return
  }

  const trainer = getStudentTrainer(user, studentId)
  const name = String(request.body?.name ?? '').trim()
  const planDate = String(request.body?.planDate ?? new Date().toISOString().slice(0, 10)).trim()
  const notes = String(request.body?.notes ?? '').trim()

  if (!name) {
    response.status(400).json({ message: 'Informe o nome do plano de dieta.' })
    return
  }

  const result = db
    .prepare(
      `
      INSERT INTO diet_plans (student_id, trainer_id, name, plan_date, notes)
      VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(studentId, trainer?.id ?? null, name, planDate, notes)

  response.status(201).json({ plan: { id: result.lastInsertRowid, name, planDate, notes } })
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
