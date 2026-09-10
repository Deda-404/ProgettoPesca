# XFish — Product requirements baseline

Questo documento versiona nel repository i requisiti prodotto correnti di XFish/PescAPP. Il documento Google Drive del progetto resta la fonte editoriale primaria; questa baseline serve per mantenere sviluppo, deploy Render e schema Supabase verificabili rispetto agli stessi requisiti.

## Prodotto e utenza

XFish è una WebApp rivolta a pescatori marittimi da pontile, spiaggia, scogliera e barca. Deve essere utile sia a utenti esperti sia a nuovi utenti che devono imparare a leggere i dati del mare e migliorare nel tempo tenendo traccia di spot, attrezzatura e tecniche.

## MUST

### Grafica e UX

- UI moderna, fluida, intuitiva e riconoscibile, con animazioni rapide e coerenti con il tema marino.
- Esperienza fortemente ottimizzata per smartphone, mantenendo piena usabilità da computer.
- Due temi selezionabili dalla sezione Profilo: light e dark.
- Tema light ispirato alla superficie marina: blu/azzurro, bianco e relative sfumature.
- Tema dark ispirato alla profondità marina.
- Interazione semplice e leggibile anche per utenti senior, pur mantenendo appeal per la fascia 20–40 anni.
- Buona leggibilità in condizioni di elevata luminosità diurna.

### Accesso

- Registrazione account.
- Modalità ospite limitata alla consultazione delle sole previsioni meteo-marine.
- Verifica dell'indirizzo email durante la registrazione; il flusso attuale va verificato e corretto dove necessario.

### Ittiodex

- Requisiti funzionali ancora da definire.
- Direzione prodotto: catalogo dei pesci del Mediterraneo, analogo a un “Pokédex” ittico.

### Previsioni

- Consultazione delle previsioni meteo-marine dei giorni successivi con relativi indici.
- Aggiunta e rimozione di punti GPS personali da usare come località previsionali.
- Pulsanti/info contestuali che spieghino misure e indicatori mostrati.
- Suggerimento dell'indice di pesca e delle specie potenzialmente più interessanti in base alle condizioni disponibili.

### Mappa e spot

- CRUD degli spot con nome, coordinate GPS, note, foto e visibilità.
- Visibilità prevista: privata, globale oppure gruppo; quando si seleziona gruppo deve essere indicato quale gruppo.
- Selezione della mappa da visualizzare: privata, globale oppure di uno specifico gruppo.
- Elenco degli spot dell'utente.
- Preferiti per spot privati o globali.
- Ricerca degli spot.

### Diario catture

- CRUD delle catture.
- Campi: specie, spot o coordinate GPS, data/ora, esca o artificiale, tecnica di pesca, peso, lunghezza, foto, attrezzatura già registrata, note e visibilità.
- Se una cattura usa coordinate non appartenenti a uno spot salvato, proporre il salvataggio delle coordinate come nuovo spot.
- Timestamp locale corrente come valore iniziale per data e ora.
- Visibilità prevista: privata, globale oppure gruppo.
- Elenco e ricerca delle catture dell'utente.
- Apertura a dimensione completa delle foto delle catture.

### Attrezzatura

- CRUD degli elementi di attrezzatura.
- Campi: categoria, modello, marca, specifiche e note.
- Elenco, ordinamento per categoria e ricerca.
- CRUD di configurazioni/montature ricorrenti con almeno canna, mulinello, lenza madre e terminale.

### Statistiche

- La pagina attuale è considerata adeguata; evitare modifiche non motivate dai requisiti successivi.

### Profilo

- Mostrare nome utente, immagine profilo, email, stato sincronizzazione cloud, riepilogo del numero di spot/catture/attrezzatura e spazio complessivo occupato dalle foto.
- Permettere la modifica di nome utente e immagine profilo.
- Logout.
- Richiesta eliminazione account con periodo di 30 giorni prima della cancellazione definitiva e possibilità di annullamento durante tale periodo; il meccanismo definitivo va progettato prima dell'implementazione.

## SHOULD

- Ruolo amministratore per gli account autorizzati dal progetto.
- Sezione amministrativa per controlli e piccola manutenzione e per visualizzare, nei limiti tecnici e di privacy definiti, lo stato degli utenti.
- Gli identificativi degli amministratori non devono essere hardcoded nel client pubblico; vanno gestiti tramite un meccanismo autorizzativo lato server/database.

## WOULD

- Gruppi (“ciurme” o “gilde”) con ingresso su invito e condivisione di attrezzatura, spot e catture.
- Eventi/gare di pesca all'interno dei gruppi.
- Eventi/gare comunitarie create dagli amministratori.
- Raccolte statistiche mensili e classifiche nei gruppi.
- Riconoscimento del pesce da foto scattata o caricata, seguito da informazioni su specie, stagione, alimentazione, qualità gastronomiche, abitudini e curiosità.
- Ricette e suggerimenti gastronomici collegati alla specie catturata o consultata.

## Vincoli tecnici già consolidati

- React + Vite.
- Supabase per Auth, PostgreSQL e Storage.
- Render Static Site.
- PWA mobile-first.
- Mantenere il progetto compatibile con i piani gratuiti finché non viene presa una decisione esplicita diversa.
- Evitare servizi a pagamento, Edge Function, Realtime o polling non necessari.
- Foto compresse lato client e storage privato.
- `main` stabile; sviluppo su branch piccoli `feature/...`, `fix/...`, `chore/...` o `docs/...`.
- Integrazione su `main` solo tramite Pull Request revisionata e autorizzata manualmente.

## Regola di allineamento

Ogni PR funzionale deve dichiarare quali requisiti di questa baseline modifica o soddisfa e deve esplicitare separatamente l'impatto su:

1. frontend/runtime;
2. Render;
3. Supabase schema, RLS, Auth o Storage;
4. costi e compatibilità con i piani gratuiti;
5. migrazione e rollback quando applicabili.
