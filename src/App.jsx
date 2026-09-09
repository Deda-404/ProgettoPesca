import { useEffect, useMemo, useState } from 'react'
import {
  Backpack,
  CloudSun,
  Compass,
  Fish,
  LocateFixed,
  MapPinned,
  Moon,
  NotebookTabs,
  Plus,
  Settings,
  Sun,
  Waves,
  Wind,
  X,
} from 'lucide-react'
import { supabaseConfigured } from './lib/supabase'
import { loadLocalState, saveLocalState } from './lib/storage'

const days = [
  { day: 'Oggi', score: 87 },
  { day: 'Gio', score: 78 },
  { day: 'Ven', score: 92 },
  { day: 'Sab', score: 84 },
  { day: 'Dom', score: 71 },
]

const navItems = [
  { id: 'forecast', label: 'Previsioni', icon: Sun },
  { id: 'map', label: 'Mappa', icon: MapPinned },
  { id: 'journal', label: 'Diario', icon: NotebookTabs },
  { id: 'gear', label: 'Attrezzatura', icon: Backpack },
]

function ScoreCard() {
  return (
    <section className="hero-card">
      <div className="eyebrow">Attività pesci · dati dimostrativi</div>
      <div className="score-row">
        <div>
          <div className="score">87%</div>
          <div className="score-label">Molto buona</div>
        </div>
        <div className="fish-orbit"><Fish size={42} /></div>
      </div>
      <div className="time-grid">
        <div><span>Periodo maggiore</span><strong>19:10–21:05</strong></div>
        <div><span>Periodo minore</span><strong>06:35–07:25</strong></div>
      </div>
    </section>
  )
}

function ForecastView({ location, locationStatus, onLocate, onOpenCatch }) {
  return (
    <>
      <section className="page-intro">
        <div>
          <div className="eyebrow">Oggi</div>
          <h1>Quando conviene pescare?</h1>
          <p>Una schermata rapida da consultare sul posto, pensata prima di tutto per il telefono.</p>
        </div>
        <button className="secondary-button" onClick={onLocate}>
          <LocateFixed size={18} /> {location ? 'Aggiorna posizione' : 'Usa la mia posizione'}
        </button>
      </section>

      {locationStatus && <div className="status-banner">{locationStatus}</div>}
      {location && (
        <div className="location-chip">
          <Compass size={16} /> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </div>
      )}

      <div className="desktop-dashboard-grid">
        <div>
          <ScoreCard />
          <section className="days-strip" aria-label="Previsioni prossimi giorni">
            {days.map((item) => (
              <div className="day-card" key={item.day}>
                <span>{item.day}</span>
                <strong>{item.score}%</strong>
              </div>
            ))}
          </section>
        </div>

        <section className="section-block">
          <div className="section-title-row">
            <h2>Condizioni</h2>
            <span className="muted-label">Demo</span>
          </div>
          <div className="conditions-grid">
            <article><Waves /><span>Mare</span><strong>Poco mosso</strong></article>
            <article><Wind /><span>Vento</span><strong>SW 8 km/h</strong></article>
            <article><CloudSun /><span>Meteo</span><strong>23 °C</strong></article>
            <article><Moon /><span>Luna</span><strong>74%</strong></article>
          </div>
        </section>
      </div>

      <section className="section-block advice-card">
        <div className="advice-icon"><Fish /></div>
        <div>
          <div className="eyebrow">Cosa pesco oggi?</div>
          <h2>Prova la spigola al tramonto</h2>
          <p>Fascia consigliata 19:10–21:05. Minnow 10–12 cm, recupero lento con pause. Questa indicazione verrà sostituita dai dati reali quando collegheremo le API meteo/marine.</p>
        </div>
      </section>

      <section className="quick-actions">
        <button className="primary-button" onClick={onOpenCatch}><Plus size={18} /> Registra una cattura</button>
        <button className="secondary-button" onClick={onLocate}><LocateFixed size={18} /> Salva posizione attuale</button>
      </section>
    </>
  )
}

function MapView({ location, onLocate }) {
  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Spot personali</div>
          <h1>Mappa</h1>
          <p>Base pronta per integrare OpenStreetMap/Leaflet e salvare spot privati su Supabase.</p>
        </div>
        <button className="secondary-button" onClick={onLocate}><LocateFixed size={18} /> Localizzami</button>
      </section>

      <section className="map-placeholder section-block">
        <div className="map-grid" aria-hidden="true" />
        <div className="map-pin"><MapPinned size={34} /></div>
        <div className="map-copy">
          <strong>{location ? 'Posizione rilevata' : 'Mappa interattiva in preparazione'}</strong>
          <span>{location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Il prossimo step sarà il layer reale con spot, catture e preferiti.'}</span>
        </div>
      </section>
    </>
  )
}

