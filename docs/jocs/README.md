# Mini-games plan (release 1.3.0)

Status: Seguici Crush is at `/jocs/crush/` (branch `jocs/crush`; its art masters, notes and difficulty research stay in the `mulassa-minijocs` project). Memory is in this repo at `/jocs/memory/` (reachable only by its URL; card sources in `memory-sources.md`, its provisional texts in `memory-textos.md`, card masters still in the `bestiari-memory` project). The selector's gamepad opens the games sheet; no architecture step tested on a device. The other games live outside the repo:
`/Volumes/development/projects/mulassa-minijocs`. Pica la Mulassa is at `/jocs/pica/`, also reachable only by its URL; its source project is `pica-la-mulassa`. Mulassa Drop, a Suika-style merge game, is at `/jocs/suika/` (physics by `planck`, its working notes in the `mulassa-minijocs` project).

Research, in Catalan, copied from `mulassa-minijocs/notes/` on 2026-11-01 (that project may have moved on since):
- `research/cataleg-jocs.md`: the catalogue of game ideas.
- `research/recerca-mercat.md`: market research and the owner's references (SubaraCity, merge games, Doodle God).
- `research/jocs-fisics.md`: physical games about the Seguici and similar festes.
- `research/actius-reutilitzables.md`: assets the game can lend.

Seguici Crush's level table comes from `tools/dev/crush-curve.mjs`, a casual-player bot, and `tests/jocs/crush-curve.mjs` guards the curve. Help after losses is `helpFor` in its `rules.js`, only ever towards easier; no stats leave the device, by the owner's decision.

## Decisions from the owner

- 1.3.0 is the release that brings the mini-games into mulassa.cat.
- Fes el castell is out of the plan. It still appears in the research notes, which are left as written.
- The selector's gamepad button (`#free`) opens «Jocs», a sheet inside the main game (`src/ui/games-menu.js`), not a page: the owner rejected a separate `/jocs/` menu, so free play starts and returns to the sheet with no reload.
- Free play is that sheet's last entry. A mini-game is still its own page, so opening one and coming back reloads the main game.
- The URL must not say `minijocs`.

## Names and rollout

The owner's choices. A game takes its name when it enters this branch; folders, URLs and branches keep their working ids, players never see them.

| Name | Now | Id, where it lives | Release |
| --- | --- | --- | --- |
| Mulassa Pop | applied | `pica` | 1.3.0 |
| Mulassa Memory | applied | `memory` | 1.3.0 |
| Mulassa Crush | applied | `crush` | 1.3.0 |
| Ball lliure | applied | free play, last card of the sheet | 1.3.0 |
| Mulassoku | to apply | `murdoku`, branch `jocs/murdoku`; players must never read «Murdoku» | one a week after 1.3.0 |
| Mulassa Craft | to apply | Alquímia, `mulassa-minijocs`, `minijoc/alquimia` | one a week |
| Mulassa Drop | to apply | Del Nan al Gegant, `suika`, branch `jocs/suika` | one a week |
| Mulassa Run | to apply | Corre i suma colla, branch `jocs/corre` | one a week |
| Mulassa City | to apply | Vila del Seguici, `subara`, branch `jocs/subara` | one a week |

Each new game gets a colour for its card and logo, a line in `NEWS` (`src/ui/news-sheet.js`) and a card above Ball lliure, which stays last.

Discarded: Snake, La Cercavila, Talla calçots, Bantumi, Pinta per números, Endreça el Seguici, De nan a gegant (2048), Fes el castell. The code of those that had any, without a commit here, is in `mulassa-minijocs/descartats/`.

Before publishing, the owner checks the marks: «memory» and «Crush». No registry search was made for any name.

## Architecture

Separate pages on the same domain, in the same tab. Only a full page navigation reliably frees memory: a loaded JS module
cannot be unloaded, and hand-releasing three.js, audio and canvas caches is fragile.

```
/                game (proposal, see open questions)
/jocs/           menu
/jocs/memory/    one page per game
/jocs/crush/
```

- Leaving the main game uses `location.replace()`, so bfcache does not keep it frozen in memory. The browser's back button then
  skips it, so every page has its own visible way back. Menu and games use normal navigation.
- The menu loads no game; a game loads its own code and `shared/`. three.js stays out unless a game needs it.
- Same origin: `localStorage` and the Supabase session are shared.
- `public/manifest.webmanifest` has `start_url: "/"` and no `scope`, so these URLs should stay inside the installed app. A subdomain would leave it.
- Rejected: teardown within one page, iframes (and `_headers` sets `frame-ancestors 'none'`), new tabs (the main game stays alive
  behind them and an installed app leaves its window), separate repos or builds per game.
- Known costs: returning rebuilds the scene and shaders, though files come from the cache. Music needs a new tap on each page. On
  Android the back gesture may close the app. A reopened app may start at `/`, so games save progress in `localStorage`.

## Code layout

```
jocs/index.html                   menu
jocs/<game>/index.html            loads only its game
src/jocs/shared/                  only what at least two games use
src/jocs/games/<game>/            a game never imports from another game
public/jocs/<game>/               a game's images
tests/jocs/
```

Each game page repeats the main page's viewport, `theme-color`, manifest and Apple tags.

## Steps

1. Probe: an empty `/jocs/` page and a button there and back. On an iPhone and an Android with the app installed, check that it stays
   in the app, that memory drops, and how long the return takes. Change the plan here if it fails.
2. Infrastructure: `vite.config.js` inputs from a glob of `jocs/*/index.html`, `tools/deploy/prepare-pages.mjs` allowlist, `no-cache` for
   the new HTML in `public/_headers`, the version check from `src/services/update.js`.
3. Move the menu and one finished game (Memory), and take that path all the way to beta.
4. Move the others one by one.
5. Free play entry: it needs a URL that opens it directly. `src/ui/free-gate.js` only handles the iPhone's turn-the-phone sheets, it offers no such link.
6. Selector button, last, so players see nothing until it works. Until then the URL is only reachable directly on beta.

Follow `docs/agents/seo.md` if the games should appear in search (sitemap, `llms.txt`, `tools/deploy/seo-pages.mjs`). Button and menu text is written by Codex.

## Open questions

- Where the menu lives. Proposal for 1.3.0: game stays at `/`, menu at `/jocs/`, with no change to entry, links, search pages or `start_url`. The owner
  has floated the menu at mulassa.cat itself. That gives a very light first load, but adds a tap before the game, moves it to a new URL and
  needs redirects and rebuilt public pages. It can still be done later.
- The URL word: `jocs` is a proposal.
- The new button's icon. The double tap on the plaça can stay as a free play shortcut.
