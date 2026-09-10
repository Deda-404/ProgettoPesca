import {
  CircleHelp,
  CloudSun,
  Compass,
  Droplets,
  Fish,
  Gauge,
  LocateFixed,
  Moon,
  Navigation,
  Sunrise,
  Sunset,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react'
import { COASTAL_PRESETS } from '../config/locations'
import '../forecastInfo.css'

function formatTime(value) {
  return value?.split('T')?.[1]?.slice(0, 5) || '—'
}

function formatNumber(value, digits = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : '—'
}

function dayLabel(date, index) {
  if (index === 0) return 'Oggi'
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '')
}

function scoreClass(score) {
  if (score >= 72) return 'good'
  if (score >= 50) return 'medium'
  return 'low'
}

function ForecastInfo({ children }) {
  return (
    <details className="forecast-info">
      <summary><CircleHelp size={16} /> Info</summary>
      <p>{children}</p>
    </details>
  )
}

export default function LiveForecastView({
  location,
  locationLabel,
  locationStatus,
  onLocate,
  onSelectPreset,
  onOpenCatch,
  forecast,
  loading,
  error,
}) {
  const current = forecast?.current
  const astronomy = forecast?.astronomy

  return (
    <>
      <section className="page-intro forecast-intro">
        <div>
          <div className="eyebrow">Previsioni reali · Italia</div>
          <h1>Quando conviene pescare?</h1>
          <p>
            Meteo, mare, livello marino, luna e finestre solunari calcolati sulla posizione scelta.
            La costa Livorno–La Spezia è il profilo predefinito di XFish.
          </p>
        </div>
        <button className="secondary-button" onClick={onLocate}>
          <LocateFixed size={18} /> Usa GPS
        </button>
      </section>

      <div className="forecast-location-row">
        <div className="location-chip"><Compass size={16} /> {locationLabel}</div>
        <span className="muted-label">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
      </div>

      <div className="coastal-presets" aria-label="Località rapide costa Toscana Liguria">
        {COASTAL_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={locationLabel === preset.name ? 'active' : ''}
            onClick={() => onSelectPreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {locationStatus && <div className="status-banner">{locationStatus}</div>}
      {error && <div className="status-banner forecast-error">{error}</div>}

      {loading && !forecast ? (
        <section className="section-block forecast-loading">
          <Waves size={32} />
          <strong>Carico meteo e mare…</strong>
          <span>I dati vengono richiesti per la costa più vicina alla posizione selezionata.</span>
        </section>
      ) : forecast ? (
        <>
          <div className="desktop-dashboard-grid">
            <section className="hero-card forecast-score-card">
              <div className="eyebrow">Indice XFish · euristico</div>
              <div className="score-row">
                <div>
                  <div className="score">{forecast.score}%</div>
                  <div className="score-label">{forecast.scoreLabel}</div>
                </div>
                <div className="fish-orbit"><Fish size={42} /></div>
              </div>
              <div className="time-grid">
                <div><span>Periodo maggiore 1</span><strong>{astronomy.solunar.major[0]}</strong></div>
                <div><span>Periodo maggiore 2</span><strong>{astronomy.solunar.major[1]}</strong></div>
              </div>
              <p className="forecast-disclaimer">
                L’indice combina condizioni meteo-marine, pressione, luna e variazione del livello marino: è un supporto alla scelta dello spot, non una garanzia di cattura.
              </p>
              <ForecastInfo>
                L’indice XFish va da 0 a 100 e serve a confrontare condizioni e finestre temporali. È un indicatore euristico: non sostituisce esperienza, sicurezza in mare o valutazione locale dello spot.
              </ForecastInfo>
            </section>

            <section className="section-block current-summary">
              <div className="section-title-row">
                <h2>Adesso</h2>
                <span className="live-pill">Live model</span>
              </div>
              <div className="conditions-grid">
                <article><CloudSun /><span>Meteo</span><strong>{current.weatherLabel} · {formatNumber(current.airTemperature)} °C</strong></article>
                <article><Wind /><span>Vento</span><strong>{current.windDirection} {formatNumber(current.windSpeed)} km/h</strong></article>
                <article><Waves /><span>Onda</span><strong>{formatNumber(current.waveHeight, 1)} m · {current.waveDirection}</strong></article>
                <article><Thermometer /><span>Acqua</span><strong>{formatNumber(current.seaTemperature, 1)} °C</strong></article>
                <article><Gauge /><span>Pressione</span><strong>{formatNumber(current.pressure)} hPa</strong></article>
                <article><Navigation /><span>Corrente</span><strong>{current.currentDirection} · {formatNumber(current.currentVelocity, 1)} km/h</strong></article>
              </div>
              <ForecastInfo>
                Temperatura aria e acqua sono espresse in °C; vento e corrente in km/h; altezza dell’onda in metri; pressione atmosferica in hPa. Direzione di vento, onda e corrente indica la provenienza o l’orientamento riportato dal modello.
              </ForecastInfo>
            </section>
          </div>

          <section className="days-strip forecast-days" aria-label="Indice pesca prossimi giorni">
            {forecast.days.map((item, index) => (
              <article className="day-card" key={item.date}>
                <span>{dayLabel(item.date, index)}</span>
                <strong className={`daily-score ${scoreClass(item.score)}`}>{item.score}%</strong>
                <small>{formatNumber(item.waveMax, 1)} m · {formatNumber(item.windMax)} km/h</small>
              </article>
            ))}
          </section>

          <section className="section-block marine-details">
            <div className="section-title-row">
              <h2>Mare e vento</h2>
              <span className="muted-label">costa più vicina</span>
            </div>
            <div className="detail-grid">
              <div><span>Onda significativa</span><strong>{formatNumber(current.waveHeight, 1)} m</strong><small>{current.waveDirection} · periodo {formatNumber(current.wavePeriod, 1)} s</small></div>
              <div><span>Swell</span><strong>{formatNumber(current.swellHeight, 1)} m</strong><small>{current.swellDirection} · periodo {formatNumber(current.swellPeriod, 1)} s</small></div>
              <div><span>Raffiche</span><strong>{formatNumber(current.windGusts)} km/h</strong><small>vento {current.windDirection}</small></div>
              <div><span>Livello mare</span><strong>{formatNumber(current.seaLevel, 2)} m</strong><small>rispetto al livello medio globale</small></div>
            </div>
            <ForecastInfo>
              Onda significativa e swell sono espresse in metri; il periodo in secondi indica il tempo tra le onde del modello. Le raffiche sono picchi di vento in km/h. Il livello mare è un valore modellato e non una misura locale certificata.
            </ForecastInfo>
          </section>

          <section className="section-block astronomy-card">
            <div className="section-title-row">
              <h2>Sole e luna</h2>
              <span className="muted-label">ora italiana</span>
            </div>
            <div className="astronomy-grid">
              <div><Sunrise /><span>Alba</span><strong>{formatTime(astronomy.sunrise)}</strong></div>
              <div><Sunset /><span>Tramonto</span><strong>{formatTime(astronomy.sunset)}</strong></div>
              <div><Moon /><span>{astronomy.moon.label}</span><strong>{astronomy.moon.illumination === null ? '—' : `${Math.round(astronomy.moon.illumination * 100)}%`}</strong></div>
              <div><Moon /><span>Sorge / tramonta</span><strong>{formatTime(astronomy.moonrise)} / {formatTime(astronomy.moonset)}</strong></div>
            </div>
            <div className="solunar-grid">
              <div><span>Minore 1</span><strong>{astronomy.solunar.minor[0]}</strong></div>
              <div><span>Minore 2</span><strong>{astronomy.solunar.minor[1]}</strong></div>
            </div>
            <ForecastInfo>
              L’illuminazione lunare è mostrata in percentuale. Le finestre solunari di XFish sono stime ricavate da moonrise, moonset e transito lunare: sono un riferimento descrittivo, non una previsione certa dell’attività dei pesci.
            </ForecastInfo>
          </section>

          <section className="section-block tide-card">
            <div className="section-title-row">
              <h2>Marea / livello marino</h2>
              <span className="muted-label">modello numerico</span>
            </div>
            {forecast.tideEvents.length ? (
              <div className="tide-list">
                {forecast.tideEvents.map((event) => (
                  <div key={`${event.time}-${event.type}`}>
                    <span>{event.type}</span>
                    <strong>{formatTime(event.time)}</strong>
                    <small>{formatNumber(event.value, 2)} m</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="forecast-note">Nessun estremo netto individuato nelle prossime ore.</p>
            )}
            <p className="forecast-note">
              Sul Tirreno e nel Mar Ligure l’escursione di marea è spesso contenuta. XFish usa il livello marino modellato, utile per leggere la tendenza di pesca ma non per la navigazione.
            </p>
            <ForecastInfo>
              XFish cerca massimi e minimi locali nella serie del livello marino modellato. I valori servono a leggere una tendenza: non sono tavole di marea ufficiali e non devono essere utilizzati per la navigazione o per decisioni di sicurezza.
            </ForecastInfo>
          </section>

          <section className="section-block advice-card">
            <div className="advice-icon"><Fish /></div>
            <div>
              <div className="eyebrow">Cosa provo oggi?</div>
              <h2>{forecast.advice.title}</h2>
              <p>{forecast.advice.text}</p>
              <ForecastInfo>
                Il suggerimento combina le condizioni già mostrate dalla dashboard con le regole dell’indice XFish. È un aiuto operativo per scegliere cosa provare, non identifica automaticamente specie presenti nello spot e non garantisce una cattura.
              </ForecastInfo>
            </div>
          </section>

          <section className="quick-actions">
            <button className="primary-button" onClick={onOpenCatch}><Fish size={18} /> Registra una cattura</button>
            <button className="secondary-button" onClick={onLocate}><LocateFixed size={18} /> Aggiorna posizione</button>
          </section>

          <section className="forecast-source-note">
            <Droplets size={15} /> Meteo e dati marini: Open-Meteo. Fuso orario forzato su Europe/Rome; griglia marina selezionata preferendo celle di mare.
          </section>
        </>
      ) : null}
    </>
  )
}
