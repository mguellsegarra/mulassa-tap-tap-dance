---
name: mulassa-backup-restore-verification
description: "Mulassa project only. Assess backup integrity, isolated restore evidence and observed scheduler delivery as separate guarantees. Use for backup changes or an explicitly requested recovery rehearsal; not for routine UI iterations."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Backup and restore verification

Start by reading the runbook and existing evidence. Define which guarantee is requested:
backup creation, encrypted transfer/readback, isolated data restoration, service recovery,
or unattended scheduling. Reading reports does not require downloading private backups.
Obtain the required explicit authorization before private-data access, production actions,
service changes or protected writes; use existing authentication without exposing secrets.

## Verification boundaries

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

Read [historical evidence](references/mulassa-evidence.md) for local restore checks,
missing cron despite manual success and failed attempts whose cause remained unknown.
