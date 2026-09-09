import { useMemo, useState } from 'react'
import { Crosshair, MapPin, Navigation, X } from 'lucide-react'
import './CatchEntryModal.css'

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatCoordinate(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(5) : '—'
}

export default function CatchEntryModal({
  onClose,
  onSave,
  saving,
  spots,
  activeLocation,
  activeLocationLabel,
}) {
  const [form, setForm] = useState({
    species: '',
    caughtAt: localDateTimeValue(),
    lure: '',
    weight: '',
    length: '',
    notes: '',
    spotId: '',
  })
  const [coordinates, setCoordinates] = useState(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === form.spotId) || null,
    [form.spotId, spots],
  )

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  function selectSpot(event) {
    const spotId = event.target.value
    const spot = spots.find((item) => item.id === spotId)
    setForm((current) => ({ ...current, spotId }))

    if (spot) {
      setCoordinates({ latitude: Number(spot.latitude), longitude: Number(spot.longitude) })
      setLocationLabel(spot.name)
      setLocationStatus('Coordinate prese dallo spot salvato.')
    } else {
      setCoordinates(null)
      setLocationLabel('')
      setLocationStatus('')
    }
  }

  function useActiveLocation() {
    if (!activeLocation) return
    setCoordinates({
      latitude: Number(activeLocation.latitude),
      longitude: Number(activeLocation.longitude),
    })
    setLocationLabel(activeLocationLabel || activeLocation.name || 'Località attiva')
    setLocationStatus('Coordinate prese dalla località attiva di XFish.')
  }

  function useGps() {
    if (!navigator.geolocation) {
      setLocationStatus('La geolocalizzazione non è disponibile su questo dispositivo.')
      return
    }

    setLocating(true)
    setLocationStatus('Rilevamento GPS preciso…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationLabel(selectedSpot?.name || 'Posizione GPS')
        setLocationStatus(`GPS acquisito · precisione circa ${Math.round(position.coords.accuracy)} m.`)
        setLocating(false)
      },
      () => {
        setLocationStatus('GPS non disponibile. Controlla i permessi del browser.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    )
  }

  function clearLocation() {
    setCoordinates(null)
    setLocationLabel('')
    setLocationStatus('Posizione rimossa dalla cattura.')
  }

  function submit(event) {
    event.preventDefault()
    if (!form.species.trim() || saving || locating) return

    onSave({
      ...form,
      id: crypto.randomUUID(),
      species: form.species.trim(),
      spotId: form.spotId || null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      locationLabel: locationLabel || null,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="catch-modal catch-entry-modal" role="dialog" aria-modal="true" aria-labelledby="catch-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><div className="eyebrow">Diario XFish</div><h2 id="catch-title">Registra una cattura</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi"><X /></button>
        </div>

        <form onSubmit={submit} className="catch-form">
          <label>Specie<input autoFocus required value={form.species} onChange={update('species')} placeholder="es. Spigola" /></label>
          <label>Data e ora<input type="datetime-local" value={form.caughtAt} onChange={update('caughtAt')} /></label>
          <label>Esca / artificiale<input value={form.lure} onChange={update('lure')} placeholder="es. Minnow 12 cm" /></label>
          <div className="form-two-columns">
            <label>Peso (kg)<input inputMode="decimal" value={form.weight} onChange={update('weight')} /></label>
            <label>Lunghezza (cm)<input inputMode="decimal" value={form.length} onChange={update('length')} /></label>
          </div>

          <section className="catch-location-panel">
            <div className="catch-location-title">
              <MapPin size={18} />
              <div><strong>Posizione della cattura</strong><span>Facoltativa · resta privata nel tuo account</span></div>
            </div>

            <label>
              Spot salvato
              <select value={form.spotId} onChange={selectSpot}>
                <option value="">Nessuno spot associato</option>
                {spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name} · {spot.type}</option>)}
              </select>
            </label>

            <div className="catch-location-actions">
              <button type="button" className="secondary-button" onClick={useGps} disabled={locating}>
                <Crosshair size={17} /> {locating ? 'Cerco GPS…' : 'Usa GPS preciso'}
              </button>
              <button type="button" className="secondary-button" onClick={useActiveLocation}>
                <Navigation size={17} /> Località attiva
              </button>
            </div>

            <div className="catch-location-readout">
              <span>{locationLabel || 'Nessuna posizione salvata'}</span>
              <strong>{coordinates ? `${formatCoordinate(coordinates.latitude)}, ${formatCoordinate(coordinates.longitude)}` : '—'}</strong>
              {coordinates && <button type="button" onClick={clearLocation}>Rimuovi posizione</button>}
            </div>
            {locationStatus && <small className="catch-location-status">{locationStatus}</small>}
          </section>

          <label>Note<textarea rows="3" value={form.notes} onChange={update('notes')} placeholder="Condizioni, recupero, osservazioni…" /></label>
          <button className="primary-button full-width" type="submit" disabled={saving || locating}>{saving ? 'Salvataggio…' : 'Salva cattura'}</button>
        </form>
      </section>
    </div>
  )
}
