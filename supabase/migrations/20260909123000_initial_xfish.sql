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
  updated_at timestamptz not null default now(),
  constraint fishing_spots_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint fishing_spots_longitude_check check (longitude is null or longitude between -180 and 180)
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
  updated_at timestamptz not null default now(),
  constraint catches_weight_check check (weight_kg is null or weight_kg >= 0),
  constraint catches_length_check check (length_cm is null or length_cm >= 0)
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

create index if not exists fishing_spots_user_id_idx on public.fishing_spots(user_id);
create index if not exists catches_user_id_caught_at_idx on public.catches(user_id, caught_at desc);
create index if not exists catches_spot_id_idx on public.catches(spot_id);
create index if not exists gear_user_id_idx on public.gear(user_id);

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

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy spots_all_own on public.fishing_spots
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy catches_all_own on public.catches
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy gear_all_own on public.gear
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
