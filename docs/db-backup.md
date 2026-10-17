# Database backup and restore

Status (2026-10-17): **Manual GitHub backup and local production restore tested; daily automation pending.** On 2026-10-17,
the coordinator exported the four production schemas, encrypted the archive and verified its private R2
readback. A downloaded archive was authenticated by age and restored into an isolated PostgreSQL 17
container with no network or published ports and tmpfs storage. All 33 table-data entries restored and
15 validation groups passed, including ACL/RLS, owners, foreign keys, sequences, migration inventory and
a rolled-back synthetic player flow. The container, plaintext and downloaded ciphertext were removed.

An earlier synthetic rehearsal also restored selected Auth and application data into a fresh managed
Supabase project and checked password login, anonymous sign-in, ranking, publication and deletion.
The production rehearsal validates local database restoration, not managed Supabase Auth or email recovery.
A subsequent manual GitHub Actions run completed with `BACKUP_OK` and zero artifacts. Daily scheduling,
Sentry notification delivery and production Auth/email recovery remain unverified.
Private manifests and reports stay outside this public repository; no production object names or data belong here.

The pieces:

- `tools/db_backup.py`: the coordinator (`preflight [--staged]`, `run`, and guarded `preflight-production [--staged]`, `run-production`). It runs `pg_dump | age`, uploads the
  ciphertext in one PUT, reads it back and compares SHA-256 and size. Plain Python, no framework.
- `tools/db-backup-requirements.txt`: hash-locked `boto3` (CI only; imported lazily, the tests do not need it).
- `.github/workflows/db-backup.yml`: manual dispatch plus a daily UTC trigger; all runs require repository
  variable `BACKUP_ENABLED=true`, and scheduled runs additionally require `BACKUP_SCHEDULE_ENABLED=true`.
- `tests/db_backup_test.py` (run by `npm run check` through `tests/db-backup.mjs`).

## What a run does

1. `BACKUP_ENABLED` must be exactly `true`. Anything else (unset, empty, `false`) prints `BACKUP_DISABLED` and exits 0
   without reading any other setting, running any tool or opening any connection. Any other value is a config error.
2. All settings are parsed and validated (`parse_config` is pure). The production commands additionally
   require an exact match with `BACKUP_PRODUCTION_POLICY` before invoking any tool or opening a connection. Unknown `BACKUP_*` names, malformed values, a
   non-HTTPS bucket endpoint, a database password in a URL: all hard failures. Output names only the setting.
3. Host checks: work directory exists, is yours and is outside the repository; `pg_dump` and `age` are on `PATH`;
   `pg_dump --version` reports exactly `BACKUP_PG_MAJOR`.
4. A fresh `0700` directory is created under `BACKUP_TMP_ROOT`; the ciphertext file is `0600`, created exclusively.
5. `pg_dump --format=custom --strict-names` with `--schema=auth --schema=public --schema=leaderboard_private
   --schema=supabase_migrations`, TLS `verify-full`, goes through a pipe into `age -r <recipient>` and from there to
   the file. Plaintext never touches disk. Both children share a process group, are killed on timeout (25 min),
   on a signal or on any error, and are reaped. The ciphertext may not exceed 512 MiB (a single PUT, no
   multipart); bigger fails with `TOO_LARGE`.
6. Upload to `daily/<UTC timestamp>-<random>.dump.age` with `If-None-Match: *` and `Content-MD5`, then stream the
   object back and compare SHA-256 and size. A failed upload is not retried by hand and nothing is deleted.
7. The temporary directory is removed. Output is one word: `BACKUP_OK`, `BACKUP_FAIL <CODE>`,
   `BACKUP_OK_MONITOR_FAIL` (exit 3), `BACKUP_PREFLIGHT_OK`, `BACKUP_DISABLED`. Child stderr is discarded, so
   no row, key, URL or hash reaches a log.

Failure codes: `CONFIG <SETTING>`, `TOOLS`, `DUMP`, `ENCRYPT`, `TIMEOUT`, `TOO_LARGE`, `EMPTY`, `UPLOAD`,
`VERIFY`, `INTERRUPTED`, `INTERNAL`. Look up the cause by re-running locally with the same settings, not in logs.

### Settings

