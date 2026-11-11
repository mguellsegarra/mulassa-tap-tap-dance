# Following a deploy

How to take a change through beta and production without waiting on the wrong run or going quiet.

## Channels

- `main` → beta.mulassa.cat (GitHub environment `beta`, test Supabase). `main` only takes PRs (ruleset «Protect main»:
  pull request, no force push, no deletion); a direct merge through the API gets 409.
- Tag `vX.Y.Z` equal to package.json's version → mulassa.cat (environment `production`); the deploy job fails on a mismatch.
- `.github/workflows/deploy-pages.yml` runs `changes` → `migrate` (`supabase db push`, `supabase-migrations.yml`) → `deploy`.
  `changes` (`tools/deploy/pages-deploy-needed.mjs`) skips migrate and deploy when only `.github/`, `docs/`, `tests/`,
  `workers/backup-scheduler/` or a few metadata files changed. To force one: `gh workflow run deploy-pages.yml --ref main`
  (a GitHub write: show it and wait for the owner's OK).

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
