# Mini-games plan (release 1.3.0)

Status: 1.3.0 ships only Mulassa Pop (mulassa.cat/pop: page `pop/index.html`, code in `src/jocs/games/pop/`, source project `pica-la-mulassa`). The other games were taken out of this branch before release; each one waits on its own `jocs/<id>` branch, at the state it had here (7e0e749), until its release (table below). The selector's gamepad opens Mulassa Games, the games' own page (`/jocs/`).

Research, in Catalan, copied from `mulassa-minijocs/notes/` on 2026-11-01 (that project may have moved on since):
- `research/cataleg-jocs.md`: the catalogue of game ideas.
- `research/recerca-mercat.md`: market research and the owner's references (SubaraCity, merge games, Doodle God).
- `research/jocs-fisics.md`: physical games about the Seguici and similar festes.
- `research/actius-reutilitzables.md`: assets the game can lend.

## Decisions from the owner

- 1.3.0 is the release that brings the mini-games into mulassa.cat.
- Fes el castell is out of the plan. It still appears in the research notes, which are left as written.
- Mulassa Games, the games' selector, is its own light page at `/jocs/` (`jocs/index.html`, `src/jocs/menu/`, on Plassa; the owner's call on 10 Nov 2026, reversing the earlier sheet inside the main game): nothing of Mulassa Tap Tap Dance loads behind it. The selector's gamepad button (`#free`) and a game's way back go there with `location.replace('/jocs/')`; «Juga» on the Tap Tap Dance card goes to `/`. An old `/#jocs` link is sent on by `index.html`. It has its own music, the menu tune as lo-fi (`tools/music/build_games_menu.py` → `src/jocs/menu/music.mp3`), on Plassa's one music switch.
- Free play is not a card on that page: it is a button in the main game's help sheet (`#howto-walk`). A mini-game is still its own page, so opening one and coming back reloads the main game.
- The URL must not say `minijocs`.

## Names

The owner's choices. A game takes its name when it enters this branch; folders, URLs and branches keep their working ids, players never see them.

| Name | Id | Branch |
| --- | --- | --- |
| Mulassa Pop | `pop` | here |
| Ball lliure | free play: not a card; a button in the help sheet («?», `#howto-walk`), too expert for the sheet | here |
| Mulassa Memory | `memory` | `jocs/memory` |
| Mulassa Crush | `crush` | `jocs/crush` |
| Mulassa Drop | `suika` | `jocs/suika` |
| Mulassa Alchemy | `alquimia` | `jocs/alquimia` |
| Mulassa City | `subara` | `jocs/subara` |
| Mulassoku | `murdoku`; players must never read «Murdoku» | `jocs/murdoku` |
| Mulassa Run | `corre` | `jocs/corre` |

A game's branch holds its pages, code, pictures, tests and `_headers` lines as they were in 1.3.0 before the removal (Memory and Crush also their card). A merge of that branch does not
bring them back (the removal is newer), so take its files with `git checkout jocs/<id> -- jocs/<id> src/jocs/games/<id> public/jocs/<id>`
plus its tests and docs, then add its card in `jocs/index.html` (a `.game-card` with `data-game`), its colour, its words in `src/jocs/menu/locales/` and its `_headers` lines.

Each new game gets a colour for its card and logo, a line in `NEWS` (`src/ui/news-sheet.js`) and a card after the last game. The «Aviat» surprise cards (`data-soon`, nothing to play, each in the colour of the game it stands for) fill the row; a new game takes the place of the first one.

Discarded: Snake, La Cercavila, Talla calçots, Bantumi, Pinta per números, Endreça el Seguici, De nan a gegant (2048), Fes el castell. The code of those that had any, without a commit here, is in `mulassa-minijocs/descartats/`.

Before publishing, the owner checks the marks: «memory» and «Crush». No registry search was made for any name.

## Architecture

Separate pages on the same domain, in the same tab. Only a full page navigation reliably frees memory: a loaded JS module
cannot be unloaded, and hand-releasing three.js, audio and canvas caches is fragile.

