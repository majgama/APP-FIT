import bcrypt from 'bcryptjs'
import express from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, toPublicUser } from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const uploadDir = join(rootDir, 'data', 'uploads')
const distDir = join(rootDir, 'dist')
const hasProductionBuild = existsSync(distDir) && existsSync(join(distDir, 'index.html'))
const maxExerciseVideoBytes = 8 * 1024 * 1024
const maxExerciseAudioBytes = 3 * 1024 * 1024
const maxProfilePhotoBytes = 3 * 1024 * 1024

mkdirSync(uploadDir, { recursive: true })

app.use(express.json({ limit: '25mb' }))

if (hasProductionBuild) {
  app.use(express.static(distDir))

  app.get(/^(?!\/api).*/, (request, response, next) => {
    if (request.path.startsWith('/api')) {
      next()
      return
    }

    response.sendFile(join(distDir, 'index.html'))
  })
}

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

function ensurePersonalInviteLink(userId, request) {
  const trainer = getTrainerByUserId(userId)
  if (!trainer) return null

  const existing = db
    .prepare('SELECT invite_token AS token, invite_url AS url FROM trainers WHERE id = ?')
    .get(trainer.id)

  if (existing?.url && existing.token) {
    return {
      code: existing.token.slice(0, 8).toUpperCase(),
      token: existing.token,
      url: existing.url,
      expiresAt: null,
    }
  }

  const token = randomBytes(12).toString('hex')
  const url = `${getBaseUrl(request)}/?invite=${token}`

  db.prepare('UPDATE trainers SET invite_token = ?, invite_url = ? WHERE id = ?').run(token, url, trainer.id)

  return {
    code: token.slice(0, 8).toUpperCase(),
    token,
    url,
    expiresAt: null,
  }
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

function saveExerciseMedia(value, kind, durationSeconds = 0) {
  const dataUrl = String(value ?? '')
  if (!dataUrl.startsWith('data:')) {
    if (kind === 'video' && /^https?:\/\//i.test(dataUrl)) {
      try {
        const host = new URL(dataUrl).hostname.replace(/^www\./, '')
        if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
          return { value: '', error: 'Informe um link valido do YouTube.' }
        }
      } catch {
        return { value: '', error: 'Informe um link valido do YouTube.' }
      }
    }
    return { value: dataUrl, error: '' }
  }

  const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/)
  if (!match) return { value: '', error: 'Arquivo de midia invalido.' }

  const mimeType = match[1].toLowerCase()
  const allowedVideo = ['video/mp4', 'video/webm', 'video/quicktime', 'image/gif']
  const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4']
  const allowedTypes = kind === 'video' ? allowedVideo : allowedAudio
  if (!allowedTypes.includes(mimeType)) return { value: '', error: `Formato de ${kind === 'video' ? 'video ou GIF' : 'audio'} nao permitido.` }

  const buffer = Buffer.from(match[2], 'base64')
  const byteLimit = kind === 'video' ? maxExerciseVideoBytes : maxExerciseAudioBytes
  if (!buffer.length || buffer.length > byteLimit) {
    return { value: '', error: `${kind === 'video' ? 'Video ou GIF' : 'Audio'} acima do limite de ${kind === 'video' ? '8 MB' : '3 MB'}.` }
  }

  const duration = Number(durationSeconds) || 0
  if (kind === 'video' && mimeType !== 'image/gif' && duration > 5.2) {
    return { value: '', error: 'O video deve ter no maximo 5 segundos.' }
  }
  if (kind === 'audio' && duration > 60.2) {
    return { value: '', error: 'O audio deve ter no maximo 60 segundos.' }
  }

  const extensions = {
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov', 'image/gif': '.gif',
    'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/webm': '.webm',
    'audio/ogg': '.ogg', 'audio/mp4': '.m4a',
  }
  const fileName = `exercise-${kind}-${Date.now()}-${randomBytes(5).toString('hex')}${extensions[mimeType]}`
  writeFileSync(join(uploadDir, fileName), buffer)
  return { value: `/api/exercise-media/${fileName}`, error: '' }
}

