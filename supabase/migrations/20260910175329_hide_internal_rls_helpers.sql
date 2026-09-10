create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false); $$;

create or replace function private.is_xfish_group_member(target_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.group_members gm where gm.group_id = target_group_id and gm.user_id = (select auth.uid())); $$;

create or replace function private.is_xfish_group_owner(target_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.fishing_groups fg where fg.id = target_group_id and fg.owner_id = (select auth.uid())); $$;

create or replace function private.can_view_spot_photo(object_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.fishing_spots s
    where s.photo_path = object_name
      and (s.user_id = (select auth.uid()) or s.visibility = 'global' or (s.visibility = 'group' and s.group_id is not null and private.is_xfish_group_member(s.group_id)))
  );
$$;

revoke execute on function private.current_user_is_admin() from public, anon;
revoke execute on function private.is_xfish_group_member(uuid) from public, anon;
revoke execute on function private.is_xfish_group_owner(uuid) from public, anon;
revoke execute on function private.can_view_spot_photo(text) from public, anon;
grant execute on function private.current_user_is_admin() to authenticated;
grant execute on function private.is_xfish_group_member(uuid) to authenticated;
grant execute on function private.is_xfish_group_owner(uuid) to authenticated;
grant execute on function private.can_view_spot_photo(text) to authenticated;

drop policy if exists fishing_groups_select_member on public.fishing_groups;
create policy fishing_groups_select_member on public.fishing_groups for select to authenticated using (owner_id = (select auth.uid()) or private.is_xfish_group_member(id));
drop policy if exists group_members_select_related on public.group_members;
create policy group_members_select_related on public.group_members for select to authenticated using (user_id = (select auth.uid()) or private.is_xfish_group_owner(group_id));
drop policy if exists group_members_insert_owner on public.group_members;
create policy group_members_insert_owner on public.group_members for insert to authenticated with check (private.is_xfish_group_owner(group_id));
drop policy if exists group_members_delete_owner_or_self on public.group_members;
create policy group_members_delete_owner_or_self on public.group_members for delete to authenticated using (user_id = (select auth.uid()) or private.is_xfish_group_owner(group_id));

drop policy if exists spots_select_visible on public.fishing_spots;
create policy spots_select_visible on public.fishing_spots for select to authenticated using (user_id = (select auth.uid()) or visibility = 'global' or (visibility = 'group' and group_id is not null and private.is_xfish_group_member(group_id)));
drop policy if exists spots_insert_own on public.fishing_spots;
create policy spots_insert_own on public.fishing_spots for insert to authenticated with check (user_id = (select auth.uid()) and (visibility <> 'group' or (group_id is not null and private.is_xfish_group_member(group_id))));
drop policy if exists spots_update_own on public.fishing_spots;
create policy spots_update_own on public.fishing_spots for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (visibility <> 'group' or (group_id is not null and private.is_xfish_group_member(group_id))));

drop policy if exists catches_select_visible on public.catches;
create policy catches_select_visible on public.catches for select to authenticated using (user_id = (select auth.uid()) or visibility = 'global' or (visibility = 'group' and group_id is not null and private.is_xfish_group_member(group_id)));
drop policy if exists catches_insert_own on public.catches;
create policy catches_insert_own on public.catches for insert to authenticated with check (user_id = (select auth.uid()) and (visibility <> 'group' or (group_id is not null and private.is_xfish_group_member(group_id))));
drop policy if exists catches_update_own on public.catches;
create policy catches_update_own on public.catches for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (visibility <> 'group' or (group_id is not null and private.is_xfish_group_member(group_id))));

drop policy if exists profiles_select_visible_to_admin on public.profiles;
create policy profiles_select_visible_to_admin on public.profiles for select to authenticated using (id = (select auth.uid()) or private.current_user_is_admin());

drop policy if exists spot_photos_select_visible on storage.objects;
create policy spot_photos_select_visible on storage.objects for select to authenticated using (bucket_id = 'spot-photos' and private.can_view_spot_photo(name));

drop function if exists public.can_view_spot_photo(text);
drop function if exists public.current_user_is_admin();
drop function if exists public.is_xfish_group_member(uuid);
drop function if exists public.is_xfish_group_owner(uuid);
