# XFish

XFish è una webapp/PWA mobile-first per pescatori marittimi. Riunisce previsioni meteo-marine, indice pesca, spot GPS, diario catture, attrezzatura, montature, profilo e condivisione controllata degli spot/catture.

L'app è progettata prima di tutto per smartphone, ma mantiene un layout dedicato anche su desktop. L'area operativa è l'Italia, con priorità sulla costa Livorno–La Spezia e posizione predefinita Marina di Massa.

## Stato del progetto

La baseline XFish 1.0 implementa i requisiti MUST definiti nel documento prodotto che hanno specifiche complete. L'Ittiodex resta fuori da questa baseline perché i relativi requisiti funzionali sono ancora indicati come da definire; le funzionalità WOULD (gare, riconoscimento pesci, ricette, leaderboard sociali complete) restano roadmap futura.

## Vincolo di costo

XFish è progettata per restare utilizzabile con Render Static Site e Supabase senza introdurre automaticamente servizi/add-on a pagamento.

Principi:

- hosting statico su Render;
- un solo progetto Supabase per Auth, PostgreSQL, Storage, Edge Functions e Cron;
- nessun server applicativo sempre acceso;
- niente polling/Realtime non necessari;
- Leaflet e sezioni pesanti caricati solo quando servono;
- foto compresse nel browser prima dell'upload;
- bucket privati con limite massimo 512 KB/file;
- statistiche calcolate nel browser;
- query limitate e dataset piccoli;
- nessun segreto server-side esposto al bundle Vite.

## Stack

- React 18 + Vite 6
- Supabase Auth / PostgreSQL / Storage / Edge Functions / Cron
- Render Static Site
- Open-Meteo Weather + Marine API
- OpenStreetMap + Leaflet
- PWA installabile

Le dipendenze dirette sono pin-nate a versioni esatte in `package.json`. Il repository non contiene un `package-lock.json` generato artificialmente: quando viene rigenerato deve provenire da una reale installazione npm e includere gli hash `integrity` effettivi.

## Interfaccia e temi

L'interfaccia è mobile-first, con navigazione dedicata su telefono e sidebar su desktop. Sono disponibili:

- tema scuro ispirato al mare profondo;
- tema chiaro con palette blu/azzurro/bianco;
- selezione tema dal Profilo e persistenza locale;
- micro-interazioni marine sui pulsanti;
- rispetto di `prefers-reduced-motion` per ridurre le animazioni quando richiesto dal sistema.

## Autenticazione e modalità ospite

XFish usa Supabase Auth email/password.

- registrazione e login;
- sessione persistente;
- reinvio email di conferma;
- gestione degli errori di email non confermata;
- logout;
- modalità ospite limitata alle sole previsioni meteo-marine.

Il client usa `window.location.origin` come redirect di conferma, quindi in produzione il redirect è `https://xfish.onrender.com/`.

### Configurazione Auth da verificare in Supabase Dashboard

La configurazione URL/SMTP è esterna al codice e non è modificabile dai connettori usati dal progetto. Prima di considerare chiuso il collaudo email, in **Authentication → URL Configuration** verificare:

- Site URL: `https://xfish.onrender.com`
- Redirect URL di produzione: `https://xfish.onrender.com/`

Per produzione va inoltre configurato un SMTP adeguato e deve restare attiva l'opzione **Confirm Email**. Se il template email usa un redirect personalizzato, il template deve usare il valore di redirect configurato da Supabase.

L'advisor Supabase segnala ancora **Leaked Password Protection Disabled**: è una configurazione Auth Dashboard e va abilitata se disponibile sul piano/configurazione scelta.

## Previsioni meteo-marine

La dashboard usa dati reali Open-Meteo e separa correttamente dati terrestri e marini.

Dati principali:

- temperatura, umidità, pressione;
- vento e raffiche;
- precipitazioni;
- onda e swell;
- temperatura superficiale del mare;
- corrente marina;
- livello marino modellato;
- alba/tramonto;
- moonrise/moonset e fase lunare.

Sono presenti pulsanti Info per spiegare gli indicatori, un indice XFish 0–100 e indicazioni operative/specie target basate sulle condizioni disponibili. L'indice è euristico e non rappresenta una garanzia di cattura.

L'utente può salvare, selezionare e rimuovere punti GPS di interesse per le previsioni senza generare traffico Supabase aggiuntivo.

### Maree / livello marino

XFish usa `sea_level_height_msl` come indicazione per la pesca. Il dato non deve essere usato per la navigazione.

## Mappa e spot

La mappa usa OpenStreetMap/Leaflet e supporta:

