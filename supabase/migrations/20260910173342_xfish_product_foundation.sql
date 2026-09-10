alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists last_seen_at timestamptz,
  add column if not exists deletion_requested_at timestamptz;

create table if not exists public.fishing_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.fishing_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.fishing_spots
  add column if not exists visibility text not null default 'private',
  add column if not exists group_id uuid references public.fishing_groups(id) on delete set null;

update public.fishing_spots
set visibility = case when is_private then 'private' else 'global' end
where visibility = 'private';

alter table public.fishing_spots drop constraint if exists fishing_spots_visibility_check;
alter table public.fishing_spots add constraint fishing_spots_visibility_check check (visibility in ('private','global','group'));

alter table public.catches
  add column if not exists technique text,
  add column if not exists visibility text not null default 'private',
  add column if not exists group_id uuid references public.fishing_groups(id) on delete set null;

alter table public.catches drop constraint if exists catches_visibility_check;
alter table public.catches add constraint catches_visibility_check check (visibility in ('private','global','group'));

create table if not exists public.spot_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid not null references public.fishing_spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

create table if not exists public.gear_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rod_id uuid references public.gear(id) on delete set null,
  reel_id uuid references public.gear(id) on delete set null,
  main_line_id uuid references public.gear(id) on delete set null,
  leader_id uuid references public.gear(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fishing_groups_owner_id_idx on public.fishing_groups(owner_id);
create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists fishing_spots_visibility_group_idx on public.fishing_spots(visibility, group_id);
create index if not exists catches_visibility_group_idx on public.catches(visibility, group_id);
create index if not exists spot_favorites_spot_id_idx on public.spot_favorites(spot_id);
create index if not exists gear_setups_user_id_idx on public.gear_setups(user_id);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;

create or replace function public.is_xfish_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_xfish_group_owner(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fishing_groups fg
    where fg.id = target_group_id and fg.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.current_user_is_admin() from public, anon;
revoke execute on function public.is_xfish_group_member(uuid) from public, anon;
revoke execute on function public.is_xfish_group_owner(uuid) from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.is_xfish_group_member(uuid) to authenticated;
grant execute on function public.is_xfish_group_owner(uuid) to authenticated;

alter table public.fishing_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.spot_favorites enable row level security;
alter table public.gear_setups enable row level security;

drop policy if exists fishing_groups_select_member on public.fishing_groups;
drop policy if exists fishing_groups_insert_owner on public.fishing_groups;
drop policy if exists fishing_groups_update_owner on public.fishing_groups;
drop policy if exists fishing_groups_delete_owner on public.fishing_groups;
create policy fishing_groups_select_member on public.fishing_groups for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_xfish_group_member(id));
create policy fishing_groups_insert_owner on public.fishing_groups for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy fishing_groups_update_owner on public.fishing_groups for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy fishing_groups_delete_owner on public.fishing_groups for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists group_members_select_related on public.group_members;
drop policy if exists group_members_insert_owner on public.group_members;
drop policy if exists group_members_delete_owner_or_self on public.group_members;
create policy group_members_select_related on public.group_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_xfish_group_owner(group_id));
create policy group_members_insert_owner on public.group_members for insert to authenticated
  with check (public.is_xfish_group_owner(group_id));
create policy group_members_delete_owner_or_self on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_xfish_group_owner(group_id));

create or replace function public.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members(group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (group_id, user_id) do update set role = 'owner';
  return new;
end;
$$;
revoke execute on function public.add_group_owner_membership() from public, anon, authenticated;
drop trigger if exists fishing_groups_add_owner on public.fishing_groups;
create trigger fishing_groups_add_owner after insert on public.fishing_groups
for each row execute function public.add_group_owner_membership();

drop policy if exists spots_all_own on public.fishing_spots;
drop policy if exists spots_select_visible on public.fishing_spots;
drop policy if exists spots_insert_own on public.fishing_spots;
drop policy if exists spots_update_own on public.fishing_spots;
drop policy if exists spots_delete_own on public.fishing_spots;
create policy spots_select_visible on public.fishing_spots for select to authenticated
  using (
    user_id = (select auth.uid())
    or visibility = 'global'
    or (visibility = 'group' and group_id is not null and public.is_xfish_group_member(group_id))
  );
create policy spots_insert_own on public.fishing_spots for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (visibility <> 'group' or (group_id is not null and public.is_xfish_group_member(group_id)))
  );
create policy spots_update_own on public.fishing_spots for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (visibility <> 'group' or (group_id is not null and public.is_xfish_group_member(group_id)))
  );
create policy spots_delete_own on public.fishing_spots for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists catches_all_own on public.catches;
drop policy if exists catches_select_visible on public.catches;
drop policy if exists catches_insert_own on public.catches;
drop policy if exists catches_update_own on public.catches;
drop policy if exists catches_delete_own on public.catches;
create policy catches_select_visible on public.catches for select to authenticated
  using (
    user_id = (select auth.uid())
    or visibility = 'global'
    or (visibility = 'group' and group_id is not null and public.is_xfish_group_member(group_id))
  );
create policy catches_insert_own on public.catches for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (visibility <> 'group' or (group_id is not null and public.is_xfish_group_member(group_id)))
  );
create policy catches_update_own on public.catches for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (visibility <> 'group' or (group_id is not null and public.is_xfish_group_member(group_id)))
  );
create policy catches_delete_own on public.catches for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists spot_favorites_select_own on public.spot_favorites;
drop policy if exists spot_favorites_insert_own on public.spot_favorites;
drop policy if exists spot_favorites_delete_own on public.spot_favorites;
create policy spot_favorites_select_own on public.spot_favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy spot_favorites_insert_own on public.spot_favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.fishing_spots s where s.id = spot_id and s.visibility in ('private','global'))
  );
create policy spot_favorites_delete_own on public.spot_favorites for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists gear_setups_all_own on public.gear_setups;
create policy gear_setups_all_own on public.gear_setups for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_visible_to_admin on public.profiles;
create policy profiles_select_visible_to_admin on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.current_user_is_admin());

revoke all on public.fishing_groups, public.group_members, public.spot_favorites, public.gear_setups from anon;
grant select, insert, update, delete on public.fishing_groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, delete on public.spot_favorites to authenticated;
grant select, insert, update, delete on public.gear_setups to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 524288, array['image/webp','image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_photos_select_own on storage.objects;
drop policy if exists profile_photos_insert_own on storage.objects;
drop policy if exists profile_photos_delete_own on storage.objects;
create policy profile_photos_select_own on storage.objects for select to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and owner_id = (select auth.uid()::text));
create policy profile_photos_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy profile_photos_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and owner_id = (select auth.uid()::text));

create or replace function public.my_photo_storage_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)::bigint
  from storage.objects o
  where o.owner_id = (select auth.uid())::text
    and o.bucket_id in ('catch-photos','spot-photos','profile-photos');
$$;
revoke execute on function public.my_photo_storage_bytes() from public, anon;
grant execute on function public.my_photo_storage_bytes() to authenticated;
