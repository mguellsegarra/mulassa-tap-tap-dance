-- MANUAL activation of the temporary-profile purge (202610180001_temporary_profiles.sql). Not a migration: the deploy
-- workflow never runs this file. Run it once in the SQL Editor (as postgres), only after the migration is applied and
-- the client that shows the 7-day notice is live. Without it the migration already acts on expired profiles: their rows
-- are hidden from the board at the deadline, an expired holder is deleted (account and results) when someone else asks
-- for its nickname, and a player's own expired profile is replaced when it publishes or creates a profile again. This job
-- deletes the rest, the ones nobody touches, and clears the old deadline of profiles confirmed since.
-- ASCII only (SQL Editor).

-- 1. Dry run: what the first run would delete, and the next deadlines (no rows change).
select count(*) as due_now from leaderboard_private.profiles p
  where p.expires_at <= now() and not leaderboard_private.verified(p.user_id);
select date_trunc('day', expires_at) as day, count(*) from leaderboard_private.profiles
  where expires_at > now() group by 1 order by 1;

-- 2. Activate: every 15 minutes, at most 500 accounts a run.
create extension if not exists pg_cron;
select cron.schedule('leaderboard-temporary-profiles', '*/15 * * * *',
  $$select leaderboard_private.purge_expired_profiles(500)$$);

-- 3. Check it runs (status succeeded; deleted accounts drop out of the dry-run count).
-- select jobid, schedule, command, active from cron.job where jobname = 'leaderboard-temporary-profiles';
-- select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;

-- Stop: select cron.unschedule('leaderboard-temporary-profiles');
