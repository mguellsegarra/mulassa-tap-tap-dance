# Mulassa Pop: public all-time ranking (design, 1.3.0)

Owner's decisions (2026-11-03): one all-time board (no weekly, no seasons), ready for 1.3.0 (12 Nov 2026), reusing mulassa.cat's
profiles, guest sessions and captcha. Only each player's best counts.

## Why a replay

The main game's server checks a result against the song's chart (note count, score ceiling). Pop is random and endless, so a
submitted score proves nothing. The server must play the game again from what the player did and compute the score itself.

## Deterministic run (as built)

- `rules.js` takes `rng`; a run uses `seeded(seed)` (mulberry32) with a client-chosen uint32 seed.
- `conductor.js` (pure) lays the tune out in **game time**: position, tempo glide, which steps carry a note. Spawns follow its
  notes, never the audio clock, so a player cannot thin them out. `sequencer.js` only plays the steps; `audio.js` maps game
  time to audio time with an offset that only grows (after a stall the music waits for the game).
- `bpmFor` uses + − × ÷ only (no `Math.exp`): every engine rounds them alike, so Safari, Chrome and Deno keep the same tempo.
- `run.js` steps rules and conductor on a fixed clock of 120 ticks per second, in one order (tick → due notes → level →
  lay out ahead). The page runs the ticks its frames reach; the log is the taps only, `[tick, cell]` pairs, plus the final tick
  count. A run ends at its first game over; nothing after it is logged. `?autoplay` runs (they start at 25 points) never go.

## Server (as built)

- `supabase/functions/pop-score/`: `index.ts` (Auth, size cap, gate, record), `verify.js` (the replay, plain JS), `sim/` (exact
  copies of `run.js`, `rules.js`, `conductor.js`, `melody.js`, made by `node tools/jocs/pop-sim.mjs`; `tests/jocs/pop-replay.mjs`
  fails when they differ). `verify_jwt = false` and `getUser`, as `delete-player`.
- Caps: body 64 KB, 30 min of play (216 000 ticks), 6000 taps, taps in order and on the board's cells. The stored score is the
  replay's; the client's is only compared.
- Migration `202611030001_pop_board.sql`: `pop_best`, `pop_runs` (a seed scores once per player), `pop_attempts`;
  `pop_gate` (a guest or confirmed account with a name of its own, at most 12 replays a minute, asked before the replay) and
  `pop_record` (profile row locked, the best only rises, `last_active_at` refreshed), both `service_role` only;
  `get_pop_board` and `my_pop` public. Seed profiles are left out; released names stay, as on the main boards.
  `tests/db/pop-board-db.mjs`.

## Page (as built)

- `ranking.js` (lazy): the Supabase client and session are mulassa.cat's. On a dev server with no Supabase, `ranking-mock.js`
  (`?sense-nom` for a player with no name).
- Home: the record pill shows the place (`· #11`) and opens the board sheet (top 50, your row lit, you after them if lower).
- End: the place, or «new best»; a player with no name gets a button to mulassa.cat's name sheet (`/#nom-pop`, or
  `/#nom-pop-canvi` for a released name, in `src/ui/sheets-setup.js`), which comes back to `/pop/`; the run waits in
  `pop-pending` and goes then. Texts provisional until Codex writes them.

## Residual risks (accepted)

- The replay proves a log follows the rules, not that a person played it live: a bot that plays well in real time, or a log
  searched offline for a seed, passes. Server-issued run tickets would bound seed choice and wall time, but would need a
  session (and the captcha) before every game; not for 1.3.0.
- The music now follows game time: after a long stall it waits rather than catching up.

## Rollout

The migration and the function ship with the branch: beta gets them on the push to `main` (migrations job, then the functions
workflow), production with the `v1.3.0` tag. Until the migration is applied the function answers 503 and the page shows
«could not publish» and keeps the run. Each deploy, production database change and tag is confirmed by the owner.
