drop trigger if exists fishing_groups_set_updated_at on public.fishing_groups;
create trigger fishing_groups_set_updated_at before update on public.fishing_groups for each row execute function public.set_updated_at();
drop trigger if exists gear_setups_set_updated_at on public.gear_setups;
create trigger gear_setups_set_updated_at before update on public.gear_setups for each row execute function public.set_updated_at();

create or replace function public.can_view_spot_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.fishing_spots s
    where s.photo_path = object_name
      and (
        s.user_id = (select auth.uid())
        or s.visibility = 'global'
        or (s.visibility = 'group' and s.group_id is not null and public.is_xfish_group_member(s.group_id))
      )
  );
$$;
revoke execute on function public.can_view_spot_photo(text) from public, anon;
grant execute on function public.can_view_spot_photo(text) to authenticated;

drop policy if exists spot_photos_select_own on storage.objects;
drop policy if exists spot_photos_select_visible on storage.objects;
create policy spot_photos_select_visible on storage.objects for select to authenticated
using (
  bucket_id = 'spot-photos'
  and public.can_view_spot_photo(name)
);
