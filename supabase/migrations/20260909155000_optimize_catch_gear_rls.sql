drop policy if exists "catch_gear_select_own" on public.catch_gear;
drop policy if exists "catch_gear_insert_own" on public.catch_gear;
drop policy if exists "catch_gear_delete_own" on public.catch_gear;

create policy "catch_gear_select_own"
on public.catch_gear
for select
using (
  exists (
    select 1 from public.catches c
    where c.id = catch_gear.catch_id and c.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.gear g
    where g.id = catch_gear.gear_id and g.user_id = (select auth.uid())
  )
);

create policy "catch_gear_insert_own"
on public.catch_gear
for insert
with check (
  exists (
    select 1 from public.catches c
    where c.id = catch_gear.catch_id and c.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.gear g
    where g.id = catch_gear.gear_id and g.user_id = (select auth.uid())
  )
);

create policy "catch_gear_delete_own"
on public.catch_gear
for delete
using (
  exists (
    select 1 from public.catches c
    where c.id = catch_gear.catch_id and c.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.gear g
    where g.id = catch_gear.gear_id and g.user_id = (select auth.uid())
  )
);
