# Promo videos

Offline tooling that captures the real game on a virtual clock and cuts it to the song's beats with Remotion (16:9 and 9:16). It has its own `package.json`; `npm run all` runs the whole chain.

**Not ported to 1.1.0 yet.** Paths follow the current layout (`src/song-mulassa.json`, `tools/music/build_taiko.py`), but:

- `music.py` execs the generator's event-building part as top-level code; the generator now builds events inside a function, so it fails with `KeyError: 'hits'`.
- `plan.mjs` cuts up to beat 318 of the original long Mulassa; the current song has 229 beats (90 s), so the edit must be redone.
- `capture.mjs` has not been run against the current game.
