# XFish

XFish è una webapp/PWA mobile-first per previsioni di pesca, condizioni mare/meteo, spot personali, diario catture e attrezzatura. L'interfaccia è progettata prima di tutto per smartphone, mantenendo un layout dedicato anche su desktop.

## Stack

- React + Vite
- Supabase (Auth, PostgreSQL, Storage)
- Render (hosting statico)
- PWA installabile su Android e desktop

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

La branch `feature/supabase-auth` introduce:

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
3. mappa reale con OpenStreetMap/Leaflet
4. gestione attrezzatura completa
5. API meteo e mare
6. motore di forecast pesca
7. foto catture e spot
