import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Apple,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FilePlus2,
  HeartPulse,
  Link2,
  KeyRound,
  LineChart,
  LogIn,
  LogOut,
  LockKeyhole,
  Mail,
  MessageCircle,
  Play,
  Plus,
  Power,
  ShieldCheck,
  UserPlus,
  UserCog,
  Users,
  Copy,
  Video,
  Volume2,
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
type Meal = {
  name: string
  amount: string
  photo: string
  guidance: string
}

type Assessment = {
  date: string
  weight: string
  height: string
  waist: string
  abdomen: string
  hip: string
  currentBody: string
  targetBody: string
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

const meals: Meal[] = [
  { name: 'Cafe da manha', amount: '1 prato', photo: 'foto-refeicao.jpg', guidance: 'Proteina + carboidrato de digestao lenta.' },
  { name: 'Lanche', amount: '1 porcao', photo: 'lanche.jpg', guidance: 'Opcao pratica para manter energia.' },
  { name: 'Almoco', amount: '450 g', photo: 'almoco.jpg', guidance: 'Priorizar vegetais, proteina magra e arroz/batata.' },
  { name: 'Lanche da tarde', amount: '1 porcao', photo: 'tarde.jpg', guidance: 'Ajustar conforme horario do treino.' },
  { name: 'Janta', amount: '400 g', photo: 'janta.jpg', guidance: 'Refeicao leve com boa saciedade.' },
  { name: 'Ceia', amount: 'Opcional', photo: 'ceia.jpg', guidance: 'Usar quando houver fome antes de dormir.' },
  { name: 'Pre-treino', amount: '30 a 60 min antes', photo: 'pre.jpg', guidance: 'Carboidrato simples se o treino for intenso.' },
  { name: 'Pos-treino', amount: 'Apos treino', photo: 'pos.jpg', guidance: 'Proteina e carboidrato conforme meta.' },
  { name: 'Suplementacao', amount: 'Conforme plano', photo: 'suplemento.jpg', guidance: 'Registrar dose, horario e observacoes.' },
]

const weeklyPlan = [
  { day: 'Segunda', title: 'Inferiores A', status: 'Pronto', done: true },
  { day: 'Terca', title: 'Superiores push', status: 'Revisar carga', done: true },
  { day: 'Quarta', title: 'Mobilidade + cardio', status: 'Pronto', done: false },
  { day: 'Quinta', title: 'Inferiores B', status: 'Pendente', done: false },
  { day: 'Sexta', title: 'Superiores pull', status: 'Pronto', done: false },
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
  waist: '',
  abdomen: '',
  hip: '',
  currentBody: 'Modelo 1',
  targetBody: 'Objetivo 1',
}

function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    Boolean(localStorage.getItem('app-fit-auth-token')),
  )
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [area, setArea] = useState<Area>('personal')
  const [students, setStudents] = useState(initialStudents)
  const [inactiveStudents, setInactiveStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState(initialStudents[0].name)
  const [studentForm, setStudentForm] = useState(blankStudent)
  const [exerciseForm, setExerciseForm] = useState(blankExercise)
  const [exerciseCatalog, setExerciseCatalog] = useState(initialExercises)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [assessment, setAssessment] = useState(blankAssessment)
  const [studentDoubt, setStudentDoubt] = useState('')
  const [invitationToken, setInvitationToken] = useState('')
  const [studentInvitation, setStudentInvitation] = useState<StudentInvitation | null>(null)

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
      const exerciseData = await apiRequest('/api/exercises', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setExerciseCatalog(exerciseData.exercises as Exercise[])

      if (role === 'admin' || role === 'personal') {
        const trainerData = await apiRequest('/api/trainers', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setTrainers(trainerData.trainers as Trainer[])
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

  function logout() {
    localStorage.removeItem('app-fit-auth-token')
    setCurrentUser(null)
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
          <a className="active" href="#dashboard">
            <LineChart size={18} aria-hidden="true" />
            Dashboard
          </a>
          <a href="#alunos">
            <Users size={18} aria-hidden="true" />
            Alunos
          </a>
          <a href="#treinos">
            <Dumbbell size={18} aria-hidden="true" />
            Treinos
          </a>
          <a href="#dietas">
            <Apple size={18} aria-hidden="true" />
            Dietas
          </a>
          <a href="#avaliacoes">
            <Camera size={18} aria-hidden="true" />
            Avaliacoes
          </a>
          <a href="#admin">
            <UserCog size={18} aria-hidden="true" />
            Admin
          </a>
        </nav>

        <div className="coach-card">
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>{currentUser.name}</strong>
          <span>{currentUser.email}</span>
          <button className="logout-button" onClick={logout} type="button">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <section className="workspace" id="dashboard">
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
                    <button
                      className={student.name === activeStudent.name ? 'student-row active' : 'student-row'}
                      key={student.name}
                      onClick={() => setSelectedStudent(student.name)}
                      type="button"
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
                              updateStudentStatus(student.id!, 'inactive')
                            }}
                            type="button"
                          >
                            <Power size={15} />
                          </button>
                        ) : null}
                      </span>
                    </button>
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

            <DietsAndAssessments
              activeStudent={activeStudent}
              assessment={assessment}
              setAssessment={setAssessment}
            />
          </>
        ) : null}

        {area === 'aluno' ? (
          <StudentArea
            activeStudent={activeStudent}
            assessment={assessment}
            setAssessment={setAssessment}
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
          />
        ) : null}
      </section>
    </main>
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
  return (
    <div className="form-grid compact">
      <input aria-label="Nome do exercicio" placeholder="Nome do exercicio" value={exerciseForm.name} onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })} />
      <input aria-label="Musculo" placeholder="Musculo" value={exerciseForm.muscle} onChange={(event) => setExerciseForm({ ...exerciseForm, muscle: event.target.value })} />
      <input aria-label="Video ou gif" placeholder="Video ou gif" value={exerciseForm.media} onChange={(event) => setExerciseForm({ ...exerciseForm, media: event.target.value })} />
      <input aria-label="Audio" placeholder="Audio" value={exerciseForm.audio} onChange={(event) => setExerciseForm({ ...exerciseForm, audio: event.target.value })} />
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

