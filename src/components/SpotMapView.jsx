import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, MapPin, Plus, Trash2 } from 'lucide-react'
import './SpotMapView.css'

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

export default function SpotMapView({
  location,
  locationLabel,
  spots,
  onLocate,
  onSaveSpot,
  onDeleteSpot,
  saving,
  status,
  cloudEnabled,
}) {
  const mapNodeRef = useRef(null)
  const mapRef = useRef(null)
  const spotLayerRef = useRef(null)
  const draftLayerRef = useRef(null)
  const [draftPoint, setDraftPoint] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'spiaggia', notes: '', isPrivate: true })

  const center = useMemo(() => [Number(location.latitude), Number(location.longitude)], [location.latitude, location.longitude])

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return

    const map = L.map(mapNodeRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    spotLayerRef.current = L.layerGroup().addTo(map)

    map.on('click', (event) => {
      setDraftPoint({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    })

    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView(center, Math.max(mapRef.current.getZoom(), 12), { animate: true })
  }, [center])

  useEffect(() => {
    const layer = spotLayerRef.current
    if (!layer) return
    layer.clearLayers()

    spots.forEach((spot) => {
      if (!Number.isFinite(Number(spot.latitude)) || !Number.isFinite(Number(spot.longitude))) return

      const marker = L.circleMarker([spot.latitude, spot.longitude], {
        radius: 8,
        weight: 3,
        color: '#d8f6ed',
        fillColor: '#50bda3',
        fillOpacity: 0.95,
      })

      marker.bindPopup(
        `<strong>${String(spot.name).replaceAll('<', '&lt;')}</strong><br>` +
        `${String(spot.type || 'spot').replaceAll('<', '&lt;')}` +
        `${spot.notes ? `<br>${String(spot.notes).replaceAll('<', '&lt;')}` : ''}`,
      )
      marker.addTo(layer)
    })
  }, [spots])

  useEffect(() => {
    if (!mapRef.current) return
    if (draftLayerRef.current) {
      draftLayerRef.current.remove()
      draftLayerRef.current = null
    }
    if (!draftPoint) return

    draftLayerRef.current = L.circleMarker([draftPoint.latitude, draftPoint.longitude], {
      radius: 10,
      weight: 3,
      color: '#f5d98b',
      fillColor: '#f5d98b',
      fillOpacity: 0.45,
    }).addTo(mapRef.current)
  }, [draftPoint])

  function useCurrentLocation() {
    setDraftPoint({ latitude: Number(location.latitude), longitude: Number(location.longitude) })
    if (mapRef.current) mapRef.current.setView(center, 15, { animate: true })
  }

  async function submit(event) {
    event.preventDefault()
    if (!draftPoint || !form.name.trim() || saving) return

    const success = await onSaveSpot({
      ...draftPoint,
      name: form.name.trim(),
      type: form.type,
      notes: form.notes.trim(),
      isPrivate: form.isPrivate,
    })

    if (success !== false) {
      setForm({ name: '', type: 'spiaggia', notes: '', isPrivate: true })
      setDraftPoint(null)
    }
  }

  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Mappa reale · OpenStreetMap</div>
          <h1>Spot di pesca</h1>
          <p>
            Tocca la mappa per scegliere un punto oppure usa il GPS. Gli spot sono privati per impostazione predefinita.
            {cloudEnabled ? ' Sono sincronizzati con il tuo account XFish.' : ' In modalità ospite restano su questo dispositivo.'}
          </p>
        </div>
        <button className="secondary-button" onClick={onLocate}><LocateFixed size={18} /> Aggiorna GPS</button>
      </section>

      {status && <div className="status-banner">{status}</div>}

      <div className="spot-map-layout">
        <section className="section-block spot-map-card">
          <div className="spot-map-toolbar">
            <div>
              <strong>{locationLabel}</strong>
              <span>{formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}</span>
            </div>
            <button type="button" className="secondary-button" onClick={useCurrentLocation}><MapPin size={17} /> Usa questo punto</button>
          </div>
          <div ref={mapNodeRef} className="spot-map-canvas" aria-label="Mappa interattiva degli spot di pesca" />
        </section>

        <aside className="section-block spot-editor">
          <div className="section-title-row">
            <h2>Nuovo spot</h2>
            <span className="muted-label">{draftPoint ? 'Punto selezionato' : 'Tocca la mappa'}</span>
          </div>

          <form className="spot-form" onSubmit={submit}>
            <label>
              Nome
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="es. Scogliera del pontile" required />
            </label>
            <label>
              Tipo
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                {SPOT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Note
              <textarea rows="3" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Accesso, fondale, esche efficaci…" />
            </label>
            <label className="spot-private-toggle">
              <input type="checkbox" checked={form.isPrivate} onChange={(event) => setForm((current) => ({ ...current, isPrivate: event.target.checked }))} />
              <span>Spot privato</span>
            </label>
            <div className="spot-coordinate-box">
              <span>Coordinate</span>
              <strong>{draftPoint ? `${formatCoordinate(draftPoint.latitude)}, ${formatCoordinate(draftPoint.longitude)}` : 'Nessun punto selezionato'}</strong>
            </div>
            <button className="primary-button full-width" type="submit" disabled={!draftPoint || !form.name.trim() || saving}>
              <Plus size={18} /> {saving ? 'Salvataggio…' : 'Salva spot'}
            </button>
          </form>
        </aside>
      </div>

      <section className="section-block spot-list-card">
        <div className="section-title-row">
          <h2>I miei spot</h2>
          <span className="muted-label">{spots.length}</span>
        </div>

        {spots.length === 0 ? (
          <div className="spot-empty">Nessuno spot salvato. Tocca la mappa per aggiungere il primo.</div>
        ) : (
          <div className="spot-list">
            {spots.map((spot) => (
              <article key={spot.id} className="spot-row">
                <div className="spot-row-icon"><MapPin size={18} /></div>
                <div>
                  <strong>{spot.name}</strong>
                  <span>{spot.type} · {formatCoordinate(spot.latitude)}, {formatCoordinate(spot.longitude)}</span>
                  {spot.notes && <small>{spot.notes}</small>}
                </div>
                <button type="button" className="spot-delete" onClick={() => onDeleteSpot(spot)} aria-label={`Elimina ${spot.name}`}><Trash2 size={17} /></button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
