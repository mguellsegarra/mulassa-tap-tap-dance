# Mulassa attendants: visual reference and model handoff

Research date: 2026-10-19. Scope: the adult Mulassa of Valls in the 2017, 2021 and
2023 recordings. This is a design brief, not implemented helper models or an
official dress regulation. Preserve the original Mulassa model and approved dance work.

## Main finding

The recurring group immediately around the figure wears pale blue / blue-grey
collared shirts, dark long trousers and broad waist sashes. Several wear traditional
espadrille-like footwear. This is the useful visual basis for the game's attendants.
Do not transfer the Drac's camouflage costume to them.

The group affiliation is a strong visual inference from matching clothing and its
direct interaction with the figure, especially before the 2021 dance. Individual
people's exact jobs (carrier, relief carrier, guide, organiser) are not established
from a shirt alone. No personal identities are needed for the models.

## Sources and inspected instants

Original file IDs, hashes and metadata are in `sources.json`. Times below are seconds
from the source file, not the beginning of the dance or the game's song.

| Source | Time | Useful evidence |
| --- | --- | --- |
| [El Camp Difusio, Santa Ursula 2017](https://www.youtube.com/watch?v=D53pgXOeIL0&t=1s) | 1 | Pale blue shirt, broad dark sash and dark trousers on a person at the left edge of the dance space. Sunlight washes out the shirt. Useful cross-year support, not the best costume close-up. |
| [arditproduccions, Santa Ursula 2021](https://www.youtube.com/watch?v=WzO1q5mdPes&t=12s) | 12, 19, 21 | Group gathers directly around the figure before dancing. Front/back shirt views, rolled sleeves, dark trousers, sash variations, neck cloths and footwear. Best full-body references. |
| [Same 2021 recording](https://www.youtube.com/watch?v=WzO1q5mdPes&t=30s) | 30, 60, 90 | Similarly dressed people sit, squat or kneel around the open dance area. A person at the left holds a long pole. Positions depend on the performance and camera; they do not establish a fixed compass arrangement. |
| [arditproduccions, Sant Joan 2023](https://www.youtube.com/watch?v=BaVEzBKbm4U&t=180s) | 180, 183 | Matching pale blue shirts and dark sashes/trousers flank the figure at the ending. Small red/dark chest embroidery and a red mark on some trouser fronts are visible, but not legible enough to redraw accurately. |

Primary institutional context:

- [UAF: La Mulassa](https://uaf.cat/seguici-ceremonial/mulassa/): four people carry
  the figure, two at the front and two at the rear. This refers to people UNDER it.
- [Agrupacio del Bestiari: Mulassa de Valls](https://www.bestiari.cat/figura/mulassa-de-valls/):
  its older entry lists four simultaneous carriers and four other carriers. That
  is not evidence for four exterior guides permanently stationed at N/W/S/E.
- [UAF gallery](https://uaf.cat/gallery/la-mulassa/) is an additional reference
  source to consult, not a substitute for the timestamped costume observations here.

Neither institutional text inspected defines a mandatory helper uniform or four
fixed guide stations. Do not state that either has been officially verified.

## Clothing specification

| Part | Observation and confidence | Modelling instruction |
| --- | --- | --- |
| Shirt | High: pale blue/blue-grey, collar and front opening; loose fit. Long sleeves are often rolled to elbow/forearm. | Simple collared shirt, modest torso volume, visible forearms on most variants. Avoid pure white as the default. |
| Trousers | High: long, very dark navy/near-black, fairly straight and loose. | Two clean trouser volumes. No camouflage, shorts or white trousers in the base uniform. |
| Sash | High: wide fabric band around the waist, commonly very dark. One 2021 sash looks dark green; another is conspicuously yellow with red/orange stripes. | Dark sash for the base model. Keep green and striped versions optional, not mandatory or rank-coded. |
| Neck cloth | Medium: some 2021 people have a pale yellow/cream triangular cloth with red motifs. Others have no clearly visible scarf. | Optional small triangle at the back/neck. Do not make every scarf solid red or invent an emblem. |
| Footwear | Medium/high: several 2021 feet show light rope-coloured soles and dark uppers/ties consistent with espardenyes. Other shoes vary. | Low, compact dark upper with muted beige sole. Simple ties if readable at the game's scale. Avoid oversized boots. |
| Insignia | Medium for presence, low for precise shape: red/dark chest detail in 2023; red mark on some trouser fronts. | Obtain a clearer reference before reproducing a logo. Omit or use a clearly labelled temporary mark in prototype only; never invent lettering. |
| Headwear/accessories | No uniform hat established. Some wear glasses or carry bags; 2021 includes masks. | Bare-headed base model, varied hair. Masks and bags are event/personal details, not required uniform components. |

Suggested initial voxel colours (artistic approximations, not sampled textile standards):
shirt `#A8B9C8`, shirt shadow `#8198AA`, trousers `#242936`, dark sash `#171E23`,
rope sole `#BCAA86`, optional scarf `#DEC887`, optional red accents `#A93B42`.
Adjust under the actual game lighting against the saved reference crops.

## Placement and behaviour

The owner approved fixed rehearsal marks: W is the opening-facing direction in the 2017
reference, E its opposite; the camera is separate. Use the shared mapping in
`tools/dev/bestiari-compare/directions.js` and `spatial-frame.json`.

Four standing attendants at those marks are a GAME ADAPTATION. Keep them outside
the figure's full travel/turn envelope, facing the dance, with small weight changes
and relaxed clapping. Do not use them as evidence for a newly invented cardinal
choreography. Do not make the compass rotate with the figure or follow the camera.

The 2021 recording supports additional similarly dressed people seated, kneeling
or squatting at the perimeter. A seated variant is therefore useful. Their exact
count and positions in the game are adaptation, not a source census. Keep clear
space for the dance and avoid making every person clap continuously in unison.

Separate role assets:

1. Exterior attendant: standing, watching, occasional clapping; blue shirt uniform.
2. Resting group member: same clothing, seated or squatting, hands on knees / clapping.
3. Interior carrier: hidden by the figure except lower trouser legs and shoes; do not
   add another four visible carriers beneath the already approved eight-foot rig.
4. Musicians: separate reference and instruments. White-shirt musicians or nearby
   castellers must not be automatically relabelled as Mulassa attendants.

A long pole is visible in the 2021 perimeter and 2023 ending. Its exact operational
role and assignment are unconfirmed; do not equip all four attendants with poles.

## Handoff checklist

- Build one shared low-cost voxel body with shirt, sash and trouser components;
  vary height, build, hair and pose without copying identifiable people.
- Make standing/clapping and seated/squatting variants. Keep limbs simple and
  grounded; avoid the exposed multi-joint silhouette rejected for the carriers.
- Compare front, side and back renders against the 2021 full-body frames and
  2023 upper-body frames before inserting them into the plaza.
- Check all four compass positions, camera visibility and the complete dance's
  swept space in the side-by-side prototype, then phone and desktop framing.
- Retain evidence labels. A second agent may implement this brief, but must not
  call the uniform a complete historical reconstruction or the four stations a
  verified traditional formation.
- Open details: precise embroidery, whether a scarf is formally prescribed,
  official sash variations, and the exact number/duties of exterior attendants.
  These do not block a clearly labelled first prototype using the observed base.

## Local evidence

Extracted reference images are outside Git and production assets:

`~/Desktop/Bestiari de Valls - I+D/Mulassa/revisio-2026-10-19/helpers-reference/`

Start with `uniform-board.jpg`, then inspect full-size `2021-012.jpg`,
`2021-019.jpg`, `2021-021.jpg`, `2021-030.jpg`, `2021-090.jpg`,
`2023-180.jpg`, `2023-183.jpg` and `2017-001.jpg`.
The board contains crops from arditproduccions; originals remain credited and
linked above. Frame extraction is for local reference, not new production artwork.
