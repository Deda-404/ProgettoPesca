import { useEffect, useMemo, useState } from 'react'
import { Camera, ShieldCheck, Trash2, UserRound, UsersRound, XCircle } from 'lucide-react'
import { createGroup, deleteGroup, loadMyGroups } from '../lib/groups'
import {
  cancelAccountDeletion,
  loadAdminMembers,
  loadPhotoStorageBytes,
  loadProfile,
  removeProfilePhoto,
  replaceProfilePhoto,
  requestAccountDeletion,
  touchLastSeen,
  updateDisplayName,
} from '../lib/profile'
import './ProfileAccountPanel.css'

function bytesLabel(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function deletionDeadline(value) {
  if (!value) return ''
  const date = new Date(value)
  date.setDate(date.getDate() + 30)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProfileAccountPanel({ user }) {
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [photoBytes, setPhotoBytes] = useState(0)
  const [groups, setGroups] = useState([])
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    if (!user?.id) return
    const [nextProfile, nextBytes, nextGroups] = await Promise.all([
      loadProfile(user.id),
      loadPhotoStorageBytes(),
      loadMyGroups(user.id),
    ])
    setProfile(nextProfile)
    setName(nextProfile?.displayName || user.email?.split('@')[0] || '')
    setPhotoBytes(nextBytes)
    setGroups(nextGroups)
    if (nextProfile?.isAdmin) setMembers(await loadAdminMembers())
  }

  useEffect(() => {
    if (!user?.id) return
    touchLastSeen(user.id).finally(() => refresh().catch(() => setStatus('Non riesco a caricare tutti i dati del profilo.')))
  }, [user?.id])

  const onlineCount = useMemo(() => {
    const threshold = Date.now() - 5 * 60_000
    return members.filter((item) => item.last_seen_at && new Date(item.last_seen_at).getTime() >= threshold).length
  }, [members])

  async function saveName(event) {
    event.preventDefault()
    setSaving(true)
    setStatus('')
    try {
      const next = await updateDisplayName(user.id, name)
      setProfile(next)
      setStatus('Nome utente aggiornato.')
    } catch (error) {
      setStatus(error?.message || 'Impossibile aggiornare il nome utente.')
    } finally { setSaving(false) }
  }

  async function changePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setSaving(true)
    setStatus('Ottimizzo e salvo la foto profilo…')
    try {
      const photo = await replaceProfilePhoto(user.id, file)
      setProfile((current) => ({ ...current, ...photo }))
      setPhotoBytes(await loadPhotoStorageBytes())
      setStatus('Foto profilo aggiornata.')
    } catch (error) {
      setStatus(error?.message || 'Impossibile aggiornare la foto profilo.')
    } finally { setSaving(false) }
  }

  async function removePhoto() {
    setSaving(true)
    try {
      await removeProfilePhoto(user.id)
      setProfile((current) => ({ ...current, avatarPath: '', avatarUrl: '' }))
      setPhotoBytes(await loadPhotoStorageBytes())
      setStatus('Foto profilo rimossa.')
    } catch (error) { setStatus(error?.message || 'Impossibile rimuovere la foto.') }
    finally { setSaving(false) }
  }

  async function addGroup(event) {
    event.preventDefault()
    if (!groupName.trim()) return
    setSaving(true)
    try {
      const created = await createGroup(user.id, groupName)
      setGroups((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setGroupName('')
      setStatus('Gruppo creato. Ora può essere usato per la visibilità di spot e catture.')
    } catch (error) { setStatus(error?.message || 'Impossibile creare il gruppo.') }
    finally { setSaving(false) }
  }

  async function removeGroup(item) {
    if (!window.confirm(`Eliminare il gruppo “${item.name}”?`)) return
    try {
      await deleteGroup(user.id, item.id)
      setGroups((current) => current.filter((group) => group.id !== item.id))
      setStatus('Gruppo eliminato.')
    } catch (error) { setStatus(error?.message || 'Impossibile eliminare il gruppo.') }
  }

  async function requestDeletion() {
    if (!window.confirm('Richiedere la cancellazione dell’account? Potrai annullarla entro 30 giorni.')) return
    try {
      const requestedAt = await requestAccountDeletion(user.id)
      setProfile((current) => ({ ...current, deletionRequestedAt: requestedAt }))
      setStatus('Richiesta registrata. Puoi annullarla prima della scadenza indicata.')
    } catch (error) { setStatus(error?.message || 'Impossibile registrare la richiesta.') }
  }

  async function cancelDeletion() {
    try {
      await cancelAccountDeletion(user.id)
      setProfile((current) => ({ ...current, deletionRequestedAt: null }))
      setStatus('Richiesta di cancellazione annullata.')
    } catch (error) { setStatus(error?.message || 'Impossibile annullare la richiesta.') }
  }

  if (!user) return null

  return (
    <>
      {status && <div className="status-banner">{status}</div>}
      <section className="section-block profile-account-card">
        <div className="profile-avatar-wrap">
          {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="Foto profilo" /> : <UserRound size={34} />}
        </div>
        <div className="profile-account-main">
          <form onSubmit={saveName} className="profile-name-form">
            <label>Nome utente<input value={name} onChange={(event) => setName(event.target.value)} maxLength="80" required /></label>
            <button type="submit" className="secondary-button" disabled={saving}>Salva nome</button>
          </form>
          <div className="profile-photo-actions">
            <label className="secondary-button"><Camera size={17} /> Cambia foto<input type="file" accept="image/*" onChange={changePhoto} hidden disabled={saving} /></label>
            {profile?.avatarPath && <button type="button" className="secondary-button" onClick={removePhoto} disabled={saving}><Trash2 size={17} /> Rimuovi foto</button>}
          </div>
          <small>Spazio totale foto: <strong>{bytesLabel(photoBytes)}</strong></small>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title-row"><h2>Gruppi</h2><span className="muted-label">per visibilità gruppo</span></div>
        <form className="profile-group-form" onSubmit={addGroup}>
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Nome gruppo" maxLength="80" />
          <button className="secondary-button" disabled={saving || !groupName.trim()}>Crea</button>
        </form>
        <div className="profile-group-list">
          {groups.length ? groups.map((group) => (
            <div key={group.id}><span><UsersRound size={16} /> {group.name}</span>{group.ownerId === user.id && <button type="button" onClick={() => removeGroup(group)} aria-label={`Elimina ${group.name}`}><Trash2 size={15} /></button>}</div>
          )) : <small>Nessun gruppo. Creane uno per condividere spot o catture con quel gruppo.</small>}
        </div>
      </section>

      <section className="section-block account-deletion-card">
        <div><strong>Cancellazione account</strong><span>{profile?.deletionRequestedAt ? `Richiesta attiva · scadenza ${deletionDeadline(profile.deletionRequestedAt)}` : 'Nessuna richiesta attiva'}</span></div>
        {profile?.deletionRequestedAt
          ? <button type="button" className="secondary-button" onClick={cancelDeletion}><XCircle size={17} /> Annulla richiesta</button>
          : <button type="button" className="secondary-button" onClick={requestDeletion}><Trash2 size={17} /> Richiedi cancellazione</button>}
      </section>

      {profile?.isAdmin && (
        <section className="section-block admin-card">
          <div className="section-title-row"><h2><ShieldCheck size={18} /> Amministrazione</h2><span className="status-pill ready">Admin</span></div>
          <p>{members.length} profili · {onlineCount} attivi negli ultimi 5 minuti.</p>
          <div className="admin-member-list">
            {members.map((item) => <div key={item.id}><strong>{item.display_name || 'Utente XFish'}</strong><span>{item.last_seen_at ? new Date(item.last_seen_at).toLocaleString('it-IT') : 'Mai visto online'}{item.is_admin ? ' · admin' : ''}</span></div>)}
          </div>
        </section>
      )}
    </>
  )
}
