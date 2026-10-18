# Cloudflare backup scheduler

Status: prepared locally, not deployed or activated. This replaces only GitHub's unreliable cron
delivery. The existing GitHub runner still exports, encrypts and verifies the R2 backup, and Sentry
independently detects failure, timeout or absence. Dispatch acceptance is not backup success.

## Scope and credentials

Worker `mulassa-backup-scheduler` has one fixed destination: `db-backup.yml` on `master` in this
repository. It has no public HTTP/preview URL, route, storage binding, database access or R2 access.
Its HTTP handler always returns 404, including if someone later exposes a route accidentally.

The only new secret is `GITHUB_ACTIONS_TOKEN`, stored with Cloudflare's secret binding, not `[vars]`,
an environment file, a shell argument or the public repository. Use a dedicated fine-grained PAT:
resource owner Marc, repository access only this repository, Actions **read and write**, plus the
mandatory Metadata read permission. Do not grant Contents write, administration or secret access.
Choose an expiry explicitly (90 days is a reasonable starting point) and record a private renewal
reminder before expiry. Revoking or expiring the token stops dispatch and should trigger Sentry's
missing-backup alert. Never reuse the CLI's token or the backup's database/R2 credentials.

Residual access: GitHub scopes Actions write to a repository, **not to one workflow**. A stolen token
could manage other Actions runs in this repository. The Worker itself fixes the workflow and branch;
that is not a server-side token restriction. Restrict Cloudflare editing access accordingly.

Only fixed result/error codes reach Worker logs. The Worker never parses remote response bodies,
follows redirects or automatically retries. A timeout may occur after GitHub has already accepted the
dispatch: inspect Actions before retrying. There is no persistent deduplication or exactly-once
guarantee. Existing workflow concurrency serializes executions; Sentry verifies completion.

## Approved rollout, one operation at a time

Each commit, push, PR, merge, deployment, credential/permission change, trigger change and real backup
test requires explicit chat confirmation under AGENTS.md. Preparation is not activation permission.

1. Merge the dispatch-only GitHub workflow and this Worker. Verify the Pages deploy job is skipped.
   Retain `BACKUP_ENABLED=true`, `BACKUP_SENTRY_ENABLED=true`, production environment secrets and the
   `master` deployment restriction. Required-reviewer removal is already an explicitly accepted policy;
   confirm its current state. Required reviews/checks on `master` remain zero by Marc's decision, so
   branch protection does not enforce independent review of code receiving production credentials.
2. With separate approval, remove obsolete repository variable `BACKUP_SCHEDULE_ENABLED`. Do not
   delete the backup workflow, Sentry monitor, existing backups, or other scheduled workflows.
3. Through Computer Use, inspect the intended Cloudflare account, its Workers **Free** plan and cron
   quota. Stop before any charge or plan upgrade. Do not touch the feedback Worker or existing crons.
   Free currently includes five cron triggers per account; verify available quota on the account.
4. Approve deployment of `workers/backup-scheduler/wrangler.toml` to that verified account. The committed
   configuration has `workers_dev=false`, `preview_urls=false`, `SCHEDULER_ENABLED="false"`, `crons=[]`.
   No account IDs or credentials are added to the repo. Use approved existing authentication through
   the intended client; do not create or print another Cloudflare token just to deploy.
5. Approve creating the dedicated GitHub PAT with the permissions above. Marc privately transfers it
   to the Worker's `GITHUB_ACTIONS_TOKEN` secret. Do not inspect 1Password, take screenshots of the token,
   read the value into chat or put it in a command line. Record only name, scope and expiry privately.
6. Approve changing only this Worker's `SCHEDULER_ENABLED` to `"true"` and cron to `17 3 * * *` (03:17 UTC,
   04:17 winter / 05:17 summer in Europe/Madrid). Keep Sentry's matching daily UTC schedule, 120-minute
   margin, 60-minute runtime and failure/recovery thresholds of one. Worker logs may contain only
   dispatch result codes. Cron changes can take up to 15 minutes to propagate.
7. Approve one end-to-end dispatch test if needed. If the dashboard cannot trigger a scheduled event,
   wait for the daily trigger; do not expose an HTTP trigger or invent a broad token-based test command.
   Verify Worker invocation, resulting GitHub run on `master`, `BACKUP_OK`, zero artifacts, and the
   corresponding healthy Sentry check-in. Confirm an actual timed execution before calling daily
   scheduling validated. Sentry's previously proven missed-check-in alert remains independent.

Dashboard changes to cron and enablement must be reconciled into the deployment configuration before
any subsequent redeployment. The committed disabled defaults deliberately pause automation if deployed
again without that reconciliation. Never deploy this folder blindly over the live Worker.

## Pausing and recovery

- To stop dispatch, separately approve setting this Worker's `SCHEDULER_ENABLED="false"` and `crons=[]`.
- To block all exports, including manual dispatch, separately approve `BACKUP_ENABLED=false` in GitHub.
- A failed dispatch does not damage an existing R2 copy. Sentry should report a missed check-in if no
  backup completes. Review Actions before any manual retry after a timeout.
- Do not automatically restore, delete remote backups or reset credentials when an alert arrives.

## Primary documentation

- [Cloudflare cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare Free limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub workflow dispatch and required token permissions](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
