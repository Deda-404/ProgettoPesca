-- Manteniamo solo gli indici utili alle query reali di XFish.
-- Riduce spazio e costo di scrittura sul piano Supabase Free.

drop index if exists public.idx_fishing_spots_user_id;
drop index if exists public.idx_gear_user_id;
drop index if exists public.idx_catches_user_id;
drop index if exists public.idx_catches_caught_at;
