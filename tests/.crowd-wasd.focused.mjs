import './fps.mjs';
import './photo-control.mjs';
import { verifyJumpImpact } from './jump-impact.mjs';
import { verifyCarretillesCounter } from './carretilles-counter.mjs';
import { v1Song } from './v1-song.mjs';
import { referenceScore } from '../tools/reference-score.mjs';
import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { loadMainSource } from './load-main.mjs';
import { PROFILES, initialQuality, renderDpr, frameMonitor, hudScale, framePacer, profileAt, hudBudget, MINIMAL, smoothClock, isSoftwareRenderer, probeRenderer } from '../src/platform/render-quality.js';
import { buildPerson } from '../src/scene/models.js';
import { eventAge } from '../src/game/progress.js';
assert.equal(initialQuality({ mobile: true, cores: 8, memory: 8 }), 1);
assert.equal(initialQuality({ mobile: true, cores: 4 }), 1); // iOS under-reports cores: phones start antialiased
assert.equal(initialQuality({ cores: 16, memory: 16 }), 2);
assert.equal(initialQuality({ saveData: true }), 0);
for (const profile of PROFILES) {
  const dpr = renderDpr(profile, 3840, 2160, 3);
  assert(dpr <= profile.dpr);
  assert(3840 * 2160 * dpr ** 2 <= profile.pixels + 0.001);
}
let reductions = 0;
const sample = frameMonitor(() => reductions++);
for (let i = 0; i < 600; i++) sample(16.67);
assert.equal(reductions, 0, 'smooth rendering keeps quality');
sample(5000);
assert.equal(reductions, 0, 'background gap cannot lower quality');
for (let i = 0; i < 65; i++) sample(66.67);
assert.equal(reductions, 1, 'sustained slow frames lower quality');
for (let i = 0; i < 30; i++) sample(66.67);
assert.equal(reductions, 1, 'cooldown avoids consecutive quality switches');
{ // a steady ~53 fps (one missed vsync in six) is a judder on the lane: quality steps down; an occasional miss does not
  const run = every => { let n = 0; const m = frameMonitor(() => n++); for (let i = 0; i < 1500; i++) m(i % every ? 16.67 : 33.3); return n; };
  assert(run(6) > 0, '~1 in 6 frames missed: steps down');
  assert.equal(run(20), 0, '~1 in 20 missed: keeps quality');
}
let promptReductions = 0;
const promptSample = frameMonitor(() => promptReductions++);
for (let i = 0; i < 15; i++) promptSample(400);
assert.equal(promptReductions, 1, 'very slow rendering must react within six seconds');
// HUD backing store: an iPad Pro (1366×1024 css, DPR 2) stays within its pixel budget; phones keep full resolution
// the minimal tier (-1): only reached by stepping down; below 1x 3D, one crowd row; this session only
assert.equal(profileAt(-1), MINIMAL); assert.equal(profileAt(0), PROFILES[0]); assert.equal(profileAt(2), PROFILES[2]);
assert(renderDpr(MINIMAL, 393, 852, 3) < 1.05 && renderDpr(MINIMAL, 1280, 800, 2) < 0.7, 'minimal draws the 3D below 1x');
assert(MINIMAL.rows === 1 && MINIMAL.backdrop < PROFILES[0].backdrop && MINIMAL.confetti < PROFILES[0].confetti);
// A full plaça, cheaply: the instanced figures (façades: backdrop; beyond the ring: mid), the static
// balcony people and the ring that answers hits (near) grow with the tier; low-end phones pay the least.
{
  const tiers = [MINIMAL, ...PROFILES];
  for (const k of ['backdrop', 'mid', 'balconies', 'near']) for (let i = 1; i < tiers.length; i++)
    assert(tiers[i][k] >= tiers[i - 1][k], `${k}: ${tiers[i].name} (${tiers[i][k]}) at least ${tiers[i - 1].name}'s (${tiers[i - 1][k]})`);
  assert(MINIMAL.mid > 0 && PROFILES[1].mid >= 120 && PROFILES[1].backdrop > 220, 'every tier fills the plaça; medium clearly more than before');
  assert(MINIMAL.near >= 8 && PROFILES[2].near <= 30, 'the reacting ring stays a first ring (10-30 people)');
}
assert(hudBudget(-1, true) < hudBudget(1, true) && hudBudget(0, false) === hudBudget(-1, false), 'a smaller HUD budget at low/minimal');
{ // software WebGL (no GPU): real-world renderer/vendor strings, and the failIfMajorPerformanceCaveat signal
  const soft = [
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'Google Inc. (Google)'], // Chrome --disable-gpu / blocklisted
    ['ANGLE (Google, SwiftShader Device (Subzero), SwiftShader driver)', 'Google Inc.'],
    ['Google SwiftShader', 'Google Inc.'], // older Chrome
    ['llvmpipe (LLVM 15.0.7, 256 bits)', 'Mesa'], // Linux Mesa (Firefox and Chrome's native GL)
    ['ANGLE (Mesa, llvmpipe (LLVM 17.0.6, 256 bits), OpenGL 4.5)', 'Google Inc. (Mesa)'],
    ['Mesa OffScreen / softpipe', 'VMware, Inc.'], ['Software Rasterizer', 'Mesa Project'],
    ['ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Google Inc. (Microsoft)'], // Windows, no driver
    ['Microsoft Basic Render Driver', 'Microsoft'], ['GDI Generic', 'Microsoft Corporation'], ['Apple Software Renderer', 'Apple Inc.'],
  ];
  const hard = [
    ['ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', 'Google Inc. (Apple)'],
    ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Google Inc. (NVIDIA)'],
    ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0), or similar', 'Mozilla'], // Firefox, sanitised
    ['Mozilla', 'Mozilla'], ['WebKit WebGL', 'WebKit'], ['', ''], // resistFingerprinting / masked / unknown: no guess
    ['Apple GPU', 'Apple Inc.'], ['Adreno (TM) 740', 'Qualcomm'], ['Mali-G78', 'ARM'], ['Mesa Intel(R) Xe Graphics (TGL GT2)', 'Intel'],
  ];
  for (const [renderer, vendor] of soft) assert(isSoftwareRenderer({ renderer, vendor }), `software: ${renderer}`);
  for (const [renderer, vendor] of hard) assert(!isSoftwareRenderer({ renderer, vendor }), `a GPU: ${renderer || '(none)'}`);
  assert(isSoftwareRenderer({ renderer: 'Mozilla', caveat: true }), 'a refused caveat context is software whatever the string says');
  assert(!isSoftwareRenderer() && !isSoftwareRenderer({ renderer: null, vendor: undefined }), 'no information: not software');
  assert.equal(profileAt(-1), MINIMAL, 'software WebGL boots at minimal (tests/quality-boot.mjs)');
  assert.equal(hudBudget(-1, false), Math.min(hudBudget(-1, false), hudBudget(0, false), hudBudget(2, false)), 'with the lowest HUD budget');
  // the probe: one cheap context, released; a second (plain) one only when the caveat context is refused
  const fake = ({ caveatOk = true, plainOk = true, renderer = 'WebKit WebGL', unmasked = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2)' } = {}) => {
    const log = { made: 0, lost: 0, ext: [] };
    const gl = { RENDERER: 1, VENDOR: 2, getParameter: k => ({ 1: renderer, 2: 'WebKit', 3: unmasked, 4: 'Google Inc.' })[k],
      getExtension: n => { log.ext.push(n); return n === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 3, UNMASKED_VENDOR_WEBGL: 4 } : { loseContext: () => log.lost++ }; } };
    const make = () => ({ getContext: (type, a) => (log.made++, type === 'webgl2' && (a.failIfMajorPerformanceCaveat ? caveatOk : plainOk) ? gl : null) });
    return { log, make };
  };
  let f = fake();
  assert.deepEqual(probeRenderer(f.make), { renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2)', vendor: 'Google Inc.', caveat: false, probe: 'ok' });
  assert(f.log.made === 1 && f.log.lost === 1, 'a GPU: one probe context, lost at once');
  f = fake({ caveatOk: false, unmasked: soft[0][0] });
  const p = probeRenderer(f.make);
  assert(p.caveat && p.probe === 'caveat' && isSoftwareRenderer(p) && f.log.made === 2 && f.log.lost === 1, 'SwiftShader: the caveat context is refused, the plain one read and lost');
  f = fake({ renderer: 'ANGLE (Intel, Intel(R) HD Graphics 400 Direct3D11 vs_5_0 ps_5_0), or similar' });
  assert(probeRenderer(f.make).renderer.startsWith('ANGLE (Intel') && !f.log.ext.includes('WEBGL_debug_renderer_info'), 'Firefox: RENDERER as is (no deprecated extension)');
  f = fake({ caveatOk: false, plainOk: false });
  assert.deepEqual(probeRenderer(f.make), { renderer: '', vendor: '', caveat: false, probe: 'none' }, 'no WebGL 2 at all is not "software"');
  assert.deepEqual(probeRenderer(() => { throw new Error('no canvas'); }), { renderer: '', vendor: '', caveat: false, probe: 'none' }, 'a failing probe never throws');
}
{ // far too slow frames drop two steps at once, merely slow ones one
  const got = []; const m = frameMonitor(s => got.push(s));
  for (let t = 0; t < 2000; t += 16) m(16); // warm-up
  for (let t = 0; t < 4200; t += 60) m(60); // every frame slow
  for (let t = 0; t < 2100; t += 16) m(16);
  for (let t = 0; t < 4200; t += 16) m(t % 32 ? 16 : 40); // ~50% slow
  assert.deepEqual(got, [2, 1]);
}
{ // hitches: a burst of spikes during play steps down once; one-offs, spread-out ones and menus never do
  const run = (spikeAt, play = true, ms = 16.67, total = 20000) => {
    const got = [], m = frameMonitor(s => got.push(s)), hits = new Set(spikeAt);
    for (let t = 0, i = 0; t < total; i++) { const d = hits.has(i) ? 80 : ms; m(d, play); t += d; }
    return got;
  };
  const f = s => Math.round(s * 60); // frame index at s seconds
  assert.deepEqual(run([2.5, 2.9, 3.3, 3.8, 4.4].map(f)), [1], 'five spikes within 3 s in play: one step');
  assert.deepEqual(run([2.5, 2.9, 3.3, 3.8, 4.4].map(f), false), [], 'spikes on a menu or the pause sheet: none');
  assert.deepEqual(run([3, 4.2, 5.4, 6.6, 7.8, 9, 10.2].map(f)), [], 'a spike now and then (a first use, a GC): none');
  assert.deepEqual(run([3, 3.1, 9, 9.1, 15, 15.1].map(f)), [], 'isolated double hitches: none');
  const stall = frameMonitor(() => assert.fail('a hidden tab or a stall is no hitch')); // gaps over 1 s reset the count
  for (let t = 0; t < 2100; t += 16) stall(16);
  for (let i = 0; i < 4; i++) { stall(80); stall(16); }
  stall(5000);
  for (let i = 0; i < 4; i++) { stall(80); stall(16); }
  for (let t = 0; t < 5000; t += 16) stall(16);
}
assert(1366 * 1024 * hudScale(1366, 1024, 2, 2_500_000) ** 2 <= 2_500_001, 'tablet HUD within budget');
assert(hudScale(1366, 1024, 2, 2_500_000) > 1.3, 'tablet HUD still sharper than 1x');
assert.equal(hudScale(393, 852, 3, 2_500_000), 2, 'phones: full HUD resolution (capped at 2)');
assert.equal(hudScale(3840, 2160, 1, 2_500_000), 1, 'never below 1x');
// Frame pacing, with synthetic rAF timing: callbacks land on the display's vsyncs; a drawn frame that costs `cost(t)`
// ms makes the next callback wait for the first vsync after it (a missed refresh), a skipped one costs nothing.
const simulate = (hz, ms, cost = () => 4, p = framePacer(), hold = () => false) => {
  const iv = 1000 / hz, drawn = [], flips = [];
  let half = p.half;
  for (let t = 0; t < ms;) {
    const draw = p(t, hold(t));
    if (p.half !== half) { half = p.half; flips.push([t, half]); }
    if (draw) drawn.push(t);
    t += draw ? Math.max(1, Math.ceil(cost(t) / iv - 1e-6)) * iv : iv;
  }
  const gaps = drawn.slice(1).map((t, i) => t - drawn[i]);
  return { p, drawn, flips, gaps };
};
const at60 = simulate(60, 2000), at90 = simulate(90, 2000);
assert(at60.drawn.length >= 119 && at60.flips.length === 0 && Math.round(at60.p.fps) === 60, '60 Hz: every frame');
assert(at90.drawn.length >= 179 && at90.flips.length === 0 && Math.round(at90.p.fps) === 90, '90 Hz: every frame (halving it would judder at 45)');
const fast120 = simulate(120, 20000);
assert(fast120.flips.length === 0 && fast120.drawn.length >= 2399 && Math.round(fast120.p.fps) === 120, '120 Hz, a device that keeps up: the full 120 fps');
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // repeatable "random" misses
const misses = share => () => (rnd() < share ? 12 : 4);
const busy = simulate(120, 20000, misses(0.05));
assert.equal(busy.flips.length, 0, '120 Hz: a few missed refreshes (well under 15%) keep the full rate');
const slow = simulate(120, 240000, misses(0.5)); // half its frames miss 8.3 ms
assert(slow.flips[0][1] === true && slow.flips[0][0] < 4000, '120 Hz, over 15% missed: half rate within a 2 s window (after warm-up)');
const halfGaps = slow.gaps.filter((g, i) => slow.drawn[i] > slow.flips[0][0] + 100 && slow.drawn[i + 1] < slow.flips[1][0] && g < 20);
assert(halfGaps.length > 200 && halfGaps.every(g => Math.abs(g - 1000 / 60) < 0.01), 'half rate: an even 60 fps (every other refresh)');
for (const [t] of slow.flips) assert(slow.flips.filter(([u]) => u >= t && u < t + 60000).length <= 3, 'at most 3 switches in any minute (no flip-flop)');
const ups = slow.flips.filter(([, h]) => !h).map(([t]) => t), downs = slow.flips.filter(([, h]) => h).map(([t]) => t);
assert(ups.length >= 2 && ups.every(t => t - Math.max(...downs.filter(d => d < t)) >= 5000), 'it retries 120 only after 5+ s of good frames at 60');
assert(slow.drawn.length / 240 < 66, 'a device that cannot hold 120 spends its time at an even 60');
const steady = simulate(120, 10000, () => 12); // every frame misses: rAF itself falls to 60
assert(steady.flips.length === 0 && steady.gaps.slice(5).every(g => Math.abs(g - 1000 / 60) < 0.01), 'rAF falling to 60 is an even 60 too, no switching');
const recovers = simulate(120, 30000, t => (t < 8000 ? (rnd() < 0.5 ? 12 : 4) : 4)); // e.g. the quality monitor stepped down
assert(recovers.flips.length === 2 && recovers.flips[1][1] === false && recovers.flips[1][0] - recovers.flips[0][0] >= 5000 && !recovers.p.half,
  'a device that catches up goes back to 120 after 5 s and stays');
