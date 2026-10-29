# Drac de Valls casebook

These incidents were investigated on 2026-10-16. Treat old beat numbers as historical reproduction coordinates. Discover the current song and worktree before reusing them. This is a record of observed failures, not a claim that the current model is flawless.

## Repeated failure patterns

| Symptom | Cause or rejected premise | Effective correction and required evidence |
| --- | --- | --- |
| Detached detail, blinking plates and awkward overlaps. | Rest geometry and connectivity were judged visually from too few angles. | Check same-facing overlapping coplanar faces, connected boxes and posed attachment coverage. Inspect the full model after changing a local part. |
| A sharp twitch every few seconds. | Periodic channels reset at bar boundaries; changing frequency through absolute beat times could reset phase. | Continuous phase and smooth periodic pulses/landings. Tests against the old choreography caught slope failures and an actual wing jolt of 0.711 m at old beat 84.04. Check jaw, flap, fire and shake separately so the first failure does not hide the rest. |
| Green, then black, then plain pale inner wings. | Paint was inferred from ambiguous orientation and lighting rather than verified both faces. | Shared rust/cream pattern on both faces, including leading edges. One membrane volume removes internal coincident faces. Nearest exposed-surface colour probes found zero front/back mismatches after the fix. This does not prove identical measured paint values from the photo. |
| Tail spots disappear or blink during curling. | Green joint knuckles buried the gold/red faces, including their own mesh; later tests found the trunk also covered a root ornament. | Check own mesh, neighbor and trunk occlusion under posed transforms. Move/size ornament and connector coherently. A paint-only or depth-bias change misses the cause. |
| Tail passes tests but looks like thin stems between lumps. | Reducing connectors fixed coverage while damaging the silhouette. | Fuller tapered skins with shorter flatter knuckles, then segment-end intersection checks. The historical selected tail gap was .14 model units; a .04 mutation failed. Those values belong to this model only. |
| Wing flames pass through necks/heads. | Angle-only flame trials left root boxes inside the swept head volume; sparse spherical collision proxies missed the contact. | Correct the wing/emitter geometry coherently. Accepted fix changed wing rest pitch and buried shoulder length. Check all flame boxes and wing boxes against actual posed anatomy, both actual scale and forced full scale. |
| Shoes tilt or squash during body sway. | Body transforms were inherited by the shoes. | Rigid independent flat shoes and fitted trousers. This first carrier fix was root-relative and did NOT establish world foot planting. |
| Shoes are flat but slide or turn on the ground. | Feet moved with root travel/yaw while appearing grounded. | Plan world-space touchdown anchors; hold sole corners and heading fixed until lift. Check both song and practice, multiple fronts, and 30/60/120 fps. Fit trousers to those shoes and test leg clearance. |
| Mathematically lifted shoes still look as if skating. | Long steps cleared the floor by only about 1.4 cm. | Scale lift to farthest sole-corner travel, including rotation. In the local evidence, 32 of 68 steps over .4 m were below 2 cm; after adjustment zero were. A .83 m stride peaked at 4 cm. Verify visually rather than treating positive height as sufficient. |
| A cuff briefly detaches between sampled poses. | Coarse joint samples missed the extremum around old beat 174.049. | Preserve the off-grid regression and inspect actual attachment coverage. A 1 cm cuff adjustment closed the reported gap. Keep this regression mapped when shortening the song. |
| Faster ending reintroduces a shoe jolt. | Continuous beat-space motion acquired large real-time curvature during a short swing; this was not a new position discontinuity. | Inspect world trajectories through the generated tempo map and sweep frame phases. Historical .08 m second-difference gate failed at .081535 m for one ramp; a longer ramp passed near .079140 m. Do not raise the limit or call second difference mathematical jerk. |
| Shorter form reverses one retained motion channel. | Removing odd sway cycles preserves sin(ph) but reverses sin(ph/2). | Compare every retained channel with the long baseline. The 91 s design required a song-only 2pi phase offset for reach, while practice retained its original phase. A statement that an eight-beat cut preserves all phases was disproved. |

## Collision math cautions

The wing-fire probe had to handle nonuniform body scale. Under hierarchical affine transforms, normalized transformed box edges are not generally face normals. Use a narrow phase appropriate to the transformed parallelepipeds, or transform both into a shared frame that preserves the assumptions. AABB overlap is a broad phase, not the final verdict.

Forced maximum flame scale is not necessarily a geometric superset of the tapered actual-scale shape. Check both modes. Do not permit all flame/anatomy contact because intentional nozzle/rod contact exists; exceptions must identify the intended objects.

## Other observed failures and open verification gaps

The initial model had disconnected nostril, crest and metal components inside head meshes. Connectivity checks found defects missed by coarse collision proxies. Separate real gaps from shadow banding with an on/off shadow comparison before altering geometry. Disabling shadow reception on a thin membrane can be a rendering choice after that diagnosis; it is not a general topology fix.

Reference matching also exposed a narrow comb-like wing silhouette despite passing tests. Framing checks found clipping at 375x667. Include overall proportions, ornament placement and full-motion framing as distinct visual checks.

Some limitations remained in the records reviewed for this skill. The coplanarity test covered individual meshes, not every cross-mesh rotating joint. Joint coverage did not exercise every front angle. The loaded/unloaded shoe ratio compared aggregate maxima from different strides. An earlier four-beat music cut left some independent eight-beat neck/head waves half a cycle away from the original; this was treated as an artistic difference, not established equivalence. The historical jolt accumulator rounded values before retaining its peak. Check the current source before describing any of these as repaired.

Do not run a heavy capture concurrently with timing-sensitive full-suite checks. A passing quiet rerun should be reported alongside the failed run and its demonstrated cause, rather than silently replacing it. Resolve probe dependencies from the actual checkout; symlinked node_modules made temporary scripts import the wrong location in earlier attempts.

## Evidence anchors

The following are local forensic records, optional for applying the skill. Core lessons above remain usable without these files. Base directory is `~/.t3/userdata/browser-artifacts/`.

- `drac-smooth-20261016/decisions.tsv` records old-code failures, adjacent-frame inspection, full-song and live recordings, and software-renderer limits.
- `drac-wing-colour-20261016/decisions.tsv` and `astra-review.txt` record the palette correction, equal exposed faces and photo uncertainty. Municipal reference used was https://www.valls.cat/images/aa2025noticies/250408santjordidrac.jpg . Reopen it before making new source claims.
- `drac-tail-20261016/decisions.tsv` records paint burial, rejected thin silhouette, trunk coverage and mutation-tested joint spacing.
- `drac-wing-fire-20261016/decisions.tsv` records angle-only failure, actual transformed-box checks, full and actual flame scale sweeps.
- `drac-carrier-20261016/verification.md` explicitly limits the first fix to root-relative shoes.
- `drac-footplant-20261016/verification.md` records world contact, long-stride perceptual correction, cuff seam and remaining brisk-step limits.
- `drac-music-20261016/tempo-jolt-astra/report.md` records raw trajectories, multiple frame phases, rounding defects in a historical test accumulator and continuous-curvature diagnosis.
- `drac-short-20261016/crossjudge.md` records the half-frequency phase correction. It is a design verdict; consult actual implementation validation before claiming it passed.

The repository's structural sources are `src/figures/drac/drac.js`, `src/figures/drac/drac-motion.js`, `src/figures/drac/dance-drac.js`, `src/figures/drac/drac-feet.js`, `src/dev/drac-timing.js` and their `tests/drac*.mjs` checks. Locate them in the active checkout instead of assuming the old temporary path still exists.
