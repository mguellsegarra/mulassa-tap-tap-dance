// The clip's edit: which shot is on at t and where each format's camera stands for it. One cut list for every format;
// each format backs the camera off (or opens the lens) until the shot's subject fits its narrower side, so a 9:16 frame
// keeps her whole body and gains sky and floor instead of losing her flanks.
// A shot: az (rad round her: from her heading for a `part`, else from the plaça's front, +z), el (rad above the floor),
// size (m of world across the frame's narrow side), y (m looked at) or part (the rig node followed), fov (deg), roll
// (rad, a dutch tilt), each [from, to] over the shot. Every cut draws its own variation (side,
// height, size), so a kind of shot never comes back the same.
import * as THREE from 'three';
import { seeded } from './grid.js';
import edit from './edit.json';

export const SHOTS = {
  vast: { az: [0, .2], el: [.85, .7], size: [15, 11], y: 1, fov: 42 }, // the whole plaça, slowly closer (lower, a 9:16 frame was half heads)
  top: { az: [0, .6], el: [1.38, 1.38], size: [11, 9], y: 0, fov: 45 }, // straight down: the floor's rings round her
  crane: { az: [-.3, .3], el: [.08, .8], size: [6, 12], y: 1.4, fov: 45 }, // from the floor up and away
  wide: { az: [-.15, .15], el: [.22, .2], size: [9, 8], y: 1.3, fov: 42 },
  side: { az: [-.75, -.6], el: [.16, .14], size: [6.5, 6], y: 1.5, fov: 40, flip: 1 },
  track: { az: [-1.3, -.2], el: [.12, .12], size: [6, 6], y: 1.4, fov: 40, flip: 1 }, // alongside her, swinging round
  low: { az: [.3, .15], el: [.02, .05], size: [6.5, 6], y: 1.9, fov: 62, flip: 1 }, // from the floor, the beams above
  back: { az: [Math.PI - .5, Math.PI - .3], el: [.04, .06], size: [7, 6.5], y: 2, fov: 55, flip: 1 }, // against the light: her silhouette
  dutch: { az: [.45, .55], el: [.18, .14], size: [5.5, 5], y: 1.7, fov: 40, roll: [.22, .3], flip: 1 },
  head: { az: [1.05, .9], el: [.05, .05], size: [3.4, 3], part: 'head', fov: 32, flip: 1 }, // her head (followed) from the side: her eyes are on its sides (from the front she had none)
  feet: { az: [-.4, -.2], el: [.08, .1], size: [2.8, 2.4], y: .3, fov: 35, flip: 1 }, // the carriers' shoes on the lit tiles (aimed at the shoes' middle)
  orbit: { az: [-1, .5], el: [.25, .32], size: [7, 7], y: 1.4, fov: 42, flip: 1 }, // a slow walk round her
  spin: { az: [0, 2.4], el: [.2, .2], size: [6.5, 6.5], y: 1.5, fov: 48, flip: 1 }, // a fast circle round her
  push: { az: [0, 0], el: [.2, .1], size: [10, 3.6], y: 1.6, fov: 42 }, // the build's end: rushing in
  hero: { az: [-.9, .5], el: [.04, .1], size: [6.5, 5.5], y: 2, fov: 55 }, // the melody comes in: from the floor, a slow sweep under her and the beams
  // the entrance (rel: round her heading, she is walking in): her shoes among the crowd's, her coming at us through the
  // people making way, her back against the follow spot
  // the opening (aimed from behind her, the lens looked at the backs of the crowd she was still in)
  plaza: { az: [.55, .45], el: [.4, .36], size: [8, 7], y: 1.4, fov: 45, flip: 1 }, // on her way in through the people, from inside the ring, to one side and a little above
  enFeet: { az: [-1.25, -1.05], el: [.05, .07], size: [3, 2.7], y: .35, fov: 38, rel: 1, flip: 1 },
  enFront: { az: [.6, .5], el: [.16, .18], size: [8, 6.5], y: 1.6, fov: 45, rel: 1, flip: 1 }, // three-quarter (head on, her eyes, on the sides of her head, did not show)
  enBack: { az: [Math.PI - .25, Math.PI - .1], el: [.12, .1], size: [7, 6], y: 1.8, fov: 48, rel: 1, flip: 1 },
  cheer: { az: [Math.PI - .4, Math.PI - .7], el: [.1, .12], size: [10, 9], y: 1.6, fov: 50, flip: 1 }, // the crowd behind her, arms up
};
// per section kind: shots (cycled from a different place each phrase) and how many beats each lasts
const PLAN = {
  // seq: a shot every `beats` (2 bars: the motif's phrasing) dipping through black between them, up to edit.json's first
  // cut in the run; long: from each such cut on, one shot to the next; fadeOut: beats to black at the run's end
  intro: { seq: ['plaza', 'enFront', 'head', 'enFront', 'side', 'enFeet', 'enBack'], // (from behind only once she is through: among the people the lens was in their backs)
    beats: 8, long: ['hero'] }, // (no shots from above here: dark and still, they looked bad) // (her feet only once she is past the people: among them the lens was all legs)
  break: { beats: 16, shots: ['orbit', 'head', 'back', 'feet', 'crane'] },
  vocal: { beats: 8, shots: ['head', 'orbit', 'back', 'dutch', 'side'] },
  build: { beats: 8, shots: ['wide', 'track', 'feet', 'side', 'low', 'dutch', 'head'] },
  hard: { beats: 4, shots: ['low', 'top', 'dutch', 'spin', 'back', 'feet', 'wide'] }, // (no head: following it while she runs swings the lens)
  drop: { beats: 8, shots: ['top', 'low', 'spin', 'track', 'back', 'dutch', 'wide', 'side', 'crane'] }, // (4-beat shots swinging round her made the owner dizzy)
  outro: { seq: ['head', 'cheer', 'enBack', 'orbit', 'vast'], beats: 8, fadeOut: 3 },
};