// A song holds the rate: a device that can't keep 120 mid-song drops to an even 60 once and stays there until the
// song is over (a retry is a 2 s burst of missed refreshes, and each switch changes the notes' step: the lane «broke»).
{
  const song = t => t >= 10000 && t < 110000, twenty = () => (rnd() < 0.2 ? 12 : 4); // 20% of its 120 Hz frames miss
  const held = simulate(120, 130000, twenty, framePacer(), song), free = simulate(120, 130000, twenty);
  const inSong = r => r.flips.filter(([t]) => song(t));
  assert(inSong(held).length <= 1 && inSong(held).every(([, h]) => h), 'mid-song: at most one switch, and only down to 60');
  assert(inSong(free).some(([, h]) => !h), '(without the hold it retries 120 mid-song)');
  const after = held.flips.filter(([t]) => t >= 110000);
  assert(held.p.half || after.some(([, h]) => !h), 'after the song it may try 120 again');
  const breaks = r => r.gaps.filter((g, i) => i && song(r.drawn[i]) && Math.abs(g - r.gaps[i - 1]) > 1).length;
  assert(breaks(held) * 2 < breaks(free), `mid-song cadence breaks: held ${breaks(held)} vs free ${breaks(free)}`);
}
const stall = framePacer(); for (let t = 0; t < 3000; t += 1000 / 120) stall(t);
for (let t = 8000; t < 12000; t += 1000 / 120) stall(t); // a hidden tab / 5 s stall in between
assert(!stall.half && Math.round(stall.hz) === 120, 'a long gap is neither a slow frame nor the display rate');
// iOS Low Power Mode caps rAF at 30 Hz
const lpm = simulate(30, 10000);
assert(lpm.p.lowPower && Math.round(lpm.p.fps) === 30 && lpm.flips.length === 0 && lpm.drawn.length >= 299, '30 Hz: Low Power Mode, every frame, flagged for the FPS hint');
let paceDowns = 0; // the frame monitor sees the paced frames: no false downgrade on a ProMotion screen, full or half rate
const paceMon = frameMonitor(() => paceDowns++);
[slow, fast120, steady].forEach(r => r.gaps.forEach(g => paceMon(g)));
assert.equal(paceDowns, 0, 'paced 120 Hz frames keep quality');
let realDowns = 0;
const realMon = frameMonitor(() => realDowns++);
simulate(120, 12000, () => 55).gaps.forEach(g => realMon(g));
assert(realDowns > 0, 'too slow even at half rate: quality steps down');
// Compare the forward faces of the actual merged skin and hair boxes.
for (const seated of [false, true]) {
  const person = buildPerson({ seated });
  const positions = person.body.geometry.attributes.position;
  const top = seated ? 0.62 : 1.38;
  const fronts = [];
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) > top + 0.25 && positions.getZ(i) > 0.14) fronts.push(positions.getZ(i));
  }
  assert(fronts.some(z => Math.abs(z - 0.15) < 1e-6), 'hair front is recessed');
  assert(fronts.some(z => Math.abs(z - 0.16) < 1e-6), 'skin front remains intact');
  person.g.traverse(o => o.geometry?.dispose());
}
console.log('render quality, adaptation and forehead geometry ok');

