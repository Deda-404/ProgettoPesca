# XFish

XFish è una webapp/PWA mobile-first per previsioni di pesca, condizioni mare/meteo, spot personali, diario catture e attrezzatura. L'interfaccia è progettata prima di tutto per smartphone, mantenendo un layout dedicato anche su desktop.

## Area di utilizzo

XFish è pensata per l'intero territorio italiano, con priorità operativa sulla costa compresa tra Livorno e La Spezia.

La posizione predefinita è Marina di Massa. Sono disponibili scorciatoie rapide per Livorno, Viareggio, Forte dei Marmi, Marina di Massa, Marina di Carrara, Lerici e La Spezia. Quando l'utente autorizza il GPS, le previsioni vengono ricalcolate sulle coordinate reali.

## Vincolo di costo

XFish deve restare utilizzabile sui piani gratuiti di Render e Supabase.

Principi architetturali:

- Render usato come hosting statico della PWA, senza server sempre acceso
- un solo progetto Supabase per Auth, PostgreSQL e Storage
- niente servizi/add-on a pagamento attivati automaticamente
- niente polling o Realtime non necessari
- Leaflet caricato in lazy loading soltanto all'apertura della mappa
- immagini future compresse nel browser prima dell'upload
- query e trasferimenti dati mantenuti piccoli e paginati quando necessario
- cache PWA e cache applicativa per ridurre richieste e banda

Qualunque futura funzionalità che richieda un costo deve avere prima un'alternativa gratuita oppure una decisione esplicita.

## Stack

- React + Vite
- Supabase (Auth, PostgreSQL, Storage)
- Render Static Site
- PWA installabile su Android e desktop
- Open-Meteo Weather API
- Open-Meteo Marine API
- OpenStreetMap + Leaflet

## Previsioni meteo-marine

La dashboard usa dati reali e separa correttamente terra e mare:

- meteo: griglia terrestre più adatta alle coordinate richieste
- mare: griglia marina più vicina (`cell_selection=sea`)
- fuso orario: `Europe/Rome`
- previsione: 7 giorni

Dati principali: temperatura, umidità, pressione, vento e raffiche, precipitazioni, onda, swell, temperatura superficiale del mare, corrente marina, livello marino modellato, alba/tramonto, moonrise/moonset e fase lunare.

### Maree / livello marino

XFish usa `sea_level_height_msl` della Marine API. Per le prossime 48 ore richiede la serie a 15 minuti quando disponibile e individua massimi/minimi locali. Il dato è utile come indicazione per la pesca, ma non deve essere usato per la navigazione.

### Finestre solunari

Le finestre minori sono centrate su moonrise e moonset. Le finestre maggiori sono una stima del transito lunare ottenuta da moonrise/moonset. Sono indicatori euristici, non una garanzia di cattura.

### Indice XFish

L'indice 0–100 combina vento, raffiche, onda, precipitazioni, stabilità della pressione, fase lunare e variazione del livello marino. Serve a confrontare giornate e finestre temporali.

## Mappa, spot e catture

La mappa usa OpenStreetMap/Leaflet e supporta:

- GPS e centro mappa sulla località attiva
- spot privati con nome, tipo, note e coordinate
- salvataggio cloud per utenti autenticati e locale per ospiti
- marker separati per spot e catture
- associazione della cattura a uno spot già salvato
- GPS preciso della singola cattura
- apertura di una cattura del diario direttamente sulla mappa

La mappa viene caricata dinamicamente solo quando viene aperta, così il bundle iniziale resta più leggero su smartphone e si riduce il traffico.

## Avvio locale

```bash
npm install
cp .env.example .env
npm run dev
```

Compila `.env` con:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Database Supabase

Lo schema comprende:

- `profiles`
- `fishing_spots`
- `catches`
- `gear`

Le tabelle usano Row Level Security: ogni utente autenticato può leggere e modificare soltanto i propri dati. Le catture possono memorizzare anche `latitude`, `longitude`, `location_label` e il riferimento opzionale a `spot_id`.

## Autenticazione

Sono disponibili registrazione/login email-password, sessione persistente, modalità ospite locale, sincronizzazione cloud di catture e spot e logout.

## Deploy Render

Il file `render.yaml` è predisposto per una Static Site XFish. Variabili richieste:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Strategia Git

- `main`: versione stabile
- `feature/...`: sviluppo di una singola funzionalità
- `fix/...`: correzioni
- merge su `main` soltanto tramite Pull Request revisionata manualmente

## Roadmap

1. fondazione mobile-first / PWA ✅
2. autenticazione e sincronizzazione Supabase ✅
3. previsioni meteo-marine e indice pesca ✅
4. mappa reale con OpenStreetMap/Leaflet ✅
5. catture geolocalizzate e collegamento diario-mappa 🚧
6. gestione attrezzatura completa
7. foto catture e spot con compressione client-side