function saveProfilePhoto(userId, dataUrl) {
  const value = String(dataUrl ?? '')
  if (!value.startsWith('data:image/')) return { fileName: '', error: 'Foto de perfil invalida.' }

  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!match) return { fileName: '', error: 'Use uma foto JPG, PNG ou WebP.' }
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > maxProfilePhotoBytes) {
    return { fileName: '', error: 'A foto de perfil deve ter no maximo 3 MB.' }
  }

  const extension = match[1] === 'image/png' ? '.png' : match[1] === 'image/webp' ? '.webp' : '.jpg'
  const fileName = `profile-${userId}-${Date.now()}-${randomBytes(4).toString('hex')}${extension}`
  writeFileSync(join(uploadDir, fileName), buffer)
  return { fileName, error: '' }
}

function profilePhotoData(fileName) {
  if (!fileName) return ''
  const safeName = basename(String(fileName))
  const filePath = join(uploadDir, safeName)
  if (!safeName.startsWith('profile-') || !existsSync(filePath)) return ''
  const mimeType = safeName.endsWith('.png') ? 'image/png' : safeName.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  return `data:${mimeType};base64,${readFileSync(filePath).toString('base64')}`
}

function getUserProfile(userId) {
  const profile = db.prepare(
    `SELECT users.id, users.name, users.email, COALESCE(users.birth_date, '') AS birthDate,
      COALESCE(users.profile_photo_path, '') AS profilePhotoPath,
      user_roles.name AS role, COALESCE(trainers.registration_code, '') AS crefNumber,
      COALESCE(trainers.invite_url, '') AS inviteUrl,
      COALESCE(trainers.invite_token, '') AS inviteToken
     FROM users
     JOIN user_roles ON user_roles.id = users.role_id
     LEFT JOIN trainers ON trainers.user_id = users.id
     WHERE users.id = ?`,
  ).get(userId)
  if (!profile) return null
  return {
    ...profile,
    profilePhoto: profilePhotoData(profile.profilePhotoPath),
    profilePhotoPath: undefined,
    inviteUrl: profile.inviteUrl || '',
    inviteCode: profile.inviteToken ? profile.inviteToken.slice(0, 8).toUpperCase() : '',
  }
}

const weekDays = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terca-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
]

function libraryVisibility(user, alias = '') {
  const prefix = alias ? `${alias}.` : ''
  return {
    clause: `(${prefix}visibility = 'platform' OR ${prefix}created_by_user_id = ?)`,
    params: [user.id],
  }
}

function getTemplateExercises(templateId) {
  return db
    .prepare(
      `
      SELECT
        exercises.id,
        exercises.name,
        exercises.muscle_name AS muscle,
        COALESCE(workout_template_exercises.sets, exercises.default_sets, 0) AS sets,
        COALESCE(workout_template_exercises.reps, exercises.default_reps, '') AS reps,
        COALESCE(workout_template_exercises.load, exercises.default_load, 'moderado') AS load,
        COALESCE(workout_template_exercises.rest_text, exercises.rest_text, '') AS rest,
        COALESCE(workout_template_exercises.observation_text, exercises.observation_text, '') AS notes,
        workout_template_exercises.sort_order AS sortOrder
      FROM workout_template_exercises
      JOIN exercises ON exercises.id = workout_template_exercises.exercise_id
      WHERE workout_template_exercises.workout_template_id = ?
      ORDER BY workout_template_exercises.sort_order, workout_template_exercises.id
      `,
    )
    .all(templateId)
}

function getVisibleTemplate(user, templateId, templateType) {
  const visibility = libraryVisibility(user)
  return db
    .prepare(`SELECT * FROM workout_templates WHERE id = ? AND template_type = ? AND ${visibility.clause}`)
    .get(templateId, templateType, ...visibility.params)
}

function serializeDailyTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? '',
    visibility: template.visibility,
    exercises: getTemplateExercises(template.id),
  }
}

function getTemplateDays(templateId) {
  const rows = db
    .prepare(
      `
      SELECT weekly_template_days.day_of_week AS dayOfWeek,
        weekly_template_days.day_name AS dayName,
        weekly_template_days.daily_template_id AS dailyTemplateId,
        workout_templates.name AS workoutName,
        COALESCE(workout_templates.description, '') AS instructions
      FROM weekly_template_days
      LEFT JOIN workout_templates ON workout_templates.id = weekly_template_days.daily_template_id
      WHERE weekly_template_days.weekly_template_id = ?
      ORDER BY weekly_template_days.sort_order
      `,
    )
    .all(templateId)

  return rows.map((day) => ({
    ...day,
    workoutName: day.workoutName ?? 'Descanso',
    exercises: day.dailyTemplateId ? getTemplateExercises(day.dailyTemplateId) : [],
  }))
}

function getAppliedPlanDays(planId) {
  const days = db
    .prepare(
      `
      SELECT id, day_of_week AS dayOfWeek, name, COALESCE(instructions, '') AS instructions
      FROM daily_workouts
      WHERE weekly_plan_id = ?
      ORDER BY id
      `,
    )
    .all(planId)
  const exercises = db.prepare(
    `
    SELECT exercises.id, exercises.name, exercises.muscle_name AS muscle,
      COALESCE(exercises.video_or_gif_path, '') AS media,
      COALESCE(exercises.audio_path, '') AS audio,
      COALESCE(daily_workout_exercises.sets, 0) AS sets,
      COALESCE(daily_workout_exercises.reps, '') AS reps,
      COALESCE(daily_workout_exercises.load, 'moderado') AS load,
      COALESCE(daily_workout_exercises.rest_text, '') AS rest,
      COALESCE(daily_workout_exercises.observation_text, '') AS notes
    FROM daily_workout_exercises
    JOIN exercises ON exercises.id = daily_workout_exercises.exercise_id
    WHERE daily_workout_exercises.daily_workout_id = ?
    ORDER BY daily_workout_exercises.sort_order, daily_workout_exercises.id
    `,
  )

  return days.map((day) => ({ ...day, exercises: exercises.all(day.id) }))
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
  const invitation = db
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

  if (invitation) return invitation

  const trainerInvite = db
    .prepare(
      `
      SELECT
        trainers.id AS trainerId,
        trainers.invite_token AS token,
        trainers.invite_url AS url,
        trainer_users.name AS trainerName
      FROM trainers
      JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
      WHERE trainers.invite_token = ?
      `,
    )
    .get(token)

  if (!trainerInvite) return null

  return {
    id: trainerInvite.trainerId,
    email: null,
    code: trainerInvite.token.slice(0, 8).toUpperCase(),
    trainerId: trainerInvite.trainerId,
    status: 'pending',
    expiresAt: null,
    trainerName: trainerInvite.trainerName,
    url: trainerInvite.url,
  }
}

function isInvitationUsable(invitation) {
  if (!invitation || invitation.status !== 'pending') return false
  if (!invitation.expiresAt) return true

  return new Date(invitation.expiresAt.replace(' ', 'T')) > new Date()
}

function createStudentInvite({ request, invitedByUserId, trainerId, email }) {
  const token = randomBytes(5).toString('hex').slice(0, 10).toUpperCase()
  const code = token
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

app.get('/api/profile', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return

  const profile = getUserProfile(user.id)
  if (!profile) {
    response.status(404).json({ message: 'Perfil nao encontrado.' })
    return
  }
  response.json({ profile })
})

