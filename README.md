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
- inventario attrezzatura caricato dinamicamente soltanto quando viene aperto
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

## Attrezzatura

L'inventario personale è operativo e supporta:

- canne
- mulinelli
- fili e trecciati
- esche e artificiali
- terminali
- accessori
- abbigliamento
- categoria libera “altro”

Per ogni elemento sono disponibili marca, modello, specifiche e note. Sono supportati creazione, modifica, eliminazione, ricerca e filtri per categoria.

Con account autenticato i dati vengono sincronizzati nella tabella `gear` di Supabase; in modalità ospite restano sul dispositivo. La query cloud è limitata ai 250 elementi più recenti e l'intera sezione viene caricata in lazy loading per contenere traffico e peso iniziale.

### Attrezzatura associata alle catture

Ogni cattura può essere collegata a più elementi dell'inventario, per esempio canna, mulinello, trecciato e artificiale. La relazione è molti-a-molti ed è salvata nella tabella `catch_gear`.

La selezione avviene direttamente durante la registrazione della cattura. Nel diario vengono mostrati gli elementi collegati; eliminando un elemento dall'inventario vengono rimosse automaticamente soltanto le associazioni, non la cattura.

Questa struttura permette in seguito statistiche come artificiali più efficaci per specie, combinazioni più usate e rendimento dell'attrezzatura per spot o zona senza duplicare dati nel database.

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
- `catch_gear`

Le tabelle usano Row Level Security: ogni utente autenticato può leggere e modificare soltanto i propri dati. Le catture possono memorizzare anche `latitude`, `longitude`, `location_label` e il riferimento opzionale a `spot_id`.

`catch_gear` usa policy RLS che consentono il collegamento soltanto quando sia la cattura sia l'elemento di attrezzatura appartengono all'utente autenticato.

Gli indici duplicati non necessari sono stati rimossi per ridurre spazio e scritture sul piano gratuito; restano gli indici funzionali alle query reali dell'app.

## Autenticazione

Sono disponibili registrazione/login email-password, sessione persistente, modalità ospite locale, sincronizzazione cloud di catture, spot e attrezzatura e logout.

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
5. catture geolocalizzate e collegamento diario-mappa ✅
6. gestione attrezzatura completa ✅
7. associazione attrezzatura alle catture ✅
8. foto catture e spot con compressione client-side
9. statistiche personali per specie, spot e attrezzatura
