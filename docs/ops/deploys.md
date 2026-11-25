# Following a deploy

How to take a change through beta and production without waiting on the wrong run or going quiet.

## Channels

- `main` → beta.mulassa.cat (GitHub environment `beta`, test Supabase). `main` only takes PRs (ruleset «Protect main»:
  pull request, no force push, no deletion); a direct merge through the API gets 409.
- Tag `vX.Y.Z` equal to package.json's version → mulassa.cat (environment `production`). A mismatch fails before any
  migrations, functions or Pages deployment.
- `.github/workflows/deploy-pages.yml` owns the release chain:
  `changes` → `validate` → `migrate` (`supabase-migrations.yml`) → `functions` (`supabase-functions.yml`) → `deploy` (Pages).
  Each job requires the previous job to succeed; failures stop later jobs. Validation checks the tag against package.json
  for production and refuses an empty or production Supabase URL for beta, before backend changes.
- Pushes to `main` use `beta` throughout. `changes` (`tools/deploy/pages-deploy-needed.mjs`) skips the remaining chain when
  only `.github/`, `docs/`, `tests/`, `workers/backup-scheduler/` or a few metadata files changed. Supabase migration and
  function changes do trigger the chain. Version-tag pushes always run the whole chain against `production`.
- A manual `deploy-pages.yml` dispatch also runs the whole chain: on a branch it uses beta; on a tag it uses production
  and validates the version first. To force a workflow-only change through beta:
  `gh workflow run deploy-pages.yml --ref main` (a GitHub write: show it and wait for the owner's OK).
- Functions no longer have independent push or manual triggers. The reusable workflow deploys `delete-player`, then
  `pop-score`, after migrations and before Pages, using the selected environment's `SUPABASE_ACCESS_TOKEN`.
  Existing environment names, variables and secrets are unchanged. Both backend jobs also refuse beta's project ref
  pointing at production. The migration workflow's separate manual maintenance/baseline entrypoint remains available;
  it does not deploy functions or Pages and is not the release path.
- The per-channel Pages concurrency queue covers the whole chain and does not cancel an active release. Beta and
  production use separate queues. Check each job in the same run; no cross-workflow timing is needed.

## First deployment and recovery

The first beta release must have the function deployment token available in the beta environment (or the existing
repository secret); Pages now waits for it on every release. Confirm the same for production before tagging.
A function failure leaves successful migrations in place and Pages unchanged. A Pages build or upload failure leaves
both backend stages in place. There is no automatic backend rollback, and deploying the two functions is not atomic.
Keep migrations and functions compatible with the previously published frontend and open tabs. After fixing a failure,
rerun the full chain at the intended revision with the owner's approval; do not bypass a failed dependency.
A manual dispatch on an old tag uses that tag's workflow definition, so historical tags may retain the old ordering.
Local YAML and unit checks do not prove environment credentials or a real deployment; verify each stage and the live
version on the first beta run before production.

## Watch the exact run

Never «the latest run»: it may be another push or an old dispatch.

```sh
sha=$(gh pr view N --json mergeCommit -q .mergeCommit.oid)            # beta: the merge commit
gh run list --workflow deploy-pages.yml --commit "$sha" --json databaseId,status,conclusion
gh run list --workflow deploy-pages.yml --branch vX.Y.Z --json databaseId,status,conclusion   # production
gh run watch <id> --exit-status
```

Run the watch as a background command. When it ends, report at once; never end a turn on «waiting» when the result is in:

- the run's conclusion (and whether `changes` skipped the deploy);
- the live stamp, `version.json` holds `{"build":"<APP_VERSION>+<short sha>"}` (`vite.config.js`, `src/core/version.js`):
  `curl -s https://beta.mulassa.cat/version.json` must name the merge commit's `git rev-parse --short=7`;
- that the changed assets or CSS are served (`curl` the file or grep the built bundle).

## After beta, before production

Smoke the change on beta headless (`docs/agents/testing.md`) and report. Production is a chain of separately confirmed
steps, each shown to the owner with its exact command first: the backup (`docs/ops/db-backup.md`), any Worker or
environment variable change, then the tag. After the tag, follow its run and check `https://mulassa.cat/version.json` the same way.
