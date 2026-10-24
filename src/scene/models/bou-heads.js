// Four simpler, comic heads for the Bou, in the Mulassa's spirit (scene/models/mulassa.js: a few big blocks, each
// moving part its own pivot). Proposals for Marc (2026-10-24); the p13 body stays. Each build returns its pivots and
// play(t): a looping gag on real seconds, for the dev viewer (tools/dev/bou.html?cap=a|b|c|d) until one is chosen.
import * as THREE from 'three';
import { Vox } from './voxel.js';

const K = {
  hide: '#6b3d31', light: '#8a5a48', dark: '#3a221d', nose: '#1f1a1a', pale: '#e2d2b4', horn: '#ece0c4',
  hornTip: '#3a3436', tube: '#c9a66b', white: '#f6f1e6', black: '#151010', mouth: '#5a1414', tongue: '#e8737f',
  gold: '#d9a521', red: '#b02a36', steam: '#f2efe9',
};
const clamp01 = x => Math.max(0, Math.min(1, x)), smooth01 = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const win = (t, a, b) => { const k = (t - a) / (b - a); return k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k) ** 2; };   // 0 -> 1 -> 0 over [a, b]
const group = (parent, x, y, z, vox) => { const g = new THREE.Group(); g.position.set(x, y, z); if (vox) g.add(vox.mesh()); parent.add(g); return g; };
// A horn as stepped blocks out to the side, optionally with the carretilla tube the real one carries on its tip.
function horn(v, s, x, y, z, span, rise, fwd, size, tube) {
  for (let k = 0; k <= 5; k++) { const t = k / 5, w = size * (1 - .4 * t);
    v.box(s * (x + span * t), y + rise * t * t, z + fwd * t, w, w, w, k > 3 ? K.hornTip : K.horn, 0); }
  if (tube) v.box(s * (x + span + .02), y + rise + .02, z + fwd, .06, .06, .22, K.tube, 0).box(s * (x + span + .02), y + rise + .02, z + fwd + .12, .065, .065, .025, K.red, 0);
}
const eye = (v, s, x, y, z, w, h) => v.box(s * x, y, z, .02, h, w, K.white, 0);

