# Architecture map

Who owns what in `src/`, which dependency directions are valid, where the code breaks them today, which files several
agents touch at once and the lanes that keep them apart. Every folder and file is described in `docs/agents/structure.md`.

## Layers

| Folder | Owns | State it holds | May import |
| --- | --- | --- | --- |
| `core/` | URL flags, clocks, easing | constants (`Q`, `FROM`, media queries) | nothing in `src/` (`anim.js` reads the clock, `timing.js` the pacer) |
| `i18n/` | copy and languages | the active language | `core`, `platform/storage` |
| `platform/` | audio, render quality, `storage` | `chip`, quality profile | `core` |
| `services/` | Supabase, feedback, Sentry, sharing | session, server caches | `core`, `platform`, `i18n` |
| `game/` pure rules | `chart`, `progress`, `energy`, `records`, `stats`, `showreel`, `figures`… | none, or its own | `core`, `i18n` |
| `game/state.js` | `G`, the song clock, the chosen figure, the judge window in use, the sync offset | the global state | `core`, `platform` |
| `game/flow.js`, `game/judge.js` | screen flow and judging | write `G` | everything: they are orchestrators, not pure rules |
| `figures/<id>/` | one figure's model, rig, dance, colla, festa, portrait | its own scene state | `core`, pure `game`, scene primitives (`models/voxel`, `stage`, `framing`), `figures/common/` |
| `figures/common/` | what several figures share: the colla's bodies, its run state, the carretilla fire | none | as `figures/<id>/`, never a figure's folder |
| `figures/index.js` | the traits table (`FIGURE_TRAITS`) | none | `core` |
| `scene/` | the 3D world, crowd, cameras | the three.js scene | `core`, `platform`, `game`, `figures/index.js` |
| `hud/` | the 2D canvas | sprite caches | `core`, `game`, `scene` (read only) |
| `ui/` | DOM, sheets, selector | each sheet's own | everything above |
| `main.js` | composition, frame loop | `frame()` | everything |
| `game/tick.js`, `ui/frame-camera.js` | one frame's rules; one frame's camera decision | none (`tick.js` writes `G`) | everything above them: orchestrators called by `frame()` |
| `dev/` | dev modes | — | everything; the editors and reviews load through `import()`, only the small flag readers (`final-test.js`, `debug.js`, `perf.js`, `autoplay-jitter.js`) are imported statically |

`tests/build/modules.mjs` enforces no cycles, the line limits, `core/` as a leaf (bar `anim.js` and `timing.js`), `game/` rules and state importing no `hud/`, `scene/` or `ui/` (bar `flow.js`, `judge.js` and `tick.js`), `scene/stage.js`, `quality.js` and `crowd-build.js` reaching figures only through `figures/objects.js`, and that nothing imports upward: `i18n/` and `platform/` import no `game/`, `scene/`, `hud/`, `ui/`, `services/` or `figures/`; `services/` no `scene/`, `hud/`, `ui/` or `figures/`; `figures/` no `hud/`, `ui/` or `services/`; `scene/` and `hud/` no `ui/` or `services/`. Its allow-list holds the known exceptions (`services/errors.js`, the crash reporter every layer calls; `figures/index.js`, data with no imports; five `hud/` edges to `ui/handles.js`, `ui/sheets.js` and `services/share.js`). Not checked: `scene/` importing `hud/` (canvas size, layout, bubbles) and `hud/` importing `scene/`, and `game/` importing `services/`.

## Time

Judging reads the song clock (`songTime`, the de-stepped audio clock); drawing the lane reads the eased `viewClock` (`core/timing.js`); the simulation's `dt` is the frame time clamped to 50 ms, and 0 while paused (`main.js` `frame()`, which hands it to `game/tick.js`). Nothing judges on `dt` or on the eased clock.

## Lifetime

Scene objects are built once and toggled (shown, hidden, posed), not rebuilt per run. Whoever creates a resource at runtime and removes it disposes it (geometry, material, texture, render target); three.js does not count references, so a shared material is disposed once, by its creator.

## Flow state

`G.state` is `'splash'` (initial), `'select'` (`toTitle()` in `game/flow.js`, also what `unlock()` calls), `'play'` (`beginRun()`, for the song, the practice and the watch demo) or `'results'` (`finish()`). Paused, resuming, practice, watch and the photo and reel modes are flags beside it, not states.

## Dependencies that point the wrong way

1. `game/flow.js` and `game/judge.js` import 12 modules each from `hud/`, `scene/` and `ui/`: they are orchestrators,
   and `docs/agents/structure.md` says so.
