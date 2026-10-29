---
name: mulassacat-release-compatibility
description: "Mulassa project only. Review a new release for old-client compatibility, persistent-data changes, generated assets and deployment ordering, and assess database backups and restores (integrity, isolated restore, scheduler delivery) as separate guarantees. Use during version preparation, migration review, backup changes or an explicitly requested recovery rehearsal; preparation does not authorize publication."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map (`docs/agents/structure.md`) and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Release compatibility

Identify the exact candidate revision, current contracts and intended release surfaces.
Read the current pipeline and project commands. Select checks from the actual changes:
UI-only releases do not need database rehearsals, and a read-only review performs no writes.

## Compatibility and delivery

- For client/server changes, compare old and new request/response contracts, including old
  open tabs or cached clients. Check the business rule on both sides, including tie breaks,
  units and result text; HTTP 200 alone does not prove semantic compatibility.
- For browser storage, preserve valuable existing data and test legacy keys, missing values,
  blocked storage and switching identities where affected. A migration must not let an old
  client overwrite a better record or expose another user's state.
- For generated assets, use the canonical generator and compare reproducible outputs in an
  isolated authorized location. Preserve bit identity for assets outside the change. Do not
  edit generated output merely to make it agree with a test.
- For database changes, inspect compatibility during rollout and failure recovery. Rehearse
  against an authorized disposable target when needed; verify rollback, unchanged objects
  and absence of leftover fixtures. A rollback-only dry run is not an applied migration,
  and transaction rollback does not guarantee reversal of external side effects.
- Inspect pipeline triggers, path filters, concurrency and cancellation with realistic
  interleavings: a documentation push must not accidentally discard the intended release,
  and an operations-only change need not deploy the game. Verify current CI semantics
  before recommending syntax copied from history.
- Keep build, migration, function deployment and static publication evidence separate.
  Match any observed deployment to the exact revision and test the changed public flow only
  within authorization. A green build or monitoring issue marked for the next release
  is not proof that users received the fix.

Prepare a concise release record: revision, applicable checks and results, compatibility
limits, recovery plan, and the next operation still requiring approval. Follow existing
confirmation rules for each protected operation; never infer deployment permission from
this skill or from a request to prepare a version.

Read [historical evidence](references/mulassa-evidence.md) for old/new RPCs, record migration,
bit-identical generation, pipeline interleavings and separate rollback/deploy outcomes.

## Backups and restores

Start by reading the runbook and existing evidence. Define which guarantee is requested:
backup creation, encrypted transfer/readback, isolated data restoration, service recovery,
or unattended scheduling. Reading reports does not require downloading private backups.
Obtain the required explicit authorization before private-data access, production actions,
service changes or protected writes; use existing authentication without exposing secrets.

### Verification boundaries

- Prefer synthetic data to validate the mechanism. For an authorized real rehearsal, verify
  the exact source and isolated destination before any restore. Never restore into production
  as an incidental test or place raw dumps in the repository or public CI artifacts.
- Follow the chain of evidence: consistent export, encryption, upload, readback, integrity,
  decrypt and restore. A successful upload or log label establishes only the measured stage.
- Inspect restored schema and data contracts appropriate to the system: counts, constraints,
  foreign keys, ACLs, RLS, ownership, sequences and a synthetic application flow. A local
  PostgreSQL restore does not prove managed Auth, email or all service integrations recover.
- Check task-owned sensitive artifacts and cleanup according to the approved retention plan.
  Do not recursively remove existing user data or retain raw content in a summary report.
- Verify a scheduled run by its actual trigger provenance, time and completion evidence.
  A manual success, enabled cron setting, matching timestamp or recovered monitor alone
  does not prove the scheduler fired. Distinguish failure alerts from missing-run alerts.
- On failure, stop at the authorized boundary. Retain sanitized phase, controlled error class
  and permitted status/exit code. A generic 403 or missing error detail does not establish
  bad credentials; do not retry alternate credentials or expand access speculatively.

Report each guarantee as observed, failed, untested or inconclusive, with its exact evidence
and recovery limits. Separate local restoration from complete service recovery and manual
execution from scheduled execution. This skill does not create a recurring task.

Read [backup evidence](references/backup-evidence.md) for local restore checks,
missing cron despite manual success and failed attempts whose cause remained unknown.
