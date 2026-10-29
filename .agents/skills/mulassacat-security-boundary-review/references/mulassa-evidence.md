# Mulassa historical evidence

These are historical case notes from the 2026-10-19 inventory, not current validation or universal thresholds. Recheck current code and device/service state before relying on an old decision. Read original messages only when needed and authorized; do not export transcripts or private payloads.

## S01

Invented plausible scores and stale KV reads remained business risks despite a clean dependency audit. Some cross-account tests stopped at Turnstile and did not establish RLS behavior. The quota remained approximate.

## S02

Configuration checks passed while the full suite had an unrelated concurrent failure. The scoped review was not a general security approval.

## S03

Diagnostics used bounded allowed fields rather than aliases or free text; an issue marked for the next release did not prove deployment.

