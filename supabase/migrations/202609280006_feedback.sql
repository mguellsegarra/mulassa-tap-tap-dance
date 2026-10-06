-- Feedback ("Bustia de la placa", the title screen's speech-bubble button). Written ONLY by the send-feedback Edge Function
-- (service role), after a Cloudflare Turnstile check; no client role can read or write anything here.
-- Privacy: no IP address is stored. The rate limit keeps sha256(IP + a secret daily salt), made in the function, and
-- those keys are purged after 1 day. Messages (and the optional e-mail) are purged after 12 months (on every new
-- message; a daily pg_cron job can also call purge_feedback()). Limits: 3 messages per key per
-- 10 minutes, 100 per 24 h in total (a flood never fills the table).
-- ASCII only (SQL Editor).
begin;
create schema if not exists feedback_private;
revoke all on schema feedback_private from public, anon, authenticated;

create table feedback_private.messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 5 and 1000),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  version text check (version is null or char_length(version) <= 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 160)
);
create index messages_created on feedback_private.messages(created_at);
create table feedback_private.rate (
  key text not null check (key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index rate_key on feedback_private.rate(key, created_at);
create index rate_created on feedback_private.rate(created_at);
alter table feedback_private.messages enable row level security;
alter table feedback_private.rate enable row level security;
revoke all on all tables in schema feedback_private from public, anon, authenticated;
revoke all on all sequences in schema feedback_private from public, anon, authenticated;

create function public.purge_feedback() returns void
language sql security definer set search_path = '' as $$
  delete from feedback_private.rate where created_at < now() - interval '1 day';
  delete from feedback_private.messages where created_at < now() - interval '12 months';
$$;

-- p_key: sha256 hex of (IP + daily salt), from the function. Raises feedback_rate_limit / feedback_invalid.
create function public.submit_feedback(p_key text, p_message text, p_email text, p_version text, p_user_agent text)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('feedback')); -- one at a time: the counts hold
  perform public.purge_feedback();
  if (select count(*) from feedback_private.rate r where r.key = p_key and r.created_at > now() - interval '10 minutes') >= 3
    or (select count(*) from feedback_private.rate) >= 100 then
    raise exception 'feedback_rate_limit' using errcode = 'P0001';
  end if;
  begin
    insert into feedback_private.rate(key) values (p_key);
    insert into feedback_private.messages(message, email, version, user_agent)
      values (p_message, nullif(p_email, ''), nullif(p_version, ''), nullif(p_user_agent, ''))
      returning id into v_id;
  exception when check_violation or not_null_violation then
    raise exception 'feedback_invalid' using errcode = '22023';
  end;
  return v_id;
end;
$$;
revoke all on function public.purge_feedback() from public, anon, authenticated;
revoke all on function public.submit_feedback(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.purge_feedback() to service_role;
grant execute on function public.submit_feedback(text, text, text, text, text) to service_role;
commit;