// The skinned crowd (one draw call) draws exactly what the per-part meshes drew: same vertices, same colours,
// wherever the walk cycle, lean and arm poses put them, and nothing at all for a hidden (zero-scaled) person.
{
  const T = await import('three'), { skinCrowd } = await import('../src/scene/models.js');
  const opts = [{}, { kid: true }, { hat: '#333333' }, { seated: true }];
  const make = () => opts.map(o => { const p = buildPerson(o); if (o.kid) p.g.scale.setScalar(0.72); return p; });
  const pose = (people, s) => people.forEach((p, i) => {
    p.g.position.set(i * 1.3 - 2, 0.05 * s, s - i); p.g.rotation.set(0, s + i, 0, 'YXZ');
    p.torso.rotation.x = 0.2 * s; p.legs.forEach((l, j) => (l.rotation.x = (j ? -0.4 : 0.4) * s));
    p.arms.forEach((a, j) => { a.rotation.x = -2.8 + s; a.rotation.z = (j ? -0.3 : 0.3) * s; });
    p.g.updateMatrixWorld(true);
  });
  const ref = make(), people = make(), v = new T.Vector3();
  const expected = (hidden = -1) => ref.flatMap((p, pi) => [p.torso, ...p.legs, ...p.arms].flatMap(b => b.children.filter(o => o.isMesh).flatMap(m => {
    const pos = m.geometry.attributes.position, out = [];
    for (let i = 0; i < pos.count; i++) out.push(pi === hidden ? p.g.position.clone() : v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone());
    return out;
  })));
  const colours = people.flatMap(p => [p.torso, ...p.legs, ...p.arms].flatMap(b => b.children.filter(o => o.isMesh).flatMap(m => [...m.geometry.attributes.color.array])));
  const mesh = skinCrowd(people);
  assert.equal(people.flatMap(p => [p.torso, ...p.legs, ...p.arms]).filter(b => b.children.some(o => o.isMesh)).length, 0, 'the part meshes are gone: one mesh draws them');
  assert.deepEqual([...mesh.geometry.attributes.color.array].map(c => +c.toFixed(5)), colours.map(c => +c.toFixed(5)), 'same vertex colours, jitter and all');
  for (const [s, hidden] of [[0, -1], [0.7, -1], [-1.1, 2]]) {
    pose(ref, s); pose(people, s);
    if (hidden >= 0) { people[hidden].g.scale.setScalar(0); people[hidden].g.updateMatrixWorld(true); }
    mesh.skeleton.update();
    const want = expected(hidden);
    assert.equal(mesh.geometry.attributes.position.count, want.length);
    const worst = want.reduce((m, w, i) => Math.max(m, mesh.getVertexPosition(i, v).distanceTo(w)), 0);
    assert(worst < 1e-5, `pose ${s}: every skinned vertex where its part mesh put it (off by ${worst})`);
    if (hidden >= 0) people[hidden].g.scale.setScalar(people[hidden].scale);
  }
  assert.deepEqual(people.map(p => p.scale), [1, 0.72, 1, 1], 'each person remembers the size to show again at');
}
console.log('skinned crowd matches the per-part meshes ok');
// Musicians: every instrument is baked into the body and arm parts (no loose meshes), sticks and cymbals ride the arm
// that swings them, and the bombo's mallet rests on the drum's right head.
{
  const T = await import('three'), { buildMusician, BAND } = await import('../src/scene/models.js'), box = new T.Box3();
  for (const [kind] of BAND) {
    const p = buildMusician(kind);
    p.g.updateMatrixWorld(true);
    assert(p.g.children.every(o => !o.isMesh) && [p.torso, ...p.legs, ...p.arms].every(b => b.children.filter(o => o.isMesh).every(m => !m.geometry.attributes.position.array.some(Number.isNaN))), `${kind}: parts only, no NaN`);
    if (kind === 'bombo') {
      box.setFromObject(p.arms[1].children.at(-1), true);
      assert(box.max.x > -0.16 && box.max.x < -0.14 && box.min.y < 1.02 && box.max.y > 1.02, `the mallet rests on the head (${box.min.toArray().map(v => v.toFixed(2))} ${box.max.toArray().map(v => v.toFixed(2))})`);
    }
  }
}
console.log('band musicians ok');

