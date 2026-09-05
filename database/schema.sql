PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES user_roles(id)
);

CREATE TABLE IF NOT EXISTS trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  registration_code TEXT,
  specialty TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  trainer_id INTEGER,
  name TEXT NOT NULL,
  birth_date TEXT,
  start_date TEXT,
  goal TEXT,
  restrictions TEXT,
  body_model_current TEXT,
  body_model_target TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS physical_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  trainer_id INTEGER,
  assessment_date TEXT NOT NULL,
  weight_kg REAL,
  height_cm REAL,
  chest_cm REAL,
  waist_cm REAL,
  abdomen_cm REAL,
  hip_cm REAL,
  right_arm_cm REAL,
  left_arm_cm REAL,
  right_thigh_cm REAL,
  left_thigh_cm REAL,
  right_calf_cm REAL,
  left_calf_cm REAL,
  body_model_current TEXT,
  body_model_target TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS assessment_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  angle TEXT NOT NULL CHECK (angle IN ('front', 'side', 'back')),
  file_path TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES physical_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_name TEXT NOT NULL,
  video_or_gif_path TEXT,
  audio_path TEXT,
  default_sets INTEGER,
  default_reps TEXT,
  default_load TEXT CHECK (default_load IN ('leve', 'moderado', 'pesado', 'muito pesado')),
  rest_text TEXT,
  observation_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('weekly', 'daily')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_template_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps TEXT,
  load TEXT CHECK (load IN ('leve', 'moderado', 'pesado', 'muito pesado')),
  rest_text TEXT,
  observation_text TEXT,
  FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  trainer_id INTEGER,
  workout_template_id INTEGER,
  name TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
  FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_plan_id INTEGER NOT NULL,
  workout_template_id INTEGER,
  day_of_week TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps TEXT,
  load TEXT CHECK (load IN ('leve', 'moderado', 'pesado', 'muito pesado')),
  rest_text TEXT,
  observation_text TEXT,
  FOREIGN KEY (daily_workout_id) REFERENCES daily_workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS workout_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  daily_workout_id INTEGER NOT NULL,
  performed_at TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  doubts_or_difficulties TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (daily_workout_id) REFERENCES daily_workouts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS diet_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('weekly', 'daily')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diet_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  trainer_id INTEGER,
  diet_template_id INTEGER,
  name TEXT NOT NULL,
  plan_date TEXT,
  week_start_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
  FOREIGN KEY (diet_template_id) REFERENCES diet_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diet_plan_id INTEGER NOT NULL,
  meal_type TEXT NOT NULL CHECK (
    meal_type IN (
      'cafe da manha',
      'lanche',
      'almoco',
      'lanche da tarde',
      'janta',
      'ceia',
      'pre-treino',
      'pos-treino',
      'suplementacao'
    )
  ),
  amount TEXT,
  photo_path TEXT,
  guidance_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diet_plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_students_trainer_id ON students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student_date ON physical_assessments(student_id, assessment_date);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_student_week ON weekly_plans(student_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_daily_workouts_weekly_plan ON daily_workouts(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_checkins_student ON workout_checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_student ON diet_plans(student_id);

INSERT OR IGNORE INTO user_roles (id, name, description) VALUES
  (1, 'admin', 'Gerencia usuarios, cadastros e permissoes'),
  (2, 'personal', 'Cria treinos, dietas, avaliacoes e acompanha alunos'),
  (3, 'aluno', 'Executa treinos, envia check-ins e registra evolucao');
