import type { Assessment, Exercise, Student, WorkoutLibrary } from './types'

export const initialStudents: Student[] = [
  {
    name: 'Aline Costa',
    goal: 'Hipertrofia e postura',
    start: '2026-09-01',
    restrictions: 'Dor lombar em agachamento profundo',
    adherence: 94,
    nextReview: '2026-09-15',
  },
  {
    name: 'Bruno Lima',
    goal: 'Performance e recomposicao',
    start: '2026-08-12',
    restrictions: 'Sem restricoes',
    adherence: 88,
    nextReview: '2026-09-18',
  },
  {
    name: 'Camila Rocha',
    goal: 'Emagrecimento com manutencao muscular',
    start: '2026-07-22',
    restrictions: 'Condromalacia leve',
    adherence: 76,
    nextReview: '2026-09-20',
  },
]

export const initialExercises: Exercise[] = [
  {
    name: 'Agachamento guiado',
    muscle: 'Quadriceps e gluteos',
    media: 'video-agachamento.mp4',
    audio: 'comando-agachamento.mp3',
    sets: '4',
    reps: '10',
    load: 'moderado',
    rest: '90 segundos',
    notes: 'Controlar descida e manter joelhos alinhados.',
  },
  {
    name: 'Remada baixa',
    muscle: 'Dorsais',
    media: 'gif-remada.gif',
    audio: 'respiracao-remada.mp3',
    sets: '3',
    reps: '12',
    load: 'pesado',
    rest: '75 segundos',
    notes: 'Evitar elevacao dos ombros no final do movimento.',
  },
]

export const weeklyPlan = [
  { day: 'Segunda', title: 'Inferiores A', status: 'Pronto', done: true },
  { day: 'Terca', title: 'Superiores push', status: 'Revisar carga', done: true },
  { day: 'Quarta', title: 'Mobilidade + cardio', status: 'Pronto', done: false },
  { day: 'Quinta', title: 'Inferiores B', status: 'Pendente', done: false },
  { day: 'Sexta', title: 'Superiores pull', status: 'Pronto', done: false },
]

export const weekDayOptions = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terca' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
]

export const measurements = [
  'Peso (kg)',
  'Altura',
  'Torax / Busto (cm)',
  'Cintura (cm)',
  'Abdomen (cm)',
  'Quadril (cm)',
  'Braco direito (cm)',
  'Braco esquerdo (cm)',
  'Coxa direita (cm)',
  'Coxa esquerda (cm)',
  'Panturrilha direita (cm)',
  'Panturrilha esquerda (cm)',
]

export const adminItems = [
  'Gerenciar tipo de usuario',
  'Cadastrar personal',
  'Cadastrar aluno',
  'Cadastrar plano semanal',
  'Cadastrar treino diario',
  'Cadastrar exercicio',
]

export const blankExercise: Exercise = {
  name: '',
  muscle: '',
  media: '',
  audio: '',
  sets: '3',
  reps: '12',
  load: 'moderado',
  rest: '',
  notes: '',
  mediaDuration: 0,
  audioDuration: 0,
}

export const blankStudent: Student = {
  name: '',
  goal: '',
  start: '',
  restrictions: '',
  adherence: 0,
  nextReview: '',
}

export const blankAssessment: Assessment = {
  date: '',
  weight: '',
  height: '',
  chest: '',
  waist: '',
  abdomen: '',
  hip: '',
  rightArm: '',
  leftArm: '',
  rightThigh: '',
  leftThigh: '',
  rightCalf: '',
  leftCalf: '',
  targetBody: '',
  notes: '',
  photos: [],
}

export const blankWorkoutLibrary: WorkoutLibrary = {
  exercises: [],
  dailyTemplates: [],
  weeklyTemplates: [],
}
