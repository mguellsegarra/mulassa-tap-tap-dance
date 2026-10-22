---
name: mulassa-ui-state-regression
description: "Mulassa project only. Verify affected UI states and transitions across keyboard, pointer, touch and viewport families. Use for interaction, focus, loading or responsive regressions; complement layout review with behavior checks."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# UI state regression

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

Read [historical evidence](references/mulassa-evidence.md) for selector transitions,
invalid screenshot baselines, profile-state leakage and incomplete QA.
