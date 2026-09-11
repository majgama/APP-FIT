import { useEffect, useState, type FormEvent } from 'react'
import {
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
} from 'lucide-react'
import type { Area, AuthMode, RegisterUserInput, StudentInvitation } from '../types'

export function AuthScreen({
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