// A · «Bonàs»: a big square head, nose ring, floppy ears, B's big horns and odd googly eyes (Marc, 2026-10-24); every
// few seconds it gapes and lolls its tongue out, its eyes popping.
function bonas(neck) {
  const head = group(neck, 0, .2, .52), v = new Vox();   // up and forward: the chin clears the dewlap (bou-audit.mjs)
  v.box(0, -.26, .05, .58, .5, .5, K.hide).box(0, -.255, .38, .5, .255, .3, K.pale, 0);        // skull, pale muzzle (its underside the mouth's roof: none of it below the jaw's top)
  v.box(0, .2, .05, .62, .08, .2, K.dark, 0);                                                     // curly poll
  for (const s of [-1, 1]) {
    v.box(s * .11, -.12, .535, .09, .07, .02, K.nose, 0);                                         // nostrils
    // The selector's p13 horns (bou.js slimHead): stepped on a 3 cm grid so the faces never shimmer, a dark tip.
    const q = x => Math.round(x / .03) * .03;
    // Longer and more exaggerated (Marc): steps closer than the blocks are wide, so the horn reads as one piece.
    for (let k = 0; k <= 16; k++) { const t = k / 16, sz = q(.15 - .07 * t), e = t >= .75 ? .012 : 0;
      v.box(s * q(.27 + .7 * t), q(.06 + .36 * t * t) - e / 2, q(.06 + .1 * t), sz + e, sz + e, sz + e, e ? K.hornTip : K.horn, 0); }
  }
  v.box(0, -.265, .17, .44, .01, .6, K.mouth, 0);   // the mouth's roof (see the jaw)
  head.add(v.mesh());
  // Googly eyes, one bigger than the other, proud of the brow; each pupil rolls its own way.
  const eyes = [[-1, .18], [1, .14]].map(([s, w]) => group(head, s * .14, .12, .3, new Vox().box(0, -w / 2, 0, w, w, .1, K.white, 0)));   // popped, still under the brow's top
  const pupils = eyes.map(e => group(e, 0, 0, .052, new Vox().box(0, -.035, 0, .07, .07, .02, K.black, 0)));
  const ring = group(head, 0, -.15, .56, new Vox().box(0, -.1, 0, .14, .03, .03, K.gold, 0).box(-.06, -.1, 0, .03, .12, .03, K.gold, 0).box(.06, -.1, 0, .03, .12, .03, K.gold, 0));
  // The jaw hinges at its top back corner, under the back of the skull: opening, it stays joined there (Marc: a short
  // jaw hinged mid-head looked detached), and nothing of it is behind the hinge to rise into the skull. A dark roof
  // under the skull, 5 mm proud of it (no shared plane), is what shows inside the open mouth.
  const jaw = group(head, 0, -.26, -.15, new Vox().box(0, -.12, .315, .46, .12, .63, K.pale, 0).box(0, -.005, .33, .4, .02, .56, K.mouth, 0));
  // The tongue lies on the mouth's floor and its tip hinges over the lower lip, so it hangs from the mouth, joined.
  // Three links, each bending a third of the curl about its middle and overlapping the next: one unbroken tongue.
  const base = group(jaw, 0, .035, .47, new Vox().box(0, -.02, 0, .2, .04, .3, K.tongue, 0));
  const tongue = [0, 1, 2].reduce((links, i) => [...links, group(i ? links[i - 1] : jaw, 0, i ? 0 : .035, i ? .1 : .63,
    new Vox().box(0, -.02, .06, .19 - .02 * i, .04, .14, K.tongue, 0))], []);
  const ears = [-1, 1].map(s => group(head, s * .38, .02, -.08, new Vox().box(s * .06, -.08, 0, .26, .16, .1, K.hide).box(s * .07, -.06, .045, .16, .1, .02, K.pale, 0)));   // hinged clear of the skull
  // beat: the music's (the song's grid); without music a steady ~96 bpm of its own. All of it on the beat, smooth:
  // a nod on each, the head a side a beat, the ears flapping, and a big gape with the tongue out every six bars.
  return { head, jaw, ears, play(t, beat = t * 1.6) {
    const c = (1 + Math.cos(2 * Math.PI * beat)) / 2, dip = c * c, gape = win(beat % 24, 20, 23.6);   // every six bars (Marc: every two was too often)
    eyes.forEach((e, i) => { const k = 1 + .25 * gape * (i ? 1.4 : 1); e.scale.set(k, k, 1); });   // not deeper: into the brow
    pupils[0].position.set(.04 * Math.sin(t * 6), .04 * Math.cos(t * 6), .052);          // one spins round
    pupils[1].position.set(.03 * Math.sin(t * 2.3 + 1), .03 * Math.sin(t * 3.7), .052);  // the other wanders
    // gaping, it throws its head back: the open jaw clears the dewlap
    neck.rotation.x = .12 * dip - .05 - .22 * gape; head.rotation.z = .13 * Math.sin(Math.PI * beat);
    jaw.rotation.x = .55 * Math.min(1, gape * 1.6);
    // The tongue comes out with every gape (Marc). Out, it slides forward and thickens (gape .4-.7), then curls down
    // over the lip (.7-1); going back it does the same in reverse and thins away to nothing before it hides, so it
    // never vanishes in sight (Marc: it popped out of existence).
    const curl = clamp01((gape - .7) / .3), out = smooth01((gape - .4) / .3);
    tongue[0].position.z = .45 + .18 * out; base.position.z = tongue[0].position.z - .15;   // at the front of the mouth, clear of the skull by the hinge
    const k = Math.max(.01, out); tongue[0].scale.set(.4 + .6 * k, k, 1); base.scale.set(.4 + .6 * k, k, 1);   // thins away on the mouth's floor
    base.visible = tongue[0].visible = out > 0;
    tongue.forEach((l, i) => { l.rotation.x = .45 * curl; l.rotation.y = .12 * curl * Math.sin(t * 9 - i); });
    ears.forEach((e, i) => { e.rotation.z = (i ? 1 : -1) * (.15 + .35 * dip); });
    ring.rotation.x = -.25 - .25 * Math.sin(Math.PI * beat);   // swings out only: back past hanging it would sink into the muzzle
  } };
}

