import { useEffect, useState } from 'react'
import { loadMyGroups } from '../lib/groups'

export default function VisibilityFields({ userId, value, groupId, onChange, disabled = false }) {
  const [groups, setGroups] = useState([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!userId) return
    loadMyGroups(userId).then(setGroups).catch(() => setStatus('Gruppi non disponibili.'))
  }, [userId])

  return <div className="visibility-fields">
    <label>Visibilità
      <select value={value || 'private'} disabled={disabled} onChange={(event) => onChange(event.target.value, event.target.value === 'group' ? groupId : '')}>
        <option value="private">Privato</option>
        <option value="global">Globale</option>
        <option value="group" disabled={!groups.length}>Gruppo</option>
      </select>
    </label>
    {value === 'group' && <label>Gruppo
      <select value={groupId || ''} required disabled={disabled} onChange={(event) => onChange('group', event.target.value)}>
        <option value="">Seleziona gruppo</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
    </label>}
    {status && <small className="catch-location-status">{status}</small>}
  </div>
}
