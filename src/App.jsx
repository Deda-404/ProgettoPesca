import { useEffect, useMemo, useState } from 'react'
import {
  Backpack,
  Fish,
  LocateFixed,
  LogOut,
  MapPinned,
  NotebookTabs,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import AuthPanel from './components/AuthPanel'
import LiveForecastView from './components/LiveForecastView'
import { DEFAULT_LOCATION, isInItaly, nearestPreset } from './config/locations'
import { useAuth } from './hooks/useAuth'
import { useFishingForecast } from './hooks/useFishingForecast'
import { createRemoteCatch, loadRemoteCatches } from './lib/catches'
import { supabase, supabaseConfigured } from './lib/supabase'
import { loadLocalState, saveLocalState } from './lib/storage'

const navItems = [
  { id: 'forecast', label: 'Previsioni', icon: Sun },
  { id: 'map', label: 'Mappa', icon: MapPinned },
  { id: 'journal', label: 'Diario', icon: NotebookTabs },
  { id: 'gear', label: 'Attrezzatura', icon: Backpack },
]

function MapView({ location, locationLabel, onLocate }) {
  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Spot personali</div>
          <h1>Mappa</h1>
          <p>La posizione meteo-mare attiva è {locationLabel}. Nel prossimo blocco questa schermata diventerà una mappa reale con spot e catture.</p>
        </div>
        <button className="secondary-button" onClick={onLocate}><LocateFixed size={18} /> Localizzami</button>
      </section>

      <section className="map-placeholder section-block">
        <div className="map-grid" aria-hidden="true" />
        <div className="map-pin"><MapPinned size={34} /></div>
        <div className="map-copy">
          <strong>{locationLabel}</strong>
          <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
        </div>
      </section>
    </>
  )
}

function JournalView({ catches, onOpenCatch, cloudEnabled, syncStatus }) {
  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Archivio personale</div>
          <h1>Diario catture</h1>
          <p>{cloudEnabled ? 'Le catture sono sincronizzate con il tuo account XFish.' : 'Modalità ospite: le catture restano salvate soltanto su questo dispositivo.'}</p>
        </div>
        <button className="primary-button" onClick={onOpenCatch}><Plus size={18} /> Nuova cattura</button>
      </section>

      {syncStatus && <div className="status-banner">{syncStatus}</div>}

      {catches.length === 0 ? (
        <section className="section-block empty-state">
          <Fish size={34} />
          <h2>Nessuna cattura registrata</h2>
          <p>Usa il pulsante “Nuova cattura” per iniziare il tuo diario.</p>
        </section>
      ) : (
        <section className="journal-list">
          {catches.map((item) => (
            <article className="catch-card" key={item.id}>
              <div className="catch-icon"><Fish /></div>
              <div>
                <div className="catch-title-row">
                  <h2>{item.species}</h2>
                  <span>{new Date(item.caughtAt).toLocaleDateString('it-IT')}</span>
                </div>
                <p>{[item.lure, item.weight ? `${item.weight} kg` : '', item.length ? `${item.length} cm` : ''].filter(Boolean).join(' · ') || 'Nessun dettaglio aggiuntivo'}</p>
                {item.notes && <small>{item.notes}</small>}
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}

function GearView() {
  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Inventario personale</div>
          <h1>Attrezzatura</h1>
          <p>La sezione è predisposta per la tabella <code>gear</code> del database XFish.</p>
        </div>
      </section>

      <section className="section-block empty-state">
        <Backpack size={34} />
        <h2>Inventario pronto per il backend</h2>
        <p>Qui aggiungeremo creazione, modifica, foto e associazione dell’attrezzatura alle catture.</p>
      </section>
    </>
  )
}

function ProfileView({ user, guestMode, onSignOut, onExitGuest, locationLabel }) {
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Ospite'

  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Account</div>
          <h1>{displayName}</h1>
          <p>{user?.email || 'Stai usando XFish senza account.'}</p>
        </div>
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
          <div><strong>PWA</strong><span>Installazione dalla schermata home di Android/desktop</span></div>
          <span className="status-pill ready">Attiva</span>
        </div>
      </section>

      <section className="quick-actions">
        {user && <button className="secondary-button" onClick={onSignOut}><LogOut size={18} /> Esci dall’account</button>}
        {guestMode && supabaseConfigured && <button className="primary-button" onClick={onExitGuest}>Accedi a XFish</button>}
      </section>
    </>
  )
}

function CatchModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    species: '',
    caughtAt: new Date().toISOString().slice(0, 16),
    lure: '',
    weight: '',
    length: '',
    notes: '',
  })

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  function submit(event) {
    event.preventDefault()
    if (!form.species.trim() || saving) return
    onSave({ ...form, id: crypto.randomUUID(), species: form.species.trim() })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="catch-modal" role="dialog" aria-modal="true" aria-labelledby="catch-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><div className="eyebrow">Diario XFish</div><h2 id="catch-title">Registra una cattura</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Chiudi"><X /></button>
        </div>

        <form onSubmit={submit} className="catch-form">
          <label>Specie<input autoFocus required value={form.species} onChange={update('species')} placeholder="es. Spigola" /></label>
          <label>Data e ora<input type="datetime-local" value={form.caughtAt} onChange={update('caughtAt')} /></label>
          <label>Esca / artificiale<input value={form.lure} onChange={update('lure')} placeholder="es. Minnow 12 cm" /></label>
          <div className="form-two-columns">
            <label>Peso (kg)<input inputMode="decimal" value={form.weight} onChange={update('weight')} /></label>
            <label>Lunghezza (cm)<input inputMode="decimal" value={form.length} onChange={update('length')} /></label>
          </div>
          <label>Note<textarea rows="3" value={form.notes} onChange={update('notes')} placeholder="Condizioni, recupero, osservazioni…" /></label>
          <button className="primary-button full-width" type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva cattura'}</button>
        </form>
      </section>
    </div>
  )
}

