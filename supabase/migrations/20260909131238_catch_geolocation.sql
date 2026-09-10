alter table public.catches
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_label text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'catches_latitude_check'
      and conrelid = 'public.catches'::regclass
  ) then
    alter table public.catches
      add constraint catches_latitude_check
      check (latitude is null or latitude between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'catches_longitude_check'
      and conrelid = 'public.catches'::regclass
  ) then
    alter table public.catches
      add constraint catches_longitude_check
      check (longitude is null or longitude between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'catches_coordinate_pair_check'
      and conrelid = 'public.catches'::regclass
  ) then
    alter table public.catches
      add constraint catches_coordinate_pair_check
      check ((latitude is null) = (longitude is null));
  end if;
end
$$;

create index if not exists catches_user_location_idx
  on public.catches(user_id, latitude, longitude)
  where latitude is not null and longitude is not null;