// B · «Coll llarg»: a little head with huge horns and googly eyes on a telescopic neck that shoots up to look round.
function periscope(neck) {
  const segs = []; [.44, .36, .3].reduce((parent, w, i) => (segs[i] = group(parent, 0, 0, 0, new Vox().box(0, -.35, 0, w, .5, w, i % 2 ? K.light : K.hide, 0))), neck);
  const head = group(segs[2], 0, .15, .05), v = new Vox();
  v.box(0, -.18, 0, .36, .34, .34, K.hide).box(0, -.2, .24, .3, .2, .2, K.pale, 0);
  for (const s of [-1, 1]) { v.box(s * .07, -.1, .345, .06, .05, .02, K.nose, 0); horn(v, s, .18, .08, 0, .5, .25, .08, .12, true); }
  head.add(v.mesh());
  // Googly eyes on top of the head: white cubes with pupils that roll.
  const pupils = [-1, 1].map(s => { group(head, s * .1, .16, .1, new Vox().box(0, 0, 0, .16, .16, .14, K.white, 0));
    return group(head, s * .1, .2, .18, new Vox().box(0, 0, 0, .07, .07, .02, K.black, 0)); });
  const jaw = group(head, 0, -.18, .02, new Vox().box(0, -.06, .16, .26, .06, .3, K.pale, 0));
  return { head, jaw, play(t) {
    const p = t % 6, up = win(p, .8, 4.6) ** .5, pop = Math.min(1, up * 1.4);
    segs[1].position.y = .02 + .32 * pop; segs[2].position.y = .02 + .32 * pop;   // out like a periscope, then back down
    neck.rotation.x = .1 - .3 * pop;
    head.rotation.y = pop * Math.sin(t * 1.7) * .9; head.rotation.z = pop * .15 * Math.sin(t * 3.1);
    pupils.forEach((q, i) => q.position.set((i ? .1 : -.1) + .035 * Math.sin(t * 7 + i * 2), .2 + .035 * Math.cos(t * 5 + i), .18));
    jaw.rotation.x = .3 * win(p, 4.4, 5.4);
  } };
}

// C · «Badoc»: a long, droopy mule-like face with heavy lids and buck teeth; its tongue goes up its nostril.
function badoc(neck) {
  const head = group(neck, 0, .02, .3), v = new Vox();
  v.box(0, -.22, 0, .46, .44, .4, K.hide).box(0, -.4, .3, .38, .34, .42, K.hide).box(0, -.42, .5, .36, .26, .16, K.pale, 0);
  v.box(0, .2, 0, .3, .1, .28, K.dark, 0).box(0, .28, .04, .14, .1, .14, K.dark, 0);            // a tuft sticking up
  for (const s of [-1, 1]) {
    v.box(s * .1, -.24, .585, .08, .08, .02, K.nose, 0);
    eye(v, s, .24, -.1, .06, .14, .12); v.box(s * .25, -.1, .1, .02, .06, .05, K.black, 0);
    horn(v, s, .23, .1, 0, .14, .2, -.04, .09, true);
    v.box(s * .25, .02, -.12, .26, .08, .1, K.hide);                                                // ears straight out
  }
  head.add(v.mesh());
  const lids = [-1, 1].map(s => group(head, s * .25, .02, .06, new Vox().box(0, -.12, 0, .04, .12, .16, K.dark, 0)));
  const jaw = group(head, 0, -.42, .3, new Vox().box(0, -.08, .1, .34, .08, .34, K.pale, 0).box(0, -.005, .22, .3, .02, .1, K.mouth, 0));
  group(head, 0, -.47, .57, new Vox().box(-.045, 0, 0, .07, .09, .02, K.white, 0).box(.045, 0, 0, .07, .09, .02, K.white, 0));   // buck teeth
  const tongue = group(jaw, 0, -.03, .26, new Vox().box(0, 0, .06, .12, .04, .14, K.tongue, 0).box(0, 0, .13, .1, .2, .04, K.tongue, 0));
  return { head, jaw, play(t) {
    const p = t % 6, lick = win(p, 2, 4.6), blink = win(t % 3.3, 0, .25);
    neck.rotation.x = .12 + .08 * Math.sin(t * 1.3); head.rotation.z = .12 * Math.sin(t * .9);
    lids.forEach(l => { l.scale.y = .45 + .55 * blink + .3 * lick; });   // half shut, closing while it licks
    jaw.rotation.x = .3 * lick; tongue.scale.y = lick; tongue.position.x = .1 * lick;   // up the right nostril
  } };
}

