import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  Backpack,
  BarChart3,
  Fish,
  LogOut,
  MapPin,
  MapPinned,
  Moon,
  NotebookTabs,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react'
import AuthPanel from './components/AuthPanel'
import CatchEntryModal from './components/CatchEntryModal'
import CatchPhoto from './components/CatchPhoto'
import LiveForecastView from './components/LiveForecastView'
import { DEFAULT_LOCATION, isInItaly, nearestPreset } from './config/locations'
import { useAuth } from './hooks/useAuth'
import { useFishingForecast } from './hooks/useFishingForecast'
import { createRemoteCatch, deleteRemoteCatch, loadRemoteCatches } from './lib/catches'
import { createRemoteGear, deleteRemoteGear, loadRemoteGear, updateRemoteGear } from './lib/gear'
import { deleteLocalCatchPhoto, saveLocalCatchPhoto } from './lib/photos'
import { deleteLocalSpotPhoto, saveLocalSpotPhoto } from './lib/spotPhotos'
import { createRemoteSpot, deleteRemoteSpot, loadRemoteSpots } from './lib/spots'
import { supabase, supabaseConfigured } from './lib/supabase'
import { loadLocalState, saveLocalState } from './lib/storage'
import './journalSearch.css'

const SpotMapView = lazy(() => import('./components/SpotMapView'))
const GearInventoryView = lazy(() => import('./components/GearInventoryView'))
const StatsView = lazy(() => import('./components/StatsView'))

const navItems = [
  { id: 'forecast', label: 'Previsioni', icon: Sun },
  { id: 'map', label: 'Mappa', icon: MapPinned },
  { id: 'journal', label: 'Diario', icon: NotebookTabs },
  { id: 'gear', label: 'Attrezzatura', icon: Backpack },
  { id: 'stats', label: 'Statistiche', icon: BarChart3 },
]

function gearName(item) {
  return [item?.brand, item?.model].filter(Boolean).join(' ') || item?.category || ''
}