app.patch('/api/profile', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return

  const name = String(request.body?.name ?? '').trim()
  const email = String(request.body?.email ?? '').trim().toLowerCase()
  const birthDate = String(request.body?.birthDate ?? '').trim()
  const crefNumber = String(request.body?.crefNumber ?? '').trim()
  const profilePhoto = request.body?.profilePhoto

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ message: 'Informe nome e e-mail validos.' })
    return
  }
  if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > new Date().toISOString().slice(0, 10))) {
    response.status(400).json({ message: 'Data de nascimento invalida.' })
    return
  }
  const duplicate = db.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').get(email, user.id)
  if (duplicate) {
    response.status(409).json({ message: 'Este e-mail ja pertence a outro usuario.' })
    return
  }

  const current = db.prepare('SELECT profile_photo_path AS profilePhotoPath FROM users WHERE id = ?').get(user.id)
  let photoFileName = current?.profilePhotoPath ?? ''
  if (profilePhoto === '') {
    photoFileName = ''
  } else if (profilePhoto !== undefined && profilePhoto !== null && String(profilePhoto).startsWith('data:image/')) {
    const savedPhoto = saveProfilePhoto(user.id, profilePhoto)
    if (savedPhoto.error) {
      response.status(400).json({ message: savedPhoto.error })
      return
    }
    photoFileName = savedPhoto.fileName
  }

  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE users SET name = ?, email = ?, birth_date = ?, profile_photo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(name, email, birthDate || null, photoFileName || null, user.id)
    if (user.role === 'personal') {
      ensureTrainerForUser(user.id)
      db.prepare('UPDATE trainers SET registration_code = ? WHERE user_id = ?').run(crefNumber || null, user.id)
    }
    if (user.role === 'aluno') {
      db.prepare('UPDATE students SET name = ?, birth_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(name, birthDate || null, user.id)
    }
  })
  transaction()

  if (photoFileName !== current?.profilePhotoPath && current?.profilePhotoPath) {
    const oldName = basename(String(current.profilePhotoPath))
    const oldPath = join(uploadDir, oldName)
    if (oldName.startsWith(`profile-${user.id}-`) && existsSync(oldPath)) unlinkSync(oldPath)
  }

  response.json({ profile: getUserProfile(user.id) })
})

app.patch('/api/profile/password', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return

  const currentPassword = String(request.body?.currentPassword ?? '')
  const newPassword = String(request.body?.newPassword ?? '')
  const record = db.prepare('SELECT password_hash AS passwordHash FROM users WHERE id = ?').get(user.id)
  if (!record || !bcrypt.compareSync(currentPassword, record.passwordHash ?? '')) {
    response.status(400).json({ message: 'A senha atual esta incorreta.' })
    return
  }
  if (newPassword.length < 6) {
    response.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' })
    return
  }
  if (currentPassword === newPassword) {
    response.status(400).json({ message: 'A nova senha deve ser diferente da senha atual.' })
    return
  }

  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id)
  const currentTokenHash = hashToken(getBearerToken(request))
  db.prepare(
    'UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token_hash <> ? AND revoked_at IS NULL',
  ).run(user.id, currentTokenHash)
  response.json({ ok: true })
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
  const token = String(request.params.token ?? '').trim().toUpperCase()
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

app.get('/api/personal/invite', (request, response) => {
  const user = requireRole(request, response, ['personal'])
  if (!user) return

  const invite = ensurePersonalInviteLink(user.id, request)

  if (!invite) {
    response.status(400).json({ message: 'Personal nao encontrado.' })
    return
  }

  response.json({ invite })
})

app.post('/api/personal/invite', (request, response) => {
  const user = requireRole(request, response, ['personal'])
  if (!user) return

  const invite = ensurePersonalInviteLink(user.id, request)

  if (!invite) {
    response.status(400).json({ message: 'Personal nao encontrado.' })
    return
  }

  response.status(201).json({ invite })
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
      ensurePersonalInviteLink(user.id, request)
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
        COALESCE(users.profile_photo_path, '') AS photoPath,
        COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers
      FROM students
      LEFT JOIN users ON users.id = students.user_id
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

  response.json({ student: student ? { ...student, photo: profilePhotoData(student.photoPath || ''), photoPath: undefined } : null })
})

