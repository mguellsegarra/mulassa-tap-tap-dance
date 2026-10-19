# Mulassa historical evidence

These are historical case notes from the 2026-10-19 inventory, not current validation or universal thresholds. Recheck current code and device/service state before relying on an old decision. Read original messages only when needed and authorized; do not export transcripts or private payloads.

[Full inventory](/Users/marc/.t3/artifacts/mulassa-technical-thread-inventory-20261019/index.md). Entry keys below match its machine-readable inventory.

## S01

Invented plausible scores and stale KV reads remained business risks despite a clean dependency audit. Some cross-account tests stopped at Turnstile and did not establish RLS behavior. The quota remained approximate.

Sources:
- [Codex 01a0f19f-f20c-7930-a408-a578bc6d5d72](/Users/marc/.codex/thread_history_1.sqlite)
- [Claude Code e56b4765-22e1-4b7a-89d5-222fd6837351](/Users/marc/.claude/projects/-Users-marc-Desktop-mulassa-de-valls/e56b4765-22e1-4b7a-89d5-222fd6837351.jsonl:401)

## S02

Configuration checks passed while the full suite had an unrelated concurrent failure. The scoped review was not a general security approval.

Sources:
- [Codex 01a0e445-a0b2-7690-ad6f-e32a41f0cf90](/Users/marc/.codex/thread_history_1.sqlite)

## S03

Diagnostics used bounded allowed fields rather than aliases or free text; an issue marked for the next release did not prove deployment.

Sources:
- [T3 Code d8e80714-e71c-4866-ae77-2fda0111a677](t3-thread://v1/d8e80714-e71c-4866-ae77-2fda0111a677)
- [T3 Code 4406b935-a6b3-4b02-84e3-f6e35bbd6f47](t3-thread://v1/4406b935-a6b3-4b02-84e3-f6e35bbd6f47)
- [Codex 01a140e3-bf62-73e2-a5ac-dfc47ad35a31](/Users/marc/.codex/sessions/2026/10/15/rollout-2026-10-15T20-47-10-01a140e3-bf62-73e2-a5ac-dfc47ad35a31.jsonl)