function DietsAndAssessments({
  activeStudent,
  assessment,
  setAssessment,
}: {
  activeStudent: Student
  assessment: Assessment
  setAssessment: (assessment: Assessment) => void
}) {
  return (
    <section className="content-grid wide-first">
      <Panel id="dietas" eyebrow="Dieta" title="Plano semanal e dieta do dia">
        <div className="meal-grid">
          {meals.map((meal) => (
            <article className="meal-card" key={meal.name}>
              <Apple size={18} />
              <strong>{meal.name}</strong>
              <span>{meal.amount}</span>
              <small>{meal.guidance}</small>
            </article>
          ))}
        </div>
      </Panel>

      <Panel id="avaliacoes" eyebrow={activeStudent.name} title="Nova avaliacao fisica">
        <AssessmentForm assessment={assessment} setAssessment={setAssessment} />
      </Panel>
    </section>
  )
}

function AssessmentForm({
  assessment,
  setAssessment,
}: {
  assessment: Assessment
  setAssessment: (assessment: Assessment) => void
}) {
  return (
    <div className="form-grid compact">
      <input aria-label="Data da avaliacao" type="date" value={assessment.date} onChange={(event) => setAssessment({ ...assessment, date: event.target.value })} />
      <div className="two-fields">
        <input aria-label="Peso" placeholder="Peso" value={assessment.weight} onChange={(event) => setAssessment({ ...assessment, weight: event.target.value })} />
        <input aria-label="Altura" placeholder="Altura" value={assessment.height} onChange={(event) => setAssessment({ ...assessment, height: event.target.value })} />
      </div>
      <input aria-label="Cintura" placeholder="Cintura" value={assessment.waist} onChange={(event) => setAssessment({ ...assessment, waist: event.target.value })} />
      <input aria-label="Abdomen" placeholder="Abdomen" value={assessment.abdomen} onChange={(event) => setAssessment({ ...assessment, abdomen: event.target.value })} />
      <input aria-label="Quadril" placeholder="Quadril" value={assessment.hip} onChange={(event) => setAssessment({ ...assessment, hip: event.target.value })} />
      <select aria-label="Modelo de corpo atual" value={assessment.currentBody} onChange={(event) => setAssessment({ ...assessment, currentBody: event.target.value })}>
        <option>Modelo 1</option>
        <option>Modelo 2</option>
        <option>Modelo 3</option>
        <option>Modelo 4</option>
      </select>
      <select aria-label="Objetivo corporal" value={assessment.targetBody} onChange={(event) => setAssessment({ ...assessment, targetBody: event.target.value })}>
        <option>Objetivo 1</option>
        <option>Objetivo 2</option>
        <option>Objetivo 3</option>
      </select>
      <div className="photo-slots" aria-label="Fotos da avaliacao">
        <span><Camera size={18} /> Frente</span>
        <span><Camera size={18} /> Perfil</span>
        <span><Camera size={18} /> Costas</span>
      </div>
    </div>
  )
}

function StudentArea({
  activeStudent,
  assessment,
  setAssessment,
  studentDoubt,
  setStudentDoubt,
}: {
  activeStudent: Student
  assessment: Assessment
  setAssessment: (assessment: Assessment) => void
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

      <section className="content-grid wide-first">
        <Panel eyebrow="Treino diario" title="Executar treino do dia">
          <div className="exercise-table">
            {initialExercises.map((exercise) => (
              <article className="exercise-row" key={exercise.name}>
                <Dumbbell size={18} />
                <span>
                  <strong>{exercise.name}</strong>
                  <small>{exercise.sets} series - {exercise.reps} repeticoes - descanso {exercise.rest}</small>
                </span>
                <label className="check-pill">
                  <input type="checkbox" />
                  Realizado
                </label>
              </article>
            ))}
          </div>
          <textarea
            aria-label="Duvidas ou dificuldades"
            className="standalone-note"
            placeholder="Duvidas ou dificuldades do treino"
            value={studentDoubt}
            onChange={(event) => setStudentDoubt(event.target.value)}
          />
        </Panel>

        <Panel eyebrow="Ficha corporal" title="Registrar medidas e fotos">
          <AssessmentForm assessment={assessment} setAssessment={setAssessment} />
        </Panel>
      </section>

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
}: {
  students: Student[]
  exercises: Exercise[]
  trainers: Trainer[]
  onLinkStudentTrainer: (studentId: number, trainerId: number) => Promise<string>
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
