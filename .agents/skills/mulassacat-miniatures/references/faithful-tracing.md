# Faithful conversion of the accepted Drac A

## Decision and provenance

The owner accepted `A-referencia-real/Drac-A-referencia-real.png`: "Sí, passa aquesta A a SVG conservant-la". This fixes the raster design for conversion. It does not authorize another anatomical redesign. Earlier manual SVG reconstructions were rejected because they changed the character despite retaining the broad pose.

The accepted PNG is preserved as `assets/drac-A-approved.png`. Official imagegen created and locally corrected this raster, using the UAF photographs and daylight video described in `drac-proposal-review.md`. The original Mulassa remains manually constructed SVG; this new Drac workflow must not be attributed retrospectively to the Mulassa.

The conversion uses VTracer Python package 0.6.15 (its embedded SVG generator identifies engine 0.6.12) and SVGO 4.0.0. It outputs actual editable path geometry, without a PNG embedded in SVG, external images, animation or scripts. Primary tool reference: https://github.com/visioncortex/vtracer. The Python API in this installed version uses `layer_difference`; do not copy newer CLI flags into it without verifying the installed API.

## Reproduce the trace

Run from any directory, using the personal skill path as appropriate:

```sh
uv run --with pillow --with vtracer==0.6.15 python \
  .agents/skills/mulassacat-miniatures/scripts/trace_approved_raster.py \
  .agents/skills/mulassacat-miniatures/assets/drac-A-approved.png \
  /absolute/output/drac-native.svg
```

Inspect that native SVG in a browser. Measure `svg.getBBox()` at its native coordinates. For this exact approved source the optimized bounds are x160.97000122070312, y55.09283447265625, width1305.4102783203125, height921.9072265625. Then repeat with:

```sh
uv run --with pillow --with vtracer==0.6.15 python \
  .agents/skills/mulassacat-miniatures/scripts/trace_approved_raster.py \
  .agents/skills/mulassacat-miniatures/assets/drac-A-approved.png \
  /absolute/output/drac-valls-A-traced.svg \
  --bounds 160.97000122070312 55.09283447265625 1305.4102783203125 921.9072265625
```

The script uses a disposable directory and pinned SVGO through npx, with no global installation. It preserves the input PNG. The caller decides where to retain the output; do not overwrite an unrelated existing master.

## Alpha, palette and path decisions actually tested

The PNG contains invisible RGB around the subject and faint nonzero alpha at edges. Directly tracing it produced black speckles and unwanted shapes: VTracer does not preserve that alpha appearance. The temporary tracing input thresholds alpha at 128; RGB inside the silhouette stays unchanged. This is deterministic preparation for vectorization, not a new raster design. SVG supplies new edge antialiasing. Never judge transparency from the raw tool image display alone: inspect composition over the intended background.

Initial direct traces had 1535/1710 paths and background artifacts. After alpha preparation, precision6/layer difference24/speckle4 produced 440 paths; precision7/difference16 produced 1083 paths without a useful improvement at selector size. The chosen trace retains small colour differences in the chest and wings rather than manually flattening them into a different design. SVGO reduced the initial 252432-byte trace to about134KB. The master is134499bytes; the inline SVG is134509bytes,49091bytes gzip measured locally. This is larger than the rejected hand drawing. No claim that tracing is inherently cheaper or suitable for every figure is implied.

Paths use stacked painter order, not semantic head/wing/body groups. Editing an arbitrary early path can affect later overlaps; preserve order. Shapes are editable vector contours, but this is not a hand-layered anatomical master. Future simplification must pass the same source-overlay check and must preserve the approved face, pose and silhouette.

## Coordinates and scale

The 160x112 output wraps all contours in one uniform transform. Native bounds are centred at x80, top becomes y4 and the soles become y104. Painted normalized bounds measured in Chromium: x9.20056, y4.00000, width141.59888, height100.00001. Eight units remain below the sole baseline. No independent width/height fit is applied.

Existing selector CSS computes occupied Drac height as the pixel Mulassa's occupied11.02cells times1.90/2.95. It compensates the Drac's bottom8units against the Mulassa's bottom.98cell margin. That CSS was not changed in this pass. The external vector comparison uses the static Mulassa with its shadow omitted from the measurement only: body bounds x33,y1,width156.53334,height147, sole baseline148. A shadow is not physical height or a foot baseline. No loader CSS stretch or running transform is added to either portrait.

## Evidence and limits

Artifacts: `~/.t3/artifacts/mulassa-illustration-skill-20261019/A-svg-fidel/`. `comparativa.html` includes an interactive original/SVG overlay, common-height comparison, and previous/new selector captures. The native-frame optimized trace and normalized master contain the same contours, with only a uniform framing transform changed.

At1536x1024 the binary alpha silhouette intersection-over-union is0.99067; mean channel error over the union, composited on brown, is5.39/255. At small sizes the metric changes with edge rasterization; it is evidence, not a guarantee of artistic identity. Side-by-side visual review checked face construction, eyes, teeth, necks, wing, brown plaque, tail and trouser legs. Small texture, colour-quantization and edge differences remain. Do not call it pixel-identical. The owner subsequently approved the final SVG and its local selector card explicitly: "Sí, dono per tancat el Drac" (2026-10-19). This is separate confirmation of the converted result, beyond the earlier raster approval.

Game checks cover selected/pending states at375x667,393x852,852x393,1280x800. Measured height ratios.64399–.64406 and baseline deltas below.007px; the art stays inside its panel and the Drac name/entity stay complete. No SVG animations, page console errors or failed requests were observed. Arrow navigation, focus-visible, difficulty and Escape worked. These are Chromium desktop/fine-pointer layout checks, not touch, Safari or physical-device validation. See `validation.json` and current check logs for the test-suite result; an initial run was blocked by a concurrent selector module exceeding600lines.

Only `src/figures/drac/drac-portrait.js` changed in this implementation pass. Its inline SVG is regenerated from this master, removing standalone role/label and adding the existing decorative class/aria-hidden. The card supplies the accessible name. Other figure portraits, HUD/pixel sources, loader, CSS layout, audio and catalogue behavior stay outside this change.
