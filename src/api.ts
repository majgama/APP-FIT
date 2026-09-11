import type { AppUser, Area, Assessment, BodyGoal, DietPlan, Exercise, Student, UserProfile, WorkoutLibrary, WorkoutPlan } from './types'

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('app-fit-auth-token')
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((data as { message?: string }).message ?? 'Nao foi possivel concluir a operacao.')
  }

  return data as T
}

export async function fetchAppData(token: string, role: Area) {
  const profileData = await apiRequest<{ profile: UserProfile }>('/api/profile', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const exerciseData = await apiRequest<{ exercises: Exercise[] }>('/api/exercises', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const result = {
    profile: profileData.profile,
    exercises: exerciseData.exercises,
  }

  if (role === 'admin' || role === 'personal') {
    const trainerData = await apiRequest<{ trainers: Array<{ id: number; name: string; email: string; specialty: string }> }>('/api/trainers', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const libraryData = await apiRequest<WorkoutLibrary>('/api/workout-library', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const studentData = await apiRequest<{ students: Student[] }>('/api/students', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const inactiveData = role === 'personal'
      ? await apiRequest<{ students: Student[] }>('/api/students?status=inactive', {
          headers: { Authorization: `Bearer ${token}` },
        })
      : { students: [] as Student[] }

    return {
      ...result,
      trainers: trainerData.trainers,
      workoutLibrary: libraryData,
      students: studentData.students,
      inactiveStudents: inactiveData.students,
    }
  }

  const studentData = await apiRequest<{ student: Student | null }>('/api/students/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  return {
    ...result,
    students: studentData.student ? [studentData.student] : [],
    inactiveStudents: [] as Student[],
    trainers: [] as Array<{ id: number; name: string; email: string; specialty: string }>,
    workoutLibrary: { exercises: [], dailyTemplates: [], weeklyTemplates: [] } as WorkoutLibrary,
  }
}

export async function fetchStudentFolder(studentId: number) {
  const [assessmentData, planData, goalData] = await Promise.all([
    apiRequest<{ assessments: Assessment[] }>(`/api/students/${studentId}/assessments`),
    apiRequest<{ workouts: WorkoutPlan[]; diets: DietPlan[] }>(`/api/students/${studentId}/plans`),
    apiRequest<{ goals: BodyGoal[] }>('/api/body-goals'),
  ])

  return {
    assessments: assessmentData.assessments,
    workoutPlans: planData.workouts,
    dietPlans: planData.diets,
    bodyGoals: goalData.goals,
  }
}

export async function getCurrentUser(token: string) {
  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message ?? 'Sessao invalida.')
  }

  return data.user as AppUser
}

export async function createStudentInvite() {
  return apiRequest<{ invitation: { code: string; token: string; url: string; expiresAt: string } }>('/api/invitations/student', {
    method: 'POST',
  }).then((data) => data.invitation)
}

export async function fetchStudentInvitation(invite: string) {
  const response = await fetch(`/api/invitations/student/${invite}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message ?? 'Convite invalido.')
  }

  return data.invitation as { code: string; email: string; trainerName: string; expiresAt: string }
}

export async function loginUser(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message ?? 'E-mail ou senha invalidos.')
  }

  return data as { token: string; user: AppUser }
}

export async function registerUser(payload: { name: string; email: string; password: string; role: Area; invitationToken?: string }) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message ?? 'Nao foi possivel criar a conta.')
  }

  return data as { token: string; user: AppUser }
}

export async function createWorkoutLibraryExercise(exercise: Exercise) {
  return apiRequest<{ exercise: Exercise }>('/api/workout-library/exercises', {
    method: 'POST',
    body: JSON.stringify(exercise),
  })
}

export async function createDailyTemplate(input: {
  name: string
  description: string
  exercises: Array<{ exerciseId: number; sets: string; reps: string; load: Exercise['load']; rest: string; notes: string }>
}) {
  return apiRequest<{ id: number }>('/api/workout-library/daily-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createWeeklyTemplate(input: {
  name: string
  description: string
  days: Array<{ dayOfWeek: string; dailyTemplateId: number | null }>
}) {
  return apiRequest<{ id: number }>('/api/workout-library/weekly-templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function saveStudentAssessment(studentId: number, assessment: Assessment) {
  return apiRequest(`/api/students/${studentId}/assessments`, {
    method: 'POST',
    body: JSON.stringify(assessment),
  })
}

export async function saveWorkoutPlan(studentId: number, plan: { templateId: number; name: string; weekStartDate: string; notes: string }) {
  return apiRequest(`/api/students/${studentId}/workout-plans`, {
    method: 'POST',
    body: JSON.stringify(plan),
  })
}

export async function saveDietPlan(studentId: number, plan: { name: string; planDate: string; notes: string }) {
  return apiRequest(`/api/students/${studentId}/diet-plans`, {
    method: 'POST',
    body: JSON.stringify(plan),
  })
}

export async function completeWorkoutPlan(planId: number) {
  return apiRequest(`/api/workout-plans/${planId}/complete`, { method: 'PATCH' })
}

export async function updateStudentStatus(studentId: number, status: 'active' | 'inactive') {
  return apiRequest(`/api/students/${studentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateProfile(profile: UserProfile) {
  return apiRequest<{ profile: UserProfile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  }).then((data) => data.profile)
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest('/api/profile/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function linkStudentTrainer(studentId: number, trainerId: number) {
  return apiRequest(`/api/students/${studentId}/trainers`, {
    method: 'POST',
    body: JSON.stringify({ trainerId, relationshipType: 'secondary' }),
  })
}

export async function listWorkshopLibrary(): Promise<WorkoutLibrary> {
  return apiRequest<WorkoutLibrary>('/api/workout-library')
}

export async function listExercises(): Promise<Exercise[]> {
  return apiRequest<{ exercises: Exercise[] }>('/api/exercises').then((data) => data.exercises)
}

export async function listTrainers(): Promise<Array<{ id: number; name: string; email: string; specialty: string }>> {
  return apiRequest<{ trainers: Array<{ id: number; name: string; email: string; specialty: string }> }>('/api/trainers').then((data) => data.trainers)
}

export async function listStudentByMe() {
  return apiRequest<{ student: Student | null }>('/api/students/me').then((data) => data.student)
}

export async function listStudents() {
  return apiRequest<{ students: Student[] }>('/api/students').then((data) => data.students)
}

export async function getBodyGoals() {
  return apiRequest<{ goals: BodyGoal[] }>('/api/body-goals').then((data) => data.goals)
}

export async function getStudentAssessments(studentId: number) {
  return apiRequest<{ assessments: Assessment[] }>(`/api/students/${studentId}/assessments`).then((data) => data.assessments)
}

export async function createStudent(student: Student) {
  return apiRequest<{ student: Student }>('/api/students', {
    method: 'POST',
    body: JSON.stringify(student),
  }).then((data) => data.student)
}

export async function createExercise(exercise: Exercise) {
  return apiRequest<{ exercise: Exercise }>('/api/exercises', {
    method: 'POST',
    body: JSON.stringify(exercise),
  }).then((data) => data.exercise)
}

export async function addTemplateToLibrary<T>(url: string, payload: T) {
  return apiRequest(url, { method: 'POST', body: JSON.stringify(payload) })
}
