# The Mulassa's and the Drac's dances, and the Drac's fire

Current rules, moved out of AGENTS.md so they load only when the task needs them. Read before changing a figure's choreography, rig, feet or fire in `src/figures/`.

- **Mulassa dance** (play; `research/bestiari/mulassa/game-integration.md`): FIGURES on the song's beats
  (`figures/mulassa/mula-figures.js`, the 2017 trace read as erratic drift): four runs out and back (W, E, N, S),
  the circle, the passada, eight culades on her head, two charges with a skid and the reversals, turns on the spot
  faster and faster onto W; sober in A1, comic from the drumroll (front up, rear kicks, hops, a head shake, a tremble).
  Joins eased (no stop-start between figures). `figures/mulassa/mula-dance.js` poses them in song seconds: the sway's phase on
  the song's beats (FESTA: a little more as the music livens; `?festiu=0` A/B), and the Bou's comic layer on every beat (`STYLE`'s dip, waddle, nod, see-saw), the eight shoes planned in song seconds
  (`figures/mulassa/mula-supports.js`). The 2017 reconstruction (`figures/mulassa/mula-path.js`) and its map (`figures/mulassa/mula-time.js`, `song-mulassa.json`
  `ref`) now only feed the comparator. `figures/mulassa/mula-layout.js`: the compass (W = opening heading, + yaw W→S→E→N), the
  four attendants, the dance frame (camera between W and S). `figures/mulassa/mula-stage.js` places it, steps the shoes live off
  the song (selector, practice, results, photo mode), and her colla (`figures/mulassa/mula-colla.js`, the Drac's bodies in
  `figures/mulassa/mula-suit.js` MULA_SUIT; hidden in photo mode and on the splash; the crowd keeps beyond `RING.arenaMula` 6.7 m;
  arms up and a hop at each culada, skid, the final hit and a big hit, and the crowd's groove answers: `MULA_CHEERS`). The jaw bites only on big moments. Carriers: `figures/mulassa/mula-carriers.js` (cuffs + rigid shoes, the old model legs are gone).
  Hits add bounded accents (`accent()`, capped by `CAP`): GUA leans her to the screen's left, PA right, GUAPA/pop
  lifts her; holds sustain a lean; misses weaken the sway (never the path or turns: the shoes are planned on them),
  wrong moves stumble; nothing accumulates yaw. `tests/figures/mulassa/mula-dance.mjs`. The old beat choreography (`dance.js`) is the
  share photo's still and the shared factory code. Never add random motion to the song choreography.
- **Drac dance** (play, practice, results; `docs/figures/drac-integration.md`): authored in REFERENCE seconds (the source video
  pm-lEViiPK0, 0-104.8 s), never in beats: `figures/drac/drac-path.js` (root path, unwrapped yaw), `figures/drac/drac-steps.js` (the
  audited foot plan: 188 placements, only 40 observed + 4 probable + 4 support, the rest adaptations), `figures/drac/drac-pose.js`
  (`poseAt(out, refSec, musicBeat, gain)`: rigid shell + a comic knee dip / waddle on the SONG's beat), `figures/drac/drac-rig.js`
  (`poseCarrier`: rigid shell, pelvis off the shell, cloth trousers `figures/drac/drac-legs.js`; call `dressCarrier` after any
  other `poseDrac`), `figures/drac/drac-dance.js` (the game's frame: scene/stage-motion.js only dispatches to it, through `drac-scene.js`). ONE time map,
  `figures/drac/drac-time.js` (song seconds <-> reference seconds, from `song-drac.json` `ref`, written by `tools/music/build_drac.py`
  from `music/drac/drac-form.json`'s `reference` block): never connect a music beat to `pose.beat` (it carries reference
  seconds to the feet). One dance frame, `placeDance(obj, FRONT)` (`figures/drac/drac-layout.js`): the Drac's parent, the helpers
  and any debug layer; path in model units, helpers in metres, `DRAC_SCALE` once. The colla (`figures/drac/drac-colla.js`,
  `models/colla.js`): four helpers at 5.1 m in the colla's camouflage suit clapping on integer beats, a few members sitting
  spread round their ring (~6 m, not the camera's gap; the crowd keeps beyond `RING.arena` 7.2 m), shown only with
  the Drac and not in photo mode; `?lletres` shows the W/N/S/E debug letters. `figures/drac/dance-drac.js` (the old beat dance)
  now only drives the selector / splash walker and the music editor's preview. `/tools/dev/drac-compare.html?mute` (dev, never built)
  draws the same modules against the video (served by the dev media alias `/drac-reference/`, research/bestiari/README.md;
  never in `public/`).
- **Drac fire** (`figures/drac/drac-fx-rules.js` says when, `figures/drac/drac-fx.js` and `figures/common/fire.js` draw): a kraft carretilla tube on each of the five fire
  points (models/drac.js `fireNode`, root in its nozzle). Documented fire (UAF photos, research in
  `~/.t3/artifacts/mulassa-pirotecnia-research-20261019/`): JETS of white-gold sparks from the tubes on a 30 streak, in the
  FINAL ESBOJARRAT and while the CARRETILLES burn (each tap kicks the next tube, the TRO fires all five). Artistic licence,
  on purpose: the FLAMARADA on every CREMA, the final hit and the TRO — one ball between the two snouts plus the tail and
  wing tips, ~1.1 s, it lets go of the tubes and stays put in the world; sizes in `FIRE.flare` (the
  mock-up's 0.7, wider, one ball for the mouths). No light pulse on the plaça (the finale lights own it); reduced motion
  drops the flash. Pools per tier: `PROFILES[].jets`.
  Free mode only (E held with the Drac): whoever the fire's volume touches is charred cartoon-black (white eyes), frozen,
  with a wisp of smoke, for `SOOT.hold` 4 s, then eases back over `SOOT.fade` into their own live behaviour
  (`figures/drac/drac-soot.js`: capsules from the fire points, counted generously down to the heads under the flame
  (`SOOT.under`, `SOOT.wide`), plus everyone in a wedge in front of the snout as far as its jets (`SOOT.front`);
  stand-in meshes (the local representation trial) follow their person through `sootLink` / `sootHold`; a byte per bone on the crowd mesh's own material for the ring, band and
  balconies, a per-instance `aSoot` for the backdrop/mid figures). Never in the game, demos or the selector.
