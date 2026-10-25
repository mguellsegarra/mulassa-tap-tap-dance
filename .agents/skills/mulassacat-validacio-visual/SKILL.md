---
name: mulassacat-validacio-visual
description: "Mulassa project only. Prove a visual or interaction change before reporting it: affected UI states and transitions across keyboard, pointer, touch and viewport families, real-GPU captures and videos, state URLs, the UI inventory, frame-by-frame analysis of the owner's screen recordings, and a phone-ready LAN link that serves the change. Use before saying any UI, model, dance, camera or effect change is done, for focus, loading or responsive regressions, and when the owner sends a recording of a glitch."
---

# Visual validation

Apply only to Mulassa and its checkouts. Complements `mulassacat-web-performance-diagnosis` (frame cost) and the global `uipolish` layout check. It does not authorize using a physical device, publishing or Git operations.

## The bar

The owner's recurring question is "does this look finished to you?". Before reporting:

1. Look at the result yourself, in motion, at every size it affects, and fix what you see. Do not hand over something you would reject.
2. Compare with the version before the change (same viewport, figure, time, quality) to catch regressions, not only to show the fix.
3. Say exactly what was checked by eye, by numbers and by tests, and what was not (no physical phone, no listening).

Numeric checks and green tests do not prove a layout, a model or a motion.

## Tools

| Need | Tool |
| --- | --- |
| Frame pacing, hitches, a recorded video of play | `npm run capture -- --url='http://localhost:5178/?mute&autoplay&from=40' --seconds=20 --vp=393x852 --dpr=2 --touch` (`tools/qa/capture.mjs`): real GPU (Chrome + Metal), `frames.csv`, `summary.json`, `video.mp4`, `spike-N.jpg` contact sheets. Read the numbers first, the video second. |
| Every screen × viewport × language as stills | `node tools/qa/ui-inventory.mjs` (scene codes `S<nn>-V<n>-<lang>`); `tools/qa/ui-inventory-pdf.mjs` builds a PDF the owner can answer by code (A5, B8…). Output goes to the git-ignored `docs/i18n-ui-inventory/`. |
| The same as motion (layout shifts, blinks, blanks) | `node tools/qa/ui-video.mjs` (clip codes `M<nn>-…`), `tools/qa/ui-video-pdf.mjs`, `tools/qa/ui-video-readme.mjs`. |
| Frames from a recording | the global `video-frames` skill (ffmpeg). |
| iOS behaviour (Safari, home-screen app, Low Power) | the iOS Simulator only. |

Rules for these tools:

- One GPU capture at a time: they share the lock `/tmp/mulassa-capture.lock`; wait for it. `--soft` (SwiftShader) only where the scene needs a software renderer; SwiftShader saturates the machine and fakes hitches.
- Playwright lives in `/tmp/ui-inv-pw`, never in the repo or globally.
- Always `?mute`. Close the browsers, simulators and capture loops you opened; keep a single dev server per worktree and reuse it.
- Measure performance on a build when the numbers matter; the dev server's load inflates them.

## Reaching the state to check

Use URL parameters (dev hosts only; `src/core/flags.js` and `src/core/env.js` read them) instead of clicking through: `?mute`, `?autoplay`, `?from=N`, `?figura=mulassa|drac|bou`, `?stars=0-3` (results card), `?view=…`, `?cam` (camera editor), `?perf`, `?demo` / `?mock` with `&account=…&board=…&seasons=…` (full demo data), `?final&review=…` (profile flows), `?still`, `?nobou` (hide the Bou to film its colla and crowd alone). `docs/agents/testing.md` lists them all. When a state has no parameter and the owner will need to see it more than once, add a dev-only one in the owning module rather than describing the clicks.

Seed full data (a record, a board position, statistics) before judging a layout: an empty state hides the real one.

## Viewports

Phones portrait 320×568, 375×667, 393×852; tablet 768×1024; desktop 1280×800, a wide-short window and a large display (the owner uses a Studio Display, where oversized UI shows). Landscape phone sizes only for the game itself (play, practice, results); menus there show the rotate cover. Include a resize sweep across breakpoints for layout changes.

## The owner's recordings

The owner sends screen recordings (CleanShot `.mp4`, `.gif`, phone `.MOV`, usually on the Desktop or as attachments). Analyse them frame by frame:

- Find the reported moment and scan several seconds before and after; the cause often appears later than the frame pointed at.
- Look for other glitches in the same recording too.
- Separate camera jumps, model jumps, UI layout shifts and loading flashes.
- Reproduce the same moment with a state URL and `npm run capture`, fix, and record the same moment again for the before/after.

## Handing over a link

Before giving a URL, check that the server is running from the intended worktree and serves the change (a distinctive value in the loaded page, not only HTTP 200). For the phone give the LAN address (`http://<lan-ip>:<port>/?mute…`), not `localhost`, as a clickable link, and leave that server running. If the change is in another worktree or port, say which.

## UI states and transitions

Start with the changed user flow and the existing component/style owners. Extend existing
components and tokens before creating a second implementation. Choose the smallest state
matrix that covers the change; do not exercise the entire application for a local edit.

- Include affected loading, empty, error, disabled, pending, selected and populated states.
  Check the first frame and transitions as well as the settled screenshot. Tie remembered
  state to the correct user/item identity; test switching that identity when relevant.
- For navigation, separate scrolling, selection, activation and focus. Exercise continuous
  typing or held keys where relevant, Home/End, bounds, Escape/back, wheel, pointer/touch,
  and resizing after selection. Test helpers must not repair focus between actions.
- Check accessible names, focus order/restoration, reduced motion, target size and visible
  disabled states against the actual product rules. Do not copy a historical design that
  was rejected or superseded.
- Select representative narrow portrait, landscape and desktop layouts plus the affected
  device family. Landscape phones run only the game itself (menus and sheets get the rotate
  cover), so check UI layout there only for play, practice and results. Inspect overflow, reserved space and obstruction at extreme content sizes
  or animation poses. Use a dedicated layout skill when geometry needs deeper analysis.
- Preserve baseline captures separately with revision, viewport, state and timing. Never
  overwrite them or reconstruct an alleged original by reversing CSS. Dynamic screenshots
  need controlled time/state or explicit noise limits; DOM assertions do not prove pixels.
- Keep preview state, test storage and caches isolated from user state and other work.
  A separate worktree can still share dependency caches. Inspect the relevant topology
  before assuming isolation; do not reconfigure another running session.

Use a regression test at the owning boundary when it catches a credible failure; confirm
the old behavior fails when practical. Report which interactions and layouts were actually
checked, remaining defects and any physical-device gap. Follow the host's browser/resource
policy; this skill does not itself authorize starting services or accessing private accounts.

Read [historical evidence](references/ui-state-evidence.md) for selector transitions,
invalid screenshot baselines, profile-state leakage and incomplete QA.
