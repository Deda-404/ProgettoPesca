import { useMemo, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import './CatchSpotPrompt.css'

const SPOT_TYPES = [
  ['spiaggia', 'Spiaggia'],
  ['scoglio', 'Scoglio'],
  ['foce', 'Foce'],
  ['porto', 'Porto'],
  ['barca', 'Barca'],
  ['altro', 'Altro'],
]

function formatCoordinate(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(5) : '—'
}

export default function CatchSpotPrompt({ item, saving, onDismiss, onSave }) {
  const suggestedName = useMemo(() => {
    const label = item?.locationLabel?.trim()
    return label && label !== 'Posizione GPS' ? label : ''
  }, [item?.locationLabel])
  const [name, setName] = useState(suggestedName)
  const [type, setType] = useState('altro')

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || saving) return
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      notes: '',
      isPrivate: true,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      photoPath: '',
      photoUrl: '',
      photoLocalKey: '',
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onDismiss}>
      <section className="catch-modal catch-spot-prompt" role="dialog" aria-modal="true" aria-labelledby="catch-spot-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">Posizione cattura</div>
            <h2 id="catch-spot-title">Salvare questo punto come spot?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onDismiss} aria-label="Non salvare lo spot"><X /></button>
        </div>

        <p className="catch-spot-copy">
          La cattura è già stata salvata. Puoi aggiungere queste coordinate ai tuoi spot e collegare automaticamente la cattura al nuovo punto.
        </p>

        <div className="catch-spot-coordinate"><MapPin size={18} /><strong>{formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}</strong></div>

        <form className="catch-spot-form" onSubmit={submit}>
          <label>Nome spot<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="es. Scogliera del pontile" required /></label>
          <label>Tipo<select value={type} onChange={(event) => setType(event.target.value)}>{SPOT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <small>Il nuovo spot viene creato privato. Potrai modificarlo dalla Mappa.</small>
          <div className="catch-spot-actions">
            <button className="secondary-button" type="button" onClick={onDismiss} disabled={saving}>Non ora</button>
            <button className="primary-button" type="submit" disabled={!name.trim() || saving}>{saving ? 'Salvataggio…' : 'Salva e collega spot'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
