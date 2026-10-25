---
name: mulassacat-miniatures
description: "Mulassa project only. Draw and review a festive figure's thumbnails: the selector's flat vector portrait (in the approved Mulassa loader's style), the small pixel portrait (HUD, photo mode, help, board) and the pending figures' silhouettes. Use for a new figure's art, a portrait the owner wants redone, or a review round against real photos. Not for voxel models or a new visual style."
---

# Figure thumbnails

Apply only to Mulassa and its checkouts. For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phase 7 (thumbnails). The sections below the review loop are the original vector-portrait method, still current.

## Which picture goes where

| Picture | Where it shows | Owner |
| --- | --- | --- |
| Vector portrait | selector cards (big) | `src/figures/<figure>/*-portrait.js` (one per playable figure), gathered by `src/ui/selector-portraits.js` (`SELECTOR_PORTRAITS`); SVG masters in `assets/` |
| Pixel portrait | HUD top bar, photo mode, help, boards, small cards | `src/game/figure-portraits.js` (native pixel cells and palettes, drawn by `pixelSvg`) |
| Silhouette | pending ("Aviat a la plaça") figures | `src/ui/pending-silhouettes.js` |

Big cards use the vector portrait; pixel art only where the picture is small.

## Review loop with the owner

1. Gather real photos of each figure (the colla's, the association's, video frames). When photos are few or show another figure (the Turba's Bou, a later Àliga), find more, extracting frames from YouTube if needed.
2. Build one HTML page: for every figure, its real photos beside the current thumbnail. The owner marks each one as JSON, `{ "<figure-id>": { "mark": "refer", "note": "…" } }`, and returns it; redo only the marked ones.
3. Figures already approved are not touched. If a redo is liked less than the previous version, restore the previous one.
4. Family variants share a shape and change colours and particulars (all the eagles from one base).
5. Check your own drawing critically before showing it: the owner rejected portraits with misplaced vectors, poor horns or mouths. Do not hand over a drawing you would not approve.

## What the owner expects of a vector portrait

- The Mulassa's and the Drac's style: head turned to the side, flat colour planes, sparse inner lines, no thick global outline.
- The town's escut and its crown placed and sized as on the Mulassa's card.
- A thin, uniform stroke on silhouettes (the Bou's), never heavy; legs outlined too; arms attached to the body (check every figure, not only the one reported).
- Breathing room inside the card: art never touching the card's top or sides.
- Pixel and vector agree on the figure's colours (the Bou's green cloak in both).
- Small colour or detail edits keep the approved drawing's pose and orientation.
- Ship traced portraits light: the game inlines them in its main bundle. When path units are far below a screen pixel (a trace scaled down by a group transform), round them with `scripts/round_svg_paths.py`, which checks that no point moves more than half a unit, and compare the two renders at card size before replacing the string. Keep the unrounded SVG in `assets/` as the editable master.

Use the approved Mulassa as the drawing system. Preserve each subject's anatomy and costume; do not paste the Mulassa's decorations onto another beast. Start with `assets/approved-loader-reference.png` and the actual vector source.

## Evidence to read

- [Provenance](references/provenance.md): exact origin, decisions, discarded iterations and tools actually used.
- [Drawing system](references/drawing-system.md): layers, coordinates, palette, silhouette, animation versus static artwork.
- [Scale and Drac](references/scale-and-drac.md): primary sources, dimensions, anatomy and limitations of the worked example. Research each future beast separately.
- [Integration and QA](references/integration-qa.md): game contracts, reproducible checks and the current example's validation record.
- [Faithful raster tracing](references/faithful-tracing.md): the accepted Drac A, reproducible vector conversion, measured fidelity and integration. Use this route when the exact approved raster must survive conversion.
- [Current Mulassa still](references/mulassa-selector-still.md): extract the live HTML-layer loader without redrawing it, and share scale/ground with the approved Drac in the selector.

- [Drac ornament retouch](references/drac-ornaments.md): photo-referenced additions to the approved trace, with the original contours preserved.

## Workflow

1. Inspect the reference, live source and local diffs. Preserve concurrent edits. The approved source snapshot is reusable; the live loader may use a different technical structure.
2. Identify the exact figure and edition. Check its owning association's photos and dimensions. Separate verified facts, visible observations and artistic choices. A voxel model or thumbnail is not a measurement.
3. Run `scripts/static_mulassa.py` to extract the static reference. It keeps approved geometry and structural transforms, removing animation and effects. Do not freeze a random running frame and call it a standing portrait.
4. Draw editable paths in the same flat style: restrained colour planes, sparse internal lines, no global thick outline. Keep distinctive appendages legible at final size. Drac means two heads, separate ringed necks, patterned wings, curled tail and one carrier; no decorative fire or smoke. When the owner selects a raster concept, preserve its actual silhouettes, facial features, proportions and detail through vector conversion. Do not replace it with a new simplified drawing: the attempted manual reconstruction of A was explicitly rejected. See the latest decision in the Drac proposal review.
5. Define body bounds, ground baseline, real height, perspective and padding. Scale uniformly by documented height. Never independently fill each card to its maximum dimensions. Mark unknown measurements or artistic foreshortening explicitly; prepare a reviewable prototype when these block fidelity.
6. Compare at equal coordinate scale, then equal physical scale, then in actual cards. These are different checks. Do not deform the approved Mulassa to turn its cartoon silhouette into a technical elevation.
7. Integrate only requested selector cards. Preserve names, entity marks, states, focus and layout. Leave pixel portraits in HUD/photo/help intact. Isolate the illustration from pixel-grid sizing and `image-rendering: pixelated`.
8. Run `scripts/audit_svg.py`, inspect browser bounds and screenshots, then project checks. Record coverage and limits. Syntax validation does not establish anatomical fidelity or user acceptance.

## Assets

- `assets/mulassa-approved-20261018.svg` and `.css`: final single-SVG running/error source recovered from `fb3a8fb`, before the later HTML-layer adaptation.
- `assets/mulassa-proposal-C.svg`: historical first proposal. Its removed white cheek decoration and old step animation are not the final approved design.
- `assets/mulassa-static.svg`: reproducible rest-pose derivative. No separate historical approval is implied.
- `assets/mulassa-loader-20261019.html` and `assets/mulassa-selector-static.svg`: current layered loader snapshot and normalized static selector derivative, retaining the newer ears and gold bridle. Do not substitute the older archived head when the owner asks for the current animated Mulassa.
- `assets/drac-valls-static.svg`: first worked example, explicitly rejected by the owner on 2026-10-19. Retained as a technical example and discarded drawing; do not reuse it as approved art. See [Drac proposal review](references/drac-proposal-review.md).
- `assets/drac-valls-A.svg`: rejected manual reconstruction. The owner explicitly prefers the original raster A and rejected this altered silhouette and simplification; never treat this SVG as the accepted reference.
- `assets/drac-A-approved.png`: A with brown chest and localized photographic corrections, explicitly accepted by the owner for faithful vectorization on 2026-10-19.
- `assets/drac-valls-A-traced.svg`: vector trace of that accepted raster, normalized uniformly to top y4 and sole baseline y104. This replaces the rejected manual reconstruction in the local selector. The owner explicitly accepted the final SVG and local card on 2026-10-19: "Sí, dono per tancat el Drac". Preserve this approved drawing and the accepted 64.4% relative height.

- `assets/drac-valls-A-ornaments.svg`: approved current selector derivative with the tail, flank and neck details. The owner accepted the retouch on 2026-10-19: "Sí, dono el retoc per tancat". The original approved trace remains preserved; see the ornament reference for evidence and limits.

SVG is the editable master; raster exports are previews. Imagegen made separate exploratory concepts during the original research; it did not draw C. Do not attribute this pipeline to imagegen, Figma, Rive or a design skill just because research mentioned them.

This skill does not authorize publication or expand the roster. Follow the current task's delegation and approval rules. Memory writes are outside this workflow.
