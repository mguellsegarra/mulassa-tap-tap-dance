# Scale and the Drac worked example

## Verified measurements, accessed 2026-10-19

Primary owner/association sources:

| Figure | Height | Length | Width | Carriers | Source |
|---|---:|---:|---:|---:|---|
| Mulassa de Valls | 2.95 m | 4.60 m | 1.10 m | 4 | https://uaf.cat/seguici-ceremonial/mulassa/ |
| Drac de Valls (1985, two heads) | 1.90 m | 2.80 m | 1.50 m | 1 | https://uaf.cat/seguici-ceremonial/drac/ |

Height ratio = 1.90 / 2.95 = 0.6440677966. Length ratio = 2.80 / 4.60 = 0.6086956522. These ratios describe the published measurements, not a measurement taken from a voxel model. UAF does not specify the surveying method or whether the carrier is included in the quoted height; do not silently add an invented carrier height. The first illustration uses quoted overall heights as a consistent display convention. Revisit if the association provides a clearer measurement definition.

The game's previous `STAND` values were .8 for Mulassa and .7 for Drac, explicitly set by eye, with integer pixel rounding. They are not corroborating physical measurements. At 375×667 both old SVG envelopes were 70×60 px, despite these different values. Do not equalise the new artwork to these envelopes.

## Visual references actually inspected

- https://uaf.cat/wp-content/uploads/2017/05/El-Drac-de-Valls-Uni%C3%B3-Anelles-de-la-Flama-1.jpg
- https://uaf.cat/wp-content/uploads/2017/05/El-Drac-de-Valls-Uni%C3%B3-Anelles-de-la-Flama-2.jpg
- Existing local contact sheet `~/Desktop/Bestiari de Valls - I+D/Drac/revisio-2026-10-18/motion-024.jpg`, extracted previously from https://www.youtube.com/watch?v=pm-lEViiPK0, El Camp Difusió, Ball del Drac de Valls, 2018-06-24. Inspected front/side views at 24–35.5 s. No new video extraction or music edit was needed.

Observed identity: two large heads with long snouts, red lips/open mouths and off-white teeth; white bulging eyes with coloured irises; brow/ear ridges; long separately visible ringed necks; rounded green body, circular red/gold flank ornaments, red/brown chest crest, green curled tail with pointed dorsal marks; batlike rust/gold ribbed wings; two human legs below the shell, patterned light-green/cream trousers. UAF confirms the two heads and one carrier. Fine colours and arrangement are visual observations rather than dimension facts.

The video wings show their warm patterned inner side, whereas the official frontal fire photograph mainly shows dark backs. The first portrait uses the patterned side for clarity. Its exact colour values, ornament count, neck/head offsets and degree of profile are artistic adaptations. Seventeen firing points are a real property, but portraying seventeen tiny tubes is not required for a static selector silhouette; fire, smoke and pyrotechnic effects are omitted.

## Common coordinate scale

Use body height excluding soft cast shadow. If character baseline is B and crown is T, drawn height H = B − T. Given physical height h, unit scale k = target pixels per metre × h / H. Use the same pixels-per-metre for every figure. Include the same physical ground line; do not align SVG box bottoms when their padding differs.

For the extracted Mulassa, top ear y1, baseline y148, H147. For the Drac prototype, highest far-head point y4, planted soles at y104, H100. Both have a little stroke/shadow below the baseline. Their native root boxes are 220×168 and 160×112. Thus the Drac's uniform group scale relative to the original Mulassa coordinate system is `(1.9 / 2.95) * 147 / 100 = 0.9467796610`. Translate it so `104*k` lands at the same baseline as Mulassa y148.

Common example: 50 px/m, Mulassa147.5 px high, Drac95 px high. The SVG element heights differ from the silhouette heights: Mulassa168*147.5/147, Drac112*95/100. Baseline offset below the SVG is 20*147.5/147 versus8*95/100. Compensate for that padding in the comparison.

## What cannot be claimed

The approved Mulassa is a cartoon with compressed body length. Its rest silhouette is roughly156 units wide over147 high, not the measured length/height ratio4.60/2.95. There is no hidden nonuniform stretch in the loader that turns it into an orthographic side elevation. Do not stretch its red body or squash its height to make two physical dimensions match: that would redesign the approved art.

Therefore this family uses documented relative HEIGHT while preserving the approved stylisation. Physical length/width remain in the evidence table; the illustration is not a metrically accurate plan. Drac also uses a slightly oblique view to expose two heads and both wings, so visible width is not a direct length measurement. This artistic convention must be shown in the review, not hidden behind a claim of "exact real proportions".

## Selector-only bridge while Mulassa stays pixel art

The current request changes only Drac's card. Its neighbouring Mulassa remains the existing pixel portrait; the static vector Mulassa is shown in the external comparison, not silently installed in the game.

The pixel Mulassa's occupied silhouette including its one-cell rim spans11.02 cells vertically, ending .98 cells above its12-cell viewBox bottom. Reuse the Mulassa's own cell-sizing formula in the Drac rule (14×12 envelope, stand .8). New Drac character height = `11.02 * mulassaCell * 1.9/2.95`; SVG height adds its112/100 padding factor. Position its baseline at the same `.98 * mulassaCell` offset from the card floor. This retains the documented ratio even when integer pixel rounding changes the Mulassa's size across breakpoints. It deliberately does not modify global STAND, pixel art or layout.

When more vector figures are explicitly requested, replace this temporary bridge with a shared physical-scale field or common metric canvas for that requested set. Do not generalise the Mulassa pixel formula to all future beasts. Document unknown heights and request a concrete provisional scale rather than inventing measurements.

## Current user decision

On 2026-10-19 the owner answered the prototype question: "Sí, alçada real i silueta estilitzada". This explicitly accepts the height-based scale convention and common ground without stretching the approved Mulassa. It is not blanket acceptance of every artistic detail of the new Drac.
