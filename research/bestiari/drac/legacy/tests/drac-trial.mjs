// The Drac reference trial (drac-lab.html, docs/drac-reference-trial.md), checked on its own form and the real rig:
// (1) form: the current sequence unchanged through bar 18, then the full D.S. 19-51 (C3, D3, E3), then the same coda;
//     pitches, durations and ties are the score's; the baseline form, song and audio are untouched;
// (2) clock: one strictly increasing beat grid, gentle tempo steps, every section where the form puts it, the video
//     anchors within the stated residuals;
// (3) dance: authored keys all used, continuous at every seam, seekable, travels and turns where the video does, still
//     after the final hit;
// (4) rig: a rigid shell (no part moves on the body), planted soles fixed in the world while down at 30/60/120 fps and
//     several frame phases, soles up whenever they travel, long steps clear the floor, legs apart, smooth on screen;
// (5) lab: no service client in its import graph; one transport, silent until asked, nothing doubled on switches;
// (6) candidate audio (once generated): metadata matches the form, the files and their hashes.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparePages } from '../tools/prepare-pages.mjs';
import { createLabClock, videoSync } from '../src/dev/drac-lab/clock.js';
import * as THREE from 'three';
import { compileForm, formRevision } from '../src/music-form/compile.js';
import { timeAtBeat, beatAtTime } from '../src/core/beat-grid.js';
import { buildDrac } from '../src/scene/models/drac.js';
import { newDracPose, dracPose } from '../src/game/dance-drac.js';
import { makeDracFeet, SOLE, REST } from '../src/game/drac-feet.js';
import { makeTrialDracDance, trialKeys, TRIAL } from '../src/dev/drac-lab/trial-dance.js';
import { poseRigid } from '../src/dev/drac-lab/trial-rig.js';
import { poseDrac } from '../src/scene/drac-motion.js';
import { buildProgrammes, videoAt, beatAtVideo } from '../src/dev/drac-lab/programmes.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url));
const json = p => JSON.parse(read(p));
const score = json('music/drac-score.json'), form = json('music/drac-form.json'), trialForm = json('music/drac-trial-form.json');
const base = compileForm(form, score), tl = compileForm(trialForm, score), song = json('src/song-drac.json');

// ---- (1) form
assert.deepEqual(tl.unresolved, [], 'the trial form compiles');
assert.equal(tl.end, base.end + 66, 'the full return adds bars 19-51 (66 beats) before the coda');
assert.deepEqual(tl.arrangement, [[0, 'intro'], [11, 'pickup'], [12, 'A2'], [42, 'B'], [56, 'C'], [72, 'D'], [104, 'E'], [128, 'A3'], [132, 'B3'],
  [146, 'C3'], [162, 'D3'], [194, 'E3'], [218, 'coda'], [223, 'roll']], 'sections');
assert.deepEqual(tl.occurrences.map(o => o.bar), [0, ...[1, 2, 3, 4, 5, 6, 7, 8], ...[1, 2, 3, 4, 5, 6, 7], ...Array.from({ length: 43 }, (_, i) => i + 9),
  6, 7, ...Array.from({ length: 43 }, (_, i) => i + 9), 52, 53, 54, 55, 56], 'bar order: S1, S2 to 51, D.S. 6, 7, 9-51, coda');
