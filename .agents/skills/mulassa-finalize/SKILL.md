---
name: mulassa-finalize
description: Review and simplify the current Mulassa change before handoff when a final confidence pass is requested or warranted. Check module ownership, meaningful regressions and the applicable project checks without expanding scope.
---

# Mulassa final review

Apply only to Mulassa. Read the current AGENTS.md and preserve its approval and
no-delegation rules. This is a final verification pass, not the planned time to
modularize code that should have been structured during implementation.

1. Establish the actual change and pre-existing work. Read the affected owners,
   callers and contracts. Review only the requested change; a touched file does
   not authorize cleanup of unrelated code.
2. Use [mulassa-code-simplifier](../mulassa-code-simplifier/SKILL.md) to inspect
   responsibility boundaries, reuse, state ownership, dead/duplicate code and
   unnecessary task-added workarounds. Keep main.js as the composition root.
   New files need a coherent responsibility, not a line-count justification.
3. Challenge each change against the requested outcome. Remove unnecessary
   additions, simplify what remains, and optimize only with evidence. Preserve
   error paths and resource restoration. Do not retain speculative fallbacks,
   arbitrary waits, silent catches or test-only production hooks.
4. Use [mulassa-test-audit](../mulassa-test-audit/SKILL.md) when changing tests or
   relying on questionable coverage. Distinguish a product defect from a broken
   fixture, selector, mock or assertion. Show a regression fails for the intended
   reason when practical; never weaken a valid assertion just to make it green.
5. Read only the specialist skills routed by AGENTS.md for the affected boundary:
   UI, performance, security, runtime incidents, compatibility or backups. Do not
   run all audits on every change or launch other agents as a review ritual.
6. Apply verified in-scope corrections at their owner. Inspect the final diff,
   including additions and deletions. Preserve concurrent edits and review why
   each hunk is needed. Check dynamic uses before declaring code dead.
7. Run applicable project checks for code changes; preserve audio identity when
   music is outside scope. For documentation-only work, validate documents and
   links. Report unavailable checks and pre-existing failures separately. Repeat
   only when a new correction or unresolved finding warrants it.

Report the reviewed scope, corrections, verification and concrete remaining limits.
Distinguish local, committed, pushed and deployed state. Evidence supports a bounded
confidence statement, not an absolute guarantee. No Git history operation, external
write, deployment or production access is authorized by this skill.

Read [historical evidence](references/mulassa-evidence.md) for false-green tests,
renderer restoration, visual noise and unverified deployment claims.
