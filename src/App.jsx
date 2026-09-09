import { Fish, MapPinned, NotebookTabs, Backpack, Waves, Wind, Sun, Moon, CloudSun } from 'lucide-react'

const days = [
  { day: 'Oggi', score: 87 },
  { day: 'Gio', score: 78 },
  { day: 'Ven', score: 92 },
  { day: 'Sab', score: 84 },
  { day: 'Dom', score: 71 },
]

function ScoreCard() {
  return (
    <section className="hero-card">
      <div className="eyebrow">Attività pesci</div>
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

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">Progetto Pesca</div>
          <div className="location">Marina di Massa</div>
        </div>
        <button className="avatar" aria-label="Profilo">AD</button>
      </header>

      <main>
        <ScoreCard />

        <section className="days-strip" aria-label="Previsioni prossimi giorni">
          {days.map((item) => (
            <div className="day-card" key={item.day}>
              <span>{item.day}</span>
              <strong>{item.score}%</strong>
            </div>
          ))}
        </section>

        <section className="section-block">
          <div className="section-title-row">
            <h2>Condizioni</h2>
            <button>Dettagli</button>
          </div>
          <div className="conditions-grid">
            <article><Waves /><span>Mare</span><strong>Poco mosso</strong></article>
            <article><Wind /><span>Vento</span><strong>SW 8 km/h</strong></article>
            <article><CloudSun /><span>Meteo</span><strong>23 °C</strong></article>
            <article><Moon /><span>Luna</span><strong>74%</strong></article>
          </div>
        </section>

        <section className="section-block advice-card">
          <div className="advice-icon"><Fish /></div>
          <div>
            <div className="eyebrow">Cosa pesco oggi?</div>
            <h2>Prova la spigola al tramonto</h2>
            <p>Fascia consigliata 19:10–21:05. Minnow 10–12 cm, recupero lento con pause.</p>
          </div>
        </section>
      </main>

      <nav className="bottom-nav">
        <button className="active"><Sun /><span>Previsioni</span></button>
        <button><MapPinned /><span>Mappa</span></button>
        <button className="add-button"><Fish /></button>
        <button><NotebookTabs /><span>Diario</span></button>
        <button><Backpack /><span>Attrezzatura</span></button>
      </nav>
    </div>
  )
}

export default App