// The backdrop stands beyond the camera's square and short of the façades; balcony people stay on their balconies.
{
  const { buildPlaza, buildPerson: person } = await import('../src/scene/models.js');
  const T = await import('three');
  const plaza = buildPlaza({ backdrop: 360, balconies: 24 });
  const { mesh, n } = plaza.backdrop, m = new T.Matrix4(), v = new T.Vector3();
  assert(n >= 300, `a dense backdrop (${n})`);
  for (let i = 0; i < n; i++) {
    mesh.getMatrixAt(i, m); v.setFromMatrixPosition(m);
    const out = Math.max(Math.abs(v.x), Math.abs(v.z));
    assert(out > plaza.inner - 1.5 + 0.1 && out < plaza.inner + 0.5, `backdrop figure ${i} in its band (${out.toFixed(2)})`);
  }
  assert.equal(mesh.geometry.attributes.position.count, 68, 'backdrop figure: 68 vertices (60 + two eyes; backs included, photo mode walks round them)');
  // Photo mode sees these people from every side. Raycast with the real one-sided material so a missing or
  // inward-facing wall fails, even if the total vertex count still happens to match.
  const figure = new T.Mesh(mesh.geometry, mesh.material), ray = new T.Raycaster();
  for (const [y, part] of [[0.4, 0], [1.1, 1], [1.5, 2]]) {
    for (const [x, z] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      ray.set(new T.Vector3(x, y, z), new T.Vector3(-x, 0, -z));
      const hit = ray.intersectObject(figure, false)[0];
      assert(hit && hit.distance < 1, `backdrop is solid at height ${y}, seen from ${x},${z}`);
      assert.equal(mesh.geometry.attributes.aPart.getX(hit.face.a), part === 2 && z === -1 ? 3 : part,
        'back of the head is hair; face and sides keep skin, torso keeps shirt, legs keep trousers');
    }
  }
  // the mid band: the same figures on an arc beyond the moving ring, clear of the band's sector
  const { buildBackdrop } = await import('../src/scene/models.js');
  const ring = { r0: 10.7, r1: 12.6, far: -0.52, half: 1.45, avoid: [[5.3, 0.47, 11.3]] };
  const mid = buildBackdrop(200, plaza.inner, plaza.props, { ring, share: plaza.backdrop }), at = [];
  assert(mid.n >= 150, `a dense mid band (${mid.n})`);
  assert(mid.mesh.material === mesh.material && mid.mesh.geometry.index === mesh.geometry.index && mid.mesh.geometry.attributes.position === mesh.geometry.attributes.position,
    'the mid band shares the backdrop’s material (no new shader program) and its figure');
  for (let i = 0; i < mid.n; i++) {
    mid.mesh.getMatrixAt(i, m); v.setFromMatrixPosition(m);
    const r = Math.hypot(v.x, v.z), a = Math.atan2(v.z, v.x), off = Math.abs(Math.atan2(Math.sin(a - ring.far), Math.cos(a - ring.far)));
    const band = Math.abs(Math.atan2(Math.sin(a - 5.3), Math.cos(a - 5.3))) < 0.47;
    assert(r >= (band ? 11.3 : ring.r0) - 1e-6 && r <= ring.r1 + 1e-6 && off <= ring.half + 1e-6, `mid figure ${i} in its arc (r ${r.toFixed(2)}, ${off.toFixed(2)} rad off)`);
    for (const [x, z] of at) assert(Math.hypot(x - v.x, z - v.z) >= 0.44, `mid figures ${i} stand apart`);
    at.push([v.x, v.z]);
  }
  assert.equal(plaza.balcony.length, 0, 'medium: balcony people are static, merged into the buildings');
  assert.equal(buildPlaza().backdrop, null, 'no backdrop unless asked');
  const kid = person({ rider: true, fan: '#b3122a' }), plain = person();
  const verts = p => { let n = 0; p.g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };
  assert(verts(kid) > verts(plain) + 200, 'rider and ventall add their boxes');
}
console.log('backdrop, balconies and crowd variety ok');

