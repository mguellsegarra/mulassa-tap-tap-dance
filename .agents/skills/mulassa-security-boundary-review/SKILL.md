---
name: mulassa-security-boundary-review
description: "Mulassa project only. Review changed trust boundaries for authorization, business-logic abuse, concurrency and diagnostic privacy. Use for Auth, RPC/API, quotas, storage permissions or telemetry changes; dependency scans alone do not cover these risks."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Security boundary review

Scope the changed boundary, assets, actors and permitted test targets. Determine which
inputs the client controls and where the server enforces the rule. Use synthetic cases
and authorized environments; do not retrieve credentials, private records or production
data merely to populate an audit. This skill grants no access or mutation permission.

## Evidence to seek

- Attempt invalid values and plausible-but-forged business inputs, not just malformed
  syntax. Server-side bounds and internal coherence can reduce abuse without proving that
  a claimed gameplay result or other client assertion actually happened.
- Distinguish anonymous rejection, invalid authentication and authenticated cross-account
  access. Verify authorization and RLS at the actual data boundary; a CAPTCHA blocking the
  request earlier leaves the later authorization test unexecuted.
- Examine read/check/write races, stale reads, retries and duplicate submissions. State
  whether a quota is approximate or atomic. Choose stronger synchronization only when the
  required guarantee justifies it, rather than claiming a cache-backed counter is strict.
- Verify payload limits and relevant headers at the real boundary, including negative
  cases. Dependency vulnerability reports are a separate input, not a security verdict.
- For diagnostics, allowlist bounded technical fields. Avoid aliases, free text, private
  payloads and raw credentials. Preserve enough sanitized phase/error information to
  distinguish failure classes; deleting all context can make diagnosis impossible.

Reproduce a credible issue, apply the smallest fix at its owner if authorized, and show
the same negative case rejected while legitimate behavior remains valid. Do not weaken
another boundary to make a blocked test run. Report findings by observed impact, tested
actors, exact coverage gaps and residual risk; do not give a blanket security approval.

Read [historical evidence](references/mulassa-evidence.md) for forged scores, approximate
quotas, blocked cross-account tests and bounded telemetry.