const notes = (t, a, b, shift = 0) => t.melody.filter(([s]) => s >= a && s < b).map(([s, d, m]) => [+(s + shift).toFixed(9), d, m]); // exact rationals, shifted as doubles
assert.deepEqual(notes(tl, 0, 152), notes(base, 0, 152), 'the current form, note for note, through bar 18 of the D.S.');
assert.deepEqual(notes(tl, 152, 218), notes(base, 62, 128, 90), 'the D.S. bars 19-51 are the first pass\'s, note for note (ties included)');
assert.deepEqual(notes(tl, 218, Infinity), notes(base, 152, Infinity, 66), 'the same coda and ringing last note');
assert.equal(tl.melody.length, base.melody.length + notes(base, 62, 128).length, 'nothing else added');
assert.deepEqual(trialForm.source.transpose, form.source.transpose, 'same transposition');
assert.deepEqual(tl.holds, base.holds, 'the hold stays where it was');
assert.deepEqual(tl.balloons, [[124, 128], [223, 227]], 'the closing roll moves with the coda');
// the game's song, chart grid and audio are the baseline's (the trial writes only drac-trial-* files)
const sha1 = buf => createHash('sha1').update(buf).digest('hex');
assert.deepEqual(song.beats, base.beats.map(b => +b.toFixed(4)), 'song-drac.json is the baseline form\'s grid');
for (const key of ['audio', 'ambient']) {
  const [path, v] = song[key].split('?v=');
  assert.equal(sha1(read(`public/${path}`)).slice(0, 10), v, `${path} is the version song-drac.json names`);
}

// ---- (2) clock
const B = tl.beats;
assert.equal(B.length, tl.end + 1);
for (let b = 1; b < B.length; b++) assert.ok(B[b] > B[b - 1], `the grid rises at ${b}`);
const bpm = tl.tempo.beatUs.map(u => 60e6 / u);
for (let b = 1; b < bpm.length; b++) assert.ok(Math.abs(bpm[b] - bpm[b - 1]) <= (b >= 218 ? 5 : 2.05), `a ${(bpm[b] - bpm[b - 1]).toFixed(2)} BPM step at ${b}`);
assert.ok(Math.min(...bpm) >= 120.9 && Math.max(...bpm) <= 151.01, 'tempo within the measured 121-151');
assert.ok(bpm.slice(12, 42).every(t => t < 123.1) && bpm.slice(204, 218).every(t => t > 150.9), 'calm start, fast final turns');
assert.ok(B[tl.end] > 100 && B[tl.end] < 112, `final hit at ${B[tl.end].toFixed(2)} s`);
assert.ok(Math.abs(B[11] - 5.549) < 0.01, 'the 12-beat intro is kept (at 121 BPM: first note 5.55 s)');
const P = buildProgrammes();
// video anchors (a hypothesis): within 0.9 s through D3's start, the late ones drift as documented (< 3 s)
for (const [b, v] of P.proposal.anchors) {
  const r = videoAt(P.proposal, b, 'offset') - v;
  assert.ok(Math.abs(r) < (b <= 162 ? 0.9 : 3), `anchor ${b}: residual ${r.toFixed(3)} s`);
  assert.ok(Math.abs(videoAt(P.proposal, b, 'anchors') - v) < 1e-9, `anchor mode passes through ${b}`);
}
for (const p of [P.current, P.proposal]) for (const mode of ['offset', 'anchors']) for (let v = 0.5; v < 104; v += 3.7) {
  const b = beatAtVideo(p, v, mode);
  assert.ok(Math.abs(videoAt(p, b, mode) - v) < 1e-6, `${p.id} ${mode}: video ${v} round trip`);
}