- creazione, modifica ed eliminazione spot;
- nome, coordinate GPS, tipo, note e foto;
- ricerca spot;
- scope mappa **privata**, **globale** o di uno **specifico gruppo**;
- visibilità spot `private`, `global`, `group`;
- selezione del gruppo quando la visibilità è `group`;
- preferiti per spot privati/globali;
- marker separati per spot e catture personali;
- spot altrui in sola lettura;
- foto degli spot condivisi leggibili solo se la policy di visibilità permette di vedere lo spot.

Gli utenti autenticati usano Supabase; la modalità locale resta privata.

## Diario catture

Il Diario personale supporta CRUD completo per i campi attualmente definiti:

- specie;
- data e ora con default locale;
- esca/artificiale;
- tecnica di pesca;
- peso e lunghezza;
- note;
- foto;
- spot salvato oppure coordinate GPS;
- più elementi di attrezzatura associati;
- visibilità `private`, `global`, `group` con selezione gruppo.

Ulteriori funzioni:

- ricerca tra le proprie catture anche per tecnica, spot, data, esca, note e attrezzatura;
- foto apribile a tutto schermo;
- apertura della cattura sulla mappa;
- se una nuova cattura ha coordinate ma nessuno spot, XFish propone di salvare quel punto come nuovo spot e collega automaticamente la cattura al nuovo spot.

Il Diario resta intenzionalmente l'archivio personale dell'utente; la condivisione viene applicata a livello RLS e nelle viste mappa previste.

## Attrezzatura e montature

L'inventario supporta CRUD, ricerca e ordinamento per categoria di:

- canne;
- mulinelli;
- fili/trecciati;
- esche/artificiali;
- terminali;
- accessori;
- abbigliamento;
- altro.

Per ogni elemento sono disponibili marca, modello, specifiche e note.

La sezione **Configurazioni / montature** supporta CRUD di setup composti almeno da:

- canna;
- mulinello;
- lenza madre;
- terminale/leader;
- nome e note.

Le catture possono inoltre essere collegate a più elementi dell'inventario tramite `catch_gear`.

## Profilo

Il Profilo mostra e gestisce:

- nome utente;
- foto profilo;
- email dell'account;
- stato cloud;
- conteggi spot/catture/attrezzatura;
- spazio totale occupato dalle foto nei bucket XFish;
- tema chiaro/scuro;
- logout.

Nome utente e foto profilo sono modificabili. La foto usa il bucket privato `profile-photos` e la stessa pipeline di compressione client-side delle altre immagini.

## Gruppi

La baseline include la fondazione minima necessaria alla visibilità `group`:

- creazione/eliminazione di un gruppo posseduto dall'utente;
- membership del proprietario automatica;
- selezione dei gruppi nei form spot/cattura;
- RLS basata sulla membership.

Inviti, gestione sociale completa delle ciurme/gilde, gare ed eventi appartengono alla roadmap WOULD e non sono parte della baseline 1.0.

## Amministrazione

I due account amministrativi indicati nella documentazione di progetto sono marcati `is_admin=true` direttamente nel database. I loro indirizzi email **non sono hardcodati nel repository**.

Il Profilo amministratore mostra un pannello con:

- numero di profili;
- utenti attivi negli ultimi 5 minuti in base a `last_seen_at`;
- ultimo accesso osservato;
- stato admin;
- visibilità delle richieste di cancellazione tramite i dati profilo disponibili.

L'autorizzazione amministrativa usa `profiles.is_admin`; non usa `user_metadata` del JWT.

## Cancellazione account a 30 giorni

L'utente può:

1. richiedere la cancellazione;
2. vedere la data di scadenza (+30 giorni);
3. annullare la richiesta prima della scadenza.

La cancellazione effettiva è automatizzata con:

- flag `profiles.deletion_requested_at`;
- Supabase Cron `xfish-purge-deleted-accounts`, una volta al giorno;
- Edge Function `purge-deleted-accounts`;
- segreto cron memorizzato in Supabase Vault;
- nel repository è presente soltanto l'hash SHA-256 del segreto, mai il valore in chiaro;
- pulizia foto tramite Storage API prima di `auth.admin.deleteUser`, evitando oggetti Storage orfani;
- cancellazione delle righe applicative tramite FK `on delete cascade`.

La funzione non accetta un ID utente da cancellare dal chiamante: seleziona esclusivamente profili la cui richiesta è scaduta da almeno 30 giorni.

## Foto e Storage

Bucket privati:

- `catch-photos`
- `spot-photos`
- `profile-photos`

Regole principali:

- compressione client-side;
- limite server-side 512 KB;
- WebP/JPEG;
- URL firmate temporanee;
- percorsi separati per utente;
- eliminazione tramite Storage API;
- RLS owner-scoped oppure visibility-scoped per le foto di spot condivisi;
- modalità locale con IndexedDB dove applicabile.

