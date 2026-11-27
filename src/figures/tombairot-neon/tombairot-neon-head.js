// Expressive plush dragon head for El Tombairot (Gemini Neon version).
// High unobstructed yellow-ringed googly eyes, cheeky arched red brows, tall red crown crest,
// lush drooping pointed ears, bulbous plush snout with clear nostrils, friendly smile, white fangs
// and dangling red forked tongue. Every colour boundary has explicit clearance (zero coplanarity).
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';
import { TOMBAIROT_NEON_PAL as P, neonBoxC } from './tombairot-neon-palette.js';

export function buildTombairotNeonHead() {
  const head = new THREE.Group();
  head.name = 'head';
  const v = new Vox();

  // ---- Throat socket & stepped plush cranium (completely seals top neck knuckle)
  neonBoxC(v, 0, -0.02, -0.01, 0.276, 0.21, 0.27, P.headDark);
  neonBoxC(v, 0, 0.165, 0.02, 0.37, 0.37, 0.34, P.head);         // main skull (tall forehead)
  neonBoxC(v, 0, 0.095, 0.03, 0.42, 0.23, 0.26, P.head);         // plump friendly cheeks
  neonBoxC(v, 0, 0.165, -0.16, 0.292, 0.28, 0.11, P.head);       // rounded back of skull
  neonBoxC(v, 0, 0.375, 0.01, 0.29, 0.085, 0.24, P.head);        // crown dome

  // ---- Lowered narrow nose bridge swelling into a big, cheerful, bulbous plush snout
  // Kept below y = 0.21 so the high googly eyes stay 100% unobstructed from straight ahead.
  neonBoxC(v, 0, 0.085, 0.24, 0.26, 0.18, 0.19, P.head);         // nose bridge
  neonBoxC(v, 0, 0.188, 0.255, 0.15, 0.032, 0.14, P.headLight);  // subtle bridge highlight
  neonBoxC(v, 0, 0.070, 0.435, 0.39, 0.22, 0.26, P.head);        // bulbous snout core
  neonBoxC(v, 0, 0.068, 0.435, 0.44, 0.165, 0.18, P.head);       // snout side bulges
  neonBoxC(v, 0, 0.068, 0.580, 0.32, 0.17, 0.075, P.head);       // soft rounded snout nose
  neonBoxC(v, 0, 0.192, 0.44, 0.29, 0.048, 0.19, P.headLight);   // snout top highlight
  for (const s of [-1, 1]) {
    neonBoxC(v, s * 0.108, 0.145, 0.535, 0.088, 0.078, 0.088, P.head);   // nostril mound
    neonBoxC(v, s * 0.108, 0.125, 0.608, 0.048, 0.044, 0.038, P.black);  // clear front nostril
  }

  // ---- Friendly smiling mouth roof, curved red lip & cute white fangs (tucked inside green cheeks)
  neonBoxC(v, 0, -0.052, 0.32, 0.28, 0.032, 0.30, P.redDark);    // inner palate (hidden from sides)
  neonBoxC(v, 0, -0.045, 0.485, 0.32, 0.042, 0.13, P.red);       // warm smiling upper lip
  for (const s of [-1, 1]) {
    neonBoxC(v, s * 0.165, -0.015, 0.26, 0.075, 0.095, 0.16, P.head);     // green smiling cheek corners
    neonBoxC(v, s * 0.122, -0.082, 0.512, 0.044, 0.068, 0.036, P.white);  // cute outer fang
    neonBoxC(v, s * 0.048, -0.070, 0.524, 0.038, 0.046, 0.032, P.white);  // inner tooth
  }

  // ---- High, big, forward-facing googly eyes (warm yellow sockets + round-stepped white globes)
  const eyeConfigs = [
    { s: -1, wh: 0.138, cy: 0.315 },
    { s: 1, wh: 0.128, cy: 0.310 },
  ];
  for (const { s, wh, cy } of eyeConfigs) {
    const ex = s * 0.096;
    // Stepped octagon yellow eye-socket ring sunk into green forehead (clear of white & brow planes)
    neonBoxC(v, ex, cy, 0.186, 0.174, 0.158, 0.084, P.eyeRim);
    neonBoxC(v, ex, cy, 0.186, 0.142, 0.186, 0.084, P.eyeRim);
    // Plump white googly eyeball inset >= 6 mm from yellow edges & standing proud at z = +0.256
    neonBoxC(v, ex, cy, 0.226, 0.118, wh, 0.060, P.white);
    neonBoxC(v, ex, cy, 0.232, 0.100, wh + 0.012, 0.052, P.white);
  }

  // ---- Cheerful arched red eyebrows (proud of yellow rims, zero shared x/y/z planes)
  for (const s of [-1, 1]) {
    neonBoxC(v, s * 0.060, 0.424, 0.214, 0.058, 0.046, 0.072, P.red);  // inner start (clear gap at centre)
    neonBoxC(v, s * 0.118, 0.448, 0.210, 0.076, 0.050, 0.076, P.red);  // cheerful arch peak
    neonBoxC(v, s * 0.174, 0.414, 0.200, 0.054, 0.046, 0.070, P.red);  // outer flick (proud of eye rim)
  }

  // ---- Perky tall red crown crest + nape bumps curving back to meet the neck crest
  neonBoxC(v, 0, 0.455, 0.045, 0.092, 0.135, 0.125, P.red);       // crest base lobe
  neonBoxC(v, 0, 0.545, 0.068, 0.066, 0.080, 0.082, P.red);       // perky top tip (~2.98 m world)
  neonBoxC(v, 0, 0.395, -0.075, 0.082, 0.115, 0.095, P.red);      // rear crown bump
  neonBoxC(v, 0, 0.268, -0.182, 0.078, 0.110, 0.092, P.red);      // nape bump

  head.add(v.mesh());

  // ---- Rolling googly pupils (embedded 1 cm into white globes, zero floating or flicker)
  const pupils = eyeConfigs.map(({ s, cy }) => {
    const pg = new THREE.Group();
    pg.name = s < 0 ? 'pupilL' : 'pupilR';
    pg.position.set(s * 0.096, cy, 0.258);
    const pv = new Vox();
    neonBoxC(pv, 0, 0, 0, 0.052, 0.058, 0.024, P.black);
    pg.add(pv.mesh());
    head.add(pg);
    return pg;
  });

  // ---- Hinged lower jaw (pivots inside cheeks, tucked gently for a friendly overbite grin)
  const jaw = new THREE.Group();
  jaw.name = 'jaw';
  jaw.position.set(0, -0.068, 0.12);
  const jv = new Vox();
  neonBoxC(jv, 0, -0.032, 0.02, 0.27, 0.105, 0.18, P.headDark);   // internal hinge block
  neonBoxC(jv, 0, -0.072, 0.21, 0.30, 0.094, 0.28, P.head);       // chin body
  neonBoxC(jv, 0, -0.068, 0.365, 0.23, 0.080, 0.072, P.head);     // rounded chin tip
  neonBoxC(jv, 0, -0.015, 0.21, 0.25, 0.032, 0.25, P.redDark);    // mouth floor
  neonBoxC(jv, 0, -0.014, 0.352, 0.24, 0.040, 0.056, P.red);      // lower smiling lip
  jaw.add(jv.mesh());
  head.add(jaw);

  // ---- Iconic red forked tongue (llengua bífida hanging playfully from the smile)
  const tongue = new THREE.Group();
  tongue.name = 'tongue';
  tongue.position.set(0, -0.020, 0.33);
  const tv = new Vox();
  neonBoxC(tv, 0, -0.004, -0.01, 0.128, 0.042, 0.14, P.red);      // rooted into mouth floor
  neonBoxC(tv, 0, -0.074, 0.068, 0.132, 0.128, 0.048, P.red);     // hanging ribbon over lip
  for (const s of [-1, 1]) {
    neonBoxC(tv, s * 0.046, -0.165, 0.074, 0.060, 0.088, 0.042, P.red);  // upper fork branch
    neonBoxC(tv, s * 0.075, -0.228, 0.078, 0.046, 0.066, 0.036, P.red);  // pointed fork tip
  }
  tongue.add(tv.mesh());
  jaw.add(tongue);

  // ---- Lush, wide drooping pointed ears (fuller plush silhouette, plum underside clear of edges)
  const ears = [-1, 1].map(s => {
    const eg = new THREE.Group();
    eg.name = s < 0 ? 'earL' : 'earR';
    eg.position.set(s * 0.185, 0.245, -0.02);
    const ev = new Vox();
    neonBoxC(ev, s * 0.035, 0.00, 0.00, 0.135, 0.095, 0.145, P.head);
    neonBoxC(ev, s * 0.135, -0.018, 0.006, 0.135, 0.084, 0.132, P.head);
    neonBoxC(ev, s * 0.235, -0.042, 0.012, 0.125, 0.070, 0.105, P.head);
    neonBoxC(ev, s * 0.325, -0.068, 0.016, 0.100, 0.052, 0.070, P.head);
    // Warm dark-plum inner underside inset on all sides from green steps (zero coplanarity)
    neonBoxC(ev, s * 0.135, -0.055, 0.010, 0.120, 0.024, 0.082, P.earIn);
    neonBoxC(ev, s * 0.245, -0.074, 0.014, 0.090, 0.020, 0.058, P.earIn);
    eg.add(ev.mesh());
    head.add(eg);
    return eg;
  });

  return { head, jaw, tongue, ears, pupils };
}