// D · «Rabiüt»: a low, wide, cross head with a unibrow, steaming nostrils and horns forward: it shakes and snorts.
function rabiut(neck) {
  const head = group(neck, 0, -.02, .32), v = new Vox();
  v.box(0, -.24, 0, .66, .42, .42, K.hide).box(0, -.26, .3, .5, .26, .2, K.pale, 0);
  for (const s of [-1, 1]) {
    v.box(s * .12, -.17, .405, .12, .1, .02, K.nose, 0).box(s * .12, -.15, .41, .06, .05, .02, K.red, 0);   // flared nostrils
    eye(v, s, .2, -.06, .2, .12, .1).box(s * .21, -.06, .24, .02, .06, .04, K.black, 0);
    horn(v, s, .3, .04, .04, .26, .08, .3, .11, true);
    v.box(s * .38, -.06, -.06, .12, .14, .1, K.hide);
  }
  for (let k = -2; k <= 2; k++) v.box(k * .1, .17, .02 + (k % 2) * .03, .1, .06, .1, K.dark, 0);   // curly poll
  head.add(v.mesh());
  const brow = group(head, 0, .09, .21), halves = [-1, 1].map(s => group(brow, s * .14, 0, 0, new Vox().box(0, 0, 0, .26, .07, .04, K.dark, 0)));
  const jaw = group(head, 0, -.26, .05, new Vox().box(0, -.1, .2, .5, .1, .3, K.hide).box(0, -.02, .34, .44, .06, .03, K.white, 0));   // underbite
  const puffs = [-1, 1].map(s => group(head, s * .12, -.12, .45, new Vox().box(0, 0, 0, .1, .1, .1, K.steam, 0)));
  return { head, jaw, play(t) {
    const p = t % 4, shake = win(p, 1.4, 2.6), snort = (t * .9) % 1;
    neck.rotation.x = .35 * win(p, .4, 3) - .05; head.rotation.y = .35 * shake * Math.sin(t * 22);
    halves.forEach((h, i) => { h.rotation.z = (i ? 1 : -1) * (.15 + .2 * win(p, .2, 3.2)); });
    jaw.rotation.x = .18 * Math.max(0, Math.sin(t * 12)) * shake;
    puffs.forEach((q, i) => { const k = (snort + i * .1) % 1; q.position.set((i ? .12 : -.12) * (1 + k), -.12 - .1 * k, .45 + .4 * k); q.scale.setScalar(k < .02 ? .001 : .4 + 1.6 * k * (1 - k) * 2); });
  } };
}

export const BOU_HEADS = { a: ['Bonàs', bonas], b: ['Coll llarg', periscope], c: ['Badoc', badoc], d: ['Rabiüt', rabiut] };   // i18n-ok: dev viewer labels only

// Neck pivot on the chest, above the dewlap: the head and its gags hang off it.
export function buildBouHead(key, body) {
  const neck = new THREE.Group(); neck.position.set(0, .72, 1.15); body.add(neck);
  // Upper part into the skull, lower part stepped back from the jaw's hinge: the open jaw's back swings back there.
  if (key !== 'b') neck.add(new Vox().box(0, -.1, .1, .5, .26, .56, K.hide).box(0, -.24, -.01, .48, .16, .42, K.hide).mesh());   // under the head, clear of the horns' roots
  const cap = BOU_HEADS[key][1](neck); cap.head.scale.setScalar(1.35);   // big-headed, as the Mulassa's (1.3)
  return { neck, ...cap };
}