## Statistiche

La pagina Statistiche è stata mantenuta sostanzialmente invariata, come richiesto dalla specifica prodotto. Continua a calcolare nel browser statistiche descrittive basate sul diario senza API dedicate.

## Database Supabase

Tabelle principali:

- `profiles`
- `fishing_spots`
- `catches`
- `gear`
- `catch_gear`
- `fishing_groups`
- `group_members`
- `spot_favorites`
- `gear_setups`

Tutte le tabelle esposte che contengono dati utente hanno Row Level Security. Gli helper interni necessari per evitare ricorsione RLS sono nello schema `private`, non esposto come normale API RPC.

`profiles.is_admin` non è aggiornabile dal normale client: il ruolo `authenticated` può aggiornare soltanto le colonne profilo consentite.

### Migration history

La cartella `supabase/migrations` è stata riconciliata con `supabase_migrations.schema_migrations`. Non riscrivere migration già applicate.

Per nuove modifiche:

1. creare una nuova migration tramite Supabase CLI quando disponibile;
2. applicare/verificare;
3. eseguire gli advisor;
4. assicurarsi che timestamp/nome presenti in Git coincidano con la history remota.

Vedi anche `docs/SUPABASE_MIGRATIONS.md`.

## Security advisor

Dopo l'hardening rimangono due classi di warning note:

- `my_photo_storage_bytes()` è intenzionalmente un RPC `SECURITY DEFINER` owner-scoped, senza argomento user-id, necessario per contare gli oggetti Storage dell'utente corrente;
- Leaked Password Protection è disattivata e richiede configurazione nel pannello Auth Supabase.

Gli helper RLS interni per admin, membership e foto condivise sono stati spostati nello schema `private`.

## Avvio locale

```bash
npm install
cp .env.example .env
npm run dev
```

Variabili:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Non inserire mai `service_role` o secret key in variabili `VITE_*`.

## Build e test

```bash
npm test
npm run build
```

`npm run build` esegue prima la suite Node e poi `vite build`.

## Deploy Render

Servizio canonico:

- Static Site `xfish`
- branch `main`
- URL: `https://xfish.onrender.com`
- build: `npm install && npm run build`
- publish: `dist`

Variabili Render richieste:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Nota auto-deploy

Il servizio dichiara `autoDeploy=yes`, ma durante il collaudo i merge GitHub non hanno generato automaticamente nuovi deploy; i deploy canonici sono stati quindi riallineati manualmente tramite API Render. Il connettore disponibile non espone la riconnessione del repository a un Git provider autenticato.

Per ripristinare l'auto-deploy nativo va verificata nel Dashboard Render l'integrazione GitHub del servizio esistente. Non creare un secondo servizio soltanto per aggirare questo problema.

## Strategia Git

- `main`: versione stabile;
- branch `feature/...`, `fix/...`, `chore/...` per modifiche isolate o pacchetti di dominio;
- integrazione tramite Pull Request;
- ogni merge rilevante viene verificato con il build canonico Render quando non è disponibile una CI dedicata.

## Roadmap / milestone

Completato nella baseline XFish 1.0:

1. mobile-first / PWA ✅
2. autenticazione + modalità ospite ✅
3. previsioni meteo-marine + Info + indice pesca ✅
4. punti GPS salvabili nelle previsioni ✅
5. tema Light/Dark + motion marino ✅
6. CRUD spot + ricerca + foto ✅
7. mappe privata/globale/gruppo ✅
8. preferiti spot ✅
9. CRUD catture + ricerca + foto fullscreen ✅
10. tecnica e visibilità catture ✅
11. workflow GPS cattura → nuovo spot ✅
12. CRUD attrezzatura + ordine categoria ✅
13. CRUD montature/configurazioni ✅
14. profilo modificabile + avatar + spazio foto ✅
15. gruppi minimi per la visibilità ✅
16. ruoli/pannello amministratore ✅
17. richiesta/annullamento e purge account a 30 giorni ✅
18. migration history e RLS hardening ✅

Da configurare/verificare fuori dal codice prima del go-live pubblico:

- Supabase Auth Site URL / Redirect URL / SMTP / Confirm Email;
- Leaked Password Protection, se disponibile;
- integrazione GitHub autenticata su Render per auto-deploy.

Roadmap futura non inclusa nella baseline:

- Ittiodex: requisiti ancora da definire;
- inviti e gestione sociale completa dei gruppi;
- eventi/gare e leaderboard;
- riconoscimento fotografico dei pesci;
- schede specie estese e ricette.
