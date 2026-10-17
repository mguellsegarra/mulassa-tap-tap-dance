# Sentry backup monitor: Computer Use handoff

This is a proposed operation for Marc to authorize separately, not evidence of configured monitoring.
No credentials or private notification addresses belong in the response or this repository.

## Prompt

Prepare and test Sentry monitoring for Mulassa's daily database backup using Computer Use.
Keep all services on their current free plan. Inspect existing monitors and quota first. Stop before
any charge, plan change, replacement of another service's monitor, or quota overrun.

Target: organization `ondori`, existing project `mulassa-tap-tap-dance`.
Suggested monitor slug: `mulassa-db-backup`.

Before each external change, show Marc the exact target and proposed action and obtain explicit chat
confirmation. Do not interpret this preparation prompt as blanket authorization for those changes.

Prepare the following monitor configuration:

- Daily crontab `17 3 * * *`, timezone `Etc/UTC`.
- Check-in margin 120 minutes; max runtime 60 minutes.
- Failure issue threshold 1; recovery threshold 1.
- Explicit alert delivery to Marc's existing verified destination for errors, timeouts and missed
  check-ins, including a recurrence after recovery. Ask Marc if the destination cannot be identified.

With approval for each change and test notification, configure the monitor and prove delivery using
synthetic check-ins only. Test an error, recover, then temporarily use a short schedule and deliberately
miss a check-in to test the absent-run notification. Verify receipt with Marc. Restore the daily UTC
schedule and margins, and verify the final saved configuration. Avoid leaving a synthetic incident open.
Do not run or interrupt any backup for these tests.

The check-in URL contains a credential: do not show, photograph, log, save to the repository or paste it
in chat. Do not inspect 1Password. Ask Marc to transfer it privately to environment secret
`BACKUP_SENTRY_CHECKIN_URL` in GitHub's `db-backup-production`, after separate confirmation for that change.
Do not create any additional API token if the UI cannot perform a test: report the missing capability.

Do not change `BACKUP_ENABLED`, `BACKUP_SCHEDULE_ENABLED`, `BACKUP_SENTRY_ENABLED`, environment approvals,
branch protection, code, production Supabase, R2, DNS or Cloudflare. Do not dispatch a workflow or access
backups or player data.

Return only: monitor link and slug, free quota result, saved schedule/margins/thresholds, alert routing
verified without the address, synthetic error and missed-notification results and Marc's receipt,
final incident state, and whether Marc has saved the secret. Distinguish untested items. Never report
that daily backups are active based on monitor setup alone.
