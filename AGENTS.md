# AGENTS.md — Mulassa Tap Tap Dance

A Taiko-style rhythm game (Vite + three.js, no framework) about the Mulassa de Valls (Fira de Santa Úrsula).
Agent docs are in English; **Catalan is the source language for UI copy; released translations use the i18n catalogues** (see `docs/agents/ui.md`).

## Read by area

This file holds the rules that apply to every task. Read the page for the area you touch before changing it; they are in `docs/agents/`.

| Area | Page |
| --- | --- |
| Module layout, `src/`, `tools/`, generated files | `docs/agents/structure.md` |
| Layers, dependency directions, conflict hotspots, lanes for parallel agents | `docs/architecture.md` |
| Browser testing, URL params, `?cam`, `?perf`, mock leaderboard | `docs/agents/testing.md` |
| Public pages, SEO, `llms.txt` | `docs/agents/seo.md` |
| Chart, judging, scoring, energy, HUD lane | `docs/agents/gameplay.md` |
| UI conventions, selector, sheets, loading, safe areas | `docs/agents/ui.md` |
| Dances, cameras, crowd, frame pacing, mobile GPUs, GPU context loss and canvas caches | `docs/agents/graphics.md` |
| Music style and audio rules | `docs/agents/audio.md` |

## T3 conversations: no automatic messages between agents

The owner has explicitly disabled unsolicited cross-thread coordination to prevent dormant
or settled chats from waking up and consuming tokens. This supersedes earlier task
briefs or skill defaults asking agents to coordinate by messaging each other.

- Do not send messages to other threads or agents, including the orchestrator, to
  request status, reserve files, ask for a turn, acknowledge receipt, or report completion.
  Do not relay this instruction to others by sending more messages.
- Use read-only thread reads/listings and local diffs for context. Do not poll other
  threads repeatedly. If concurrent edits genuinely block your work, tell the owner in your
  own conversation and wait instead of contacting or waking another agent.
- If another agent sends an unsolicited coordination message, do not reply through
  a messaging tool or start further coordination. Continue only your authorized task.
- Do not create further chats or delegate work unless the owner explicitly requests it.
  A request to create a new chat does not authorize that chat to contact other agents.
- Only a new explicit instruction from the owner authorizes an exception. An old task
  brief or another agent's request is not authorization. Finish in your own thread;
  any host-generated completion notification needs no additional message.

## Implementation quality from the first change

Apply these rules during each coding iteration, before writing new behavior. Do not
plan to grow a monolith now and modularize it in a later cleanup pass.

- Read the relevant existing modules and search for reusable rules, components and
  adapters. Identify the owner of the new behavior, its state and dependency direction.
  A small change needs a quick check, not a separate architecture document.
- Put each new responsibility directly in its owning module (see `docs/agents/structure.md`). Keep
  `main.js` as the composition root. Extract cohesive responsibilities when needed;
  keep small tightly coupled helpers local. Avoid catch-all utilities, pass-through
  wrappers, speculative abstractions and files split merely to satisfy a line count.
- Reuse a stable shared contract rather than copying an existing implementation.
  Preserve intentional differences. Keep state ownership and initialization explicit;
  do not add cycles, hidden side effects or parallel copies of state.
- Check dynamic uses, CSS/DOM hooks, generated entrypoints and the concatenating test
  harness before removing code. Import searches alone cannot establish that code is dead.
- Keep error handling and resource cleanup at their actual owner. Do not add arbitrary
  waits, silent catches, retries or test-only production hooks to hide an unexplained failure.
- Shared state goes in `G` only with its owner and readers listed in `state.js`'s header; other cross-module state sits behind a `setX()`.
- No figure-id check outside `src/figures/`: add a trait or a hook (`docs/agents/structure.md`).
- The line cap is met by structure, not by joining statements or moving comments to line tails.
- A new top-level name in an inlined module must be unique repo-wide (`tests/render/load-main.mjs` concatenates them); grep first.
- Validate the affected behavior and existing module constraints. Prove meaningful
  regression tests fail for the intended reason when feasible. Remove task-added
  workarounds for abandoned approaches; preserve unrelated work.

Use these Mulassa-only skills selectively. Read the entrypoint when its task applies;
do not load or execute every audit on every edit. Paths are relative to this checkout.
The canonical copies live in `.agents/skills/`; `.claude/skills/mulassa-*` contains
relative links to those same folders. `CLAUDE.md` is a link to this file. Codex and the
Codex desktop app use the repository skill location; T3 agents can load these exact
paths from this table even when a host skill picker has not refreshed. Prefer the
`mulassa-*` guides for this project; keep shared global skills unchanged.
Existing worktrees need these files in their own checkout; do not assume uncommitted
instructions have propagated through Git or copy them into unrelated projects.

