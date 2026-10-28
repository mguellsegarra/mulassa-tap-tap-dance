// Showreel proposals to compare on reel-review.html: each one replaces a figure's shot list in the page's frames only
// (game/showreel.js SHOWREELS stays as it is). Shots are [song beat, kind, 'cut' | 'glide', note]; the dance's parts are the
// ARRANGEMENT rows (Mulassa: game/dance.js; Drac: figures/drac/dance-drac.js). The view never turns faster than ~0.12 rad/s
// (the dizziness limit measured on the Studio Display); cuts still dissolve.

// Extra shot kinds, added to the frames' SHOT_KINDS. `part: '*'` names no node, so the close-up machinery frames her whole
// body with the long lens (a tighter shot without moving the camera in among the crowd).
export const KINDS = {
  vast: { az: [-0.05, 0.05], el: 0.55, fill: [0.38, 0.4] }, // the whole plaça, the crowd round her
  tight: { az: [0.2, 0.15], el: 0.3, fill: [0.82, 0.85], part: '*' }, // her whole body, long lens: flat, close
  side: { az: [-1.15, -1.05], el: 0.3, fill: [0.75, 0.75] }, // her profile (still on the camera's side of the action)
  low: { az: [0.3, 0.25], el: 0.12, fill: [0.85, 0.85] }, // from low down, looking up: heroic (needs EYE)
  tail: { az: [0.6, 0.55], el: 0.4, fill: [0.55, 0.55], part: 'tail' }, // the Mulassa's tail, close
  arcL: { az: [-0.9, -0.1], el: 0.3, fill: [0.72, 0.72] }, // the camera walks round her, from her left
  arcR: { az: [0.9, 0.1], el: 0.3, fill: [0.72, 0.72] }, // and from her right
  push: { az: [0.1, 0.1], el: 0.28, fill: [0.5, 0.88] }, // slowly in
  pull: { az: [0, 0], el: 0.45, fill: [0.9, 0.45] }, // slowly out, to the plaça
};
export const EYE = 2.1; // m: the lens may come this low for `low` (the game keeps it at 4, above the crowd's heads)

