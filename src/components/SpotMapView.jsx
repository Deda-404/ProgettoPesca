import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Fish, ImagePlus, LocateFixed, MapPin, Plus, Trash2, X } from 'lucide-react'
import SpotPhoto from './SpotPhoto'
import { compressSpotPhoto, deleteLocalSpotPhoto, formatPhotoBytes, saveLocalSpotPhoto } from '../lib/spotPhotos'
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function catchCoordinates(item, spots) {
  const directLat = Number(item.latitude)
  const directLon = Number(item.longitude)
  if (Number.isFinite(directLat) && Number.isFinite(directLon)) return { latitude: directLat, longitude: directLon }

  if (!item.spotId) return null
  const spot = spots.find((candidate) => candidate.id === item.spotId)
  if (!spot) return null

  const latitude = Number(spot.latitude)
  const longitude = Number(spot.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
}

export default function SpotMapView({
  location,
  locationLabel,
  spots,
  catches = [],
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
  const catchLayerRef = useRef(null)
  const draftLayerRef = useRef(null)
  const [draftPoint, setDraftPoint] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'spiaggia', notes: '', isPrivate: true })
  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoInfo, setPhotoInfo] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoStatus, setPhotoStatus] = useState('')
  const [compressingPhoto, setCompressingPhoto] = useState(false)

  const center = useMemo(() => [Number(location.latitude), Number(location.longitude)], [location.latitude, location.longitude])
  const geolocatedCatchCount = useMemo(() => catches.filter((item) => catchCoordinates(item, spots)).length, [catches, spots])

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return

    const map = L.map(mapNodeRef.current, { zoomControl: true, attributionControl: true }).setView(center, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    spotLayerRef.current = L.layerGroup().addTo(map)
    catchLayerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event) => setDraftPoint({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, Math.max(mapRef.current.getZoom(), 12), { animate: true })
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
        `<strong>${escapeHtml(spot.name)}</strong><br>` +
        `${escapeHtml(spot.type || 'spot')}` +
        `${spot.notes ? `<br>${escapeHtml(spot.notes)}` : ''}` +
        `${spot.photoPath || spot.photoLocalKey ? '<br>📷 Foto disponibile' : ''}`,
      )
      marker.addTo(layer)
    })
  }, [spots])

  useEffect(() => {
    const layer = catchLayerRef.current
    if (!layer) return
    layer.clearLayers()

    catches.forEach((item) => {
      const coordinates = catchCoordinates(item, spots)
      if (!coordinates) return
      const marker = L.circleMarker([coordinates.latitude, coordinates.longitude], {
        radius: 6,
        weight: 2,
        color: '#fff2c7',
        fillColor: '#f0b45c',
        fillOpacity: 0.95,
      })
      const date = item.caughtAt ? new Date(item.caughtAt).toLocaleDateString('it-IT') : ''
      const detail = [date, item.lure, item.weight ? `${item.weight} kg` : ''].filter(Boolean).join(' · ')
      marker.bindPopup(
        `<strong>🐟 ${escapeHtml(item.species)}</strong>` +
        `${detail ? `<br>${escapeHtml(detail)}` : ''}` +
        `${item.locationLabel ? `<br>${escapeHtml(item.locationLabel)}` : ''}`,
      )
      marker.addTo(layer)
    })
  }, [catches, spots])

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

  function clearPhoto() {
    setPhotoBlob(null)
    setPhotoInfo(null)
    setPhotoStatus('')
    setPhotoPreview('')
  }

  async function selectPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setCompressingPhoto(true)
    setPhotoStatus('Ottimizzo la foto sul dispositivo…')
    try {
      const result = await compressSpotPhoto(file)
      setPhotoBlob(result.blob)
      setPhotoInfo(result)
      setPhotoPreview(URL.createObjectURL(result.blob))
      setPhotoStatus(`Foto pronta · ${formatPhotoBytes(result.originalBytes)} → ${formatPhotoBytes(result.compressedBytes)}.`)
    } catch (error) {
      clearPhoto()
      setPhotoStatus(error?.message || 'Non riesco a preparare questa foto.')
    } finally {
      setCompressingPhoto(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!draftPoint || !form.name.trim() || saving || compressingPhoto) return

    const spotId = crypto.randomUUID()
    let localPhotoKey = ''

    try {
      if (!cloudEnabled && photoBlob) localPhotoKey = await saveLocalSpotPhoto(spotId, photoBlob)

      const payload = {
        id: spotId,
        ...draftPoint,
        name: form.name.trim(),
        type: form.type,
        notes: form.notes.trim(),
        isPrivate: form.isPrivate,
        photoLocalKey: localPhotoKey,
        photoPath: '',
        photoUrl: '',
        ...(cloudEnabled ? { photoBlob } : {}),
      }

      const success = await onSaveSpot(payload)
      if (success === false) {
        if (localPhotoKey) await deleteLocalSpotPhoto(localPhotoKey)
        return
      }

      setForm({ name: '', type: 'spiaggia', notes: '', isPrivate: true })
      setDraftPoint(null)
      clearPhoto()
    } catch (error) {
      if (localPhotoKey) {
        try { await deleteLocalSpotPhoto(localPhotoKey) } catch { /* pulizia best-effort */ }
      }
      setPhotoStatus(error?.message || 'Non riesco a salvare la foto dello spot.')
    }
  }

  async function deleteSpot(spot) {
    if (!cloudEnabled && spot.photoLocalKey) {
      try { await deleteLocalSpotPhoto(spot.photoLocalKey) } catch { /* il record resta comunque eliminabile */ }
    }
    await onDeleteSpot(spot)
  }

  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Mappa reale · OpenStreetMap</div>
          <h1>Spot e catture</h1>
          <p>
            Tocca la mappa per scegliere un punto oppure usa il GPS. Gli spot sono privati per impostazione predefinita.
            {cloudEnabled ? ' Sono sincronizzati con il tuo account XFish.' : ' In modalità ospite restano su questo dispositivo.'}
          </p>
        </div>
        <button className="secondary-button" onClick={onLocate}><LocateFixed size={18} /> Aggiorna GPS</button>
      </section>

      {status && <div className="status-banner">{status}</div>}

      <div className="map-legend" aria-label="Legenda mappa">
        <span><i className="legend-dot spot" /> Spot {spots.length}</span>
        <span><i className="legend-dot catch" /> Catture {geolocatedCatchCount}</span>
      </div>

      <div className="spot-map-layout">
        <section className="section-block spot-map-card">
          <div className="spot-map-toolbar">
            <div><strong>{locationLabel}</strong><span>{formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}</span></div>
            <button type="button" className="secondary-button" onClick={useCurrentLocation}><MapPin size={17} /> Usa questo punto</button>
          </div>
          <div ref={mapNodeRef} className="spot-map-canvas" aria-label="Mappa interattiva degli spot e delle catture di pesca" />
        </section>

        <aside className="section-block spot-editor">
          <div className="section-title-row">
            <h2>Nuovo spot</h2>
            <span className="muted-label">{draftPoint ? 'Punto selezionato' : 'Tocca la mappa'}</span>
          </div>

          <form className="spot-form" onSubmit={submit}>
            <label>Nome<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="es. Scogliera del pontile" required /></label>
            <label>Tipo<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>{SPOT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Note<textarea rows="3" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Accesso, fondale, esche efficaci…" /></label>

            <section className="spot-photo-editor">
              <div className="spot-photo-editor-title"><ImagePlus size={18} /><div><strong>Foto dello spot</strong><span>Facoltativa · compressa automaticamente sotto 512 KB</span></div></div>
              {photoPreview ? (
                <div className="spot-photo-preview">
                  <img src={photoPreview} alt="Anteprima spot" />
                  <button type="button" onClick={clearPhoto} aria-label="Rimuovi foto"><X size={17} /></button>
                </div>
              ) : (
                <label className="spot-photo-picker">
                  <ImagePlus size={18} /> {compressingPhoto ? 'Ottimizzazione…' : 'Aggiungi foto'}
                  <input type="file" accept="image/*" capture="environment" onChange={selectPhoto} disabled={compressingPhoto || saving} />
                </label>
              )}
              {photoInfo && <small>{photoInfo.width}×{photoInfo.height}px · {formatPhotoBytes(photoInfo.compressedBytes)}</small>}
              {photoStatus && <small>{photoStatus}</small>}
            </section>

            <label className="spot-private-toggle"><input type="checkbox" checked={form.isPrivate} onChange={(event) => setForm((current) => ({ ...current, isPrivate: event.target.checked }))} /><span>Spot privato</span></label>
            <div className="spot-coordinate-box"><span>Coordinate</span><strong>{draftPoint ? `${formatCoordinate(draftPoint.latitude)}, ${formatCoordinate(draftPoint.longitude)}` : 'Nessun punto selezionato'}</strong></div>
            <button className="primary-button full-width" type="submit" disabled={!draftPoint || !form.name.trim() || saving || compressingPhoto}>
              <Plus size={18} /> {saving ? 'Salvataggio…' : 'Salva spot'}
            </button>
          </form>
        </aside>
      </div>

      <section className="section-block spot-list-card">
        <div className="section-title-row"><h2>I miei spot</h2><span className="muted-label">{spots.length}</span></div>
        {spots.length === 0 ? (
          <div className="spot-empty">Nessuno spot salvato. Tocca la mappa per aggiungere il primo.</div>
        ) : (
          <div className="spot-list">
            {spots.map((spot) => (
              <article key={spot.id} className="spot-row">
                <div className="spot-row-icon"><MapPin size={18} /></div>
                <div>
                  <strong>{spot.name}</strong>
                  <SpotPhoto spot={spot} />
                  <span>{spot.type} · {formatCoordinate(spot.latitude)}, {formatCoordinate(spot.longitude)}</span>
                  {spot.notes && <small>{spot.notes}</small>}
                </div>
                <button type="button" className="spot-delete" onClick={() => deleteSpot(spot)} aria-label={`Elimina ${spot.name}`}><Trash2 size={17} /></button>
              </article>
            ))}
          </div>
        )}
      </section>

      {geolocatedCatchCount > 0 && (
        <section className="section-block map-catch-summary">
          <Fish size={20} />
          <div><strong>{geolocatedCatchCount} catture sulla mappa</strong><span>Le catture con GPS o spot associato vengono mostrate con marker dorati.</span></div>
        </section>
      )}
    </>
  )
}