// shot on at t, with its cut's start beat (the variation's seed) and progress u
export function shotAt(g, t, labelOf) {
  const ph = g.phraseAt(t), label = labelOf(ph.index) ?? ph.label, plan = PLAN[label] ?? PLAN.build, len = ph.end - ph.beat;
  const at = (name, cut, beats) => ({ name, u: (ph.beatIn - cut) / beats, label, cut: ph.beat + cut, beats });
  const left = len - ph.beatIn, next = labelOf(ph.index + 1) ?? g.phrases[ph.index + 1]?.label;
  // a shout: from the floor, up at her rearing, until the plan's next cut at least 3 beats on (a 2-beat shout shot left
  // splinters of the shot it cut into: 0.1 s flashes)
  const sh = g.shout(t), grid = label === 'build' && (next === 'drop' || next === 'hard') ? 4 : plan.beats ?? 8;
  if (sh.index >= 0 && !plan.seq && !plan.long) {
    const sb = g.beatAt(t - sh.s) - ph.beat, end = Math.min(len, Math.ceil((sb + 3) / grid) * grid);
    const from = sb - Math.floor(sb / grid) * grid < 2 ? Math.floor(sb / grid) * grid : sb; // (the same shot as the one opened just before it, below)
    if (sb >= 0 && ph.beatIn < end) return at(sh.index % 2 ? 'head' : 'low', from, end - from);
    // a shout coming under 2 beats after a cut: its shot starts at that cut (no splinter before it)
    const ns = g.clip.shouts?.[sh.index + 1], nb = ns == null ? NaN : g.beatAt(ns) - ph.beat, c0 = Math.floor(nb / grid) * grid;
    if (nb < len && nb - c0 < 2 && ph.beatIn >= c0 && ph.beatIn < nb) return at((sh.index + 1) % 2 ? 'head' : 'low', c0, Math.min(len, Math.ceil((nb + 3) / grid) * grid) - c0);
  }
  if (plan.seq || plan.long) { // the whole run of this kind as one piece (its 8-bar chunks made cuts nobody asked for)
    const run = g.runOf(ph.index, labelOf), b = Math.max(0, g.beatAt(t)), DIP = .5; // beats of black each side of a dip
    const owner = edit.cuts.map(g.beatAt).filter(c => c > run.beat + 4 && c < run.end - 4), seqEnd = plan.seq ? owner[0] ?? run.end : run.beat;
    const cuts = []; for (let c = run.beat; c < seqEnd - 2; c += plan.beats) cuts.push(c); // (not 2 beats short of an owner's cut: a blink of a shot)
    cuts.push(...owner.filter(c => c >= seqEnd));
    const k = cuts.findLastIndex(c => c <= b), from = cuts[k], to = cuts[k + 1] ?? run.end, inSeq = from < seqEnd;
    const name = inSeq ? plan.seq[k % plan.seq.length] : plan.long[(k - cuts.findIndex(c => c >= seqEnd)) % plan.long.length];
    // through black: into and out of each cut of the sequence, out of the run's start, into its end with fadeOut
    let dip = 0;
    if (inSeq) dip = Math.max(0, 1 - (b - from) / DIP, to <= seqEnd && to < run.end ? 1 - (to - b) / DIP : 0);
    if (plan.fadeOut) dip = Math.max(dip, 1 - (run.end - b) / plan.fadeOut);
    return { name, u: (b - from) / (to - from), label, cut: from, beats: to - from, dip: Math.min(1, dip) };
  }
  if (label === 'build' && (next === 'drop' || next === 'hard') && left <= 8) { // the run-up: a cut every two beats, then every beat, then the push in
    if (left <= 4) return at('push', len - 4, 4);
    const step = 4, k = Math.floor(ph.beatIn / step) * step, alt = ['low', 'dutch', 'feet', 'head', 'side', 'back'];
    return at(alt[(k / step + ph.index) % alt.length], k, step);
  }
  if (label === 'drop' && ph.beatIn % 16 >= 12) { // every fourth bar (her spin): one held shot of it (a cut a beat was a strobe)
    const k = Math.floor(ph.beatIn / 4) * 4, names = ['low', 'top', 'back', 'wide'];
    return at(names[(k / 4 + ph.index) % 4], k, 4);
  }
  const k = Math.floor(ph.beatIn / plan.beats), cut = k * plan.beats, name = plan.shots[(k + ph.index * 3) % plan.shots.length];
  return at(name, cut, Math.min(plan.beats, len - cut));
}