// ---- (3) dance
const dance = makeTrialDracDance(tl), pose = newDracPose(), pose2 = newDracPose();
assert.equal(dance.skipped, 0, 'every authored key lands after the one before');
for (const [label, cue] of Object.entries(TRIAL)) for (const axis of ['yaw', 'x', 'z']) {
  const rows = tl.arrangement.filter(([, l]) => l === label);
  for (const [start] of rows) {
    const next = tl.arrangement.find(([b]) => b > start)?.[0] ?? tl.end;
    for (const [b] of cue[axis] ?? []) assert.ok(b >= 0 && start + b < next, `${label} ${axis} key ${b} outside its section`);
  }
}
const KEYS = Object.keys(newDracPose()).filter(k => typeof pose[k] === 'number' && k !== 'beat');
const seams = tl.arrangement.map(([b]) => b);
for (const b of [...seams, tl.end]) {
  dance.pose(pose, b - 1e-7); dance.pose(pose2, b + 1e-7);
  for (const k of KEYS) assert.ok(Math.abs(pose[k] - pose2[k]) < 1e-5, `${k} jumps at beat ${b}`);
}
{ // the speed of every channel stays bounded (C1: no velocity jump anywhere)
  const h = 1 / 64, prev = newDracPose(), rate = newDracPose();
  let worst = 0, at = 0;
  dance.pose(prev, -4); dance.pose(rate, -4 + h);
  for (let b = -4 + 2 * h; b < tl.end + 6; b += h) {
    dance.pose(pose, b);
    for (const k of ['yaw', 'x', 'z']) {
      const dv = (pose[k] - 2 * rate[k] + prev[k]) / h; // change of the per-beat speed over one sample
      if (Math.abs(dv) > worst) { worst = Math.abs(dv); at = b; }
    }
    Object.assign(prev, rate); Object.assign(rate, pose);
  }
  assert.ok(worst < 0.05, `a speed jump of ${worst.toFixed(4)} a beat at ${at.toFixed(2)}`);
}
const fresh = b => ({ ...makeTrialDracDance(tl).pose(newDracPose(), b) });
for (const b of [200.3, -3, 75.25, 300, 12, 161.9, 0, 222.4, 75.25]) assert.deepEqual({ ...dance.pose(pose, b) }, fresh(b), `seek to ${b}`);
const turns = (a, b) => (dance.pose(pose, b).yaw - dance.pose(pose2, a).yaw) / (2 * Math.PI);
assert.ok(Math.abs(turns(42, 50) - 1) < 1e-9, 'B: one turn on the spot (video 16-20 s)');
assert.ok(Math.abs(turns(132, 142) - 1) < 1e-9, 'B3: one turn on the spot (video 60-64 s)');
assert.ok(Math.abs(turns(72, 100) - 1) < 1e-9 && Math.abs(turns(162, 190) - 1) < 1e-9, 'D, D3: out through profile and back, home front on');
assert.ok(Math.abs(turns(192, 223) - 5) < 1e-9, 'end of D3, E3, coda: five consecutive turns (video 86-101 s)');
{ const y = dance.pose(pose, tl.end).yaw; assert.ok(Math.abs(y - 2 * Math.PI * Math.round(y / (2 * Math.PI))) < 1e-9, 'ends front on'); }
for (const d of [72, 162]) {
  let far = 0, side = 0;
  for (let b = d; b < d + 32; b += 0.25) { dance.pose(pose, b); far = Math.max(far, pose.z); side = Math.max(side, Math.abs(pose.x)); }
  assert.ok(far > 3.3 && side > 1.2, `the walk out at ${d} really travels (${far.toFixed(2)} towards the camera, ${side.toFixed(2)} aside)`);
  dance.pose(pose, d + 30);
  assert.ok(Math.hypot(pose.x, pose.z) < 1e-9, `home again by the end of the walk at ${d}`);
}
{ // modest, whole-body motion: no rear, crouch, fire or part waves; small roll and pitch; a few cm of bob
  let roll = 0, pitch = 0, lift = 0;
  for (let b = -2; b < tl.end + 4; b += 0.05) {
    dance.pose(pose, b);
    roll = Math.max(roll, Math.abs(pose.roll)); pitch = Math.max(pitch, Math.abs(pose.pitch)); lift = Math.max(lift, pose.lift);
    for (const k of ['crouch', 'swing', 'reach', 'whip', 'fire', 'rear', 'shake']) assert.equal(pose[k], 0, `${k} at ${b}`);
    assert.equal(pose.jaw, dance.pose(pose2, 0).jaw); assert.equal(pose.flap, pose2.flap);
  }
  assert.ok(roll < 8 * Math.PI / 180 && pitch < 3.1 * Math.PI / 180 && lift <= 0.03, `roll ${roll}, pitch ${pitch}, lift ${lift}`);
  const end = { ...dance.pose(newDracPose(), tl.end + 1) };
  for (const b of [tl.end + 1.5, tl.end + 4, 400]) { const p = dance.pose(pose, b); for (const k of KEYS) assert.ok(p[k] === end[k], `${k} still after the end (${b})`); }
}

