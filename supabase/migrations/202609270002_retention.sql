begin;
-- Admin-only enumeration; public readers cannot discover account identifiers.
create function public.leaderboard_expired_players(p_limit integer default 100)
returns table(user_id uuid)
language sql security definer set search_path = '' as $$
  select u.id from auth.users u
  left join leaderboard_private.profiles p on p.user_id = u.id
  where u.is_anonymous and greatest(u.created_at, u.last_sign_in_at, p.last_active_at) < now() - interval '12 months'
  order by greatest(u.created_at, u.last_sign_in_at, p.last_active_at), u.id
  limit least(greatest(coalesce(p_limit, 100), 1), 1000);
$$;
revoke all on function public.leaderboard_expired_players(integer) from public, anon, authenticated;
grant execute on function public.leaderboard_expired_players(integer) to service_role;
commit;