```
/                main game
/jocs/           menu (Mulassa Games)
/pop/            Mulassa Pop
/jocs/memory/    the other games: one page each, when they release
/jocs/crush/
```

- One rule for every hop between the main game, `/jocs/` and a game: `location.replace()`, so bfcache does not keep the page
  frozen in memory and no history entry piles up (a card goes menu → game with it, a game's way back to `/jocs/` too, as does the
  main game's gamepad). The browser's back button therefore skips them, so every page has its own visible way back.
- The menu loads no game; a game loads its own code and `shared/`. three.js stays out unless a game needs it.
- Same origin: `localStorage` and the Supabase session are shared.
- `public/manifest.webmanifest` has `start_url: "/"` and no `scope`, so these URLs should stay inside the installed app. A subdomain would leave it.
- Rejected: teardown within one page, iframes (and `_headers` sets `frame-ancestors 'none'`), new tabs (the main game stays alive
  behind them and an installed app leaves its window), separate repos or builds per game.
- Known costs: returning rebuilds the scene and shaders, though files come from the cache. Music needs a new tap on each page. On
  Android the back gesture may close the app. A reopened app may start at `/`, so games save progress in `localStorage`.

## Code layout

```
jocs/index.html                   menu (Mulassa Games); its code is src/jocs/menu/
jocs/<game>/index.html            loads only its game
packages/plassa/src/                  only what at least two games use
src/jocs/games/<game>/            a game never imports from another game
public/jocs/<game>/               a game's images
tests/jocs/
```

Each game page repeats the main page's viewport, `theme-color`, manifest and Apple tags.

## Shared base

Plassa, `packages/plassa/` (its README; games import `#plassa/<file>`), is the mini-games' own library: every game page stands on it, and mulassa.cat (the main game) does
not use it yet. It was built from mulassa.cat's pieces, copied and consolidated, and is proven on the games first;
once several games run on it, mulassa.cat moves onto it and drops its own copies. Until then both exist on purpose:
the main game stays exactly as it is. **A game never copies a base piece; if the base lacks it, add it to the base**
(from mulassa.cat's version when it has one) and use it from the game. The how-to is the skill
`.agents/skills/mulassacat-minijoc/SKILL.md`. Its future name is **Plassa**: what it will hold (the games selector as the
home page, one account and social layer for every game, general and per-game settings) and what each piece's state is
are in `packages/plassa/docs/inventari.md`.

- Look: `base.css` (tokens, `button`, `.round-btn`, the `.btn` family, `.sheet`, `.switch-row`, the «?» pill, «Juga»,
  the focus ring) and `game.css` (the games' shell: fonts with Cyrillic and CJK, page, `.cover`, the boot screen and
  its line, `#count`, the end sheet's `.result`, the way back `a.exit`, the boards and player card, `#rotate`, the
  scroll fade). A game's CSS sets only its colour tokens (`--accent`, `--button-gold-bg`, `--button-bg`, `--ink`,
  `--sheet-color`, `--sheet-bg`, `--sheet-radius`, `--page-edge`, `--page-bg`, `--game`) and its own screens.
- Interaction: `focus.js` (keyboard vs pointer, `<html data-keys>`), `sheet-keys.js` (arrows, Enter/Space and focus
  recovery in the open cover), `ui-sound.js` (a blip on keyboard moves and every press), `backdrop.js` (a tap outside a
  cover's sheet does what Escape does), `scroll-hint.js`, `gesture.js` (every tap or key), `double-tap.js`,
  `tap-start.js` (the home waits for the tap its music needs).
- The page's life: `page-leave.js` (hidden, blur, pagehide: a run pauses) and `page-audio.js` (one AudioContext: fade
  before stopping, back on return and checked, iOS's audio session, a clock that stands still; reported to Sentry).
- Boot: `mula-load.html` (the running Mulassa; vite.config.js puts it in a page's `<!-- mula-load -->` and inlines
  `boot-watchdog.js`), `boot-lines.js` (mulassa.cat's loading lines and its memory of the ones seen; the screen leaves at a line's end), `boot-first-line.js` (the first line before the first paint, inlined by vite.config.js with every language's lines), `boot.js`
  (shader warmup), `errors.js` + `sentry-load.js`, `update-watch.js` + `update-rules.js`, `gpu-guard.js`, `quality.js`
  + `render-quality.js`, `orientation.js`.
- A home's music from a rendered file: `menu-music.js` (Pop's home and the selector).
- Words and state: `music-pref.js` (Plassa's one music switch, mulassa.cat's `menu-music` key), `words.js` (a game's `locales/*.json`) over `locale.js` (the saved language), `storage.js`, `best.js`,
  `haptics.js`, `countdown.js`.
- Boards: `board.js` (a board's row and a player's name with its badge, as mulassa.cat's; the game brings the art, the words
  and its own cells) over `badge-tip.js`.
- Settings and account (one account everywhere, inventari §2): `sheets.css` (the modal sheets' corner × and scrolling body,
  Configuració's «Sobre el joc», Privadesa, the Turnstile box) and `scoped-css.js` (another page's CSS kept inside some of
  this page's elements). The sheets themselves stay mulassa.cat's: a page asks for them by id with
  `<!-- mulassa-sheets: settings-menu account-menu … -->` (vite.config.js copies those `<dialog>`s from index.html into a
  `<template>`), and the game runs them with mulassa.cat's own code, loaded at boot while the boot screen runs, so the first ⚙ tap opens at once (Pop's `settings.js`: Perfil,
  the badge, the Bústia, the language, Privadesa; its CSS through `scoped-css.js`). When mulassa.cat moves onto Plassa,
  that code moves with it.
- Imports: `packages/plassa/src/` reaches outside itself only for `core/` and data (`i18n/meta.json`, the loading lines'
  `i18n/locales/*/boot.json`); mulassa.cat never imports it yet; a game never imports another game. Pop still imports
  mulassa.cat's modules directly (`platform/`, `services/`, `ui/`, `i18n/`, `styles/`, `dev/`, `core/`: the list is in
  `docs/architecture.md`), a transitional exception that moves into Plassa with the settings and account layer.
- Copies of mulassa.cat kept in step until it moves onto the base: `storage`, `haptics`, `boot`, `double-tap`,
  `errors`, `sentry-load`, `update-watch`, `update-rules`, `locale`, `focus`, `badge-tip`, `render-quality` (same code, other paths),
  `mula-load.html` (ui/loader.js's art). The rest is consolidated from several of its modules (see each file's header).

## Steps

Done for 1.3.0: the infrastructure (`vite.config.js` inputs, the `tools/deploy/prepare-pages.mjs` allowlist, `no-cache` for the HTML in
`public/_headers`), the `/jocs/` page and Pop, and the selector's gamepad button. Still to do:

1. On an iPhone and an Android with the app installed, check that the hop between pages stays in the app, that memory drops, and how
   long the return takes. Change the plan here if it fails.
2. Move the other games one by one (table above), each taken all the way to beta.
3. Free play stays a button in the help sheet; a direct URL for it would need work, since `src/ui/free-gate.js` only handles the iPhone's turn-the-phone sheets.

Follow `docs/agents/seo.md` if the games should appear in search (sitemap, `llms.txt`, `tools/deploy/seo-pages.mjs`). Button and menu text is written by Codex.

## Open questions

- Where the menu lives. Decided for 1.3.0: the main game stays at `/`, the menu at `/jocs/`, with no change to entry, links, search pages or `start_url`. The owner
  has floated the menu at mulassa.cat itself. That gives a very light first load, but adds a tap before the game, moves it to a new URL and
  needs redirects and rebuilt public pages. It can still be done later.
- The URL word: `jocs` is a proposal.
- The double tap on the plaça can stay as a free play shortcut.
