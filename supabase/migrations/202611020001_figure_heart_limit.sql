-- The limit of 300 hearts per account, atomic per account (two taps at once could both pass the count), and a heart already
-- given stays idempotent at the limit (a retry reads as saved). A migration of its own: the earlier one may already be applied.
begin;
create or replace function public.set_figure_heart(p_figure text, p_on boolean)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_total bigint;
begin
  if v_uid is null or not exists(select 1 from auth.users
      where id = v_uid and not is_anonymous and email_confirmed_at is not null) then
    raise exception 'figure_heart_confirm_required' using errcode = '28000';
  end if;
  if p_on then
    perform pg_advisory_xact_lock(hashtextextended('figure_hearts:' || v_uid::text, 0));
    if not exists(select 1 from leaderboard_private.figure_hearts where user_id = v_uid and figure_id = p_figure) then
      if (select count(*) from leaderboard_private.figure_hearts where user_id = v_uid) >= 300 then
        raise exception 'figure_heart_limit' using errcode = '54000';
      end if;
      insert into leaderboard_private.figure_hearts (user_id, figure_id) values (v_uid, p_figure)
        on conflict do nothing;
    end if;
  else
    delete from leaderboard_private.figure_hearts where user_id = v_uid and figure_id = p_figure;
  end if;
  select count(*) into v_total from leaderboard_private.figure_hearts where figure_id = p_figure;
  return v_total;
end $$;
revoke all on function public.set_figure_heart(text, boolean) from public, anon;
grant execute on function public.set_figure_heart(text, boolean) to authenticated;
commit;