app.get('/api/students', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const status = String(request.query.status ?? 'active')

  if (!['active', 'inactive', 'all'].includes(status)) {
    response.status(400).json({ message: 'Status invalido.' })
    return
  }

  const queryBuilder = (selectClause, whereClause, params) => {
    const rows = db.prepare(`
      ${selectClause}
      FROM students
      LEFT JOIN users ON users.id = students.user_id
      LEFT JOIN student_trainers ON student_trainers.student_id = students.id
        AND student_trainers.is_active = 1
        AND student_trainers.ended_at IS NULL
      LEFT JOIN trainers ON trainers.id = student_trainers.trainer_id
      LEFT JOIN users AS trainer_users ON trainer_users.id = trainers.user_id
      ${whereClause}
      GROUP BY students.id
      ORDER BY students.name
    `).all(...params)

    return rows.map((student) => ({
      ...student,
      photo: profilePhotoData(student.photoPath || ''),
      trainers: student.trainers ?? '',
      photoPath: undefined,
    }))
  }

  if (user.role === 'admin') {
    const whereClause = status === 'all' ? '' : 'WHERE students.status = ?'
    const params = status === 'all' ? [] : [status]
    const students = queryBuilder(
      `SELECT
        students.id,
        students.name,
        COALESCE(students.goal, '') AS goal,
        COALESCE(students.start_date, '') AS start,
        COALESCE(students.restrictions, '') AS restrictions,
        students.status AS linkStatus,
        0 AS adherence,
        'Agendar' AS nextReview,
        COALESCE(users.profile_photo_path, '') AS photoPath,
        COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers`,
      whereClause,
      params,
    )

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
        COALESCE(users.profile_photo_path, '') AS photoPath,
        COALESCE(GROUP_CONCAT(DISTINCT trainer_users.name), '') AS trainers
      FROM students
      JOIN student_trainers AS own_link ON own_link.student_id = students.id
        AND own_link.trainer_id = ?
        ${statusClause}
      LEFT JOIN users ON users.id = students.user_id
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
    .map((student) => ({ ...student, photo: profilePhotoData(student.photoPath || ''), trainers: student.trainers ?? '', photoPath: undefined }))

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

app.get('/api/exercise-media/:fileName', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal', 'aluno'])
  if (!user) return

  const fileName = basename(String(request.params.fileName ?? ''))
  if (!fileName.startsWith('exercise-')) {
    response.status(404).json({ message: 'Midia nao encontrada.' })
    return
  }

  const mediaPath = `/api/exercise-media/${fileName}`
  const exercise = db.prepare(
    'SELECT id, created_by_user_id AS createdByUserId, visibility FROM exercises WHERE video_or_gif_path = ? OR audio_path = ?',
  ).get(mediaPath, mediaPath)
  if (!exercise) {
    response.status(404).json({ message: 'Midia nao encontrada.' })
    return
  }

  let allowed = exercise.visibility === 'platform' || exercise.createdByUserId === user.id
  if (!allowed && user.role === 'aluno') {
    allowed = Boolean(db.prepare(
      `SELECT 1 FROM daily_workout_exercises
       JOIN daily_workouts ON daily_workouts.id = daily_workout_exercises.daily_workout_id
       JOIN weekly_plans ON weekly_plans.id = daily_workouts.weekly_plan_id
       JOIN students ON students.id = weekly_plans.student_id
       WHERE daily_workout_exercises.exercise_id = ? AND students.user_id = ? LIMIT 1`,
    ).get(exercise.id, user.id))
  }
  if (!allowed && user.role === 'personal') {
    const trainer = getTrainerByUserId(user.id)
    allowed = Boolean(trainer && db.prepare(
      `SELECT 1 FROM daily_workout_exercises
       JOIN daily_workouts ON daily_workouts.id = daily_workout_exercises.daily_workout_id
       JOIN weekly_plans ON weekly_plans.id = daily_workouts.weekly_plan_id
       JOIN student_trainers ON student_trainers.student_id = weekly_plans.student_id
       WHERE daily_workout_exercises.exercise_id = ? AND student_trainers.trainer_id = ? LIMIT 1`,
    ).get(exercise.id, trainer.id))
  }

  const filePath = join(uploadDir, fileName)
  if (!allowed || !existsSync(filePath)) {
    response.status(404).json({ message: 'Midia nao encontrada.' })
    return
  }
  response.sendFile(filePath)
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

app.get('/api/workout-library', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const exerciseVisibility = libraryVisibility(user, 'exercises')
  const templateVisibility = libraryVisibility(user)
  const exercises = db
    .prepare(
      `
      SELECT id, name, muscle_name AS muscle,
        COALESCE(video_or_gif_path, '') AS media,
        COALESCE(audio_path, '') AS audio,
        COALESCE(CAST(default_sets AS TEXT), '') AS sets,
        COALESCE(default_reps, '') AS reps,
        COALESCE(default_load, 'moderado') AS load,
        COALESCE(rest_text, '') AS rest,
        COALESCE(observation_text, '') AS notes,
        visibility
      FROM exercises
      WHERE ${exerciseVisibility.clause}
      ORDER BY visibility DESC, name
      `,
    )
    .all(...exerciseVisibility.params)

  const templates = db
    .prepare(
      `SELECT id, name, COALESCE(description, '') AS description, template_type AS templateType, visibility
       FROM workout_templates WHERE ${templateVisibility.clause} ORDER BY visibility DESC, name`,
    )
    .all(...templateVisibility.params)
  const dailyTemplates = templates
    .filter((template) => template.templateType === 'daily')
    .map(serializeDailyTemplate)
  const weeklyTemplates = templates
    .filter((template) => template.templateType === 'weekly')
    .map((template) => ({ ...template, days: getTemplateDays(template.id) }))

  response.json({ exercises, dailyTemplates, weeklyTemplates })
})

app.post('/api/workout-library/exercises', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const name = String(request.body?.name ?? '').trim()
  const muscle = String(request.body?.muscle ?? '').trim()
  const sets = Number(request.body?.sets ?? 0)
  const reps = String(request.body?.reps ?? '').trim()
  const load = String(request.body?.load ?? 'moderado')
  const rest = String(request.body?.rest ?? '').trim()
  const notes = String(request.body?.notes ?? '').trim()
  const media = String(request.body?.media ?? '').trim()
  const audio = String(request.body?.audio ?? '').trim()

  if (!name || !muscle) {
    response.status(400).json({ message: 'Informe o nome e o grupo muscular.' })
    return
  }

  const savedMedia = saveExerciseMedia(media, 'video', request.body?.mediaDuration)
  const savedAudio = saveExerciseMedia(audio, 'audio', request.body?.audioDuration)
  const mediaError = savedMedia.error || savedAudio.error
  if (mediaError) {
    response.status(400).json({ message: mediaError })
    return
  }

  const visibility = user.role === 'admin' ? 'platform' : 'private'
  const result = db.prepare(
    `INSERT INTO exercises (
      created_by_user_id, visibility, name, muscle_name, video_or_gif_path, audio_path,
      default_sets, default_reps, default_load, rest_text, observation_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(user.id, visibility, name, muscle, savedMedia.value, savedAudio.value, sets || null, reps, load, rest, notes)

  response.status(201).json({ exercise: { id: result.lastInsertRowid, name, muscle, sets: String(sets || ''), reps, load, rest, notes, media: savedMedia.value, audio: savedAudio.value, visibility } })
})

app.post('/api/workout-library/daily-templates', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const name = String(request.body?.name ?? '').trim()
  const description = String(request.body?.description ?? '').trim()
  const exercises = Array.isArray(request.body?.exercises) ? request.body.exercises : []
  if (!name) {
    response.status(400).json({ message: 'Informe o nome do treino diario.' })
    return
  }

  for (const item of exercises) {
    const visibility = libraryVisibility(user)
    const exercise = db.prepare(`SELECT id FROM exercises WHERE id = ? AND ${visibility.clause}`).get(Number(item.exerciseId), ...visibility.params)
    if (!exercise) {
      response.status(403).json({ message: 'Um dos exercicios nao esta disponivel para este usuario.' })
      return
    }
  }

  const trainer = user.role === 'personal' ? ensureTrainerForUser(user.id) : null
  const visibility = user.role === 'admin' ? 'platform' : 'private'
  const transaction = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO workout_templates (created_by_user_id, visibility, trainer_id, name, description, template_type)
       VALUES (?, ?, ?, ?, ?, 'daily')`,
    ).run(user.id, visibility, trainer?.id ?? null, name, description)
    const insertExercise = db.prepare(
      `INSERT INTO workout_template_exercises
       (workout_template_id, exercise_id, sort_order, sets, reps, load, rest_text, observation_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    exercises.forEach((item, index) => insertExercise.run(
      result.lastInsertRowid,
      Number(item.exerciseId),
      index,
      Number(item.sets) || null,
      String(item.reps ?? ''),
      String(item.load ?? 'moderado'),
      String(item.rest ?? ''),
      String(item.notes ?? ''),
    ))
    return result.lastInsertRowid
  })

  response.status(201).json({ id: transaction() })
})

app.post('/api/workout-library/weekly-templates', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal'])
  if (!user) return

  const name = String(request.body?.name ?? '').trim()
  const description = String(request.body?.description ?? '').trim()
  const submittedDays = Array.isArray(request.body?.days) ? request.body.days : []
  if (!name) {
    response.status(400).json({ message: 'Informe o nome do plano semanal.' })
    return
  }

  const normalizedDays = weekDays.map((day) => {
    const submitted = submittedDays.find((item) => item.dayOfWeek === day.key)
    return { ...day, dailyTemplateId: Number(submitted?.dailyTemplateId) || null }
  })

  for (const day of normalizedDays.filter((item) => item.dailyTemplateId)) {
    if (!getVisibleTemplate(user, day.dailyTemplateId, 'daily')) {
      response.status(403).json({ message: `Treino indisponivel para ${day.label}.` })
      return
    }
  }

  const trainer = user.role === 'personal' ? ensureTrainerForUser(user.id) : null
  const visibility = user.role === 'admin' ? 'platform' : 'private'
  const transaction = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO workout_templates (created_by_user_id, visibility, trainer_id, name, description, template_type)
       VALUES (?, ?, ?, ?, ?, 'weekly')`,
    ).run(user.id, visibility, trainer?.id ?? null, name, description)
    const insertDay = db.prepare(
      `INSERT INTO weekly_template_days (weekly_template_id, day_of_week, daily_template_id, day_name, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
    )
    normalizedDays.forEach((day, index) => insertDay.run(result.lastInsertRowid, day.key, day.dailyTemplateId, day.label, index))
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
      SELECT id, name, week_start_date AS weekStartDate, COALESCE(notes, '') AS notes,
        status, completed_at AS completedAt, created_at AS createdAt
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

  response.json({
    workouts: workouts.map((plan) => ({ ...plan, days: getAppliedPlanDays(plan.id) })),
    diets,
  })
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
  const templateId = Number(request.body?.templateId) || null
  const template = templateId ? getVisibleTemplate(user, templateId, 'weekly') : null
  const name = String(request.body?.name ?? template?.name ?? '').trim()
  const weekStartDate = String(request.body?.weekStartDate ?? new Date().toISOString().slice(0, 10)).trim()
  const notes = String(request.body?.notes ?? template?.description ?? '').trim()

  if (!name) {
    response.status(400).json({ message: 'Informe o nome do plano de treinamento.' })
    return
  }

  if (templateId && !template) {
    response.status(403).json({ message: 'Este modelo de plano nao esta disponivel.' })
    return
  }

  const days = template ? getTemplateDays(template.id) : weekDays.map((day) => ({ ...day, workoutName: 'Descanso', instructions: '', dailyTemplateId: null, exercises: [] }))
  const transaction = db.transaction(() => {
    db.prepare("UPDATE weekly_plans SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE student_id = ? AND status = 'active'").run(studentId)
    const result = db.prepare(
      `INSERT INTO weekly_plans (student_id, trainer_id, workout_template_id, name, week_start_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    ).run(studentId, trainer?.id ?? null, templateId, name, weekStartDate, notes)
    const insertDay = db.prepare(
      `INSERT INTO daily_workouts (weekly_plan_id, workout_template_id, day_of_week, name, instructions)
       VALUES (?, ?, ?, ?, ?)`,
    )
    const insertExercise = db.prepare(
      `INSERT INTO daily_workout_exercises
       (daily_workout_id, exercise_id, sort_order, sets, reps, load, rest_text, observation_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    days.forEach((day) => {
      const daily = insertDay.run(result.lastInsertRowid, day.dailyTemplateId, day.dayOfWeek ?? day.key, day.workoutName, day.instructions)
      day.exercises.forEach((exercise, index) => insertExercise.run(
        daily.lastInsertRowid,
        exercise.id,
        index,
        Number(exercise.sets) || null,
        String(exercise.reps ?? ''),
        String(exercise.load ?? 'moderado'),
        String(exercise.rest ?? ''),
        String(exercise.notes ?? ''),
      ))
    })
    return result.lastInsertRowid
  })

  const planId = transaction()
  response.status(201).json({ plan: { id: planId, name, weekStartDate, notes, status: 'active', days: getAppliedPlanDays(planId) } })
})

app.patch('/api/workout-plans/:planId/complete', (request, response) => {
  const user = requireRole(request, response, ['admin', 'personal', 'aluno'])
  if (!user) return

  const planId = Number(request.params.planId)
  const plan = db.prepare('SELECT id, student_id AS studentId FROM weekly_plans WHERE id = ?').get(planId)
  if (!plan || !canAccessStudent(user, plan.studentId, false)) {
    response.status(403).json({ message: 'Sem acesso a este plano.' })
    return
  }

  db.prepare("UPDATE weekly_plans SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(planId)
  response.json({ ok: true })
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

  const visibility = user.role === 'aluno'
    ? { clause: "exercises.visibility = 'platform'", params: [] }
    : libraryVisibility(user, 'exercises')

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
        COALESCE(observation_text, '') AS notes,
        visibility
      FROM exercises
      WHERE ${visibility.clause}
      ORDER BY name
      `,
    )
    .all(...visibility.params)

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

  const savedMedia = saveExerciseMedia(media, 'video', request.body?.mediaDuration)
  const savedAudio = saveExerciseMedia(audio, 'audio', request.body?.audioDuration)
  const mediaError = savedMedia.error || savedAudio.error
  if (mediaError) {
    response.status(400).json({ message: mediaError })
    return
  }

  const visibility = user.role === 'admin' ? 'platform' : 'private'
  const result = db
    .prepare(
      `
      INSERT INTO exercises (
        created_by_user_id,
        visibility,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(user.id, visibility, name, muscle, savedMedia.value, savedAudio.value, sets || null, reps, load, rest, notes)

  response.status(201).json({
    exercise: {
      id: result.lastInsertRowid,
      name,
      muscle,
      media: savedMedia.value,
      audio: savedAudio.value,
      sets: sets ? String(sets) : '',
      reps,
      load,
      rest,
      notes,
      visibility,
    },
  })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`APP-FIT API rodando em http://0.0.0.0:${port}`)
})