// ---- (4) the posed rig
const feet = makeDracFeet(dance, tl.end), drac = buildDrac(), FRONTS = [0, 0.7];
const place = (b, front, d = drac) => { dance.pose(pose, b); poseRigid(d, pose, front, feet); d.root.updateMatrixWorld(true); };
{ // rigid shell: every part's matrix on the body is the same at any beat
  const parts = [...drac.necks.flatMap(n => [n.root, ...n.segs, n.head, n.jaw]), ...drac.wings.map(w => w.root), drac.tail.base, ...drac.tail];
  place(0, 0); const rest = parts.map(o => o.matrix.clone());
  for (let b = -2; b < tl.end + 3; b += 0.37) {
    place(b, 0);
    parts.forEach((o, i) => assert.ok(o.matrix.equals(rest[i]), `a part moves on the body at ${b.toFixed(2)}`));
    assert.ok(drac.fire.every(f => !f.visible), 'no fire');
  }
}
const shoe = drac.legs[0].shoe.children[0];
shoe.geometry.computeBoundingBox();
const bb = shoe.geometry.boundingBox, CORNERS = [bb.min.x, bb.max.x].flatMap(x => [bb.min.z, bb.max.z].map(z => new THREE.Vector3(x, 0, z)));
const pts = () => CORNERS.map(() => new THREE.Vector3());
const sole = (i, out) => CORNERS.forEach((p, k) => out[k].copy(p).applyMatrix4(drac.legs[i].shoe.children[0].matrixWorld));
for (const front of FRONTS) for (const fps of [30, 60, 120]) for (const phase of [0, 0.37, 0.71]) {
  const down = [pts(), pts()], now = [pts(), pts()], on0 = [false, false], peak = [0, 0], t0 = timeAtBeat(B, -4);
  let slide = 0, low = Infinity, contacts = 0;
  for (let i = 0, b = -4; b <= tl.end + 4; b = beatAtTime(B, t0 + (++i + phase) / fps)) {
    place(b, front);
    for (let f = 0; f < 2; f++) {
      sole(f, now[f]);
      const y = Math.min(...now[f].map(p => p.y)), on = Math.abs(y) < 1e-9;
      assert.ok(y > -1e-9, `a sole under the floor at ${b}`);
      if (on && !on0[f]) {
        if (contacts > 1 && Math.max(...now[f].map((p, k) => p.distanceTo(down[f][k]))) > 0.6) low = Math.min(low, peak[f]);
        contacts++; peak[f] = 0; down[f].forEach((p, k) => p.copy(now[f][k]));
      }
      peak[f] = Math.max(peak[f], y);
      if (on) slide = Math.max(slide, ...now[f].map((p, k) => p.distanceTo(down[f][k])));
      on0[f] = on;
    }
  }
  assert.ok(slide < 1e-6, `front ${front} ${fps} fps phase ${phase}: a planted sole slides ${slide}`);
  assert.ok(low >= 0.03 && low < Infinity, `front ${front} ${fps} fps: a step over 0.6 lifts only ${(low * 100).toFixed(1)} cm`);
  assert.ok(contacts > 1.3 * tl.end, `${contacts} touchdowns`);
}
for (const front of FRONTS) { // a sole travels only in the air: at fine steps no corner moves while it is under 3 mm at either end
  const was = [pts(), pts()], now = [pts(), pts()];
  for (let b = -2, first = true; b < tl.end + 2; b += 0.004, first = false) {
    place(b, front);
    for (let f = 0; f < 2; f++) {
      sole(f, now[f]);
      const moved = now[f].some((p, k) => Math.hypot(p.x - was[f][k].x, p.z - was[f][k].z) > 1e-6), y = Math.min(...now[f].map(p => p.y), ...was[f].map(p => p.y));
      assert.ok(first || !moved || y >= 3e-3, `a sole scrapes the floor at ${b.toFixed(3)} (front ${front}): ${(y * 1000).toFixed(2)} mm up`);
      was[f].forEach((p, k) => p.copy(now[f][k]));
    }
  }
}
// legs: shoes and trousers apart (separating axes on the posed boxes), left foot left; a foot never strays far from
// under its hip (the trousers' lean limit): measured against the current dance's own worst
const obb = (m, b) => { const e = m.matrixWorld.elements; return { c: new THREE.Vector3(b.x, b.y, b.z).applyMatrix4(m.matrixWorld),
  e: [0, 1, 2].map(k => new THREE.Vector3(e[4 * k], e[4 * k + 1], e[4 * k + 2]).normalize().multiplyScalar([b.w, b.h, b.d][k] / 2)) }; };
