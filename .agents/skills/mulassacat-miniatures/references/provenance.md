# Origin and evidence ledger

Verified 2026-10-19. These are historical decisions, not new instructions to change the loader.

## Exact conversations

1. Sis propostes animades de loader amb la Mulassa, created 2026-10-18 18:09:45 UTC (20:09 Europe/Madrid). This is BOTH the origin of proposal C and the final integration/visual iteration thread. It is not merely an inspiration thread.
2. iPhone encallat al loader de la Mulassa, created 2026-10-18 19:52:29 UTC. Later engineering adaptation: same drawing, independently animated HTML layers containing static SVGs.
3. Mulassa loader imagegen concepts. Listed child of thread 1, identified through its catalog and parent report. Its full conversation was not needed/read in this task. Four static concepts were exploratory; none is the source of C. Do not claim direct verification of every imagegen invocation from this ledger.

Thread 1 began with Claude provider messages and continued with Codex after a session limit (position 210, then user "continua" at 213). The thread's final model field describes its last run, not the author of every earlier operation. Local source code is the strongest evidence for the actual drawing method. Do not invent which model manually authored each SVG path.

## Relevant timeline positions in thread 1

Positions are durable tool timeline positions, not clock times. Recover a bounded section with `t3_thread_read`, `afterPosition`, `limit`, `maxCharsPerItem`. Read long items by `itemId`/`textOffset`; do not dump all activity or poll settled threads.

| Position | Evidence and implication |
|---|---|
| 0 | Brief: six different animated alternatives, identity tied to the real Mulassa, prototype phase first. |
| 47–67 | A was a 16-frame prerender of the actual voxel model. Clipped head and weak leg motion required framing/motion changes. This is evidence about A, not C's production pipeline. |
| 71–75 | B had clipped ears and bad layer order; then C–F were written as inline SVG + CSS. |
| 78 | Gallery builder measured raw/gzip weights and exported standalone HTML/SVG. |
| 93 | Generated raster concepts had seven countable shoes, inconsistent pose scale and non-sprite "pixel" imagery. These limitations do not describe the manual SVG. |
| 109–120 | C worked in visual review. D/E face straps resembled scars; F feet floated above the ground. Gallery scaling caused empty/cropped small samples. Fixes belonged to those variants/gallery. Do not transfer them into fabricated C defects. |
| 131–144 | Gallery reduced-motion bug: script replayed CSS-cancelled animations. Explicit cancellation fixed the demonstration. Production needed a rest pose, not a frozen arbitrary gesture. |
| 183, 187 | Recorded selection: C "Pas de portadors" for the large loader and C head for mini spinners. At 16 px the mini was just a little brown head; recognition improved at 20 px. |
| 207, 221 | Integration: full C, mini head, same artwork for sad/error variant, retained background. Prefix classes for game isolation; keep duplicated initial/runtime markup identical. |
| 231, 318 | Initial integration incorrectly removed waiting/minimum phrase duration; later explicitly reversed. Do not propagate "remove all waiting" as an accepted criterion. |
| 323 | The owner requested a more humorous fast run and a ground line; the original step did not convey running. |
| 340–362 | Articulated knees, opposing stride, moving ground, stretched-back tail, head reaction; lighter socks/soles for contrast and corrected ground contacts. |
| 399 | Remove white thing below eye; ground too white; rear motion lines too simple. |
| 402–431 | Removed white cheek decoration, muted ochre ground, two alternating puffs of dust at the feet instead of three speed lines. |
| 433–517 | The owner requested restoration of three complete loading jokes. Result: three 1.6 s lines, finish current line, preserve 12 s bound. Browser timings reported 1.81, 1.84, 1.63 s for that trial. |
| 519–568 | The owner wanted sad Mulassa alive and same style. Same drawing and size; planted feet, 3.2 s breathing/sigh, falling tears. Reduced motion static, one tear visible. |
| 617–641 | Larger, more evident tears, side-by-side comparison. |
| **649** | **Direct user answer: "Dono el disseny per bo" and "Deixar-ho en local, sense commit".** This is the final design acceptance; do not substitute an assistant's claim that tests passed for user approval. |
| 650 | Assistant acknowledged design accepted and local-only state. |

Unrelated selector arrow discussion at 570–615 is not an illustration style decision.

## Later engineering evidence, thread 2

- 281–341: main-thread blocking froze internal SVG parts; `will-change` alone did not fix it. Prototype HTML layers continued under a 1.5 s artificial block. This was not yet integrated.
- 316: the owner clarified that "tallada" meant motion stopped, not missing/cropped geometry.
- 576: user chose startup work reduction first; 657 still reported a stop.
- 671–705: simulator experiment with 2.5 s blocking, then each moving part became an HTML `div` with its own static SVG in the same 220×168 coordinates. Percentage origins replaced SVG pixel origins. Old and new comparison was initially wrong because the script picked the wrong style block; corrected before drawing conclusions.
- 697–715: approximately 1.5% differing edge pixels, attributed by visual inspection to half-pixel centring/antialiasing; not evidence of a new design. Sixteen running/crying poses compared. The reported simulator result: old froze, new continued. Physical iPhone remained a stated limit.
- Current files were inspected directly on 2026-10-19. Do not treat every performance claim from the old commentary as a fresh benchmark, or a simulator as a physical-device result.

## Source artifacts

Original pack: `~/.t3/artifacts/mulassa-loader-proposals-20261018/`.

- `src/proposals.mjs`: manual SVG/CSS source, `const C`, palette K; A/B are distinct pipelines.
- `standalone/mulassa-C.svg`: initial C, preserved in this skill for provenance.
- `src/build.mjs`: gallery, weights, standalone exports; `src/cmini.mjs`: mini head.
- `src/integrate.mjs`, `src/integration-preview.mjs`, `src/integration-check.mjs`: initial integration tooling. Later refinements live in repository source/history; rerunning the old generator may undo them.
- `integration-browser-results.json`, `check-integration.log`, videos and screenshots: historical evidence, not the current task's tests.
- `imagegen/REPORT.md`: separate concepts and limitations.

Approved single-SVG snapshot: repository commit `fb3a8fb`, `src/ui/loader.js` constant `MULASSA_SVG`, 8,204 characters before adding the standalone namespace. Matched to the supplied capture by geometry and final requested details. `assets/mulassa-approved-20261018.svg` only adds the SVG namespace for portable standalone rendering. Paired CSS is extracted from the same commit's `index.html`, not re-created from memory.

The supplied screenshot is preserved as `assets/approved-loader-reference.png`. Current source snapshots and new QA evidence live in `~/.t3/artifacts/mulassa-illustration-skill-20261019/`. No claim of redistribution rights over external photos is made: link those sources and keep research photos out of game output.

## Research versus tools used

The original report linked UAF, SLYNYRD motion cycles, Sprite-AI animation principles, Clip Studio principles, Rive/Lily, loading-state guides, Dribbble and an Aseprite forum. These were research/inspiration links. The C source is JavaScript-authored SVG/CSS, inspected/rendered in browsers. It was not drawn in Rive/Aseprite/Figma or generated by the raster tool. The source's early comment calling SVG transforms "compositor-friendly" was contradicted by the later Safari experiment; preserve the correction, not that assumption.

[Asset SHA-256 manifest](source-hashes.json) records the preserved snapshots and static derivatives at completion.
