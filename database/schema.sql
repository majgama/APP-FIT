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


CREATE TABLE IF NOT EXISTS student_trainers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  trainer_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'secondary')),
  is_active INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
  UNIQUE (student_id, trainer_id)
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

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invited_by_user_id INTEGER,
  email TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (role_id) REFERENCES user_roles(id)
);

CREATE TABLE IF NOT EXISTS media_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uploaded_by_user_id INTEGER,
  owner_user_id INTEGER,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes INTEGER,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'gif', 'audio', 'document', 'other')),
  entity_type TEXT,
  entity_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS body_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL CHECK (model_type IN ('current', 'target')),
  image_path TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS muscle_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  body_region TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL,
  muscle_group_id INTEGER NOT NULL,
  emphasis TEXT NOT NULL DEFAULT 'primary' CHECK (emphasis IN ('primary', 'secondary')),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
  UNIQUE (exercise_id, muscle_group_id)
);

CREATE TABLE IF NOT EXISTS diet_template_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diet_template_id INTEGER NOT NULL,
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
  FOREIGN KEY (diet_template_id) REFERENCES diet_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER,
  diet_template_meal_id INTEGER,
  name TEXT NOT NULL,
  amount TEXT,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
  FOREIGN KEY (diet_template_meal_id) REFERENCES diet_template_meals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER,
  student_id INTEGER,
  title TEXT NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'consultation' CHECK (
    appointment_type IN ('consultation', 'assessment', 'follow_up', 'training_review', 'other')
  ),
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  author_user_id INTEGER,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (
    note_type IN ('general', 'restriction', 'goal', 'injury', 'diet', 'workout')
  ),
  content TEXT NOT NULL,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exercise_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_checkin_id INTEGER NOT NULL,
  daily_workout_exercise_id INTEGER,
  exercise_id INTEGER,
  completed_sets INTEGER,
  completed_reps TEXT,
  perceived_load TEXT CHECK (perceived_load IN ('leve', 'moderado', 'pesado', 'muito pesado')),
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_checkin_id) REFERENCES workout_checkins(id) ON DELETE CASCADE,
  FOREIGN KEY (daily_workout_exercise_id) REFERENCES daily_workout_exercises(id) ON DELETE SET NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info' CHECK (
    notification_type IN ('info', 'assessment', 'workout', 'diet', 'message', 'system')
  ),
  entity_type TEXT,
  entity_id INTEGER,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  metadata_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_students_trainer_id ON students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_student_trainers_student ON student_trainers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_trainers_trainer ON student_trainers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student_date ON physical_assessments(student_id, assessment_date);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_student_week ON weekly_plans(student_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_daily_workouts_weekly_plan ON daily_workouts(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_checkins_student ON workout_checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_student ON diet_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_media_files_entity ON media_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscle_groups_exercise ON exercise_muscle_groups(exercise_id);
CREATE INDEX IF NOT EXISTS idx_diet_template_meals_template ON diet_template_meals(diet_template_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_appointments_trainer_date ON appointments(trainer_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_student_date ON appointments(student_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_feedback_checkin ON exercise_feedback(workout_checkin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

INSERT OR IGNORE INTO user_roles (id, name, description) VALUES
  (1, 'admin', 'Gerencia usuarios, cadastros e permissoes'),
  (2, 'personal', 'Cria treinos, dietas, avaliacoes e acompanha alunos'),
  (3, 'aluno', 'Executa treinos, envia check-ins e registra evolucao');

INSERT OR IGNORE INTO body_models (id, name, model_type, sort_order, description) VALUES
  (1, 'Atual 1', 'current', 1, 'Modelo corporal atual para avaliacao visual'),
  (2, 'Atual 2', 'current', 2, 'Modelo corporal atual para avaliacao visual'),
  (3, 'Atual 3', 'current', 3, 'Modelo corporal atual para avaliacao visual'),
  (4, 'Atual 4', 'current', 4, 'Modelo corporal atual para avaliacao visual'),
  (5, 'Objetivo 1', 'target', 1, 'Modelo corporal desejado pelo aluno'),
  (6, 'Objetivo 2', 'target', 2, 'Modelo corporal desejado pelo aluno'),
  (7, 'Objetivo 3', 'target', 3, 'Modelo corporal desejado pelo aluno');

INSERT OR IGNORE INTO muscle_groups (id, name, body_region) VALUES
  (1, 'Peitoral', 'Tronco'),
  (2, 'Costas', 'Tronco'),
  (3, 'Ombros', 'Membros superiores'),
  (4, 'Biceps', 'Membros superiores'),
  (5, 'Triceps', 'Membros superiores'),
  (6, 'Quadriceps', 'Membros inferiores'),
  (7, 'Posterior de coxa', 'Membros inferiores'),
  (8, 'Gluteos', 'Membros inferiores'),
  (9, 'Panturrilhas', 'Membros inferiores'),
  (10, 'Abdomen', 'Core'),
  (11, 'Lombar', 'Core');
