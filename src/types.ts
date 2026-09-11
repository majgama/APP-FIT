export type Area = 'personal' | 'aluno' | 'admin'
export type AuthMode = 'login' | 'register'
export type LoadLevel = 'leve' | 'moderado' | 'pesado' | 'muito pesado'

export type AppUser = {
  id: number
  name: string
  email: string
  role: Area
  invitationToken?: string
  profilePhoto?: string
}

export type UserProfile = {
  id: number
  name: string
  email: string
  birthDate: string
  role: Area
  crefNumber: string
  profilePhoto?: string
  inviteUrl?: string
  inviteCode?: string
}

export type RegisterUserInput = {
  name: string
  email: string
  password: string
  role: Area
}

export type Student = {
  id?: number
  name: string
  goal: string
  start: string
  restrictions: string
  adherence: number
  nextReview: string
  trainers?: string
  linkStatus?: 'active' | 'inactive'
  inactiveReason?: string
  photo?: string
}

export type Exercise = {
  id?: number
  name: string
  muscle: string
  media: string
  audio: string
  sets: string
  reps: string
  load: LoadLevel
  rest: string
  notes: string
  visibility?: 'platform' | 'private'
  mediaDuration?: number
  audioDuration?: number
}

export type Trainer = {
  id: number
  name: string
  email: string
  specialty: string
}

export type StudentInvitation = {
  code: string
  email: string
  trainerName: string
  expiresAt: string
}

export type GeneratedInvite = {
  code: string
  token: string
  url: string
  expiresAt: string
}

export type Assessment = {
  id?: number
  date: string
  weight: string
  height: string
  chest: string
  waist: string
  abdomen: string
  hip: string
  rightArm: string
  leftArm: string
  rightThigh: string
  leftThigh: string
  rightCalf: string
  leftCalf: string
  targetBody: string
  notes: string
  photos: AssessmentPhoto[]
}

export type AssessmentPhoto = {
  id?: number
  angle: 'front' | 'side' | 'back'
  dataUrl: string
}

export type BodyGoal = {
  name: string
  url: string
}

export type WorkoutPlan = {
  id: number
  name: string
  weekStartDate: string
  notes: string
  createdAt?: string
  status: 'active' | 'completed'
  completedAt?: string
  days: AppliedWorkoutDay[]
}

export type AppliedWorkoutDay = {
  id: number
  dayOfWeek: string
  name: string
  instructions: string
  exercises: Exercise[]
}

export type DailyTemplate = {
  id: number
  name: string
  description: string
  visibility: 'platform' | 'private'
  exercises: Exercise[]
}

export type WeeklyTemplateDay = {
  dayOfWeek: string
  dayName: string
  dailyTemplateId: number | null
  workoutName: string
  instructions: string
  exercises: Exercise[]
}

export type WeeklyTemplate = {
  id: number
  name: string
  description: string
  visibility: 'platform' | 'private'
  days: WeeklyTemplateDay[]
}

export type WorkoutLibrary = {
  exercises: Exercise[]
  dailyTemplates: DailyTemplate[]
  weeklyTemplates: WeeklyTemplate[]
}

export type WeeklyPlanInput = {
  templateId: number
  name: string
  weekStartDate: string
  notes: string
}

export type DietPlan = {
  id: number
  name: string
  planDate: string
  notes: string
  createdAt?: string
}
