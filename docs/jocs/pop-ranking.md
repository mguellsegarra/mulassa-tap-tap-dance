# Mulassa Pop: public all-time ranking (design, 1.3.0)

Owner's decisions (2026-11-03): one all-time board (no weekly, no seasons), ready for 1.3.0 (12 Nov 2026), reusing mulassa.cat's
profiles, guest sessions and captcha. Only each player's best counts.

## Why a replay

The main game's server checks a result against the song's chart (note count, score ceiling). Pop is random and endless, so a
submitted score proves nothing. The server must play the game again from what the player did and compute the score itself.

## Deterministic run (as built)

- `rules.js` takes `rng`; a run uses `seeded(seed)` (mulberry32) with a client-chosen uint32 seed, and a `level` (0 Fàcil, 1 Normal,
  2 Difícil).
- Three counters: `progress` (Mulassas +1, calçot +5, burns +1) drives the tempo, the spawn pace and the unlocks and stays internal;
  `points` is what the player sees and the board ranks; `hits` is the Mulassas tapped («tocs»). A tapped Mulassa gives
  `MULT[level]` points (`MULT` 1 / 2 / 3), times the combo; a calçot `round(5 × MULT)`; a Mulassa burnt by the carretilla
  `round(MULT)` (not a hit). The combo is fingers at once: Mulassas tapped within `CHORD` (.12 s) of a chord's first one make a
  chord of k, each worth k (up to `COMBO_MAX` 5), so the chord's whole is `round(k × min(k, 5) × MULT)` and each tap adds the
  difference. One at a time is ×1: the player lets Mulassas build up (the fuse is the risk) and takes them together.
  A tap within `GRACE` (.15 s) of a cell turning Drac (a goodie or fake that just ran out, a double tap) is forgiven. A bell does
  not come again until `BELL_REST` (20 s) after its slow time ends.
- `conductor.js` (pure) lays the tune out in **game time**: position, tempo glide. Its tempo starts at 150 / 165 / 180 BPM
  (`BASE_BPM[level]`) and rises with the progression the same way at every level. `sequencer.js` only plays the steps; `audio.js`
  maps game time to audio time with an offset that only grows (after a stall the music waits for the game).
- Spawns follow the beat grid, not a clock of their own and not the melody's notes: one Mulassa every `spawnBeats(progress, level)`
  beats of the CURRENT tempo (2, then 1.5 and 1 at progression 10 / 25, never faster than one a beat; Normal and Difícil start at 1.5), counted in the
  conductor's half-beat steps. `conductor.due(now)` says how many steps the game has reached (a `LEAD` of .1 s early, a figure
  takes that long to pop up) and `rules.beat()` counts them. After a carretilla, its volley replaces the count: `FLURRY_WAIT` (2) steps for the fire, then as many Mulassas as it burnt (`FLURRY` 3 to 5), one a step, at random and with no goodie or trap, then the count from 1.
  Fuses depend on the level (`FUSES` 5 / 4 / 3 s for a Mulassa at the start, `BOMB_FUSES` 4 / 3.2 / 2.4 s for the petard). The
  Mulassa's shortens with the progression (`fuseOf`: halved at `FUSE_SHRINK` 150, never under `FUSE_MIN` 1.6 s), so a steady
  player meets the end within minutes; `game.fuse` is the next one's, a cell's `life` the one it was lit with and `left` counts down.
- `bpmFor` uses + − × ÷ only (no `Math.exp`): every engine rounds them alike, so Safari, Chrome and Deno keep the same tempo.
- A run ends on its own at `MAX_RUN_S` (25 min) or `MAX_RUN_TAPS` (5,500), under `verify.js`'s limits, so a long run is never
  refused; `rules.timeUp` ends it with no culprit and the end sheet says so (`end.title.time`).
- `run.js` (`createRun({ cols, rows, seed, level, on })`) steps rules and conductor on a fixed clock of 120 ticks per second, in
  one order (tick → due steps → progression → lay out ahead). The page runs the ticks its frames reach; the log is the taps only,
  `[tick, cell]` pairs, plus the final tick count. A run ends at its first game over; nothing after it is logged. `?autoplay` runs
  (they start at a progression of 25) never go.

## Server (as built)

- `supabase/functions/pop-score/`: `index.ts` (Auth, size cap, gate, record), `verify.js` (the replay, plain JS), `sim/` (exact
  copies of `run.js`, `rules.js`, `conductor.js`, `melody.js`, made by `node tools/jocs/pop-sim.mjs`; `tests/jocs/pop-replay.mjs`
  fails when they differ). `verify_jwt = false` and `getUser`, as `delete-player`.
- The body is `{ v, seed, level, cols, rows, ticks, taps, points, hits }` (`RUN_VERSION` 5). The answer is
  `{ score, best, improved, position, hits, level }`, `score` being the replay's points.
- Caps: body 64 KB, 30 min of play (216 000 ticks), 6000 taps, taps in order and on the board's cells, `level` 0–2. The stored
  points are the replay's; the client's points and hits are only compared, and both must match.
- Migration `202611050001_pop_board.sql`: `pop_best` (the best run's `score`, `hits`, `level`), `pop_runs` (a seed scores once per player), `pop_attempts`;
  `pop_gate` (a guest or confirmed account with a name of its own, at most 12 replays a minute, asked before the replay) and
  `pop_record(uid, seed, score, ticks, hits, level)` (profile row locked, the best only rises and a tie keeps the first, with its
  hits and level; `last_active_at` refreshed), both `service_role` only; `get_pop_board`, `get_pop_player` and `my_pop` public and
  returning `hits` and `level` too. Seed profiles are left out; released names stay, as on the main boards.
  `tests/db/pop-board-db.mjs`.

## Page (as built)

- `ranking.js` (lazy): the Supabase client and session are mulassa.cat's. On a dev server with no Supabase, `ranking-mock.js`
  (`?sense-nom` for a player with no name).
- Home: the record pill shows the place (`· #11`) and opens the board sheet (top 50, your row lit, you after them if lower).
- End: the place, or «new best»; a player with no name gets a button to the profile's own steps right here (create, or
  another name for a released one: mulassa.cat's sheet through `settings.js`); the run waits in `pop-pending` and goes
  when that sheet closes. If that chunk fails to load the button is still mulassa.cat's link (`/#nom-pop`, or
  `/#nom-pop-canvi`, in `src/ui/sheets-setup.js`), which comes back to `/pop/`. Texts provisional until Codex writes them.

## Residual risks (accepted)

- The replay proves a log follows the rules, not that a person played it live: a bot that plays well in real time, or a log
  searched offline for a seed, passes. Server-issued run tickets would bound seed choice and wall time, but would need a
  session (and the captcha) before every game; not for 1.3.0.
- Plausibility (`verify.js`, error `implausible`, 422): from 30 judged taps (Mulassas) on, a run is refused when more than
  25 % of them came under 100 ms after the Mulassa appeared on its cell. It catches a bot that answers in the same frame
  (an instant one taps at 0 ms); a short lucky run is never judged. It does not catch a bot that waits a human-like
  180 ms or more with jitter, nor the dev bot (`autoplay.js`, which waits 1–3.5 s): that is the accepted risk above.
- The music now follows game time: after a long stall it waits rather than catching up.

## Rollout

The migration and the function ship with the branch: beta gets them on the push to `main` (migrations job, then the functions
workflow), production with the `v1.3.0` tag. Until the migration is applied the function answers 503 and the page shows
«could not publish» and keeps the run. Each deploy, production database change and tag is confirmed by the owner.
