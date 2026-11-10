// The Bou's music video on the plaça (tools/dev/bou-clip.html): its own cameras, free of the game's (after the Mulassa's
// clip, tools/videoclip/shots.js on tool/videoclip-mulassa). A shot: az (rad; `rel`: round the heading it had when the
// shot began, else from the play camera's side of the plaça), el (rad above the floor), size (m of world across the
// frame's narrow side), y (m looked at), fov, each [from, to] over the shot.
// The lens aims at where the Bou is on average over 1.2 s, at a fixed height: it follows its path, never its bounce,
// waddle or see-saw (a lens that bobbed with it on every beat was unwatchable). Hard cuts, each on a bar's downbeat
// where a move starts or ends, and never into a shot that looks like the last one (far, middle and close take turns).
// `fixed`: the camera stays where its cut put it and pans (the Bou grows as it charges); `still`: it looks at the
// plaça's middle and does not move at all (the carried laps cross the frame); `ahead`: m in front of its middle (its head).
import { bouPose, newBouPose } from '../../../src/figures/bou/bou-dance.js';
import song from '../../../src/song-bou.json' with { type: 'json' };

export const SHOTS = {
  // (the owner's rounds: arran de terra and with a wide lens the Bou read badly and the lens saw in under its skirt; in
  // profile its face was lost. So: long lenses (fov 30-38) from above the crowd's heads, always on its face's side)
  vast: { az: [-.1, .1], el: [.6, .55], size: [15, 13], y: 1, fov: 38, still: 1, color: '#4ea8de', label: 'tota la plaça, quieta' },
  balcony: { az: [-.9, -.9], el: [.38, .38], size: [11, 11], y: 1.4, fov: 35, still: 1, color: '#b5e48c', label: 'quieta, des d’un balcó de l’altre costat' },
  wide: { az: [-.2, -.12], el: [.42, .42], size: [8, 7.5], y: 1.1, fov: 34, color: '#8ec5ff', label: 'obert, el segueix' },
  crane: { az: [.3, .45], el: [.36, .6], size: [6.5, 8.5], y: 1.2, fov: 34, color: '#cdb4db', label: 'grua: puja a poc a poc' },
  orbit: { az: [-.5, .1], el: [.42, .44], size: [6.8, 6.8], y: 1.1, fov: 34, color: '#43aa8b', label: 'l’envolta a poc a poc' },
  front: { az: [.35, .3], el: [.4, .4], size: [5.6, 5.2], y: 1.1, fov: 32, rel: 1, color: '#ffd166', label: 'de cara, una mica de costat' },
  charge: { az: [.3, .3], el: [.38, .38], size: [7, 7], y: 1.1, fov: 34, rel: 1, fixed: 1, color: '#f4a261', label: 'càmera fixa per sobre de la colla: li ve de cara' },
  feet: { az: [.7, .65], el: [.2, .2], size: [2.8, 2.6], y: .3, fov: 30, rel: 1, color: '#ffafcc', label: 'els peus dels portadors, de prop' },
  head: { az: [.4, .35], el: [.3, .3], size: [3, 2.8], y: 1.5, fov: 30, rel: 1, ahead: 1.2, color: '#ff8fa3', label: 'el cap' },
  eyes: { az: [.3, .28], el: [.22, .22], size: [1.7, 1.5], y: 1.65, fov: 24, rel: 1, ahead: 1.6, color: '#ff5d8f', label: 'primer pla dels ulls' },
};
// [song beat, shot, what it answers]. The feet only on the opening's leg passes (bars 1-2 and 5-6). The list ends on the
// last chord (CLIP_END): from there the game's own end shot comes down to the banknotes.
export const CUTS = [
  [0, 'vast', 'la plaça, el Bou al mig esperant'],
  [8, 'feet', 'c.1-2: les dues passes de cama'],
  [16, 'wide', 'mitja volta sobre la gropa'],
  [24, 'feet', 'c.5-6: les passes de cama, ara mirant a l’altra banda'],
  [32, 'front', 'torna a girar cap a nosaltres'],
  [40, 'crane', 'la volta sencera, davant i cua amunt i avall: la grua puja'],
  [56, 'vast', 'desfà la volta (aquí canvia de sentit): tota la plaça, quieta'],
  [72, 'front', 'c.18-21: pren embranzida, envesteix i derrapa'],
  [88, 'wide', 'arrenca cap a l’altra banda i torna al mig'],
  [100, 'head', 'quiet abans del techno: el cap'],
  [108, 'charge', 'TECHNO: envestida a W, cap a la càmera'],
  [116, 'vast', 'envestida de costat a S i tornada: tota la plaça'], // (a camera following it stood in its way; a nearer still one lost it off the edge)
  [124, 'orbit', 'envestida a N i tornada'],
  [132, 'front', 'la diagonal'],
  [140, 'crane', 'passes de cama, envestida, derrapada i mitja volta'],
  [156, 'orbit', 'volta i quart tornant al mig'],
  [172, 'charge', 'envestida a S, cap a la càmera, i derrapada'],
  [180, 'wide', 'recula girant'],
  [188, 'front', 'el calderó: passes curtes i canvis de pes'],
  [196, 'eyes', 'el calderó: quiet, respira (els ulls)'],
  [204, 'wide', 'arrenca a poc a poc i obre l’arc'],
  [220, 'crane', 'la volta d’anada i tornada'],
  [232, 'vast', 'la colla l’aixeca; primera volta a coll amb la serp de públic'],
  [252, 'balcony', 'segona volta, des de l’altre costat i de lluny'],
  [276, 'front', 'el deixen a terra, rebota; la colla se’n va'],
  [284, 'orbit', 'DISCO FINAL: gira sobre si mateix, la càmera l’envolta a poc a poc'],
  [300, 'crane', 'els últims girs: la grua puja'],
];
export const CLIP_END = 316;
// the dance on its song beats (figures/bou/bou-dance.js, source bars), for the editor's lane
export const PARTS = [[0, 'entrada'], [8, 'passes de peus'], [16, 'mitja volta'], [24, 'passes (girat)'], [32, 'mitja volta'], [40, 'volta, davant i cua'], [56, 'desfà la volta'],
  [76, 'envestida a W'], [88, 'envestida a E'], [104, 'espera'], [108, 'TECHNO W'], [116, 'S'], [124, 'N'], [132, 'diagonal'], [140, 'passes i envestida'], [156, 'volta i quart'],
  [172, 'envestida a S'], [188, 'calderó'], [204, 'arrencada lenta'], [220, 'volta'], [232, 'l’aixequen'], [239, 'FESTA: dues voltes a coll'], [276, 'el deixen'], [284, 'DISCO FINAL: girs'], [316, 'cop final']];

