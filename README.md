# XFish

XFish è una webapp/PWA mobile-first per previsioni di pesca, condizioni mare/meteo, spot personali, diario catture e attrezzatura. L'interfaccia è progettata prima di tutto per smartphone, mantenendo un layout dedicato anche su desktop.

## Area di utilizzo

XFish è pensata per l'intero territorio italiano, con priorità operativa sulla costa compresa tra Livorno e La Spezia.

La posizione predefinita è Marina di Massa. Sono disponibili scorciatoie rapide per:

- Livorno
- Viareggio
- Forte dei Marmi
- Marina di Massa
- Marina di Carrara
- Lerici
- La Spezia

Quando l'utente autorizza il GPS, le previsioni vengono ricalcolate sulle coordinate reali.

## Stack

- React + Vite
- Supabase (Auth, PostgreSQL, Storage)
- Render (hosting statico)
- PWA installabile su Android e desktop
- Open-Meteo Weather API
- Open-Meteo Marine API

## Previsioni meteo-marine

La dashboard usa dati reali e separa correttamente terra e mare:

- meteo: griglia terrestre più adatta alle coordinate richieste
- mare: griglia marina più vicina (`cell_selection=sea`)
- fuso orario: `Europe/Rome`
- previsione: 7 giorni

Dati principali:

- temperatura e temperatura percepita
- umidità
- pressione atmosferica e tendenza
- vento, direzione e raffiche
- probabilità di precipitazione
- altezza, direzione e periodo dell'onda
- swell
- temperatura superficiale del mare
- corrente marina
- livello marino modellato
- alba e tramonto
- sorgere e tramontare della luna
- fase e illuminazione lunare stimata

### Maree / livello marino

XFish usa `sea_level_height_msl` della Marine API. Per le prossime 48 ore richiede la serie a 15 minuti quando disponibile e individua massimi/minimi locali per mostrare la tendenza di alta e bassa marea.

Il valore include marea astronomica e altri contributi al livello marino. Sulla costa tirrenica e ligure l'escursione è spesso contenuta. Il dato è utile come indicazione per la pesca, ma non deve essere usato per la navigazione.

### Finestre solunari

Le finestre minori sono centrate su moonrise e moonset. Le finestre maggiori sono una stima ottenuta dal transito lunare approssimato a partire da moonrise/moonset. Sono quindi un indicatore euristico, non una previsione scientifica della presenza di pesce.

### Indice XFish

L'indice 0–100 combina in modo trasparente:

- vento e raffiche
- onda
- precipitazioni
- stabilità della pressione
- fase lunare
- variazione del livello marino

L'indice serve a confrontare giornate e finestre temporali e non rappresenta una garanzia di cattura.

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

Il client mantiene compatibilità anche con `VITE_SUPABASE_ANON_KEY`, ma per nuovi progetti viene usata la publishable key moderna.

## Database Supabase

Lo schema iniziale è in `supabase/schema.sql` e comprende:

- `profiles`
- `fishing_spots`
- `catches`
- `gear`

Le tabelle usano Row Level Security: ogni utente autenticato può leggere e modificare soltanto i propri dati.

## Autenticazione

Sono disponibili:

- registrazione email/password
- login email/password
- sessione persistente
- modalità ospite locale
- caricamento delle catture dal cloud dopo il login
- salvataggio delle nuove catture direttamente su Supabase
- profilo con stato cloud e logout

## Deploy Render

Il file `render.yaml` è predisposto per una Static Site XFish. Su Render vanno configurate:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Strategia Git

- `main`: versione stabile
- `feature/...`: sviluppo di una singola funzionalità
- `fix/...`: correzioni
- merge su `main` soltanto tramite Pull Request revisionata manualmente

## Roadmap

1. fondazione mobile-first / PWA
2. autenticazione e sincronizzazione Supabase
3. previsioni meteo-marine e indice pesca
4. mappa reale con OpenStreetMap/Leaflet
5. gestione attrezzatura completa
6. foto catture e spot
