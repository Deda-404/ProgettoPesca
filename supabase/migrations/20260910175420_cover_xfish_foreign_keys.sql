create index if not exists catches_group_id_idx on public.catches(group_id) where group_id is not null;
create index if not exists fishing_spots_group_id_idx on public.fishing_spots(group_id) where group_id is not null;
create index if not exists gear_setups_rod_id_idx on public.gear_setups(rod_id) where rod_id is not null;
create index if not exists gear_setups_reel_id_idx on public.gear_setups(reel_id) where reel_id is not null;
create index if not exists gear_setups_main_line_id_idx on public.gear_setups(main_line_id) where main_line_id is not null;
create index if not exists gear_setups_leader_id_idx on public.gear_setups(leader_id) where leader_id is not null;