const reach = (o, n) => o.e.reduce((r, v) => r + Math.abs(v.dot(n)), 0);
const gap = (a, b) => {
  const d = new THREE.Vector3().subVectors(b.c, a.c), axes = [...a.e, ...b.e].map(v => v.clone().normalize());
  for (const u of a.e) for (const v of b.e) { const c = new THREE.Vector3().crossVectors(u, v); if (c.lengthSq() > 1e-12) axes.push(c.normalize()); }
  return Math.max(...axes.map(n => Math.abs(d.dot(n)) - reach(a, n) - reach(b, n)));
};
const SOLEBOX = { x: 0, y: 0.07, z: (bb.min.z + bb.max.z) / 2, w: bb.max.x - bb.min.x, h: 0.14, d: bb.max.z - bb.min.z };
const PANTS = { x: 0, y: 0.865, z: 0, w: 0.5, h: 1.81, d: 0.52 }; // drac.js's cream trouser box, centred
const W = new THREE.Vector3();
const stray = (fn, d, end) => { // the worst distance of a foot from its rest spot under the root, and the closest legs
  let worst = 0, legs = Infinity;
  for (let b = -2; b < end + 2; b += 0.05) {
    fn(b); d.root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const p = d.root.worldToLocal(d.legs[i].shoe.getWorldPosition(W));
      worst = Math.max(worst, Math.hypot(p.x - (i ? -REST.x : REST.x), p.z - REST.z));
    }
    const l = d.root.worldToLocal(d.legs[0].shoe.getWorldPosition(W)).x, r = d.root.worldToLocal(d.legs[1].shoe.getWorldPosition(W)).x;
    assert.ok(l - r > 0.42, `the feet cross at ${b.toFixed(2)}`);
    legs = Math.min(legs, gap(obb(d.legs[0].shoe.children[0], SOLEBOX), obb(d.legs[1].shoe.children[0], SOLEBOX)),
      gap(obb(d.legs[0].pants.children[0], PANTS), obb(d.legs[1].pants.children[0], PANTS)));
  }
  return { worst, legs };
};
const trial = stray(b => place(b, 0.7), drac, tl.end);
const ref = buildDrac(), refStray = stray(b => { dracPose(pose, b); poseDrac(ref, pose, 0.7, P.current.feet); }, ref, P.current.timeline.end);
assert.ok(trial.legs > 0, `legs cut into each other (${trial.legs.toFixed(3)})`);
assert.ok(trial.worst <= Math.max(0.25, refStray.worst), `a foot strays ${trial.worst.toFixed(3)} from under its hip (current dance ${refStray.worst.toFixed(3)})`);
{ // smooth on screen: each part's outer corner, real 60 fps frames through the tempo map, several frame phases;
  // drac-parts.mjs's limit for the current dance (0.08 a frame of change in a frame's travel)
  const meshes = []; drac.root.traverse(o => { if (o.isMesh && !drac.fire.some(f => { let hit = false; f.traverse(c => { hit ||= c === o; }); return hit; })) meshes.push(o); });
  const corner = meshes.map(m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox.max.clone(); });
  const name = m => { const leg = drac.legs.findIndex(l => l.shoe.children.includes(m) || l.pants.children.includes(m)); return leg < 0 ? (m.parent === drac.body ? 'trunk' : 'part') : `${drac.legs[leg].shoe.children.includes(m) ? 'shoe' : 'trousers'} ${leg}`; };
  const now = new THREE.Vector3(), v = new THREE.Vector3();
  let worst = { jolt: 0 };
  const peak = meshes.map(() => 0);
  for (const phase of [0, 0.25, 0.5, 0.75]) {
    const was = meshes.map(() => [new THREE.Vector3(), new THREE.Vector3()]), t0 = timeAtBeat(B, -1);
    for (let i = 0, b = -1; b < tl.end + 3; b = beatAtTime(B, t0 + (++i + phase) / 60)) {
      place(b, 0);
      meshes.forEach((m, k) => {
        const [p0, p1] = was[k];
        now.copy(corner[k]).applyMatrix4(m.matrixWorld);
        const jolt = v.subVectors(now, p1).sub(p1).add(p0).length();
        if (i > 1 && jolt > worst.jolt) worst = { jolt, beat: b, part: name(m), phase };
        if (i > 1) peak[k] = Math.max(peak[k], jolt);
        p0.copy(p1); p1.copy(now);
      });
    }
  }
  if (process.env.DEBUG || worst.jolt >= 0.08) meshes.forEach((m, k) => peak[k] > 0.03 && console.log(`  ${name(m)} #${k}: ${peak[k].toFixed(4)}`));
  assert.ok(worst.jolt < 0.08, `a part jolts ${worst.jolt} between frames at beat ${worst.beat} (${worst.part}, phase ${worst.phase})`);
  console.log(`  rig: worst frame jolt ${worst.jolt.toFixed(4)} at beat ${worst.beat.toFixed(2)}; foot stray ${trial.worst.toFixed(3)} (current ${refStray.worst.toFixed(3)}); legs ${trial.legs.toFixed(3)} apart`);
}

