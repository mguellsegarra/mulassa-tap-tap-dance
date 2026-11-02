# Mini-games plan (release 1.3.0)

Status: Del Nan al Gegant, a Suika-style merge game, is at `/jocs/suika/` (branch `jocs/suika`; physics by `planck`, its working notes in the `mulassa-minijocs` project). Memory is in this repo at `/jocs/memory/` (reachable only by its URL; card sources in `memory-sources.md`, its provisional texts in `memory-textos.md`, card masters still in the `bestiari-memory` project). No menu or selector button yet and no architecture step tested on a device. The other games live outside the repo:
`/Volumes/development/projects/mulassa-minijocs` (Pinta per números, Endreça el Seguici, Seguici Crush) and `pica-la-mulassa`.

Research, in Catalan, copied from `mulassa-minijocs/notes/` on 2026-11-01 (that project may have moved on since):
- `research/cataleg-jocs.md`: the catalogue of game ideas.
- `research/recerca-mercat.md`: market research and the owner's references (SubaraCity, merge games, Doodle God).
- `research/jocs-fisics.md`: physical games about the Seguici and similar festes.
- `research/actius-reutilitzables.md`: assets the game can lend.

## Decisions from the owner

- 1.3.0 is the release that brings the mini-games into mulassa.cat.
- Fes el castell is out of the plan. It still appears in the research notes, which are left as written.
- The selector's gamepad button (`#free`, `index.html`) stops being the way into free play and opens the games instead.
- Free play also becomes an entry in the games menu, though it stays part of the main game.
- The URL must not say `minijocs`.

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