2. Each figure builds and owns its scene objects (`figures/<id>/<id>-objects.js`: its model and colla), listed in
   `figures/objects.js` (`COLLAS`, `figureRoot`), which `quality.js`, `crowd-build.js` and `cameras.js` go round;
   the motion, the collas' obstacles, the share photo and the end shot go through each figure's hooks
   (`figures/<key>/<key>-scene.js`, listed in `scene/figure-scenes.js`), and what a figure does to the people round it
   (the Drac's soot, the Bou's conga and festa) through `figures/<key>/<key>-crowd.js`, listed in `scene/crowd-effects.js`.
   Only the splash's Drac beside her (`PAIR` in `figures/drac/drac-play.js`) is still imported by `scene/stage-motion.js`, `crowd.js` and `cameras.js`; no figure id is: the splash's host and partner, the PHOTO body, M's owner and the landing shake are `FIGURE_TRAITS` fields. Id-keyed catalogue data stays where it is (`game/figures.js`, `figure-portraits.js`, `PHOTO_CAM.aimY`), and `game/judge.js` still tests `figTheme.id === 'bou'`;
   `tests/figures/common/scenes.mjs` keeps the rest of `scene/` that walks these lists off the figures' folders.
3. `hud/` reads `ui/` (`balloon`, `draw`, `results`), and `hud/draw.js` imports `figures/bou/bou-bills.js`.
4. `tests/render/load-main.mjs` concatenates every module into one script, so top-level names must be unique across
   all of `src/`: two agents adding `const STEP` in different modules collide without sharing a file.

## Conflict hotspots

Share of small commits (≤ 20 files, all branches) that touched the file, most frequent first, measured before the split
that followed: `select.css` is now five sheets, `render-quality.mjs` an index of eight area files, `select-ui.js` gave
its keys and layout to `select-keys.js` and `select-layout.js`, AGENTS.md moved its detail to
`docs/agents/`, and `tests/run.mjs` finds new tests by itself.

| File | Share | Why |
| --- | --- | --- |
| `src/styles/select.css` | 42% | the whole selector in one sheet |
| `tests/render/render-quality.mjs` | 35% | one contract file for the whole game |
| `src/ui/select-ui.js` | 33% | the whole selector, then at the 600-line limit |
| `AGENTS.md` | 30% | every change adds a sentence |
| `tests/figures/common/figures.mjs` | 24% | catalogue and registry |
| `index.html` | 22% | every sheet's DOM |
| `package.json` → `tests/run.mjs` | 21% | the test list (now in `tests/run.mjs`) |
| `src/styles/feedback.css` | 19% | |
| `src/ui/photo-avatars.js`, `src/game/photo-control.js` | 17% / 13% | free play |
| `tests/ui/selector-controls.mjs` | 17% | |
| `src/main.js` | 16% | keyboard glue and the loop |
| `src/ui/input.js`, `src/scene/crowd.js` | 11% / 10% | |

`ui/sheets-setup.js` collides only when a sheet is added, not day to day.

## Lanes

Parallel agents each take one lane and stay inside its files; two agents never work in the same lane at once.

| Lane | Files |
| --- | --- |
| A. Selector | `ui/select-*` (with `select-keys`, `select-layout`), `ui/selector-*`, `ui/level-stats`, `ui/pending-*`, `styles/select*.css`, `tests/ui/selector-*` |
| B. One figure | `figures/<id>/`, `tests/figures/<id>/`, its music and `song-<id>.json` |
| C. Cameras and scene | `scene/cameras`, `play-camera`, `framing`, `orbit`, `crowd*`, `game/showreel`, `ui/reel-*`, `tests/render/scene-crowd`, `photo-showreel` |
| D. Play | `game/judge`, `flow`, `energy`, `progress`, `hud/*`, `tests/render/game-*`, `hud-play` |
| E. Sheets and server | the sheets' `ui/*-ui.js`, `services/`, `styles/profile.css`, `board.css`, `share.css`, `feedback.css`, `supabase/`, `tests/render/sheets-share` |
| F. Platform and performance | `platform/`, `scene/quality`, `dev/perf`, `tests/render/quality-models`, `clock-theme` |

Shared files, one agent at a time: `AGENTS.md`, `main.js`, `index.html`, `ui/sheets-setup.js`,
`tests/render/render-quality.mjs` (its order), `package.json`, `figures/index.js`, `game/state.js`. Keep edits to them small and targeted; if another agent's
uncommitted edits there block you, tell the owner and wait (no messages between agents).
