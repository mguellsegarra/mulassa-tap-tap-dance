# Mini-games plan (release 1.3.0)

Status: 1.3.0 ships only Mulassa Pop (mulassa.cat/pop: page `pop/index.html`, code in `src/jocs/games/pop/`, source project `pica-la-mulassa`). The other games were taken out of this branch before release; each one waits on its own `jocs/<id>` branch, at the state it had here (7e0e749), until its release (table below). The selector's gamepad opens the games sheet.

Research, in Catalan, copied from `mulassa-minijocs/notes/` on 2026-11-01 (that project may have moved on since):
- `research/cataleg-jocs.md`: the catalogue of game ideas.
- `research/recerca-mercat.md`: market research and the owner's references (SubaraCity, merge games, Doodle God).
- `research/jocs-fisics.md`: physical games about the Seguici and similar festes.
- `research/actius-reutilitzables.md`: assets the game can lend.

## Decisions from the owner

- 1.3.0 is the release that brings the mini-games into mulassa.cat.
- Fes el castell is out of the plan. It still appears in the research notes, which are left as written.
- The selector's gamepad button (`#free`) opens «Jocs», a sheet inside the main game (`src/ui/games-menu.js`), not a page: the owner rejected a separate `/jocs/` menu, so free play starts and returns to the sheet with no reload.
- Free play is that sheet's last entry. A mini-game is still its own page, so opening one and coming back reloads the main game.
- The URL must not say `minijocs`.

## Names and rollout

The owner's choices. A game takes its name when it enters this branch; folders, URLs and branches keep their working ids, players never see them.

| Name | Id | Branch | Release |
| --- | --- | --- | --- |
| Mulassa Pop | `pop` | here | 1.3.0, 12 Nov 2026 |
| Ball lliure | free play: not a card; a button in the help sheet («?», `#howto-walk`), too expert for the sheet | here | 1.3.0 |
| Mulassa Memory | `memory` | `jocs/memory` | 1.4.0, 19 Nov |
| Mulassa Crush | `crush` | `jocs/crush` | 1.6.0, 3 Dec |
| Mulassa Drop | `suika` | `jocs/suika` | 1.7.0, 10 Dec |
| Mulassa Alchemy | `alquimia` | `jocs/alquimia` | 1.8.0, 17 Dec |
| Mulassa City | `subara` | `jocs/subara` | 1.9.0, 14 Jan 2027 |
| Mulassoku | `murdoku`; players must never read «Murdoku» | `jocs/murdoku` | 1.12.0, 4 Feb |
| Mulassa Run | `corre` | `jocs/corre` | 1.13.0, 11 Feb |

One novelty per release, on Thursdays; 1.5.0 (Bou), 1.10.0 (Gegant del Calçot) and 1.11.0 (Àliga) are figures. A game's branch
holds its pages, code, pictures, tests and `_headers` lines as they were in 1.3.0 before the removal (Memory and Crush also their card). A merge of that branch does not
bring them back (the removal is newer), so take its files with `git checkout jocs/<id> -- jocs/<id> src/jocs/games/<id> public/jocs/<id>`
plus its tests and docs, then add its card in `index.html`, its colour, its `html.games.<id>` strings and its `_headers` lines.

Each new game gets a colour for its card and logo, a line in `NEWS` (`src/ui/news-sheet.js`) and a card after the last game. The «Aviat» surprise cards (`data-soon`, nothing to play, each in the colour of the game it stands for) fill the row; a new game takes the place of the first one.

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
