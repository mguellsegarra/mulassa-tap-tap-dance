-- The feedback box sends every message straight to Marc's e-mail (send-feedback, Gmail) and stores nothing
-- (Marc, 2026-09-28): drop what 202609280006 created. ASCII only (SQL Editor).
begin;
-- the optional nightly purge (pg_cron) would fail every night once purge_feedback() is gone
do $$
begin
  if pg_catalog.to_regclass('cron.job') is not null then
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'purge-feedback';
  end if;
end $$;
drop function if exists public.submit_feedback(text, text, text, text, text);
drop function if exists public.purge_feedback();
drop schema if exists feedback_private cascade;
commit;