// Z-fighting: in every voxel model (people with each extra, each musician, the mulassa, the façade flags) no two boxes put faces looking
// the same way within 4 mm of each other where both can show (the overlap's middle not buried in a third box) in two
// different colours: the depth test can't pick one and they strobe as the model moves (hair on the heads, a hat's
// crown, a trumpet's bell did). Jittered boxes count as different colours.
{
  const T = await import('three'), { buildMusician, buildMulassa, buildFlag, BAND } = await import('../src/scene/models.js');
  const V = () => new T.Vector3();
  function zFights(root) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(), quads = [], boxes = [];
    let mi = 0;
    root.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)), P = g.attributes.position, C = g.attributes.color;
      for (let q = 0; q < P.count / 4; q++) {
        const v = [0, 1, 2, 3].map(k => V().fromBufferAttribute(P, q * 4 + k)), n = V().subVectors(v[1], v[0]).cross(V().subVectors(v[2], v[0])).normalize();
        quads.push({ box: `${mi}:${Math.floor(q / 6)}`, v, n, d: n.dot(v[0]), c: [C.getX(q * 4), C.getY(q * 4), C.getZ(q * 4)] });
      }
      mi++;
    });
    const byBox = Object.groupBy(quads, q => q.box);
    for (const [k, fs] of Object.entries(byBox)) { // axis-aligned boxes: what can bury a face
      if (fs.every(f => Math.max(...f.n.toArray().map(Math.abs)) > 0.999)) boxes.push({ k, b: new T.Box3().setFromPoints(fs.flatMap(f => f.v)) });
    }
    const out = [];
    for (let i = 0; i < quads.length; i++) for (let j = i + 1; j < quads.length; j++) {
      const a = quads[i], b = quads[j];
      if (a.box === b.box || a.n.dot(b.n) < 0.999 || Math.abs(a.d - b.d) >= 0.004 || a.c.every((c, k) => c === b.c[k])) continue;
      const u = V().subVectors(a.v[1], a.v[0]).normalize(), w = V().crossVectors(a.n, u); // a's own edges
      const span = (f, e) => [Math.min(...f.v.map(p => p.dot(e))), Math.max(...f.v.map(p => p.dot(e)))];
      const [au, bu, aw, bw] = [span(a, u), span(b, u), span(a, w), span(b, w)];
      const lu = Math.max(au[0], bu[0]), hu = Math.min(au[1], bu[1]), lw = Math.max(aw[0], bw[0]), hw = Math.min(aw[1], bw[1]);
      if (hu - lu < 1e-4 || hw - lw < 1e-4) continue;
      const mid = V().addScaledVector(u, (lu + hu) / 2).addScaledVector(w, (lw + hw) / 2).addScaledVector(a.n, (a.d + b.d) / 2);
      if (boxes.some(({ k, b: B }) => k !== a.box && k !== b.box && B.clone().expandByScalar(-1e-4).containsPoint(mid))) continue;
      out.push(`${a.box}/${b.box} at ${mid.toArray().map(x => x.toFixed(3))}`);
    }
    return out;
  }
  const models = [
    ...[{}, { kid: true }, { hat: '#b3122a' }, { rider: true, hat: '#26262e' }, { fan: '#f5c518' }, { faixa: '#d62828' }, { seated: true }]
      .map(o => [`person ${JSON.stringify(o)}`, buildPerson(o).g]),
    ...[...new Set(BAND.map(([kind]) => kind))].map(k => [`musician ${k}`, buildMusician(k).g]),
    ['mulassa', buildMulassa().root],
    // the façade flags (one plate per layer): estelada blava, estelada vermella, bandera de Valls; balcony and eaves sizes
    ...[1, 2, 3].flatMap(k => [false, true].map(big => [`flag ${k}${big ? ' (eaves)' : ''}`, buildFlag(k, big)])),
  ];
  for (const [name, root] of models) assert.deepEqual(zFights(root), [], `${name}: no coplanar faces in two colours`);
}
console.log('voxel models free of z-fighting ok');

