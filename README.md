# Progetto Pesca

Webapp mobile-first per previsioni di pesca, condizioni mare/meteo, spot personali, diario catture e attrezzatura.

## Stack

- React + Vite
- Supabase (Auth, PostgreSQL, Storage)
- Render (hosting statico)

## Avvio locale

```bash
npm install
cp .env.example .env
npm run dev
```

Compila `.env` con:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Database Supabase

Lo schema iniziale è in `supabase/schema.sql` e comprende:

- `profiles`
- `fishing_spots`
- `catches`
- `gear`

Le tabelle usano Row Level Security, così ogni utente vede e modifica soltanto i propri dati.

## Deploy Render

Il file `render.yaml` è già predisposto per una Static Site. Su Render vanno configurate le variabili ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Roadmap iniziale

1. autenticazione Supabase
2. dashboard previsioni
3. diario catture
4. attrezzatura
5. mappa spot
6. API meteo/mare
7. PWA installabile su Android
