import { useMemo } from 'react'
import {
  Backpack,
  BarChart3,
  CalendarDays,
  Camera,
  Clock3,
  Fish,
  MapPin,
  Ruler,
  Sparkles,
  Trophy,
  Weight,
} from 'lucide-react'
import { buildPersonalStats } from '../lib/stats'
import './StatsView.css'

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="stats-metric-card">
      <div className="stats-metric-icon"><Icon size={20} /></div>
      <div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
    </article>
  )
}

function Ranking({ title, icon: Icon, items, emptyText }) {
  const max = items[0]?.count || 1
  return (
    <section className="section-block stats-ranking-card">
      <div className="stats-section-title"><Icon size={19} /><h2>{title}</h2></div>
      {items.length === 0 ? <p className="stats-empty-line">{emptyText}</p> : (
        <div className="stats-ranking-list">
          {items.map((item, index) => (
            <div className="stats-ranking-row" key={item.key}>
              <div className="stats-ranking-head"><span><b>{index + 1}</b>{item.label}</span><strong>{item.count}</strong></div>
              <div className="stats-bar"><i style={{ width: `${Math.max(8, Math.round((item.count / max) * 100))}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Distribution({ title, icon: Icon, items }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <section className="section-block stats-distribution-card">
      <div className="stats-section-title"><Icon size={19} /><h2>{title}</h2></div>
      <div className="stats-distribution-list">
        {items.map((item) => (
          <div className="stats-distribution-row" key={item.id ?? item.month}>
            <span>{item.label}</span>
            <div className="stats-bar"><i style={{ width: `${item.count ? Math.max(6, Math.round((item.count / max) * 100)) : 0}%` }} /></div>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function StatsView({ catches, spots, gear }) {
  const stats = useMemo(() => buildPersonalStats(catches, spots, gear), [catches, spots, gear])
  const { totals } = stats

  if (!totals.catches) {
    return (
      <>
        <section className="page-intro compact">
          <div><div className="eyebrow">Analisi personale</div><h1>Statistiche XFish</h1><p>Le statistiche vengono calcolate sul tuo diario, senza servizi esterni o costi aggiuntivi.</p></div>
      </section>
      <section className="section-block stats-empty-state">
        <BarChart3 size={38} />
        <h2>Servono alcune catture</h2>
        <p>Registra le prime catture con specie, spot, orario e attrezzatura. XFish inizierà automaticamente a mostrarti tendenze utili.</p>
      </section>
    </>
  )

  const insightParts = [
    stats.topSpecies[0] ? `Specie principale: ${stats.topSpecies[0].label}` : '',
    stats.topSpots[0] ? `spot più produttivo: ${stats.topSpots[0].label}` : '',
    stats.topGear[0] ? `attrezzatura più usata: ${stats.topGear[0].label}` : '',
  ].filter(Boolean)

  return (
    <>
      <section className="page-intro compact stats-intro">
        <div>
          <div className="eyebrow">Analisi personale · sul dispositivo</div>
          <h1>Statistiche XFish</h1>
          <p>Analisi del tuo diario per specie, spot, attrezzatura, esche, mesi e fasce orarie. Nessuna API aggiuntiva e nessun costo.</p>
        </div>
        <div className="stats-badge"><Sparkles size={17} /> {totals.catches} catture analizzate</div>
      </section>

      <section className="stats-metrics-grid">
        <MetricCard icon={Fish} label="Catture" value={totals.catches} detail={`${totals.species} specie diverse`} />
        <MetricCard icon={MapPin} label="Geolocalizzate" value={totals.geolocated} detail={`${totals.spotsUsed} zone/spot usati`} />
        <MetricCard icon={Backpack} label="Con attrezzatura" value={totals.withGear} detail={`${totals.gearUsed} elementi usati`} />
        <MetricCard icon={Camera} label="Con foto" value={totals.withPhoto} detail="foto private" />
        <MetricCard icon={Weight} label="Peso medio" value={totals.averageWeight ? `${totals.averageWeight} kg` : '—'} detail={totals.totalWeight ? `${totals.totalWeight} kg registrati` : 'peso non disponibile'} />
        <MetricCard icon={Ruler} label="Lunghezza media" value={totals.averageLength ? `${totals.averageLength} cm` : '—'} detail="solo misure note" />
      </section>

      {(stats.bestMonth || stats.bestTimeBand) && (
        <section className="section-block stats-highlight">
          <Trophy size={24} />
          <div>
            <strong>I tuoi pattern più frequenti</strong>
            <span>
              {stats.bestMonth ? `${stats.bestMonth.label} è il mese con più catture (${stats.bestMonth.count}).` : ''}
              {stats.bestMonth && stats.bestTimeBand ? ' ' : ''}
              {stats.bestTimeBand ? `La fascia più produttiva finora è ${stats.bestTimeBand.label.toLowerCase()} (${stats.bestTimeBand.count}).` : ''}
            </span>
          </div>
        </section>
      )}

      <section className="stats-rankings-grid">
        <Ranking title="Specie più catturate" icon={Fish} items={stats.topSpecies} emptyText="Nessuna specie disponibile." />
        <Ranking title="Spot più produttivi" icon={MapPin} items={stats.topSpots} emptyText="Associa uno spot o una località alle catture." />
        <Ranking title="Attrezzatura più usata" icon={Backpack} items={stats.topGear} emptyText="Associa l’attrezzatura alle catture." />
        <Ranking title="Esche / artificiali" icon={Trophy} items={stats.topLures} emptyText="Inserisci il campo esca nelle catture." />
      </section>

      <section className="stats-rankings-grid stats-distributions-grid">
        <Distribution title="Catture per mese" icon={CalendarDays} items={stats.monthCounts} />
        <Distribution title="Catture per fascia oraria" icon={Clock3} items={stats.timeBandCounts} />
      </section>

      {insightParts.length > 0 && (
        <section className="section-block stats-note">
          <BarChart3 size={20} />
          <div><strong>Lettura rapida</strong><span>{insightParts.join(' · ')}.</span></div>
        </section>
      )}
    </>
  )
}