// Execute the actual scene/simulation with Three.js geometry and a CPU renderer stub.
// This checks integration without requiring a GPU or adding production-only test hooks.
const { readFileSync } = await import('node:fs');
const vm = await import('node:vm');
const THREE = await import('three');
const models = await import('../src/scene/models.js');
const chart = await import('../src/game/chart.js');
const mainSource = loadMainSource();
const progress = await import('../src/game/progress.js');
const stars = await import('../src/hud/stars.js');
const practice = await import('../src/game/practice.js');
const energy = await import('../src/game/energy.js');
const bubblesLogic = await import('../src/game/bubble-rules.js');
const framing = await import('../src/scene/framing.js');
const dance = await import('../src/game/dance.js');
const titleLayoutLogic = await import('../src/hud/title-layout.js');
const orbitLogic = await import('../src/scene/orbit.js');
const leaderboardResult = await import('../src/services/leaderboard-result.js');
const shareLogic = await import('../src/services/share.js');
const { setupShare } = await import('../src/ui/share-ui.js');
const { setupLoader } = await import('../src/ui/loader.js');
const { errors, errorName } = await import('../src/services/errors.js'); // the real one: off here (no window, no DSN)
const loaderTimers = []; // #loader's delays, run by hand: flushLoader()
const flushLoader = () => { while (loaderTimers.length) loaderTimers.shift()(); };
const nodes = new Map();
const keyHandlers = [];
const windowHandlers = {};
const drawnText = [];
const hudWork = { ops: 0, clears: 0 }; // every read of a canvas method or property («mode foto» draws nothing)
const drawing = new Proxy({}, { get: (_, key) => (hudWork.ops++, key === 'clearRect' && hudWork.clears++, key === 'fillText') ? value => drawnText.push(value)
  : key === 'measureText' ? s => ({ width: String(s).length * 6 }) : key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
const document = {
  hidden: false,
  focused: true,
  hasFocus() { return this.focused; },
  listeners: {},
  addEventListener(type, handler) { const previous = this.listeners[type]; this.listeners[type] = previous ? (...args) => { previous(...args); handler(...args); } : handler; },
  body: { appendChild() {}, classList: { contains: () => false, toggle() {} }, style: { setProperty() {}, removeProperty() {} } },
  createElement: () => ({ style: {}, dataset: {}, after() {}, setAttribute() {}, appendChild() {}, querySelectorAll: () => [], querySelector: () => ({}) }),
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      style: {}, dataset: {}, options: [{}, {}], listeners: {}, open: false,
      addEventListener(type, handler) { this.listeners[type] = handler; },
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, blur() {}, setAttribute() {}, classList: { toggle() {}, add() {}, remove() {} }, contains: () => false, after() {},
      getContext: () => drawing,
    });
    return nodes.get(id);
  },
  querySelectorAll: () => [],
};
// Model node ownership so the real sheet handlers must move content both ways.
const privacyTextStub = { textContent: 'Privacy content' };
const privacyFragmentStub = { childNodes: [privacyTextStub], append(...children) {
  this.childNodes.push(...children); privacyBodyStub.childNodes.length = 0;
} };
const privacyBodyStub = { childNodes: [], append(fragment) {
  this.childNodes.push(...fragment.childNodes); fragment.childNodes.length = 0;
}, scrollTop: 0 };
const privacyMenuStub = document.getElementById('privacy-menu');
privacyMenuStub.querySelector = () => privacyBodyStub;
privacyMenuStub.close = function () { this.open = false; this.listeners.close(); };
document.getElementById('privacy-content').content = privacyFragmentStub;
class Renderer {
  constructor() { this.shadowMap = {}; this.lost = false; }
  getContext() { return { isContextLost: () => this.lost }; }
  setPixelRatio() {}
  setSize() {}
  render() {}
}
const context = vm.createContext({
  ...leaderboardResult, leaderboard: { configured: true },
  ...await import('../src/game/dance-drac.js'), ...await import('../src/game/drac-feet.js'), ...await import('../src/scene/drac-motion.js'), ...await import('../src/scene/models/drac.js'),
  // the Drac's revised dance (pure modules, provided like the old one): only the names the inlined scene code uses
  poseAt: (await import('../src/game/drac-pose.js')).poseAt, REF_END: (await import('../src/game/drac-pose.js')).REF_END, feetAt: (await import('../src/game/drac-steps.js')).feetAt,
  dracTime: (await import('../src/game/drac-time.js')).dracTime, ...await import('../src/game/drac-layout.js'), ...await import('../src/scene/drac-rig.js'), ...await import('../src/scene/drac-colla.js'), ...await import('../src/scene/mula-colla.js'),
  ...await import('../src/dev/final-test.js'), ALIAS_KEY: 'leaderboard-alias', DECLINES_KEY: 'publish-declines', // ?final: off here (no hostname)
  errors, errorName, audioFailureTags: (await import('../src/platform/audio.js')).audioFailureTags,
  THREE: { ...THREE, WebGLRenderer: Renderer }, ...await import('../src/scene/crowd-fx.js'), ...models, ...chart, ...progress, ...stars,
  PROFILES, initialQuality, renderDpr, frameMonitor, hudScale, framePacer, smoothClock, profileAt, hudBudget, isSoftwareRenderer, probeRenderer, Chip: class { constructor(song, opts) { context.chipOpts = opts; } menu() {} setMenuMusic(on) { (context.menuMusicCalls ||= []).push(on); } }, ...practice, ...energy, ...bubblesLogic, ...framing, ...dance, ...titleLayoutLogic, ...orbitLogic, setupSync: hooks => { context.syncHooks = hooks; return context.syncSheet = { open: false, show() { this.open = true; } }; },
  pixelSvg: () => '<svg></svg>', // src/ui/select-ui.js (provided)
  setupSelect: opts => (context.selectScreen = { opts, sheetOpen: false, visible(on) { this.shown = on; }, refocus() {} }),
  setupBoard: opts => (context.boardSheet = { opts, open: false, configured: true, shown: [], opened: [], results(show) { this.shown.push(show); }, publishable: false,
    openBoard(back) { this.open = true; this.opened.push(back); this.back = back; }, verifyStarts: 0, verifyStart() { this.verifyStarts++; },
    settingsRefreshed: 0, refreshSettings() { this.settingsRefreshed++; }, openPublish(o) { this.publishOpened = o; } }), // src/ui/board-ui.js has its own DOM tests (tests/board-ui.mjs)
  song: JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url))),
  dracShareSong: JSON.parse(readFileSync(new URL('../src/song-drac.json', import.meta.url))),
  ...shareLogic, // the real Comparteix sheet on the mocked DOM (no canvas here: the image fails quietly)
  setupLoader: doc => setupLoader(doc, { timers: { setTimeout: f => loaderTimers.push(f), clearTimeout() {} } }),
  sheetFades() {}, // src/ui/sheet-fade.js: scroll fades of the sheets, pure DOM
  setupNudge: opts => (context.nudgeMock = { opts, armed: 0, arm() { this.armed++; }, done() { this.ended = true; }, hide() {} }), // its rules: tests/feedback-ui.mjs
  setupProfile: () => ({ isOpen: false, open() {}, refresh() {} }), // src/ui/profile-ui.js
  setupFeedback: opts => (context.feedbackSheet = { opts, open: false, configured: true, shown: 0, show(back) { this.open = true; this.shown++; this.back = back; } }), // src/ui/feedback-ui.js: tests/feedback-ui.mjs
  setupShare: opts => (context.shareSheet = setupShare({ ...opts, doc: document, nav: {}, fonts: null, url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} } })),
  document, navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
  location: { search: '?representation=off' }, localStorage: { getItem() {}, setItem() {} }, // this mocked DOM supplies the original cast; representation-motion tests the new rigs
  matchMedia: () => ({ matches: false }), addEventListener(type, handler) {
    (windowHandlers[type] ||= []).push(handler);
    if (type === 'keydown') keyHandlers.push(handler);
  },
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  URLSearchParams, performance: { now: () => 0 }, requestAnimationFrame() {}, window: {}, setTimeout() {}, clearTimeout() {},
});
// The vm context has its own Math; models.js's rnd()/pick() (buildPerson, placeHome...) are this realm's, so the
// tests below seed BOTH (they stay seeded from here on): `seedR = n` inside the context and hostSeed(n) here (else crowd variety is unseeded).
const hostSeed = n => { let s = n; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; };
hostSeed(5); vm.runInContext('var seedR = 5, seeded = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647, mathRandom = Math.random; Math.random = seeded;', context);
vm.runInContext(mainSource, context);
// The camera-fit silhouettes are test-only (the game no longer computes them): they fold her, so the last call restores the standing pose.
vm.runInContext(`// Fit each part separately: a single tall box wastes the empty space above her back. The margins are the dance's reach
// (dance.js): the front thrown up by a jump (the rear stays down: 0.4 m per m towards the front) and the swing of a lean.
function silhouettePoints(collapse = 0) { // prepared once; the head folds beyond the standing footprint
  mula.neck.rotation.x = 0.15 + collapse * 1.2; mula.head.rotation.x = 0.2;
  mula.jaw.rotation.x = collapse * 0.6 + 0.12;
  for (const ear of mula.ears) ear.rotation.x = -0.25 + collapse * 0.9;
  mula.body.rotation.z = collapse * 0.25; mula.root.position.y = -collapse * 0.42;
  mula.root.updateMatrixWorld(true);
  const points = [], p = new THREE.Vector3();
  mula.root.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld);
      const rise = 0.45 + Math.max(0, 0.4 * (p.z + 1.6)), swing = Math.max(0, 0.47 * (p.y - 0.9));
      points.push(p.x, p.y + rise, p.z, p.x - swing, p.y, p.z, p.x + swing, p.y, p.z, p.x, Math.max(-0.05, p.y - 0.5), p.z); // (never below the floor: it hides that)
    }
  });
  return new Float32Array(points);
}
const COLLAPSE_POINTS = new Float32Array([...silhouettePoints(0.5), ...silhouettePoints(0.8), ...silhouettePoints(1)]);
const MULA_POINTS = silhouettePoints();
`, context);
const run = source => vm.runInContext(source, context);
run('qualityLevel=0;applyRenderQuality();');
// A spectator pressed against a tree must slide away while either figure keeps asking to walk.
{
  run(`var passageSavedCrowd=activeCrowd, passageSavedProps=plaza.props, passageSavedBand=bandSpots,
    passageSavedExtras=photoExtras.slice(), passageSavedSource=photoBandSource,
    passageBackdropCount=plaza.backdrop.mesh.count, passageMidCount=midCrowd.mesh.count;
    var trappedPerson=activeCrowd[0], trappedRadius=trappedPerson.rad, trappedSootT=trappedPerson.sootT, trappedSootW=trappedPerson.sootW;
    activeCrowd=[trappedPerson];bandSpots=[];photoBandSource=bandSpots;photoExtras.length=0;
    plaza.backdrop.mesh.count=midCrowd.mesh.count=0;plaza.props=[{x:15.2,z:-3,r:2.2,h:4}];trappedPerson.rad=.52;`);
  for (const id of ['mulassa-valls', 'drac-valls']) for (const floor of [false, true]) for (const charred of [false, true]) {
    const scenario = `${id}, ${floor ? 'floor' : 'live'}, ${charred ? 'charred' : 'normal'}`;
    run(`G.state='select';setView(false);setFigureSong(MULASSA);setView(true);takeFigure('${id}');setPhotoControl(true,'${id}',false);
      activeCrowd=${floor ? '[]' : '[trappedPerson]'};photoExtras.length=0;
      if(${floor})photoExtras.push({pos:trappedPerson.pos,rad:trappedPerson.rad,vx:0,vz:0,band:trappedPerson,offsetX:0,offsetZ:0});
      PHOTO.ready=true;PHOTO.cameraYaw=Math.atan2(MID.fx,MID.fz)+Math.PI;
      Object.assign(photoBody(),{x:9.4,z:-1.52,yaw:Math.atan2(MID.fx,MID.fz),vx:0,vz:0});
      trappedPerson.pos.set(12.5273,-2.4943);trappedPerson.gx=12.5273;trappedPerson.gz=-2.4943;trappedPerson.vel.set(0,0);trappedPerson.g.position.set(12.5273,0,-2.4943);trappedPerson.sootT=${charred ? 4 : 0};trappedPerson.sootW=${charred ? 1 : 0};
      if(${charred})sootTake(trappedPerson);
      PHOTO.keys.add('KeyW');var trappedStart=photoBody().x,trappedMoved=0,trappedMin=99,trappedTreeMin=99,trappedMaxStep=0;
      for(let i=0;i<180;i++){var oldX=photoBody().x,oldZ=photoBody().z;clock+=1/60;
        animMula(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);
        trappedMoved=Math.max(trappedMoved,Math.hypot(trappedPerson.pos.x-12.5273,trappedPerson.pos.y+2.4943));
        trappedMin=Math.min(trappedMin,photoClearance(photoBody().x,photoBody().z,photoBody().yaw,${floor ? 'trappedPerson.g.position.x' : 'trappedPerson.gx'},${floor ? 'trappedPerson.g.position.z' : 'trappedPerson.gz'},trappedPerson.rad,PHOTO.id==='drac-valls'));
        trappedTreeMin=Math.min(trappedTreeMin,Math.hypot(trappedPerson.pos.x-15.2,trappedPerson.pos.y+3)-2.72);
        trappedMaxStep=Math.max(trappedMaxStep,Math.hypot(photoBody().x-oldX,photoBody().z-oldZ));}`);
    assert(run('photoBody().x-trappedStart>.4'), `${scenario}: held W advances after the spectator clears the tree (${run('photoBody().x-trappedStart')})`);
    assert(run('trappedMoved>.6'), `${scenario}: the trapped spectator finds room beside the tree`);
    assert(run('trappedTreeMin>=-1e-5 && trappedMin>=-.03'), `${scenario}: neither the tree nor the visible spectator is crossed ${run('JSON.stringify([trappedTreeMin,trappedMin])')}`);
    assert(run('trappedMaxStep<=PHOTO_RUN.trot/60+1e-6'), `${scenario}: opening the path never teleports the figure`);
    if (charred) assert(run('trappedPerson.sootW===1 && trappedPerson.sootT===4'), `${scenario}: stepping aside preserves the soot effect`);
    run('setView(false);animMula(1/60,clock/BEAT);');
  }
  run(`trappedPerson.rad=trappedRadius;trappedPerson.sootT=trappedSootT;trappedPerson.sootW=trappedSootW;activeCrowd=passageSavedCrowd;plaza.props=passageSavedProps;bandSpots=passageSavedBand;
    photoBandSource=passageSavedSource;photoExtras.length=0;photoExtras.push(...passageSavedExtras);
    plaza.backdrop.mesh.count=passageBackdropCount;midCrowd.mesh.count=passageMidCount;`);
  console.log('held WASD clears a spectator trapped against scenery for both figures');
}

