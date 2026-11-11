# Plassa

The shared base of mulassa.cat's games (the name sits between *Mulassa* and *plaça*). Every mini-game page stands on it;
mulassa.cat itself moves onto it once several games do. It lives here, in its own package folder, so it can leave for its
own repository later without moving again.

- `src/`: the modules and styles. Games import them as `#plassa/<file>` (the root `package.json` `imports`; Node and Vite
  resolve it). Pages link the CSS as `/packages/plassa/src/base.css` and `game.css`.
- `tests/`: Plassa's own tests (`npm run check` finds them). The tests that hold a game to Plassa live with the games
  (`tests/jocs/shared-base.mjs`).
- `docs/inventari.md`: what Plassa will hold (the games selector as the home page, one account and social layer, general
  and per-game settings), each piece's state, and the owner's decisions.

How a game uses it: `.agents/skills/mulassacat-minijoc/SKILL.md`. What each module does: its header, and the table in
`docs/jocs/README.md` («Shared base»).

## Before it can leave this repository

It still reaches into mulassa.cat in a few places, each to become configuration (`docs/inventari.md` §9):

- `src/core/` (`flags.js`, `version.js`): the dev host and the build stamp.
- Data: `src/i18n/meta.json` (the languages) and `src/i18n/locales/*/boot.json` (the loading lines).
- Mulassa's art and keys: `mula-load.html`, the storage keys (`menu-music`, `ui-language-v1`, `loader-jokes-seen`).
- `vite.config.js` (the root's) inlines `boot-watchdog.js` and `mula-load.html` into a game page.
- Exact copies of mulassa.cat modules, kept in step by `tests/jocs/shared-base.mjs` until the main game uses these.

`tests/build/modules.mjs` keeps Plassa importing only itself and `src/core/`, and mulassa.cat importing none of it yet.