const TURN = .12, MAX_REACH = 12.5, CLEAR = 6.5, HIGH = .5; // m along the floor: inside the façades; the crowd's free ring (crowd.js inner 7.2); rad: a high shot
const P = new THREE.Vector3(), lerp = (a, b, u) => a + (b - a) * u, ease = u => u * u * (3 - 2 * u);
const pair = (v, u) => (v ? lerp(v[0], v[1], u) : 0);
// place `camera` for the shot at t, aimed at her (`at`: x, z, yaw), for a frame of `aspect`
export function placeCamera(camera, g, t, at, aspect, labelOf, parts = {}) {
  const s = shotAt(g, t, labelOf), d = SHOTS[s.name], u = ease(Math.max(0, Math.min(1, s.u)));
  const [sb, sn] = edit.beatShift ?? [Infinity, 0], fullCut = s.cut >= sb ? s.cut + sn : s.cut; // (the full song's beat: the song's cut must not change a shot's angle)
  const rnd = seeded(Math.round(fullCut * 7) + s.name.length * 131), side = d.flip && rnd() < .5 ? -1 : 1;
  // the turn a shot makes is capped at TURN rad a beat (a spin shot swung 2.4 rad in four beats: dizzying)
  const span = Math.abs(d.az[1] - d.az[0]), k = Math.min(1, TURN * (s.beats ?? 8) / (span || 1)), azd = [d.az[0], d.az[0] + (d.az[1] - d.az[0]) * k];
  const az = pair(azd, u) * side + (rnd() - .5) * .3, el = Math.max(0, pair(d.el, u) + (d.el[0] < HIGH ? (rnd() - .5) * .06 : 0));
  const size = pair(d.size, u) * (.9 + rnd() * .2), roll = pair(d.roll, u) * side;
  // a shot round her heading takes the heading she had when it began and keeps it (following it swung the lens at 200°/s in her turns)
  const heading = d.rel || d.part ? parts.yawAt?.(g.timeAt(s.cut)) ?? at.yaw : 0;
  // aimed at her body's middle, not her pivot (the head reaches far forward: a 9:16 frame had her body off to one side)
  const c = (d.y < .5 && parts.feet) || parts.centre || at, head = d.part && parts[d.part]; let tx = c.x, tz = c.z, ty = d.y, base = heading;
  if (head) { const w = aspect < 1 ? 1 : .35; tx = head.x * w + c.x * (1 - w); ty = head.y; tz = head.z * w + c.z * (1 - w); } // (between head and body: the head alone swung the lens with her neck)
  const vfov = THREE.MathUtils.degToRad(d.fov), narrow = aspect < 1 ? 2 * Math.atan(Math.tan(vfov / 2) * aspect) : vfov;
  let dist = size / 2 / Math.tan(narrow / 2), fov = d.fov;
  // a lens below a high shot's angle stays inside the crowd's ring (CLEAR m from the plaça's middle): the public is the
  // background, never a blur across the frame; a high one stays inside the façades. Too far: stop and open the lens.
  const ux = Math.sin(az + base), uz = Math.cos(az + base), pb = tx * ux + tz * uz;
  // (she outside the ring, walking in among the people: no ring to keep to)
  const inRing = tx * tx + tz * tz > (CLEAR - .5) ** 2 ? MAX_REACH : -pb + Math.sqrt(Math.max(0, pb * pb - (tx * tx + tz * tz - CLEAR * CLEAR)));
  // (blended over the angle: a switch made a rising crane jump outwards mid-shot)
  const high = Math.min(1, Math.max(0, (el - .35) / (HIGH + .15 - .35))), reach = (inRing + (MAX_REACH - inRing) * high * high * (3 - 2 * high)) / Math.max(.2, Math.cos(el));
  if (dist > reach) { dist = reach; const n = 2 * Math.atan(size / 2 / dist); fov = THREE.MathUtils.radToDeg(aspect < 1 ? 2 * Math.atan(Math.tan(n / 2) / aspect) : n); }
  camera.fov = Math.min(fov, 80); camera.aspect = aspect; // (no zoom punch on the kick: with the shake it made the lens bounce, 0:41-0:46)
  camera.position.set(tx + ux * Math.cos(el) * dist, Math.max(.3, ty + Math.sin(el) * dist), tz + uz * Math.cos(el) * dist);
  // (no handheld drift or shake: any of it read as the lens trembling, the owner)
  camera.up.set(0, 1, 0);
  if (el > 1.3) camera.up.set(-Math.sin(az), 0, -Math.cos(az)); // looking straight down: her front at the frame's top
  camera.lookAt(tx, ty, tz);
  if (roll) camera.rotateZ(roll);
  camera.far = 90; camera.near = .3; // (a 5 cm near plane left no depth precision for the floor's layers)
  camera.updateProjectionMatrix();
  return s;
}
