# Drac review, 2026-10-19

The owner accepted the relative-height rule: "Sí, alçada real i silueta estilitzada". He then rejected the first integrated manual Drac drawing: "no m'agrada, vull que facis 4 propostes diferents potser ajudant-te de imagegen de codex i despres el fem en svg, però queda raro el drac". A passing SVG audit or project test suite is not artistic acceptance. Keep those two decisions separate.

Four new raster concepts were produced with the official Codex imagegen tool, using the approved Mulassa capture as the style reference and the two UAF Drac photos documented in scale-and-drac.md as anatomy references. A explores profile, B frontal heads, C three-quarter sculpture proportions, D a more open silhouette. These are candidates for a later manual SVG reconstruction, not a change to the loader's historical pipeline and not new approved assets.

The model did not fully follow the restrained flat-fill/detail instructions. A appeared to have a coloured halo in the tool's image display, so a follow-up edit was tried, but the original PNG subsequently composed cleanly on the browser comparison's brown background. Inspect actual alpha compositing before diagnosing a background defect from that tool display alone. The comparison keeps the original A. C includes small mouth firing tubes from the real photos, which need a deliberate choice or omission when simplifying. Generated detail and gradients must be simplified to the approved vector grammar after a design is chosen. Do not claim raster concepts are production SVGs or validated at selector size.

Artifacts and exact prompts: `~/.t3/artifacts/mulassa-illustration-skill-20261019/propostes-v2/`. The real-height ratio remains 1.90/2.95; choices about heads and silhouette do not reopen that accepted rule.

## A selected, with a request to verify the real chest

The owner selected A, while asking to revisit the Desktop inventory and photographs because the front piece should be brown. This is a conditional artistic direction, not approval of every generated detail.

The Desktop `INVENTARI.md` explicitly excludes a new Drac dossier because it had already been researched. Its `00-comu/METODE-MULASSA-DRAC.md` points to the earlier research and warns against inferring identity from one angle. The existing `Drac/revisio-2026-10-18/motion-024.jpg` contact sheet shows the real figure in daylight at 24–35.5 seconds. The UAF's first and third full-size photographs show a carved brown chest plaque, a dark grille inside a lozenge frame, and earthy lighter relief. The earlier `src/figures/drac/drac.js` comments already recorded this observation; use the photographs as evidence, not the voxel geometry as a measurement.

Correct A's bright red/gold chest badge to brown, with a dark grille and restrained warm brown relief. Its cream/red frilled neck collars are not supported by the photographs: omit them, retaining the green throat edge and red mouth. Daylight video shows cream-gold wing membrane with rust-coloured ribs, not A's plain dark wing. Eyes have a red rim, pale white, blue iris and ochre centre. Fine hue values and simplification remain artistic choices.

The new `assets/drac-valls-A.svg` uses hand-authored paths, flat fills and local strokes. It keeps A's raised rear head, lower forward head, rounded shell, curled tail and two human legs. The master retains the existing 160×112 viewBox, highest point y4, and sole baseline y104, so the selector's established height scaling and ground offset need no CSS/layout edits. The old first SVG remains archived as rejected. The new SVG is integrated locally only into Drac's selector card; HUD, loader and pixel assets are untouched.

UAF photographs inspected for this correction:
- https://uaf.cat/wp-content/uploads/2017/05/El-Drac-de-Valls-Uni%C3%B3-Anelles-de-la-Flama-1.jpg
- https://uaf.cat/wp-content/uploads/2017/05/El-Drac-de-Valls-Uni%C3%B3-Anelles-de-la-Flama-3.jpg

Artifacts for this pass: `~/.t3/artifacts/mulassa-illustration-skill-20261019/proposta-A-svg/`. Record current validation there; the previous example's passing tests do not establish the new drawing's visual acceptance.

## Latest decision: manual A reconstruction rejected

The owner explicitly rejected the integrated manual SVG: the owner likes A, not the reconstructed drawing. The simplified SVG changed the heads, snouts, expression, body, wings and tail too far. It must be ignored as a design reference. Its passing technical checks are historical only; they do not make the artwork usable or accepted.

Return to `propostes-v2/A.png`, the actual selected raster. Preserve its silhouettes, proportions, face construction, ornamentation and pose. The next localized edit uses official imagegen on that original, changing only the chest plaque to brown with a dark grille. It deliberately leaves collars and wings as in A, pending a separate artistic decision; the earlier instruction to change those at the same time must not override the owner's request to preserve A.

The latest edit and exact prompt are in `~/.t3/artifacts/mulassa-illustration-skill-20261019/A-pit-marro/`. It is a raster review asset, not a new integrated SVG. A future vector conversion must reproduce the selected image rather than redraw a different character from memory or basic shapes. Show source and vector at identical bounds before integration. Do not label a vector as faithful based only on matching the overall pose or passing its XML audit.

## Brown-chest A selected; localized photo corrections requested

The owner then selected the clean brown-chest A and explicitly requested another photo review, especially the brown wings, without changing the existing figure much. This supersedes the earlier chest-only edit restriction. The accepted edit target is `A-pit-marro/Drac-A-pit-marro-transparent.png`; the rejected manual SVG is not an input.

The UAF close frontal photograph `El-Drac-de-Valls-Uni%C3%B3-Anelles-de-la-Flama-3.jpg` and the existing daylight `motion-036.jpg` contact sheet (36–47.5 s of https://www.youtube.com/watch?v=pm-lEViiPK0) were visually inspected. Observed: ochre/cream wing membranes with rust-brown curved ribs and perimeter; green sculpted nostril rims with dark holes; blue irises around ochre centres; red mouths with green throat edging, not A's cream/red decorative collars. The body's red/gold spots, green ribs, brown chest grille and patterned carrier trousers are supported. Exact colour values, pattern simplification, friendly expression and the stylized silhouette remain artistic adaptations. Do not claim an exact sculptural replica. The UAF text page timed out on this pass; no new factual measurements were inferred.

Official built-in imagegen edited that raster directly using those two photographic references. Changes were restricted to wing colours/pattern, nostril colour, iris colours, and removal of false neck collars. Pose, head construction, tail, body, feet and brown chest were retained visually. This is a raster edit, not manual vectorization. The result is `A-referencia-real/Drac-A-referencia-real.png`; the exact prompt and before/after HTML are alongside it under `~/.t3/artifacts/mulassa-illustration-skill-20261019/`.

The browser comparison composites the new alpha cleanly on brown. Raw tool image display again shows coloured surrounding light that is absent from the browser composite; do not regenerate solely because of that display. This corrected raster awaits the owner's visual assessment. It has not replaced the rejected SVG still present in the local selector. Existing technical game checks do not validate this new raster or establish its approval. The accepted relative height 1.90/2.95 remains unchanged.

## Corrected A approved and faithfully traced

The owner accepted that exact corrected raster: "Sí, passa aquesta A a SVG conservant-la". It is now the fixed design source, archived as `assets/drac-A-approved.png`. The local selector's rejected manual reconstruction has been replaced by the VTracer/SVGO conversion `assets/drac-valls-A-traced.svg`. See [Faithful tracing](faithful-tracing.md) for the reproducible process, measured correspondence, retained limitations, coordinates and verification. The owner subsequently approved this final SVG, its local selector card and closure of the Drac: "Sí, dono per tancat el Drac" (2026-10-19). The 64.4% relative-height criterion was already approved. Both old manual SVGs remain rejected. This closes artistic review and local integration, without authorizing publication.
