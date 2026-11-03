// Showreel proposals to compare on reel-review.html, or in the game itself with ?reel=A|B|C (src/dev/reel-proposal.js): each one
// replaces a figure's shot list in that page only (game/showreel.js SHOWREELS stays as it is). Shots are [song beat, kind,
// 'cut' | 'glide', note]; the dance's parts are the ARRANGEMENT rows (Mulassa: game/dance.js; Drac: figures/drac/dance-drac.js).
// Round 2 (2026-11-03, «canvis de plans sense sentit»): every cut is placed on her movement, sampled from the running game
// (root path and facing per beat): on the beat a run starts after a turn, or where she stops, never in the middle of a run.
// The angle is picked from where she runs next: towards the lens (she grows in it) or across it (she crosses the frame).
// Her two running axes, seen from the play camera: the A1 runs, the A2 crossings and the Drac's A2/E go along one diagonal (seen
// head on from az ≈ -0.75, in profile from az ≈ +0.8); the Mulassa's third and fourth runs and her charges go along the other
// (head on from +0.8, in profile from -0.75). So two ground cameras either side cover every run.

// Extra shot kinds, added to SHOT_KINDS. el may be [from, to] (a crane); fixed: the camera stays where the cut put it and pans
// after her (scene/cameras.js fixedLens), a TV camera on its stand; enter it on a cut. `part: '*'`: her whole body through the
// long lens. label/color: for reel-review.html's legend.
const SIDE_L = -0.75, SIDE_R = 0.8;
export const KINDS = {
  // A · TV: fixed cameras round the plaça
  camWide: { az: [0, 0], el: 0.5, fill: [0.45, 0.45], fixed: true, color: '#4ea8de', label: 'càmera 1, balcó: tota la plaça (fixa)' },
  camL: { az: [SIDE_L, SIDE_L], el: 0.25, fill: [0.45, 0.45], fixed: true, color: '#b5e48c', label: 'càmera 2, a terra a l’esquerra (fixa, panoràmica)' },
  camR: { az: [SIDE_R, SIDE_R], el: 0.25, fill: [0.45, 0.45], fixed: true, color: '#99d98c', label: 'càmera 3, a terra a la dreta (fixa, panoràmica)' },
  camFront: { az: [0.05, 0.05], el: 0.22, fill: [0.4, 0.4], fixed: true, color: '#ffd166', label: 'càmera 4, de cara (fixa): la càrrega hi creix' },
  camLow: { az: [0.3, 0.3], el: 0.12, fill: [0.75, 0.75], eye: 2.1, fixed: true, color: '#e76f51', label: 'càmera baixa (fixa)' },
  camTight: { az: [0.15, 0.15], el: 0.28, fill: [0.72, 0.72], part: '*', fixed: true, color: '#f4a261', label: 'teleobjectiu fix: on balla quieta' },
  jibUp: { az: [-0.25, 0.05], el: [0.22, 0.5], fill: [0.72, 0.5], color: '#cdb4db', label: 'grua: puja i s’allunya a poc a poc' },
  jibOut: { az: [0, 0], el: [0.25, 0.55], fill: [0.8, 0.42], color: '#577590', label: 'grua final: amunt i enrere' },
  // B · musical: one long take per part, the camera rolling slowly with her
  trackL: { az: [-0.6, -0.25], el: 0.26, fill: [0.72, 0.72], color: '#43aa8b', label: 'travelling lent, per l’esquerra' },
  trackR: { az: [0.25, 0.6], el: 0.26, fill: [0.72, 0.72], color: '#4d908e', label: 'travelling lent, per la dreta' },
  pushLow: { az: [0.25, 0.2], el: 0.14, fill: [0.6, 0.86], eye: 2.1, color: '#f9c74f', label: 'des de baix, s’hi acosta (el redoble)' },
  spinLow: { az: [0.3, 0.3], el: 0.14, fill: [0.8, 0.8], eye: 2.1, color: '#e76f51', label: 'des de baix, quiet: els girs' },
  // C · music video: the cut answers each run
  tightL: { az: [-0.72, -0.7], el: 0.26, fill: [0.84, 0.84], part: '*', color: '#f4a261', label: 'teleobjectiu: ve cap a nosaltres (esquerra)' },
  tightR: { az: [0.78, 0.76], el: 0.26, fill: [0.84, 0.84], part: '*', color: '#f8961e', label: 'teleobjectiu: ve cap a nosaltres (dreta)' },
  profL: { az: [-0.78, -0.74], el: 0.3, fill: [0.75, 0.75], color: '#90be6d', label: 'de perfil: travessa (esquerra)' },
  profR: { az: [0.82, 0.78], el: 0.3, fill: [0.75, 0.75], color: '#99d98c', label: 'de perfil: travessa (dreta)' },
  lowL: { az: [-0.6, -0.55], el: 0.12, fill: [0.85, 0.85], eye: 2.1, color: '#e76f51', label: 'des de baix, ve cap a nosaltres' },
};

