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
- foto compresse direttamente nel browser prima dell'upload
- bucket foto privato, limite server-side di 512 KB per file
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

L'inventario personale supporta canne, mulinelli, fili/trecciati, esche e artificiali, terminali, accessori, abbigliamento e categoria libera “altro”. Per ogni elemento sono disponibili marca, modello, specifiche e note, oltre a creazione, modifica, eliminazione, ricerca e filtri.

Con account autenticato i dati vengono sincronizzati nella tabella `gear` di Supabase; in modalità ospite restano sul dispositivo. La query cloud è limitata ai 250 elementi più recenti e la sezione viene caricata in lazy loading.

### Attrezzatura associata alle catture

Ogni cattura può essere collegata a più elementi dell'inventario, per esempio canna, mulinello, trecciato e artificiale. La relazione molti-a-molti è salvata nella tabella `catch_gear` e permette future statistiche per specie, spot e attrezzatura senza duplicare dati.

## Foto delle catture

Le foto sono progettate specificamente per il piano gratuito Supabase:

- una foto facoltativa per cattura
- compressione e ridimensionamento direttamente sul telefono/PC prima dell'upload
- obiettivo circa 360 KB, limite massimo XFish 512 KB
- WebP quando supportato, con fallback JPEG
- bucket Supabase `catch-photos` privato
- percorso isolato per utente: `<user-id>/<catch-id>.<ext>`
- accesso alle immagini cloud tramite URL firmate temporanee
- RLS su lettura, upload ed eliminazione
- eliminazione della foto quando viene eliminata la cattura
- modalità ospite: Blob conservato in IndexedDB, senza riempire `localStorage`
- nessuna Image Transformation o funzione server a pagamento

Questa scelta riduce sia occupazione Storage sia egress e mantiene le foto non pubbliche.

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

Lo schema applicativo comprende:

- `profiles`
- `fishing_spots`
- `catches`
- `gear`
- `catch_gear`

Le tabelle usano Row Level Security: ogni utente autenticato può leggere e modificare soltanto i propri dati. Le catture possono memorizzare coordinate, località, spot, attrezzatura e il percorso privato della foto.

Lo Storage usa il bucket privato `catch-photos` con policy che limitano ogni utente alla propria cartella. Gli indici duplicati non necessari sono stati rimossi; restano quelli utili alle query reali e alle future statistiche.

## Autenticazione

Sono disponibili registrazione/login email-password, sessione persistente, modalità ospite locale, sincronizzazione cloud e logout. Il client gestisce redirect e reinvio della conferma email; prima di un'apertura pubblica resta da configurare un SMTP adatto e i Site/Redirect URL definitivi in Supabase.

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
8. foto private delle catture con compressione client-side ✅
9. foto degli spot con la stessa pipeline ottimizzata
10. statistiche personali per specie, spot e attrezzatura
