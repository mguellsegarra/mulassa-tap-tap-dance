---
name: mulassacat-integracio-figura
description: "Mulassa project only. Checklist for making an approved figure playable in the game: catalogue, song adapter, theme words, selector cards and showreel, practice and help, records and statistics, boards and mock data, free play and radio, i18n, share card and tests. Use when a figure moves from its study worktree into the game, or when a figure works in one screen but not another."
---

# Integrating a figure into the game

The same list for people, in Catalan, with every asset's place and a template to paste into a PR: [docs/figures/nova-figura.md](../../../docs/figures/nova-figura.md).

Apply only to Mulassa and its checkouts. For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phase 9. Integrate into the main game worktree only what the owner approved in the earlier phases.

The Bou is the reference: `git grep -n "BOU\b\|bou-tradicional-valls\|isBou\|'bou'"` lists every place a figure is wired today. The list below groups them.

## Where a figure lives

Its own modules go in `src/figures/<key>/` (model, rig, dance, feet, colla, festa, portrait). Its row in `src/figures/index.js` (`FIGURE_TRAITS`) tells the shared systems what differs: drumroll element, article, share image and caption, challenge, play camera, free-play clearance and keys. Add the row first; most of the checklist below then follows from it.

## Known debt

Each figure builds and owns its model and colla (`figures/<key>/<key>-objects.js`, listed in `figures/objects.js`: `initFigureObjects`, `COLLAS`, `figureRoot`, `hideFigures`). The motion, the colla's obstacles and the share photo's pose go through each figure's hooks (`figures/<key>/<key>-scene.js`, listed in `scene/figure-scenes.js`). Some special cases remain where the difference is behaviour, not data: the splash's Drac beside her (`figures/drac/drac-play.js`), the festa camera (`scene/play-camera.js`), `photoBody` (`game/photo-control.js`), the figure scale (`game/figure-song.js`), the `.fig-drac` / `.fig-bou` CSS and the figure-specific calls (the Bou's `bouBrama`). When a new figure needs another branch there, prefer a trait in `src/figures/index.js` or a function the figure's folder exports over one more `id === …` test.

## Checklist

**Identity and song**
- [ ] `game/figure-catalog.json`: name, town, entity, primary sources.
- [ ] `game/figures.js`: the song entry in `playableSongs` (song, composer, year, score version, `noBoard` until the server accepts it), which turns the figure from `aviat` to `playable`; the exported constant, portrait scale and `FIGURE_WEIGHT`.
- [ ] `game/score-scale.js`: the figure's score version.
- [ ] `game/figure-song.js`: song adapter, `figureScale`, `figureReach`, theme switch.
- [ ] `game/figure-theme.js`: button words, chant, colours (checked for colour blindness).
- [ ] `src/music-form/songs.js` row if the form editor should know the song.

**Scene and dance**
- [ ] Model, rig, dance, motion and stage modules in `src/figures/<key>/`, built in `figures/<key>/<key>-objects.js` (a line in `figures/objects.js`), with its hooks in `figures/<key>/<key>-scene.js` (its motion, `animate`, in `<key>-play.js`) and one line in `scene/figure-scenes.js`; `main.js` only composes.
- [ ] Colla and crowd hooks (`crowd.js`, `crowd-build.js`), festa frame after the others in `main.js`.
- [ ] Cameras: framing size, play-camera follow and any festa camera (`scene/play-camera.js`), showreel entry (`game/showreel.js`).
- [ ] Share capture (`scene/share-capture.js`) and the share card (`hud/share-card.js`).

**HUD and play**
- [ ] Drumroll element (`hud/balloon.js`, `hud/lane.js`, its own drawing such as `hud/esquellot.js`) and its sound in `game/judge.js`.
- [ ] Top bar portrait fits (`hud/top.js`).
- [ ] Practice and "Com es juga" texts per figure (`figures.practice.*.<figure>` keys), help legend items (`#controls-legend` `only-*` classes).
- [ ] The first note lands at the same time after the count-in as on the other figures.

**Selector and menus**
- [ ] Vector and pixel portraits (`figures/<figure>/<figure>-portrait.js` added to `ui/selector-portraits.js`; the pixel grid in `game/figure-portraits.js`), pending silhouette removed.
- [ ] Theme DOM (`ui/figure-theme-dom.js`), selector info, standings and level row show the figure's data.
- [ ] "Mira el ball" plays its whole dance.

**Free play and radio**
- [ ] `game/photo-control.js` (`photoBody`; Tab's order is `PLAYABLE_IDS`), `scene/photo-motion.js`, `ui/photo-avatars.js`, `ui/photo-icons.js` (drawn icons per action), `ui/photo-stick.js` labels.
- [ ] `ui/free-music.js`: the figure's song in the radio list and the playlist order.

**Records, statistics and boards**
- [ ] Device records and statistics buckets (`game/records.js`, `game/stats.js`); no online bucket until the server knows the version.
- [ ] Boards: `services/leaderboard.js` (`FIGURE_VERSIONS`), `services/leaderboard-rules.js`; the server migration stays pending (`supabase/pending/`) until the owner approves publishing it.
- [ ] Mock and demo worlds include the figure (`src/dev/demo-data.js`, `src/dev/mock-leaderboard.js`, `src/core/mock-board.js`) so every screen shows full data.
- [ ] `ui/stats-view.js` names, `services/share.js` text.

**Languages**
- [ ] New keys in every locale under `src/i18n/locales/`; the figure's button words and chant stay in Catalan in every language.

**Tests**
- [ ] The figure's own tests (dance, chart, colla, festa) in `tests/figures/<figure>/` (`tests/run.mjs` finds them).
- [ ] `tests/figures/common/figures.mjs`, `tests/build/modules.mjs` (module size limits), `tests/render/render-quality.mjs` blocks that list figures.
- [ ] Audio unchanged for the other songs (`shasum public/music/*`).

## Done

Every screen shows the figure with full data: selector (touch and desktop), practice, a run on each level, results, share image, free play, radio, Perfil statistics and boards (or the "no board yet" state). Validate with `mulassacat-validacio-visual`.