export const PROPOSALS = {
  mulassa: {
    A: { name: 'Frases', idea: 'Un tall a cada frase de 4 compassos (~6 s), alternant mida i costat: obert, tres quarts, teleobjectiu, de perfil, des de baix. Els talls cauen on ella està més quieta.', shots: [
      [0, 'vast', 'cut', 'la plaça sencera mentre espera'],
      [16, 'left', 'cut', 'A1: primera carrera, tres quarts'],
      [32, 'tight', 'cut', 'segona carrera, de prop amb teleobjectiu'],
      [48, 'right', 'cut', 'tercera, per l’altre costat'],
      [64, 'front', 'cut', 'quarta, de cara i baixa'],
      [84, 'arcR', 'cut', 'A2: el cercle, la càmera l’envolta'],
      [100, 'side', 'cut', 'la passada, de perfil'],
      [116, 'wide', 'cut', 'el redoble, obert'],
      [140, 'low', 'cut', 'B: les culades des de baix'],
      [160, 'right', 'cut', 'les culades, tres quarts'],
      [180, 'front', 'cut', 'C: les envestides cap a la càmera'],
      [196, 'tight', 'cut', 'les envestides, de prop'],
      [204, 'low', 'cut', 'X: els girs des de baix'],
      [220, 'tight', 'cut', 'el cop final, de prop'],
    ] },
    B: { name: 'Insercions', idea: 'Plans base llargs i, als accents, insercions curtes (3-4 s) de detall: el cap, la cua, des de baix. Com un concert filmat.', shots: [
      [0, 'wide', 'cut', 'la plaça'],
      [12, 'close', 'cut', 'inserció: el cap, a la represa'],
      [16, 'left', 'cut', 'A1, obert, tres quarts'],
      [44, 'tail', 'cut', 'inserció: la cua volant'],
      [52, 'front', 'cut', 'les carreres, de cara'],
      [84, 'high', 'cut', 'A2: el cercle'],
      [112, 'right', 'glide', 'la passada i el redoble'],
      [132, 'close', 'cut', 'inserció: el cap abans del gir'],
      [140, 'left', 'cut', 'B: les culades'],
      [164, 'tail', 'cut', 'inserció: la cua a les culades'],
      [172, 'wide', 'cut', 'C: les envestides'],
      [196, 'low', 'cut', 'inserció des de baix'],
      [204, 'right', 'cut', 'X: els girs'],
      [224, 'tight', 'cut', 'el cop final, de prop'],
    ] },
    C: { name: 'Càmera que balla', idea: 'Pocs talls; cada pla es mou a poc a poc: la càmera l’envolta, s’hi acosta o se n’allunya (≤ 0,08 rad/s).', shots: [
      [0, 'pull', 'cut', 'de prop, s’obre a la plaça'],
      [16, 'arcL', 'cut', 'A1: l’envolta per l’esquerra mentre corre'],
      [48, 'arcR', 'cut', 'l’envolta per la dreta'],
      [84, 'tight', 'cut', 'A2: el cercle, de prop'],
      [104, 'wide', 'cut', 'obert'],
      [140, 'low', 'cut', 'B: les culades des de baix'],
      [172, 'push', 'glide', 'C: s’hi acosta amb les envestides'],
      [204, 'side', 'cut', 'X: els girs de perfil'],
      [220, 'tight', 'cut', 'el cop final, de prop'],
    ] },
    D: { name: 'Videoclip', idea: 'Un canvi cada 2 compassos (~3 s), alternant extrems: tota la plaça, teleobjectiu, des de baix, de perfil, insercions del cap i la cua, i algun pla que l’envolta. Plans quiets o molt lents: el que marejava era la càmera girant, no el tall.', shots: [
      [0, 'vast', 'cut', 'la plaça sencera'],
      [16, 'left', 'cut', 'A1: la primera carrera'],
      [24, 'tight', 'cut', 'de prop'],
      [32, 'right', 'cut', 'la segona, per l’altre costat'],
      [40, 'low', 'cut', 'des de baix'],
      [48, 'vast', 'cut', 'la tercera, tota la plaça'],
      [56, 'front', 'cut', 'de cara'],
      [64, 'high', 'cut', 'la quarta, una mica des d’amunt'],
      [84, 'wide', 'cut', 'A2: el cercle, obert'],
      [100, 'side', 'cut', 'de perfil'],
      [108, 'right', 'cut', 'la passada'],
      [116, 'low', 'cut', 'el redoble, des de baix'],
      [124, 'wide', 'cut', 'obert'],
      [132, 'close', 'cut', 'inserció: el cap'],
      [140, 'left', 'cut', 'B: les culades'],
      [148, 'side', 'cut', 'les culades, de perfil'],
      [156, 'front', 'cut', 'de cara'],
      [164, 'tight', 'cut', 'de prop'],
      [172, 'high', 'cut', 'des d’amunt'],
      [180, 'low', 'cut', 'C: les envestides des de baix'],
      [188, 'right', 'cut', 'tres quarts'],
      [204, 'low', 'cut', 'X: els girs des de baix'],
      [212, 'tight', 'cut', 'de prop'],
      [220, 'front', 'cut', 'el cop final, de cara'],
    ] },
  },
  drac: {
    A: { name: 'Frases', idea: 'Un tall a cada part de la música, alternant mida i costat. Primers plans només on està quiet (0-10, 96-104).', shots: [
      [0, 'close', 'cut', 'les cares abans de començar'],
      [8, 'vast', 'cut', 'surt: la plaça sencera'],
      [24, 'left', 'cut', 'A2, tres quarts'],
      [42, 'tight', 'cut', 'B: les torsions, de prop amb teleobjectiu'],
      [56, 'right', 'cut', 'C'],
      [72, 'low', 'cut', 'D: l’arc i la càrrega, des de baix'],
      [96, 'close', 'cut', 'la mirada'],
      [104, 'side', 'cut', 'E: de perfil'],
      [116, 'wide', 'cut', 'E, obert'],
      [132, 'high', 'cut', 'B3 des de dalt'],
      [146, 'tight', 'cut', 'C3, de prop'],
      [162, 'left', 'cut', 'D3: el segon arc'],
      [178, 'front', 'cut', 'la segona càrrega, de cara'],
      [194, 'low', 'cut', 'E3: els girs des de baix, sense tallar'],
      [218, 'tight', 'cut', 'coda i el cop final'],
    ] },
    B: { name: 'Insercions', idea: 'Plans base llargs i insercions curtes als accents: des de baix, de prop. Els primers plans del cap, només quan està quiet.', shots: [
      [0, 'close', 'cut', 'les cares'],
      [8, 'wide', 'cut', 'surt'],
      [36, 'left', 'glide', 'camina i es torça'],
      [56, 'tight', 'cut', 'inserció de prop: C'],
      [64, 'front', 'cut', 'D: la càrrega cap a la càmera'],
      [96, 'close', 'cut', 'la mirada'],
      [104, 'right', 'cut', 'E'],
      [128, 'tight', 'cut', 'inserció: A3 de prop'],
      [136, 'wide', 'cut', 'B3'],
      [164, 'left', 'glide', 'el segon arc'],
      [188, 'high', 'cut', 'els girs'],
      [212, 'low', 'cut', 'inserció des de baix: frena i s’assenta'],
      [220, 'front', 'cut', 'el cop final, de cara'],
    ] },
    C: { name: 'Càmera que balla', idea: 'Pocs talls; la càmera l’envolta o s’hi acosta mentre balla. Els girs des de baix.', shots: [
      [0, 'close', 'cut', 'les cares'],
      [8, 'pull', 'cut', 'de prop, s’obre mentre surt'],
      [36, 'arcL', 'cut', 'l’envolta mentre camina i es torça'],
      [72, 'low', 'cut', 'D: la càrrega, des de baix'],
      [96, 'close', 'cut', 'la mirada'],
      [104, 'arcR', 'cut', 'E: l’envolta per l’altre costat'],
      [132, 'tight', 'cut', 'B3 de prop'],
      [150, 'wide', 'cut', 'obert'],
      [176, 'push', 'cut', 'D3: s’hi acosta'],
      [194, 'low', 'cut', 'els girs des de baix'],
      [214, 'front', 'glide', 'baixa a de cara per l’assentada'],
    ] },
    D: { name: 'Videoclip', idea: 'Un canvi cada 2 compassos (~3 s), alternant extrems: tota la plaça, teleobjectiu, des de baix, de perfil, i algun pla que l’envolta. Primers plans del cap només quan està quiet.', shots: [
      [0, 'close', 'cut', 'les cares'],
      [8, 'vast', 'cut', 'surt: tota la plaça'],
      [16, 'left', 'cut', 'A2'],
      [24, 'tight', 'cut', 'de prop'],
      [32, 'right', 'cut', 'per l’altre costat'],
      [42, 'side', 'cut', 'B: les torsions de perfil'],
      [56, 'front', 'cut', 'C de cara'],
      [64, 'high', 'cut', 'l’arc, una mica des d’amunt'],
      [80, 'low', 'cut', 'D: la càrrega cap a la càmera, des de baix'],
      [96, 'close', 'cut', 'la mirada'],
      [104, 'right', 'cut', 'E'],
      [112, 'tight', 'cut', 'de prop'],
      [120, 'wide', 'cut', 'obert'],
      [128, 'side', 'cut', 'A3 de perfil'],
      [136, 'left', 'cut', 'B3'],
      [146, 'tight', 'cut', 'C3 de prop'],
      [154, 'front', 'cut', 'de cara'],
      [162, 'wide', 'cut', 'D3: el segon arc, obert'],
      [178, 'low', 'cut', 'la segona càrrega, des de baix'],
      [186, 'side', 'cut', 'de perfil'],
      [194, 'low', 'cut', 'E3: els girs des de baix'],
      [214, 'tight', 'cut', 'frena, de prop'],
      [222, 'front', 'cut', 'el cop final, de cara'],
    ] },
  },
};

// Puts proposal `key` of figure `fig` into one game window, before its reel starts: the extra kinds, its shot list in place of
// the figure's, a lower lens for `low`, the Mulassa's head and tail named for close-ups. imp(path): that window's own import().
export async function applyProposal(fig, key, imp) {
  const prop = PROPOSALS[fig]?.[key];
  if (!prop) return;
  const [sr, { ORBIT }, figs, { mula }] = await Promise.all(['/src/game/showreel.js', '/src/scene/orbit.js', '/src/game/figures.js', '/src/figures/mulassa/mula-objects.js'].map(imp));
  Object.assign(sr.SHOT_KINDS, KINDS);
  const id = figs[{ mulassa: 'MULASSA', drac: 'DRAC' }[fig]].id;
  sr.SHOWREELS[id] = { ...sr.SHOWREELS[id], shots: prop.shots.map(x => x.slice(0, 3)) };
  if (prop.shots.some(x => x[1] === 'low')) ORBIT.eye = EYE;
  mula.head.name = 'head'; mula.tail.name = 'tail';
}
