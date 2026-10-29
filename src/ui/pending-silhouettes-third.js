// Drawn pending silhouettes for the third wave of figures, in the same viewBox ×10 and on the same ground (y 150) as
// pending-silhouettes-more.js. Each is drawn from its figure's own reference photos; the Verro is traced on its photo and then
// made to read as a boar at card size. `kit` brings the base file's helpers (oval, ring, carrierLeg).
// a plume: a thin stem from (x0,y0) ending in a leaf at (x1,y1), as one polygon so it never cancels itself
const silPlume = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const p = (t, w) => `${+(x0 + ux * t - uy * w).toFixed(1)} ${+(y0 + uy * t + ux * w).toFixed(1)}`;
  return `M${p(0, 1.6)}L${p(L - 13, 1.6)}L${p(L - 7, 4.5)}L${p(L, 0)}L${p(L - 7, -4.5)}L${p(L - 13, -1.6)}L${p(0, -1.6)}Z`; };
export const thirdDrawings = ({ oval, ring, carrierLeg }) => ({
  // Es Freu de Campos in profile to the right (02-fdbib-DSC7954): a big fish head with open toothed jaws, a fan of a dorsal fin, a tail, the bearer's legs.
  'freu-campos': { vb: [20, 16], d: [
    oval(88, 94, 32, 26), // back of the head, over the bearer's shoulders
    'M70 74Q110 52 150 66L186 88L178 94L132 92Q104 94 80 104Z', // upper jaw and long snout
    'M84 104Q120 98 150 106L170 114Q162 126 140 122Q100 122 82 114Z', // lower jaw, open
    'M60 96L38 72L42 40L58 52L62 20L76 44L86 10L94 44L104 18L106 52L122 56Q102 78 92 94Z', // spiky dorsal fan
    'M116 66L120 42L140 50L136 70Z', // small dark fin behind the eye
    'M62 92Q42 80 30 58Q22 72 34 92Q26 108 32 122Q46 106 62 106Z', // tail
    carrierLeg(92, 116), carrierLeg(110, 116, 1),
  ] },
  // The Voltor de la Bisbal from the front (02-bestiari): wings spread wide like a T, bald head and hooked beak over a ruff, bird legs with claws.
  'voltor-bisbal': { vb: [20, 16], d: [
    'M90 66Q62 30 22 34Q8 40 6 74L12 86L20 76L24 92L34 80L38 96L48 84L54 98L64 86L72 98L92 86Z', // left wing, ragged feather edge
    'M110 66Q138 30 178 34Q192 40 194 74L188 86L180 76L176 92L166 80L162 96L152 84L146 98L136 86L128 98L108 86Z', // right wing
    oval(100, 94, 20, 28), // dark body
    oval(100, 64, 25, 18), // white feather ruff, wider than the body
    'M93 58V34H107V58Z', oval(100, 28, 11, 12), // bare neck, bald head
    'M93 32H107L103 50Q100 54 97 50Z', // hooked beak, pointing down
    'M88 116L82 140L72 146L76 150H96L94 140L96 118Z', 'M112 116L118 140L128 146L124 150H104L106 140L104 118Z', // legs and claws
  ] },
  // The Lleó de Barcelona in profile to the left (03-gegantsdelpi): crowned head, long mane, a long cloth skirt to the ground, an S tail over the rump.
  'lleo-barcelona': { vb: [20, 16], d: [
    'M30 150L36 98H176L172 150Z', // skirt to the ground
    'M44 100Q44 72 72 66H150Q176 70 176 100Z', // back and rump
    'M32 62Q22 82 30 102H82Q88 70 72 44Q60 36 46 40Z', // mane falling over the chest
    'M12 62Q12 52 24 48L32 38Q46 28 62 38L66 56L56 70Q40 74 28 70Q14 70 12 62Z', // head, muzzle forward
    'M34 40L32 20L40 27L47 14L54 27L62 20L60 40Z', // crown
    'M166 78Q186 72 184 54Q182 38 194 32Q200 36 194 42Q190 54 192 64Q188 84 170 88Z', // tail curling up
  ] },
  // The Verro de Cardedeu charging to the right, its outline traced on 02-jaumeolivet-2015-01 and then made to read as a boar at card
  // size: the body lengthened, the shoulders above the rump under a short mane, a long wedge head with a big upturned tusk, four thin
  // legs with hooves hanging (in the photo they are folded mid-leap), a thin tufted tail, the bearer's legs under it.
  'verro-cardedeu': { vb: [20, 16], d: [
    'M42.5 86.5Q42.5 69.2 57.9 61.5Q82.9 50 109.8 46.2Q129.1 44.2 142.5 51.9L152.2 57.7Q165.6 69.2 175.2 80.8L186.8 92.3L188.7 103.8Q182.9 107.7 175.2 105.8Q169.5 113.5 157.9 115.4Q140.6 117.3 125.2 113.5Q102.2 111.5 82.9 113.5Q59.8 111.5 48.3 103.8Q42.5 96.2 42.5 86.5Z', // body and long wedge head, the shoulders higher than the rump
    'M79.1 57.7L84.8 49L87.7 54.8L92.5 45.2L95.4 51.9L100.2 41.3L103.1 49L107.9 39.4L110.8 47.1L115.6 38.5L118.5 46.2L123.3 40.4L126.2 48.1L131 43.3L136.8 53.8L109.8 55.8Z', // short swept-back mane over the shoulders
    'M134.8 57.7L142.5 39.4L153.1 61.5Z', 'M169.5 100Q181 100 188.7 84.6Q193.5 94.2 186.8 103.8Q179.1 109.6 169.5 107.7Z', // ear, big tusk curving up
    'M44.5 80.8Q31 78.8 17.5 75Q9.8 73.1 8.9 78.8Q9.8 84.6 15.6 81.7Q31 86.5 44.5 90.4Z', // thin tufted tail
    'M52.2 100L44.5 123.1L48.3 132.7L56 132.7L54.1 123.1L63.7 103.8Z', 'M67.5 105.8L65.6 126.9L69.5 134.6L77.2 134.6L73.3 125L79.1 107.7Z', // hind legs hanging, hooves
    'M138.7 107.7L148.3 126.9L144.5 134.6L152.2 135.6L156 126L150.2 105.8Z', 'M154.1 107.7L165.6 123.1L165.6 132.7L172.3 132.7L173.3 121.2L161.8 103.8Z', // front legs hanging, hooves
    'M100.2 109.6h32.7v13.5H100.2Z', 'M102.2 119.2h9.6L98.3 144.2h-8.7Z', 'M88.7 141.3h10.6l-1 8.7H84.8q-2.9 0 -1 -2.9Z', 'M119.5 119.2h9.6l5.8 25h-8.7Z', 'M125.2 141.3h11.5l4.8 5.8q1 2.9 -1.9 2.9H125.2Z', // the bearer under it: hips, legs, sandals
  ] },
  // The Griu d'Artesa de Lleida in profile to the left (01-bestiari): eagle head and claws forward, wing raised back, lion haunch and S tail, a skirt to the ground.
  'griu-artesa-lleida': { vb: [20, 16], d: [
    'M60 150L64 98H134L142 150Z', // skirt to the ground
    'M86 72Q72 44 70 24Q70 12 82 14Q112 22 132 46Q150 66 158 88L148 82L148 94L139 85L137 97L128 88L125 99L117 90L110 99L102 92Z', // raised wing, long feather tips
    'M60 98Q52 70 64 54L94 50Q106 70 102 100Z', // feathered chest
    'M58 48Q60 36 72 34Q88 34 94 46L92 60Q80 64 64 60Z', // eagle head
    'M64 40Q44 36 44 52Q45 58 50 57Q50 49 58 50L60 60L68 58Z', // big hooked beak, open
    'M68 38L70 24L78 33L84 22L87 34L94 28L92 44Z', // ruffled crest
    'M66 84L48 70L38 64L36 70L44 73L38 78L50 79L60 90Z', 'M64 96L44 90L30 92L30 98L40 98L34 103L46 103L62 104Z', // eagle claws reaching forward
    'M92 102Q108 84 140 90Q158 96 156 112L140 112Q132 104 112 108Z', // lion haunch
    'M112 104Q130 102 136 120V128L148 126L150 134L132 138Q120 138 118 128L104 110Z', // hind leg and paw
    'M150 100Q164 100 166 88Q168 80 162 76L170 70Q178 80 176 92Q172 108 152 110Z', oval(166, 72, 10, 6), // S tail with a tuft
  ] },
  // The Mulassa de Montblanc in profile to the left (sant-francesc.jpg): a big grey head raised with its mouth wide open,
  // two long upright ears, a trunk-like caparison to the ground with its fringe, the black tail at the rump.
  'mulassa-montblanc': { vb: [20, 16], d: [
    'M56 86Q54 56 80 50L146 48Q178 50 182 66L184 134H54Z', // caparison, a long low trunk
    'M50 132H186L188 144H48Z', // fringed hem
    'M46 50Q50 30 62 24L90 50Q80 66 82 92L60 96Z', // neck and mane
    'M42 22Q58 16 66 30L64 62Q50 84 34 86L14 88Q8 86 10 80L34 70L6 66Q0 62 2 54Q12 34 42 22Z', // head, mouth wide open
    'M40 26L34 4Q38 0 43 4L52 24Z', 'M54 26Q60 8 72 4Q77 6 72 14L62 30Z', // long ears
    'M174 56Q192 54 196 70L198 128Q195 134 191 128L189 82Q186 70 178 68Z', // horsehair tail
    'M62 140H80V150H58Z', 'M152 140H170V150H148Z', // bearers' feet under the hem
  ] },
  // Reus's Basilisc (2007) in profile to the right (bestiari-4.jpg): an upright bird-serpent with a deep bulging chest, a hooked
  // beak, a fan of thin plumes with leaf tips on the head, one ribbed silver wing raised behind, the long snake tail to the left.
  'basilisc-reus': { vb: [20, 16], d: [
    'M134 40Q160 40 172 66Q184 96 176 118Q168 138 148 138H124Q110 136 112 120Q116 92 126 64Z', // neck and bulging scaly chest
    oval(152, 36, 17, 14), // head
    'M164 26Q182 24 186 40Q186 52 178 56L176 44L164 46Z', // hooked beak
    silPlume(144, 28, 124, 2), silPlume(150, 26, 150, 0), silPlume(156, 26, 176, 4), silPlume(160, 30, 190, 22), // plumes
    'M132 118Q106 108 96 92L78 74L100 74Q90 60 84 44L104 52Q98 36 98 18L114 36Q114 20 120 6L128 30Q132 40 134 56L140 108Z', // ribbed wing, its fin points up and back
    'M124 130Q90 136 62 124Q36 112 26 86L18 66L28 62L36 80Q48 104 72 110Q98 116 122 112Z', // snake tail, thick at the body
    'M24 70L8 58L18 54L22 44L30 58L30 72Z', // forked tail tip
    carrierLeg(128, 134), carrierLeg(144, 134, 1),
  ] },
  // València's Tarasca facing left (04-commons-tarasca, 03-commons-estacio01): a great round shell edged with scale tufts, a wide cat
  // head low in front of it with pointed ears, whiskers and two long fangs, its front paw on the edge of its skirted platform.
  'tarasca-valencia': { vb: [20, 16], d: [
    'M66 112H192V119H66Z', 'M70 117H188L190 150H68Z', // platform board and its skirt to the ground
    'M90 116Q82 64 114 40Q150 18 180 42Q198 62 192 116Z', // round shell
    ...[[106, 46], [124, 34], [144, 28], [163, 32], [178, 44], [188, 60], [193, 79], [195, 99]].map(([x, y]) => oval(x, y, 8, 7)), // scale tufts on its edge
    'M14 70Q12 48 32 40Q54 34 74 42Q92 54 90 76Q88 100 68 108Q46 114 28 106Q14 96 14 70Z', // wide cat head
    'M72 62Q90 52 104 62L104 114H70Z', // thick neck under the rope, joining head and shell
    'M24 48L20 18L44 40Z', 'M56 40L70 12L78 46Z', // pointed ears
    'M18 74Q6 76 4 86Q6 96 20 96Z', // muzzle
    'M8 80L1 75L2 71L10 76Z', 'M8 88L1 91L1 86L8 84Z', // whiskers
    'M26 100Q28 116 34 130Q33 114 38 103Z', 'M44 106Q46 122 53 134Q52 118 56 106Z', // long fangs
    'M64 98Q84 94 92 108L90 118H62Q58 106 64 98Z', // front paw on the platform's edge
    'M170 100Q190 98 196 112V118H168Z', 'M192 112Q199 118 199 128L191 118Z', // hind paw
  ] },
  // València's Cuca Fera de Santa Margalida in profile to the right (plaza-virgen-03.jpg): a huge low tortoise shell with an
  // overhanging rim over the red fringed skirt to the ground, the long head stretched forward and down near the floor.
  'cucafera-valencia': { vb: [20, 16], d: [
    'M2 104Q2 66 40 46Q72 32 104 42Q138 56 148 96Q150 102 142 102Q76 110 8 110Q2 110 2 104Z', // domed shell, its rim overhanging
    'M22 104H126L128 146L114 150L98 146L82 150L66 146L50 150L34 146L20 150Z', // red skirt with its folds
    'M124 112Q130 96 146 94Q164 92 178 100Q190 108 194 124Q196 136 186 138Q172 140 162 132L146 126L124 126Z', // neck and long head, snout down
  ] },
  // Andratx's Na Pòpia in profile to the left (fdbib-2.jpg): a four-legged lizard-dragon with a wide head and open toothed jaws,
  // short horns, two bat wings raised over its back, a crest of spikes down to the low tail, on a frame with wheels.
  'na-popia-andratx': { vb: [20, 16], d: [
    'M54 78Q74 60 100 62Q130 66 154 84Q178 96 196 110L194 118Q170 120 150 118Q110 124 76 116Q56 108 52 92Z', // body and tail
    'M60 70Q42 62 24 70Q10 76 6 86L26 94H44L18 110Q20 122 36 120Q54 116 64 104Z', // wide head, jaws open
    'M44 70L52 50L58 68Z', 'M52 70L68 54L66 74Z', // horns swept back
    'M104 76L96 24L52 6Q70 22 54 36Q74 44 62 62Q84 62 90 80Z', // near bat wing raised, scalloped between the fingers
    'M98 64L118 24L190 6Q164 22 172 40Q148 40 144 58Q124 58 118 78Z', // far bat wing, spread back
    'M118 72L124 56L130 74Z', 'M136 78L144 64L148 82Z', 'M154 86L162 72L166 92Z', 'M172 96L182 86L182 104Z', // crest spikes
    'M70 108Q60 118 50 126L36 130L32 138H58L64 130L88 112Z', // front leg reaching, clawed foot
    'M94 108L92 132L82 136L80 140H106L108 112Z', 'M148 108L156 132L148 136V140H170L166 110Z', // planted legs, clawed feet
    'M60 136H190V141H60Z', oval(80, 144, 6), oval(174, 144, 6), // frame and wheels
  ] },
  // Prada's Drac del Canigó sitting up like a bear, head to the left, from 03-bestiari (three-quarter, facing left).
  'drac-canigo-prada': { vb: [20, 16], d: [
    'M70 146Q56 116 68 92Q78 72 98 68L120 72Q138 86 140 112Q142 134 132 146Z', // pear-shaped trunk
    'M86 84Q84 62 94 48L118 50Q114 68 120 80Z', // short neck
    oval(98, 34, 22, 20), // skull
    'M84 22L46 26Q30 28 30 38Q32 44 40 44L84 44Z', // upper jaw, a broad snout to the left
    'M100 46L48 54Q44 58 50 64Q66 70 100 64Z', // lower jaw hanging open
    'M50 42L54 54L58 42Z', 'M66 42L70 56L74 42Z', // fangs
    'M108 36L134 26L128 42L140 50L112 58Z', // cheek frill
    'M88 20Q80 6 90 2Q98 8 97 18Z', 'M106 20Q114 2 132 6Q124 12 116 26Z', // two big horns curving back
    'M94 64Q74 74 56 70L50 62Q46 56 54 56L60 62Q74 66 90 58Z', // near arm reaching forward, claws up
    'M98 80Q78 92 60 88L54 80Q50 74 58 74L64 80Q78 84 96 74Z', // far arm, lower
    'M126 84Q144 56 172 46Q168 62 178 72Q160 74 156 86Q146 84 136 96Z', // small bat wing on the shoulder
    'M78 116H104L106 140L100 134L96 144L92 134L88 144L84 134L80 140Z', // ragged red skirt
    'M52 150Q48 136 62 130L86 132Q92 144 86 150Z', 'M112 150Q110 136 122 132L146 134Q152 144 148 150Z', // big clawed feet
    'M136 132Q156 136 172 126Q170 144 140 148Z', // short tail on the ground
  ] },
  // Dénia's Drac seen from the front, from 04-corpus2017-cos-sencer: a tall tube body, the head looking down, horns, two wings raised like arms, the carrier's legs.
  'drac-denia': { vb: [20, 16], d: [
    'M66 126Q60 80 72 54Q84 40 100 40Q116 40 128 54Q140 80 134 126Q100 134 66 126Z', // tube body, tapering up into the neck
    'M78 24Q78 8 100 8Q122 8 122 24L116 40Q112 54 100 56Q88 54 84 40Z', // head, snout pointing down
    'M84 18L82 1L96 12Z', 'M116 18L118 1L104 12Z', // horns
    'M86 22L64 8L72 30L86 32Z', 'M114 22L136 8L128 30L114 32Z', // ears
    'M80 98Q52 92 42 66L36 34Q54 40 60 52L60 66L68 64L70 76L82 76Z', // left wing raised, scalloped like a bat's
    'M120 98Q148 92 158 66L164 34Q146 40 140 52L140 66L132 64L130 76L118 76Z', // right wing raised
    carrierLeg(90, 124, -1, 10), carrierLeg(110, 124, 1, 10), // the carrier's legs
  ] },
  // Sant Joan's two-headed Corb in profile, from 02-webme and 03-webme (video stills): an egg of a body, one head forward and one raised looking back, wing to the tail.
  'corb-sant-nofre-sant-joan': { vb: [20, 16], d: [
    oval(98, 92, 40, 40), // egg-shaped body
    'M66 74Q62 58 72 50L94 54Q96 66 92 78Z', // front neck
    oval(74, 52, 15, 13), 'M66 44Q46 38 34 48Q28 54 30 64Q36 56 44 58Q54 60 66 64Z', // front head, heavy beak hooked down
    'M108 64Q104 42 112 30L128 32Q124 50 132 62Q135 69 140 77L118 80Z', // raised neck, flaring into the wing
    oval(122, 26, 14, 12), 'M128 18Q148 14 158 24Q164 30 162 40Q156 32 148 34Q140 36 132 38Z', // raised head looking back
    'M96 64Q134 58 164 94Q180 112 194 130Q170 130 150 122Q130 116 116 108Z', // folded wing down to the tail tip
    carrierLeg(90, 128), carrierLeg(108, 128), // the carrier's legs
  ] },
  // Sant Julià's Llop de la Senyoreta, from 01-bateig-altaveu: a tall column of ragged cloth flames under a wolf's head with open jaws, snout to the left.
  'llop-senyoreta-sant-julia': { vb: [20, 16], d: [
    // ragged flame cloth from the neck to the ground, jagged on both sides
    'M82 50L74 64L80 66L72 80L78 80L70 94L76 94L68 108L74 108L66 122L72 122L64 136L70 136L64 150H138L132 136L138 136L130 122L136 122L128 108L134 108L126 94L132 94L124 80L130 80L122 66L128 64L120 46Z',
    'M84 26Q88 6 110 6Q132 8 134 30Q134 50 120 58L90 58Z', // skull
    'M92 18Q66 16 48 22Q38 26 42 34L94 40Z', // upper jaw, a long snout
    'M92 46L58 50Q52 54 56 60Q74 66 98 62Z', // lower jaw, open
    'M52 32L56 42L60 32Z', 'M72 34L76 46L80 34Z', 'M64 52L68 44L72 52Z', // fangs
    'M100 14L100 1L114 12Z', 'M118 14L131 1L130 20Z', // pointed ears
  ] },
});
