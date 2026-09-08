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

const existingInvitationColumns = db.prepare('PRAGMA table_info(invitations)').all().map((column) => column.name)
const invitationMigrations = [
  ['trainer_id', 'ALTER TABLE invitations ADD COLUMN trainer_id INTEGER'],
  ['accepted_student_id', 'ALTER TABLE invitations ADD COLUMN accepted_student_id INTEGER'],
  ['invite_code', 'ALTER TABLE invitations ADD COLUMN invite_code TEXT'],
]

for (const [column, statement] of invitationMigrations) {
  if (!existingInvitationColumns.includes(column)) db.exec(statement)
}

const existingStudentTrainerColumns = db.prepare('PRAGMA table_info(student_trainers)').all().map((column) => column.name)

if (!existingStudentTrainerColumns.includes('inactive_reason')) {
  db.exec('ALTER TABLE student_trainers ADD COLUMN inactive_reason TEXT')
}

function addMissingColumns(tableName, migrations) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name)
  for (const [column, statement] of migrations) {
    if (!columns.includes(column)) db.exec(statement)
  }
}

addMissingColumns('exercises', [
  ['created_by_user_id', 'ALTER TABLE exercises ADD COLUMN created_by_user_id INTEGER'],
  ['visibility', "ALTER TABLE exercises ADD COLUMN visibility TEXT NOT NULL DEFAULT 'platform'"],
])

addMissingColumns('users', [
  ['birth_date', 'ALTER TABLE users ADD COLUMN birth_date TEXT'],
  ['profile_photo_path', 'ALTER TABLE users ADD COLUMN profile_photo_path TEXT'],
])

addMissingColumns('workout_templates', [
  ['created_by_user_id', 'ALTER TABLE workout_templates ADD COLUMN created_by_user_id INTEGER'],
  ['visibility', "ALTER TABLE workout_templates ADD COLUMN visibility TEXT NOT NULL DEFAULT 'platform'"],
])

addMissingColumns('weekly_plans', [
  ['status', "ALTER TABLE weekly_plans ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"],
  ['completed_at', 'ALTER TABLE weekly_plans ADD COLUMN completed_at TEXT'],
])

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_exercises_visibility_owner ON exercises(visibility, created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_workout_templates_visibility_owner ON workout_templates(visibility, created_by_user_id);
`)

const demoUsers = [
  { name: 'Administrador', email: 'admin@appfit.local', password: '123456', role: 'admin' },
  { name: 'Personal JC', email: 'personal@appfit.local', password: '123456', role: 'personal' },
  { name: 'Aline Costa', email: 'aluno@appfit.local', password: '123456', role: 'aluno' },
]

const demoStudents = [
  {
    name: 'Aline Costa',
    goal: 'Hipertrofia e postura',
    startDate: '2026-09-01',
    restrictions: 'Dor lombar em agachamento profundo',
  },
  {
    name: 'Bruno Lima',
    goal: 'Performance e recomposicao',
    startDate: '2026-08-12',
    restrictions: 'Sem restricoes',
  },
  {
    name: 'Camila Rocha',
    goal: 'Emagrecimento com manutencao muscular',
    startDate: '2026-07-22',
    restrictions: 'Condromalacia leve',
  },
]

const demoExercises = [
  {
    name: 'Agachamento guiado',
    muscleName: 'Quadriceps e gluteos',
    videoOrGifPath: 'video-agachamento.mp4',
    audioPath: 'comando-agachamento.mp3',
    defaultSets: 4,
    defaultReps: '10',
    defaultLoad: 'moderado',
    restText: '90 segundos',
    observationText: 'Controlar descida e manter joelhos alinhados.',
  },
  {
    name: 'Remada baixa',
    muscleName: 'Dorsais',
    videoOrGifPath: 'gif-remada.gif',
    audioPath: 'respiracao-remada.mp3',
    defaultSets: 3,
    defaultReps: '12',
    defaultLoad: 'pesado',
    restText: '75 segundos',
    observationText: 'Evitar elevacao dos ombros no final do movimento.',
  },
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

db.exec(`
  INSERT OR IGNORE INTO trainers (user_id, specialty)
  SELECT users.id, 'Assessoria fitness online'
  FROM users
  JOIN user_roles ON user_roles.id = users.role_id
  WHERE user_roles.name = 'personal'
`)
const studentCount = db.prepare('SELECT COUNT(*) AS total FROM students').get()

if (studentCount.total === 0) {
  const insertStudent = db.prepare(`
    INSERT INTO students (name, goal, start_date, restrictions)
    VALUES (@name, @goal, @startDate, @restrictions)
  `)

  for (const student of demoStudents) {
    insertStudent.run(student)
  }
}

db.exec(`
  UPDATE students
  SET user_id = (
    SELECT users.id
    FROM users
    JOIN user_roles ON user_roles.id = users.role_id
    WHERE user_roles.name = 'aluno'
      AND lower(users.name) = lower(students.name)
    LIMIT 1
  )
  WHERE user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM users
      JOIN user_roles ON user_roles.id = users.role_id
      WHERE user_roles.name = 'aluno'
        AND lower(users.name) = lower(students.name)
    )
`)

db.exec(`
  UPDATE students
  SET trainer_id = (
    SELECT trainers.id
    FROM trainers
    JOIN users ON users.id = trainers.user_id
    WHERE users.email = 'personal@appfit.local'
    LIMIT 1
  )
  WHERE trainer_id IS NULL
`)

db.exec(`
  INSERT OR IGNORE INTO student_trainers (student_id, trainer_id, relationship_type)
  SELECT students.id, trainers.id, 'primary'
  FROM students
  JOIN trainers
  JOIN users ON users.id = trainers.user_id
  WHERE users.email = 'personal@appfit.local'
`)
const exerciseCount = db.prepare('SELECT COUNT(*) AS total FROM exercises').get()

if (exerciseCount.total === 0) {
  const insertExercise = db.prepare(`
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
    VALUES (
      @name,
      @muscleName,
      @videoOrGifPath,
      @audioPath,
      @defaultSets,
      @defaultReps,
      @defaultLoad,
      @restText,
      @observationText
    )
  `)

  for (const exercise of demoExercises) {
    insertExercise.run(exercise)
  }
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}