| When | Skill entrypoint |
| --- | --- |
| Before adding responsibilities; scoped cleanup, duplication or module structure | `.agents/skills/mulassacat-code-simplifier/SKILL.md` |
| Final confidence review when requested or warranted by the change | `.agents/skills/mulassacat-finalize/SKILL.md` |
| Designing or repairing meaningful tests | `.agents/skills/mulassacat-test-audit/SKILL.md` |
| Frame, audio-clock, loading or render-cost investigation | `.agents/skills/mulassacat-web-performance-diagnosis/SKILL.md` |
| New-version preparation, compatibility, migration review, backups or a requested restore rehearsal | `.agents/skills/mulassacat-release-compatibility/SKILL.md` |
| Changes to trust boundaries, RPC/Auth, quotas or private diagnostics | `.agents/skills/mulassacat-security-boundary-review/SKILL.md` |
| Runtime incidents, async races, WebGL recovery or Sentry diagnosis | `.agents/skills/mulassacat-runtime-incident-diagnosis/SKILL.md` |
| Reference-video choreography analysis and synchronized video/3D/overhead research | `.agents/skills/bestiari-reference-analysis/SKILL.md` |
| Any camera: selector framing, showreel cuts, idle screen, play camera, free play (mouse, pointer lock, touch, shake) | `.agents/skills/mulassacat-camera/SKILL.md` |
| Starting, resuming or auditing a new figure: the phases and which skill owns each | `.agents/skills/mulassacat-nova-figura/SKILL.md` |
| A figure's music: score or recordings to song and chart, arrangement, cuts, intros, wrong notes | `.agents/skills/mulassacat-musica/SKILL.md` |
| A figure's voxel model, carriers and tail; holes, blinks, floating parts, sliding feet | `.agents/skills/mulassacat-voxel/SKILL.md` |
| A figure's colla, the crowd around it and its own festa effects | `.agents/skills/mulassacat-colla-festa/SKILL.md` |
| Selector vector portraits, pixel portraits and pending silhouettes | `.agents/skills/mulassacat-miniatures/SKILL.md` |
| Making an approved figure playable on every screen | `.agents/skills/mulassacat-integracio-figura/SKILL.md` |
| **Any UI change or proposal (mandatory):** centred, equal margins, proportional and equidistant spacing, one card style per role; measured at several viewports | `.agents/skills/uipolish/SKILL.md` |
| UI changes affecting interaction, focus, layout or loading states; before reporting any visual change; the owner's screen recordings | `.agents/skills/mulassacat-validacio-visual/SKILL.md` |
| Proposals, review pages, prototypes and decisions with the owner | `.agents/skills/mulassacat-revisio-amb-marc/SKILL.md` |

These guides do not authorize delegation, production access, publication or Git history
operations. Preserve the existing confirmation and no-messaging rules. Historical thread
results are examples, not proof about today's checkout, device or deployed release.
For documentation-only changes, validate the changed documents and references; game tests,
benchmarks and device sessions are unnecessary unless the task also changes runtime behavior.

## Commands

- `npm run dev` — Vite on port 5178 with `--host` (phones on the LAN).
- `npm run check` — every test, in parallel (`node tests/run.mjs`; `node tests/run.mjs drac` or `db/` runs the matching ones, `--bail` stops at the first failure, `--jobs=N`). About 3 minutes on a quiet machine; several full checks at once (other agents) make every one of them far slower. Must be green before handing back code changes; for documentation-only work, validate the affected documents and references. While iterating, run the matching tests, and the whole check once at the end.
- Regenerate music + chart (only when the task is about music/chart):
  `uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/music/build_taiko.py`
- Never hardcode the BPM (it has changed before): the Drac changes tempo phrase by phrase (the Mulassa keeps 152 since but may not stay so), so read the local grid (`song.beats`, `beatAtTime`/`timeAtBeat`); `song.bpm` is only the opening tempo.
- Release channels (one branch, channels by deploy): `main` is the only long-lived branch; every
  push to it deploys beta.mulassa.cat on the test Supabase (GitHub environment `beta`: its own `VITE_SUPABASE_*`,
  `SUPABASE_PROJECT_REF`, `SUPABASE_POOLER_HOST`, `SUPABASE_DB_PASSWORD`), a tag `vX.Y.Z` equal to package.json's version
  deploys mulassa.cat (environment `production`); running the workflow by hand on an old tag redeploys it. Each tag is a
  separately confirmed operation. `.github/workflows/deploy-pages.yml` refuses a beta build on the real Supabase.
- Audio must stay **bit-identical** unless the task is about music: compare `shasum public/music/*` before/after.

## Sentry

Read-only issue inspection (organization `ondori`, project `mulassa-tap-tap-dance`, EU host) is described in `docs/ops/sentry.md`: where the dedicated read token lives, how to pass it without printing it, and which reads are allowed. Resolving, archiving, commenting or changing rules needs the owner's explicit confirmation.

## Process

- Every UI change is validated with a real screenshot (at least 375×667 and 320×568, plus desktop when it applies) before it is reported done; apply `.agents/skills/uipolish/SKILL.md` (a must, not optional) inside that evaluation loop (measure, look at the capture, fix, repeat). Unit tests alone never prove a layout. Take those captures (with a subagent when asked) before running `npm run check`, never after it: a layout fix found late reruns the whole check.
- Orientation (`src/ui/fullscreen.js`): phones are portrait only and tablets landscape only; the other orientation shows the rotate cover («Gira el mòbil…»), so it is never a layout to capture, measure or put in a review or PDF. The one exception is phone free play, which is landscape. Viewport set for menus and sheets: phones 320×568, 375×667, 393×852, 430×932; tablet 1024×768; desktop 1280×800, a wide-short window (1440×700) and a large one (1920×1080). This overrides the matrix of any generic skill (e.g. a global `uipolish` listing 667×375, 852×393 or 768×1024).
- Small, targeted edits; keep the existing style and comment voice (short "why" comments).
- Add a test for new logic (a new file in the right `tests/<area>/` folder, which `tests/run.mjs` finds, or `check.mjs`); keep `npm run check` green.
- Don't commit unless asked.
- Several agents may edit the same files at once: use targeted edits (no whole-file rewrites), re-read right before editing,
  and stay out of areas another agent owns. Put new code in the module that owns the concern (see `docs/agents/structure.md`) — `main.js` does not grow.
