---
name: mulassacat-minijoc
description: "Mulassa project only. Start, port or change any mini-game (Mulassa Pop, Memory, Crush, Drop, Alchemy, City, Mulassoku, Run) on the shared base in packages/plassa/src/: its look (base.css, game.css), keyboard and UI sound, boot, errors, update check, GPU guard, words, best score, countdown. Use before touching src/jocs/, a game page (pop/index.html, jocs/<id>/index.html) or tests/jocs/, and when a game lacks something the main game has."
---

# A mini-game on the shared base

Every mini-game is its own page (`docs/jocs/README.md`) built on Plassa, `packages/plassa/` (its README), the games' shared base:
import its modules as `#plassa/<file>`, never by a relative path.
mulassa.cat does not use it yet: it moves onto it once several games run on it, so never edit the main game for a game.
**A game never copies a base piece. If the base lacks something, add it to the base** (consolidated from mulassa.cat's
version when it has one), then use it from the game. `tests/jocs/shared-base.mjs` fails a game that redefines a base
selector or a page that skips the base.

## Start here

1. Read `docs/jocs/README.md` («Shared base») and the base files you will use; `AGENTS.md` rules hold (owner's OK before
   tests, LAN links, `uipolish`, blocking cost on the S10, player-facing words by Codex).
2. The page (`jocs/<id>/index.html`, Pop's is `pop/index.html`): copy Pop's `<head>` metas, then link
   `/packages/plassa/src/base.css`, `/packages/plassa/src/game.css`, then the game's own CSS. Before the module:
   `<script id="boot-watchdog" src="/packages/plassa/src/boot-watchdog.js"></script>` (vite.config.js inlines it). Markup the
   shell expects: `#boot` holding `<div class="art" id="boot-art"><!-- mula-load --></div>` (vite.config.js puts the
   running Mulassa in) and `<p class="boot-line" id="boot-line">`, covers as `<div class="cover" hidden><div class="sheet">`,
   `#count > b` for the 3, 2, 1, `#rotate`, `a.exit` back to `/jocs/`.
3. The game's CSS starts with one `:root` of tokens: `--accent`, `--button-gold-bg`, `--button-bg`, `--ink`,
   `--sheet-color`, `--sheet-bg`, `--sheet-radius`, `--page-edge`, `--page-bg`, `--game` (Pop's style.css is the model).
   Then only the game's own screens. Never `button`, `.btn*`, `.sheet*`, `.cover`, `.round-btn`, `.switch-row`,
   `.howto-pill`, `.game-play`, `#count`, `#rotate`, `.result*`, `.board-*`, `.card-*`, `a.exit`, `h2`, `html, body`.
4. `main.js` (the composition root) wires, as Pop's does: `setUiSound(<the game's voice>)` + `soundOnPress()`
   (`ui-sound.js`; `blipOn(ctx, bus)` if the game has no synth), `setupSheetKeys({ top })` (`sheet-keys.js`; `top()`
   returns the open cover or the home; mark the home's main button `data-keys-first`), `onEveryGesture(unlock)`
   (`gesture.js`), `onPageLeave(pause)` (`page-leave.js`), `createPageAudio(ctx, out, { hearing, stall })` on the
   game's AudioContext (`page-audio.js`; call its `wake()` inside taps, `watch(now)` each frame), `closeOnBackdrop(back)`
   (`backdrop.js`, `back` is what Escape does), `scrollHints([...lists])`, `bootLines($('boot-line'), () => booted)`,
   `waitForTap(...)` (`tap-start.js`) if the home has music, `stopDoubleTapZoom()`, `guardGpu(...)` for each WebGL canvas, `errors.context(...)` + `errors.start()`,
   `watchUpdates(...)`, `setupOrientation(pause)`, `window.__gameBootWords` and `<html class="ready">` when the home is whole.

## What the base has

| Need | Module |
| --- | --- |
| Look: tokens, buttons, sheets, on/off rows, «?» pill, «Juga», focus ring | `base.css` |
| Games' shell: fonts (Cyrillic, CJK), page, covers, boot screen, 3, 2, 1, end numbers, way back, boards and player card, rotate cover, running Mulassa | `game.css` |
| Keyboard vs pointer, `<html data-keys>`, `focusIn` | `focus.js` |
| Arrows, Enter/Space and focus recovery in the open sheet or cover | `sheet-keys.js` |
| UI blip on focus moves and presses | `ui-sound.js` |
| Audio unlock on every gesture | `gesture.js` |
| A home's music: a rendered loop, faded in and out | `menu-music.js` |
| Plassa's one music on/off (mulassa.cat's `menu-music` key) | `music-pref.js` |
| Pause on leaving the page (hidden, blur, pagehide) | `page-leave.js` |
| The AudioContext's life: fade out, back on return and checked, iOS audio session, frozen clock | `page-audio.js` |
| A tap outside a cover's sheet = Escape | `backdrop.js` |
| A list that scrolls fades where there is more | `scroll-hint.js` |
| The home waits for the tap its music needs | `tap-start.js` |
| The boot screen's running Mulassa and its funny lines | `mula-load.html`, `boot-lines.js` |
| Boot watchdog and error card | `boot-watchdog.js` |
| Crash reports (Sentry) | `errors.js`, `sentry-load.js` |
| New deploy → reload when quiet | `update-watch.js`, `update-rules.js` |
| Lost WebGL context | `gpu-guard.js` |
| Device quality guess, pixel ratio | `quality.js`, `render-quality.js` |
| Phone portrait / tablet landscape cover | `orientation.js` |
| Words per game (`locales/*.json`) and the saved language | `words.js`, `locale.js` |
| Best score on this device | `best.js` |
| A run's 3, 2, 1 | `countdown.js` |
| Storage, haptics, double-tap zoom guard, shader warmup | `storage.js`, `haptics.js`, `double-tap.js`, `boot.js` |
| ⚙ Configuració, Perfil, Bústia, idioma, Privadesa (mulassa.cat's sheets and code; Pop's `settings.js` is the model) | `sheets.css`, `scoped-css.js`, `<!-- mulassa-sheets: … -->` |

## Adding to the base

- Something mulassa.cat has: copy its piece into `packages/plassa/src/`, consolidating when it is spread over several
  modules, keep its error handling and reports, and leave mulassa.cat untouched (it moves onto the base later). Name the
  source in the file's header, and list it in `docs/jocs/README.md` if it stays an exact copy to keep in step.
- Something only games need: write it once in `packages/plassa/src/`, generic (elements, ids and words passed in), and move
  the game's copy out.
- `packages/plassa/src/` imports only `core/`, data (`i18n/meta.json`, `i18n/locales/*/boot.json`) and itself
  (`tests/build/modules.mjs`); a game never imports another game.
- Update the table above, `docs/jocs/README.md` and `docs/agents/structure.md`.
