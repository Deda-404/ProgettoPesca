# XFish · feature/supabase-auth

Questa branch introduce autenticazione Supabase e sincronizzazione cloud del diario catture.

## Stato

- UI login/registrazione pronta
- modalità ospite pronta
- sessione persistente pronta
- repository `catches` pronto
- schema/migrazione Supabase pronta
- branding XFish applicato
- preview Render disponibile

## Da completare prima del merge

1. creare il progetto Supabase XFish
2. applicare la migrazione
3. impostare `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` su Render
4. verificare registrazione, login, logout e CRUD catture contro il backend reale
