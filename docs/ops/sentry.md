# Sentry issue inspection from the CLI

Moved out of AGENTS.md; the rules are unchanged.

- Target: organization `ondori`, project `mulassa-tap-tap-dance`,
  regional API `https://de.sentry.io`; browser UI `https://ondori.sentry.io`.
- Use the existing read-only authentication with Project Read and Issue & Event Read permissions.
  Passing a project to the CLI scopes the query, not the credential's authorization.
- Keep credentials outside this repository and outside this file. Do not overwrite the global Sentry login
  used by other projects. Never print tokens, pass them as CLI arguments, commit them, or enable shell tracing
  or verbose HTTP logging around authentication. On the configured development host, the dedicated token is in
  `~/.config/mulassa-sentry/read-token` (directory 0700, file 0600). Read it only into the authenticated
  process; do not display its contents. Other hosts need their own explicitly approved credential setup.
- Use the installed `sentry-cli` (not the separate `sentry` CLI). This read-only example supplies the token
  in the child environment, without placing it in arguments or changing the global login:

  ```python
  import os, subprocess
  from pathlib import Path
  token = Path.home().joinpath('.config/mulassa-sentry/read-token').read_text().strip()
  env = dict(os.environ, SENTRY_AUTH_TOKEN=token)
  subprocess.run([
      'sentry-cli', '--url', 'https://sentry.io', 'issues',
      '--org', 'ondori', '--project', 'mulassa-tap-tap-dance',
      'list', '--query', 'is:unresolved', '--max-rows', '100', '--pages', '1',
  ], env=env, check=True)
  ```

- For a periodic review, also query `--query 'lastSeen:-24h'` (including resolved/archived issues), adapting
  the interval to the last successful check. Record the query, timestamp, IDs, counts, first/last seen and
  releases; compare with the previous snapshot and report new issues, recurrence or meaningful increases.
  One page can truncate results; inspect pagination before claiming the list is complete.
- This CLI's `issues` command lists issues but does not provide an issue-detail subcommand. Details and
  latest events require authenticated read-only API requests to `https://de.sentry.io/api/0/issues/{id}/`
  and `https://de.sentry.io/api/0/issues/{id}/events/latest/`. Use Python `urllib.request.Request` with
  `headers={'Authorization': 'Bearer ' + token}` and a timeout, keeping the header out of logs.
  Use the EU host. Verify `project.slug` in the issue response before fetching its event.
  Select diagnostic fields instead of dumping request bodies, headers, user data or complete payloads.
- `Users = 0` is not proof of no affected players: the SDK removes user identity. Keep observations separate
  from suspected causes. A recovered WebGL context is not proof the subsequent render works.
- Routine authorized reads need no new confirmation. Resolving, archiving, deleting, commenting, changing
  rules or permissions, and creating credentials require the repository owner's explicit confirmation in chat.
- These instructions enable future reviews; they do not create a scheduler or authorize automatic fixes,
  deployments or Sentry mutations. Scheduling is configured separately.
