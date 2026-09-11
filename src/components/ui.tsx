import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Copy,
  Link2,
  MessageCircle,
  Power,
  X,
} from 'lucide-react'
import type { GeneratedInvite, Student } from '../types'

export function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof import('lucide-react').Users
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

export function Panel({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  children: ReactNode
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

export function InvitePanel({ onCreateInvite }: { onCreateInvite: () => Promise<GeneratedInvite | null> }) {
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

export function DeactivateStudentDialog({
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