function LoadingScreen() {
  return <div className="auth-screen"><section className="auth-card"><div className="auth-brand-mark"><Fish size={34} /></div><div className="eyebrow">XFish</div><h1>Caricamento…</h1><p className="auth-copy">Sto ripristinando la tua sessione.</p></section></div>
}

function App() {
  const { user, loading: authLoading } = useAuth()
  const [guestMode, setGuestMode] = useState(() => loadLocalState('xfish:guest-mode', false))
  const [activeView, setActiveView] = useState('forecast')
  const [catchModalOpen, setCatchModalOpen] = useState(false)
  const [savingCatch, setSavingCatch] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [syncStatus, setSyncStatus] = useState('')
  const [forecastLocation, setForecastLocation] = useState(() => loadLocalState('xfish:forecast-location', DEFAULT_LOCATION))
  const [catches, setCatches] = useState(() => loadLocalState('xfish:catches', loadLocalState('progetto-pesca:catches', [])))
  const { data: forecast, loading: forecastLoading, error: forecastError } = useFishingForecast(forecastLocation)

  useEffect(() => saveLocalState('xfish:guest-mode', guestMode), [guestMode])
  useEffect(() => saveLocalState('xfish:forecast-location', forecastLocation), [forecastLocation])

  useEffect(() => {
    if (user) setGuestMode(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      saveLocalState('xfish:catches', catches)
      return
    }

    let cancelled = false
    setSyncStatus('Sincronizzazione cloud…')
    loadRemoteCatches(user.id)
      .then((remote) => {
        if (cancelled) return
        setCatches(remote)
        setSyncStatus('Diario sincronizzato con XFish Cloud.')
      })
      .catch(() => {
        if (!cancelled) setSyncStatus('Non riesco a sincronizzare il diario. Riproveremo più tardi.')
      })

    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!user) saveLocalState('xfish:catches', catches)
  }, [catches, user])

  const activeLabel = useMemo(() => navItems.find((item) => item.id === activeView)?.label || 'XFish', [activeView])
  const initials = useMemo(() => {
    const source = user?.user_metadata?.display_name || user?.email || 'XF'
    return source.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'XF'
  }, [user])

  const locationLabel = forecastLocation.name || 'Posizione GPS'

  function selectForecastLocation(location) {
    setForecastLocation({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    })
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
            ? 'Posizione aggiornata. Meteo su cella terrestre e mare sulla cella marina più vicina.'
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
        setSyncStatus('Cattura salvata nel cloud.')
      } else {
        setCatches((current) => [{ ...item, synced: false }, ...current])
      }
      setCatchModalOpen(false)
      setActiveView('journal')
    } catch (error) {
      setSyncStatus(error?.message || 'Impossibile salvare la cattura nel cloud.')
      setActiveView('journal')
    } finally {
      setSavingCatch(false)
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setActiveView('forecast')
  }

  if (supabaseConfigured && authLoading) return <LoadingScreen />
  if (supabaseConfigured && !user && !guestMode) return <AuthPanel onGuest={() => setGuestMode(true)} />

  let view
  if (activeView === 'map') {
    view = <MapView location={forecastLocation} locationLabel={locationLabel} onLocate={locateUser} />
  } else if (activeView === 'journal') {
    view = <JournalView catches={catches} onOpenCatch={() => setCatchModalOpen(true)} cloudEnabled={Boolean(user)} syncStatus={syncStatus} />
  } else if (activeView === 'gear') {
    view = <GearView />
  } else if (activeView === 'profile') {
    view = <ProfileView user={user} guestMode={!user} onSignOut={signOut} onExitGuest={() => setGuestMode(false)} locationLabel={locationLabel} />
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
          <button className={activeView === 'journal' ? 'active' : ''} onClick={() => setActiveView('journal')}><NotebookTabs /><span>Diario</span></button>
          <button className={activeView === 'gear' ? 'active' : ''} onClick={() => setActiveView('gear')}><Backpack /><span>Attrezzatura</span></button>
        </nav>
      </div>

      {catchModalOpen && <CatchModal onClose={() => setCatchModalOpen(false)} onSave={saveCatch} saving={savingCatch} />}
    </div>
  )
}

export default App
