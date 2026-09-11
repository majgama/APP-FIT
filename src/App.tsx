import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Apple,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Dumbbell,
  FilePlus2,
  HeartPulse,
  LineChart,
  LogOut,
  LockKeyhole,
  MessageCircle,
  Play,
  Plus,
  Power,
  ShieldCheck,
  UserCog,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react'
import './App.css'
import { AuthScreen } from './components/AuthScreen'
import {
  AdminArea,
  ExerciseForm,
  StudentArea,
  StudentFolder,
} from './components/DomainPanels'
import { ProfilePage } from './components/ProfilePage'
import {
  blankAssessment,
  blankExercise,
  blankStudent,
  blankWorkoutLibrary,
  initialExercises,
  initialStudents,
  weeklyPlan,
} from './constants'
import type {
  AppUser,
  Area,
  Assessment,
  BodyGoal,
  DietPlan,
  Exercise,
  GeneratedInvite,
  LoadLevel,
  RegisterUserInput,
  Student,
  StudentInvitation,
  Trainer,
  UserProfile,
  WeeklyPlanInput,
  WorkoutLibrary,
  WorkoutPlan,
} from './types'

function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    Boolean(localStorage.getItem('app-fit-auth-token')),
  )
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [area, setArea] = useState<Area>('personal')
  const [activeView, setActiveView] = useState<'dashboard' | 'alunos' | 'treinos' | 'dietas' | 'avaliacoes' | 'admin' | 'profile'>('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
        setActiveView(user.role === 'personal' ? 'alunos' : 'dashboard')
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
    setActiveView(user.role === 'personal' ? 'alunos' : 'dashboard')
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
    setActiveView(newUser.role === 'personal' ? 'alunos' : 'dashboard')
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
    if (currentUser?.role === 'personal') {
      try {
        const data = await apiRequest('/api/personal/invite')
        return data.invite as GeneratedInvite
      } catch (error) {
        alert((error as Error).message)
        return null
      }
    }

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
    setActiveView('avaliacoes')
    setIsMobileMenuOpen(false)
    window.setTimeout(() => document.getElementById('avaliacoes')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false)
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

  const renderCurrentView = () => {
    const pageTitles = {
      dashboard: { eyebrow: `Area ${area}`, title: area === 'aluno' ? 'Acompanhe seu plano e registre sua evolucao.' : 'Gerencie alunos, treinos, dietas e evolucao em um so painel.' },
      alunos: { eyebrow: 'Menu', title: 'Alunos' },
      treinos: { eyebrow: 'Menu', title: 'Treinos' },
      dietas: { eyebrow: 'Menu', title: 'Dietas' },
      avaliacoes: { eyebrow: 'Menu', title: 'Avaliacoes' },
      admin: { eyebrow: 'Menu', title: 'Admin' },
      profile: { eyebrow: 'Perfil', title: 'Meu perfil' },
    } as const

    const renderPageHeader = (view: keyof typeof pageTitles) => (
      <header className="page-header">
        <div>
          <p className="eyebrow">{pageTitles[view].eyebrow}</p>
          <h2>{pageTitles[view].title}</h2>
        </div>
      </header>
    )

    if (activeView === 'profile') {
      return (
        <div className="page-shell">
          {renderPageHeader('profile')}
          {profileLoading || !userProfile ? <div className="profile-loading">Carregando perfil...</div> : (
            <ProfilePage
              onChangePassword={changePassword}
              onSave={updateProfile}
              profile={userProfile}
            />
          )}
        </div>
      )
    }

    if (activeView === 'dashboard') {
      return (
        <div className="page-shell">
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
                <button className="primary-button" onClick={() => setActiveView('alunos')} type="button">
                  Abrir aluno
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <button className="secondary-button" onClick={() => setActiveView('treinos')} type="button">
                  <Play size={18} aria-hidden="true" />
                  Montar treino
                </button>
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
        </div>
      )
    }

    if (activeView === 'alunos') {
      return (
        <div className="page-shell">
          {renderPageHeader('alunos')}
          {area === 'personal' ? (
            <section className="content-grid page-grid single-column">
              <InvitePanel onCreateInvite={createStudentInvite} />

              <Panel id="alunos" eyebrow="Personal" title="Lista de alunos">
                <div className="student-list">
                  {students.map((student) => {
                    const initials = student.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('') || 'A'

                    return (
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
                        <div className="student-identity">
                          {student.photo ? (
                            <img alt={student.name} className="student-avatar" src={student.photo} />
                          ) : (
                            <span className="student-avatar placeholder">{initials}</span>
                          )}
                          <span>
                            <strong>{student.name}</strong>
                            <small>{student.trainers ? student.goal + ' - ' + student.trainers : student.goal}</small>
                          </span>
                        </div>
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
                    )
                  })}
                </div>
              </Panel>

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
          ) : (
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
          )}
        </div>
      )
    }

    if (activeView === 'treinos') {
      return (
        <div className="page-shell">
          {renderPageHeader('treinos')}
          {area === 'personal' ? (
            <section className="content-grid page-grid wide-first">
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
          ) : (
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
          )}
        </div>
      )
    }

    if (activeView === 'dietas') {
      return (
        <div className="page-shell">
          {renderPageHeader('dietas')}
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
        </div>
      )
    }

    if (activeView === 'avaliacoes') {
      return (
        <div className="page-shell">
          {renderPageHeader('avaliacoes')}
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
        </div>
      )
    }

    if (activeView === 'admin') {
      return (
        <div className="page-shell">
          {renderPageHeader('admin')}
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
        </div>
      )
    }

    return null
  }

  return (
    <main className="app-shell">
      <button
        aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen((value) => !value)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      {isMobileMenuOpen ? <button aria-label="Fechar menu" className="mobile-backdrop" onClick={closeMobileMenu} type="button" /> : null}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} aria-label="Navegacao principal">
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
              onClick={() => {
                setArea(item)
                setActiveView('dashboard')
                setIsMobileMenuOpen(false)
              }}
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
          <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => {
            setActiveView('dashboard')
            setIsMobileMenuOpen(false)
          }} type="button">
            <LineChart size={18} aria-hidden="true" />
            Dashboard
          </button>
          <button className={activeView === 'alunos' ? 'active' : ''} onClick={() => {
            setActiveView('alunos')
            setIsMobileMenuOpen(false)
          }} type="button">
            <Users size={18} aria-hidden="true" />
            Alunos
          </button>
          <button className={activeView === 'treinos' ? 'active' : ''} onClick={() => {
            setActiveView('treinos')
            setIsMobileMenuOpen(false)
          }} type="button">
            <Dumbbell size={18} aria-hidden="true" />
            Treinos
          </button>
          <button className={activeView === 'dietas' ? 'active' : ''} onClick={() => {
            setActiveView('dietas')
            setIsMobileMenuOpen(false)
          }} type="button">
            <Apple size={18} aria-hidden="true" />
            Dietas
          </button>
          <button className={activeView === 'avaliacoes' ? 'active' : ''} onClick={() => {
            setActiveView('avaliacoes')
            setIsMobileMenuOpen(false)
          }} type="button">
            <Camera size={18} aria-hidden="true" />
            Avaliacoes
          </button>
          <button className={activeView === 'admin' ? 'active' : ''} onClick={() => {
            setActiveView('admin')
            setIsMobileMenuOpen(false)
          }} type="button">
            <UserCog size={18} aria-hidden="true" />
            Admin
          </button>
          <button className={activeView === 'profile' ? 'active' : ''} onClick={() => {
            openProfile()
            setIsMobileMenuOpen(false)
          }} type="button">
            <UserCog size={18} aria-hidden="true" />
            Meu perfil
          </button>
        </nav>

        <div className="coach-card">
          {currentUser.profilePhoto ? <img className="coach-avatar" alt="Foto do perfil" src={currentUser.profilePhoto} /> : <ShieldCheck size={22} aria-hidden="true" />}
          <strong>{currentUser.name}</strong>
          <span>{currentUser.email}</span>
          <button className="logout-button" onClick={() => {
            logout()
            setIsMobileMenuOpen(false)
          }} type="button">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <section className="workspace" id="dashboard">
        {renderCurrentView()}
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

function InvitePanel({ onCreateInvite }: { onCreateInvite: () => Promise<GeneratedInvite | null> }) {
  const [invite, setInvite] = useState<GeneratedInvite | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void (async () => {
      const generatedInvite = await onCreateInvite()
      if (!generatedInvite) return
      setInvite(generatedInvite)
      setMessage('Link fixo do personal. Pode ser reutilizado em qualquer canal.')
    })()
  }, [])

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
    <Panel eyebrow="Convite" title="Link de cadastro do aluno">
      <div className="form-grid compact">
        {invite ? (
          <div className="invite-box">
            <span>Codigo {invite.code}</span>
            <strong>{invite.url}</strong>
          </div>
        ) : (
          <div className="invite-box loading-invite">
            <span>Gerando link...</span>
          </div>
        )}
        {message ? <p className="form-message neutral-message">{message}</p> : null}
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

export default App
