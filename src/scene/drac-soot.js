// Free mode's held fire (E with the Drac in photo mode) chars whoever it touches, cartoon style: black from head to foot
// but for the white of the eyes, frozen in the pose they had, a little smoke off the head; after `hold` s they come back
// over `fade` s into their own, still-running behaviour (crowd.js keeps posing them underneath: no stale pose). The game,
// its demos and the selector never trigger it.
// - contact: the fire's visible volume as capsules (drac-fire.js's sizes: the held flamarada's ball, tail and wing
//   flames, plus each tube's jet), tested against each spectator's standing body only while E is held, after a box check;
// - who: everyone on the floor or the balconies. The skinned people (the ring, the band, the balconies: one mesh) and the
//   instanced figures photo mode moves (photo-obstacles.js photoExtras: the backdrop and the mid band);
// - look: the skinned mesh gets its own material reading a one-row texture of a byte per bone (sootTex), the instanced
//   figures a per-instance aSoot (backdrop.js: colour, stillness): costumes and palettes are never touched, only the
//   touched person turns black;
// - state: a few numbers on the person (sootT timer, sootK colour, sootW pose hold, sootS the pose held), a short list of
//   the affected; everything on the frame's dt (0 while paused, capped after a background tab).
import * as THREE from 'three';
import { SKIN_MAT } from './models/voxel.js';
import { DRAC_FIRE } from './drac-fire.js';
import { CALM } from '../core/env.js';
import { PHOTO } from '../game/photo-control.js';

// hold: s frozen and black after the last touch (a re-touch renews it, never adds up); fade: s back to colour and
// motion; char: s to blacken; smoke: puffs a second per frozen head, at most `smokers` heads at once; body: a
// spectator's radius (m) and height (m, times their scale) for the contact; under: m below the fire that still counts and
// wide: m added round it (cartoon licence, Marc 20/10/2026: the held flame burns over their heads, the crowd opens a lane)
// front: and everyone on the floor in front of the snout as far as its jets reach (m from the mouths), within a wedge
// `w0` m wide each side at the mouths and growing `grow` m per m out: whoever faces the flamarada burns (Marc 20/10/2026)
export const SOOT = { hold: 4, fade: 0.9, char: 0.12, smoke: 1.3, smokers: 8, body: 0.24, height: 1.75, under: 1.2, wide: 0.35,
  front: { w0: 0.7, grow: 0.4 } };
const sootList = []; // who is affected now (bounded by the crowd)
let sootTex = null;

