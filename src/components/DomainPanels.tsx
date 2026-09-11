import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Apple,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  FolderOpen,
  HeartPulse,
  LineChart,
  Mic,
  Plus,
  Save,
  Square,
  Trash2,
  Upload,
  UserCog,
  Users,
  Video,
} from 'lucide-react'
import type {
  Assessment,
  AssessmentPhoto,
  BodyGoal,
  DailyTemplate,
  DietPlan,
  Exercise,
  LoadLevel,
  Student,
  Trainer,
  WeeklyPlanInput,
  WeeklyTemplate,
  WorkoutLibrary,
  WorkoutPlan,
} from '../types'

export function ExerciseMedia({ exercise }: { exercise: Exercise }) {
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

export function ExerciseForm({
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

export function AssessmentForm({
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

export function EvolutionChart({ assessments }: { assessments: Assessment[] }) {
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

export function AssessmentHistory({ assessments }: { assessments: Assessment[] }) {
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

export function DietPlanCreator({ onSaveDiet }: {
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

export function PlansHistory({ workoutPlans, dietPlans }: { workoutPlans: WorkoutPlan[]; dietPlans: DietPlan[] }) {
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

export function StudentFolder({
  activeStudent,
  assessment,
  setAssessment,
  assessments,
  bodyGoals,
  workoutPlans,
  workoutLibrary,
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
            <div className="panel" id="avaliacao">
              <div className="panel-heading"><div><p className="eyebrow">Avaliacao</p><h2>Registrar evolucao</h2></div></div>
              <AssessmentForm assessment={assessment} bodyGoals={bodyGoals} onSave={onSaveAssessment} setAssessment={setAssessment} />
            </div>
            <div className="panel" id="historico">
              <div className="panel-heading"><div><p className="eyebrow">Historico</p><h2>Avaliacoes do aluno</h2></div></div>
              <AssessmentHistory assessments={assessments} />
            </div>
          </section>

          {canCreatePlans ? (
            <section className="panel full-panel" id="treinos">
              <div className="panel-heading"><div><p className="eyebrow">Prescricao</p><h2>Criar e aplicar planos</h2></div></div>
              <WeeklyPlanBuilder
                canApply
                library={workoutLibrary ?? { exercises: [], dailyTemplates: [], weeklyTemplates: [] }}
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

export function StudentWorkoutPlans({ plans, onComplete }: { plans: WorkoutPlan[]; onComplete: (planId: number) => Promise<string> }) {
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
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey) => {
              const workout = currentPlan.days.find((item) => item.dayOfWeek === dayKey)
              return <button className={`${selectedDay === dayKey ? 'selected ' : ''}${currentDay === dayKey ? 'today' : ''}`} key={dayKey} onClick={() => setSelectedDay(dayKey)} type="button"><span>{dayKey === 'monday' ? 'Segunda' : dayKey === 'tuesday' ? 'Terca' : dayKey === 'wednesday' ? 'Quarta' : dayKey === 'thursday' ? 'Quinta' : dayKey === 'friday' ? 'Sexta' : dayKey === 'saturday' ? 'Sabado' : 'Domingo'}</span><small>{workout?.exercises.length ? `${workout.exercises.length} exercicios` : 'Descanso'}{currentDay === dayKey ? ' - Hoje' : ''}</small></button>
            })}
          </div>
          <div className="day-exercise-detail">
            <div className="record-heading"><div><p className="eyebrow">{selectedWorkout ? (selectedWorkout.dayOfWeek === 'monday' ? 'Segunda' : selectedWorkout.dayOfWeek === 'tuesday' ? 'Terca' : selectedWorkout.dayOfWeek === 'wednesday' ? 'Quarta' : selectedWorkout.dayOfWeek === 'thursday' ? 'Quinta' : selectedWorkout.dayOfWeek === 'friday' ? 'Sexta' : selectedWorkout.dayOfWeek === 'saturday' ? 'Sabado' : 'Domingo') : 'Descanso'}</p><h3>{selectedWorkout?.name ?? 'Descanso'}</h3></div><Dumbbell size={19} /></div>
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

export function StudentArea({
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
        <div className="metric-card"><HeartPulse size={22} /><span>Meu objetivo</span><strong>Ativo</strong><small>{activeStudent.goal}</small></div>
        <div className="metric-card"><CalendarDays size={22} /><span>Proxima avaliacao</span><strong>{activeStudent.nextReview}</strong><small>Fotos e medidas</small></div>
        <div className="metric-card"><CheckCircle2 size={22} /><span>Treinos feitos</span><strong>{`${activeStudent.adherence}%`}</strong><small>Semana atual</small></div>
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
          {[
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
          ].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </>
  )
}

export function AdminArea({
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
        <div className="metric-card"><Users size={22} /><span>Usuarios</span><strong>{String(students.length + trainers.length + 1)}</strong><small>Admin, personal e alunos</small></div>
        <div className="metric-card"><Dumbbell size={22} /><span>Exercicios</span><strong>{String(exercises.length)}</strong><small>Biblioteca cadastrada</small></div>
        <div className="metric-card"><BarChart3 size={22} /><span>Personais</span><strong>{String(trainers.length)}</strong><small>Com acesso controlado</small></div>
      </section>

      <section className="content-grid">
        <div className="panel" id="admin">
          <div className="panel-heading"><div><p className="eyebrow">Area de adm</p><h2>Vincular aluno ao personal</h2></div></div>
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
        </div>

        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Acessos</p><h2>Alunos e personais vinculados</h2></div></div>
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
        </div>
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
          {[
            'Gerenciar tipo de usuario',
            'Cadastrar personal',
            'Cadastrar aluno',
            'Cadastrar plano semanal',
            'Cadastrar treino diario',
            'Cadastrar exercicio',
          ].map((item) => (
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

export function WeeklyPlanBuilder({
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
  const [newExercise, setNewExercise] = useState<Exercise>({
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
  })
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
      setNewExercise({
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
      })
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
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey) => ({ dayOfWeek: dayKey, dailyTemplateId: dayTemplates[dayKey] ?? null })),
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
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey) => (
              <button className={selectedDay === dayKey ? 'active' : ''} key={dayKey} onClick={() => { setSelectedDay(dayKey); setCreatingDaily(false) }} type="button">
                {dayKey === 'monday' ? 'Segunda' : dayKey === 'tuesday' ? 'Terca' : dayKey === 'wednesday' ? 'Quarta' : dayKey === 'thursday' ? 'Quinta' : dayKey === 'friday' ? 'Sexta' : dayKey === 'saturday' ? 'Sabado' : 'Domingo'}<small>{dayTemplates[dayKey] ? 'Treino selecionado' : 'Descanso'}</small>
              </button>
            ))}
          </div>
          {!creatingDaily ? (
            <>
              <div className="day-builder-heading"><strong>{selectedDay === 'monday' ? 'Segunda' : selectedDay === 'tuesday' ? 'Terca' : selectedDay === 'wednesday' ? 'Quarta' : selectedDay === 'thursday' ? 'Quinta' : selectedDay === 'friday' ? 'Sexta' : selectedDay === 'saturday' ? 'Sabado' : 'Domingo'}</strong><button className="mini-action" onClick={() => setDayTemplates((current) => ({ ...current, [selectedDay]: null }))} type="button">Definir descanso</button></div>
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