function JournalView({ catches, onOpenCatch }) {
  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Archivio personale</div>
          <h1>Diario catture</h1>
          <p>I dati inseriti in questa fase restano salvati sul dispositivo e saranno sincronizzati con Supabase appena il backend sarà collegato.</p>
        </div>
        <button className="primary-button" onClick={onOpenCatch}><Plus size={18} /> Nuova cattura</button>
      </section>

      {catches.length === 0 ? (
        <section className="section-block empty-state">
          <Fish size={34} />
          <h2>Nessuna cattura registrata</h2>
          <p>Usa il pulsante “Nuova cattura” per provare il flusso completo.</p>
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
          <p>Questa sezione verrà collegata alla tabella <code>gear</code> già prevista nel database.</p>
        </div>
      </section>

      <section className="section-block empty-state">
        <Backpack size={34} />
        <h2>Inventario pronto per il backend</h2>
        <p>Nella prossima branch aggiungeremo creazione, modifica, foto e associazione dell’attrezzatura alle catture.</p>
      </section>
    </>
  )
}

function ProfileView() {
  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Configurazione</div>
          <h1>Profilo e cloud</h1>
          <p>Stato dei collegamenti principali dell’app.</p>
        </div>
      </section>

      <section className="section-block connection-list">
        <div className="connection-row">
          <div>
            <strong>Supabase</strong>
            <span>Autenticazione, database e sincronizzazione</span>
          </div>
          <span className={supabaseConfigured ? 'status-pill ready' : 'status-pill pending'}>
            {supabaseConfigured ? 'Configurato' : 'Da collegare'}
          </span>
        </div>
        <div className="connection-row">
          <div>
            <strong>PWA</strong>
            <span>Installazione dalla schermata home di Android/desktop</span>
          </div>
          <span className="status-pill ready">Attiva</span>
        </div>
        <div className="connection-row">
          <div>
            <strong>Render</strong>
            <span>Hosting del branch principale dopo il merge</span>
          </div>
          <span className="status-pill ready">Pronto</span>
        </div>
      </section>
    </>
  )
}

function CatchModal({ onClose, onSave }) {
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
    if (!form.species.trim()) return
    onSave({ ...form, id: crypto.randomUUID(), species: form.species.trim() })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="catch-modal" role="dialog" aria-modal="true" aria-labelledby="catch-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">Diario</div>
            <h2 id="catch-title">Registra una cattura</h2>
          </div>
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
          <button className="primary-button full-width" type="submit">Salva cattura</button>
        </form>
      </section>
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('forecast')
  const [catchModalOpen, setCatchModalOpen] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [catches, setCatches] = useState(() => loadLocalState('progetto-pesca:catches', []))

  useEffect(() => saveLocalState('progetto-pesca:catches', catches), [catches])

  const activeLabel = useMemo(() => navItems.find((item) => item.id === activeView)?.label || 'Progetto Pesca', [activeView])

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationStatus('La geolocalizzazione non è supportata da questo browser.')
      return
    }

    setLocationStatus('Rilevamento posizione…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        setLocationStatus('Posizione aggiornata correttamente.')
      },
      () => setLocationStatus('Non è stato possibile ottenere la posizione. Controlla i permessi del browser.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  function saveCatch(item) {
    setCatches((current) => [item, ...current])
    setCatchModalOpen(false)
    setActiveView('journal')
  }

  let view
  if (activeView === 'map') view = <MapView location={location} onLocate={locateUser} />
  else if (activeView === 'journal') view = <JournalView catches={catches} onOpenCatch={() => setCatchModalOpen(true)} />
  else if (activeView === 'gear') view = <GearView />
  else if (activeView === 'profile') view = <ProfileView />
  else view = <ForecastView location={location} locationStatus={locationStatus} onLocate={locateUser} onOpenCatch={() => setCatchModalOpen(true)} />

  return (
    <div className="app-frame">
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <div className="brand-mark"><Fish /></div>
          <div><strong>Progetto Pesca</strong><span>Fishing companion</span></div>
        </div>

        <nav className="desktop-nav" aria-label="Navigazione principale">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? 'active' : ''} onClick={() => setActiveView(id)}>
              <Icon size={19} /> {label}
            </button>
          ))}
          <button className={activeView === 'profile' ? 'active' : ''} onClick={() => setActiveView('profile')}><Settings size={19} /> Profilo</button>
        </nav>

        <div className="desktop-sidebar-note">
          <span className="status-dot" /> Mobile-first · PWA
        </div>
      </aside>

      <div className="app-shell">
        <header className="topbar">
          <div>
            <div className="mobile-brand">Progetto Pesca</div>
            <div className="location">{activeLabel}</div>
          </div>
          <button className="avatar" aria-label="Apri profilo" onClick={() => setActiveView('profile')}>AD</button>
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

      {catchModalOpen && <CatchModal onClose={() => setCatchModalOpen(false)} onSave={saveCatch} />}
    </div>
  )
}

export default App
