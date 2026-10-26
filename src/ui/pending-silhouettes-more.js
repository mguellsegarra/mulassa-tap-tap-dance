// Drawn pending silhouettes for the second wave of figures (split from pending-silhouettes.js to stay under the module cap), in
// the same viewBox ×10 and on the same ground (y 150). Each is drawn from its figure's own reference photos, not from another
// figure's shape: the shapes of one figure overlap, one piece per figure shown (tests/figures/common/silhouettes.mjs).
// `kit` brings the base file's helpers (oval, ring, carrierLeg) so they stay defined once.
export const moreDrawings = ({ oval, ring, carrierLeg }) => ({
  // Girona's Beatusaure (2004): a very tall neck with six white cat heads round it, a red head with ten horns on top, a short
  // blue body and tail.
  'beatusaure-girona': { vb: [20, 16], d: [
    'M40 150Q36 116 60 104Q90 94 124 102Q152 112 158 138L160 150Z', 'M148 122Q168 124 178 108Q182 122 172 140L150 140Z', // body, short tail
    'M80 112Q74 80 82 56Q88 40 100 34L118 42Q108 58 108 78Q110 96 118 112Z', // neck
    'M82 40Q80 22 102 18L136 24Q148 30 140 38L114 46Q102 54 90 50Z', // red head, snout to the right
    'M90 24L84 10L98 20Z', 'M98 22L96 10L108 20Z', 'M106 22L110 10L116 22Z', 'M112 24L122 12L122 28Z', // horns
    oval(72, 62, 14, 12), oval(116, 78, 14, 12), oval(70, 92, 14, 12), oval(118, 106, 14, 12), oval(72, 122, 14, 12), oval(112, 128, 13, 11), // cat heads
    'M62 56L58 42L72 52Z', 'M82 54L88 40L92 56Z', 'M108 72L104 58L118 68Z', 'M126 72L134 58L134 74Z', // ears
  ] },

  // Molins's Camell: a long wrinkled neck and a mule's head with straight ears over a wide body under a pale cover.
  'camell-molins': { vb: [20, 16], d: [
    'M30 150Q20 112 44 96Q80 82 130 86Q178 92 186 128L182 150Z', // cover
    'M56 102Q40 74 44 48Q48 34 62 30L78 36Q72 52 74 72Q82 88 92 98Z', // neck
    'M24 40Q24 22 48 20L76 20Q90 24 84 36Q76 48 54 48Q30 50 24 40Z', // head
    'M56 24L54 10L68 20Z', 'M70 22L78 10L82 26Z', // straight ears
    'M44 140H80V150H40Z', 'M120 140H156V150H116Z', // the bearers' feet under the hem
  ] },

  // Sant Sadurní's Fil·loxera (1990): a yellow insect in three quarters, a big round eye, two long antennae, a segmented
  // abdomen and four wings half open.
  'filloxera-sant-sadurni': { vb: [20, 16], d: [
    oval(46, 88, 25, 23), oval(92, 92, 28, 25), oval(148, 100, 42, 27), // head, thorax, abdomen
    'M38 70Q30 42 12 28Q24 22 36 38Q50 50 50 70Z', 'M54 70Q62 40 82 24Q92 28 80 40Q68 52 64 72Z', // antennae
    'M84 80Q86 36 134 20Q152 16 156 30Q150 58 108 84Z', 'M104 88Q132 50 176 48Q190 54 182 66Q156 86 118 98Z', // wings
    'M62 100L48 144L58 146L76 108Z', 'M90 106L82 148L94 148L106 110Z', 'M128 112L130 148L140 148L142 114Z', 'M160 112L172 146L182 144L172 108Z', // legs
  ] },

  // Mataró's big Momerota (1979): a dark bull's head with two long horns over a mulassa's body in red and floral cloth,
  // the bearers' feet below.
  'momerota-mataro': { vb: [20, 16], d: [
    'M44 150Q36 104 70 86Q120 72 168 98Q188 114 182 138L180 140H44Z', // cloth
    'M36 64Q36 44 56 42Q76 44 84 62L98 96Q70 104 52 88Q38 78 36 64Z', // bull's head and neck
    'M52 50Q32 40 34 14Q40 12 44 20Q48 34 62 44Z', 'M72 48Q74 26 92 18Q96 22 86 34Q80 42 80 54Z', // horns
    'M54 130H72V150H48Z', 'M80 130H98V150H74Z', 'M130 130H148V150H124Z', 'M156 130H174V150H150Z', // the bearers' feet
  ] },

  // Tortosa's big Cucafera (2017): a tall oval scaly shell, a low long head at the left with open toothed jaws and a tongue;
  // pushed from inside, so no legs.
  'cucafera-tortosa': { vb: [20, 16], d: [
    'M62 150Q52 82 100 44Q152 16 190 66Q206 118 192 150Z', // tall scaly shell, a high rounded back
    'M60 70Q54 52 70 46L84 56L86 82Q72 90 60 82Z', // crumpled neck where the head joins the shell
    'M4 76L8 66Q20 60 34 60L66 56L74 70L70 80L30 84L6 84Z', // a long croc-like upper jaw
    'M10 69L14 59L19 68Z', 'M22 67L26 56L31 66Z', 'M34 65L38 53L43 64Z', // ridge of small bumps along the snout
    'M54 76L72 78L44 128L30 124Z', // lower jaw hanging open
    'M56 58L54 42L68 54Z', // ear
  ] },



  // The Pi's Mustafà (turban, sabre) and Elisenda (turban, braid, bouquet), the 1986-87 copies, robes down to the ground.
  'gegants-pi-barcelona': { vb: [20, 16], parts: 2, d: [
    'M16 60L26 56L40 108L30 114Z', // sabre
    'M30 42Q30 14 56 12Q82 14 82 42Z', oval(56, 58, 20, 18), 'M26 150L30 84Q56 64 82 84L88 150Z', // Mustafà
    'M120 42Q120 14 146 12Q172 14 170 42Z', oval(146, 58, 18, 17), 'M158 64Q172 84 170 110L160 110Q164 86 150 72Z',
    'M114 150L122 84Q146 64 170 84L180 150Z', oval(126, 118, 11, 14), // Elisenda
  ] },

  // Sineu's Much and Muca: two masked people side by side, not giants. Muca: curly hair, a flower, a flared skirt, one arm up.
  // Much: a big dark mask with two tall horns, overalls.
  'much-muca-sineu': { vb: [20, 16], parts: 2, d: [
    oval(54, 50, 26, 22), oval(54, 64, 15, 14), oval(46, 34, 8, 7), 'M30 150L40 94Q54 86 70 94L86 150Z', 'M44 100Q24 82 24 56L34 54Q36 78 54 94Z',
    'M120 56Q104 32 118 10L126 12Q118 34 130 52Z', 'M148 54Q150 32 142 10L150 10Q160 32 158 56Z', oval(138, 68, 22, 20),
    'M112 108L118 88Q138 80 158 88L164 108Z', 'M114 100h48v38h-48Z', 'M114 130h22v20h-22Z', 'M140 130h22v20h-22Z',
  ] },

  // Vinaròs's Tio Gori (flat cap, black blouse, wide trousers, a castanet in each hand) and Tia Caballera (a flat basket on
  // her head held with one arm, brown dress, apron).
  'gegants-vinaros': { vb: [20, 16], parts: 2, d: [
    'M32 28Q32 14 56 14Q80 14 80 28L86 32H26Z', oval(56, 50, 16, 20), 'M26 84Q28 68 56 64Q84 68 86 84L96 150H16Z',
    'M44 78L14 112L22 118L52 92Z', oval(14, 116, 7, 6), 'M80 82L98 110L90 116L72 92Z', oval(98, 114, 7, 6), // arms and castanets
    oval(146, 24, 28, 7), 'M152 42L130 24L124 32L148 60Z', oval(146, 58, 14, 18), 'M122 150L130 82Q148 66 168 82L178 150Z', 'M160 84L182 114L174 120L152 96Z',
  ] },

  // Castelló's Haca Traca Almalafa (2009): a brown horse in profile to the right, straight ears, a flowered bridle, a black
  // blanket and a long mint skirt over the two bearers.
  'haca-traca-castello': { vb: [20, 16], d: [
    'M18 140Q14 102 36 88Q70 76 120 84Q146 90 152 114L154 140Z', // body and skirt
    'M124 96Q136 64 146 46L168 42Q176 58 170 78Q162 100 152 114Z', // neck
    'M142 48Q148 32 168 34L190 46Q196 54 188 60L170 62Q154 64 142 54Z', // head
    'M148 42L146 20L162 36Z', 'M160 38L166 18L174 38Z', // ears
    'M44 130H62V150H38Z', 'M70 130H88V150H64Z', 'M108 130H126V150H102Z', 'M134 130H152V150H128Z', // the bearers' feet
  ] },

  // Baó's green Hamlet (2006): upright, a round belly, two pale horns, black wings spread to both sides, a curled tail.
  'hamlet-bao': { vb: [20, 16], d: [
    'M62 150Q52 110 70 80Q84 64 100 64Q116 64 130 80Q148 110 138 150Z', // body
    'M72 68Q70 36 94 30Q120 30 128 52Q132 70 112 76Z', // head
    'M80 42L70 12L94 34Z', 'M110 38L130 12L122 44Z', // horns
    'M74 86Q42 66 24 34Q22 26 30 30Q50 38 62 56Q70 66 82 76Z', 'M126 86Q158 66 176 34Q178 26 170 30Q150 38 138 56Q130 66 118 76Z', // wings
    'M132 142Q160 142 172 124Q180 112 170 108Q166 116 160 122Q150 130 132 130Z', // tail
    'M56 138H86V150H52Z', 'M114 138H144V150H148Z', // feet
  ] },

  // Fraga's Pilara (hair bun, black flowered shawl, a bell of a skirt) and Lo Mangüel (red headscarf, waistcoat, wide trousers).
  'gegants-fraga': { vb: [20, 16], parts: 2, d: [
    oval(54, 26, 10, 9), oval(54, 44, 17, 17), 'M22 94Q24 66 54 60Q84 66 86 94L92 114H16Z', 'M32 102L20 150H100L78 102Z', // Pilara
    'M120 30Q120 12 144 12Q168 12 168 30L174 38H114Z', oval(144, 48, 17, 18), 'M118 84Q120 62 144 60Q168 62 170 84L172 116H116Z', 'M120 108H170L180 150H110Z', // Mangüel
  ] },

  // The Drac Baluk Astharot (2014 copy): a tall scaly neck, the head turned right with open jaws and a horn, a big ribbed wing
  // spread to the left, spikes down the back.
  'drac-baluk-terrassa': { vb: [20, 16], d: [
    'M22 142Q14 108 42 92Q70 80 100 90L130 100L136 142Z', // body
    'M88 100Q84 62 98 38Q110 22 128 22L138 46Q124 56 124 72Q126 90 138 104Z', // thick scaly neck
    'M108 32Q108 12 130 10Q152 8 172 22L192 30Q198 38 192 44L172 46L192 56Q190 64 180 64L148 60Q130 62 116 52Z', // heavy head, open jaws
    'M122 14Q112 8 102 6Q108 20 120 28Z', 'M110 30Q100 24 94 24Q98 34 108 40Z', // horns
    'M86 100Q40 94 10 46Q4 26 18 32Q34 40 44 54Q40 34 52 26Q52 44 62 58Q66 40 78 36Q74 62 94 90Z', // big ribbed wing
    'M52 92L54 74L64 90Z', 'M70 88L74 70L82 88Z', 'M90 92L96 76L100 94Z', // back spikes
    carrierLeg(58, 130), carrierLeg(100, 130),
  ] },


  // Montblanc's big green Drac (centre of the photo), head to the left, a long body sloping down to a curled tail, a wing spread over
  // its back, spikes along it; held on its stand.
  'drac-montblanc': { vb: [20, 16], d: [
    'M6 52L30 38Q54 28 80 42L92 60L56 62L8 60Z', 'M10 68L56 68L90 64L84 84Q52 86 22 78Z', // jaws, open and toothed
    'M34 46L28 18L52 40Z', 'M70 40L88 28L84 54Z', // horn, ear
    'M64 48Q100 58 126 86Q160 114 186 130Q192 138 182 144Q150 144 110 132Q82 122 68 96Z', // neck and long body sloping to the tail
    'M92 84Q104 40 150 28Q168 22 184 28Q196 34 194 44Q188 48 176 48Q194 56 188 68Q176 74 162 70Q166 82 148 88Q140 96 124 96Z', // wing with a scalloped edge
    ring(170, 126, 14, 6), 'M118 114L94 150H104L128 120Z', 'M146 128L144 150H152L154 132Z', // tail curl, stand
    'M96 66L102 52L108 66Z', 'M116 76L124 62L128 78Z', 'M138 94L146 80L148 96Z', // spikes along the back
  ] },


});