Non-secret (production environment variables, except the repository-level enable gates): `BACKUP_ENABLED`,
`BACKUP_SCHEDULE_ENABLED` (workflow only; unset or false skips scheduled exports), `BACKUP_PG_HOST`, `BACKUP_PG_PORT`,
`BACKUP_PG_DATABASE`, `BACKUP_PG_USER`, `BACKUP_PG_MAJOR`, `BACKUP_PG_CA_PEM` (workflow only: the public CA
certificate PEM, written to a file), `BACKUP_AGE_RECIPIENTS` (one to three comma-separated `age1...` public keys),
`BACKUP_S3_ENDPOINT` (`https://host[:port]`, nothing else), `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION` (default
`auto`), `BACKUP_SENTRY_ENABLED` (default `false`), `BACKUP_PRODUCTION_POLICY` (see below).
Secrets (environment-scoped only): `BACKUP_PG_PASSWORD`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`,
`BACKUP_SENTRY_CHECKIN_URL`. The coordinator also reads `BACKUP_TMP_ROOT` and `BACKUP_PG_CA_FILE`, which the
workflow fills in itself.

The approved database role is a dedicated login with `BYPASSRLS` and membership in `pg_read_all_data`,
without superuser, database/role creation, replication, administrative memberships or directly granted write
privileges. This grants **global database read access**, including schemas outside the four selected by
the script. It is a trusted backup credential, not a strictly read-only account: inherited `PUBLIC` privileges
can permit temporary objects, large-object creation and other operations. `default_transaction_read_only=on`
prevents accidents but the session can change it. `pg_read_all_data` alone does not bypass RLS.
Do not use the administrative `postgres` password or a Supabase API key for this connection.
For a custom role, the shared pooler username is `<role>.<project-ref>`.
Authentication and complete export passed in the manual production run; GitHub-hosted access still needs
an explicitly approved check.
On GitHub-hosted runners, use the IPv4
session pooler, not the transaction pooler. The direct host needs IPv6 or a separately enabled IPv4 option.
`verify-full` needs a CA that validates the chosen host's certificate. Check this for the pooler during activation. If the
CA is in the system store, `BACKUP_PG_CA_FILE` can be left empty locally (libpq 16+ `sslrootcert=system`).

The database password reaches only `pg_dump`, as `PGPASSWORD` in that child's environment. The bucket
credentials reach only the Python process. `age` gets nothing but `HOME`. Proxy and `AWS_*` variables are removed
before the SDK starts, so no ambient credentials or proxy apply.

### Production target policy

The workflow always calls `run-production` in the dedicated `db-backup-production` environment.
Generic `run` remains available for isolated synthetic tests; it is not the production entry point.
There is no fallback to a test configuration, dotenv file, local credentials file or restore operation.

Set `BACKUP_PRODUCTION_POLICY` to this JSON shape, replacing every illustrative value with independently
verified production metadata. These are public connection identifiers and public encryption recipients,
never passwords, API tokens or age identities. Numeric fields must be JSON numbers. Extra, missing,
duplicate or mismatched fields fail with `BACKUP_FAIL CONFIG BACKUP_PRODUCTION_POLICY` without logging values.

```json
{
  "purpose": "production",
  "pg_host": "approved-database.example.invalid",
  "pg_port": 5432,
  "pg_database": "postgres",
  "pg_user": "approved_backup_user",
  "pg_major": 17,
  "s3_endpoint": "https://approved-storage.example.invalid",
  "s3_bucket": "approved-production-bucket",
  "s3_region": "auto",
  "age_recipients": ["REPLACE_WITH_NEW_PRODUCTION_PUBLIC_AGE_RECIPIENT"]
}
```

Treat this policy as a separate approval record: verify the project reference encoded in the database
host/user, bucket, account endpoint and recipient against their source, then enter the individual settings.
Do not generate it by copying the test environment. It catches accidental mismatches; someone who can alter
both the policy and the workflow/configuration can bypass it. Branch protection, environment access and
review of workflow changes remain necessary. The policy cannot prove who owns a supplied private key or
password; dedicated credentials and a controlled first production run are still required.

Before approval of the first export, `preflight-production --staged` checks configuration, target policy,
local paths and installed tools even with `BACKUP_ENABLED=false`. It does not contact Supabase or R2,
validate authentication, inspect database privileges or prove a backup will succeed.

### Optional Sentry monitor

Off by default. When `BACKUP_SENTRY_ENABLED=true`, `BACKUP_SENTRY_CHECKIN_URL` must be exactly a Sentry ingest cron
URL (`https://o<id>.ingest[.<region>].sentry.io/api/<id>/cron/<slug>/<key>/`). The code only sends check-ins
(`in_progress`, then `ok` or `error`, one shared `check_in_id`) to a monitor you created beforehand with its
schedule and grace period in Sentry. It never creates or upserts a monitor, follows no redirects and uses no proxy.
If the backup succeeded but a check-in failed, the exit code is 3 and the output `BACKUP_OK_MONITOR_FAIL`. A backup
error always keeps its own code. A run that never starts shows up as a missed check-in, through the Sentry schedule.

