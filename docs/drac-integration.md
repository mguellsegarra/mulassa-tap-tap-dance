# Drac integration: handoff (2026-10-19)

The revised Drac (the reference comparison's model, rig, natural legs, choreography, planted feet), its new music and
its colla now run in the real game. This file continues the original brief (SOURCE `HANDOFF.md`, Codex worktree
`drac-reference-trial`, which stays untouched) and records what was decided, what was checked and what is still
approximate. Music details: `docs/drac-music.md`.

## Where this lives

- Isolated worktree `t3/drac-game-integration-20261019`, built from the character-select worktree's HEAD `fb3a8fb` plus
  its local (uncommitted) selector changes, copied and verified by checksum (snapshot, patches and manifest in
  `~/.local/share/drac-integration-20261019/baseline/`; baseline git tree `9fa8aec`). Nothing is committed. The
  integration alone is `git diff 9fa8aec <current tree>` (`integration.diff` / `integration-files.txt` next to it).
- Applied to the character-select worktree (`t3-b0a52b07`, on top of its HEAD `7a2bf21` and local work) at Marc's
  request, 2026-10-19: 3-way merges of `.gitignore`, `AGENTS.md`, `package.json` and `tests/render-quality.mjs`, every
  other file unchanged there since the snapshot; the reference video through its `/drac-reference/` media alias.
  Nothing is committed; committing, merging or publishing each need Marc's explicit confirmation.

## Architecture

Two clocks, never mixed:

- **Reference seconds**: the source video's clock (pm-lEViiPK0, 0-104.8 s). The dance is authored in it.
- **Song seconds / beats**: `song-drac.json`'s audio clock and `beats` grid (variable tempo, 117-151.5 BPM).

`game/drac-time.js` is the only bridge: a monotone C1 map through 34 anchors (`song.ref`, generated from
`music/drac-form.json`'s `reference` block by `tools/build_drac.py`). Before the pickup the Drac waits at reference 0
(the count-in); after the last anchor it holds 104.8.

| Module | Role |
| --- | --- |
| `game/drac-path.js` | root path and unwrapped yaw (+ crouch / weight shift keys), reference seconds, model units |
| `game/drac-steps.js` | the audited foot plan (188 placements: 40 observed, 4 probable, 4 support actions, 140 adaptations), `feetAt` |
| `game/drac-pose.js` | `poseAt(out, refSec, musicBeat, gain)`: rigid shell, lean / bob from the steps, comic knee dip and waddle on the SONG's beat. `pose.beat` = reference seconds (poseDrac hands it to `feetAt`) |
| `game/drac-layout.js` | helpers (W/N/S/E, radius 5.1 m), `placeDance` / `danceToWorld` (one transform for path, feet, helpers, debug), `danceYaw` |
| `scene/drac-rig.js`, `scene/drac-legs.js` | `poseCarrier`: rigid shell, pelvis off the shell, continuous cloth trousers; `dressCarrier` after any other `poseDrac` (menu walker, splash pair) |
| `scene/drac-dance.js` | the game's frame: song time -> map -> pose -> rig in the dance frame; the colla's frame. `mula-motion.js` only dispatches and lends its bounded accent springs |
| `scene/drac-colla.js`, `scene/models/colla.js` | four clapping helpers (palms meet on integer beats, pure in the beat) and seated members by the band; one skinned draw call each |
| `src/dev/drac-compare/` + `drac-compare.html` | dev comparison: video, the SAME modules, overhead plan; optional game music on the map |

Ported verbatim from SOURCE `src/dev/drac-compare` (checked: identical rig output, max difference 0): path, steps,
carrier legs, the rig's pelvis, the pose's base layer. Replaced: the estimated video pulse (`pulse.js`) by the song's
beat; the placeholder discs/letters by the colla (letters kept as a debug layer: `?lletres` in the game, a switch on the
comparison). Not copied: the old lab (`drac-lab`), trial mp3s, SOURCE's unrelated services / selector / database work.

## Decisions taken here

- Music: **Festiva**, variant **A** (Marc listened and chose it, 2026-10-19). Form: the score's own order, the long D.S.
  through bar 51, then the coda; no repeated phrase (round 1's repeat of bars 48-51 sounded wrong to Marc). The
  recording's late seconds go to the last C held over an 8-beat closing roll, the final hit at reference 104.24 s;
  the measured ~150 BPM is kept through the spins. DIFÍCIL has 4 more CREMA doubles (12/12/16). See `docs/drac-music.md`.
- Helper radius 4.5 -> **5.1 m**: at 4.5 the close pass towards the camera (reference ~34 s) ran through S. With the
  posed rig (every mesh vertex, wings and tail) the closest is now S at 0.67 m (`tests/drac-dance.mjs`).
- Dance frame heading `DRAC_YAW = danceYaw(CAM_AZ)`: the play camera looks in between two helpers. With the frame at the
  Mulassa's FRONT the S helper stood between the lens and the Drac on phones. The opening pose faces 26 deg off the
  camera (three-quarter). W then claps in front of the band; the seated members sit beside / behind it in the band's gap.
- Crowd: while the Drac is the figure nobody stands within `RING.arena` 6.2 m of the centre (soft wall), so the dance
  and its helpers have their ground and nobody shouts "COMPTE!" all song.
- Red smoke (Marc, 2026-10-19: later, less odd, even, progressive): from the brake before the six reversed spins
  (reference 93.8 s, `DRAC_FX.flareRef`) it builds up to the final hit (`flareLevel`); the puffs rise evenly over the
  whole plaça except the corridor between the lens and the Drac; the fog takes a smoky red (`#b5473a`) at once and its
  density carries the crescendo (at full: the Drac ~19 %, the crowd ~30 %, the façades ~53 %); the sky only half tints.
- Play camera with the Drac (Marc: it could make you dizzy under the fixed note lane): it follows half the Drac's
  travel across the shot and 90 % of it towards / away from the lens, 12 % further back, and never turns with its
  heading (`cameras.js DRAC_CAM`). Measured in play: the view turns 1.5-1.8 deg/s on average (was 2-4), at most 6-7
  (was 10-12). `?camdrac=segueix` restores the Mulassa's follow for comparison.
- The colla: hidden in photo mode (the driven beast would run the helpers over) and with a pending figure on the selector;
  frozen with the Drac through a pause, its resume count-in and a collapse (its clap energy eases, never snaps); its
  helpers and seated members are fixed obstacles for the crowd while shown. Seated: 0 / 3 / 5 / 7 by tier.
- The selector / splash walker keep the old
  showcase dance (`game/dance-drac.js`), now with the cloth trousers.

## Validation done (2026-10-19)

- `npm run check` green (includes the new `drac-dance`, `drac-compare`, `drac-compare-comic`, `drac-natural-steps`,
  `drac-colla`, `drac-time`). Mulassa audio byte-identical (5 files); Drac mp3 / MIDI regenerated by the generator.
- Game path at 30 / 60 / 120 fps of song time: planted shoes fixed in the plaça (< 1e-6 m), no root jumps, any seek
  order = a fresh pose. Cloth: no trouser / shoe interpenetration, accelerations converge with frame rate (ported tests).
- Browser (headless Chromium, SwiftShader, always `?mute`): selection, first-run practice, play, pause (time and pose
  frozen), resume, restart (back to the start pose), exit to the selector, switch to the Mulassa (no Drac, no colla),
  photo mode, the final spins and the results; no console errors. 1280x800, 375x667, 393x852, 1024x768.
  852x393: the selector asks phones to turn upright (the baseline's own `wrong-orient` rule), so landscape phones do not play.
- `npm run build` + `tools/seo-pages.mjs` + `tools/prepare-pages.mjs`: allowlist passes; no research video, WAV,
  comparison or preview page in `dist/` (only the existing promo videos).
- CPU (this Mac, node): the new dance ~65 us a frame (old dance ~34 us), colla update ~1.6 us. No per-frame allocations
  in the new path. GPU / device benchmarks: not run.
- Clips and stills: `~/.local/share/drac-integration-20261019/clips/` (comparison: S/N, W/E, torsion, long pass, final
  reversal; game: torsions with the colla, the final reversal, a phone portrait pass).

## Marc's review, round 2 (2026-10-19)

- Helper S wore a green hoodie (a clapper seen by the camera): all four now wear the colla's camouflage suit.
- Seated members spread round the helpers' ring (~6 m, in the three gaps the camera does not look through: 3 / 5 / 7 by
  tier) instead of a heap by the band; the crowd's `RING.arena` 6.2 -> 7.2 m keeps them clear.
- Red smoke more evident: denser fog (at full: the Drac ~29 %, the crowd ~46 %, the façades ~80 %), more opaque, redder
  puffs, their rate linear in the level (a square hid them until the very end). Checked with the real GPU (high quality).
- Music: the repeated phrase removed (variant A, accepted by Marc after listening) and 4 more DIFÍCIL CREMA doubles:
  see `docs/drac-music.md` (round 2).
- Traca petards (they were already in the game): they now grow out of the mouths and shrink back into them (0.35 / 0.3 s)
  instead of popping in and out in one frame.
- Fire, 19/10/2026 (replaces the opaque box flames and the traca petards): carretilla tubes on the five fire points, jets of
  sparks on a long streak / the finale / the CARRETILLES, and a FLAMARADA (one ball for the two mouths) on CREMA, the final
  hit and the TRO. `scene/drac-fire.js`; mock-up, measurements and decisions in
  `~/.t3/artifacts/mulassa-drac-fire-mock-20261019/` (lab: `research/bestiari/drac/fire-lab/`).

## Independent review (GPT-6 Astra, read-only, 2026-10-19)

Three findings, all fixed with a regression test each: `tests/quality-boot.mjs` lacked the new provided names; the
colla kept clapping through the resume count-in while the Drac stood frozen; the colla stayed visible for a pending
figure. Lesser notes acted on: seated members are crowd obstacles now; the minimal tier's seated group stays hidden.
Left as is: the share photo rewrites the cloth buffers and the next frame re-poses them (no visible defect found).
Checked fine by the reviewer: the time map and its inverse, determinism, no cycles (150 modules), the comparison
unreachable from the game, the old-dance sweep cut-off, the compiler change, the build allowlist.

## Not verified / approximate

- Marc listened to variant A in the game and accepted it (2026-10-19). Still analysis + authored: the tempo map's
  knots, the held last note over the roll (no measurable pulse after ~99 s in the recording), the rit. to 117 into the hit.
- No physical phone or tablet was tested (emulation only). Marc tests the LAN URL himself.
- Distances, many angles and 140 of 188 foot placements are adaptations, not measurements; the overhead plan shows the
  model, not an independent measurement. The helpers' radius and the dance frame's heading are game choices.
- Tablet / desktop framing: during the close passes the heads can go under the lane band (tune with `?cam`).
- Helpers' clothing: from frames (cream jackets / trousers with green blotches, olive rings, red or yellow
  neckerchiefs, red headbands, one green hoodie with a red bandana); blotch shapes and the back emblem are simplified.
- `tests/drac-feet.mjs` / `drac-parts.mjs` now sweep the OLD beat dance only to beat 128 (A3): the game no longer
  dances the song with it, and its untouched D3 / E3 rows crossed the straight trousers at beats 164-207.

## Running it

- `npx vite --host --port 5191 --strictPort` from this worktree (`hmr: false`: reload to see changes).
- Game: `/?mute` (pick Drac). Debug: `?lletres`, `?autoplay&from=<song s>`, `?cam`, `?perf`.
- Comparison: `/drac-compare.html?mute` (the video comes through the dev media alias `/drac-reference/`,
  configured in the local `.bestiari-media.json`, see `research/bestiari/README.md`). Without `?mute` it offers "Música del joc" on the map.
- Colla preview: `/colla-preview.html` (`?beat`, `?energy`, `?t`, `?view=0-3`, `?play`).
