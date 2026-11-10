// The Bou's music video on the plaça: «Mira el ball» films its dance with these cameras, free of the showreel's (bou-scene.js
// filmShot; edited with tools/dev/bou-clip.html; after the Mulassa's clip, tools/videoclip/shots.js on tool/videoclip-mulassa). A shot: az (rad; `rel`: round the heading it had when the
// shot began, else from the play camera's side of the plaça), el (rad above the floor), size (m of world across the
// frame's narrow side), y (m looked at), fov, each [from, to] over the shot.
// The lens aims at where the Bou is on average over 1.2 s, at a fixed height: it follows its path, never its bounce,
// waddle or see-saw (a lens that bobbed with it on every beat was unwatchable). Hard cuts, each on a bar's downbeat
// where a move starts or ends, and never into a shot that looks like the last one (far, middle and close take turns).
// `fixed`: the camera stays where its cut put it and pans (the Bou grows as it charges); `still`: it looks at the
// plaça's middle and does not move at all (the carried laps cross the frame); `ahead`: m in front of its middle (its head).
import { bouPose, newBouPose, BOU_TIMING } from './bou-dance.js';

export const BOU_CLIP_SHOTS = {
  // (the owner's rounds: arran de terra and with a wide lens the Bou read badly and the lens saw in under its skirt; in
  // profile its face was lost. So: long lenses (fov 30-38) from above the crowd's heads, always on its face's side)
  vast: { az: [-.1, .1], el: [.6, .55], size: [15, 13], y: 1, fov: 38, still: 1 },
  balcony: { az: [-.9, -.9], el: [.38, .38], size: [11, 11], y: 1.4, fov: 35, still: 1 },
  wide: { az: [-.2, -.12], el: [.42, .42], size: [8, 7.5], y: 1.1, fov: 34 },
  crane: { az: [.3, .45], el: [.36, .6], size: [6.5, 8.5], y: 1.2, fov: 34 },
  orbit: { az: [-.5, .1], el: [.42, .44], size: [6.8, 6.8], y: 1.1, fov: 34 },
  front: { az: [.35, .3], el: [.4, .4], size: [5.6, 5.2], y: 1.1, fov: 32, rel: 1 },
  charge: { az: [.3, .3], el: [.38, .38], size: [7, 7], y: 1.1, fov: 34, rel: 1, fixed: 1 },
  feet: { az: [.7, .65], el: [.2, .2], size: [2.8, 2.6], y: .3, fov: 30, rel: 1 },
  head: { az: [.4, .35], el: [.3, .3], size: [3, 2.8], y: 1.5, fov: 30, rel: 1, ahead: 1.2 },
  eyes: { az: [.3, .28], el: [.22, .22], size: [1.7, 1.5], y: 1.65, fov: 24, rel: 1, ahead: 1.6 },
};
// [song beat, shot] (what each answers, in Catalan for the owner: tools/dev/bou-clip.html). The feet only on the opening's leg passes (bars 1-2 and 5-6). The list ends on the
// last chord (BOU_CLIP_END): from there the game's own end shot comes down to the banknotes.
export const BOU_CLIP_CUTS = [
  [0, 'vast'],
  [8, 'feet'],
  [16, 'wide'],
  [24, 'feet'],
  [32, 'front'],
  [40, 'crane'],
  [56, 'vast'],
  [72, 'front'],
  [88, 'wide'],
  [100, 'head'],
  [108, 'charge'],
  [116, 'vast'], // (a camera following it stood in its way; a nearer still one lost it off the edge)
  [124, 'orbit'],
  [132, 'front'],
  [140, 'crane'],
  [156, 'orbit'],
  [172, 'charge'],
  [180, 'wide'],
  [188, 'front'],
  [196, 'eyes'],
  [204, 'wide'],
  [220, 'crane'],
  [232, 'vast'],
  [252, 'balcony'],
  [276, 'front'],
  [284, 'orbit'],
  [300, 'crane'],
];
export const BOU_CLIP_END = 316;
export const bouClipSec = b => { const T = BOU_TIMING.beats, i = Math.min(T.length - 2, Math.max(0, Math.floor(b))); return T[i] + (T[i + 1] - T[i]) * (b - i); };
export const bouClipCut = b => BOU_CLIP_CUTS.findLastIndex(c => c[0] <= b);