## Production activation procedure

These steps describe the procedure, not a live inventory of configured resources. Reconcile existing resources
before making changes; prepared resources do not prove a working production backup. Each new external
configuration change, credential creation, first data export, and activation requires Marc's explicit confirmation
in chat. A preparation approval does not authorize exports or scheduled runs.

1. Protect the default branch (PRs, no force push or deletion). Required reviews and checks are recommended;
   if Marc elects to require zero approvals/checks, record that accepted limitation separately. A PR requirement
   alone does not enforce independent review. The workflow only runs from the default branch, but a declaration
   in YAML creates no protection by itself.
2. Create the GitHub environment `db-backup-production` with required reviewers and deployment limited to the default branch.
   Without these, anyone who can push workflow changes to the branch can attempt to extract the environment's secrets. The workflow naming
   `environment: db-backup-production` does not create or protect it.
   Keep per-run approval for the first manual export and restoration rehearsal. Required reviewers also block
   every scheduled run until a person approves it; they are not a one-time activation gate.
3. Generate the age identity offline (`age-keygen`), on a machine that is not the CI or the developer laptop's
   cloud-synced folders. Keep at least two copies of the identity, offline, in different places (a password manager
   entry and a printed or hardware-backed copy). Only the public `age1...` recipient goes into `BACKUP_AGE_RECIPIENTS`.
   A second recipient (another key held elsewhere) protects against losing the first. Losing every identity means
   the backups cannot be opened.
4. Create a private bucket in an account or vendor other than the one holding the database (Cloudflare R2 is fine:
   it is not Supabase). Public access stays disabled. Add a lifecycle rule that expires `daily/` objects after about
   30 days; this also removes orphans from failed runs. Decide separately whether to enable bucket locks. Create an
   API token limited to that bucket with object read and write.
   Limitation: an object-write token cannot be assumed unable to delete or overwrite. Treat the bucket as
   protected against a bug, not against a leaked credential. Keep the token in the environment-scoped secrets only.
5. Add newly prepared production-only variables and secrets above to the `db-backup-production` environment.
   Do not reuse the test bucket, test R2 token, test encryption recipient or test database password.
   Review the target policy above independently against the production dashboards. Set the repository variable
   `BACKUP_ENABLED` to `true` last (the job-level gate cannot see environment variables).
