# Drawing system and static conversion

## Identity before technique

The approved family is flat, softly shaped vector illustration with a restrained palette and separated moving body parts. It is not the thick-outline chibi D, shaded/gradient E, voxel A, pixel B or generated raster concept. Preserve the real beast's visible identity while using C's visual grammar.

For Mulassa the identity is: long brown neck and mule muzzle, two upright ears, bridle in red, white eye with dark pupil, red caparison, green rectangular blanket edged in gold, small city emblem, gold necklace and fringe, striped tail ornament, eight human carrier legs. The resting source retains those forms. Do not turn the carrier feet into animal hooves.

## Coordinates and transforms

Original C used viewBox `0 0 200 160`; approved running integration uses `0 0 220 168`. The extra envelope makes room for movement. Never infer physical dimensions from viewBox width/height.

Approved geometry landmarks (SVG units, before CSS motion):

| Element | Geometry / anchor |
|---|---|
| Main red body | x40 y66, 118×52, corner radius 7 |
| Dark body underside | y103–118 |
| Green blanket | x76 y61, 52×45, radius 3, gold stroke 2.5 |
| Fringe bar | x38 y116, 122×5; tassels around y123.5 |
| Neck root / pivot | 148,72 |
| Face circle | centre158,26, radius11 |
| Nose | around178–189, y29–42 |
| Visible eye | centre160,24.5, radius4.2; pupil162,25 radius2.2 |
| Front/back leg hip positions | x53,65,128,140 / x60,70,136,146; y113 |
| Knee offset | translate(0,16), within each leg |
| Shoes/ground baseline | shoe geometry reaches about y148; sole stroke extends beyond it |
| Road | x8 y144, 202×18; first line at local y4 |
| Shadow | centre100,147, radii72 and4.5 |

The nested leg `translate(...)` attributes are structural. Deleting every transform collapses all legs to the origin. CSS transforms provide the animation and should be omitted for rest. In the current HTML-layer version all SVGs use the same box; HTML layer origins are percentages (e.g. 148/220, 72/168). A percentage origin from this wrapper cannot be pasted into a cropped standalone portrait without conversion.

No `preserveAspectRatio="none"` occurs in the approved source. The CSS `.ml-fig` now fits a 220/168 box to the spinner, using `min(100cqw,130.952cqh)`. The funny forward lean, bent knees and swept tail in the supplied screenshot are animation poses, not anatomical proportions. Squash/stretch on dust is not a body deformation to preserve in a still. Do not stretch x/y independently to fill a card.

## Palette and mark-making

| Role in Mulassa | Value |
|---|---|
| Red velvet | #a3182f |
| Velvet shadow / seam highlight | #7c1024 / #c43752 |
| Green blanket | #1f5c33 |
| Gold trim | #d9a521 |
| Brown hide / deeper neck | #7a4a2b / #4e2e1a |
| Muzzle / ear inset | #5d3a24 / #b07a5a |
| Eye, teeth, socks | #f4efe4 |
| Pupil / tiny emblem outline | #2a1a10 |
| Near trousers / far trousers | #51454e / #36303a |
| Near socks / far socks | #f4efe4 / #aaa18d |
| Shoes | #241b1c |
| Tail ribbon | #ffb3c7 |
| Ground | #866846 and #a78355, reduced opacity |
| Dust | #9b7951, sparse #c6a16b highlight |

Colours for another figure must come from that figure. Drac green is not the blanket green by obligation. The shared rules are flat fills, a darker occluded plane, a modest highlight, warm off-white, and sparing strokes. Background colour is not baked into the SVG.

No global black outline. Most silhouettes are defined by adjacent colour fields. Strokes are local: neck depth 4 units, bridle2.8, blanket2.5, necklace2.4 rounded dots, body highlight2, teeth1.4. A tiny .8 outline stabilises the emblem. Use round caps and restrained joins. The ground/shadow is quiet; do not let it become a white underline or a decorative badge.

The body is a rounded rectangle plus underside path; the face combines a circle and tapered muzzle paths; ears, tail and jaw are small curves. Do not trace every photographic scale. Reproduce silhouette and a few identity-bearing marks before adding surface ornament. At 35–60 screen pixels tall, inspect whether two heads still separate; details below a screen pixel may merge and should not carry identity alone.

## Layer order

1. Ground/motion FX and soft oval shadow, when appropriate.
2. Far carrier legs, then near carrier legs; shadows distinguish depth without outlines.
3. Tail behind body.
4. Neck/head behind the front chest cloth. Far ear behind face, jaw/mouth behind muzzle, front ear/bridle/eye above face.
5. Red body and dark underside hide hip roots.
6. Blanket, city emblem, necklace, gold fringe cover the garment.

For Drac use the analogous depth logic, not the same costume: carrier, far wing/neck/head, tail, body, near wing/neck/head, sparse surface pattern. Both heads need an unobstructed eye, muzzle and mouth silhouette. Avoid a second face that reads as two eyes on a single head.

## Animation is a separate product concern

Approved fast-run cycle: stride/knee .48 s, body bob/nod .24 s, tail/neck/jaw .48 s, ground .32 s, two dust puffs offset .24 s, sweat .96 s, clac1.92 s. Error variant: planted feet, breathing/sigh3.2 s, tears2.8 s offset1.4 s. These values describe the snapshot; do not add them to selector portraits.

`static_mulassa.py` removes road, dust, sweat, clac, sad face/tears, CSS classes and styles. It keeps geometric translations and the subtle shadow. Pose has flat feet, neutral neck/ears and resting tail. It is not the image captured at animation t=0: negative animation delays would already bend some limbs. The script produces a new static derivative and does not edit the game loader.

For export use an explicit namespace, numeric viewBox and `xMidYMid meet`. Keep padding around strokes, horns, ears, tail and feet. Set SVG `role=img` and a Catalan accessible label when standalone. When embedded in a card already labelled by figure/entity/town, set `aria-hidden=true` and remove the duplicate role/label. No script, SMIL, filters, remote images or CSS dependency is needed for these masters.

For bounds, distinguish character geometry from cast shadow. Query the transformed path union, include half stroke widths, and record the intended foot-contact line. Compare against the SVG viewport and card content box. A browser screenshot is still required: a mathematical bounding box alone misses visual crowding and collapsed features.
