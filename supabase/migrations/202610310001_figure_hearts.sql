-- The hearts on a figure: one per confirmed account and figure. Only totals and the caller's own heart are readable, never who
-- gave them. They go with the Auth user (cascade), so deleting a profile deletes its hearts. ASCII only (SQL Editor).
begin;
create table if not exists leaderboard_private.figure_hearts (
  user_id uuid not null references auth.users(id) on delete cascade,
  figure_id text not null check (figure_id ~ '^[a-z0-9-]{1,64}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, figure_id)
);
create index if not exists figure_hearts_figure on leaderboard_private.figure_hearts (figure_id);
alter table leaderboard_private.figure_hearts enable row level security;

create or replace function public.get_figure_hearts()
returns table(figure_id text, hearts bigint, mine boolean)
language sql stable security definer set search_path = '' as $$
  select h.figure_id, count(*), coalesce(bool_or(h.user_id = auth.uid()), false)
  from leaderboard_private.figure_hearts h group by h.figure_id;
$$;
revoke all on function public.get_figure_hearts() from public;
grant execute on function public.get_figure_hearts() to anon, authenticated;

-- A guest's session is authenticated too: the address must be confirmed here, on the server.
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
    if (select count(*) from leaderboard_private.figure_hearts where user_id = v_uid) >= 300 then
      raise exception 'figure_heart_limit' using errcode = '54000';
    end if;
    insert into leaderboard_private.figure_hearts (user_id, figure_id) values (v_uid, p_figure)
      on conflict do nothing;
  else
    delete from leaderboard_private.figure_hearts where user_id = v_uid and figure_id = p_figure;
  end if;
  select count(*) into v_total from leaderboard_private.figure_hearts where figure_id = p_figure;
  return v_total;
end $$;
revoke all on function public.set_figure_heart(text, boolean) from public, anon;
grant execute on function public.set_figure_heart(text, boolean) to authenticated;
commit;
