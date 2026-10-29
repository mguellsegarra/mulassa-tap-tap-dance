---
name: mulassacat-code-simplifier
description: "Mulassa project only. Plan cohesive modules before adding code and simplify changed code without altering its contracts. Use for implementation structure, deduplication, dead-code cleanup, or refactoring; keep scope on the requested change unless a broader audit is requested."
license: MIT
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map (`docs/agents/structure.md`) and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Code Simplifier

Plan cohesive code and simplify existing implementations within the requested behavior.

## Core Principles

### 1. Preserve Functionality
For a refactor, preserve existing functionality. For a requested feature or fix, preserve
contracts outside the intended change and validate the new behavior at its owner.

### 2. Design the ownership before writing code
- Read neighboring implementations and search for existing components, rules, adapters and helpers before adding another implementation.
- Identify the owner of each new responsibility, its state, callers and dependencies. For a small change this is a quick internal check, not a mandatory design document.
- Put new behavior in its owning module from the first implementation. Keep composition roots concerned with wiring; do not first grow a monolith and defer extraction to a cleanup pass.
- Extract a cohesive responsibility when it has a clear boundary. Keep small tightly coupled helpers local; avoid generic utility buckets, pass-through wrappers, one-file-per-function fragmentation and speculative plugin systems.
- Share code when callers share a stable contract, not merely similar syntax. Preserve intentional differences. Prefer an existing owner over a new parallel abstraction.
- Make state ownership and initialization order explicit; avoid cycles, hidden side effects and duplicated state that must be synchronized.
- Follow the project's language, framework, error handling and naming conventions. Do not impose React, TypeScript, function syntax, or import reformatting on unrelated code. Preserve necessary error handling and resource restoration, including `finally` on failure paths.

### 3. Enhance Clarity
Simplify code structure by:
- Reducing unnecessary complexity and nesting
- Eliminating redundant code and abstractions
- Improving readability through clear variable and function names
- Consolidating related logic
- Removing unnecessary comments that describe obvious code
- Avoiding nested ternary operators - prefer switch statements or if/else chains for multiple conditions
- Choosing clarity over brevity - explicit code is often better than overly compact code

### 4. Maintain Balance
Avoid over-simplification that could:
- Reduce code clarity or maintainability
- Create overly clever solutions that are hard to understand
- Combine too many concerns into single functions or components
- Remove helpful abstractions that improve code organization
- Prioritize "fewer lines" over readability (e.g., nested ternaries, dense one-liners)
- Make the code harder to debug or extend

### 5. Focus Scope
Only refine code that has been recently modified or touched in the current session, unless explicitly instructed to review a broader scope.

## Refinement Process

1. Establish the requested behavior, current diff and pre-existing work. For implementation, decide the ownership above before adding code; for cleanup, identify the scoped contracts to preserve.
2. Investigate duplicate logic, unnecessary indirection, stale branches, misleading names and comments that restate code. Before deleting, check dynamic lookup, event registration, generated entrypoints, CSS/DOM hooks and test harnesses as well as imports. No search matches is not proof of dead code.
3. Change one coherent responsibility at a time. Remove task-added workarounds for abandoned approaches; preserve unrelated behavior. File size and duplication reports are investigation signals, not extraction or deletion quotas.
4. Verify meaningful behavior at the owning boundary and the project's module/dependency constraints. Use an existing duplicate scanner when available; do not install one implicitly or treat zero reported duplicates as proof of good design.
5. Inspect the final diff for accidental behavior changes, unnecessary new files, test-only production hooks and weakened assertions. Report what became simpler, the evidence, and remaining limits.

For concrete refactoring failures and validation limits, read [the Mulassa case notes](references/mulassa-evidence.md) when useful. Historical paths and measurements are examples, not current project conventions.
