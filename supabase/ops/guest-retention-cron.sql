-- MANUAL ONLY. Run the dry count first, review it, then separately approve activation.
-- No migration installs pg_cron or schedules deletion. Verified accounts are never candidates.
-- Run as postgres after the guest migrations and the corresponding privacy text are live.

-- 1. Dry run: read only; counts include abandoned Auth accounts without a profile.
select count(*) as inactive_guests from auth.users u
  left join leaderboard_private.profiles p on p.user_id=u.id
  where u.email_confirmed_at is null
    and greatest(u.created_at,u.last_sign_in_at,p.last_active_at)<now()-interval '12 months';

-- 2. Activate ONLY after reviewing the count and explicitly approving this operation.
-- create extension if not exists pg_cron;
-- select cron.schedule('leaderboard-inactive-guests','17 3 * * *',
--   $$select leaderboard_private.purge_inactive_guests(500)$$);

-- 3. Verify actual delivery, not just that a schedule exists.
-- select jobid,schedule,command,active from cron.job where jobname='leaderboard-inactive-guests';
-- select status,return_message,start_time from cron.job_run_details order by start_time desc limit 10;
-- Stop: select cron.unschedule('leaderboard-inactive-guests');
