# Supabase migration workflow

## Baseline storica

La cartella `supabase/migrations` deve riflettere la cronologia registrata nel progetto Supabase XFish (`supabase_migrations.schema_migrations`). I timestamp storici presenti in questa cartella sono quindi quelli realmente applicati al database remoto.

La migration `spot_photos_storage` compare due volte perché è stata registrata due volte sul progetto remoto con due versioni differenti. Entrambe le versioni vengono mantenute nel repository per allineare la history locale e remota; non vanno consolidate o rinumerate retroattivamente.

## Regole per le prossime modifiche

1. Non modificare, rinominare o riordinare migration già applicate.
2. Creare ogni nuova migration con `supabase migration new <nome>` usando una CLI Supabase aggiornata; non inventare manualmente il timestamp.
3. Prima di un nuovo schema change verificare `supabase migration list` e assicurarsi che locale e remoto siano allineati.
4. Sviluppare e verificare la modifica, quindi controllare RLS, Storage e advisor pertinenti prima del deploy.
5. Evitare modifiche schema manuali dal Dashboard che non vengano poi riportate in migration versionate.
6. Non usare una migration già applicata per correggere il passato: ogni cambiamento futuro deve essere additivo in una nuova migration.

## Nota sul database di produzione

La riconciliazione della baseline in Git non modifica lo schema né la tabella di history del database remoto. Serve a rendere il repository coerente con ciò che Supabase registra come già applicato, così le prossime migration possono essere generate e revisionate senza aumentare il drift.