function JournalView({ catches, spots, gear, onOpenCatch, onOpenMap, onDeleteCatch, onOpenStats, cloudEnabled, syncStatus }) {
  const [search, setSearch] = useState('')
  const spotById = useMemo(() => new Map(spots.map((spot) => [spot.id, spot])), [spots])
  const gearById = useMemo(() => new Map(gear.map((item) => [item.id, item])), [gear])

  function catchLocation(item) {
    const linkedSpot = item.spotId ? spotById.get(item.spotId) : null
    const hasCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
    return {
      label: item.locationLabel || linkedSpot?.name || '',
      hasCoordinates: hasCoordinates || Boolean(linkedSpot),
    }
  }

  function catchGear(item) {
    return (item.gearIds ?? []).map((id) => gearById.get(id)).filter(Boolean)
  }

  const filteredCatches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return catches

    return catches.filter((item) => {
      const linkedSpot = item.spotId ? spotById.get(item.spotId) : null
      const linkedGear = (item.gearIds ?? []).map((id) => gearById.get(id)).filter(Boolean)
      const date = item.caughtAt ? new Date(item.caughtAt).toLocaleDateString('it-IT') : ''
      const text = [
        item.species,
        item.lure,
        item.notes,
        item.locationLabel,
        linkedSpot?.name,
        date,
        ...linkedGear.map(gearName),
      ].filter(Boolean).join(' ').toLowerCase()
      return text.includes(term)
    })
  }, [catches, gearById, search, spotById])

  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Archivio personale</div>
          <h1>Diario catture</h1>
          <p>{cloudEnabled ? 'Catture, foto e attrezzatura sono sincronizzate con il tuo account XFish.' : 'Modalità ospite: dati e foto restano soltanto su questo dispositivo.'}</p>
        </div>
        <div className="quick-actions">
          <button className="secondary-button" onClick={onOpenStats}><BarChart3 size={18} /> Statistiche</button>
          <button className="primary-button" onClick={onOpenCatch}><Plus size={18} /> Nuova cattura</button>
        </div>
      </section>

      {syncStatus && <div className="status-banner">{syncStatus}</div>}

      {catches.length > 0 && (
        <section className="journal-search-panel" aria-label="Ricerca diario catture">
          <label className="journal-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca pesce, esca, spot, note o attrezzatura…"
              aria-label="Cerca tra le mie catture"
            />
          </label>
          <span>{search.trim() ? `${filteredCatches.length}/${catches.length} catture` : `${catches.length} catture`}</span>
        </section>
      )}

      {catches.length === 0 ? (
        <section className="section-block empty-state">
          <Fish size={34} />
          <h2>Nessuna cattura registrata</h2>
          <p>Usa il pulsante “Nuova cattura” per iniziare il tuo diario.</p>
        </section>
      ) : filteredCatches.length === 0 ? (
        <section className="section-block empty-state journal-no-results">
          <Search size={34} />
          <h2>Nessuna cattura trovata</h2>
          <p>Modifica la ricerca per vedere di nuovo le catture del diario.</p>
        </section>
      ) : (
        <section className="journal-list">
          {filteredCatches.map((item) => {
            const location = catchLocation(item)
            const linkedGear = catchGear(item)
            const visibleGear = linkedGear.slice(0, 3).map(gearName).filter(Boolean)
            const extraGear = Math.max(0, linkedGear.length - visibleGear.length)

            return (
              <article className="catch-card" key={item.id}>
                <div className="catch-icon"><Fish /></div>
                <div>
                  <div className="catch-title-row">
                    <h2>{item.species}</h2>
                    <span>{new Date(item.caughtAt).toLocaleDateString('it-IT')}</span>
                  </div>
                  <CatchPhoto item={item} />
                  <p>{[item.lure, item.weight ? `${item.weight} kg` : '', item.length ? `${item.length} cm` : ''].filter(Boolean).join(' · ') || 'Nessun dettaglio aggiuntivo'}</p>
                  {location.label && <div className="catch-location-line"><MapPin size={14} /> {location.label}</div>}
                  {visibleGear.length > 0 && (
                    <div className="catch-location-line"><Backpack size={14} /> {visibleGear.join(' · ')}{extraGear ? ` · +${extraGear}` : ''}</div>
                  )}
                  {item.notes && <small>{item.notes}</small>}
                  <div className="catch-card-actions">
                    {location.hasCoordinates && (
                      <button type="button" className="catch-map-link" onClick={() => onOpenMap(item)}>
                        <MapPinned size={15} /> Vedi sulla mappa
                      </button>
                    )}
                    <button type="button" className="catch-delete-link" onClick={() => onDeleteCatch(item)}>
                      <Trash2 size={15} /> Elimina
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </>
  )
}

function ProfileView({ user, guestMode, onSignOut, onExitGuest, onOpenStats, locationLabel, catches, spots, gear, theme, onToggleTheme }) {
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Ospite'
  const geolocatedCatches = catches.filter((item) => (
    Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
  ) || item.spotId).length
  const catchesWithGear = catches.filter((item) => (item.gearIds ?? []).length > 0).length
  const catchesWithPhotos = catches.filter((item) => item.photoPath || item.photoLocalKey || item.photoUrl).length
  const spotsWithPhotos = spots.filter((item) => item.photoPath || item.photoLocalKey || item.photoUrl).length
  const lightTheme = theme === 'light'

  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Account</div>
          <h1>{displayName}</h1>
          <p>{user?.email || 'Stai usando XFish senza account.'}</p>
        </div>
      </section>

      <section className="section-block theme-card" aria-label="Tema XFish">
        <div>
          <strong>Tema</strong>
          <span>{lightTheme ? 'Chiaro · colori marini di superficie' : 'Scuro · colori del mare profondo'}</span>
        </div>
        <button className="secondary-button theme-toggle" type="button" onClick={onToggleTheme} aria-label={lightTheme ? 'Attiva tema scuro' : 'Attiva tema chiaro'}>
          {lightTheme ? <Moon size={18} /> : <Sun size={18} />}
          {lightTheme ? 'Tema scuro' : 'Tema chiaro'}
        </button>
      </section>

      <section className="section-block connection-list">
        <div className="connection-row">
          <div><strong>Supabase</strong><span>Autenticazione, database e sincronizzazione</span></div>
          <span className={supabaseConfigured ? 'status-pill ready' : 'status-pill pending'}>{supabaseConfigured ? 'Configurato' : 'Da collegare'}</span>
        </div>
        <div className="connection-row">
          <div><strong>Cloud XFish</strong><span>{user ? 'Dati sincronizzati tra i tuoi dispositivi' : 'Disponibile dopo l’accesso'}</span></div>
          <span className={user ? 'status-pill ready' : 'status-pill pending'}>{user ? 'Attivo' : 'Locale'}</span>
        </div>
        <div className="connection-row">
          <div><strong>Area previsioni</strong><span>Italia · priorità costa Livorno–La Spezia</span></div>
          <span className="status-pill ready">{locationLabel}</span>
        </div>
        <div className="connection-row">
          <div><strong>Mappa privata</strong><span>{spots.length} spot · {geolocatedCatches} catture geolocalizzate</span></div>
          <span className="status-pill ready">Attiva</span>
        </div>
        <div className="connection-row">
          <div><strong>Attrezzatura</strong><span>{gear.length} elementi · {catchesWithGear} catture collegate</span></div>
          <span className="status-pill ready">Attiva</span>
        </div>
        <div className="connection-row">
          <div><strong>Foto private</strong><span>{catchesWithPhotos} catture · {spotsWithPhotos} spot con foto</span></div>
          <span className="status-pill ready">≤ 512 KB</span>
        </div>
        <div className="connection-row">
          <div><strong>Statistiche</strong><span>Calcolate dal diario sul dispositivo, senza API aggiuntive</span></div>
          <span className="status-pill ready">Attive</span>
        </div>
        <div className="connection-row">
          <div><strong>PWA</strong><span>Installazione dalla schermata home di Android/desktop</span></div>
          <span className="status-pill ready">Attiva</span>
        </div>
      </section>

      <section className="quick-actions">
        <button className="primary-button" onClick={onOpenStats}><BarChart3 size={18} /> Apri statistiche</button>
        {user && <button className="secondary-button" onClick={onSignOut}><LogOut size={18} /> Esci dall’account</button>}
        {guestMode && supabaseConfigured && <button className="primary-button" onClick={onExitGuest}>Accedi a XFish</button>}
      </section>
    </>
  )
}

function LoadingScreen() {
  return <div className="auth-screen"><section className="auth-card"><div className="auth-brand-mark"><Fish size={34} /></div><div className="eyebrow">XFish</div><h1>Caricamento…</h1><p className="auth-copy">Sto ripristinando la tua sessione.</p></section></div>
}

function SectionLoadingScreen({ icon: Icon, title, text }) {
  return (
    <section className="section-block forecast-loading">
      <Icon size={32} />
      <strong>{title}</strong>
      <span>{text}</span>
    </section>
  )
}

function App() {
  const { user, loading: authLoading } = useAuth()
  const [guestMode, setGuestMode] = useState(() => loadLocalState('xfish:guest-mode', false))
  const [theme, setTheme] = useState(() => loadLocalState('xfish:theme', 'dark') === 'light' ? 'light' : 'dark')
  const [activeView, setActiveView] = useState('forecast')
  const [catchModalOpen, setCatchModalOpen] = useState(false)
  const [savingCatch, setSavingCatch] = useState(false)
  const [savingSpot, setSavingSpot] = useState(false)
  const [savingGear, setSavingGear] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [syncStatus, setSyncStatus] = useState('')
  const [spotStatus, setSpotStatus] = useState('')
  const [gearStatus, setGearStatus] = useState('')
  const [forecastLocation, setForecastLocation] = useState(() => loadLocalState('xfish:forecast-location', DEFAULT_LOCATION))
  const [catches, setCatches] = useState(() => loadLocalState('xfish:catches', loadLocalState('progetto-pesca:catches', [])))
  const [spots, setSpots] = useState(() => loadLocalState('xfish:spots', []))
  const [gear, setGear] = useState(() => loadLocalState('xfish:gear', []))
  const { data: forecast, loading: forecastLoading, error: forecastError } = useFishingForecast(forecastLocation)

  useEffect(() => saveLocalState('xfish:guest-mode', guestMode), [guestMode])
  useEffect(() => saveLocalState('xfish:forecast-location', forecastLocation), [forecastLocation])
  useEffect(() => {
    saveLocalState('xfish:theme', theme)
    document.documentElement.dataset.xfishTheme = theme
  }, [theme])

  useEffect(() => {
    if (user) setGuestMode(false)
  }, [user])

  useEffect(() => {
    if (!user) return undefined

    let cancelled = false
    setSyncStatus('Sincronizzazione cloud…')
    loadRemoteCatches(user.id)
      .then((remote) => {
        if (cancelled) return
        setCatches(remote)
        setSyncStatus('Diario e foto sincronizzati con XFish Cloud.')
      })
      .catch(() => {
        if (!cancelled) setSyncStatus('Non riesco a sincronizzare il diario. Riproveremo più tardi.')
      })

    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (guestMode && !user) saveLocalState('xfish:catches', catches)
  }, [catches, guestMode, user])

  useEffect(() => {
    if (!user) {
      if (guestMode) setSpots(loadLocalState('xfish:spots', []))
      setSpotStatus('')
      return undefined
    }

    let cancelled = false
    setSpotStatus('Sincronizzazione spot…')
    loadRemoteSpots(user.id)
      .then((remote) => {
        if (cancelled) return
        setSpots(remote)
        setSpotStatus('Spot e foto sincronizzati con XFish Cloud.')
      })
      .catch(() => {
        if (!cancelled) setSpotStatus('Non riesco a sincronizzare gli spot. Riprova più tardi.')
      })

    return () => { cancelled = true }
  }, [user, guestMode])

  useEffect(() => {
    if (!user) {
      if (guestMode) setGear(loadLocalState('xfish:gear', []))
      setGearStatus('')
      return undefined
    }

    let cancelled = false
    setGearStatus('Sincronizzazione attrezzatura…')
    loadRemoteGear(user.id)
      .then((remote) => {
        if (cancelled) return
        setGear(remote)
        setGearStatus('Attrezzatura sincronizzata con XFish Cloud.')
      })
      .catch(() => {
        if (!cancelled) setGearStatus('Non riesco a sincronizzare l’attrezzatura. Riprova più tardi.')
      })

    return () => { cancelled = true }
  }, [user, guestMode])

  useEffect(() => {
    if (guestMode && !user) saveLocalState('xfish:gear', gear)
  }, [gear, guestMode, user])

  const activeLabel = useMemo(() => navItems.find((item) => item.id === activeView)?.label || 'XFish', [activeView])
  const initials = useMemo(() => {
    const source = user?.user_metadata?.display_name || user?.email || 'XF'
    return source.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'XF'
  }, [user])

  const locationLabel = forecastLocation.name || 'Posizione GPS'

  function enterGuestMode() {
    setCatches(loadLocalState('xfish:catches', loadLocalState('progetto-pesca:catches', [])))
    setSpots(loadLocalState('xfish:spots', []))
    setGear(loadLocalState('xfish:gear', []))
    setGuestMode(true)
  }

  function selectForecastLocation(location) {
    setForecastLocation({ name: location.name, latitude: location.latitude, longitude: location.longitude })
    setLocationStatus(`Previsioni aggiornate su ${location.name}.`)
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationStatus('La geolocalizzazione non è supportata da questo browser.')
      return
    }

    setLocationStatus('Rilevamento posizione…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        const nearest = nearestPreset(coordinates)
        const closeToCoreCoast = nearest?.distance < 0.025
        const name = closeToCoreCoast ? `GPS · ${nearest.name}` : 'Posizione GPS'
        setForecastLocation({ ...coordinates, name })
        setLocationStatus(
          isInItaly(coordinates)
            ? `Posizione aggiornata · precisione circa ${Math.round(position.coords.accuracy)} m. Meteo su cella terrestre e mare sulla cella marina più vicina.`
            : 'Posizione fuori dall’Italia: XFish è configurato e verificato principalmente per il territorio italiano.',
        )
      },
      () => setLocationStatus('Non è stato possibile ottenere la posizione. Controlla i permessi del browser.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function saveCatch(item) {
    setSavingCatch(true)
    setSyncStatus('')
    try {
      if (user) {
        const saved = await createRemoteCatch(user.id, item)
        setCatches((current) => [saved, ...current])
        setSyncStatus(item.photoBlob ? 'Cattura, foto e attrezzatura salvate nel cloud.' : 'Cattura e attrezzatura salvate nel cloud.')
      } else {
        const { photoBlob, ...localItem } = item
        let photoLocalKey = ''
        if (photoBlob) photoLocalKey = await saveLocalCatchPhoto(item.id, photoBlob)
        const saved = {
          ...localItem,
          gearIds: item.gearIds ?? [],
          photoLocalKey,
          photoPath: '',
          photoUrl: '',
          synced: false,
        }
        setCatches((current) => [saved, ...current])
        setSyncStatus(photoLocalKey ? 'Cattura e foto salvate su questo dispositivo.' : 'Cattura salvata su questo dispositivo.')
      }
      setCatchModalOpen(false)
      setActiveView('journal')
    } catch (error) {
      setSyncStatus(error?.message || 'Impossibile salvare la cattura.')
      setActiveView('journal')
    } finally {
      setSavingCatch(false)
    }
  }

  async function deleteCatch(item) {
    if (!window.confirm(`Eliminare definitivamente la cattura “${item.species}”?`)) return

    setSyncStatus('Eliminazione cattura…')
    try {
      if (user) {
        const result = await deleteRemoteCatch(user.id, item)
        setCatches((current) => current.filter((candidate) => candidate.id !== item.id))
        setSyncStatus(result.photoCleanupFailed ? 'Cattura eliminata. La pulizia della foto verrà riprovata in seguito.' : 'Cattura e foto eliminate dal cloud.')
      } else {
        if (item.photoLocalKey) await deleteLocalCatchPhoto(item.photoLocalKey)
        setCatches((current) => current.filter((candidate) => candidate.id !== item.id))
        setSyncStatus('Cattura eliminata dal dispositivo.')
      }
    } catch (error) {
      setSyncStatus(error?.message || 'Impossibile eliminare la cattura.')
    }
  }

  async function saveSpot(spot) {
    setSavingSpot(true)
    setSpotStatus('')
    try {
      if (user) {
        const saved = await createRemoteSpot(user.id, spot)
        setSpots((current) => [saved, ...current])
        setSpotStatus(spot.photoBlob ? 'Spot e foto salvati nel cloud.' : 'Spot salvato nel cloud.')
      } else {
        const { photoBlob, ...localSpot } = spot
        const id = spot.id || crypto.randomUUID()
        let photoLocalKey = ''
        if (photoBlob) photoLocalKey = await saveLocalSpotPhoto(id, photoBlob)
        const saved = {
          ...localSpot,
          id,
          photoLocalKey,
          photoPath: '',
          photoUrl: '',
          createdAt: new Date().toISOString(),
          synced: false,
        }
        const next = [saved, ...spots]
        setSpots(next)
        saveLocalState('xfish:spots', next)
        setSpotStatus(photoLocalKey ? 'Spot e foto salvati su questo dispositivo.' : 'Spot salvato su questo dispositivo.')
      }
      return true
    } catch (error) {
      setSpotStatus(error?.message || 'Impossibile salvare lo spot.')
      return false
    } finally {
      setSavingSpot(false)
    }
  }

  async function deleteSpot(spot) {
    setSpotStatus('')
    try {
      if (user) {
        const result = await deleteRemoteSpot(user.id, spot)
        setSpots((current) => current.filter((item) => item.id !== spot.id))
        setSpotStatus(result.photoCleanupFailed
          ? 'Spot eliminato. La pulizia della foto verrà riprovata in seguito.'
          : 'Spot e relativa foto eliminati dal cloud. Le coordinate delle catture già registrate restano memorizzate.')
      } else {
        if (spot.photoLocalKey) await deleteLocalSpotPhoto(spot.photoLocalKey)
        const next = spots.filter((item) => item.id !== spot.id)
        setSpots(next)
        saveLocalState('xfish:spots', next)
        setSpotStatus('Spot e relativa foto eliminati dal dispositivo.')
      }
    } catch (error) {
      setSpotStatus(error?.message || 'Impossibile eliminare lo spot.')
    }
  }

  async function saveGear(item) {
    setSavingGear(true)
    setGearStatus('')
    try {
      if (user) {
        const saved = item.id ? await updateRemoteGear(user.id, item) : await createRemoteGear(user.id, item)
        setGear((current) => item.id
          ? current.map((candidate) => candidate.id === saved.id ? saved : candidate)
          : [saved, ...current])
        setGearStatus(item.id ? 'Attrezzatura aggiornata nel cloud.' : 'Attrezzatura salvata nel cloud.')
      } else {
        const now = new Date().toISOString()
        const saved = item.id
          ? { ...item, updatedAt: now, synced: false }
          : { ...item, id: crypto.randomUUID(), createdAt: now, updatedAt: now, synced: false }
        setGear((current) => item.id
          ? current.map((candidate) => candidate.id === item.id ? saved : candidate)
          : [saved, ...current])
        setGearStatus(item.id ? 'Attrezzatura aggiornata sul dispositivo.' : 'Attrezzatura salvata sul dispositivo.')
      }
      return true
    } catch (error) {
      setGearStatus(error?.message || 'Impossibile salvare l’attrezzatura.')
      return false
    } finally {
      setSavingGear(false)
    }
  }

  async function deleteGear(item) {
    setGearStatus('')
    try {
      if (user) await deleteRemoteGear(user.id, item.id)
      setGear((current) => current.filter((candidate) => candidate.id !== item.id))
      setCatches((current) => current.map((caught) => ({
        ...caught,
        gearIds: (caught.gearIds ?? []).filter((gearId) => gearId !== item.id),
      })))
      setGearStatus(user ? 'Elemento eliminato dal cloud e rimosso dalle associazioni.' : 'Elemento eliminato dal dispositivo e rimosso dalle associazioni.')
    } catch (error) {
      setGearStatus(error?.message || 'Impossibile eliminare l’attrezzatura.')
    }
  }

  function openCatchOnMap(item) {
    const spot = item.spotId ? spots.find((candidate) => candidate.id === item.spotId) : null
    const latitude = Number.isFinite(Number(item.latitude)) ? Number(item.latitude) : Number(spot?.latitude)
    const longitude = Number.isFinite(Number(item.longitude)) ? Number(item.longitude) : Number(spot?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

    setForecastLocation({
      latitude,
      longitude,
      name: item.locationLabel || spot?.name || `Cattura · ${item.species}`,
    })
    setActiveView('map')
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setGuestMode(false)
    setCatches([])
    setSpots([])
    setGear([])
    setActiveView('forecast')
  }

  if (supabaseConfigured && authLoading) return <LoadingScreen />
  if (supabaseConfigured && !user && !guestMode) return <AuthPanel onGuest={enterGuestMode} />

  let view
  if (activeView === 'map') {
    view = (
      <Suspense fallback={<SectionLoadingScreen icon={MapPinned} title="Carico la mappa…" text="Leaflet viene scaricato solo quando apri questa sezione, per ridurre traffico e tempi di avvio." />}>
        <SpotMapView
          location={forecastLocation}
          locationLabel={locationLabel}
          spots={spots}
          catches={catches}
          onLocate={locateUser}
          onSaveSpot={saveSpot}
          onDeleteSpot={deleteSpot}
          saving={savingSpot}
          status={spotStatus || locationStatus}
          cloudEnabled={Boolean(user)}
        />
      </Suspense>
    )
  } else if (activeView === 'journal') {
    view = (
      <JournalView
        catches={catches}
        spots={spots}
        gear={gear}
        onOpenCatch={() => setCatchModalOpen(true)}
        onOpenMap={openCatchOnMap}
        onDeleteCatch={deleteCatch}
        onOpenStats={() => setActiveView('stats')}
        cloudEnabled={Boolean(user)}
        syncStatus={syncStatus}
      />
    )
  } else if (activeView === 'gear') {
    view = (
      <Suspense fallback={<SectionLoadingScreen icon={Backpack} title="Carico l’inventario…" text="La sezione attrezzatura viene caricata soltanto quando serve." />}>
        <GearInventoryView
          gear={gear}
          cloudEnabled={Boolean(user)}
          status={gearStatus}
          saving={savingGear}
          onSave={saveGear}
          onDelete={deleteGear}
        />
      </Suspense>
    )
  } else if (activeView === 'stats') {
    view = (
      <Suspense fallback={<SectionLoadingScreen icon={BarChart3} title="Calcolo le statistiche…" text="L’analisi viene caricata solo quando la apri e usa i dati già presenti nel diario." />}>
        <StatsView catches={catches} spots={spots} gear={gear} />
      </Suspense>
    )
  } else if (activeView === 'profile') {
    view = (
      <ProfileView
        user={user}
        guestMode={guestMode}
        onSignOut={signOut}
        onExitGuest={() => setGuestMode(false)}
        onOpenStats={() => setActiveView('stats')}
        locationLabel={locationLabel}
        catches={catches}
        spots={spots}
        gear={gear}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
      />
    )
  } else {
    view = (
      <LiveForecastView
        location={forecastLocation}
        locationLabel={locationLabel}
        locationStatus={locationStatus}
        onLocate={locateUser}
        onSelectPreset={selectForecastLocation}
        onOpenCatch={() => setCatchModalOpen(true)}
        forecast={forecast}
        loading={forecastLoading}
        error={forecastError}
      />
    )
  }

  return (
    <div className="app-frame">
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <div className="brand-mark"><Fish /></div>
          <div><strong>XFish</strong><span>Fishing companion</span></div>
        </div>

        <nav className="desktop-nav" aria-label="Navigazione principale">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? 'active' : ''} onClick={() => setActiveView(id)}><Icon size={19} /> {label}</button>
          ))}
          <button className={activeView === 'profile' ? 'active' : ''} onClick={() => setActiveView('profile')}><Settings size={19} /> Profilo</button>
        </nav>

        <div className="desktop-sidebar-note"><span className="status-dot" /> Italia · mobile-first · PWA</div>
      </aside>

      <div className="app-shell">
        <header className="topbar">
          <div><div className="mobile-brand">XFish</div><div className="location">{activeLabel} · {locationLabel}</div></div>
          <button className="avatar" aria-label="Apri profilo" onClick={() => setActiveView('profile')}>{initials}</button>
        </header>

        <main>{view}</main>

        <nav className="bottom-nav" aria-label="Navigazione mobile">
          <button className={activeView === 'forecast' ? 'active' : ''} onClick={() => setActiveView('forecast')}><Sun /><span>Previsioni</span></button>
          <button className={activeView === 'map' ? 'active' : ''} onClick={() => setActiveView('map')}><MapPinned /><span>Mappa</span></button>
          <button className="add-button" onClick={() => setCatchModalOpen(true)} aria-label="Registra una cattura"><Plus /></button>
          <button className={activeView === 'journal' || activeView === 'stats' ? 'active' : ''} onClick={() => setActiveView('journal')}><NotebookTabs /><span>Diario</span></button>
          <button className={activeView === 'gear' ? 'active' : ''} onClick={() => setActiveView('gear')}><Backpack /><span>Attrezzatura</span></button>
        </nav>
      </div>

      {catchModalOpen && (
        <CatchEntryModal
          onClose={() => setCatchModalOpen(false)}
          onSave={saveCatch}
          saving={savingCatch}
          spots={spots}
          gear={gear}
          activeLocation={forecastLocation}
          activeLocationLabel={locationLabel}
        />
      )}
    </div>
  )
}

export default App