---
name: mulassa-runtime-incident-diagnosis
description: "Mulassa project only. Diagnose runtime incidents and asynchronous races from observed flows and bounded telemetry, then verify recovery. Use for Sentry incidents, stale async completion, audio races or WebGL context loss; do not treat mitigation as proven root-cause repair."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Runtime incident diagnosis

Use the project's existing observability access guide for authorized reads. Limit queries
to the relevant project and time window; paginate boundedly when making coverage claims.
Record issue/event identifiers, release and affected environment without exporting user
payloads or credentials. An issue's title or absence of user identity does not establish
cause, impact or whether a bot generated it.

1. Reconstruct the actual user flow and ordering. Separate direct evidence, plausible cause
   and unknowns. Group incidents by demonstrated cause rather than shared error wording.
2. For asynchronous work, reproduce completion after the user cancels, mutes, navigates,
   switches identity or starts another operation. Preserve current intent at completion;
   fix ownership/cancellation or stale-result handling instead of adding arbitrary waits.
3. Inspect optional APIs and reduced-motion paths as real behavior. Optional chaining on
   an object does not establish that a property is callable. Keep retry and fallback behavior
   deliberate and bounded; do not silence errors to make monitoring green.
4. Exercise failure and subsequent normal use. After WebGL restoration, prove a valid render
   and the affected capture/action work. Repeat resource-heavy actions when investigating
   accumulation; stable counters in one run are limited evidence, not a universal leak proof.
5. Compare the affected visuals or output after a mitigation and preserve required quality.
   Instrument only the missing diagnostic fact with bounded, sanitized fields; remove
   temporary probes and report unresolved natural-device reproduction separately.

Report reproduction, cause confidence, correction or mitigation, regression evidence and
release identity. Distinguish local validation, pushed code, observed deployment and
post-release recurrence. Changing an issue to resolved/next-release is a protected external
write and cannot prove deployment. Do not automatically archive, schedule monitoring,
contact other agents or deploy as part of diagnosis.

Read [historical evidence](references/mulassa-evidence.md) for mute/load races, reduced
motion, WebGL recovery and the difference between mitigation and an explained crash.