// A skinned material that reads a one-row texture of a byte per bone (R black, G a torso bone: white eyes there). The
// base's own shader patch, if any, still runs. eyeAttr: the eyes are marked per vertex (aSootEye) instead.
function sootSkinMat(base, bones, eyeAttr = false) {
  const tex = new THREE.DataTexture(new Uint8Array(bones * 4), bones, 1, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  const mat = base.clone(), prev = base.onBeforeCompile, key = base.customProgramCacheKey();
  // the eyes: the black boxes at the face (people.js: torso-local y 0.77 standing, 0.79 seated; front z 0.17, x ±0.08)
  const eye = eyeAttr ? 'aSootEye > 0.5' : 'sootB.g > 0.5 && abs(position.y - 0.78) < 0.045 && position.z > 0.155 && abs(abs(position.x) - 0.08) < 0.035';
  mat.onBeforeCompile = (sh, renderer) => {
    prev.call(base, sh, renderer);
    sh.uniforms.uSoot = { value: tex }; sh.uniforms.uSootN = { value: bones };
    sh.vertexShader = `uniform sampler2D uSoot; uniform float uSootN;${eyeAttr ? ' attribute float aSootEye;' : ''}\n` + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
      vec4 sootB = texture2D(uSoot, vec2((skinIndex.x + 0.5) / uSootN, 0.5));
      if (sootB.r > 0.0) vColor.rgb = mix(vColor.rgb, ${eye} ? vec3(0.9) : vColor.rgb * 0.012 + vec3(0.014, 0.013, 0.012), sootB.r);`);
  };
  mat.customProgramCacheKey = () => `${key}|soot${eyeAttr ? '-eye' : ''}`;
  return { mat, tex };
}
// The crowd mesh's material: SKIN_MAT's look, plus the soot. people: who can be charred (skinCrowd's bone0: their torso
// bone, then legs and arms); bones: the mesh's bone count.
export function sootMaterial(people, bones) {
  const { mat, tex } = sootSkinMat(SKIN_MAT, bones);
  sootTex = tex;
  for (const p of people) tex.image.data[p.bone0 * 4 + 1] = 255;
  tex.needsUpdate = true;
  return mat;
}
// Another skinned mesh whose figures stand in for people of the crowd (pairs: [figure, the person it draws]): the
// figure blackens with its person. eyes: the colours only their eyes use (exact, unjittered), white while charred.
// Returns the mesh's new material.
export function sootLink(mesh, pairs, eyes = []) {
  const { mat, tex } = sootSkinMat(mesh.material, mesh.skeleton.bones.length, true), bones = mesh.skeleton.bones;
  const col = mesh.geometry.attributes.color, mark = new Float32Array(col.count), want = eyes.map(c => new THREE.Color(c));
  for (let i = 0; i < col.count; i++) mark[i] = want.some(c => Math.abs(col.getX(i) - c.r) + Math.abs(col.getY(i) - c.g) + Math.abs(col.getZ(i) - c.b) < 1e-4) ? 1 : 0;
  mesh.geometry.setAttribute('aSootEye', new THREE.BufferAttribute(mark, 1));
  for (const [fig, src] of pairs) (src.sootLinks ??= []).push({ tex, bones: (fig.bones ?? [fig.torso, ...fig.legs, ...fig.arms]).map(b => bones.indexOf(b)) });
  tex.needsUpdate = true;
  return mat;
}
// The stand-in's own limbs: sootHold before posing it (holds what was drawn when its person is touched: no pop; returns
// the hold 0..1), sootHoldApply after (the held limbs over the live ones, easing back with its person's sootW)
export function sootHold(fig, src) {
  const w = src.sootW || 0;
  if (w > (fig.sootLastW || 0)) {
    const bones = fig.sootBones ??= fig.bones ?? [fig.torso, ...fig.legs, ...fig.arms], s = fig.sootS ??= new Float32Array(bones.length * 3);
    for (let i = 0; i < bones.length; i++) { const r = bones[i].rotation; s[i * 3] = r.x; s[i * 3 + 1] = r.y; s[i * 3 + 2] = r.z; }
  }
  fig.sootLastW = w;
  return w;
}
export function sootHoldApply(fig, w) {
  const s = fig.sootS, bones = fig.sootBones;
  for (let i = 0; i < bones.length; i++) { const r = bones[i].rotation; r.set(sootMix(r.x, s[i * 3], w), sootMix(r.y, s[i * 3 + 1], w), sootMix(r.z, s[i * 3 + 2], w)); }
}

// the drawn pose: g position (3), g rotation (3), torso x z, legs x x, arms x z x z
const sootTake = p => {
  const s = p.sootS ??= new Float32Array(14), g = p.g, t = p.torso, l = p.legs, a = p.arms;
  s[0] = g.position.x; s[1] = g.position.y; s[2] = g.position.z; s[3] = g.rotation.x; s[4] = g.rotation.y; s[5] = g.rotation.z;
  s[6] = t.rotation.x; s[7] = t.rotation.z; s[8] = l[0]?.rotation.x ?? 0; s[9] = l[1]?.rotation.x ?? 0;
  s[10] = a[0].rotation.x; s[11] = a[0].rotation.z; s[12] = a[1].rotation.x; s[13] = a[1].rotation.z;
};
const sootMix = (from, to, w) => from + (to - from) * w;
// crowd.js, after posing p (skinned): the held pose over the live one by sootW (1 frozen, easing to 0 back into their own)
export function sootPose(p) {
  const w = p.sootW, s = p.sootS, g = p.g, t = p.torso, l = p.legs, a = p.arms;
  g.position.y = sootMix(g.position.y, s[1], w); // held limbs and height travel with whoever steps aside
  let dy = s[4] - g.rotation.y; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI;
  g.rotation.set(sootMix(g.rotation.x, s[3], w), g.rotation.y + dy * w, sootMix(g.rotation.z, s[5], w));
  t.rotation.x = sootMix(t.rotation.x, s[6], w); t.rotation.z = sootMix(t.rotation.z, s[7], w);
  if (l.length) { l[0].rotation.x = sootMix(l[0].rotation.x, s[8], w); l[1].rotation.x = sootMix(l[1].rotation.x, s[9], w); }
  a[0].rotation.x = sootMix(a[0].rotation.x, s[10], w); a[0].rotation.z = sootMix(a[0].rotation.z, s[11], w);
  a[1].rotation.x = sootMix(a[1].rotation.x, s[12], w); a[1].rotation.z = sootMix(a[1].rotation.z, s[13], w);
}
export const sootFrozen = p => p.sootT > 0; // the held black pose, independent of locomotion
export const sootAnchored = p => sootFrozen(p) && !(PHOTO.on && (PHOTO.intentX || PHOTO.intentZ)); // stay black, but leave a held WASD corridor
const sootInst = p => p.index !== undefined; // an instanced figure (photoExtras), else a skinned person
const SOOT_AT = new Float32Array(4); // where p stands: x, floor y, z, height
function sootWhere(p) {
  if (sootInst(p)) { const e = p.matrix.elements; SOOT_AT[0] = p.pos.x; SOOT_AT[1] = 0; SOOT_AT[2] = p.pos.y; SOOT_AT[3] = SOOT.height * e[5]; } // (turned about y only: e[5] is its scale)
  else { const e = p.g.matrixWorld.elements; SOOT_AT[0] = e[12]; SOOT_AT[1] = e[13]; SOOT_AT[2] = e[14]; SOOT_AT[3] = SOOT.height * p.g.scale.x; } // (last frame's: a balcony is a group's child)
  return SOOT_AT;
}

// The held fire's volume this frame: capsules [ax ay az bx by bz r] from the five fire points (drac-fx.js nozzles: mouth
// xyz, unit heading, level, nominal size). The flamarada held hot is drac-fire.js's: its two mouths' ball out of their
// midpoint, the tail and wing tips each from their own tube, a little climb; a jet's sparks reach about as far as its
// speed carries them, sagging under the shader's drag and gravity: two chords of its arc, to a nominal life and to the
// longest (drac-fire.js draws lives of 0.55-1.45 x jetLife), the second wider as the sparks spread.
const SOOT_CAP = new Float32Array(14 * 7), SOOT_CONE = new Float32Array(6); // (the wedge: mouths' midpoint x z, floor heading x z, reach, mouths' y)
const SOOT_SCALE = new Float32Array(14); // margin per actual emitter volume
function sootVolume(E, profile) {
  let n = 0, volumeScale = 1;
  const cap = (ax, ay, az, dx, dy, dz, a, b, r, sagA = 0, sagB = 0) => {
    SOOT_SCALE[n] = volumeScale;
    const o = n++ * 7; SOOT_CAP[o] = ax + dx * a; SOOT_CAP[o + 1] = ay + dy * a - sagA; SOOT_CAP[o + 2] = az + dz * a;
    SOOT_CAP[o + 3] = ax + dx * b; SOOT_CAP[o + 4] = ay + dy * b - sagB; SOOT_CAP[o + 5] = az + dz * b; SOOT_CAP[o + 6] = r;
  };
  // the jet shader's flight (drag 1/s, gravity 6 m/s²): how far along, and how far down, after t s
  const lift = DRAC_FIRE.flareLift;
  for (let i = 0; i < 5; i++) {
    const o = i * 8, f = DRAC_FIRE.flare[i], p = profile ? profile[i] : null;
    volumeScale = p ? Math.max(p.length, p.width) : 1;
    if (f[0] > 0) { // a flame: i 0 = the ball between the two mouths (point 1 draws none)
      const m = i === 0 ? 0.5 : 1, q = i === 0 ? 8 : o;
      const x = E[o] * m + E[q] * (1 - m), y = E[o + 1] * m + E[q + 1] * (1 - m), z = E[o + 2] * m + E[q + 2] * (1 - m);
      let fx = E[o + 3] * m + E[q + 3] * (1 - m), fy = E[o + 4] * m + E[q + 4] * (1 - m) + lift, fz = E[o + 5] * m + E[q + 5] * (1 - m);
      const l = Math.hypot(fx, fy, fz) || 1, L = f[0] * 1.08 * (p ? p.length : 1), r = (f[2] ? 0.36 : 0.3) * f[1] * (p ? p.width : 1); // (its length at the held age; the drawn half width)
      fx /= l; fy /= l; fz /= l;
      cap(x, y, z, fx, fy, fz, Math.min(r, L / 2), L - Math.min(r, L / 2), r);
    }
    if (E[o + 6] <= 0) continue;
    const t1 = DRAC_FIRE.jetLife * (p ? p.life : 1), t2 = t1 * 1.45, go1 = 1 - Math.exp(-t1), go2 = 1 - Math.exp(-t2);
    const sp = (DRAC_FIRE.jetSpeed + 1.5 * Math.min(E[o + 6], 2)) * Math.sqrt(E[o + 7] / 0.27) * (p ? p.speed : 1); // a held jet burns at level 1
    cap(E[o], E[o + 1], E[o + 2], E[o + 3], E[o + 4], E[o + 5], 0, sp * go1, 0.3 * volumeScale, 0, 6 * (t1 - go1));
    cap(E[o], E[o + 1], E[o + 2], E[o + 3], E[o + 4], E[o + 5], sp * go1, sp * go2, 0.4 * volumeScale, 6 * (t1 - go1), 6 * (t2 - go2));
    if (!i) SOOT_CONE[4] = sp * go2; // the wedge in front reaches as far as a mouth's jet
  }
  return n;
}
// closest approach of capsule c to a standing body (a vertical segment y0..y1 at x, z), sampled along it: <= 0 = touching
function sootGap(c, x, z, y0, y1) {
  const scale = SOOT_SCALE[c / 7];
  y1 += SOOT.under * scale;
  let best = 1e9;
  for (let j = 0; j <= 8; j++) {
    const u = j / 8, px = SOOT_CAP[c] + (SOOT_CAP[c + 3] - SOOT_CAP[c]) * u, py = SOOT_CAP[c + 1] + (SOOT_CAP[c + 4] - SOOT_CAP[c + 1]) * u, pz = SOOT_CAP[c + 2] + (SOOT_CAP[c + 5] - SOOT_CAP[c + 2]) * u;
    const vy = py > y1 ? py - y1 : py < y0 ? y0 - py : 0, d = (px - x) * (px - x) + (pz - z) * (pz - z) + vy * vy;
    if (d < best) best = d;
  }
  return Math.sqrt(best) - SOOT_CAP[c + 6] - SOOT.body - SOOT.wide * scale;
}

// Once a frame (drac-show.js, after the crowd is posed and the fire updated). fx: the Drac's fire (nozzles, soot puff);
// folk: lists of people (skinned or instanced; the band's photoExtras twins are skipped: its people are in a list);
// on: free mode's Drac is out (anything else releases everyone); held: E is down.
const SOOT_BOX = new Float32Array(4);
export function sootFrame(dt, fx, folk, on, held) {
  const E = on && held ? fx.nozzles : null;
  if (E) {
    const n = sootVolume(E, fx.fireProfile), B = SOOT_BOX, pad = SOOT.body + SOOT.wide + 0.05, K = SOOT_CONE, fr = SOOT.front;
    B[0] = B[1] = 1e9; B[2] = B[3] = -1e9; // (pad: the body and the licence round it)
    K[0] = (E[0] + E[8]) / 2; K[1] = (E[2] + E[10]) / 2; K[5] = (E[1] + E[9]) / 2;
    let hx = E[3] + E[11], hz = E[5] + E[13]; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl; K[2] = hx; K[3] = hz;
    const half = fr.w0 + fr.grow * K[4] + pad; // the wedge's far corners in the box too
    for (let c = 0; c < 4; c++) {
      const sd = c & 1 ? 1 : -1, al = c & 2 ? K[4] : 0, cx = K[0] + hx * al - hz * sd * half, cz = K[1] + hz * al + hx * sd * half;
      B[0] = Math.min(B[0], cx); B[1] = Math.min(B[1], cz); B[2] = Math.max(B[2], cx); B[3] = Math.max(B[3], cz);
    }
    for (let i = 0; i < n; i++) {
      const c = i * 7, r = SOOT_CAP[c + 6] + pad;
      B[0] = Math.min(B[0], SOOT_CAP[c] - r, SOOT_CAP[c + 3] - r); B[1] = Math.min(B[1], SOOT_CAP[c + 2] - r, SOOT_CAP[c + 5] - r);
      B[2] = Math.max(B[2], SOOT_CAP[c] + r, SOOT_CAP[c + 3] + r); B[3] = Math.max(B[3], SOOT_CAP[c + 2] + r, SOOT_CAP[c + 5] + r);
    }
    for (const people of folk) for (const p of people) {
      if (p.band) continue;
      const w = sootWhere(p), x = w[0], z = w[2];
      if (!w[3] || x < B[0] || x > B[2] || z < B[1] || z > B[3]) continue; // hidden (scale 0) or nowhere near
      const al = (x - K[0]) * K[2] + (z - K[1]) * K[3], sd = Math.abs((x - K[0]) * K[3] - (z - K[1]) * K[2]);
      let hit = al > -SOOT.body && al < K[4] && sd < fr.w0 + fr.grow * Math.max(0, al) + SOOT.body && w[1] < K[5]; // in front of the snout (not up on a balcony)
      for (let i = 0; i < n && !hit; i++) hit = sootGap(i * 7, x, z, w[1], w[1] + w[3]) <= 0;
      if (!hit) continue;
      if (!(p.sootT > 0)) { // not frozen yet (or coming back): hold what is drawn now, so nothing pops
        if (!sootInst(p)) sootTake(p);
        p.sootW = 1;
        if (!p.sootOn) { p.sootOn = true; p.sootB = -1; sootList.push(p); }
      }
      p.sootT = SOOT.hold;
    }
  }
  let smokers = 0;
  for (let i = sootList.length - 1; i >= 0; i--) {
    const p = sootList[i];
    if (!on) p.sootT = Math.min(p.sootT, 0); // left free mode, Tab to the Mulassa, a new game: coming back now
    if (p.sootT > 0) { p.sootT -= dt; p.sootK = Math.min(1, (p.sootK || 0) + dt / SOOT.char); }
    else {
      p.sootT = Math.max(-SOOT.fade, p.sootT - dt);
      const u = -p.sootT / SOOT.fade, e = u * u * (3 - 2 * u);
      const v = Math.min(1, u / 0.8); // the pose is back a little before the colour
      p.sootK = Math.min(p.sootK, 1 - e); p.sootW = 1 - v * v * (3 - 2 * v);
    }
    const b = Math.round(p.sootK * 255);
    if (sootInst(p)) { // its colour and stillness, eased in the backdrop's shader
      const a = p.mesh.geometry.attributes.aSoot; // (stillness eases in with the black: its hop and sway settle, never snap)
      a.setXY(p.index, p.sootK, Math.min(p.sootK, p.sootW)); a.needsUpdate = true;
    } else if (b !== p.sootB) { // the person's bones (skinCrowd's bone0, five of them)
      p.sootB = b;
      for (let k = 0, nb = 1 + p.legs.length + p.arms.length; k < nb; k++) sootTex.image.data[(p.bone0 + k) * 4] = b;
      sootTex.needsUpdate = true;
      if (p.sootLinks) for (const l of p.sootLinks) { for (const k of l.bones) if (k >= 0) l.tex.image.data[k * 4] = b; l.tex.needsUpdate = true; } // their stand-ins (sootLink)
    }
    if (on && p.sootK > 0.5 && smokers++ < SOOT.smokers) { // a wisp off the head (the Drac's puff pool: its cap per quality)
      if ((p.sootOwe = (p.sootOwe || 0) + dt * SOOT.smoke * p.sootK * (CALM.matches ? 0.35 : 1)) >= 1) {
        const w = sootWhere(p); p.sootOwe -= 1; fx.soot(w[0], w[1] + w[3] + 0.1, w[2]);
      }
    }
    if (p.sootT <= -SOOT.fade) { // whole again: off the list
      p.sootT = p.sootK = p.sootW = p.sootOwe = 0; p.sootOn = false;
      sootList[i] = sootList[sootList.length - 1]; sootList.pop();
    }
  }
}
export const sootState = () => ({ affected: sootList.length, list: sootList.map(p => ({ t: p.sootT, k: p.sootK, w: p.sootW })) }); // tests only
