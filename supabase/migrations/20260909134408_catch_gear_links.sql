create table if not exists public.catch_gear (
  catch_id uuid not null references public.catches(id) on delete cascade,
  gear_id uuid not null references public.gear(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (catch_id, gear_id)
);

alter table public.catch_gear enable row level security;

create index if not exists catch_gear_gear_id_idx on public.catch_gear (gear_id);

create policy "catch_gear_select_own"
on public.catch_gear
for select
using (
  exists (
    select 1 from public.catches c
    where c.id = catch_gear.catch_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.gear g
    where g.id = catch_gear.gear_id and g.user_id = auth.uid()
  )
);

create policy "catch_gear_insert_own"
on public.catch_gear
for insert
with check (
  exists (
    select 1 from public.catches c
    where c.id = catch_gear.catch_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.gear g
    where g.id = catch_gear.gear_id and g.user_id = auth.uid()
  )
);

create policy "catch_gear_delete_own"
on public.catch_gear
for delete
using (
  exists (
    select 1 from public.catches c
    where c.id = catch_gear.catch_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.gear g
    where g.id = catch_gear.gear_id and g.user_id = auth.uid()
  )
);
