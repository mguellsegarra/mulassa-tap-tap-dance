# Accepted rehearsal compass and simplified carriers

2026-10-19. Local comparison prototype on `t3/character-select-v1-2-0`, not game integration.

## the owner's decisions

- Fixed rehearsal directions: W is the direction the 2017 reconstruction faces at the opening; E is opposite. N/S are perpendicular. These are script labels, not geographic bearings. The camera has a separate marker.
- Simple, natural-looking legs, retaining four carriers and original beast proportions.
- Slightly exaggerated body/head sway from the first implementation.

## Applied changes

The 3D and overhead share one immutable compass derived from the opening pose. The map uses N up and W left, and projects both the model and its trajectory into those axes. Camera orientation is separate. Phase descriptions now distinguish the first W-S-E half turn and the subsequent E-N-W half turn. A live facing label refers to the nearest rehearsal direction, not travel direction.

The three fitted windows no longer suppress lateral body roll by 90%. The existing phase-continuous roll is amplified by 15%; a head roll of 12% of body roll adds a small stylized accent. This is approved expression, not a claim that the real neck has an independent hinge. Original pitch, root travel, heading anchors, source time and camera-fit data are retained.

The carrier representation now contains eight shoes and eight simple trouser cuffs. Exposed thigh/knee/hip blocks are removed. Each cuff reaches a little inside the unchanged cloth; it is an abstract visible clothing span, not a simulated fixed-length anatomical leg. In raised poses a longer part is exposed. Shoes remain rigid and fixed in world space during stance. Cuffs keep their width and depth and mostly align vertically; near the cloth edge their upper ends tuck inward.

Foot placement now uses narrower shoes, closer carrier lanes, shorter swings during rapid movement and per-carrier fore/aft landing corrections. The former common sideways correction moved an entire group outward. No body/skirt scaling, camera-dependent hiding, depth tricks or source video warping was introduced.

## Evidence and verification

External evidence folder: `~/Desktop/Bestiari de Valls - I+D/Mulassa/revisio-2026-10-19/simple-carriers-v3/`.

- `baseline/`: source snapshot before changes; original model and all music hashes preserved.
- `regression-metrics.json`: the previous opening roll at 1 second was 0.279 degrees; the candidate has 3.204 degrees. The longest planned shoe step fell from 1.167 m to 0.798 m. These are model units/metres inferred by the reconstruction, not measured carrier strides. Both regression checks reject the saved baseline.
- `playback/`, `playback-times.json`, and overview sheets: normal-speed muted playback across the source, sampled every source second from 1 through 166. The timing log stores the trigger time; screenshots can land slightly later. Each sheet was inspected. Paused critical frames and mobile captures supplement these samples.
- `node tests/figures/common/bestiari-research.mjs` passes. It checks original observed turn/travel landmarks, deterministic seeking, stationary stance, lift/landing continuity, all 28 shoe pairs and actual trouser vertices at 240 Hz with a half-sample offset. Cuffs stay attached to shoes and within the cloth above its hem; shoe dimensions are unchanged by animation. The old fixed-bone assertions were replaced because the accepted representation intentionally omits anatomical chains. The old arbitrary two-second stationary-opening assumption was replaced by a true static-pose no-marching test, because restored sway changes required support timing.
- The cuff axis stays within 10 degrees of vertical in the selected rest/raised-back regression poses. The full sweep is bounded at 35 degrees, including fast turns. This is not a claim that every leg is vertical at every instant.
- `npm run check` and `npm run build` pass. Build retains the existing large-chunk warning. The research module remains outside the game's production import graph.
- Browser checks: desktop 1440x1000; portrait 375x667 and 393x852; landscape 852x393. No horizontal overflow in the checked small/landscape layouts; no browser warning/error logs. These are viewport checks, not physical-phone performance certification.
- All files in `public/music/` and `src/figures/mulassa/mulassa.js` are byte-identical to this pass's baseline. Source audio and game choreography were not changed.

## Remaining limits

The floor path is still the earlier fitted estimate. The compass makes it readable but does not prove its distances or convert every wobble into an observed cardinal step. The proposed phrase-level path simplification requires further ground registration; it has not silently replaced the reconstruction.

Sway timing, carrier footfalls and camera depth remain inferred. The simplified cuffs can look long at the strongest raises because the original costume geometry is retained. A sampled playback review and discrete collision checks do not prove perfect continuous motion, anatomical realism or exact fidelity to the source. The owner\'s visual review remains the acceptance step.

Preview: `/mulassa-compare.html?mute`, LAN port 5188. Task-owned Vite PID 26476 is intentionally retained for the owner; no other listener or concurrent browser resource was cleaned up. No commit, push or deployment was performed.