6. Unverified items to settle with a first manual run, on the default branch, before trusting it:
   - The Postgres major of the server, and that `postgresql-client-<major>` installs in the workflow (the PGDG
     script is the runner image's own; if it changes, pin a verified package instead). The client must be at
     least the server's major.
   - Whether the chosen R2 (or other) endpoint honours `If-None-Match: *` and `Content-MD5` on `PutObject`. Keys are
     unique, so a bucket that ignores the header stays safe.
   - That the role can dump all four schemas, and that `--strict-names` finds them.
   - That the session pooler is reachable from the runner and its certificate passes `verify-full` with the chosen CA.
   - That the runner can build `age@v1.3.2` and install the locked Python dependencies. The age build and
     encryption roundtrip passed locally with Go 1.27.1; installation must also be verified on a GitHub runner before enabling automation.
   - That the pg_dump output is complete: the coordinator trusts both exit codes and does not inspect the archive.
     The restore rehearsal below, with a table-of-contents check, is the proof.
7. Do the restore rehearsal (below) once, on a real downloaded backup, and write down the date.
8. Before enabling unattended daily runs, obtain explicit approval for that recurring export and its access policy.
   Either retain required reviewers and accept daily manual approval, or separately approve removing per-run
   reviewers from `db-backup-production`. For unattended runs, retain the default-branch deployment restriction and reviewed
   branch protection. Anyone who can merge changes to that branch can then change code that receives the secrets.
   Create and test the Sentry missed-check-in alert before enabling the schedule; monitoring is optional only
   during manual preparation. GitHub may delay or drop scheduled jobs, and disables schedules in public
   repositories after 60 days without repository activity.

   The workflow already declares `17 3 * * *` (03:17 UTC daily, 04:17 winter / 05:17 summer in
   Europe/Madrid). It does not export automatically until the **repository** variable
   `BACKUP_SCHEDULE_ENABLED=true` is explicitly approved and set. Missing or false keeps scheduled jobs
   skipped, even with `BACKUP_ENABLED=true`. Manual dispatch remains available independently.
   `BACKUP_ENABLED=false` stops both manual and scheduled exports. These switches control jobs, not
   GitHub's scheduling of the workflow itself.

   Complete the monitoring setup below and the environment access change first. Activate the schedule
   switch last, then verify the first scheduled run and its Sentry check-in. Disable the switch if that
   verification fails. Changing the schedule requires updating the monitor's UTC schedule as well.

### Daily monitoring setup and verification

Prepare this through the Sentry dashboard; do not put ingest URLs, tokens, notification addresses or
production values in this public repository. Stop if the account requires a paid plan or an additional
paid monitor. Inspect existing monitors before creating anything.

- Project: the existing game project. Suggested monitor slug: `mulassa-db-backup`.
- Schedule: crontab `17 3 * * *`, timezone `Etc/UTC`.
- Check-in margin: 120 minutes, to tolerate GitHub queue delays and dependency installation.
- Max runtime: 60 minutes (the entire Actions job times out after 45 minutes).
- Failure issue threshold: 1; recovery threshold: 1.
- Alert routing: explicitly select Marc's existing verified destination. Cover monitor failures, timeouts
  and missed check-ins, including a recurrence after recovery. The general high-priority issue alert is
  not proof that this monitor will notify the intended recipient.

The coordinator sends only statuses and a random check-in ID. Dependency installation or configuration
failures before its first check-in are detected by the missed-check-in alert. An unreachable Sentry
endpoint after a verified backup produces `BACKUP_OK_MONITOR_FAIL` and fails the Actions job.

Before unattended activation:

1. Configure and test the monitor within the free quota, with explicit approval for external changes
   and synthetic notifications. Use synthetic check-ins only, never database exports for alert tests.
2. Prove delivery of an `error` notification, recover with an `ok` check-in, then prove a **missed**
   check-in notification using a temporarily short schedule. Record receipt and recurrence handling.
   Restore the daily UTC schedule and margins afterwards. Do not post the ingest URL in the report.
3. Marc privately adds the ingest URL as environment secret `BACKUP_SENTRY_CHECKIN_URL`. Separately
   approve setting environment variable `BACKUP_SENTRY_ENABLED=true` and a manual Actions backup.
   Verify both `BACKUP_OK` and the matching healthy check-in in the dashboard.
4. Separately approve removing only required reviewers from `db-backup-production`; preserve the
   restriction to `master`, secrets and variables, branch protections and disabled administrator bypass.
   This allows unattended access to production credentials by merged workflow code. A PR rule with zero
   required reviews/checks does not provide independent review; record that accepted limitation.
5. Separately approve repository variable `BACKUP_SCHEDULE_ENABLED=true`. Verify the first daily run,
   its successful encrypted readback and its healthy Sentry check-in before calling automation validated.

A dashboard preparation prompt is in
[db-backup-monitor-setup.md](db-backup-monitor-setup.md). Its preparation does not authorize running it.

## Restore runbook (manual, isolated, never automatic)

There is no restore script and no job that restores. A backup is an untrusted file: a custom-format archive
carries SQL that runs with the privileges of whoever restores it. Do this on a throwaway local PostgreSQL
of the same major version, never against the live project and never with `pg_restore --clean` over a whole archive.

1. Work in a new directory outside the repository and outside synced folders: `umask 077; mkdir ~/restore-test`.
   Keep the age identity somewhere only you can read; do not paste it into a terminal log.
2. Download one object with your bucket client into that directory (credentials from your own profile, not on a command line).
   Compare its size and modification time with the private manifest. Normalize dates to UTC and compare
   at whole-second precision: S3 listings can retain fractions that HEAD's HTTP date does not expose.
   Metadata equality is not a cryptographic integrity check; require successful age authentication too.
3. Decrypt to an owner-only file. The identity file path is an argument; the identity itself never appears:

   ```sh
   age -d -i /path/to/identity.txt -o backup.dump backup.dump.age
   ```

4. Read the table of contents before restoring anything. It shows the expected table-data entries and prints no
   rows; it does not prove their contents are complete. Restoration and validation below provide that evidence:

   ```sh
   pg_restore --list backup.dump > toc.txt
   grep -E 'TABLE DATA (auth|public|leaderboard_private|supabase_migrations) ' toc.txt
   ```

   Expect at least `auth.users`, `auth.identities`, `leaderboard_private.profiles`, `leaderboard_private.entries`
   and `supabase_migrations.schema_migrations`. A missing one means the backup is not good enough; stop.
5. Start a local server (a scratch cluster or container you create for this, with TLS not required locally). Create the
   Supabase roles the archive's grants mention (`anon`, `authenticated`, `service_role` and the like) as empty
   roles first, or the grants and policies fail. The cluster-level role definitions, passwords and
   settings are not in the archive.
6. Restore into the disposable empty database with a connection described by `PGHOST`, `PGPORT`,
   `PGUSER`, `PGDATABASE` and `PGPASSFILE` or `PGPASSWORD` in the environment, not on a command line:

   Fresh PostgreSQL databases already have a `public` schema. Make a restore list that omits only its
   `CREATE SCHEMA` entry, preserving its ACL entries and every other object. Review the list before execution.

   ```sh
   python3 - <<'PY'
   import re
   from pathlib import Path
   lines = Path('toc.txt').read_text().splitlines(keepends=True)
   Path('toc.restore.txt').write_text(''.join(
       ';' + line if re.search(r'\bSCHEMA - public\s', line) else line for line in lines
   ))
   PY
   pg_restore --no-owner --single-transaction --exit-on-error --use-list toc.restore.txt --dbname "$PGDATABASE" backup.dump
   ```

   Keep grants and policies (do not add `--no-acl`): the leaderboard's security rests on them. Run
   `\dp` and the policy listing in `psql` and compare with `supabase/migrations`.
7. Check: row counts by table (counts only, not contents); the public RPC functions exist; the
   `supabase_migrations.schema_migrations` versions match the files in `supabase/migrations/`; the cascade from
   `auth.users` to `leaderboard_private.profiles` to `entries` still works on a throwaway row in the scratch database.
8. Delete the plaintext (`backup.dump`, `toc.txt`, `toc.restore.txt`) and the scratch database when done.

### Prepare a replacement Supabase project after a disaster

Do not run the scratch-cluster command against a managed project. Create a separate, isolated replacement;
switching production to it requires a separate confirmation after the rehearsal succeeds.

Supabase manages the `auth` schema and owns its migrations. Replaying all its DDL against a managed baseline can
fail. Prepare and review an archive selection for that baseline, following this order:

1. Record the backup's application migration versions and Auth schema version. Provision compatible extensions
   and managed Auth tables in the replacement. Stop if the source and target Auth columns are incompatible.
2. Recreate the application's schema and functions using the corresponding repository revision and migrations.
   This creates structure and seed rows, not the players' backed-up data.
3. Load the version-compatible Auth data first, including `auth.users` and `auth.identities`, preserving IDs and
   all required identity columns. Review dependencies for any MFA or other identity features before selecting
   additional Auth tables. The archive includes the whole `auth` schema, including sensitive session/token data;
   these session and refresh-token rows are deliberately excluded from the replacement restore. Players must
   authenticate again. An anonymous player who lost the browser session and never linked an email cannot be
   promised account recovery.
4. Restore application data only after the owning Auth users exist. Load profiles before entries and include
   the backed-up version configuration and alias rules. Reconcile rows inserted by migrations before importing
   overlapping primary keys; do not blindly import the complete data section over seeded tables.
5. Restore the application's sequence values and reconcile `supabase_migrations.schema_migrations` with the
   schema actually restored. Keep grants, RLS policies, and security-definer function ownership consistent with
   the migrations. Never mark migrations applied merely to silence an error.
6. Compare table counts privately, check for orphan profiles/entries, test public read versus private-table
   denial, and test publishing, email recovery, and profile deletion using a dedicated test account in the
   isolated replacement. Reapply deletions made after the backup so deleted players are not republished.

The exact archive selection and seeded-row reconciliation depend on the source versions and must be rehearsed
before activation. This preparation supplies no command that writes to a managed Supabase project.

Not in the backup, so recreate by hand: cluster roles and their passwords, project and Auth settings (SMTP, redirect
URLs, providers, JWT secrets), Edge Function code and their secrets (the code is in this repository, the secrets
are not), Vault secrets and its root key, extensions enabled in the dashboard, Storage objects (the game has
none), custom domains and API keys. Keep an inventory of these names, never the values, next to the identity copies.

The restore rehearsal is the only evidence that a backup is usable. Until one has been done on a real archive, this
runbook is unverified, and the backup should not be called complete.

## Local checks

`npm run check` runs `tests/db_backup_test.py`. It uses fake `pg_dump`/`age` programs and a fake bucket client; it
never connects anywhere. When real `age` and `age-keygen` are on `PATH`, it also encrypts and decrypts a synthetic
payload with a throwaway identity.

An `UPLOAD` error can mean the object was stored but its response was lost. The script never reports success
without readback verification; an unverified object is left for the lifecycle rule, and no delete request is sent.

## References

- [Supabase backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) and [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [Sentry HTTP cron check-ins](https://docs.sentry.io/product/monitors-and-alerts/monitors/crons/getting-started/http/)
- [GitHub scheduled workflow limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
