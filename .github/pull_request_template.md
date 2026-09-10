## Scopo

Descrivi in modo conciso cosa cambia e perché. Mantieni la PR limitata a una singola modifica funzionale, fix o attività di manutenzione.

## Tipo di modifica

- [ ] `feature/...`
- [ ] `fix/...`
- [ ] `chore/...`
- [ ] `docs/...`

## Verifiche applicative

- [ ] Ho eseguito i test pertinenti.
- [ ] Ho verificato che la build completi correttamente.
- [ ] Ho controllato il comportamento mobile-first interessato dalla modifica.
- [ ] Non ho introdotto servizi, polling, Realtime o dipendenze che aumentino i costi senza una decisione esplicita.

## Impatto Render

- [ ] Nessun impatto su Render.
- [ ] La modifica richiede un aggiornamento di `render.yaml`.
- [ ] La modifica richiede variabili d'ambiente nuove o modificate.
- [ ] Il deploy resta compatibile con Render Static Site e con il piano gratuito previsto dal progetto.

Note Render:

<!-- Elenca eventuali modifiche richieste al servizio, build command, publish path o env vars. -->

## Impatto Supabase

- [ ] Nessun impatto su Supabase.
- [ ] La modifica richiede una nuova migration versionata nel repository.
- [ ] RLS/policy sono state verificate per ogni tabella o risorsa esposta interessata.
- [ ] Nessuna chiave `service_role` o secret è esposta al client.
- [ ] Storage, query e trasferimenti restano compatibili con i vincoli del piano gratuito.

Note Supabase:

<!-- Elenca migration, tabelle, policy, bucket, Auth o configurazioni interessate. -->

## Compatibilità e rollback

- [ ] La modifica è retrocompatibile oppure l'eventuale incompatibilità è documentata.
- [ ] È chiaro come annullare la modifica in caso di regressione.

## Checklist di revisione

- [ ] La PR è piccola e supervisionabile.
- [ ] Non contiene modifiche non correlate.
- [ ] I commit sono leggibili e descrivono cambiamenti atomici.
- [ ] Non è previsto merge su `main` senza revisione e autorizzazione manuale.
