# Bou Tradicional — dance with approved v13

Local adaptation in `t3/character-select-v1-2-0`, 2026-10-23.

## Review

Start Vite and open `/tools/dev/bou-dance.html`. On a local development host,
select **Bou Tradicional** then **Veure el ball amb la música**. Automated browser
checks must add `?mute`. The fragment, camera and half-speed controls support review.

The viewer uses the approved MP3 directly from the music package.

## In the game (2026-10-23)

The Bou is playable: `src/song-bou.json` (from `node tools/build_bou_chart.mjs`: the v13 melody,
voice 0, on timing.json's exact 1/12-beat grid; the approved MP3 copied byte for byte to
`public/music/`) is registered in `game/figure-song.js`; `scene/bou-stage.js` poses the rig at
the song clock (play, practice stance, results, the selector's showreel, «Mira el ball»), and
`scene/mula-motion.js` dispatches to it as it does for the Drac. Its identity is its own:
score version `bou-v1`, records `record-bou-tradicional-valls-<level>`, the «bou» word variant
(GUA | PA | GUAPA kept). The server has no `bou-v1`: no board, no publication, and its statistics
stay on the device (`hasBoard`, `game/stats.js` payload). A board needs a database migration,
which needs Marc's approval. `tests/bou-chart.mjs` checks the chart and that isolation.

## Owners

- `src/scene/models/bou.js`: selected p13 geometry from the study checkout.
- `src/scene/bou-rig.js`: four feet, two carriers' leg chains, body and tail groups.
- `src/game/bou-dance.js`: musical phrase anchors and the pure pose sampler.
- `src/game/bou-feet.js`: deterministic planned contacts in world coordinates.
- `src/scene/bou-motion.js`: applies those samples to the rig.
- `src/dev/bou-dance/`: local viewer only, reusing the game's plaza.

`createBouMotion(rig)(seconds)` is the reusable scene entry point. Feed it the game's
song clock when integrating a playable Bou; do not introduce a second elapsed clock.
The preview feeds it the native audio position, so pause, seek and speed share one clock.

## Timing and source distinction

The authoritative timing is `music/bou-tradicional/timing.json`, approved v13:
154.334717 seconds, melody from 6 seconds, stronger percussion at 55.238095 seconds,
acceleration around source bar 64, festive turns from bar 72, settling at bar 92.
The subdivision grid preserves variable tempo and the bar-63 slowdown.
No audio, score notes, cut or tempo was changed for this dance.

Source study: `bou-tradicional-study/mulassa-de-valls/research/bestiari/bou-tradicional/ball.md`,
`choreography.json` and `reconstruction.json`; Ardit 2023 video `2xG98OA1QqI`.
Observed families: alternating leg extension (26.4–27.8 s), face changes,
lateral passes (116–134 s), circuits/turns (134–210 s), collective lift (210–228 s).
These video seconds do NOT directly index the shortened music.

Phrase-to-movement mapping is an artistic adaptation, not a literal transcription
of steps or a verified count of rotations. Initial steps, two changes of facing,
lateral travel, settling, progressive turns and a return to the starting facing
are tied to retained musical bars. Travel is bounded to the central plaza.

## Explicit boundary

The collective overhead lift is carried by the colla's attendants and the carriers'
visible trunks and arms (see «Festa lift» below); the shell never floats without support.
Choreography review against full footage and real-phone QA remain open.

## Validation

`node tests/bou-dance.mjs` checks the approved MP3 hash, full-duration poses at
30/60/120 fps, planted-foot stability, actual sole corners above ground, bounded
travel/speed, deterministic seeking, opening extension and the final facing.
Screenshots and full-check/build logs are under `output/bou-dance/` (local output).
The review is visual and numerical; no new audio listening approval is claimed.

Full `npm run check` and `npm run build` passed. The existing selector keyboard
test fixture now supplies `navigator.userActivation`, matching the browser contract.
A mutation that freezes lateral travel fails the opening-motion assertion.

## Colla (2026-10-23)

Sources: UAF gallery (uaf.cat/gallery/el-bou-tradicional, images 4 and 6); Ardit recordings
`3lJvmqcp7r4` (Santa Úrsula 2021 fire dance), `2xG98OA1QqI` (Sant Joan 2023) and `zwLWQzeJxOE`
(Santa Úrsula 2026 cercavila, the clearest: ~176 s and ~246 s).

Observed: correfoc wear, the Bou being a fire beast. A garnet/magenta hooded jacket worn long,
buttoned, «BOU TRADICIONAL DE VALLS» printed down the front, a large cartoon bull's face on the
lower back; hoods down by day, up at the correfoc; some wear sunglasses (and a headscarf or beanie);
black trousers with a pale mark on the thigh. One member carries a tall wooden staff with a metal
fire pot at the top; another wears a soft black hat with a neck flap and a pale badge.

In the game (`models/colla.js` BOU_SUIT, `scene/bou-colla.js`): four attendants W/N/S/E 5.5 m out,
no one seated (Marc: fewer people than the Drac's and the Mulassa's), in that tunic; hoods up on some, sunglasses on others. A fifth person, the
capatàs Marc asked for, stands near the dance on none of the four marks (far side, seen beside the Bou): an older, short, stout man with grey hair
and moustache, the black hat and the staff (held still; his free hand beats time). Merging the hat
and the staff into one person, the four-point formation and the colours are artistic adaptation;
no lettering is drawn (a pale strip stands for it). `tests/bou-colla.mjs` keeps them clear of the
whole dance and out of the play camera's gap, and the staff upright on the paving.

## Festa lift (2026-10-24)

Sources for the final lift (daytime dances; the night fire dances `3lJvmqcp7r4`, `FkOKangAXv4`,
`KppcBHMvd6s` have no lift): `2xG98OA1QqI` 207–228 s (Sant Joan 2023), `G_R-ZvzS95k` 200–222 s
(vigília de Sant Joan 2024), `Klr8m3U6qzg` 216–236 s (Alió 2014), `jB8pjfCi29g` near its end.
Observed in all of them: colla and public crowd in under it, raise it at arm's length over
their heads, the front well up (roughly 20–40°), fire from the horns, then turn it inside a
tight ring of people with their hands up before lowering it.

In the game (`BOU_CARRY`, `carryAt`, bou-parade.js): lifted 0.75 m with the nose 0.3 rad up and a
small pump on the beat, run twice round the lap (~2.8 m/s, carriers stepping on the half beats);
the four attendants hold its flanks with raised arms, running with planted feet; the two carriers'
trunks and arms fill the gap under the risen hem; the plaça cheers and up to 30 of the front row
follow it: three at its rump reaching to touch it, a bouncing, clapping conga behind them. The heave takes one beat; up there it
is bucked and rocked on every beat. The running pace is a game choice: the
videos show it turned inside the crowd rather than raced round. The exact number of people under it and the fire are not modelled.
`tests/bou-festa.mjs` simulates the festa frame by frame for collisions and contacts.

## Rushes and see-saw (2026-10-24)

Game choices, not observed: its moves out to N/S/W/E are rushes that stop a hand short of that
attendant (0.14 m) in a cartoon skid; the front/rump see-saw is doubled and lifts the high end
instead of sinking the low one, showing the carriers' legs (as the Mulassa's carriers show). The
attendants run in through bar 71 and have it up on bar 72's downbeat (the festa's B section); every rush
arrives on a bar's downbeat. `tests/bou-colla.mjs` measures the near
misses against the real footprint (horns and tail included).