const IDEA = {
  A: 'Retransmissió de TV: cinc càmeres fixes al voltant de la plaça que panoramitzen. Quan corre cap a una càmera hi creix; quan passa per davant, travessa el pla. El realitzador talla a la càmera cap on anirà just quan gira. Una grua per al cercle i el final.',
  B: 'Musical: un pla llarg per part del ball, com a les pel·lícules de ball clàssiques. La càmera roda a poc a poc amb ella, puja amb la grua al cercle i s’acosta al redoble. Talla només quan canvia la música.',
  C: 'Videoclip amb motiu: més talls, però cadascun respon a un moviment. Si ve cap a nosaltres, teleobjectiu de cara; quan gira, tall a perfil; si s’atura, primer pla. Als girs, des de baix. La mida va de més obert a més tancat dins de cada part.',
};

export const PROPOSALS = {
  mulassa: {
    A: { name: 'Retransmissió', idea: IDEA.A, shots: [
      [0, 'camWide', 'cut', 'la plaça, esperant (balcó)'],
      [16, 'camL', 'cut', 'A1: la primera carrera ve cap a la càmera esquerra i hi creix'],
      [26, 'camR', 'cut', 'gira: travessa la plaça davant la dreta, anar i tornar'],
      [48, 'camWide', 'cut', 'canvia d’eix: el balcó ensenya el dibuix nou'],
      [58, 'camR', 'cut', 'carrera directa cap a la càmera dreta'],
      [74, 'camL', 'cut', 'gira: passa de perfil davant l’esquerra i hi torna'],
      [86, 'jibUp', 'cut', 'A2: el cercle; la grua puja per dibuixar-lo'],
      [110, 'camR', 'cut', 's’atura i travessa dues vegades'],
      [136, 'camLow', 'cut', 'la passada i el redoble, des de baix'],
      [144, 'camL', 'cut', 'B: les culades, mig pla'],
      [160, 'camTight', 'cut', 'les culades, teleobjectiu'],
      [176, 'camR', 'cut', 'C: l’envestida cap a la càmera dreta'],
      [188, 'camL', 'cut', 'gira i se’n va: la segueix l’esquerra'],
      [200, 'camFront', 'cut', 'travessa davant la càmera de cara'],
      [208, 'camLow', 'cut', 'X: els girs des de baix, sense tallar'],
      [224, 'jibOut', 'cut', 'el redoble i el cop final: la grua obre'],
    ] },
    B: { name: 'Musical', idea: IDEA.B, shots: [
      [0, 'vast', 'cut', 'la plaça'],
      [16, 'trackL', 'cut', 'A1: un sol pla per les dues primeres carreres; roda cap on corre'],
      [48, 'trackR', 'glide', 'canvia d’eix: la càmera llisca a l’altre costat amb ella'],
      [86, 'jibUp', 'cut', 'A2: el cercle des de la grua'],
      [110, 'trackR', 'cut', 'les dues travessades'],
      [136, 'pushLow', 'cut', 'el redoble: s’hi acosta des de baix'],
      [144, 'trackL', 'cut', 'B: les culades, roda lentíssim'],
      [176, 'front', 'cut', 'C: les envestides, de cara'],
      [208, 'spinLow', 'cut', 'X: els girs des de baix, quiet'],
      [224, 'jibOut', 'cut', 'el cop final: grua amunt i enrere'],
    ] },
    C: { name: 'Videoclip amb motiu', idea: IDEA.C, shots: [
      [0, 'vast', 'cut', 'la plaça'],
      [16, 'tightL', 'cut', 'A1: ve cap a nosaltres, teleobjectiu'],
      [26, 'profR', 'cut', 'gira: de perfil, travessa'],
      [42, 'lowL', 'cut', 'torna cap a la càmera, des de baix'],
      [50, 'vast', 'cut', 'canvi d’eix: tota la plaça'],
      [58, 'tightR', 'cut', 'carrera directa cap a la càmera'],
      [74, 'profL', 'cut', 'gira: de perfil'],
      [86, 'high', 'cut', 'A2: el cercle, una mica des d’amunt'],
      [112, 'profR', 'cut', 'travessa'],
      [130, 'tightL', 'cut', 'torna cap a la càmera'],
      [136, 'low', 'cut', 'la passada, des de baix'],
      [140, 'close', 'cut', 'quieta al redoble: el cap'],
      [144, 'side', 'cut', 'B: culades de perfil'],
      [152, 'tight', 'cut', 'de prop'],
      [160, 'high', 'cut', 'des d’amunt'],
      [168, 'low', 'cut', 'des de baix'],
      [176, 'tightR', 'cut', 'C: l’envestida cap a la càmera'],
      [188, 'profL', 'cut', 'gira i se’n va, de perfil'],
      [200, 'front', 'cut', 'travessa'],
      [208, 'low', 'cut', 'X: els girs des de baix'],
      [216, 'wide', 'cut', 'els girs, oberts'],
      [224, 'front', 'cut', 'el redoble i el cop final, de cara'],
    ] },
  },
  drac: {
    A: { name: 'Retransmissió', idea: IDEA.A, shots: [
      [0, 'close', 'cut', 'les cares, abans de començar'],
      [8, 'camWide', 'cut', 'surt: el balcó'],
      [16, 'camR', 'cut', 'A2: va i torna travessant davant la càmera dreta'],
      [28, 'camL', 'cut', 'canvia d’eix: passa de perfil davant l’esquerra'],
      [42, 'camTight', 'cut', 'B: les torsions, teleobjectiu quiet'],
      [56, 'camLow', 'cut', 'C: els cops de cap, des de baix'],
      [70, 'camFront', 'cut', 'D: la càrrega cap a la càmera de cara (hi creix) i l’arc'],
      [96, 'close', 'cut', 'la mirada'],
      [102, 'camR', 'cut', 'E: va i torna davant la dreta'],
      [132, 'jibUp', 'cut', 'B3: les voltes, la grua puja'],
      [146, 'camTight', 'cut', 'C3: els cops, de prop'],
      [162, 'camFront', 'cut', 'D3: la segona càrrega, la mateixa càmera que la primera'],
      [186, 'camLow', 'cut', 'E3: les voltes des de baix'],
      [214, 'jibOut', 'cut', 'frena, la coda i el cop final: la grua obre'],
    ] },
    B: { name: 'Musical', idea: IDEA.B, shots: [
      [0, 'close', 'cut', 'les cares'],
      [8, 'vast', 'cut', 'surt: la plaça'],
      [16, 'trackR', 'glide', 'A2: la càmera baixa i s’hi acosta mentre va i ve'],
      [42, 'tight', 'cut', 'B: les torsions, quiet i de prop'],
      [56, 'trackL', 'cut', 'C: els cops, mig pla que roda'],
      [70, 'jibUp', 'cut', 'D: la càrrega i l’arc des de la grua'],
      [96, 'close', 'cut', 'la mirada'],
      [102, 'trackR', 'cut', 'E: va i torna'],
      [132, 'pushLow', 'cut', 'B3: les voltes; s’hi acosta des de baix'],
      [146, 'trackL', 'cut', 'C3: els cops'],
      [162, 'jibUp', 'cut', 'D3: el segon arc, grua'],
      [186, 'spinLow', 'cut', 'E3: les voltes des de baix, quiet'],
      [214, 'jibOut', 'cut', 'la coda i el cop final'],
    ] },
    C: { name: 'Videoclip amb motiu', idea: IDEA.C, shots: [
      [0, 'close', 'cut', 'les cares'],
      [8, 'vast', 'cut', 'surt'],
      [16, 'profR', 'cut', 'A2: travessa'],
      [24, 'tightL', 'cut', 'gira i ve cap a nosaltres'],
      [28, 'profL', 'cut', 'canvi d’eix, de perfil'],
      [32, 'tightR', 'cut', 've cap a nosaltres'],
      [42, 'tight', 'cut', 'B: les torsions de prop'],
      [50, 'low', 'cut', 'des de baix'],
      [56, 'side', 'cut', 'C: els cops de cap, de perfil'],
      [66, 'close', 'cut', 'quiet: els caps'],
      [70, 'low', 'cut', 'D: la càrrega, des de baix'],
      [84, 'high', 'cut', 'l’arc de tornada, des d’amunt'],
      [96, 'close', 'cut', 'la mirada'],
      [102, 'profR', 'cut', 'E: travessa'],
      [114, 'tightL', 'cut', 'torna cap a la càmera'],
      [120, 'right', 'cut', 'camina'],
      [128, 'side', 'cut', 'A3'],
      [132, 'low', 'cut', 'B3: les voltes des de baix'],
      [140, 'high', 'cut', 'des d’amunt'],
      [146, 'tight', 'cut', 'C3: els cops de prop'],
      [154, 'side', 'cut', 'de perfil'],
      [162, 'low', 'cut', 'D3: la càrrega des de baix'],
      [176, 'high', 'cut', 'l’arc des d’amunt'],
      [186, 'low', 'cut', 'E3: les voltes des de baix'],
      [198, 'wide', 'cut', 'obert'],
      [208, 'side', 'cut', 'frena, de perfil'],
      [218, 'front', 'cut', 'la coda i el cop final, de cara'],
    ] },
  },
};

// Puts proposal `key` of figure `fig` into one game window: the extra kinds, its shot list in place of the figure's, the
// Mulassa's head named for close-ups. imp(path): that window's own import().
export async function applyProposal(fig, key, imp) {
  const prop = PROPOSALS[fig]?.[key];
  if (!prop) return;
  const [sr, figs, { mula }] = await Promise.all(['/src/game/showreel.js', '/src/game/figures.js', '/src/figures/mulassa/mula-objects.js'].map(imp));
  Object.assign(sr.SHOT_KINDS, KINDS);
  const id = figs[{ mulassa: 'MULASSA', drac: 'DRAC' }[fig]].id;
  sr.SHOWREELS[id] = { ...sr.SHOWREELS[id], shots: prop.shots.map(x => x.slice(0, 3)) };
  mula.head.name = 'head';
}
