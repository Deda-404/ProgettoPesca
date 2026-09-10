create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fishing_spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  latitude double precision,
  longitude double precision,
  spot_type text,
  notes text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid references public.fishing_spots(id) on delete set null,
  species text not null,
  caught_at timestamptz not null default now(),
  weight_kg numeric(6,2),
  length_cm numeric(6,1),
  lure text,
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  brand text,
  model text,
  specs text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fishing_spots_user_id on public.fishing_spots(user_id);
create index if not exists idx_catches_user_id on public.catches(user_id);
create index if not exists idx_catches_caught_at on public.catches(caught_at desc);
create index if not exists idx_gear_user_id on public.gear(user_id);

alter table public.profiles enable row level security;
alter table public.fishing_spots enable row level security;
alter table public.catches enable row level security;
alter table public.gear enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists spots_all_own on public.fishing_spots;
drop policy if exists catches_all_own on public.catches;
drop policy if exists gear_all_own on public.gear;

create policy profiles_select_own on public.profiles for select using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy spots_all_own on public.fishing_spots for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy catches_all_own on public.catches for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy gear_all_own on public.gear for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists spots_set_updated_at on public.fishing_spots;
create trigger spots_set_updated_at before update on public.fishing_spots for each row execute function public.set_updated_at();
drop trigger if exists catches_set_updated_at on public.catches;
create trigger catches_set_updated_at before update on public.catches for each row execute function public.set_updated_at();
drop trigger if exists gear_set_updated_at on public.gear;
create trigger gear_set_updated_at before update on public.gear for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();