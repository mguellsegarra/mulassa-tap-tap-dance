# Static Mulassa from the current animated loader

The owner requested the animated Mulassa as a still in its own selector card, at the correct proportion beside the approved Drac. This authorizes the Mulassa card, not replacement of pixel portraits in HUD, help, photo mode or the rest of the roster.

## Use the current source

At inspection on 2026-10-19, `src/ui/loader.js` had a newer head than the archived 2026-10-18 SVG: taller ears with native y=-2.2, a restrained gold bridle and small red fittings, and a narrow tongue shape. The live figure is an ordered composition of SVGs inside animated HTML wrappers. The standalone old `mulassa-static.svg` is a historical derivative and does not contain these updates.

The exact `MULASSA_SVG` literal was captured in `assets/mulassa-loader-20261019.html`. Its layers all use the same 220x168 coordinates. `scripts/static_mulassa.py` now accepts that HTML wrapper as well as the historical single SVG. It flattens div/svg wrappers in paint order and retains geometric transforms such as leg translations. It excludes road, dust, sweat, clac and sad/tear groups before flattening. It strips CSS classes/styles and preserves fills, paths, strokes, local groups and structural translations. No imagegen, tracing or new drawing was needed for this Mulassa.

For a selector use `--portrait` to omit the cast shadow. Feet define the ground baseline; a shadow must not be included in physical height. The rest pose has planted carrier feet and neutral head/tail, without copying CSS running poses or animation delays. The live loader and its animations are not edited.

## Reproduction and normalization

```sh
python3 .agents/skills/mulassacat-miniatures/scripts/static_mulassa.py \
  --source .agents/skills/mulassacat-miniatures/assets/mulassa-loader-20261019.html \
  --output /absolute/output/mulassa-native.svg --portrait
```

Inspect the native SVG and measure its body bounds in the browser. This snapshot has x33, y-2.2, width156.53334045410156, height150.2 and sole baseline148. The negative ear coordinate is valid in the source; do not clip it by retaining a zero-origin frame without padding.

```sh
python3 .agents/skills/mulassacat-miniatures/scripts/static_mulassa.py \
  --source .agents/skills/mulassacat-miniatures/assets/mulassa-loader-20261019.html \
  --output /absolute/output/mulassa-selector-static.svg --portrait \
  --bounds 33 -2.2 156.53334045410156 150.2
```

One uniform transform centres the figure at x80 and maps body top to y4 and the sole baseline to y104 within 160x112. The normalized body width is104.2166, height100. The drawing's stylized length stays intact. Do not stretch the body to fill the width left by a pixel portrait. Stroke extents were visually checked within the padding. The export has96nodes and6152bytes, no scripts, animations, filters or raster image dependencies.

## Selector integration

`src/ui/selector-portraits.js` owns the selector-only map, importing each playable figure's approved portrait from its own folder (`src/figures/mulassa/mula-portrait.js` holds the compact static Mulassa literal). `stripHtml` uses `SELECTOR_PORTRAITS[f.id] || portraitHtml(f)`. The existing `portraitHtml` function remains the pixel/thumbnail implementation for other consumers. The map replaces the old Drac-only ternary without adding responsibilities or lines to the nearly600-line selector controller.

CSS applies to `.sel-mulassa-illustration` and `.sel-drac-illustration`. Both masters share the same normalized frame. The previous Mulassa footprint remains the reference: occupied height11.02cells and bottom margin.98cell. Mulassa has scale1, Drac1.90/2.95. `--portrait-height` controls both width and height uniformly and adjusts bottom padding against the shared baseline. This preserves the approved Drac's screen size. The fallback also uses the shared ratio rather than unrelated percentage heights. Names, UAF logos, selected state, focus, caption height and selector layout are unchanged.

The Drac master and its existing source module remain byte-identical to their starting snapshots. Source/inline XML parity and preservation of all native Mulassa shapes through normalization were checked. Re-exporting the historical single SVG with the updated script still produces its previous result. Eight music files remain bit-identical.

## Visual and behavioral evidence

Artifacts: `~/.t3/artifacts/mulassa-illustration-skill-20261019/Mulassa-still/`. The before capture was taken from the live selector before editing; it is not a reversal of new CSS. `comparativa.html` shows before/after cards and both vector figures at the common scale.

Chromium fine-pointer layout checks at375x667,393x852,852x393,1280x800 show complete ears, feet, names and entity marks. Measured Drac/Mulassa ratios are.644006–.644123; baseline difference is below.004px. Both illustrations have zero active animations. Arrow navigation, focus-visible, difficulty entry and Escape work; pending Aliga retains its disabled action on fine-pointer layouts. Pending screenshots cover375x667 and1280x800. No console errors or failed requests were observed. This is not Safari/touch/physical-device verification.

Static SVG audit, module graph, skill-creator validation and the full `npm run check` pass (exit0) for this integration. The suite ran after the changes, once the other full run in this worktree had finished. See `validation.json` and `check.log`; do not reuse an old Drac-only pass as evidence for this integration. No publication, Git history changes, memory writes or other-thread messages are part of this work.

## Desktop card sizing follow-up (2026-10-19)

The owner found the tall desktop cards empty and asked for squarer cards and larger figures. The local CSS now uses 220px card widths from 900x661, and 248x248px cards on the large-desktop breakpoint (at least1100x900), with the dock reduced from396 to360px. Small/short viewports retain the preceding sizing rules.

At the desktop breakpoint, the shared Mulassa reference height is `min(100cqh - 16px, 100cqw / 1.6)`. Multiply it by1 for Mulassa and1.9/2.95 for Drac. Width and height retain160/100 and112/100 of body height. Bottom margin is `8px - bodyHeight * .08`, compensating each SVG's bottom padding so feet share a baseline. The16px allowance keeps the root SVG plus margin inside the grid track; a12px trial overflowed the Mulassa's intrinsic grid track and displaced its baseline by2px, so it was discarded.

Measured at1920x1080: cards184x284→248x248, Mulassa body99.177→145.996px, Drac63.874→94.029px; body top gap95→13px for Mulassa. At1280x800 cards176x212→220x212, body99.177→115.995px. Baselines differ by at most.014px in checked desktop sizes. Both approved drawings remain unchanged. This is the implemented local layout requested by the owner, not an additional explicit artistic approval.

Evidence: `desktop-card-layout/` under the same artifact root. Ten Chromium fine-pointer viewport checks, pending cards, full captions, selected ring and keyboard focus/difficulty/Escape; `npm run check` exits0. Resized phone viewports do not establish real touch/Safari validation. At320x568 the existing compact layout hides portraits entirely; hidden SVG bounds are not treated as visible clipping. Two native preview clicks on the animated difficulty button timed out; keyboard activation and Escape passed. No interaction handler was changed.