const B = song.beats;
export const secAt = b => { const i = Math.min(B.length - 2, Math.max(0, Math.floor(b))); return B[i] + (B[i + 1] - B[i]) * (b - i); };
export const cutAt = b => CUTS.findLastIndex(c => c[0] <= b);

const P = newBouPose(), A = { x: 0, z: 0, lift: 0 }, lerp = (v, u) => v[0] + (v[1] - v[0]) * u, ease = u => u * u * (3 - 2 * u);
const CLEAR = 4.8, REACH = 12; // m from the plaça's middle: inside its colla's marks (5.5 m) and the crowd's ring, so nobody stands at the lens; inside the façades
// its middle on average over 1.2 s round song second t, in its dance frame (lift: only what its colla carries it up)
function pathAt(t, out) {
  out.x = out.z = out.lift = 0;
  for (let k = -2; k <= 2; k++) { bouPose(Math.max(0, t + k * .3), P); out.x += P.x / 5; out.z += P.z / 5; out.lift += Math.max(0, P.lift - .25) / 5; }
  return out;
}
// Places `camera` (the game's own) for song beat `beat`. frameYaw: the dance frame's turn on the plaça (bou.frame.rotation.y).
export function placeClip(camera, beat, frameYaw) {
  const i = Math.max(0, cutAt(beat)), [b0, kind] = CUTS[i], b1 = CUTS[i + 1]?.[0] ?? CLIP_END, d = SHOTS[kind];
  const u = ease(Math.min(1, Math.max(0, (beat - b0) / (b1 - b0)))), t = secAt(beat), t0 = secAt(b0);
  const heading = d.rel ? bouPose(t0, P).yaw + frameYaw : frameYaw + Math.PI / 4; // (the play camera looks in between its W and S)
  const world = (p, o) => { const c = Math.cos(frameYaw), s = Math.sin(frameYaw), x = p.x * c + p.z * s + (d.ahead ?? 0) * Math.sin(heading), z = -p.x * s + p.z * c + (d.ahead ?? 0) * Math.cos(heading); o.x = x; o.z = z; return o; };
  const el = lerp(d.el, u), size = lerp(d.size, u), az = heading + lerp(d.az, d.fixed ? 0 : u);
  const now = d.still ? { x: 0, z: 0, lift: 0 } : world(pathAt(t, A), { lift: A.lift }), from = d.fixed ? world(pathAt(t0, A), { lift: 0 }) : now;
  const aspect = camera.aspect, vfov = d.fov * Math.PI / 180, narrow = aspect < 1 ? 2 * Math.atan(Math.tan(vfov / 2) * aspect) : vfov;
  let dist = size / 2 / Math.tan(narrow / 2), fov = d.fov;
  // a low lens stays inside the crowd's ring (the public is the background, never a blur across the frame), a high one
  // inside the façades; where that stops it short, the lens opens instead
  const ux = Math.sin(az), uz = Math.cos(az), pb = from.x * ux + from.z * uz, r2 = from.x * from.x + from.z * from.z, clear = CLEAR;
  const inRing = r2 > clear * clear ? REACH : Math.max(3.5, -pb + Math.sqrt(pb * pb - (r2 - clear * clear))), high = ease(Math.min(1, Math.max(0, (el - .25) / .12))); // (from ~0.37 rad the lens looks over the heads: it may stand behind them)
  const reach = (inRing + (REACH - inRing) * high) / Math.max(.2, Math.cos(el));
  if (dist > reach) { dist = reach; const n = 2 * Math.atan(size / 2 / dist); fov = Math.min(d.fov + 10, (aspect < 1 ? 2 * Math.atan(Math.tan(n / 2) / aspect) : n) * 180 / Math.PI); } // (never a wide lens: rather a tighter frame)
  const y = d.y + (now.lift ?? 0);
  camera.clearViewOffset(); camera.fov = fov;
  camera.position.set(from.x + ux * Math.cos(el) * dist, Math.max(.25, d.y + Math.sin(el) * dist), from.z + uz * Math.cos(el) * dist);
  camera.up.set(0, 1, 0); camera.lookAt(now.x, y, now.z); camera.updateProjectionMatrix();
  return i;
}
