import { useState, type FormEvent } from 'react'
import { Camera, KeyRound, Save, ShieldCheck, Trash2 } from 'lucide-react'
import type { UserProfile } from '../types'

export function ProfilePage({
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
