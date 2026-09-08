import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Apple,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FilePlus2,
  FolderOpen,
  HeartPulse,
  Link2,
  KeyRound,
  LineChart,
  LogIn,
  LogOut,
  LockKeyhole,
  Mail,
  MessageCircle,
  Mic,
  Play,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Square,
  Trash2,
  Upload,
  UserPlus,
  UserCog,
  Users,
  Copy,
  Video,
  Volume2,
  X,
} from 'lucide-react'
import './App.css'

type Area = 'personal' | 'aluno' | 'admin'
type AuthMode = 'login' | 'register'
type LoadLevel = 'leve' | 'moderado' | 'pesado' | 'muito pesado'

type AppUser = {
  id: number
  name: string
  email: string
  role: Area
  invitationToken?: string
  profilePhoto?: string
}

type UserProfile = {
  id: number
  name: string
  email: string
  birthDate: string
  role: Area
  crefNumber: string
  profilePhoto?: string
}

type RegisterUserInput = {
  name: string
  email: string
  password: string
  role: Area
}

type Student = {
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
}

type Exercise = {
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


type Trainer = {
  id: number
  name: string
  email: string
  specialty: string
}

type StudentInvitation = {
  code: string
  email: string
  trainerName: string
  expiresAt: string
}

type GeneratedInvite = {
  code: string
  token: string
  url: string
  expiresAt: string
}
type Assessment = {
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

type AssessmentPhoto = {
  id?: number
  angle: 'front' | 'side' | 'back'
  dataUrl: string
}

type BodyGoal = {
  name: string
  url: string
}

type WorkoutPlan = {
  id: number
  name: string
  weekStartDate: string
  notes: string
  createdAt?: string
  status: 'active' | 'completed'
  completedAt?: string
  days: AppliedWorkoutDay[]
}

type AppliedWorkoutDay = {
  id: number
  dayOfWeek: string
  name: string
  instructions: string
  exercises: Exercise[]
}

type DailyTemplate = {
  id: number
  name: string
  description: string
  visibility: 'platform' | 'private'
  exercises: Exercise[]
}

type WeeklyTemplateDay = {
  dayOfWeek: string
  dayName: string
  dailyTemplateId: number | null
  workoutName: string
  instructions: string
  exercises: Exercise[]
}

type WeeklyTemplate = {
  id: number
  name: string
  description: string
  visibility: 'platform' | 'private'
  days: WeeklyTemplateDay[]
}

type WorkoutLibrary = {
  exercises: Exercise[]
  dailyTemplates: DailyTemplate[]
  weeklyTemplates: WeeklyTemplate[]
}

type WeeklyPlanInput = {
  templateId: number
  name: string
  weekStartDate: string
  notes: string
}

type DietPlan = {
  id: number
  name: string
  planDate: string
  notes: string
  createdAt?: string
}

const initialStudents: Student[] = [
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

const initialExercises: Exercise[] = [
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

const weeklyPlan = [
  { day: 'Segunda', title: 'Inferiores A', status: 'Pronto', done: true },
  { day: 'Terca', title: 'Superiores push', status: 'Revisar carga', done: true },
  { day: 'Quarta', title: 'Mobilidade + cardio', status: 'Pronto', done: false },
  { day: 'Quinta', title: 'Inferiores B', status: 'Pendente', done: false },
  { day: 'Sexta', title: 'Superiores pull', status: 'Pronto', done: false },
]

const weekDayOptions = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terca' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
]

const measurements = [
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

const adminItems = [
  'Gerenciar tipo de usuario',
  'Cadastrar personal',
  'Cadastrar aluno',
  'Cadastrar plano semanal',
  'Cadastrar treino diario',
  'Cadastrar exercicio',
]

const blankExercise: Exercise = {
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

const blankStudent: Student = {
  name: '',
  goal: '',
  start: '',
  restrictions: '',
  adherence: 0,
  nextReview: '',
}

const blankAssessment: Assessment = {
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

const blankWorkoutLibrary: WorkoutLibrary = { exercises: [], dailyTemplates: [], weeklyTemplates: [] }

function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    Boolean(localStorage.getItem('app-fit-auth-token')),
  )
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [area, setArea] = useState<Area>('personal')
  const [activeView, setActiveView] = useState<'dashboard' | 'profile'>('dashboard')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [students, setStudents] = useState(initialStudents)
  const [inactiveStudents, setInactiveStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState(initialStudents[0].name)
  const [studentForm, setStudentForm] = useState(blankStudent)
  const [exerciseForm, setExerciseForm] = useState(blankExercise)
  const [exerciseCatalog, setExerciseCatalog] = useState(initialExercises)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [assessment, setAssessment] = useState(blankAssessment)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [bodyGoals, setBodyGoals] = useState<BodyGoal[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([])
  const [workoutLibrary, setWorkoutLibrary] = useState<WorkoutLibrary>(blankWorkoutLibrary)
  const [folderLoading, setFolderLoading] = useState(false)
  const [studentDoubt, setStudentDoubt] = useState('')
  const [invitationToken, setInvitationToken] = useState('')
  const [studentInvitation, setStudentInvitation] = useState<StudentInvitation | null>(null)
  const [studentToDeactivate, setStudentToDeactivate] = useState<Student | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [deactivationError, setDeactivationError] = useState('')

  const activeStudent = useMemo(
    () => students.find((student) => student.name === selectedStudent) ?? students[0] ?? blankStudent,
    [selectedStudent, students],
  )

  const averageAdherence = students.length
    ? Math.round(students.reduce((total, student) => total + student.adherence, 0) / students.length)
    : 0


  async function apiRequest(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('app-fit-auth-token')
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message ?? 'Nao foi possivel concluir a operacao.')
    }

    return data
  }

  async function fetchAppData(token: string, role: Area) {
    try {
      const profileData = await apiRequest('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const profile = profileData.profile as UserProfile
      setUserProfile(profile)
      setCurrentUser((current) => current
        ? { ...current, name: profile.name, email: profile.email, profilePhoto: profile.profilePhoto }
        : current)

      const exerciseData = await apiRequest('/api/exercises', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setExerciseCatalog(exerciseData.exercises as Exercise[])

      if (role === 'admin' || role === 'personal') {
        const trainerData = await apiRequest('/api/trainers', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setTrainers(trainerData.trainers as Trainer[])
        const libraryData = await apiRequest('/api/workout-library', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setWorkoutLibrary(libraryData as WorkoutLibrary)
      }
      if (role === 'admin' || role === 'personal') {
        const studentData = await apiRequest('/api/students', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const savedStudents = studentData.students as Student[]
        setStudents(savedStudents)
        setSelectedStudent(savedStudents[0]?.name ?? '')

        if (role === 'personal') {
          const inactiveData = await apiRequest('/api/students?status=inactive', {
            headers: { Authorization: `Bearer ${token}` },
          })
          setInactiveStudents(inactiveData.students as Student[])
        } else {
          setInactiveStudents([])
        }
      } else if (role === 'aluno') {
        const studentData = await apiRequest('/api/students/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const ownStudent = studentData.student as Student | null
        setStudents(ownStudent ? [ownStudent] : [])
        setSelectedStudent(ownStudent?.name ?? '')
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get('invite') ?? ''

    if (invite) {
      setInvitationToken(invite)
      fetch(`/api/invitations/student/${invite}`)
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.message ?? 'Convite invalido.')
          return data.invitation as StudentInvitation
        })
        .then(setStudentInvitation)
        .catch(() => setStudentInvitation(null))
    }

    const savedToken = localStorage.getItem('app-fit-auth-token')

    if (!savedToken) return

    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${savedToken}`,
      },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message ?? 'Sessao invalida.')
        return data.user as AppUser
      })
      .then((user) => {
        setCurrentUser(user)
        setArea(user.role)
        fetchAppData(savedToken, user.role)
      })
      .catch(() => localStorage.removeItem('app-fit-auth-token'))
      .finally(() => setIsAuthLoading(false))
  }, [])

  useEffect(() => {
    if (!currentUser || !activeStudent.id) {
      setAssessments([])
      setWorkoutPlans([])
      setDietPlans([])
      return
    }

    setFolderLoading(true)
    Promise.all([
      apiRequest(`/api/students/${activeStudent.id}/assessments`),
      apiRequest(`/api/students/${activeStudent.id}/plans`),
      apiRequest('/api/body-goals'),
    ])
      .then(([assessmentData, planData, goalData]) => {
        setAssessments(assessmentData.assessments as Assessment[])
        setWorkoutPlans(planData.workouts as WorkoutPlan[])
        setDietPlans(planData.diets as DietPlan[])
        setBodyGoals(goalData.goals as BodyGoal[])
      })
      .catch((error) => console.error(error))
      .finally(() => setFolderLoading(false))
  }, [activeStudent.id, currentUser])

  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()

    if (!response.ok) {
      return data.message ?? 'E-mail ou senha invalidos.'
    }

    const user = data.user as AppUser
    localStorage.setItem('app-fit-auth-token', data.token)
    setCurrentUser(user)
    setArea(user.role)
    fetchAppData(data.token, user.role)
    return ''
  }

  async function register(user: RegisterUserInput) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, invitationToken }),
    })
    const data = await response.json()

    if (!response.ok) {
      return data.message ?? 'Nao foi possivel criar a conta.'
    }

    const newUser = data.user as AppUser
    localStorage.setItem('app-fit-auth-token', data.token)
    setCurrentUser(newUser)
    setArea(newUser.role)
    fetchAppData(data.token, newUser.role)
    return ''
  }

  async function addStudent() {
    if (!studentForm.name.trim()) return

    const errorMessage = await apiRequest('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentForm),
    })
      .then((data) => {
        const newStudent = data.student as Student
        setStudents((current) => [...current, newStudent])
        setSelectedStudent(newStudent.name)
        setStudentForm(blankStudent)
        return ''
      })
      .catch((error) => error.message)

    if (errorMessage) alert(errorMessage)
  }

  async function addExercise() {
    if (!exerciseForm.name.trim() || !exerciseForm.muscle.trim()) return

    const errorMessage = await apiRequest('/api/exercises', {
      method: 'POST',
      body: JSON.stringify(exerciseForm),
    })
      .then((data) => {
        setExerciseCatalog((current) => [...current, data.exercise as Exercise])
        setExerciseForm(blankExercise)
        return ''
      })
      .catch((error) => error.message)

    if (errorMessage) alert(errorMessage)
  }


  async function createStudentInvite() {
    return apiRequest('/api/invitations/student', { method: 'POST' })
      .then((data) => data.invitation as GeneratedInvite)
      .catch((error) => {
        alert(error.message)
        return null
      })
  }

  async function updateStudentStatus(studentId: number, status: 'active' | 'inactive') {
    return apiRequest(`/api/students/${studentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
      .then(() => {
        const token = localStorage.getItem('app-fit-auth-token')
        if (token && currentUser) fetchAppData(token, currentUser.role)
        return ''
      })
      .catch((error) => error.message)
  }

  async function confirmStudentDeactivation() {
    if (!studentToDeactivate?.id) return

    setIsDeactivating(true)
    setDeactivationError('')
    const error = await updateStudentStatus(studentToDeactivate.id, 'inactive')
    setIsDeactivating(false)

    if (error) {
      setDeactivationError(error)
      return
    }

    setStudentToDeactivate(null)
  }

  async function refreshStudentFolder(studentId: number) {
    const [assessmentData, planData] = await Promise.all([
      apiRequest(`/api/students/${studentId}/assessments`),
      apiRequest(`/api/students/${studentId}/plans`),
    ])
    setAssessments(assessmentData.assessments as Assessment[])
    setWorkoutPlans(planData.workouts as WorkoutPlan[])
    setDietPlans(planData.diets as DietPlan[])
  }

  async function saveAssessment() {
    if (!activeStudent.id) return 'Selecione um aluno vinculado.'
    if (!assessment.date) return 'Informe a data da avaliacao.'

    return apiRequest(`/api/students/${activeStudent.id}/assessments`, {
      method: 'POST',
      body: JSON.stringify(assessment),
    })
      .then(async () => {
        setAssessment(blankAssessment)
        await refreshStudentFolder(activeStudent.id!)
        return ''
      })
      .catch((error) => error.message)
  }

  async function saveWorkoutPlan(plan: WeeklyPlanInput) {
    if (!activeStudent.id) return 'Selecione um aluno vinculado.'

    return apiRequest(`/api/students/${activeStudent.id}/workout-plans`, {
      method: 'POST',
      body: JSON.stringify(plan),
    })
      .then(async () => {
        await refreshStudentFolder(activeStudent.id!)
        return ''
      })
      .catch((error) => error.message)
  }

  async function refreshWorkoutLibrary() {
    const data = await apiRequest('/api/workout-library')
    setWorkoutLibrary(data as WorkoutLibrary)
    return data as WorkoutLibrary
  }

  async function createLibraryExercise(exercise: Exercise) {
    return apiRequest('/api/workout-library/exercises', {
      method: 'POST',
      body: JSON.stringify(exercise),
    })
      .then(async (data) => {
        await refreshWorkoutLibrary()
        return { exercise: data.exercise as Exercise, error: '' }
      })
      .catch((error) => ({ exercise: null, error: error.message as string }))
  }

  async function createDailyTemplate(input: { name: string; description: string; exercises: Array<{ exerciseId: number; sets: string; reps: string; load: LoadLevel; rest: string; notes: string }> }) {
    return apiRequest('/api/workout-library/daily-templates', { method: 'POST', body: JSON.stringify(input) })
      .then(async (data) => {
        const library = await refreshWorkoutLibrary()
        return { template: library.dailyTemplates.find((item) => item.id === Number(data.id)) ?? null, error: '' }
      })
      .catch((error) => ({ template: null, error: error.message as string }))
  }

  async function createWeeklyTemplate(input: { name: string; description: string; days: Array<{ dayOfWeek: string; dailyTemplateId: number | null }> }) {
    return apiRequest('/api/workout-library/weekly-templates', { method: 'POST', body: JSON.stringify(input) })
      .then(async (data) => {
        const library = await refreshWorkoutLibrary()
        return { template: library.weeklyTemplates.find((item) => item.id === Number(data.id)) ?? null, error: '' }
      })
      .catch((error) => ({ template: null, error: error.message as string }))
  }

  async function completeWorkoutPlan(planId: number) {
    if (!activeStudent.id) return 'Aluno nao encontrado.'
    return apiRequest(`/api/workout-plans/${planId}/complete`, { method: 'PATCH' })
      .then(async () => {
        await refreshStudentFolder(activeStudent.id!)
        return ''
      })
      .catch((error) => error.message)
  }

  async function saveDietPlan(plan: Omit<DietPlan, 'id'>) {
    if (!activeStudent.id) return 'Selecione um aluno vinculado.'

    return apiRequest(`/api/students/${activeStudent.id}/diet-plans`, {
      method: 'POST',
      body: JSON.stringify(plan),
    })
      .then(async () => {
        await refreshStudentFolder(activeStudent.id!)
        return ''
      })
      .catch((error) => error.message)
  }

  async function linkStudentToTrainer(studentId: number, trainerId: number) {
    if (!currentUser || currentUser.role !== 'admin') return 'Somente admin pode vincular alunos e personais.'

    return apiRequest(`/api/students/${studentId}/trainers`, {
      method: 'POST',
      body: JSON.stringify({ trainerId, relationshipType: 'secondary' }),
    })
      .then(() => {
        const token = localStorage.getItem('app-fit-auth-token')
        if (token) fetchAppData(token, currentUser.role)
        return ''
      })
      .catch((error) => error.message)
  }

  async function openProfile() {
    setActiveView('profile')
    setProfileLoading(true)
    await apiRequest('/api/profile')
      .then((data) => setUserProfile(data.profile as UserProfile))
      .catch((error) => alert(error.message))
      .finally(() => setProfileLoading(false))
  }

  async function updateProfile(profile: UserProfile) {
    return apiRequest('/api/profile', { method: 'PATCH', body: JSON.stringify(profile) })
      .then((data) => {
        const saved = data.profile as UserProfile
        setUserProfile(saved)
        setCurrentUser((current) => current ? { ...current, name: saved.name, email: saved.email, profilePhoto: saved.profilePhoto } : current)
        return ''
      })
      .catch((error) => error.message as string)
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    return apiRequest('/api/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then(() => '')
      .catch((error) => error.message as string)
  }

  function openStudentFolder(studentName: string) {
    setSelectedStudent(studentName)
    window.setTimeout(() => document.getElementById('avaliacoes')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function logout() {
    localStorage.removeItem('app-fit-auth-token')
    setCurrentUser(null)
    setActiveView('dashboard')
  }

  if (isAuthLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel loading-panel">
          <div className="brand-mark">
            <span className="brand-number">JC</span>
            <span>
              <strong>Assessoria Fitness</strong>
              <small>Carregando sessao</small>
            </span>
          </div>
        </section>
      </main>
    )
  }

  if (!currentUser) {
    return (
      <AuthScreen
        invitation={studentInvitation}
        invitationToken={invitationToken}
        onLogin={login}
        onRegister={register}
      />
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand-mark">
          <span className="brand-number">JC</span>
          <span>
            <strong>Assessoria Fitness</strong>
            <small>Biomecanica & performance</small>
          </span>
        </div>

        <div className="role-switch" aria-label="Selecionar area do app">
          {(['personal', 'aluno', 'admin'] as Area[]).map((item) => (
            <button
              className={area === item ? 'active' : ''}
              key={item}
              onClick={() => setArea(item)}
              disabled={currentUser.role !== 'admin' && currentUser.role !== item}
              type="button"
            >
              {item === 'personal' ? <Dumbbell size={16} /> : null}
              {item === 'aluno' ? <HeartPulse size={16} /> : null}
              {item === 'admin' ? <LockKeyhole size={16} /> : null}
              {item}
            </button>
          ))}
        </div>

        <nav className="nav-list">
          <a className={activeView === 'dashboard' ? 'active' : ''} href="#dashboard" onClick={() => setActiveView('dashboard')}>
            <LineChart size={18} aria-hidden="true" />
            Dashboard
          </a>
          <a href="#alunos" onClick={() => setActiveView('dashboard')}>
            <Users size={18} aria-hidden="true" />
            Alunos
          </a>
          <a href="#treinos" onClick={() => setActiveView('dashboard')}>
            <Dumbbell size={18} aria-hidden="true" />
            Treinos
          </a>
          <a href="#dietas" onClick={() => setActiveView('dashboard')}>
            <Apple size={18} aria-hidden="true" />
            Dietas
          </a>
          <a href="#avaliacoes" onClick={() => setActiveView('dashboard')}>
            <Camera size={18} aria-hidden="true" />
            Avaliacoes
          </a>
          <a href="#admin" onClick={() => setActiveView('dashboard')}>
            <UserCog size={18} aria-hidden="true" />
            Admin
          </a>
          <button className={activeView === 'profile' ? 'active' : ''} onClick={openProfile} type="button">
            <UserCog size={18} aria-hidden="true" />
            Meu perfil
          </button>
        </nav>

        <div className="coach-card">
          {currentUser.profilePhoto ? <img className="coach-avatar" alt="Foto do perfil" src={currentUser.profilePhoto} /> : <ShieldCheck size={22} aria-hidden="true" />}
          <strong>{currentUser.name}</strong>
          <span>{currentUser.email}</span>
          <button className="logout-button" onClick={logout} type="button">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <section className="workspace" id="dashboard">
        {activeView === 'profile' ? (
          profileLoading || !userProfile ? <div className="profile-loading">Carregando perfil...</div> : (
            <ProfilePage
              onChangePassword={changePassword}
              onSave={updateProfile}
              profile={userProfile}
            />
          )
        ) : (
          <>
        <header className="topbar">
          <div>
            <p className="eyebrow">Area {area}</p>
            <h1>{area === 'aluno' ? 'Acompanhe seu plano e registre sua evolucao.' : 'Gerencie alunos, treinos, dietas e evolucao em um so painel.'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Abrir mensagens">
              <MessageCircle size={19} aria-hidden="true" />
            </button>
            <button className="primary-button" type="button">
              <FilePlus2 size={18} aria-hidden="true" />
              Novo registro
            </button>
          </div>
        </header>

        <section className="hero-panel" aria-label="Resumo da assessoria">
          <div className="hero-content">
            <div className="hero-badge">
              <Activity size={16} aria-hidden="true" />
              Consultoria on-line
            </div>
            <h2>Plano semanal, treino diario, dieta e avaliacao fisica integrados.</h2>
            <p>
              O personal cria modelos reaproveitaveis; o aluno executa o treino, marca os dias
              realizados, envia duvidas e registra fotos, medidas e objetivo corporal.
            </p>
            <div className="hero-actions">
              <a className="primary-button link-button" href="#alunos">
                Abrir aluno
                <ChevronRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-button link-button" href="#treinos">
                <Play size={18} aria-hidden="true" />
                Montar treino
              </a>
            </div>
          </div>
          <div className="hero-stat" aria-label="Indice de aderencia">
            <span>{averageAdherence}%</span>
            <small>Aderencia media da carteira ativa</small>
          </div>
        </section>

        {area === 'personal' ? (
          <>
            <section className="metrics-grid" aria-label="Indicadores principais">
              <Metric icon={Users} label="Alunos ativos" value={String(students.length)} detail="Carteira em acompanhamento" />
              <Metric icon={ClipboardList} label="Inativos" value={String(inactiveStudents.length)} detail="Podem ser reativados" />
              <Metric icon={CheckCircle2} label="Check-ins" value={`${averageAdherence}%`} detail="Media geral" />
            </section>

            <section className="content-grid">
              <Panel id="alunos" eyebrow="Personal" title="Lista de alunos">
                <div className="student-list">
                  {students.map((student) => (
                    <div
                      className={student.name === activeStudent.name ? 'student-row active' : 'student-row'}
                      key={student.name}
                      onClick={() => openStudentFolder(student.name)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') openStudentFolder(student.name)
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span>
                        <strong>{student.name}</strong>
                        <small>{student.trainers ? student.goal + ' - ' + student.trainers : student.goal}</small>
                      </span>
                      <span className="student-actions">
                        <b>{student.adherence}%</b>
                        {student.id ? (
                          <button
                            aria-label="Inativar aluno"
                            className="mini-icon-button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeactivationError('')
                              setStudentToDeactivate(student)
                            }}
                            type="button"
                          >
                            <Power size={15} />
                          </button>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <InvitePanel onCreateInvite={createStudentInvite} />

              <Panel eyebrow="Novo cadastro" title="Cadastrar aluno">
                <div className="form-grid">
                  <input aria-label="Nome do aluno" placeholder="Nome do aluno" value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} />
                  <input aria-label="Objetivo" placeholder="Objetivo" value={studentForm.goal} onChange={(event) => setStudentForm({ ...studentForm, goal: event.target.value })} />
                  <input aria-label="Data de inicio" type="date" value={studentForm.start} onChange={(event) => setStudentForm({ ...studentForm, start: event.target.value })} />
                  <input aria-label="Proxima avaliacao" type="date" value={studentForm.nextReview} onChange={(event) => setStudentForm({ ...studentForm, nextReview: event.target.value })} />
                  <textarea aria-label="Restricoes" placeholder="Restricoes" value={studentForm.restrictions} onChange={(event) => setStudentForm({ ...studentForm, restrictions: event.target.value })} />
                  <button className="primary-button" onClick={addStudent} type="button">
                    <Plus size={18} />
                    Salvar aluno
                  </button>
                </div>
              </Panel>

              <Panel eyebrow="Alunos inativos" title="Consultar e reativar">
                <div className="student-list">
                  {inactiveStudents.length ? inactiveStudents.map((student) => (
                    <div className="student-row readonly inactive" key={student.id ?? student.name}>
                      <span>
                        <strong>{student.name}</strong>
                        <small>{student.goal || student.inactiveReason || 'Aluno inativo para este personal'}</small>
                      </span>
                      <button
                        className="mini-action"
                        onClick={() => student.id ? updateStudentStatus(student.id, 'active') : null}
                        type="button"
                      >
                        <Power size={15} />
                        Ativar
                      </button>
                    </div>
                  )) : <p className="empty-state">Nenhum aluno inativo.</p>}
                </div>
              </Panel>
            </section>

            <section className="content-grid wide-first">
              <Panel id="treinos" eyebrow="Treino" title="Plano semanal e treino diario">
                <div className="week-grid">
                  {weeklyPlan.map((day) => (
                    <article className={day.done ? 'day-card done' : 'day-card'} key={day.day}>
                      <span>{day.day}</span>
                      <strong>{day.title}</strong>
                      <small>{day.status}</small>
                    </article>
                  ))}
                </div>
                <div className="exercise-table">
                  {exerciseCatalog.map((exercise) => (
                    <article className="exercise-row" key={exercise.name}>
                      <Dumbbell size={18} />
                      <span>
                        <strong>{exercise.name}</strong>
                        <small>{exercise.muscle} - {exercise.sets}x{exercise.reps} - {exercise.load}</small>
                      </span>
                      <span className="media-pills">
                        <Video size={16} />
                        <Volume2 size={16} />
                      </span>
                    </article>
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Biblioteca" title="Cadastrar exercicio">
                <ExerciseForm exerciseForm={exerciseForm} setExerciseForm={setExerciseForm} addExercise={addExercise} />
              </Panel>
            </section>

            <StudentFolder
              activeStudent={activeStudent}
              assessment={assessment}
              setAssessment={setAssessment}
              assessments={assessments}
              bodyGoals={bodyGoals}
              workoutPlans={workoutPlans}
              workoutLibrary={workoutLibrary}
              dietPlans={dietPlans}
              loading={folderLoading}
              canCreatePlans
              onSaveAssessment={saveAssessment}
              onSaveWorkoutPlan={saveWorkoutPlan}
              onSaveDietPlan={saveDietPlan}
              onCreateExercise={createLibraryExercise}
              onCreateDaily={createDailyTemplate}
              onCreateWeekly={createWeeklyTemplate}
            />
          </>
        ) : null}

        {area === 'aluno' ? (
          <StudentArea
            activeStudent={activeStudent}
            assessment={assessment}
            setAssessment={setAssessment}
            assessments={assessments}
            bodyGoals={bodyGoals}
            workoutPlans={workoutPlans}
            onCompleteWorkoutPlan={completeWorkoutPlan}
            dietPlans={dietPlans}
            loading={folderLoading}
            onSaveAssessment={saveAssessment}
            studentDoubt={studentDoubt}
            setStudentDoubt={setStudentDoubt}
          />
        ) : null}

        {area === 'admin' ? (
          <AdminArea
            students={students}
            exercises={exerciseCatalog}
            trainers={trainers}
            onLinkStudentTrainer={linkStudentToTrainer}
            workoutLibrary={workoutLibrary}
            onCreateExercise={createLibraryExercise}
            onCreateDaily={createDailyTemplate}
            onCreateWeekly={createWeeklyTemplate}
          />
        ) : null}
          </>
        )}
      </section>

      {studentToDeactivate ? (
        <DeactivateStudentDialog
          error={deactivationError}
          isSubmitting={isDeactivating}
          onCancel={() => setStudentToDeactivate(null)}
          onConfirm={confirmStudentDeactivation}
          student={studentToDeactivate}
        />
      ) : null}
    </main>
  )
}

function ProfilePage({
  profile,
  onSave,
  onChangePassword,
}: {
  profile: UserProfile
  onSave: (profile: UserProfile) => Promise<string>
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<string>
}) {
  const [draft, setDraft] = useState<UserProfile>(profile)
  const [photoChanged, setPhotoChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  function selectPhoto(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileMessage('Use uma foto JPG, PNG ou WebP.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setProfileMessage('A foto de perfil deve ter no maximo 3 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setDraft({ ...draft, profilePhoto: String(reader.result ?? '') })
      setPhotoChanged(true)
      setProfileMessage('')
    }
    reader.readAsDataURL(file)
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft?.name.trim() || !draft.email.trim()) {
      setProfileMessage('Preencha o nome e o e-mail.')
      return
    }

    setSaving(true)
    setProfileMessage('')
    const error = await onSave({
      ...draft,
      profilePhoto: photoChanged ? draft.profilePhoto ?? '' : undefined,
    })
    setSaving(false)
    setProfileMessage(error || 'Dados atualizados com sucesso.')
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 6) {
      setPasswordMessage('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('A confirmacao nao corresponde a nova senha.')
      return
    }

    setChangingPassword(true)
    setPasswordMessage('')
    const error = await onChangePassword(currentPassword, newPassword)
    setChangingPassword(false)
    setPasswordMessage(error || 'Senha alterada com sucesso.')
    if (!error) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const roleLabel = draft.role === 'personal' ? 'Personal' : draft.role === 'aluno' ? 'Aluno' : 'Administrador'
  const initials = draft.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return (
    <div className="profile-page">
      <header className="profile-heading">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h1>Meu perfil</h1>
          <p>Mantenha seus dados de acesso e identificacao atualizados.</p>
        </div>
        <span className="profile-role"><ShieldCheck size={17} />{roleLabel}</span>
      </header>

      <div className="profile-layout">
        <form className="profile-section" onSubmit={submitProfile}>
          <div className="profile-photo-area">
            <div className="profile-photo-preview">
              {draft.profilePhoto ? <img alt="Foto do usuario" src={draft.profilePhoto} /> : <span>{initials || 'AF'}</span>}
            </div>
            <div>
              <strong>Foto do perfil</strong>
              <small>JPG, PNG ou WebP com ate 3 MB.</small>
              <div className="profile-photo-actions">
                <label className="secondary-button profile-upload-button">
                  <Camera size={17} />
                  Escolher foto
                  <input accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(event.target.files?.[0])} type="file" />
                </label>
                {draft.profilePhoto ? (
                  <button className="icon-button" onClick={() => {
                    setDraft({ ...draft, profilePhoto: '' })
                    setPhotoChanged(true)
                  }} title="Remover foto" type="button">
                    <Trash2 size={18} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="profile-fields">
            <label className="field-label">Nome completo
              <input autoComplete="name" onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} />
            </label>
            <label className="field-label">E-mail
              <input autoComplete="email" onChange={(event) => setDraft({ ...draft, email: event.target.value })} required type="email" value={draft.email} />
            </label>
            <label className="field-label">Data de nascimento
              <input max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} type="date" value={draft.birthDate} />
            </label>
            {draft.role === 'personal' ? (
              <label className="field-label">Numero do CREF
                <input onChange={(event) => setDraft({ ...draft, crefNumber: event.target.value })} placeholder="Ex.: 012345-G/AM" value={draft.crefNumber} />
              </label>
            ) : null}
          </div>

          {profileMessage ? <p className={profileMessage.includes('sucesso') ? 'form-message success-message' : 'form-message neutral-message'}>{profileMessage}</p> : null}
          <button className="primary-button profile-submit" disabled={saving} type="submit">
            <Save size={18} />{saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </form>

        <form className="profile-section password-section" onSubmit={submitPassword}>
          <div className="section-title">
            <span><KeyRound size={20} /></span>
            <div><p className="eyebrow">Seguranca</p><h2>Alterar senha</h2></div>
          </div>
          <label className="field-label">Senha atual
            <input autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} />
          </label>
          <label className="field-label">Nova senha
            <input autoComplete="new-password" minLength={6} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} />
          </label>
          <label className="field-label">Confirmar nova senha
            <input autoComplete="new-password" minLength={6} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
          </label>
          {passwordMessage ? <p className={passwordMessage.includes('sucesso') ? 'form-message success-message' : 'form-message neutral-message'}>{passwordMessage}</p> : null}
          <button className="secondary-button profile-submit" disabled={changingPassword} type="submit">
            <KeyRound size={17} />{changingPassword ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DeactivateStudentDialog({
  student,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: {
  student: Student
  isSubmitting: boolean
  error: string
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) onCancel()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSubmitting, onCancel])

  return (
    <div className="modal-backdrop" onMouseDown={() => !isSubmitting && onCancel()}>
      <section
        aria-describedby="deactivate-description"
        aria-labelledby="deactivate-title"
        aria-modal="true"
        className="confirmation-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="alertdialog"
      >
        <button aria-label="Fechar" className="modal-close" disabled={isSubmitting} onClick={onCancel} type="button">
          <X size={19} />
        </button>
        <div className="modal-warning"><AlertTriangle size={26} /></div>
        <div>
          <p className="eyebrow">Confirmar desativacao</p>
          <h2 id="deactivate-title">Desativar {student.name}?</h2>
        </div>
        <p id="deactivate-description">
          Esta acao desativa o aluno para o seu acompanhamento. Ele sera movido para a lista de alunos inativos e podera ser ativado novamente quando necessario.
        </p>
        <strong>Tem certeza de que deseja desativar este aluno?</strong>
        {error ? <p className="modal-error">{error}</p> : null}
        <div className="modal-actions">
          <button autoFocus className="secondary-button" disabled={isSubmitting} onClick={onCancel} type="button">Cancelar</button>
          <button className="danger-button" disabled={isSubmitting} onClick={onConfirm} type="button">
            <Power size={17} />
            {isSubmitting ? 'Desativando...' : 'Desativar aluno'}
          </button>
        </div>
      </section>
    </div>
  )
}

function AuthScreen({
  invitation,
  invitationToken,
  onLogin,
  onRegister,
}: {
  invitation: StudentInvitation | null
  invitationToken: string
  onLogin: (email: string, password: string) => Promise<string>
  onRegister: (user: RegisterUserInput) => Promise<string>
}) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [loginEmail, setLoginEmail] = useState('personal@appfit.local')
  const [loginPassword, setLoginPassword] = useState('123456')
  const [registerForm, setRegisterForm] = useState<RegisterUserInput>({
    name: '',
    email: '',
    password: '',
    role: 'aluno',
  })
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!invitationToken) return

    setMode('register')
    setRegisterForm((current) => ({
      ...current,
      email: invitation?.email || current.email,
      role: 'aluno',
    }))
  }, [invitation, invitationToken])

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const errorMessage = await onLogin(loginEmail, loginPassword)
    setMessage(errorMessage)
    setIsSubmitting(false)
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!registerForm.name.trim() || !registerForm.email.trim() || registerForm.password.length < 6) {
      setMessage('Preencha nome, e-mail e senha com pelo menos 6 caracteres.')
      return
    }

    setIsSubmitting(true)
    const errorMessage = await onRegister(registerForm)
    setMessage(errorMessage)
    setIsSubmitting(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="brand-mark">
          <span className="brand-number">JC</span>
          <span>
            <strong>Assessoria Fitness</strong>
            <small>Biomecanica & performance</small>
          </span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Acesso local</p>
          <h1>{invitation ? `Cadastro vinculado a ${invitation.trainerName}.` : 'Entre no painel ou cadastre um novo usuario.'}</h1>
          <p>
            A tela ja separa perfis de admin, personal e aluno. Login e cadastro agora usam a
            API local com SQLite.
          </p>
        </div>
        <div className="demo-users" aria-label="Usuarios de demonstracao">
          <strong>Usuarios de teste</strong>
          <span>personal@appfit.local / 123456</span>
          <span>admin@appfit.local / 123456</span>
          <span>aluno@appfit.local / 123456</span>
        </div>
      </section>

      <section className="auth-panel" aria-label="Login e cadastro">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            <LogIn size={17} />
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            <UserPlus size={17} />
            Cadastro
          </button>
        </div>

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              <span>E-mail</span>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  autoComplete="email"
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="seu@email.com"
                  type="email"
                  value={loginEmail}
                />
              </div>
            </label>
            <label>
              <span>Senha</span>
              <div className="input-with-icon">
                <KeyRound size={18} />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Senha"
                  type="password"
                  value={loginPassword}
                />
              </div>
            </label>
            {message ? <p className="form-message">{message}</p> : null}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              <LogIn size={18} />
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitRegister}>
            <label>
              <span>Nome</span>
              <input
                autoComplete="name"
                onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                placeholder="Nome completo"
                value={registerForm.name}
              />
            </label>
            <label>
              <span>E-mail</span>
              <input
                autoComplete="email"
                onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                placeholder="seu@email.com"
                type="email"
                value={registerForm.email}
              />
            </label>
            <label>
              <span>Senha</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                placeholder="Minimo 6 caracteres"
                type="password"
                value={registerForm.password}
              />
            </label>
            <label>
              <span>Tipo de usuario</span>
              <select
                disabled={Boolean(invitationToken)}
                onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value as Area })}
                value={registerForm.role}
              >
                <option value="aluno">Aluno</option>
                <option value="personal">Personal</option>
                <option value="admin">Admin</option>
              </select>
              {invitation ? <small className="invite-hint">Convite {invitation.code} de {invitation.trainerName}</small> : null}
            </label>
            {message ? <p className="form-message">{message}</p> : null}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              <UserPlus size={18} />
              {isSubmitting ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

function InvitePanel({ onCreateInvite }: { onCreateInvite: () => Promise<GeneratedInvite | null> }) {
  const [invite, setInvite] = useState<GeneratedInvite | null>(null)
  const [message, setMessage] = useState('')

  async function createInvite() {
    const generatedInvite = await onCreateInvite()
    if (!generatedInvite) return

    setInvite(generatedInvite)
    setMessage('Link pronto para enviar no WhatsApp.')
  }

  async function copyInvite() {
    if (!invite) return

    const text = `Ola! Cadastre-se no APP-FIT pelo meu link: ${invite.url}`
    await navigator.clipboard.writeText(text)
    setMessage('Mensagem copiada.')
  }

  const whatsappUrl = invite
    ? `https://wa.me/?text=${encodeURIComponent(`Ola! Cadastre-se no APP-FIT pelo meu link: ${invite.url}`)}`
    : ''

  return (
    <Panel eyebrow="Convite" title="Enviar link para aluno">
      <div className="form-grid compact">
        {invite ? (
          <div className="invite-box">
            <span>Codigo {invite.code}</span>
            <strong>{invite.url}</strong>
          </div>
        ) : null}
        {message ? <p className="form-message neutral-message">{message}</p> : null}
        <button className="primary-button" onClick={createInvite} type="button">
          <Link2 size={18} />
          Gerar link
        </button>
        <button className="secondary-button" disabled={!invite} onClick={copyInvite} type="button">
          <Copy size={18} />
          Copiar mensagem
        </button>
        {invite ? (
          <a className="secondary-button link-button" href={whatsappUrl} rel="noreferrer" target="_blank">
            <MessageCircle size={18} />
            Enviar no WhatsApp
          </a>
        ) : null}
      </div>
    </Panel>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="metric-card">
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function Panel({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <article className="panel" id={id}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </article>
  )
}

function ExerciseForm({
  exerciseForm,
  setExerciseForm,
  addExercise,
}: {
  exerciseForm: Exercise
  setExerciseForm: (exercise: Exercise) => void
  addExercise: () => void
}) {
  const [mediaMode, setMediaMode] = useState<'upload' | 'youtube'>('upload')
  const [mediaMessage, setMediaMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingStartedAt = useRef(0)
  const recordingTimer = useRef<number | undefined>(undefined)

  function readFile(file: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo.'))
      reader.readAsDataURL(file)
    })
  }

  function readDuration(file: File, kind: 'video' | 'audio') {
    return new Promise<number>((resolve, reject) => {
      const element = document.createElement(kind)
      const objectUrl = URL.createObjectURL(file)
      element.preload = 'metadata'
      element.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(Number.isFinite(element.duration) ? element.duration : 0)
      }
      element.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Nao foi possivel verificar a duracao do arquivo.'))
      }
      element.src = objectUrl
    })
  }

  async function selectVideo(file?: File) {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return setMediaMessage('O video ou GIF deve ter no maximo 8 MB.')
    try {
      const duration = file.type === 'image/gif' ? 0 : await readDuration(file, 'video')
      if (duration > 5.2) return setMediaMessage('O video deve ter no maximo 5 segundos.')
      setExerciseForm({ ...exerciseForm, media: await readFile(file), mediaDuration: duration })
      setMediaMessage(`${file.name} selecionado.`)
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : 'Arquivo de video invalido.')
    }
  }

  async function selectAudio(file?: File) {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return setMediaMessage('O audio deve ter no maximo 3 MB.')
    try {
      const duration = await readDuration(file, 'audio')
      if (duration > 60.2) return setMediaMessage('O audio deve ter no maximo 60 segundos.')
      setExerciseForm({ ...exerciseForm, audio: await readFile(file), audioDuration: duration })
      setMediaMessage(`${file.name} selecionado.`)
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : 'Arquivo de audio invalido.')
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMediaMessage('Gravacao de audio nao suportada neste navegador.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = async () => {
        window.clearTimeout(recordingTimer.current)
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunks, { type: (recorder.mimeType || 'audio/webm').split(';')[0] })
        const duration = Math.min(60, (Date.now() - recordingStartedAt.current) / 1000)
        if (blob.size > 3 * 1024 * 1024) {
          setMediaMessage('A gravacao ultrapassou o limite de 3 MB.')
        } else {
          setExerciseForm({ ...exerciseForm, audio: await readFile(blob), audioDuration: duration })
          setMediaMessage('Narracao gravada com sucesso.')
        }
        setIsRecording(false)
      }
      recorderRef.current = recorder
      recordingStartedAt.current = Date.now()
      recorder.start()
      setIsRecording(true)
      setMediaMessage('Gravando narracao...')
      recordingTimer.current = window.setTimeout(() => recorder.state === 'recording' && recorder.stop(), 60000)
    } catch {
      setMediaMessage('Permita o acesso ao microfone para iniciar a gravacao.')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  return (
    <div className="form-grid compact">
      <input aria-label="Nome do exercicio" placeholder="Nome do exercicio" value={exerciseForm.name} onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })} />
      <input aria-label="Musculo" placeholder="Musculo" value={exerciseForm.muscle} onChange={(event) => setExerciseForm({ ...exerciseForm, muscle: event.target.value })} />
      <div className="exercise-media-field">
        <span className="field-title">Demonstracao visual</span>
        <div className="segmented-control media-mode">
          <button className={mediaMode === 'upload' ? 'active' : ''} onClick={() => setMediaMode('upload')} type="button"><Upload size={16} /> Video ou GIF</button>
          <button className={mediaMode === 'youtube' ? 'active' : ''} onClick={() => { setMediaMode('youtube'); setExerciseForm({ ...exerciseForm, media: '', mediaDuration: 0 }) }} type="button"><Video size={16} /> YouTube</button>
        </div>
        {mediaMode === 'upload' ? (
          <label className="media-upload"><Upload size={19} /><span>Selecionar video ou GIF</span><small>Video ate 5 segundos; arquivo ate 8 MB</small><input accept="video/mp4,video/webm,video/quicktime,image/gif" onChange={(event) => selectVideo(event.target.files?.[0])} type="file" /></label>
        ) : <input aria-label="Link do YouTube" placeholder="https://youtube.com/watch?v=..." value={exerciseForm.media} onChange={(event) => setExerciseForm({ ...exerciseForm, media: event.target.value, mediaDuration: 0 })} />}
        {exerciseForm.media.startsWith('data:image/gif') ? <img className="exercise-media-preview" alt="Previa do GIF" src={exerciseForm.media} /> : null}
        {exerciseForm.media.startsWith('data:video') ? <video className="exercise-media-preview" controls src={exerciseForm.media} /> : null}
      </div>
      <div className="exercise-media-field">
        <span className="field-title">Orientacao em audio</span>
        <div className="audio-actions">
          <label className="media-upload compact-upload"><Upload size={18} /><span>Adicionar arquivo</span><small>Ate 60 segundos e 3 MB</small><input accept="audio/mpeg,audio/wav,audio/webm,audio/ogg,audio/mp4" onChange={(event) => selectAudio(event.target.files?.[0])} type="file" /></label>
          <button className={isRecording ? 'record-button recording' : 'record-button'} onClick={isRecording ? stopRecording : startRecording} type="button">{isRecording ? <Square size={17} /> : <Mic size={18} />}{isRecording ? 'Parar gravacao' : 'Narrar audio'}</button>
        </div>
        {exerciseForm.audio.startsWith('data:audio') ? <audio className="audio-preview" controls src={exerciseForm.audio} /> : null}
      </div>
      {mediaMessage ? <p className="form-message neutral-message">{mediaMessage}</p> : null}
      <div className="two-fields">
        <input aria-label="Series" placeholder="Series" value={exerciseForm.sets} onChange={(event) => setExerciseForm({ ...exerciseForm, sets: event.target.value })} />
        <input aria-label="Repeticoes" placeholder="Repeticoes" value={exerciseForm.reps} onChange={(event) => setExerciseForm({ ...exerciseForm, reps: event.target.value })} />
      </div>
      <select aria-label="Carga" value={exerciseForm.load} onChange={(event) => setExerciseForm({ ...exerciseForm, load: event.target.value as LoadLevel })}>
        <option value="leve">Leve</option>
        <option value="moderado">Moderado</option>
        <option value="pesado">Pesado</option>
        <option value="muito pesado">Muito pesado</option>
      </select>
      <input aria-label="Descanso" placeholder="Texto para descanso" value={exerciseForm.rest} onChange={(event) => setExerciseForm({ ...exerciseForm, rest: event.target.value })} />
      <textarea aria-label="Observacao" placeholder="Observacao do exercicio" value={exerciseForm.notes} onChange={(event) => setExerciseForm({ ...exerciseForm, notes: event.target.value })} />
      <button className="primary-button" onClick={addExercise} type="button">
        <Plus size={18} />
        Salvar exercicio
      </button>
    </div>
  )
}

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    const videoId = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop()
    return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  } catch {
    return ''
  }
}

function ExerciseMedia({ exercise }: { exercise: Exercise }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const youtubeUrl = youtubeEmbedUrl(exercise.media)

  useEffect(() => {
    const objectUrls: string[] = []
    let cancelled = false
    const token = localStorage.getItem('app-fit-auth-token')

    async function load(path: string, setter: (value: string) => void) {
      if (!path.startsWith('/api/exercise-media/')) return
      const response = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!response.ok || cancelled) return
      const objectUrl = URL.createObjectURL(await response.blob())
      objectUrls.push(objectUrl)
      if (!cancelled) setter(objectUrl)
    }

    load(exercise.media, setVideoUrl).catch(console.error)
    load(exercise.audio, setAudioUrl).catch(console.error)
    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [exercise.audio, exercise.media])

  if (!youtubeUrl && !videoUrl && !audioUrl) return null

  return (
    <div className="exercise-playback">
      {youtubeUrl ? <iframe allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen src={youtubeUrl} title={`Demonstracao de ${exercise.name}`} /> : null}
      {videoUrl ? exercise.media.toLowerCase().endsWith('.gif') ? <img alt={`Demonstracao de ${exercise.name}`} src={videoUrl} /> : <video controls playsInline src={videoUrl} /> : null}
      {audioUrl ? <audio controls src={audioUrl} /> : null}
    </div>
  )
}

function AssessmentForm({
  assessment,
  setAssessment,
  bodyGoals,
  onSave,
}: {
  assessment: Assessment
  setAssessment: (assessment: Assessment) => void
  bodyGoals: BodyGoal[]
  onSave: () => Promise<string>
}) {
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const fields: Array<[keyof Assessment, string]> = [
    ['weight', 'Peso (kg)'], ['height', 'Altura (cm)'], ['chest', 'Torax / busto (cm)'],
    ['waist', 'Cintura (cm)'], ['abdomen', 'Abdomen (cm)'], ['hip', 'Quadril (cm)'],
    ['rightArm', 'Braco direito (cm)'], ['leftArm', 'Braco esquerdo (cm)'],
    ['rightThigh', 'Coxa direita (cm)'], ['leftThigh', 'Coxa esquerda (cm)'],
    ['rightCalf', 'Panturrilha direita (cm)'], ['leftCalf', 'Panturrilha esquerda (cm)'],
  ]

  async function selectPhoto(angle: AssessmentPhoto['angle'], file?: File) {
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      setMessage('A foto deve ter no maximo 6 MB.')
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Nao foi possivel ler a foto.'))
      reader.readAsDataURL(file)
    })
    setAssessment({
      ...assessment,
      photos: [...assessment.photos.filter((photo) => photo.angle !== angle), { angle, dataUrl }],
    })
    setMessage('')
  }

  async function submitAssessment() {
    setSaving(true)
    const error = await onSave()
    setMessage(error || 'Avaliacao salva com sucesso.')
    setSaving(false)
  }

  return (
    <div className="assessment-form form-grid compact">
      <label className="field-label">Data da avaliacao
        <input aria-label="Data da avaliacao" type="date" value={assessment.date} onChange={(event) => setAssessment({ ...assessment, date: event.target.value })} />
      </label>
      <div className="measurement-grid">
        {fields.map(([field, label]) => (
          <label className="field-label" key={field}>{label}
            <input aria-label={label} inputMode="decimal" min="0" placeholder="0,0" step="0.1" type="number" value={String(assessment[field] ?? '')} onChange={(event) => setAssessment({ ...assessment, [field]: event.target.value })} />
          </label>
        ))}
      </div>

      <span className="field-title">Fotos atuais do aluno</span>
      <div className="photo-slots" aria-label="Fotos da avaliacao">
        {([['front', 'Frente'], ['side', 'Perfil'], ['back', 'Costas']] as Array<[AssessmentPhoto['angle'], string]>).map(([angle, label]) => {
          const photo = assessment.photos.find((item) => item.angle === angle)
          return (
            <label className={photo ? 'photo-upload has-photo' : 'photo-upload'} key={angle}>
              {photo ? <img alt={`Foto de ${label.toLowerCase()}`} src={photo.dataUrl} /> : <Camera size={22} />}
              <span>{photo ? `Trocar ${label.toLowerCase()}` : label}</span>
              <input accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(angle, event.target.files?.[0])} type="file" />
            </label>
          )
        })}
      </div>

      <span className="field-title">Objetivo corporal</span>
      <div className="body-goal-grid">
        {bodyGoals.map((goal) => (
          <label className={assessment.targetBody === goal.name ? 'body-goal selected' : 'body-goal'} key={goal.name}>
            <input checked={assessment.targetBody === goal.name} name="bodyGoal" onChange={() => setAssessment({ ...assessment, targetBody: goal.name })} type="radio" />
            <img alt={goal.name} src={goal.url} />
            <span>{goal.name}</span>
          </label>
        ))}
      </div>

      <label className="field-label">Observacoes
        <textarea aria-label="Observacoes da avaliacao" placeholder="Postura, mobilidade, dores e observacoes visuais" value={assessment.notes} onChange={(event) => setAssessment({ ...assessment, notes: event.target.value })} />
      </label>
      {message ? <p className={message.includes('sucesso') ? 'form-message success-message' : 'form-message neutral-message'}>{message}</p> : null}
      <button className="primary-button" disabled={saving} onClick={submitAssessment} type="button"><Save size={18} />{saving ? 'Salvando...' : 'Salvar avaliacao'}</button>
    </div>
  )
}

function AssessmentHistory({ assessments }: { assessments: Assessment[] }) {
  if (!assessments.length) return <p className="empty-state">Nenhuma avaliacao registrada para este aluno.</p>

  return (
    <div className="assessment-history">
      {assessments.map((item) => (
        <article className="assessment-record" key={item.id ?? item.date}>
          <div className="record-heading">
            <span><CalendarDays size={17} /> {new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
            <strong>{item.weight ? `${item.weight} kg` : 'Peso nao informado'}</strong>
          </div>
          <div className="record-measures">
            <span>Altura <b>{item.height || '-'} cm</b></span>
            <span>Torax / busto <b>{item.chest || '-'} cm</b></span>
            <span>Cintura <b>{item.waist || '-'} cm</b></span>
            <span>Abdomen <b>{item.abdomen || '-'} cm</b></span>
            <span>Quadril <b>{item.hip || '-'} cm</b></span>
            <span>Braco direito <b>{item.rightArm || '-'} cm</b></span>
            <span>Braco esquerdo <b>{item.leftArm || '-'} cm</b></span>
            <span>Coxa direita <b>{item.rightThigh || '-'} cm</b></span>
            <span>Coxa esquerda <b>{item.leftThigh || '-'} cm</b></span>
            <span>Panturrilha direita <b>{item.rightCalf || '-'} cm</b></span>
            <span>Panturrilha esquerda <b>{item.leftCalf || '-'} cm</b></span>
            <span>Objetivo <b>{item.targetBody || '-'}</b></span>
          </div>
          {item.photos?.length ? (
            <div className="record-photos">
              {item.photos.filter((photo) => photo.dataUrl).map((photo) => (
                <img alt={`Registro ${photo.angle}`} key={photo.id ?? photo.angle} src={photo.dataUrl} />
              ))}
            </div>
          ) : null}
          {item.notes ? <p>{item.notes}</p> : null}
        </article>
      ))}
    </div>
  )
}

function EvolutionChart({ assessments }: { assessments: Assessment[] }) {
  const points = assessments.slice(0, 6).reverse()
  const maximum = Math.max(...points.map((item) => Number(item.weight) || 0), 1)

  if (!points.length) return <p className="empty-state">O grafico aparecera apos a primeira avaliacao.</p>

  return (
    <div className="evolution-chart" aria-label="Grafico de evolucao do peso">
      {points.map((item, index) => (
        <div className="chart-column" key={item.id ?? `${item.date}-${index}`}>
          <span>{item.weight || '-'}</span>
          <div style={{ height: `${Math.max(8, ((Number(item.weight) || 0) / maximum) * 100)}%` }} />
          <small>{item.date.slice(5).split('-').reverse().join('/')}</small>
        </div>
      ))}
    </div>
  )
}

function WeeklyPlanBuilder({
  library,
  canApply,
  onApply,
  onCreateExercise,
  onCreateDaily,
  onCreateWeekly,
}: {
  library: WorkoutLibrary
  canApply: boolean
  onApply: (plan: WeeklyPlanInput) => Promise<string>
  onCreateExercise: (exercise: Exercise) => Promise<{ exercise: Exercise | null; error: string }>
  onCreateDaily: (input: { name: string; description: string; exercises: Array<{ exerciseId: number; sets: string; reps: string; load: LoadLevel; rest: string; notes: string }> }) => Promise<{ template: DailyTemplate | null; error: string }>
  onCreateWeekly: (input: { name: string; description: string; days: Array<{ dayOfWeek: string; dailyTemplateId: number | null }> }) => Promise<{ template: WeeklyTemplate | null; error: string }>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [creating, setCreating] = useState(false)
  const [selectedDay, setSelectedDay] = useState('monday')
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [weekStartDate, setWeekStartDate] = useState(today)
  const [dayTemplates, setDayTemplates] = useState<Record<string, number | null>>({})
  const [creatingDaily, setCreatingDaily] = useState(false)
  const [dailyName, setDailyName] = useState('')
  const [dailyDescription, setDailyDescription] = useState('')
  const [dailyExercises, setDailyExercises] = useState<Exercise[]>([])
  const [newExercise, setNewExercise] = useState(blankExercise)
  const [showExerciseForm, setShowExerciseForm] = useState(false)
  const [message, setMessage] = useState('')

  const platformPlans = library.weeklyTemplates.filter((item) => item.visibility === 'platform')
  const privatePlans = library.weeklyTemplates.filter((item) => item.visibility === 'private')
  const platformDaily = library.dailyTemplates.filter((item) => item.visibility === 'platform')
  const privateDaily = library.dailyTemplates.filter((item) => item.visibility === 'private')
  const platformExercises = library.exercises.filter((item) => item.visibility === 'platform')
  const privateExercises = library.exercises.filter((item) => item.visibility === 'private')

  async function applyTemplate(template: WeeklyTemplate) {
    const error = await onApply({ templateId: template.id, name: template.name, weekStartDate, notes: template.description })
    setMessage(error || 'Plano aplicado ao aluno com sucesso.')
  }

  function addExercise(exercise: Exercise) {
    setDailyExercises((current) => current.some((item) => item.id === exercise.id) ? current : [...current, exercise])
  }

  async function saveNewExercise() {
    const result = await onCreateExercise(newExercise)
    setMessage(result.error || 'Exercicio criado e adicionado ao treino.')
    if (result.exercise) {
      addExercise(result.exercise)
      setNewExercise(blankExercise)
      setShowExerciseForm(false)
    }
  }

  async function saveDailyTemplate() {
    if (!dailyName.trim()) return setMessage('Informe o nome do treino diario.')
    const result = await onCreateDaily({
      name: dailyName,
      description: dailyDescription,
      exercises: dailyExercises.filter((item) => item.id).map((item) => ({
        exerciseId: item.id!, sets: item.sets, reps: item.reps, load: item.load, rest: item.rest, notes: item.notes,
      })),
    })
    setMessage(result.error || 'Treino diario salvo e selecionado.')
    if (result.template) {
      setDayTemplates((current) => ({ ...current, [selectedDay]: result.template!.id }))
      setDailyName('')
      setDailyDescription('')
      setDailyExercises([])
      setCreatingDaily(false)
    }
  }

  async function saveWeeklyPlan() {
    if (!planName.trim()) return setMessage('Informe o nome do plano semanal.')
    const result = await onCreateWeekly({
      name: planName,
      description: planDescription,
      days: weekDayOptions.map((day) => ({ dayOfWeek: day.key, dailyTemplateId: dayTemplates[day.key] ?? null })),
    })
    if (result.error || !result.template) return setMessage(result.error || 'Nao foi possivel criar o plano.')
    if (canApply) {
      const error = await onApply({ templateId: result.template.id, name: result.template.name, weekStartDate, notes: result.template.description })
      setMessage(error || 'Plano criado e aplicado ao aluno.')
    } else {
      setMessage('Modelo semanal criado para todos os personais.')
    }
    setCreating(false)
  }

  function templateList(title: string, templates: WeeklyTemplate[]) {
    return (
      <div className="library-column">
        <h4>{title}</h4>
        {templates.length ? templates.map((template) => (
          <article className="library-item" key={template.id}>
            <span><strong>{template.name}</strong><small>{template.days.filter((day) => day.dailyTemplateId).length} treinos + {template.days.filter((day) => !day.dailyTemplateId).length} descansos</small></span>
            {canApply ? <button className="mini-action" onClick={() => applyTemplate(template)} type="button">Aplicar</button> : null}
          </article>
        )) : <p className="empty-state">Nenhum modelo cadastrado.</p>}
      </div>
    )
  }

  function dailyList(title: string, templates: DailyTemplate[]) {
    return (
      <div className="library-column">
        <h4>{title}</h4>
        {templates.length ? templates.map((template) => (
          <button className={dayTemplates[selectedDay] === template.id ? 'library-choice selected' : 'library-choice'} key={template.id} onClick={() => setDayTemplates((current) => ({ ...current, [selectedDay]: template.id }))} type="button">
            <strong>{template.name}</strong><small>{template.exercises.length} exercicios</small>
          </button>
        )) : <p className="empty-state">Nenhum treino cadastrado.</p>}
      </div>
    )
  }

  function exerciseList(title: string, exercises: Exercise[]) {
    return (
      <div className="library-column">
        <h4>{title}</h4>
        {exercises.length ? exercises.map((exercise) => (
          <button className="library-choice" key={exercise.id} onClick={() => addExercise(exercise)} type="button">
            <strong>{exercise.name}</strong><small>{exercise.muscle}</small><Plus size={15} />
          </button>
        )) : <p className="empty-state">Nenhum exercicio cadastrado.</p>}
      </div>
    )
  }

  return (
    <div className="weekly-builder">
      {!creating ? (
        <>
          <div className="builder-toolbar">
            <label className="field-label">Inicio do plano<input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} /></label>
            <button className="primary-button" onClick={() => setCreating(true)} type="button"><Plus size={18} /> Criar novo plano</button>
          </div>
          <div className="library-split">{templateList('Planos da plataforma', platformPlans)}{templateList('Meus planos personalizados', privatePlans)}</div>
        </>
      ) : (
        <>
          <div className="builder-toolbar">
            <input aria-label="Nome do plano semanal" placeholder="Nome do plano semanal" value={planName} onChange={(event) => setPlanName(event.target.value)} />
            <input aria-label="Inicio do plano" type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} />
            <button className="secondary-button" onClick={() => setCreating(false)} type="button">Cancelar</button>
          </div>
          <textarea aria-label="Descricao do plano" className="standalone-note" placeholder="Objetivo e orientacoes gerais do plano" value={planDescription} onChange={(event) => setPlanDescription(event.target.value)} />
          <div className="day-tabs">
            {weekDayOptions.map((day) => (
              <button className={selectedDay === day.key ? 'active' : ''} key={day.key} onClick={() => { setSelectedDay(day.key); setCreatingDaily(false) }} type="button">
                {day.label}<small>{dayTemplates[day.key] ? 'Treino selecionado' : 'Descanso'}</small>
              </button>
            ))}
          </div>
          {!creatingDaily ? (
            <>
              <div className="day-builder-heading"><strong>{weekDayOptions.find((day) => day.key === selectedDay)?.label}</strong><button className="mini-action" onClick={() => setDayTemplates((current) => ({ ...current, [selectedDay]: null }))} type="button">Definir descanso</button></div>
              <div className="library-split">{dailyList('Treinos da plataforma', platformDaily)}{dailyList('Meus treinos diarios', privateDaily)}</div>
              <button className="secondary-button" onClick={() => setCreatingDaily(true)} type="button"><Plus size={18} /> Criar novo treino diario</button>
            </>
          ) : (
            <div className="daily-composer">
              <div className="builder-toolbar"><input aria-label="Nome do treino diario" placeholder="Nome do treino diario" value={dailyName} onChange={(event) => setDailyName(event.target.value)} /><button className="secondary-button" onClick={() => setCreatingDaily(false)} type="button">Voltar</button></div>
              <textarea aria-label="Orientacoes do treino" className="standalone-note" placeholder="Orientacoes do treino" value={dailyDescription} onChange={(event) => setDailyDescription(event.target.value)} />
              <div className="library-split">{exerciseList('Exercicios da plataforma', platformExercises)}{exerciseList('Meus exercicios', privateExercises)}</div>
              <button className="secondary-button" onClick={() => setShowExerciseForm((current) => !current)} type="button"><Plus size={18} /> Criar novo exercicio</button>
              {showExerciseForm ? <ExerciseForm exerciseForm={newExercise} setExerciseForm={setNewExercise} addExercise={saveNewExercise} /> : null}
              <div className="selected-exercises"><h4>Exercicios do treino ({dailyExercises.length})</h4>{dailyExercises.map((exercise, index) => <article className="exercise-row" key={`${exercise.id}-${index}`}><Dumbbell size={17} /><span><strong>{exercise.name}</strong><small>{exercise.sets}x{exercise.reps} - {exercise.rest || 'sem descanso informado'}</small></span><button className="mini-icon-button" aria-label={`Remover ${exercise.name}`} onClick={() => setDailyExercises((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 size={15} /></button></article>)}</div>
              <button className="primary-button" onClick={saveDailyTemplate} type="button"><Save size={18} /> Salvar treino diario</button>
            </div>
          )}
          <button className="primary-button save-weekly-button" onClick={saveWeeklyPlan} type="button"><Save size={18} /> {canApply ? 'Salvar e aplicar plano' : 'Salvar modelo da plataforma'}</button>
        </>
      )}
      {message ? <p className="form-message neutral-message">{message}</p> : null}
    </div>
  )
}

function DietPlanCreator({ onSaveDiet }: {
  onSaveDiet: (plan: Omit<DietPlan, 'id'>) => Promise<string>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [diet, setDiet] = useState({ name: '', planDate: today, notes: '' })
  const [message, setMessage] = useState('')

  async function submitDiet() {
    if (!diet.name.trim()) return setMessage('Informe o nome do plano de dieta.')
    const error = await onSaveDiet(diet)
    setMessage(error || 'Plano de dieta aplicado.')
    if (!error) setDiet({ name: '', planDate: today, notes: '' })
  }

  return (
    <div className="form-grid compact diet-creator">
      <h3>Plano de dieta</h3>
      <input aria-label="Nome do plano de dieta" placeholder="Nome do plano" value={diet.name} onChange={(event) => setDiet({ ...diet, name: event.target.value })} />
      <input aria-label="Data do plano" type="date" value={diet.planDate} onChange={(event) => setDiet({ ...diet, planDate: event.target.value })} />
      <textarea aria-label="Orientacoes da dieta" placeholder="Refeicoes, quantidades e orientacoes" value={diet.notes} onChange={(event) => setDiet({ ...diet, notes: event.target.value })} />
      <button className="primary-button" onClick={submitDiet} type="button"><Apple size={18} /> Aplicar dieta</button>
      {message ? <p className="form-message neutral-message">{message}</p> : null}
    </div>
  )
}

function PlansHistory({ workoutPlans, dietPlans }: { workoutPlans: WorkoutPlan[]; dietPlans: DietPlan[] }) {
  return (
    <div className="plans-history-grid">
      <div>
        <h3>Treinamentos aplicados</h3>
        <div className="plan-list">
          {workoutPlans.length ? workoutPlans.map((plan) => (
            <article className="plan-record" key={plan.id}>
              <Dumbbell size={18} />
              <span><strong>{plan.name}</strong><small>Semana de {new Date(`${plan.weekStartDate}T12:00:00`).toLocaleDateString('pt-BR')}</small></span>
              <p>{plan.notes || 'Sem observacoes.'}</p>
            </article>
          )) : <p className="empty-state">Nenhum treinamento aplicado.</p>}
        </div>
      </div>
      <div>
        <h3>Dietas aplicadas</h3>
        <div className="plan-list">
          {dietPlans.length ? dietPlans.map((plan) => (
            <article className="plan-record" key={plan.id}>
              <Apple size={18} />
              <span><strong>{plan.name}</strong><small>{new Date(`${plan.planDate}T12:00:00`).toLocaleDateString('pt-BR')}</small></span>
              <p>{plan.notes || 'Sem observacoes.'}</p>
            </article>
          )) : <p className="empty-state">Nenhuma dieta aplicada.</p>}
        </div>
      </div>
    </div>
  )
}

function StudentFolder({
  activeStudent,
  assessment,
  setAssessment,
  assessments,
  bodyGoals,
  workoutPlans,
  workoutLibrary = blankWorkoutLibrary,
  dietPlans,
  loading,
  canCreatePlans,
  onSaveAssessment,
  onSaveWorkoutPlan,
  onSaveDietPlan,
  onCreateExercise,
  onCreateDaily,
  onCreateWeekly,
}: {
  activeStudent: Student
  assessment: Assessment
  setAssessment: (assessment: Assessment) => void
  assessments: Assessment[]
  bodyGoals: BodyGoal[]
  workoutPlans: WorkoutPlan[]
  workoutLibrary?: WorkoutLibrary
  dietPlans: DietPlan[]
  loading: boolean
  canCreatePlans: boolean
  onSaveAssessment: () => Promise<string>
  onSaveWorkoutPlan: (plan: WeeklyPlanInput) => Promise<string>
  onSaveDietPlan: (plan: Omit<DietPlan, 'id'>) => Promise<string>
  onCreateExercise?: (exercise: Exercise) => Promise<{ exercise: Exercise | null; error: string }>
  onCreateDaily?: (input: { name: string; description: string; exercises: Array<{ exerciseId: number; sets: string; reps: string; load: LoadLevel; rest: string; notes: string }> }) => Promise<{ template: DailyTemplate | null; error: string }>
  onCreateWeekly?: (input: { name: string; description: string; days: Array<{ dayOfWeek: string; dailyTemplateId: number | null }> }) => Promise<{ template: WeeklyTemplate | null; error: string }>
}) {
  if (!activeStudent.id) {
    return <section className="panel full-panel"><p className="empty-state">Nenhum aluno vinculado foi selecionado.</p></section>
  }

  return (
    <section className="student-folder" id="avaliacoes">
      <div className="folder-heading">
        <FolderOpen size={24} />
        <div><p className="eyebrow">Pasta do aluno</p><h2>{activeStudent.name}</h2></div>
        <span className="status-badge">{activeStudent.linkStatus === 'inactive' ? 'Inativo' : 'Ativo'}</span>
      </div>

      {loading ? <p className="empty-state">Carregando ficha do aluno...</p> : (
        <>
          <section className="folder-dashboard">
            <div className="folder-summary">
              <span>Aderencia semanal<strong>{activeStudent.adherence}%</strong></span>
              <span>Avaliacoes<strong>{assessments.length}</strong></span>
              <span>Planos aplicados<strong>{workoutPlans.length + dietPlans.length}</strong></span>
            </div>
            <div className="chart-panel">
              <div className="record-heading"><strong>Aderencia e evolucao</strong><LineChart size={18} /></div>
              <div className="adherence-meter">
                <span>Treinos realizados <b>{activeStudent.adherence}%</b></span>
                <div><i style={{ width: `${Math.max(0, Math.min(100, activeStudent.adherence))}%` }} /></div>
              </div>
              <EvolutionChart assessments={assessments} />
            </div>
          </section>

          <section className="folder-grid">
            <Panel eyebrow="Avaliacao" title="Registrar evolucao">
              <AssessmentForm assessment={assessment} bodyGoals={bodyGoals} onSave={onSaveAssessment} setAssessment={setAssessment} />
            </Panel>
            <Panel eyebrow="Historico" title="Avaliacoes do aluno">
              <AssessmentHistory assessments={assessments} />
            </Panel>
          </section>

          {canCreatePlans ? (
            <section className="panel full-panel" id="treinos">
              <div className="panel-heading"><div><p className="eyebrow">Prescricao</p><h2>Criar e aplicar planos</h2></div></div>
              <WeeklyPlanBuilder
                canApply
                library={workoutLibrary}
                onApply={onSaveWorkoutPlan}
                onCreateDaily={onCreateDaily!}
                onCreateExercise={onCreateExercise!}
                onCreateWeekly={onCreateWeekly!}
              />
              <div className="diet-plan-section"><DietPlanCreator onSaveDiet={onSaveDietPlan} /></div>
            </section>
          ) : null}

          <section className="panel full-panel" id="dietas">
            <div className="panel-heading"><div><p className="eyebrow">Historico</p><h2>Planos aplicados</h2></div></div>
            <PlansHistory dietPlans={dietPlans} workoutPlans={workoutPlans} />
          </section>
        </>
      )}
    </section>
  )
}

function StudentWorkoutPlans({ plans, onComplete }: { plans: WorkoutPlan[]; onComplete: (planId: number) => Promise<string> }) {
  const dayByIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayByIndex[new Date().getDay()]
  const [view, setView] = useState<'current' | 'history'>('current')
  const [selectedDay, setSelectedDay] = useState(currentDay)
  const [message, setMessage] = useState('')
  const currentPlan = plans.find((plan) => plan.status === 'active')
  const history = plans.filter((plan) => plan.status === 'completed')
  const selectedWorkout = currentPlan?.days.find((day) => day.dayOfWeek === selectedDay)

  async function finishPlan() {
    if (!currentPlan) return
    const error = await onComplete(currentPlan.id)
    setMessage(error || 'Plano enviado para o historico.')
  }

  return (
    <section className="panel full-panel student-plan-viewer" id="treinos">
      <div className="segmented-control" aria-label="Planos de treinamento">
        <button className={view === 'current' ? 'active' : ''} onClick={() => setView('current')} type="button">Plano vigente</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')} type="button">Historico de planos</button>
      </div>

      {view === 'current' ? currentPlan ? (
        <>
          <div className="current-plan-heading"><div><p className="eyebrow">Em andamento</p><h2>{currentPlan.name}</h2><small>Inicio em {new Date(`${currentPlan.weekStartDate}T12:00:00`).toLocaleDateString('pt-BR')}</small></div><button className="secondary-button" onClick={finishPlan} type="button"><CheckCircle2 size={17} /> Concluir plano</button></div>
          <div className="student-day-tabs">
            {weekDayOptions.map((day) => {
              const workout = currentPlan.days.find((item) => item.dayOfWeek === day.key)
              return <button className={`${selectedDay === day.key ? 'selected ' : ''}${currentDay === day.key ? 'today' : ''}`} key={day.key} onClick={() => setSelectedDay(day.key)} type="button"><span>{day.label}</span><small>{workout?.exercises.length ? `${workout.exercises.length} exercicios` : 'Descanso'}{currentDay === day.key ? ' - Hoje' : ''}</small></button>
            })}
          </div>
          <div className="day-exercise-detail">
            <div className="record-heading"><div><p className="eyebrow">{weekDayOptions.find((day) => day.key === selectedDay)?.label}</p><h3>{selectedWorkout?.name ?? 'Descanso'}</h3></div><Dumbbell size={19} /></div>
            {selectedWorkout?.instructions ? <p>{selectedWorkout.instructions}</p> : null}
            <div className="exercise-table">
              {selectedWorkout?.exercises.length ? selectedWorkout.exercises.map((exercise, index) => (
                <article className="exercise-row" key={`${exercise.id}-${index}`}><span className="exercise-order">{index + 1}</span><span><strong>{exercise.name}</strong><small>{exercise.muscle} - {exercise.sets || '-'} series x {exercise.reps || '-'} - descanso {exercise.rest || '-'}</small>{exercise.notes ? <small>{exercise.notes}</small> : null}</span><label className="check-pill"><input type="checkbox" /> Realizado</label><ExerciseMedia exercise={exercise} /></article>
              )) : <p className="empty-state">Dia de descanso. Nenhum exercicio programado.</p>}
            </div>
          </div>
        </>
      ) : <p className="empty-state">Nenhum plano vigente. Aguarde a aplicacao de um plano pelo seu personal.</p> : (
        <div className="executed-plans">
          {history.length ? history.map((plan) => (
            <article className="executed-plan" key={plan.id}><CheckCircle2 size={20} /><span><strong>{plan.name}</strong><small>Iniciado em {new Date(`${plan.weekStartDate}T12:00:00`).toLocaleDateString('pt-BR')} - {plan.days.reduce((total, day) => total + day.exercises.length, 0)} exercicios programados</small></span></article>
          )) : <p className="empty-state">Nenhum plano concluido no historico.</p>}
        </div>
      )}
      {message ? <p className="form-message success-message">{message}</p> : null}
    </section>
  )
}

function StudentArea({
  activeStudent,
  assessment,
  setAssessment,
  assessments,
  bodyGoals,
  workoutPlans,
  onCompleteWorkoutPlan,
  dietPlans,
  loading,
  onSaveAssessment,
  studentDoubt,
  setStudentDoubt,
}: {
  activeStudent: Student
  assessment: Assessment
  setAssessment: (assessment: Assessment) => void
  assessments: Assessment[]
  bodyGoals: BodyGoal[]
  workoutPlans: WorkoutPlan[]
  onCompleteWorkoutPlan: (planId: number) => Promise<string>
  dietPlans: DietPlan[]
  loading: boolean
  onSaveAssessment: () => Promise<string>
  studentDoubt: string
  setStudentDoubt: (value: string) => void
}) {
  return (
    <>
      <section className="metrics-grid">
        <Metric icon={HeartPulse} label="Meu objetivo" value="Ativo" detail={activeStudent.goal} />
        <Metric icon={CalendarDays} label="Proxima avaliacao" value={activeStudent.nextReview} detail="Fotos e medidas" />
        <Metric icon={CheckCircle2} label="Treinos feitos" value={`${activeStudent.adherence}%`} detail="Semana atual" />
      </section>

      <StudentWorkoutPlans onComplete={onCompleteWorkoutPlan} plans={workoutPlans} />
      <textarea aria-label="Duvidas ou dificuldades" className="standalone-note" placeholder="Duvidas ou dificuldades do treino" value={studentDoubt} onChange={(event) => setStudentDoubt(event.target.value)} />

      <StudentFolder
        activeStudent={activeStudent}
        assessment={assessment}
        assessments={assessments}
        bodyGoals={bodyGoals}
        canCreatePlans={false}
        dietPlans={dietPlans}
        loading={loading}
        onSaveAssessment={onSaveAssessment}
        onSaveDietPlan={async () => 'Somente o personal pode criar planos.'}
        onSaveWorkoutPlan={async () => 'Somente o personal pode criar planos.'}
        setAssessment={setAssessment}
        workoutPlans={workoutPlans}
      />

      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Orientacoes gerais</p>
            <h2>Padrao para acompanhar a evolucao visual</h2>
          </div>
        </div>
        <div className="guidance-grid">
          {measurements.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </>
  )
}

function AdminArea({
  students,
  exercises,
  trainers,
  onLinkStudentTrainer,
  workoutLibrary,
  onCreateExercise,
  onCreateDaily,
  onCreateWeekly,
}: {
  students: Student[]
  exercises: Exercise[]
  trainers: Trainer[]
  onLinkStudentTrainer: (studentId: number, trainerId: number) => Promise<string>
  workoutLibrary: WorkoutLibrary
  onCreateExercise: (exercise: Exercise) => Promise<{ exercise: Exercise | null; error: string }>
  onCreateDaily: (input: { name: string; description: string; exercises: Array<{ exerciseId: number; sets: string; reps: string; load: LoadLevel; rest: string; notes: string }> }) => Promise<{ template: DailyTemplate | null; error: string }>
  onCreateWeekly: (input: { name: string; description: string; days: Array<{ dayOfWeek: string; dailyTemplateId: number | null }> }) => Promise<{ template: WeeklyTemplate | null; error: string }>
}) {
  const [studentId, setStudentId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [message, setMessage] = useState('')

  async function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!studentId || !trainerId) {
      setMessage('Selecione aluno e personal.')
      return
    }

    const errorMessage = await onLinkStudentTrainer(Number(studentId), Number(trainerId))
    setMessage(errorMessage || 'Vinculo criado com sucesso.')
  }

  return (
    <>
      <section className="metrics-grid">
        <Metric icon={Users} label="Usuarios" value={String(students.length + trainers.length + 1)} detail="Admin, personal e alunos" />
        <Metric icon={Dumbbell} label="Exercicios" value={String(exercises.length)} detail="Biblioteca cadastrada" />
        <Metric icon={BarChart3} label="Personais" value={String(trainers.length)} detail="Com acesso controlado" />
      </section>

      <section className="content-grid">
        <Panel id="admin" eyebrow="Area de adm" title="Vincular aluno ao personal">
          <form className="form-grid" onSubmit={submitLink}>
            <select aria-label="Aluno" onChange={(event) => setStudentId(event.target.value)} value={studentId}>
              <option value="">Selecione o aluno</option>
              {students.filter((student) => student.id).map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
            <select aria-label="Personal" onChange={(event) => setTrainerId(event.target.value)} value={trainerId}>
              <option value="">Selecione o personal</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
              ))}
            </select>
            {message ? <p className="form-message neutral-message">{message}</p> : null}
            <button className="primary-button" type="submit">
              <UserCog size={18} />
              Vincular acesso
            </button>
          </form>
        </Panel>

        <Panel eyebrow="Acessos" title="Alunos e personais vinculados">
          <div className="student-list">
            {students.map((student) => (
              <div className="student-row readonly" key={student.id ?? student.name}>
                <span>
                  <strong>{student.name}</strong>
                  <small>{student.trainers || 'Sem personal vinculado'}</small>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="panel full-panel">
        <div className="panel-heading"><div><p className="eyebrow">Biblioteca da plataforma</p><h2>Planos, treinos diarios e exercicios globais</h2></div></div>
        <WeeklyPlanBuilder
          canApply={false}
          library={workoutLibrary}
          onApply={async () => ''}
          onCreateDaily={onCreateDaily}
          onCreateExercise={onCreateExercise}
          onCreateWeekly={onCreateWeekly}
        />
      </section>

      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cadastros gerais</p>
            <h2>Modulo administrativo</h2>
          </div>
        </div>
        <div className="admin-grid">
          {adminItems.map((item) => (
            <button className="admin-action" key={item} type="button">
              <UserCog size={18} />
              <span>{item}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

export default App