const clipPose = newBouPose(), clipAim = { x: 0, z: 0, lift: 0 }, clipNow = { x: 0, z: 0, lift: 0 }, clipFrom = { x: 0, z: 0, lift: 0 }, CLIP_MIDDLE = Object.freeze({ x: 0, z: 0, lift: 0 }), clipLerp = (v, u) => v[0] + (v[1] - v[0]) * u, clipEase = u => u * u * (3 - 2 * u);
const BOU_CLIP_CLEAR = 4.8, BOU_CLIP_REACH = 12; // m from the plaça's middle: inside its colla's marks (5.5 m) and the crowd's ring, so nobody stands at the lens; inside the façades
// its middle on average over 1.2 s round song second t, in its dance frame (lift: only what its colla carries it up)
function bouClipPath(t, out) {
  out.x = out.z = out.lift = 0;
  for (let k = -2; k <= 2; k++) { bouPose(Math.max(0, t + k * .3), clipPose); out.x += clipPose.x / 5; out.z += clipPose.z / 5; out.lift += Math.max(0, clipPose.lift - .25) / 5; }
  return out;
}
function clipWorld(time, o, c, s, hx, hz) { const p = bouClipPath(time, clipAim); o.x = p.x * c + p.z * s + hx; o.z = -p.x * s + p.z * c + hz; o.lift = p.lift; return o; }
// Places `camera` (the game's own) for song beat `beat`. frameYaw: the dance frame's turn on the plaça (bou.frame.rotation.y).
export function placeBouClip(camera, beat, frameYaw) {
  const i = Math.max(0, bouClipCut(beat)), [b0, kind] = BOU_CLIP_CUTS[i], b1 = BOU_CLIP_CUTS[i + 1]?.[0] ?? BOU_CLIP_END, d = BOU_CLIP_SHOTS[kind];
  const u = clipEase(Math.min(1, Math.max(0, (beat - b0) / (b1 - b0)))), t = bouClipSec(beat), t0 = bouClipSec(b0);
  const heading = d.rel ? bouPose(t0, clipPose).yaw + frameYaw : frameYaw + Math.PI / 4; // (the play camera looks in between its W and S)
  // its averaged middle on the plaça (the dance frame turned, `ahead` m in front of it), into `o`: no garbage per frame
  const c = Math.cos(frameYaw), s = Math.sin(frameYaw), hx = (d.ahead ?? 0) * Math.sin(heading), hz = (d.ahead ?? 0) * Math.cos(heading);
  const el = clipLerp(d.el, u), size = clipLerp(d.size, u), az = heading + clipLerp(d.az, d.fixed ? 0 : u);
  const now = d.still ? CLIP_MIDDLE : clipWorld(t, clipNow, c, s, hx, hz), from = d.fixed ? clipWorld(t0, clipFrom, c, s, hx, hz) : now;
  const aspect = camera.aspect, vfov = d.fov * Math.PI / 180, narrow = aspect < 1 ? 2 * Math.atan(Math.tan(vfov / 2) * aspect) : vfov;
  let dist = size / 2 / Math.tan(narrow / 2), fov = d.fov;
  // a low lens stays inside the crowd's ring (the public is the background, never a blur across the frame), a high one
  // inside the façades; where that stops it short, the lens opens instead
  const ux = Math.sin(az), uz = Math.cos(az), pb = from.x * ux + from.z * uz, r2 = from.x * from.x + from.z * from.z, clear = BOU_CLIP_CLEAR;
  const inRing = r2 > clear * clear ? BOU_CLIP_REACH : Math.max(3.5, -pb + Math.sqrt(pb * pb - (r2 - clear * clear))), high = clipEase(Math.min(1, Math.max(0, (el - .25) / .12))); // (from ~0.37 rad the lens looks over the heads: it may stand behind them)
  const reach = (inRing + (BOU_CLIP_REACH - inRing) * high) / Math.max(.2, Math.cos(el));
  if (dist > reach) { dist = reach; const n = 2 * Math.atan(size / 2 / dist); fov = Math.min(d.fov + 10, (aspect < 1 ? 2 * Math.atan(Math.tan(n / 2) / aspect) : n) * 180 / Math.PI); } // (never a wide lens: rather a tighter frame)
  const y = d.y + now.lift;
  camera.clearViewOffset(); camera.fov = fov;
  camera.position.set(from.x + ux * Math.cos(el) * dist, Math.max(.25, d.y + Math.sin(el) * dist), from.z + uz * Math.cos(el) * dist);
  camera.up.set(0, 1, 0); camera.lookAt(now.x, y, now.z); camera.updateProjectionMatrix();
  return i;
}
