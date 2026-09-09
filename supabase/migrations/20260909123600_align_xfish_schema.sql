alter table public.fishing_spots drop constraint if exists fishing_spots_latitude_check;
alter table public.fishing_spots add constraint fishing_spots_latitude_check check (latitude is null or latitude between -90 and 90);

alter table public.fishing_spots drop constraint if exists fishing_spots_longitude_check;
alter table public.fishing_spots add constraint fishing_spots_longitude_check check (longitude is null or longitude between -180 and 180);

alter table public.catches drop constraint if exists catches_weight_check;
alter table public.catches add constraint catches_weight_check check (weight_kg is null or weight_kg >= 0);

alter table public.catches drop constraint if exists catches_length_check;
alter table public.catches add constraint catches_length_check check (length_cm is null or length_cm >= 0);

create index if not exists fishing_spots_user_id_idx on public.fishing_spots(user_id);
create index if not exists catches_user_id_caught_at_idx on public.catches(user_id, caught_at desc);
create index if not exists catches_spot_id_idx on public.catches(spot_id);
create index if not exists gear_user_id_idx on public.gear(user_id);
