revoke insert on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, last_seen_at, deletion_requested_at) on public.profiles to authenticated;

-- Questi helper sono usati internamente dalle policy. Manteniamo EXECUTE soltanto
-- dove PostgREST/RLS ne ha bisogno e non accettano identita arbitrarie.
revoke execute on function public.current_user_is_admin() from authenticated;
revoke execute on function public.is_xfish_group_member(uuid) from authenticated;
revoke execute on function public.is_xfish_group_owner(uuid) from authenticated;

-- Il conteggio spazio e un RPC esplicito e owner-scoped.
grant execute on function public.my_photo_storage_bytes() to authenticated;
