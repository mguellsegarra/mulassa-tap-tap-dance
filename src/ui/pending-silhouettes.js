// Hand-drawn silhouettes for every pending figure, in each figure's pixel viewBox ×10 (so the selector keeps its size:
// STAND and whole-cell sizing are untouched). Cell rows span y 10 to the ground (y 150; y 130 for the 12-row grids).
// From the figures' own photos: the Valls figures (uaf.cat) but the Basilisc, Àliga and Cucafera de
// Tarragona, Mulassa de Reus, Gegants Bojos, Mulasses de Vilanova, Drac de Vilanova, Àliga de Barcelona, Gegants d'Olot,
// Drac de Vilafranca (a historic drawing). The Basilisc, the Solsona Corpus figures, the Draca and the
// Guites had no usable photo in their sources: drawn from the pixel portraits' shapes and notes.
// Every shape of a figure overlaps the next (parts: how many separate figures a card shows); tests/silhouettes.mjs
// rasterises them and fails on any gap, which would show the halo as a seam.
const oval = (cx, cy, rx, ry = rx) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
// a ring (a looped tail): the inner circle runs the other way, so it stays open under nonzero fill
const ring = (cx, cy, R, r) => `M${cx - R} ${cy}a${R} ${R} 0 1 1 ${2 * R} 0a${R} ${R} 0 1 1 ${-2 * R} 0ZM${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
// a carrier's leg and shoe, like the Mulassa's (rounded trouser, shoe pointing to `dir`), standing on `g`; both run
// clockwise, or their overlap would cancel into a see-through line under nonzero fill
const carrierLeg = (x, top, dir = -1, w = 7, g = 150) => `M${x - w / 2} ${top}h${w}V${g - 4}h${-w}Z` + (dir < 0
  ? `M${x + w / 2 + 1} ${g - 4.5}V${g}H${x - w / 2 - 6}q-2.5 0-1.5-2.5l2-2Z` : `M${x - w / 2 - 1} ${g - 4.5}H${x + w / 2 + 4}l2 2q1 2.5-1.5 2.5H${x - w / 2 - 1}Z`);
// The Valls eagle's shape, shared by the eagles whose pixel portraits reuse it (Tarragona, Solsona, Barcelona).
const EAGLE = [
  oval(97, 96, 44, 24),
  'M66 88Q52 70 50 52L60 44Q70 64 84 78Z', // neck
  oval(52, 44, 14, 13),
  'M40 38Q26 36 20 44Q17 50 22 56Q24 50 30 49Q36 50 40 52Z', // hooked beak
  'M41 35L39 17L46 25L52 13L58 25L65 17L63 35Z', // crown
  // raised wing: from the shoulder up to five rounded feather tips
  'M96 84Q92 58 104 34Q110 20 118 14Q123 12 123 18L121 30Q127 14 134 10Q140 9 139 16L135 30Q143 16 151 14Q157 14 155 21L149 34Q159 24 166 25Q171 27 167 33L150 52Q170 46 176 50Q178 55 172 58L140 74Q122 88 106 94Z',
  // back wing: lower, spread to the right
  'M120 92Q150 80 182 84Q188 86 184 91L172 95Q186 96 186 101Q184 106 176 105L160 104Q170 110 166 114Q160 116 150 111L126 104Z',
  'M132 106Q150 112 158 124Q158 128 152 127Q142 120 128 116Z', // tail
];
const DANCED_EAGLE = [...EAGLE, 'M80 112Q96 124 114 112L117 128Q98 134 78 128Z', carrierLeg(90, 126), carrierLeg(106, 126)]; // skirt and dancer's legs

export const SILHOUETTE_DRAWINGS = {
  // Profile to the left like the pixel portrait: crowned head and hooked beak, round body, one wing raised as a fan,
  // the other spread back, short tail; the dancer's skirt and legs underneath.
  'aliga-valls': { vb: [20, 16], d: DANCED_EAGLE },
  // The upright bear (round ears, snout to the left, arms forward) and a smaller trabucaire holding his trabuc.
  'os-trabucaires-valls': { vb: [20, 16], parts: 2, d: [
    oval(40, 22, 9), oval(80, 22, 9), // ears
    oval(60, 40, 26, 24),
    'M40 46Q26 48 22 56Q22 62 30 62Q38 60 44 56Z', // snout
    'M30 70Q28 60 40 58H82Q94 60 92 72L96 120Q98 140 82 142H40Q24 140 26 120Z', // body
    'M32 72Q14 80 12 96Q12 104 20 102Q24 90 36 86Z', // near arm
    'M86 74Q102 82 104 94Q104 102 96 100Q94 90 82 86Z', // far arm
    carrierLeg(48, 136), carrierLeg(72, 136),
    // trabucaire: head, coat, legs, the arm holding the trabuc upright (no cap: it read as a helmet)
    oval(164, 72, 9),
    'M150 86Q150 78 158 78H172Q180 78 180 88L182 120Q182 126 176 126H154Q148 126 148 120Z',
    carrierLeg(158, 124, -1, 6), carrierLeg(172, 124, -1, 6),
    'M176 90L186 86V96L178 100Z', 'M183 40h4V112h-4ZM180 104h10l-2 14h-6Z',
  ] },
  // Gegant and Geganta (crowns, robes widening to the ground), then the smaller Gegantona and Lladrefaves (tricorn, legs).
  'gegants-ciutat-valls': { vb: [20, 16], parts: 2, dx: 5, d: [ // two pairs, each standing overlapped; dx centres the ink (5.6–184 of 200: the left arm nearly touched a narrow card's edge)
    'M20 23L18 9L25 15L31 6L37 15L44 9L42 23Z', oval(31, 30, 9, 10), // Gegant
    'M14 50Q14 38 24 37H38Q48 38 48 50L50 70Q58 72 56 84Q52 88 50 84L54 148H8L12 84Q10 88 6 84Q4 72 12 70Z',
    'M64 25L62 11L69 17L75 8L81 17L88 11L86 25Z', oval(75, 32, 9, 10), // Geganta
    'M60 52Q60 39 68 39H82Q90 40 90 52L92 70Q100 72 98 84Q94 88 92 84L100 148H52L58 84Q56 88 52 84Q50 72 58 70Z',
    oval(130, 56, 6), oval(130, 68, 8, 9), // Gegantona: hair bun, bell dress
    'M118 84Q118 74 125 74H135Q142 75 142 84L146 104Q150 106 148 112L152 148H108L112 112Q110 106 114 104Z',
    'M152 58Q166 50 182 58Q178 64 167 64Q156 64 152 58Z', oval(167, 70, 8, 9), // Lladrefaves: tricorn, coat, legs
    'M155 86Q155 76 162 76H172Q179 77 179 86L184 122Q184 126 180 126H154Q150 126 150 122Z',
    carrierLeg(160, 124, -1, 6), carrierLeg(174, 124, -1, 6),
  ] },
  // A waist horse to the left: white head and bridle neck rising from the red faldó, the rider standing in it with his
  // cape, a tall plume and the sword in his hand; his legs show under the faldó.
  'cavallets-valls': { vb: [20, 16], d: [
    'M34 90Q30 84 36 82H168Q176 84 174 92L172 126Q172 132 164 132H40Q32 132 32 126Z', // faldó
    'M40 86Q36 66 30 56Q22 62 14 72Q8 76 6 70Q8 58 20 44Q28 32 36 30L38 24L44 30Q52 34 56 46Q60 62 62 84Z', // neck and head
    'M166 84Q184 82 188 94Q186 104 178 108Q182 98 168 94Z', // tail
    'M96 88Q92 66 100 54Q104 44 112 44H118Q128 46 130 60Q136 74 134 88Z', // rider and cape
    oval(112, 38, 9),
    'M104 34Q104 18 112 12Q120 18 120 34Z', // plume, set into the head
    'M128 60L148 62V71L130 72Z', 'M146 10h4V70h-4ZM140 64h16v5h-16Z', // arm, sword and guard
    carrierLeg(104, 130), carrierLeg(122, 130),
  ] },
  // From La Pessigolla's photo: tall and upright, big red comb, beak down, long neck, round scaly chest, both
  // silver wings raised straight up beside the head, one carrier underneath.
  'basilisc-valls': { vb: [20, 16], d: [
    'M86 32Q82 14 92 10Q96 18 98 12Q102 4 108 8Q110 16 114 10Q122 14 116 32Z', // comb
    oval(100, 40, 15, 13),
    'M92 46L100 64L108 46Z', // beak
    'M86 46Q80 70 82 92H118Q120 70 114 46Z', // neck
    oval(100, 104, 30, 22), // chest
    'M86 98Q66 82 60 58Q56 36 58 12Q64 24 68 36Q72 30 76 34Q74 48 80 56Q84 50 88 54Q86 70 94 86Z', // wings, raised
    'M114 98Q134 82 140 58Q144 36 142 12Q136 24 132 36Q128 30 124 34Q126 48 120 56Q116 50 112 54Q114 70 106 86Z',
    carrierLeg(92, 122), carrierLeg(108, 122, 1),
  ] },
  // ---- the other towns ----
  'aliga-tarragona': { vb: [20, 16], d: DANCED_EAGLE },
  'aliga-solsona': { vb: [20, 16], d: DANCED_EAGLE },
  // Barcelona's eagle wears a ceremonial skirt down to the ground instead of showing the dancer's legs.
  'aliga-barcelona': { vb: [20, 16], d: [...EAGLE, 'M72 112Q96 126 122 112L130 150H64Z'] },
  // A domed scaly shell on many carriers' legs, raised tail, head to the right with open jaws, a horn and the straw beard.
  'cucafera-tarragona': { vb: [20, 16], d: [
    'M14 106Q8 58 48 42Q90 30 118 50Q128 70 124 110H16Z', // shell
    'M24 60Q8 38 14 14Q20 10 22 18Q20 36 36 50Z', // tail
    'M110 64Q132 54 152 60Q168 66 172 80L154 84L172 92Q170 102 156 104H114Z', // head, jaws open
    'M140 62Q142 48 150 44Q151 54 148 64Z', // horn
    'M124 102Q131 124 138 102Q144 122 152 102Z', // beard
    carrierLeg(28, 106), carrierLeg(46, 106), carrierLeg(74, 106), carrierLeg(92, 106), carrierLeg(116, 106), carrierLeg(134, 106),
  ] },
  // Reus: a mule in a long caparison, head down to the right with ears and plume, four carriers' legs.
  'gegants-mulassa-reus': { vb: [18, 14], d: [
    'M10 36Q10 28 18 28H118Q126 28 126 36V112Q126 120 118 120H18Q10 120 10 112Z',
    'M112 44Q118 22 132 20H142Q156 28 166 48Q172 66 168 84Q162 92 154 88L150 70Q140 62 124 64Z',
    'M126 26L119 6L133 21Z', 'M136 24Q135 8 142 3Q147 10 143 24Z', // ear and plume
    carrierLeg(28, 116, 1, 7, 130), carrierLeg(54, 116, 1, 7, 130), carrierLeg(86, 116, 1, 7, 130), carrierLeg(112, 116, 1, 7, 130),
  ] },
  // Solsona: the caparison reaches the ground, head and ears to the right; Antonio Ricu sits on the rump in his wide hat.
  'mulassa-solsona': { vb: [20, 16], d: [
    'M14 86Q14 76 24 76H144Q154 76 154 86V136Q154 140 148 140H20Q14 140 14 136Z',
    'M118 84Q116 58 126 46L146 42Q152 60 154 84Z', // neck
    'M124 50Q128 24 142 16Q152 10 160 16Q170 24 172 38Q172 48 166 50L146 56Z', // head
    'M138 22L133 6L145 17Z', 'M150 18L154 3L161 16Z',
    'M14 30Q22 24 30 22Q30 8 42 8Q54 8 54 22Q62 24 70 30Z', oval(42, 38, 9), 'M28 52Q28 44 36 44H50Q58 44 58 52V82H28Z', // Antonio Ricu
    carrierLeg(30, 136, 1), carrierLeg(58, 136, 1), carrierLeg(108, 136, 1), carrierLeg(136, 136, 1),
  ] },
  // Vilanova's Boja: the mule's body in its net, black head raised to the right, two carriers.
  'boja-vilanova': { vb: [20, 16], d: [
    'M14 56Q14 46 24 46H138Q148 46 148 56V118Q148 126 140 126H22Q14 126 14 118Z',
    'M124 56Q124 30 134 16L144 12Q160 14 168 30Q176 40 172 48Q166 52 160 46L150 40Q146 50 148 62Z',
    'M136 27L132 4L145 21Z', 'M150 23L157 4L163 23Z',
    carrierLeg(40, 122), carrierLeg(52, 122), carrierLeg(110, 122), carrierLeg(122, 122),
  ] },
  // Solsona's Corpus bull: long dark back, head turned to the viewer with its horns, skirt nearly to the ground.
  'bou-solsona': { vb: [20, 16], d: [
    'M12 72Q10 54 26 44H126Q132 46 132 56V94H12Z', // back
    'M10 88H150L148 132Q148 136 142 136H16Q10 136 10 132Z', // skirt
    'M122 40Q124 28 136 26H158Q170 28 170 40V60Q170 78 156 86Q148 90 140 86Q124 78 124 60Z', // face
    'M130 36Q116 22 118 6Q124 6 126 14Q130 26 140 30Z', 'M162 32Q176 22 178 6Q184 8 182 16Q178 30 164 40Z', // horns
    carrierLeg(46, 134), carrierLeg(58, 134), carrierLeg(116, 134), carrierLeg(128, 134),
  ] },
  // Solsona's Drac (Commons photo): upright green pear of a body, head on top looking right with open jaws, bat wings
  // raised at its back, the tail curling round the base, the bearer's striped breeches and legs underneath.
  'drac-solsona': { vb: [20, 16], d: [
    'M66 130Q54 96 70 70Q84 50 106 52Q128 56 132 84Q136 110 124 130Z', // body
    'M100 60Q98 34 114 26Q130 20 146 28L178 30Q183 37 175 40L146 44L172 56Q170 62 162 62L132 58Q124 64 114 68Z', // head, jaws wide open
    'M117 31L106 12L125 27Z', 'M129 28L125 8L137 26Z', // horns
    'M76 78Q56 62 44 38Q40 26 46 22Q50 34 58 40Q56 28 62 22Q66 36 72 42Q72 32 78 28Q82 48 92 62Z', // wings
    'M72 114Q44 110 32 88Q26 72 34 64Q42 62 40 72Q42 88 68 96Z', // tail
    'M80 126H114L112 136H82Z', carrierLeg(90, 134), carrierLeg(106, 134),
  ] },
  // Solsona's Carnaval Draca: round scaly body, S neck to the head at the right with its ear, raised tail, red skirt.
  'draca-solsona': { vb: [20, 16], d: [
    'M22 72Q16 40 22 12Q28 6 32 12Q36 40 40 68Z', // tail
    'M12 88Q12 66 34 64H128Q146 66 146 84Q146 104 124 108H34Q14 106 12 88Z', // body
    'M44 102H134L156 150H26Z', // skirt
    'M114 72Q110 54 120 40H140Q148 56 140 72Z', // neck
    'M112 30Q112 14 132 12H150Q166 14 168 28Q176 30 176 38Q170 46 158 44H124Q112 42 112 30Z', // head
    'M152 22Q168 12 178 20Q170 26 158 28Z', // ear
  ] },
  // Vilanova's Drac: head to the left with open jaws, long neck, raised bat wing, looped tail, bearer's legs.
  'drac-vilanova': { vb: [20, 16], d: [
    'M18 42Q16 26 30 18Q46 10 62 18Q72 26 72 40V70H56L50 60Q30 62 18 56Q10 50 18 42Z', // head and jaws
    'M54 62Q60 82 74 98L96 92Q78 78 72 56Z', // neck
    'M84 96Q82 70 90 50Q100 38 112 36Q122 34 130 40Q126 46 122 50Q128 52 126 60Q120 62 116 64Q120 70 114 76L100 96Z', // wing
    'M34 108Q34 92 52 90H138Q156 92 158 108Q156 124 138 126H52Q34 124 34 108Z', // body
    'M144 104Q156 100 158 92L166 96Q162 106 150 116Z', ring(168, 82, 15, 7), // looped tail
    carrierLeg(82, 122), carrierLeg(100, 122),
  ] },
  // Vilafranca's Drac, carried diagonally: crested back, head to the right with open jaws, coiled tail, bearers' legs.
  'drac-vilafranca': { vb: [20, 16], d: [
    'M34 76Q40 64 60 66H150Q170 66 180 74L176 96Q140 102 120 104Q80 106 60 100Q40 92 34 80Z', // body
    'M128 68Q136 46 152 42Q168 42 180 52L192 66Q190 72 182 72L186 80H160L150 76Z', 'M150 78H186Q184 92 176 94L160 92Z', // head and jaw
    'M60 70Q60 40 64 12Q70 16 72 22Q76 12 82 12Q86 22 90 26Q94 16 100 14Q104 24 104 34Q112 28 120 30Q116 46 112 70Z', // crest
    ring(28, 44, 17, 8), 'M26 58Q32 68 40 76L50 68Q40 62 40 54Z', // coiled tail
    carrierLeg(80, 98), carrierLeg(120, 98),
  ] },
  // Solsona's Gegant Vell (helmet and crest) and Gegant Jove (crown), each with his staff in hand.
  'gegants-solsona': { vb: [20, 16], parts: 2, d: [
    'M14 12h5V94h-5Z', 'M40 36Q40 16 65 14Q90 16 90 36Z', 'M54 18Q58 4 70 4Q78 6 76 18Z', oval(65, 52, 22, 20),
    'M22 80Q22 68 34 68H96Q108 68 108 80L106 150H24Z', 'M30 88L16 84V94L28 98Z', // Vell, his hand on the staff
    'M110 18h5V96h-5Z', 'M130 28L128 10L136 18L146 8L156 18L164 10L162 28Z', oval(146, 46, 22, 20),
    'M122 74Q122 62 132 62H164Q176 62 176 74L184 150H116Z', 'M126 88L112 84V94L124 98Z', // Jove
  ] },
  // Carnaval: the Geganta Boja's low diadem and the bald Gegant Boig's small crown and rounded, beardless chin.
  // From the named Taller Casserras reproductions; selector proposal accepted on 2026-10-19.
  'gegants-bojos-solsona': { vb: [20, 16], parts: 2, d: [
    'M37 50L36 38L45 41L55 31L65 41L74 38L73 50Z', oval(55, 66, 26, 20), 'M20 94Q20 82 32 82H78Q90 82 90 94L92 150H14Z',
    'M126 30L125 13Q131 9 137 12Q143 10 148 14L147 30Z', oval(137, 44, 23, 20), 'M117 50Q115 67 125 75Q139 84 151 72Q157 64 157 50Z', // crown, bald head, chin
    'M100 92Q100 76 114 76H162Q182 78 182 92L186 150H96Z',
  ] },
  // Olot: the crowned Geganta in her long dress and the Gegant with helmet, plume and raised mace.
  'gegants-olot': { vb: [20, 16], parts: 2, dx: 4, d: [ // dx centres the ink (8–184 of 200)
    'M28 48L26 28L34 34L44 24L54 34L62 28L60 48Z', oval(45, 62, 24, 18), 'M18 86Q18 76 30 76H62Q74 76 74 86L82 150H8Z',
    'M106 42Q104 18 128 14Q152 18 152 42Z', 'M120 18Q124 6 132 6Q140 8 136 18Z', oval(128, 54, 22, 18),
    'M102 80Q102 68 112 68H148Q160 68 160 80L168 150H96Z',
    'M172 28h4V92h-4Z', 'M166 14Q166 4 174 4Q184 4 184 14V30H166Z', 'M154 86L174 80V90L158 98Z', // mace and arm
  ] },
  // Berga's Guites, Xica and Grossa: small cloth bodies under deliberately thin, long necks, heads to the right.
  'guites-berga': { vb: [18, 14], parts: 2, d: [
    'M12 98Q12 88 24 88H58Q66 90 66 100V114Q66 120 58 120H20Q12 120 12 114Z', 'M57 94Q55 70 59 50H67Q67 72 67 94Z',
    'M57 56Q57 46 66 46Q76 46 84 54L96 58Q98 64 92 66H62Z', carrierLeg(28, 116, 1, 6, 130), carrierLeg(54, 116, 1, 6, 130),
    'M98 98Q98 88 110 88H140Q150 90 150 100V114Q150 120 142 120H104Q98 120 98 114Z', 'M129 94Q127 50 129 14H137Q139 50 139 94Z',
    'M127 20Q127 8 136 8Q148 8 154 16L168 20Q170 26 164 28H132Z', carrierLeg(110, 116, 1, 6, 130), carrierLeg(136, 116, 1, 6, 130),
  ] },
};
const DRAWN_INK = '#120b07', DRAWN_HALO = '#f5e3b8';
// One <path> per shape (overlaps never cancel into holes); the halo group, 2 screen px wide (1 px outside), sits under
// the ink: the same line as the Bou's and the traced silhouettes'.
const drawnSvg = ({ vb: [w, h], d, dx = 0 }) => { const paths = d.map(x => `<path d="${x}"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><g transform="scale(.1) translate(${dx} 0)"><g fill="${DRAWN_HALO}" stroke="${DRAWN_HALO}" opacity=".38" stroke-width="2" stroke-linejoin="round">${paths.replace(/<path/g, '<path vector-effect="non-scaling-stroke"')}</g><g fill="${DRAWN_INK}">${paths}</g></g></svg>`; };
export const DRAWN_SILHOUETTES = Object.fromEntries(Object.entries(SILHOUETTE_DRAWINGS).map(([id, drawing]) => [id, drawnSvg(drawing)]));
