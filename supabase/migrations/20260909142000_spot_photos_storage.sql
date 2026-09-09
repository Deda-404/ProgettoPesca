alter table public.fishing_spots
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spot-photos',
  'spot-photos',
  false,
  524288,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists spot_photos_select_own on storage.objects;
drop policy if exists spot_photos_insert_own on storage.objects;
drop policy if exists spot_photos_delete_own on storage.objects;

create policy spot_photos_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'spot-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy spot_photos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'spot-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) in ('webp', 'jpg', 'jpeg')
);

create policy spot_photos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'spot-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
