---
name: mulassacat-test-audit
description: "Mulassa project only. Assess whether new or existing tests protect meaningful behavior, find redundant or implementation-coupled coverage, and simplify test suites without losing important contracts. Use when designing tests or auditing test quality in any repository."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map (`docs/agents/structure.md`) and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Test Audit

Use the same value bar when designing a test, reviewing a few tests, or auditing a subsystem. A test earns its maintenance cost when it can catch a credible regression in observable behavior or an independent contract. Adapt commands and boundaries to the current repository; read its `AGENTS.md`, test conventions, and CI configuration where relevant. Follow the user's requested scope and preserve unrelated work.

For a wider audit, retain the explicit scope and contract-by-contract workflow below.

## Before adding or changing a test

Identify:

1. The behavior, invariant, or independent contract it protects.
2. A plausible regression that would make it fail for the intended reason.
3. Why existing tests do not already catch that regression. Prefer extending the strongest existing test at the owning boundary when it covers the same contract.
4. Whether the test requires a production export, flag, wrapper, or injection hook with no production use. If so, test through the real boundary when practical.

For a bug regression, demonstrate a failure on the faulty behavior when feasible, then a pass after the fix. If a direct pre-fix run is impractical, explain the limitation and use the strongest available evidence. Avoid replaying the same scenario at every layer unless each layer protects a distinct risk.

## Low-value patterns to investigate

These are leads, not automatic deletion rules:

- assertions that cannot fail meaningfully, self-comparisons, and expected values computed by the code under test;
- copied inventories, manifests, imports, or source strings without an independent contract;
- private call-shape tests duplicated by behavior tests at a real boundary;
- repeated tests of one contract across layers without a distinct failure mode;
- mocks or fixtures that implement the behavior or ordering being asserted;
- tests that only justify test-only production hooks or dead production paths;
- negative cases that pass for an unrelated reason;
- names that claim more than the assertions actually prove.

A test coupled to implementation may still protect an important contract. Keep independent checks for public APIs, protocols, configuration, migrations, storage, security, platform behavior, release artifacts, generated interfaces, and observable ordering. Source inspection can be the cheapest independent guard for an exact user-facing byte or path. Slowness or static analysis alone is not a reason to delete a test.

## Audit workflow

For refactoring, verify that the supposed guard actually executes before relying on it.
A commented assertion, permissive tolerance or negative case failing at an earlier guard
can produce false confidence. Where useful, demonstrate one credible faulty variant
failing for the intended reason, then restore it; do not build a mutation framework for
a small change. Concatenated/VM harnesses can depend on top-level names absent from the
import graph, so inspect their loading model before declaring exports or helpers unused.

For visual comparisons, preserve the original baseline and record nondeterministic
animation/time differences; a base-versus-base comparison can identify noise. DOM tests
prove DOM contracts, not pixel layout or physical-device behavior. See the
[Mulassa examples](references/mulassa-evidence.md) when auditing these cases.

1. Establish the requested scope and the repository's actual test commands. Inspect relevant instructions and the current working tree before editing.
2. Discover candidates without changing code. Read each candidate test in full, its production owner and callers, overlapping tests, and relevant history or CI routing when they affect the judgment.
3. For each proposed deletion or consolidation, record the exact test, what failure it detects, the contract owner, the proof that remains, why the test exists, and the risk of changing it. If evidence is missing, investigate further or keep it.
4. Make one coherent change at a time. Preserve unique regressions and remove production hooks only after confirming they have no production callers. Do not add replacement tests that merely restate the same implementation.
5. Run the smallest relevant test group, then the repository's required checks for changed files. For removed source checks, exercise the real command or artifact they intended to guard. Check formatting and the final diff. Report what ran, what did not run, and any pre-existing failures separately.

Avoid editing the same checkout while its test runner is exercising files being changed. Use the repository's configured runner and CI gates; do not assume Vitest, a particular script, or a particular branch. A review tool can help on a substantial audit, but no external skill is required.

## Handoff

Summarize the tests removed, consolidated, repaired, and retained; the contract each retained test protects; any production simplification; validation evidence; and remaining risks. Distinguish test and production changes when reporting the diff. Commit, push, open a PR, or merge only when authorized by the user or existing task context.