// ---- (5) the lab
{ // its import graph: the lab's own modules, the rig, the dance, the feet, the form compiler and the editor's transport;
  // three.js is the only package; no service, UI sheet or game flow module (no leaderboard, feedback, captcha, Sentry)
  const seen = new Set(), bare = new Set(), stack = [fileURLToPath(new URL('../src/dev/drac-lab/main.js', import.meta.url))];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !f.endsWith('.js')) continue;
    seen.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/^(?:import|export)\s[^;]*?from\s+'([^']+)'|^import\s+'([^']+)'/gm)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith('.')) stack.push(resolvePath(dirname(f), spec)); else bare.add(spec);
    }
  }
  const files = [...seen].map(f => relative(fileURLToPath(new URL('..', import.meta.url)), f));
  assert.deepEqual([...bare].filter(s => s !== 'three' && !s.startsWith('three/addons/')), [], 'packages other than three.js');
  for (const f of files) assert.ok(/^src\/(dev\/drac-lab|dev\/music-editor\/preview|music-form|core\/beat-grid|game\/(dance|dance-drac|drac-feet)\.js|scene\/(drac-motion|models\/(drac|voxel)))/.test(f), `the lab reaches ${f}`);
  const game = new Set(), todo = [fileURLToPath(new URL('../src/main.js', import.meta.url))];
  while (todo.length) {
    const f = todo.pop();
    if (game.has(f) || !/\.m?js$/.test(f) || !existsSync(f)) continue;
    game.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:^(?:import|export)\s[^;]*?from\s+|^import\s+|import\(\s*)'(\.[^']+)'/gm)) todo.push(resolvePath(dirname(f), m[1]));
  }
  assert.ok(game.size > 20 && ![...game].some(f => f.includes('/src/dev/drac-lab/')), 'the game never reaches the lab');
  const html = read('drac-lab.html').toString();
  assert.ok(/<video[^>]*\smuted[\s>]/.test(html) && /src="\/drac-reference\/pm-lEViiPK0\.mp4"/.test(html), 'the reference video is local, muted');
  assert.ok(!read('vite.config.js').toString().includes('drac-lab') && !read('index.html').toString().includes('drac-lab'), 'not a build input');
  assert.ok(read('.gitignore').toString().split('\n').includes('/public/drac-reference/'), 'the reference video stays out of git');
}
{ // a build that carried the trial audio could not be published: the Pages allowlist rejects it
  const dir = mkdtempSync(join(tmpdir(), 'drac-trial-pages-'));
  try {
    for (const f of ['index.html', '404.html', '_headers', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png', 'manifest.webmanifest', 'og.jpg',
      'assets/app.js', 'music/a.mp3', 'music/b.mp3', 'music/drac-trial-v1-austera.mp3']) { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), 'x'); }
    await assert.rejects(preparePages(dir, [{ audio: 'music/a.mp3?v=1', ambient: 'music/b.mp3?v=2' }]), /Unexpected deployment file: music\/drac-trial-v1-austera\.mp3/);
  } finally { rmSync(dir, { recursive: true }); }
}
{ // one transport behind one gate: silent until asked, ?mute stays silent, a switch never leaves two sources playing,
  // a slower fetch overtaken by a newer choice is dropped
  const intervals = new Map(), keep = [globalThis.setInterval, globalThis.clearInterval];
  let serial = 0, live = 0, most = 0;
  globalThis.setInterval = fn => { intervals.set(++serial, fn); return serial; }; globalThis.clearInterval = id => intervals.delete(id);
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } });
  const audio = {
    currentTime: 0, destination: {}, resume: async () => {}, createPeriodicWave: () => ({}),
    createGain: () => ({ gain: param(), connect() {}, disconnect() {} }),
    createOscillator: () => ({ frequency: param(), setPeriodicWave() {}, connect() {}, disconnect() {}, start() {}, stop() {} }),
    createBufferSource: () => ({ on: false, connect() {}, disconnect() {}, start() { this.on = true; most = Math.max(most, ++live); }, stop() { if (this.on) { this.on = false; live--; } } }),
  };
  try {
    const pending = new Map();
    const fetchBuffer = url => new Promise(ok => pending.set(url, () => ok({ duration: url.includes('slow') ? 120 : 80 })));
    const progs = { a: { ...P.current, audio: { joc: '/a.mp3' } }, b: { ...P.proposal, audio: { slow: '/slow.mp3', fast: '/fast.mp3' } } };
    const lab = createLabClock({ audioCtx: audio, programmes: progs, fetchBuffer });
    assert.equal(lab.gate.gain.value, 0, 'starts silent');
    let s = lab.select('a', 'joc'); pending.get('/a.mp3')(); await s;
    await lab.play(); lab.seek(20); audio.currentTime = 3;
    assert.equal(live, 1);
    assert.equal(lab.setSound('lab'), 'lab'); assert.equal(lab.gate.gain.value, 1, 'opens on request');
    const v0 = videoAt(progs.a, lab.beat(), 'offset');
    s = lab.select('b', 'slow'); const t = lab.select('b', 'fast');
    assert.equal(live, 0, 'the old song stops before anything new loads');
    pending.get('/fast.mp3')(); assert.equal(await t, true); pending.get('/slow.mp3')(); assert.equal(await s, false, 'the overtaken choice is dropped');
    assert.equal(lab.state.variant, 'fast'); assert.ok(lab.transport.playing && live === 1, 'still playing, once');
    assert.ok(Math.abs(videoAt(progs.b, lab.beat(), 'offset') - v0) < 1e-6, 'the same moment of the video');
    lab.seek(50); lab.seek(10); lab.pause(); assert.equal(live, 0, 'pause stops the source');
    s = lab.select('b', 'missing'); assert.equal(await s, true); assert.equal(lab.state.variant, 'melodia', 'no file: the browser melody');
    // a pause during a load cancels the resume the switch carried over (review repro: it came back playing)
    s = lab.select('a', 'joc'); pending.get('/a.mp3')(); await s; await lab.play();
    s = lab.select('b', 'fast'); assert.ok(lab.playing(), 'the button still says it will play');
    lab.pause(); assert.ok(!lab.playing());
    pending.get('/fast.mp3')(); await s;
    assert.ok(!lab.transport.playing && live === 0, 'paused while loading stays paused');
    // Play while loading asks for the start of the new choice; the obsolete source never restarts
    s = lab.select('a', 'joc'); await lab.play();
    assert.ok(!lab.transport.playing && live === 0 && lab.playing(), 'play during a load waits for it');
    lab.pause(); await lab.play(); // cancel, then ask again
    pending.get('/a.mp3')(); await s;
    assert.ok(lab.transport.playing && live === 1 && lab.state.programme === 'a', 'starts once the new choice has loaded');
    lab.pause();
    // a stale choice's failure never becomes the state (review repro: the old error replaced the winner's)
    const failing = { ...progs, c: { ...progs.b, audio: { bad: '/bad.mp3', ok: '/ok.mp3' } } };
    const fails = new Map();
    const lab2 = createLabClock({ audioCtx: audio, programmes: failing, fetchBuffer: url => new Promise((ok, no) => fails.set(url, [ok, no])) });
    const stale = lab2.select('c', 'bad'), fresh = lab2.select('c', 'ok');
    fails.get('/ok.mp3')[0]({ duration: 80 }); assert.equal(await fresh, true);
    fails.get('/bad.mp3')[1](new Error('old rejected')); assert.equal(await stale, false);
    assert.equal(lab2.state.error, null, 'the stale rejection stays local'); assert.equal(lab2.state.variant, 'ok');
    const lost = lab2.select('c', 'bad'); fails.get('/bad.mp3')[1](new Error('gone')); await lost;
    assert.match(lab2.state.error, /bad\.mp3: gone/, 'the winner\'s own failure is reported'); assert.equal(lab2.state.variant, 'melodia');
    assert.ok(most === 1, `at most one source at a time (${most})`);
    const muted = createLabClock({ audioCtx: audio, programmes: progs, fetchBuffer, muteLocked: true });
    assert.equal(muted.setSound('lab'), 'off'); assert.equal(muted.gate.gain.value, 0, '?mute stays silent');
  } finally { [globalThis.setInterval, globalThis.clearInterval] = keep; }
  // the video: seeks only when visibly off, runs only inside the recording
  assert.deepEqual(videoSync({ currentTime: 10, duration: 111.9 }, 10.1, true, 1), { seek: null, play: true, rate: 1 });
  assert.equal(videoSync({ currentTime: 10, duration: 111.9 }, 10.4, true, 1).seek, 10.4);
  assert.equal(videoSync({ currentTime: 10, duration: 111.9 }, 10.06, false, 1).seek, 10.06);
  assert.deepEqual(videoSync({ currentTime: 111.9, duration: 111.9 }, 130, true, 1), { seek: null, play: false, rate: 1 });
  assert.equal(videoSync({ currentTime: 3, duration: 111.9 }, -2, true, 1).play, false);
}

// ---- (6) candidate audio, once tools/build_drac_trial.py has run
const META = 'public/music/drac-trial-v1.json';
if (existsSync(new URL(`../${META}`, import.meta.url))) {
  const meta = json(META);
  assert.equal(meta.revision, formRevision(trialForm), 'generated from this very form');
  assert.deepEqual(meta.beats, tl.beats, 'its beat grid is the compiler\'s');
  assert.equal(meta.end, tl.end); assert.equal(meta.endSec, tl.beats[tl.end]);
  assert.deepEqual(Object.keys(meta.audio).sort(), ['austera', 'festiu']);
  for (const [k, url] of Object.entries(meta.audio)) {
    const [path, v] = url.split('?v=');
    assert.ok(path === `music/drac-trial-v1-${k}.mp3`, `${k}: a trial name (${path})`);
    assert.equal(sha1(read(`public/${path}`)).slice(0, 10), v, `${path} matches its ?v=`);
    assert.ok(meta.duration[k] > meta.endSec + 2, `${k} rings past the final hit`);
  }
  console.log(`  candidate audio: ${Object.values(meta.audio).join(', ')}`);
} else console.log('  candidate audio not generated yet (tools/build_drac_trial.py): metadata checks skipped');

console.log('drac trial ok');
