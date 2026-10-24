import './fps.mjs';
import './finale-effects.mjs';
import './adaptive-quality.mjs';
import './photo-control.mjs';
import { verifyJumpImpact } from './jump-impact.mjs';
import { verifyManualSway } from './manual-sway.mjs';
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
  createElement: () => ({ style: { setProperty() {} }, dataset: {}, after() {}, click() {}, setAttribute() {}, appendChild() {}, addEventListener() {}, contains: () => false, querySelectorAll: () => [], querySelector: () => ({ style: { setProperty() {} }, classList: { toggle() {} } }) }), // (ui/free-music.js listens on its own button; ui/photo-stick.js draws its stick)
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      style: { setProperty() {} }, dataset: {}, options: [{}, {}], listeners: {}, open: false, toggleAttribute() {}, // (#free dances on the menu beat: controls.js freeDance)
      addEventListener(type, handler) { this.listeners[type] = handler; },
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, blur() {}, setAttribute() {}, classList: { toggle() {}, add() {}, remove() {} }, contains: () => false, after() {},
      getContext: () => drawing, getBoundingClientRect: () => ({ left: 10, top: 10, right: 54, bottom: 54, width: 44, height: 44 }), // (the radio sits by #viewmode)
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
  dracTime: (await import('../src/game/drac-time.js')).dracTime, ...await import('../src/game/drac-layout.js'), ...await import('../src/scene/drac-rig.js'), ...await import('../src/scene/drac-colla.js'), ...await import('../src/scene/mula-colla.js'), ...await import('../src/scene/bou-colla.js'),
  buildBou: (await import('../src/scene/models/bou.js')).buildBou, createBouMotion: (await import('../src/scene/bou-motion.js')).createBouMotion, ...await import('../src/game/bou-dance.js'), // the Bou (provided)
  ...await import('../src/dev/final-test.js'), ALIAS_KEY: 'leaderboard-alias', DECLINES_KEY: 'publish-declines', // ?final: off here (no hostname)
  errors, errorName, audioFailureTags: (await import('../src/platform/audio.js')).audioFailureTags,
  THREE: { ...THREE, WebGLRenderer: Renderer }, ...await import('../src/scene/crowd-fx.js'), ...models, ...chart, ...progress, ...stars,
  PROFILES, initialQuality, renderDpr, frameMonitor, hudScale, framePacer, smoothClock, profileAt, hudBudget, isSoftwareRenderer, probeRenderer, Chip: class { constructor(song, opts) { context.chipOpts = opts; } menu() {} setMenuMusic(on) { (context.menuMusicCalls ||= []).push(on); } }, ...practice, ...energy, ...bubblesLogic, ...framing, ...dance, ...titleLayoutLogic, ...orbitLogic, setupSync: hooks => { context.syncHooks = hooks; return context.syncSheet = { open: false, show() { this.open = true; } }; },
  pixelSvg: () => '<svg></svg>', // src/ui/select-ui.js (provided)
  setupSelect: opts => (context.selectScreen = { opts, sheetOpen: false, visible(on) { this.shown = on; }, refocus() {} }),
  setupBoard: opts => (context.boardSheet = { opts, open: false, configured: true, shown: [], opened: [], results(show) { this.shown.push(show); }, publishable: false,
    openBoard(back) { this.open = true; this.opened.push(back); this.back = back; }, verifyStarts: 0, verifyStart() { this.verifyStarts++; },
    settingsRefreshed: 0, refreshSettings() { this.settingsRefreshed++; }, openPublish(o) { this.publishOpened = o; },
    standings: [], standing(figure) { this.standings.push(figure); return Promise.resolve(null); } }), // src/ui/board-ui.js has its own DOM tests (tests/board-ui.mjs)
  song: JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url))),
  dracShareSong: JSON.parse(readFileSync(new URL('../src/song-drac.json', import.meta.url))),
  ...shareLogic, // the real Comparteix sheet on the mocked DOM (no canvas here: the image fails quietly)
  setupLoader: doc => setupLoader(doc, { timers: { setTimeout: f => loaderTimers.push(f), clearTimeout() {} } }),
  sheetFades() {}, // src/ui/sheet-fade.js: scroll fades of the sheets, pure DOM
  setupNudge: opts => (context.nudgeMock = { opts, armed: 0, arm() { this.armed++; }, done() { this.ended = true; }, hide() {} }), // its rules: tests/feedback-ui.mjs
  setupProfile: () => ({ isOpen: false, open() {}, refresh() {} }), // src/ui/profile-ui.js
  // the Perfil, the seasons and the cards (their DOM: tests/account-ui.mjs); the statistics' upload (tests/stats-sync.mjs)
  setupAccount: () => (context.accountSheet = { isOpen: false, opened: 0, open() { this.opened++; }, notice: () => false }),
  setupSeasons: () => ({ isOpen: false, open() {} }), setupSeasonEnd: () => ({ isOpen: false, check: async () => false, news: async () => null }), setupCard: () => ({ isOpen: false, open() {} }),
  statsSync: { use() {}, holdWhile(fn) { context.statsHold = fn; }, init: async () => {}, afterRun() { context.statsAfterRuns = (context.statsAfterRuns || 0) + 1; }, acceptNotice() {}, noticeNeeded: () => false }, markStatsNoticeSeen() {},
  setupFeedback: opts => (context.feedbackSheet = { opts, open: false, configured: true, shown: 0, show(back) { this.open = true; this.shown++; this.back = back; } }), // src/ui/feedback-ui.js: tests/feedback-ui.mjs
  refreshIdentity: (service, kv) => { (context.identityAsked ||= []).push(kv); return Promise.resolve(); }, // src/ui/board-list.js: tests/account-ui.mjs
  setupShare: opts => (context.shareSheet = setupShare({ ...opts, doc: document, nav: {}, fonts: null, url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} } })),
  document, navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
  location: { hostname: 'localhost', search: '?representation=off' }, localStorage: { getItem() {}, setItem() {} }, // this mocked DOM supplies the original cast; representation-motion tests the new rigs
  matchMedia: () => ({ matches: false }), addEventListener(type, handler) {
    (windowHandlers[type] ||= []).push(handler);
    if (type === 'keydown') keyHandlers.push(handler);
  },
  innerWidth: 1280, innerHeight: 720, screen: { width: 1280, height: 720 }, devicePixelRatio: 1,
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
run('qualityLevel = 0; applyRenderQuality();');
assert(run('crowd.some(p => !p.g.visible)'), 'downgrade hides some spectators');
assert(run('crowd.every(p => p.g.scale.x === (p.g.visible ? p.scale : 0))'), 'hidden spectators shrink to nothing in the skinned crowd mesh');
assert(run('[...crowd, ...plaza.band, ...plaza.balcony].every(p => { let n = 0; p.g.traverse(o => { if (o.isMesh) n++; }); return n === 0; }) && crowdMesh.isSkinnedMesh && crowdMesh.skeleton.bones.length === [...crowd, ...plaza.band, ...plaza.balcony].reduce((n, p) => n + 1 + p.legs.length + p.arms.length, 0)'),
  'the whole crowd, the band (instruments and all) and balcony people are one skinned mesh, its bones their own pivots');
assert(run('(() => { let plain = 0, shared = 0; scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) { plain++; if (o.material === crowdMesh.material) shared++; } }); return plain > 0 && shared === 0; })()'),
  'the skinned crowd has a material of its own (shared with plain meshes, three.js would switch programs twice a frame)');
assert(run('plaza.balcony.length > 20 && plaza.balcony.length <= PROFILES[2].balconies && plaza.balcony.every((p, i) => p.g.scale.x === (i < PROFILES[0].balconies ? 1 : 0))'), 'fewer balcony people at low');
assert(run('plaza.backdrop.mesh.count === PROFILES[0].backdrop && plaza.backdrop.n === PROFILES[2].backdrop'), 'the backdrop thins out at low');
assert(run('midCrowd.mesh.count === PROFILES[0].mid && midCrowd.n >= PROFILES[1].mid'), 'the mid band thins out at low');
run('qualityLevel = 2; applyRenderQuality();');
assert(run('crowd.every(p => p.g.visible && p.g.scale.x === p.scale && p.scale === (p.kid ? 0.72 : 1)) && crowdMesh.castShadow'), 'upgraded again: everyone back at full size (kids smaller), casting shadows');
assert(run('plaza.balcony.every(p => p.g.scale.x === 1) && plaza.backdrop.mesh.count === PROFILES[2].backdrop'), 'balconies and the full backdrop come back');
// A runtime downgrade keeps its first exposed frame and retires every kind of spectator smoothly.
run(`qualityLevel = 2; applyRenderQuality();
  var retiring = crowd.find(p => p.row === 2), kept = crowd.find(p => p.row === 0 && p.slot % 2 === 0);
  retiring.pres = 0.7; retiring.g.scale.setScalar(retiring.scale * retiring.pres);
  var crowdBefore = retiring.g.scale.x, bandBefore = plaza.band.at(-1).g.scale.x,
    backdropBefore = plaza.backdrop.mesh.count, midBefore = midCrowd.mesh.count;
  qualityLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('retiring.g.visible && retiring.g.scale.x === crowdBefore && retiring.pres === 0.7'), 'a downgrade preserves the exposed pose and gameplay presence');
assert(run('plaza.backdrop.mesh.count === backdropBefore && midCrowd.mesh.count === midBefore && plaza.band.at(-1).g.scale.x === bandBefore'), 'static spectators and musicians do not disappear on the profile switch');
run('animateRenderQuality(0);');
assert(run('retiring.g.scale.x === crowdBefore'), 'paused time cannot advance the quality transition');
run('animateRenderQuality(0.4);');
assert(run('Math.abs(retiring.g.scale.x - crowdBefore / 2) < 1e-6 && activeCrowd.includes(retiring) && kept.qualityScale === 1'), 'halfway: retiring spectators shrink smoothly, stay simulated, and retained people keep their size');
assert(run('plaza.band.at(-1).g.scale.x > 0 && plaza.band.at(-1).g.scale.x < 1 && plaza.balcony.at(-1).g.scale.x > 0'), 'musicians and balconies also have intermediate sizes');
assert(run(`(() => { const m = new THREE.Matrix4(); plaza.backdrop.mesh.getMatrixAt(PROFILES[0].backdrop, m); return m.elements[0] ** 2 + m.elements[2] ** 2 > 0; })()`), 'retiring instanced spectators still have geometry halfway through');
run('animateRenderQuality(0.4);');
assert(run('!retiring.g.visible && retiring.g.scale.x === 0 && !activeCrowd.includes(retiring) && retiring.pres === 0.7'), 'completed retirement releases simulation without changing gameplay presence');
assert(run('plaza.backdrop.mesh.count === PROFILES[0].backdrop && midCrowd.mesh.count === Math.min(midCrowd.n, PROFILES[0].mid) && plaza.balcony.at(-1).g.scale.x === 0'), 'completed retirement restores the target drawing budgets');
run(`qualityLevel = 2; applyRenderQuality({ transition: true }); animateRenderQuality(0.2);
  var reversingScale = retiring.g.scale.x; qualityLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('retiring.g.scale.x === reversingScale'), 'a new profile continues from the currently visible size');
run('animateRenderQuality(1);');
for (const hz of [30, 60, 120]) {
  run(`qualityLevel = 2; applyRenderQuality(); qualityLevel = 0; applyRenderQuality({ transition: true });
    for (let i = 0; i < ${hz}; i++) animateRenderQuality(1 / ${hz});`);
  assert(run('!qualityTransition && !retiring.g.visible'), `quality retirement finishes at ${hz} fps`);
}
run('var calmBeforeQuality = CALM.matches; CALM.matches = true; qualityLevel = 2; applyRenderQuality({ transition: true });');
assert(run('!qualityTransition && retiring.g.scale.x === retiring.scale'), 'reduced motion installs the final profile without scaling animation');
run('CALM.matches = calmBeforeQuality;');
run(`qualityLevel = 0; applyRenderQuality(); var emerging = crowd.find(p => !p.g.visible);
  qualityLevel = 2; applyRenderQuality({ transition: true }); animateRenderQuality(0.1);`);
assert(run('emerging.g.visible && emerging.qualityScale < 1 && activeCrowd.includes(emerging)'), 'a growing spectator is simulated before reaching full size');
run('animateRenderQuality(1);');
run(`qualityLevel = 2; applyRenderQuality(); var bandBeforeMove = plaza.band[0].g.position.clone();
  qualityLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('plaza.band[0].g.position.distanceTo(bandBeforeMove) < 1e-9'), 'a quality change cannot teleport the visible band');
run('animateRenderQuality(0.4); var bandMidMove = plaza.band[0].g.position.clone(); animateRenderQuality(0.4);');
assert(run('bandMidMove.distanceTo(bandBeforeMove) > 0.1 && plaza.band[0].g.position.distanceTo(bandMidMove) > 0.1'), 'the band travels through an intermediate position');

console.log('quality transitions: continuous presence, bounded retirement, reversal, reduced motion and 30/60/120 Hz ok');
// Changing shadow support needs new material programs, and a visible downgrade fades before releasing its map.
run(`qualityLevel = 1; applyRenderQuality();
  var shadowFloor = plaza.group.children.find(o => o.isMesh && o.receiveShadow), shadowVersion = shadowFloor.material.version;
  var shadowDisposals = 0, fadingShadowMap = { dispose() { shadowDisposals++; } }; sun.shadow.map = fadingShadowMap;
  qualityLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('renderer.shadowMap.enabled && sun.shadow.map === fadingShadowMap && sun.shadow.intensity === 1'), 'a visible shadow downgrade preserves the first frame and its live map');
run('animateRenderQuality(0.4);');
assert(run('sun.shadow.intensity > 0 && sun.shadow.intensity < 1 && shadowDisposals === 0'), 'the shadow fades while its map remains available');
run('animateRenderQuality(0.4);');
assert(run('!renderer.shadowMap.enabled && sun.shadow.intensity === 0 && sun.shadow.map === null && shadowDisposals === 1'), 'only the completed fade turns shadows off and releases their GPU map');
assert(run('shadowFloor.material.version > shadowVersion'), 'receiving materials invalidate their shadow program when support turns off');
run(`shadowVersion = shadowFloor.material.version; qualityLevel = 1; applyRenderQuality({ transition: true });`);
assert(run('renderer.shadowMap.enabled && sun.shadow.intensity === 0 && shadowFloor.material.version > shadowVersion'), 'returning shadows start at zero with the correct material programs');
run('animateRenderQuality(0.3); var interruptedShadow = sun.shadow.intensity; qualityLevel = 0; applyRenderQuality({ transition: true });');
assert(run('sun.shadow.intensity === interruptedShadow'), 'reversing a shadow fade preserves its current light level');
run('animateRenderQuality(1); qualityLevel = 1; applyRenderQuality();');
assert(run('renderer.shadowMap.enabled && sun.shadow.intensity === 1'), 'startup or an immediate profile restores full shadow intensity');
console.log('quality shadows: continuous intensity, deferred disposal and material program invalidation ok');
// The mid band stands on the far side from the play camera, nowhere near its line to her (she stays within 1 m of the
// middle; the camera 8–22 m back, kept in the square).
assert(run(`(() => { const m = new THREE.Matrix4(), v = new THREE.Vector3(), bad = [];
  for (let i = 0; i < midCrowd.mesh.count; i++) {
    midCrowd.mesh.getMatrixAt(i, m); v.setFromMatrixPosition(m);
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) for (const d of [8, 15, 22]) {
      const c = insidePlaza(new THREE.Vector3(x + d * CAM_DIR[0], 1 + d * CAM_DIR[1], z + d * CAM_DIR[2]), x, 1, z);
      const vx = x - c.x, vz = z - c.z, k = Math.max(0, Math.min(1, ((v.x - c.x) * vx + (v.z - c.z) * vz) / (vx * vx + vz * vz)));
      if (Math.hypot(v.x - c.x - vx * k, v.z - c.z - vz * k) < 4) bad.push([v.x, v.z, d]);
    }
  }
  return bad.length === 0 || JSON.stringify(bad.slice(0, 3)); })()`) === true, 'the mid band is never between the play camera and her');
// The band: as many as the quality allows (a full line-up at every size), at the ring's edge across the plaça from the
// play camera, facing the middle, never between the camera and her, with room in the ring; it plays on the song's beat.
for (const q of [0, 1, 2]) {
  run(`qualityLevel = ${q}; applyRenderQuality();`);
  const b = JSON.parse(run(`JSON.stringify(plaza.band.filter(p => p.g.scale.x > 0).map(p => ({ kind: p.kind, x: p.g.position.x, z: p.g.position.z, yaw: p.g.rotation.y })))`));
  assert.equal(b.length, run(`PROFILES[${q}].band`), `quality ${q}: ${b.length} musicians`);
  assert(['clarinet', 'trumpet', 'trombone', 'tuba', 'bombo'].every(k => b.some(m => m.kind === k)), `quality ${q}: woodwind, brass and a bombo`);
  assert(run(`plaza.band.slice(PROFILES[${q}].band).every(p => p.g.scale.x === 0)`), `quality ${q}: the rest hidden`);
  for (const m of b) {
    const r = Math.hypot(m.x, m.z);
    assert(r > 9.5 && r < 11, `quality ${q}: ${m.kind} at the ring's edge (${r.toFixed(2)})`);
    assert(Math.abs(Math.sin(m.yaw) * m.x + Math.cos(m.yaw) * m.z + r) < 1e-6, `quality ${q}: ${m.kind} faces the middle`);
    for (let n = 0; n < 2; n++) for (let o = 0; o < 2; o++) for (const d of [8, 15, 22]) { // her within 1 m of the middle
      const hx = n * 2 - 1, hz = o * 2 - 1, c = JSON.parse(run(`JSON.stringify(insidePlaza(new THREE.Vector3(${hx} + ${d} * CAM_DIR[0], 1 + ${d} * CAM_DIR[1], ${hz} + ${d} * CAM_DIR[2]), ${hx}, 1, ${hz}))`));
      const vx = hx - c.x, vz = hz - c.z, k = Math.max(0, Math.min(1, ((m.x - c.x) * vx + (m.z - c.z) * vz) / (vx * vx + vz * vz)));
      assert(Math.hypot(m.x - c.x - vx * k, m.z - c.z - vz * k) > 3, `quality ${q}: ${m.kind} is nowhere near the play camera's line to her`);
    }
    assert(run(`crowd.every(p => Math.hypot(p.pos.x - ${m.x}, p.pos.y - ${m.z}) > 1)`), `quality ${q}: the ring leaves the band room`);
  }
}
{
  const pose = (beat, live = 1) => JSON.parse(run(`poseBand(plaza.band, ${beat}, ${live}); JSON.stringify(Object.fromEntries(['bombo', 'caixa', 'plats', 'clarinet'].map(k => { const p = plaza.band.find(q => q.kind === k); return [k, { rest: p.rest, arms: p.arms.map(a => [a.rotation.x, a.rotation.z]), nod: p.torso.rotation.x }]; })))`));
  const at = (m, i) => Math.abs(m.arms[i][0] - m.rest[i * 2]) + Math.abs(m.arms[i][1] - m.rest[i * 2 + 1]);
  for (const k of [4, 5, 37]) { // on the beat: mallet and right stick on the drums, winds nod; between: sticks up
    const on = pose(k), half = pose(k + 0.5), up = pose(k + 0.7);
    assert(at(on.bombo, 1) < 1e-9 && at(on.caixa, 1) < 1e-9 && at(half.caixa, 0) < 1e-9, `beat ${k}: bombo and caixa strike on the beat, the left stick between`);
    assert(at(up.bombo, 1) > 0.5 && at(half.caixa, 1) > 0.3, `beat ${k}: the mallet and stick are up between the hits`);
    assert(on.clarinet.nod > 0.04 && Math.abs(half.clarinet.nod) < 1e-9, `beat ${k}: the winds nod on the beat`);
    assert((k % 2 === 0) === (at(on.plats, 0) < 1e-9 && at(on.plats, 1) < 1e-9), `beat ${k}: the plats crash every other beat`);
  }
  const still = pose(4.6, 0);
  assert(['bombo', 'caixa', 'plats', 'clarinet'].every(k => at(still[k], 0) + at(still[k], 1) < 1e-9 && still[k].nod === 0), 'before the first note the band holds still');
  run('animCrowd(0.016, 8, 0, 1)');
  assert(run('plaza.band.find(p => p.kind === "bombo").arms[1].rotation.z === plaza.band.find(p => p.kind === "bombo").rest[3]'), 'the crowd update plays the band on the beat');
}
run('G.finale = true; for (let i = 0; i < 60; i++) animCrowd(0.05, i / 10, 0); G.finale = false;');
assert(run('plaza.backdrop.u.uWave.value > 0.9 && crowd.some(p => p.arms[0].rotation.x < -2.5)'), 'the finale sends a wave round the ring, backdrop included');
run('qualityLevel = 0; applyRenderQuality();');
assert(run('!crowdMesh.castShadow && !crowdMesh.receiveShadow'), 'no spectator shadows below high');
// Force candidate selection toward a hidden spectator if one is offered.
context.pick = candidates => candidates.find(p => p?.g && !p.g.visible) ?? candidates[0];
run(`animCrowd(0, 0, 0); scene.updateMatrixWorld(true);
  chip = { sfx() {}, t0: 0, now: () => clock }; camera.position.set(2, 12, 24); camera.lookAt(0, 6, 0); camera.updateMatrixWorld(true);
  Object.assign(G, { state: 'play', diff: 1, go: 0, energy: 1, streak: 0, combo: 5 }); M.missT = -9; clock = 10;
  rests = restTimeline([{ t: 0 }, { t: 200 }]);
  bubble('VISCA!', null);`);
assert(run(`bubbles.length === 1 && bubbles.every(b => {
  const anchor = b.pos();
  return crowd.some(p => p.g.visible && p.g.position.x === anchor.x && p.g.position.z === anchor.z);
})`), 'rest bubbles stay anchored to visible spectators after downgrade');
const inView = `bubbles.every(b => { const v = bubbleView(); return !b.shown || (b.box.x0 >= v.l - 0.01 && b.box.x1 <= v.r + 0.01 && b.box.y0 >= v.t - 0.01 && b.box.y1 <= v.b + 0.01); })`;
run(`var chat = diff => { clock = 10; bubbles.length = 0; lastBubble = -9; nextChatter = 0; G.diff = diff; var seen = new Set(), most = 0; // each 20 s chat inside the song, however long it is
    rests = restTimeline([{ t: clock - 1 }, { t: clock + 200 }]);
    for (let f = 0; f < 600; f++) { clock += 1 / 30; drawBubbles(); bubbles.forEach(b => seen.add(b)); most = Math.max(most, bubbles.length); if (!(${inView})) return 'out'; }
    return { lines: [...seen].map(b => b.txt), most }; };
  Object.assign(G, { streak: 0, combo: 5, energy: 1 }); M.missT = -9;
  var hard = chat(2), normal = chat(1), easy = chat(0);
  G.streak = 2; var struggling = chat(2); G.streak = 0; G.combo = 1; var stillShaken = chat(2); G.combo = 4; var recovered = chat(2);
  G.practice = {}; var practising = chat(2); G.practice = null;`);
for (const diff of ['hard', 'normal', 'easy']) {
  assert(run(`${diff} !== 'out' && ${diff}.lines.length >= 2 && ${diff}.lines.length <= 3 && ${diff}.most === 1`), `${diff}: one bubble at a time, at least eight seconds apart`);
  assert(run(`${diff}.lines.every(w => CHATTER.includes(w))`), 'chatter belongs to musical rests');
}
assert.deepEqual([run('struggling.lines.length'), run('stillShaken.lines.length'), run('practising.lines.length')], [0, 0, 0], 'hushed while struggling and practising');
assert(run('recovered.lines.length') > 0, 'back once the player recovers');
run(`clock = 10; var bubbleSongTime = 10; chip.now = () => bubbleSongTime; rests = restTimeline([{ t: 0 }, { t: 20 }]); bubbles.length = 0; lastBubble = -9; nextChatter = 100;
  bubble('VISCA!', null); var restDuration = bubbles[0].dur;
  clock += 0.1; bubbleSongTime = 19.81; drawBubbles(); var clearBeforeNote = bubbles.length;
  bubbleSongTime = 20; lastBubble = -9; var duringNote = bubble('VISCA!', null);
  G.counts = { perfect: 0, good: 0, miss: 0 }; G.errors = { early: 0, late: 0, move: 0, silent: 0, both: 0, hold: 0 }; G.score = 0; G.maxCombo = 0;
  G.combo = 9; G.praise = null; judge({ phrase: 0 }, 'perfect'); var comboHeadline = G.praise;
  judge({ phrase: 0 }, 'miss'); var firstMissSpeech = bubbles.length;
  judge({ phrase: 0 }, 'miss'); judge({ phrase: 0 }, 'miss'); var missHeadline = G.praise;
  G.energy = 0.4; G.energyWarn = [true, true]; cheer({}, 'miss'); var warningPulse = G.energyWarnT;
  G.energy = 1; M.missT = -9;`);
assert.equal(run('restDuration'), 2, 'optional bubbles always last two seconds');
assert.equal(run('clearBeforeNote'), 0, 'clear speech before the next playable event');
assert.equal(run('duringNote'), false, 'no speech at a note');
assert.equal(run('firstMissSpeech'), 0, 'misses do not add speech');
assert(run('comboHeadline === null && missHeadline === null'), 'combo and miss streaks do not add headlines');
assert(run('warningPulse === clock && bubbles.length === 0'), 'energy warnings pulse the meter without speech');
// a pad tap that collapses the mulassa clears judge/praise/ring mid-press: the handler must not read them (Sentry: null.kind)
run(`var realPress = press, realHaptic = haptic, realFeedback = padFeedback, padCalls = [];
  haptic = k => padCalls.push(k); padFeedback = () => {};
  press = () => { G.judge = G.praise = G.ring = null; };
  G.state = 'play'; G.judge = { kind: 'perfect' }; G.praise = { pri: 2, tier: 1 }; G.ring = { kind: 'gran' };
  padDown({ dataset: { d: 'L' } }, { pointerId: 9, preventDefault() {} });
  press = realPress; haptic = realHaptic; padFeedback = realFeedback; down.ptr.clear(); G.praise = null; G.ring = null; G.judge = null;`);
assert.equal(run('padCalls.join()'), 'miss', 'a collapsing tap does not crash the pad handler and still buzzes as a miss');
// a phone: the bubble never crosses the notch, the edges, the lane band or the pad
run(`innerWidth = 375; innerHeight = 667; resize(); rests = restTimeline([{ t: clock - 1 }, { t: clock + 100 }]); G.go = 0; chip = { t0: 0, now: () => clock, sfx() {} }; shaken = false; bubbles.length = 0; lastBubble = -9; G.diff = 2; G.streak = 0; G.combo = 5; G.energy = 1;
  for (const p of activeCrowd) { const b = { txt: 'UN CALÇOT, SISPLAU!', pos: at(p.g, 2.3), t0: clock, dur: 9, col: C.dark, size: 9, w: textWidth('UN CALÇOT, SISPLAU!', 9) + 10, box: {}, shown: false }; bubbles.push(b); }
  drawBubbles(); var phoneOk = ${inView}, phoneShown = bubbles.filter(b => b.shown).length; bubbles.length = 0;
  innerWidth = 1280; innerHeight = 720; resize();`);
assert(run('phoneOk && phoneShown > 0'), 'on a phone every drawn bubble is whole inside the free area');
console.log('crowd bubble tuning and placement ok');
run('firework(0, 10, 0); animFireworks(0.1);');
assert(run('fireworks.visible && fireworks.count > 0'), 'fireworks appear when triggered');
assert(run('fireworks.count === sparks.filter(s => s.life > 0).length'), 'only live sparks are drawn');
run('animFireworks(2);');
assert(run('!fireworks.visible && fireworks.count === 0'), 'expired fireworks stop drawing');
run('burst(0, 0); animConfetti(0.01);');
assert(run('confetti.visible && !confettiSettled'), 'burst wakes confetti');
run('for (let i = 0; i < 200; i++) animConfetti(0.05);');
assert(run('confettiSettled'), 'grounded confetti stop updating');
run('burst(0, 0); animConfetti(0.01);');
assert(run('confetti.visible && !confettiSettled'), 'another burst wakes settled confetti');
// A second burst mid-fall never lifts a piece that is still in the air, and a piece on the floor shrinks away
// (it never vanishes in a single frame): the floor doesn't pop empty.
run('for (let i = 0; i < 200; i++) animConfetti(0.05); burst(0, 0); for (let i = 0; i < 6; i++) animConfetti(0.05); globalThis.yBefore = conf.map(c => c.p.y);');
run('burst(3, 3); animConfetti(0.001);');
assert(run('conf.every((c, i) => yBefore[i] > 0.03 ? Math.abs(c.p.y - yBefore[i]) < 1 : true)'), 'a burst leaves the confetti still in the air alone');
run('for (let i = 0; i < 200; i++) animConfetti(0.05); burst(0, 0); for (let i = 0; i < 100; i++) animConfetti(0.05);');
assert(run('conf.some(c => c.p.y < 0.05 && c.p.y > 0 && c.lay > 0)'), 'confetti rests on the floor for a while');
const scales = JSON.parse(run(`(() => { const out = []; for (let i = 0; i < 90; i++) { animConfetti(0.05); const m = new THREE.Matrix4(); confetti.getMatrixAt(0, m); out.push(new THREE.Vector3().setFromMatrixPosition(m).y > -1 ? new THREE.Vector3().setFromMatrixScale(m).x : null); } return JSON.stringify(out); })()`)).filter(v => v !== null); // (parked out of sight: not drawn)
assert(scales.every((v, i) => i === 0 || Math.abs(v - scales[i - 1]) < 0.35), 'a piece shrinks away over a second, never in one frame');
// Chained throws (combo milestones 1.5 s apart, then the finale's puff every beat, then a new game's sweep with a throw
// right after it): each throw still gets its share of pieces (the oldest shrink away to make room), the new throw isn't
// blown away with the old ones, and no piece on screen ever jumps (re-thrown from the floor or mid-air) or vanishes in
// a single frame.
const chain = JSON.parse(run(`(() => {
  for (let i = 0; i < 400; i++) animConfetti(0.05);
  const arr = confetti.instanceMatrix.array, N = renderProfile.confetti, prev = new Float32Array(conf.length * 4).fill(0), thrown = [];
  let jumps = 0, vanish = 0, maxCount = 0, fresh = 0;
  for (let f = 0; f < 900; f++) {
    if (f < 180 && f % 45 === 0) { burst(0, 0); thrown.push(conf.filter(c => c.p.y >= -1 && c.age === 0).length); }
    if (f < 180 && f % 45 === 30) thrown.push(conf.filter(c => c.p.y >= -1 && c.age < 1).length); // the same throws 1 s on
    if (f >= 200 && f < 380 && f % 12 === 0) spawnConfetti(50, c => c.p.set(Math.random() * 6 - 3, 6, Math.random() * 6 - 3));
    if (f === 400) sweepConfetti();
    if (f === 405) burst(0, 0);
    if (f === 441) { const young = conf.filter(c => c.p.y >= -1 && c.age < 1.25); fresh = young.every(c => !c.gust && c.out < 0) ? young.length : -1; } // (completed as the swept ones leave)
    animConfetti(1 / 30);
    maxCount = Math.max(maxCount, confetti.count);
    for (let i = 0; i < conf.length; i++) {
      const k = i * 16, s = confetti.visible && i < confetti.count && arr[k + 13] > -1 ? Math.hypot(arr[k], arr[k + 1], arr[k + 2]) : 0, j = i * 4;
      if (prev[j + 3] > 0.4 && s < prev[j + 3] - 0.35) vanish++;
      else if (prev[j + 3] > 0.4 && Math.hypot(arr[k + 12] - prev[j], arr[k + 13] - prev[j + 1], arr[k + 14] - prev[j + 2]) > 0.8) jumps++;
      prev[j] = arr[k + 12]; prev[j + 1] = arr[k + 13]; prev[j + 2] = arr[k + 14]; prev[j + 3] = s;
    }
  }
  return JSON.stringify({ N, thrown, jumps, vanish, maxCount, fresh, settled: confettiSettled && !confetti.visible && confetti.count === 0 });
})()`));
assert(chain.jumps === 0 && chain.vanish === 0, `no confetti piece pops between frames: ${JSON.stringify(chain)}`);
assert(chain.thrown[0] >= 0.55 * chain.N && chain.thrown.every((n, i) => i % 2 === 0 || n >= 0.55 * chain.N), `every chained throw gets its whole share within a second: ${chain.thrown}`);
assert(chain.fresh >= 0.55 * chain.N, `a throw right after the sweep is whole within 1.2 s and stays (${chain.fresh})`);
assert(chain.maxCount <= chain.N && chain.settled, 'the pool stays bounded and empties by itself');
// A piece lying under her skirt shrinks away (her dancing edge would cover and bare it, a wink every step); one beside her stays.
assert(run(`(() => {
  burst(M.pos.x, M.pos.y); for (let i = 0; i < 200; i++) animConfetti(1 / 30); // all landed, none old enough to go
  const [under, beside] = conf.filter(c => c.lay > 0.5 && c.out < 0);
  under.p.set(M.pos.x, under.p.y, M.pos.y); beside.p.set(M.pos.x + 4, beside.p.y, M.pos.y + 4);
  animConfetti(1 / 30);
  return under.out >= 0 && beside.out < 0;
})()`), 'confetti under her shrinks away, beside her it stays');
// Overlapping papers on the floor never share a plane (same normal, same height): those z-fought, winking as the camera
// drifted. A whole pool dropped onto one square metre, every close pair checked.
const coplanar = run(`(() => {
  for (let i = 0; i < 400; i++) animConfetti(0.05);
  const n = new THREE.Vector3(), m = new THREE.Vector3(); let pairs = 0, same = 0;
  spawnConfetti(renderProfile.confetti, c => c.p.set(M.pos.x + 6 + Math.random(), 0.5, M.pos.y + 6 + Math.random()));
  for (let i = 0; i < 60; i++) animConfetti(1 / 30);
  const lying = conf.filter(c => c.lay > SETTLE && c.out < 0);
  for (let a = 0; a < lying.length; a++) for (let b = a + 1; b < lying.length; b++) {
    const A = lying[a], B = lying[b];
    if (Math.hypot(A.p.x - B.p.x, A.p.z - B.p.z) > 0.25) continue;
    pairs++; n.set(0, 0, 1).applyQuaternion(A.qf); m.set(0, 0, 1).applyQuaternion(B.qf);
    if (Math.abs(n.dot(m)) > 0.99999 && Math.abs(n.dot(m.subVectors(A.p, B.p))) < 0.0005) same++;
  }
  return JSON.stringify({ pairs, same });
})()`);
assert(JSON.parse(coplanar).pairs > 20 && JSON.parse(coplanar).same === 0, `no two overlapping confetti papers share a plane: ${coplanar}`);
console.log('scene downgrade and particle lifecycle ok');

// Two neighbours on opposite sides of a grid boundary must still repel each other.
run(`const neighbours = activeCrowd.slice(0, 2);
  function resetNeighbours() {
    neighbours.forEach((p, i) => {
      p.pos.set(0.99 + i * 0.02, 8); p.vel.set(0, 0); p.comfort = 1; p.nerve = 1;
    });
  }
  resetNeighbours();
  activeCrowd = [neighbours[0]]; animCrowd(0.05, 0, 0, 0); // live 0: before the first note, nobody slowed down yet
  const isolatedVelocity = neighbours[0].vel.x;
  resetNeighbours();
  activeCrowd = neighbours; animCrowd(0.05, 0, 0, 0);`);
assert(run('neighbours[0].vel.x < isolatedVelocity - 1'), 'collision finds neighbours across cell boundaries');
run('neighbours.forEach(p => { p.comfort = RING.clear; }); activeCrowd = crowd.filter(p => p.g.visible);'); // (as they were: nobody that bold)
console.log('crowd neighbour separation ok');

// Nobody walks into anybody: the busiest stretch of the song (B, the half turn into C, C's turns and the finale, 60–85 s) and the title's demo walk,
// at high quality (the full crowd), seeded. Footprints are the shirt's rectangle (0.46 x 0.28, a kid 0.72 of it,
// a rider's kid reaching 0.38 m back) on each person's rendered position and heading, the band's included.
{
  const q0 = run('qualityLevel');
  hostSeed(7); run(`seedR = 7; var crowdNow = 60;
    chip = { resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {} }, resume() {}, stop() {}, menu() {}, sfx() {}, noiseHit() {}, blip() {}, wake() {},
      now: () => crowdNow, start: () => Promise.resolve(false) };
    qualityLevel = 2; applyRenderQuality(); offsetMs = 0; startGame(1); G.state = 'play'; G.guapo = 80;
    var footprintLog = { overlaps: [], minD: 9, frames: 0, midD: 9 };
    var midSpots = Array.from({ length: midCrowd.mesh.count }, (_, i) => { const m = new THREE.Matrix4(); midCrowd.mesh.getMatrixAt(i, m); return [m.elements[12], m.elements[14]]; });
    function footprints() {
      for (const p of activeCrowd) for (const [x, z] of midSpots) footprintLog.midD = Math.min(footprintLog.midD, Math.hypot(p.g.position.x - x, p.g.position.z - z));
      const all = activeCrowd.concat(plaza.band.filter(p => p.g.scale.x)).map(p => {
        const k = p.g.scale.x, th = p.g.rotation.y, back = (p.rider ? 0.38 : 0.14) * k, front = 0.14 * k;
        return { p, x: p.g.position.x + Math.sin(th) * (front - back) / 2, z: p.g.position.z + Math.cos(th) * (front - back) / 2,
          u: [Math.cos(th), -Math.sin(th)], v: [Math.sin(th), Math.cos(th)], hw: 0.23 * k, hd: (front + back) / 2 };
      });
      const reach = (a, [ax, az]) => a.hw * Math.abs(a.u[0] * ax + a.u[1] * az) + a.hd * Math.abs(a.v[0] * ax + a.v[1] * az);
      footprintLog.frames++;
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.p.kind && b.p.kind) continue; // musicians stand still
        const dx = b.x - a.x, dz = b.z - a.z;
        footprintLog.minD = Math.min(footprintLog.minD, Math.hypot(a.p.g.position.x - b.p.g.position.x, a.p.g.position.z - b.p.g.position.z));
        if ([a.u, a.v, b.u, b.v].every(ax => Math.abs(dx * ax[0] + dz * ax[1]) < reach(a, ax) + reach(b, ax)) && footprintLog.overlaps.length < 5)
          footprintLog.overlaps.push([G.state, songTime().toFixed(2), a.p.kind || (a.p.kid ? 'kid' : 'adult'), b.p.kind || (b.p.kid ? 'kid' : 'adult')].join(' '));
      }
    }
    function crowdStep(dt) {
      crowdNow += dt; clock += dt;
      const t = songTime(), beat = beatAt(t);
      if (G.state === 'play') { autoplay(t); advance(t); G.sec = sectionAt(song, t); G.finale = t >= FINALE_T; }
      animMula(dt, beat, 1);
      if (G.state === 'play') framePlayCamera(dt, M.pos.x, M.pos.y);
      animCrowd(dt, beat, t, 1);
    }
    for (let k = 0; songTime() < 85; k++) { crowdStep(1 / 30); if (k % 2) footprints(); }
    toTitle();
    for (let k = 0; k < 240; k++) { crowdStep(1 / 30); if (k % 2) footprints(); }
`);
  const log = JSON.parse(run('JSON.stringify(footprintLog)'));
  assert(log.frames > 450, 'the whole stretch was sampled');
  assert.deepEqual(log.overlaps, [], 'no two footprints ever overlap (spectators, kids, riders, the band)');
  assert(log.minD > 0.5, `people keep their distance (closest centres ${log.minD.toFixed(2)} m)`);
  assert(log.midD > 0.6, `nobody walks into the mid band's (instanced, unmoving) figures (closest ${log.midD.toFixed(2)} m)`);
  run(`qualityLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p));`);
}
console.log('crowd footprints never overlap ok');

// During the song the plaça stands still and only answers the player's hits, gently (GROOVE): no pose or position
// ever jumps in one frame, however fast the hits come; with no hits, near-still; the finale is still a festa, and its
// arrival eases in. Section B (it used to clap and hop on every beat), 60 fps, the full crowd, seeded.
// Only the first ring (NEAR: the few nearest her that the camera sees, PROFILES near) answers more: a bigger bob and
// nod, arms coming up, more on a GUAPA and on a streak, and a light bounce on the beat while the streak holds; eased,
// with its own per-frame limits. Everyone else keeps the calm limits.
{
  const q0 = run('qualityLevel');
  hostSeed(11);
  const r = JSON.parse(run(`(() => {
    seedR = 11;
    qualityLevel = 2; applyRenderQuality(); crowdNow = 20; startGame(1); G.state = 'play'; G.guapo = 90; // A1's last runs (N, S) into A2's circle: the ring's distance to her stays comparable across the windows (game/mula-figures.js; at 5 s the burst caught her running at the W-side ring); her runs out bring the crowd onto its feet (making way)
    mood.kick = mood.gr1 = mood.gr2 = mood.gr3 = mood.gr4 = 0; G.combo = 0;
    const who = () => activeCrowd.filter(p => p.g.scale.x);
    const pose = p => [p.g.position.x, p.g.position.y, p.g.position.z, p.torso.rotation.x, p.torso.rotation.z, ...p.arms.flatMap(a => [a.rotation.x, a.rotation.z])];
    let prev = null;
    const step = (dt, out) => {
      crowdNow += dt; clock += dt;
      const t = songTime(), beat = beatAt(t);
      G.sec = sectionAt(song, t); G.finale = t >= FINALE_T;
      animMula(dt, beat, 1); framePlayCamera(dt, M.pos.x, M.pos.y); animCrowd(dt, beat, t, 1);
      const ppl = who(), now = ppl.map(pose);
      if (prev && out) now.forEach((q, i) => {
        const o = prev[i], w = ppl[i].way > 0.001 || ppl[i].away || ppl[i].spd > 0.05 || ppl[i].vel.lengthSq() > 4e-4 ? out.way : ppl[i].nearK > 0.02 ? out.ring : out; // the first ring (even fading in or out) has its own limits; walking (making way, settling after it: the next test): their own bucket
        w.pos = Math.max(w.pos, Math.hypot(q[0] - o[0], q[2] - o[2])); w.y = Math.max(w.y, Math.abs(q[1] - o[1]));
        for (let k = 3; k < q.length; k++) w.rot = Math.max(w.rot, Math.abs(q[k] - o[k]));
        w.top = Math.max(w.top, q[1]); if (!ppl[i].fan) w.arm = Math.min(w.arm, q[5]); // arm 0 (ventalls: by the face)
      });
      if (out) { out.ringN = Math.max(out.ringN, ppl.filter(p => p.near).length); out.shove = Math.max(out.shove || 0, mood.shoveK); }
      prev = now;
    };
    const win = () => ({ pos: 0, y: 0, rot: 0, top: 0, arm: 0, ringN: 0, ring: { pos: 0, y: 0, rot: 0, top: 0, arm: 0 }, way: { pos: 0, y: 0, rot: 0, top: 0, arm: 0 } });
    for (let f = 0; f < 240; f++) step(1 / 60); // the first note is long gone: they settle where startGame put them
    const quiet = win(); for (let f = 0; f < 180; f++) step(1 / 60, quiet);
    const burst = win();
    for (let f = 0, k = 0; f < 240; f++) {
      if (f % 9 === 0) { k++; judge({ phrase: 0, input: k % 5 ? (k % 2 ? 'L' : 'R') : 'B', big: !(k % 5) }, k % 4 ? 'perfect' : 'good'); }
      if (f === 200) judge({ phrase: 0, input: 'L' }, 'miss');
      step(1 / 60, burst);
    }
    G.combo = 0; for (let f = 0; f < 120; f++) step(1 / 60); // settle again
    G.combo = 24; const groove = win(); for (let f = 0; f < 240; f++) step(1 / 60, groove); // a streak, no hit: the ring bounces on the beat
    const streak = win(); // a long streak and GUAPAs: the ring's liveliest
    for (let f = 0, k = 0; f < 240; f++) { if (f % 9 === 0) { k++; G.combo = 40; judge({ phrase: 0, input: k % 3 ? 'L' : 'B', big: !(k % 3) }, 'perfect'); } step(1 / 60, streak); }
    crowdNow = 60; prev = null; G.combo = 0; for (let f = 0; f < 240; f++) step(1 / 60); // section B: the plaça loosens up
    const party = win(); for (let f = 0; f < 240; f++) step(1 / 60, party);
    crowdNow = FINALE_T - 1; prev = null; step(1 / 60);
    const fin = win(); for (let f = 0; f < 240; f++) step(1 / 60, fin);
    return JSON.stringify({ quiet, burst, groove, streak, party, fin, calm: mood.calmK, fest: mood.festK });
  })()`));
  const { quiet, burst, groove, streak, party, fin } = r, mm = v => `${(v * 1000).toFixed(1)} mm`;
  assert(quiet.pos < 2e-3 && quiet.y < 1e-3 && quiet.top < 5e-3 && quiet.rot < 8e-3,
    `no hits: the plaça stands near-still (per frame ${mm(quiet.pos)} across, ${mm(quiet.y)} up, ${quiet.rot.toFixed(4)} rad; highest ${mm(quiet.top)})`);
  assert(burst.pos < 9e-3 && burst.y < 0.022 && burst.rot < 0.09, // (the ripple: a hit is seen hopping round the ring, still eased)
    `a burst of hits (GUAPA and a miss among them) never jolts anyone: per frame ${mm(burst.pos)} across, ${mm(burst.y)} up, ${burst.rot.toFixed(3)} rad`);
  assert(party.y > quiet.y * 3 && party.y < fin.y, `section B: the plaça hops on the beat (${mm(party.y)} up a frame), less than the finale's ${mm(fin.y)}`);
  assert((quiet.shove || 0) === 0 && burst.shove > 0.5 && burst.shove <= 1, `a GUAPA shoves the ring (up to ${(burst.shove || 0).toFixed(2)}), silence does not`);
  assert(burst.top > 0.03 && burst.top < 0.11 && burst.arm > -1.3, `hits answer with a visible bob (up to ${mm(burst.top)}), arms down (${burst.arm.toFixed(2)} rad)`);
  assert(quiet.ring.top < 5e-3 && quiet.ring.rot < 6e-3, `no hits, no streak: the first ring is as still as everyone (${mm(quiet.ring.top)})`);
  for (const [name, w] of [['a streak', groove], ['a streak of GUAPAs', streak]]) {
    assert(w.pos < 9e-3 && w.y < 0.022 && w.top < 0.13 && w.arm > -1.3 && w.rot < 0.09, `${name}: the rest of the plaça stays calm (per frame ${mm(w.pos)} across, ${mm(w.y)} up, ${w.rot.toFixed(3)} rad; up to ${mm(w.top)}, arms ${w.arm.toFixed(2)})`);
    assert(w.ringN >= 10 && w.ringN <= PROFILES[2].near, `${name}: a first ring of ${w.ringN} reacts`);
    assert(w.ring.pos < 9e-3 && w.ring.y < 0.03 && w.ring.rot < 0.12,
      `${name}: the first ring moves smoothly: per frame ${mm(w.ring.pos)} across, ${mm(w.ring.y)} up, ${w.ring.rot.toFixed(3)} rad`);
  }
  assert(groove.ring.top > 0.02, `a streak: the first ring bounces on the beat (up to ${mm(groove.ring.top)})`);
  assert(streak.ring.top > 0.06 && streak.ring.top < 0.25 && streak.ring.arm < -0.4 && streak.ring.arm > -2.1,
    `hits on a streak: the first ring answers noticeably (bob up to ${mm(streak.ring.top)}, arms up to ${streak.ring.arm.toFixed(2)} rad)`);
  assert(streak.ring.top > burst.ring.top && burst.ring.top > burst.top, 'the ring answers more than the plaça, and more on a streak');
  assert(r.fest > 0.9 && r.calm < 0.05 && Math.max(fin.top, fin.ring.top, fin.way.top) > 0.25 && Math.min(fin.arm, fin.ring.arm, fin.way.arm) < -2.5, `the finale is still a festa: hops up to ${Math.max(fin.top, fin.ring.top, fin.way.top).toFixed(2)} m, arms up`);
  for (const [name, w] of [['no hits', quiet], ['hits', burst], ['a streak', groove], ['a streak of GUAPAs', streak]])
    // (0.16: an arm slews at most 0.1 rad a frame, plus the stride's counter-swing; a GUAPA's shove makes more people make way.
    // The worst frame moves 0.13-0.155 with the seeded crowd, e.g. after the escut's boxes changed: a snap is far above, see the festa below)
    assert(w.way.pos < 0.024 && w.way.rot < 0.16, `${name}: whoever walks (making way, settling) walks smoothly (${mm(w.way.pos)}, ${w.way.rot.toFixed(3)} rad per frame)`);
  const finRot = Math.max(fin.rot, fin.ring.rot, fin.way.rot), finY = Math.max(fin.y, fin.ring.y, fin.way.y);
  assert(finRot < 0.25 && finY < 0.1, `the festa eases in, no snap (per frame ${finRot.toFixed(3)} rad, ${mm(finY)} up)`);
  console.log('the crowd stays calm during the song and answers hits gently ok');
  run(`qualityLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p)); G.finale = false; mood.kick = mood.gr1 = mood.gr2 = mood.gr3 = mood.gr4 = 0; G.combo = 0;`);
}

// The plaça fills with how well it goes: with few hits right, some of the back rows aren't there (scale 0, eased);
// with many they all are; the front row and the menus always are.
{
  const q0 = run('qualityLevel');
  const r = JSON.parse(run(`(() => {
    qualityLevel = 2; applyRenderQuality(); crowd.forEach(p => placeHome(p)); crowdNow = 0; startGame(1); G.state = 'play';
    const run = (guapo, frames) => { G.counts = { perfect: guapo, good: 0, miss: 100 - guapo }; G.guapo = guapo;
      for (let f = 0; f < frames; f++) { crowdNow += 1 / 60; clock += 1 / 60; const t = songTime(), b = beatAt(t); G.sec = sectionAt(song, t); animMula(1 / 60, b, 1); framePlayCamera(1 / 60, M.pos.x, M.pos.y); animCrowd(1 / 60, b, t, 1); } };
    const gone = () => activeCrowd.filter(p => !p.g.scale.x), front = () => activeCrowd.filter(p => p.row === 0 && !p.g.scale.x).length;
    run(100, 60); const full = gone().length;
    run(50, 60 * 12); const poor = gone().length, poorFront = front();
    run(100, 60 * 12); const back = gone().length;
    G.state = 'results'; run(50, 60 * 12); const menu = gone().length; G.state = 'play';
    return JSON.stringify({ full, poor, poorFront, back, menu, total: activeCrowd.length });
  })()`));
  assert(r.full === 0 && r.back === 0, 'with a good run everyone is there');
  assert(r.poor >= r.total * 0.1 && r.poor <= r.total * 0.5, `a poor run empties part of the back rows (${r.poor} of ${r.total})`);
  assert(r.poorFront === 0, 'the front row is always there');
  assert(r.menu === 0, 'the results screen has the whole plaça');
  console.log('the plaça fills with how well it goes ok');
  run(`qualityLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p)); mood.presK = 1;`);
}

// Making way (RING): a clear ring of open floor round her all song; when her body or swinging rear comes at someone
// they step back, eased and capped (no jolts), hands up, then walk slowly back to their spot once she has gone.
// Her turns (50 s to the pause before the first reversal: game/mula-dance.js maps the reference's rear half turn, big
// tilts and full turn there), 60 fps, the full crowd, seeded.
{
  const q0 = run('qualityLevel');
  hostSeed(23);
  const r = JSON.parse(run(`(() => {
    seedR = 23;
    qualityLevel = 2; applyRenderQuality(); crowdNow = 46; startGame(1); G.state = 'play'; G.guapo = 90; G.combo = 0;
    const stop = mulaDance.time.songAtRef(138.6); // she stands, between the full turn and the first reversal
    const ppl = [...activeCrowd], prev = new Map(), out = { minClear: 99, step: 0, dv: 0, rot: 0, made: new Set(), back: 0, frames: 0, calmStep: 0, armRate: 0 };
    const clearOf = p => { const dx = p.pos.x - M.pos.x, dz = p.pos.y - M.pos.y, c = Math.cos(M.yaw), s = Math.sin(M.yaw);
      return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - 0.75), Math.max(0, Math.abs(dx * s + dz * c) - 2.3)); };
    for (let f = 0; crowdNow < stop; f++) {
      const dt = 1 / 60; crowdNow += dt; clock += dt;
      const t = songTime(), beat = beatAt(t);
      G.sec = sectionAt(song, t); G.finale = t >= FINALE_T;
      animMula(dt, beat, 1); framePlayCamera(dt, M.pos.x, M.pos.y); animCrowd(dt, beat, t, 1);
      if (t < 50) continue;
      out.frames++;
      for (const p of ppl) {
        out.minClear = Math.min(out.minClear, clearOf(p));
        const o = prev.get(p), q = [p.g.position.x, p.g.position.z, o ? p.g.position.x - o[0] : NaN, o ? p.g.position.z - o[1] : NaN, p.torso.rotation.x, ...p.arms.flatMap(a => [a.rotation.x, a.rotation.z])];
        prev.set(p, q);
        if (p.way > 0.5) out.made.add(p);
        if (!o) continue;
        for (let k = 5; k < q.length; k++) out.armRate = Math.max(out.armRate, Math.abs(q[k] - o[k]) / dt);
        const step = Math.hypot(q[0] - o[0], q[1] - o[1]);
        if (p.way > 0.001 || p.away) {
          out.step = Math.max(out.step, step); if (o[2] === o[2]) out.dv = Math.max(out.dv, Math.hypot(q[2] - o[2], q[3] - o[3])); // (NaN: no step before)
          for (let k = 4; k < q.length; k++) out.rot = Math.max(out.rot, Math.abs(q[k] - o[k]));
        } else out.calmStep = Math.max(out.calmStep, step);
      }
    }
    for (let f = 0; f < 600; f++) { const dt = 1 / 60; clock += dt; animCrowd(dt, 0, 0, 1); } // she stands still (no song time): they come back
    const free = [...out.made].filter(p => clearOf({ pos: p.spot }) > p.comfort + RING.back + 0.2); // their spot is clear of her again
    out.back = free.filter(p => p.pos.distanceTo(p.spot) < 0.35).length;
    out.away = free.filter(p => p.away).length; out.free = free.length;
    out.made = out.made.size;
    return JSON.stringify(out);
  })()`));
  assert(r.frames > 1000, 'the whole stretch was sampled');
  assert(r.minClear > 1.2, `open floor round her all along (closest ${r.minClear.toFixed(2)} m from her body)`);
  assert(r.made >= 3, `people make way as she turns (${r.made})`);
  assert(r.step < 0.024 && r.dv < 0.008 && r.rot < 0.15, // (dv: the step's change from one frame to the next)
    `making way is smooth: per frame ${(r.step * 1000).toFixed(1)} mm, its change ${(r.dv * 1000).toFixed(2)} mm, ${r.rot.toFixed(3)} rad`);
  assert(r.calmStep < 0.024, `everyone else at most jostled aside (the no-overlap limit), never faster than making way (${(r.calmStep * 1000).toFixed(1)} mm)`);
  assert(r.free >= 1 && r.back >= r.free / 2 && r.away <= r.free / 4, `once she has gone they walk back to their spots (${r.back} of ${r.free} free to, ${r.away} still away)`);
  assert(r.armRate <= 6 + 1e-9, `drawn arms keep the 6 rad/s limit (${r.armRate})`);
  console.log('the crowd makes way for her, smoothly, and comes back ok', { step: r.step, delta: r.dv, rotation: r.rot, armRate: r.armRate });
  run(`qualityLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p)); G.finale = false; G.combo = 0;`);
}

// Leaving a paused game must resume the menu and allow the next game to run.
run(`let resumes = 0;
  chip = { stop() {}, menu() {}, resume() { resumes++; }, ctx: {} };
  G.state = 'play'; G.paused = true;
  toTitle();`);
assert.equal(run('G.paused'), false, 'menu clears pause after Escape');
assert.equal(run('resumes'), 1, 'menu resumes suspended audio');

// Loading a recording may finish after the player has already left the game.
run(`let resolveStart, countIns = 0;
  chip = { resume() {}, stop() {}, menu() {}, sfx() {},
    start() { return new Promise(resolve => { resolveStart = resolve; }); },
    countIn() { countIns++; }, ctx: { resume() {} } };
  startGame(0); toTitle(); resolveStart(false);`);
await Promise.resolve();
assert.equal(run('countIns'), 0, 'cancelled starts cannot schedule a count-in');
console.log('menu pause and cancelled start contracts ok');

// A visible page may not own keyboard focus yet (Safari's address bar, another window).
// Boot still paints; normal gameplay remains suspended without focus.
{
  const focus = document.hasFocus;
  document.hasFocus = () => false;
  run("drawn = false; last = null; G.state = 'splash'; chip = null; window.__mulassaBooted = 'module'; frame(4000);");
  assert.equal(run('drawn'), true, 'visible startup paints even before the document gets focus');
  run('coverUp = false;');
  const before = run('clock');
  run('frame(4020)');
  assert(run('clock') > before, 'the visible entrance keeps animating after the cover lifts, even without keyboard focus');
  assert.equal(run('chip'), null, 'animating the entrance never unlocks audio before its tap');
  const entranceClock = run('clock');
  document.hidden = true;
  run('frame(12000)');
  assert.equal(run('clock'), entranceClock, 'the hidden entrance still suspends its animation');
  document.hidden = false;
  run('frame(12020); frame(12040)');
  assert(run('clock') > entranceClock && run('clock') - entranceClock < 0.05, 'returning visible resumes the entrance without a swipe or background catch-up');
  for (const state of ['select', 'play']) {
    run(`G.state = '${state}'; frame(12060);`);
    const inactiveClock = run('clock');
    run('frame(12080)');
    assert.equal(run('clock'), inactiveClock, `${state} retains its existing focus protection`);
  }
  run("G.state = 'splash';");
  document.hasFocus = focus;
  run('coverUp = true;');
  run("drawn = false; renderer.lost = true; window.__mulassaBooted = 'module'; frame(4040);");
  assert.equal(run('drawn'), false, 'a lost WebGL context cannot certify a first frame');
  run('renderer.lost = false; frame(4060);');
  assert.equal(run('drawn'), true, 'the first live frame after restoration completes startup');
  const liveClock = run('clock');
  run('renderer.lost = true; frame(4080);');
  assert(run('clock') > liveClock, 'after startup, context loss must not freeze the HUD and game clock');
  run('renderer.lost = false;');
  run("window.__mulassaBootFailure = { reason: 'deadline' }; drawn = false; frame(4080);");
  assert.equal(run('drawn'), false, 'a failed boot waits for retry instead of starting invisibly behind its error');
  run('delete window.__mulassaBootFailure;');
}

// Loading (src/ui/loader.js): the page cover lifts once the first frame is drawn; a game whose song is still
// downloading/decoding shows «Preparant la música…» (only after the delay), gone when the count-in can start.
{
  const card = nodes.get('loader'), line = nodes.get('loader-text');
  run('loader.ready()'); flushLoader();
  assert.equal(card.hidden, true, 'the cover goes after the first frame');
  run(`var resolveSong; chip = { resume() {}, stop() {}, menu() {}, sfx() {}, countIn() {}, ctx: { resume() {} },
    start() { return new Promise(resolve => { resolveSong = resolve; }); } };
    startGame(1);`);
  assert.equal(card.hidden, true, 'no spinner before the delay: short waits never flash one');
  flushLoader();
  assert(card.hidden === false && line.textContent === 'Preparant la música…', 'a slow song load says so');
  run('resolveSong(true)'); await Promise.resolve(); flushLoader();
  assert.equal(card.hidden, true, 'the card goes when the song starts');
  run('chip.buf = {}; startGame(1)'); flushLoader();
  assert.equal(card.hidden, true, 'a decoded song starts with no card');
  run('delete chip.buf; startGame(1); toTitle();'); flushLoader();
  assert.equal(card.hidden, true, 'leaving for the title drops the card');
  // The first drawn frame lifts the cover on every input path (touch too), once; waits on the splash's tap don't matter.
  run(`var readies = 0; { const r = loader.ready; loader.ready = () => { readies++; r(); }; }
    drawn = false; coverUp = true; fontsIn = false; coverAt = null; COARSE.matches = true; G.state = 'splash'; chip = null; warmStart(); frame(5000);`);
  await Promise.resolve(); await Promise.resolve(); // it waits for the web fonts (resolved at once here)
  // and for the queued words (the count-in's big outlined ones, the title's): painted under the cover, one a frame,
  // not on the splash where the first tap lands
  const queued = run('warmups.length');
  assert(queued >= 8, `the splash queues the title's words and the count-in's (${queued})`);
  run(`Object.defineProperty(loader, 'covering', { get: () => coverUp, configurable: true })`); // (this harness lifted its cover long ago)
  run('frame(5020)');
  assert.equal(run('readies'), 0, 'the cover stays while words are still queued');
  assert.equal(run('warmups.length'), queued - 1, 'under the cover: one a frame, not one per 0.25 s');
  for (let f = 2; run('readies') === 0 && f < 60; f++) run(`frame(${5000 + f * 20})`);
  assert.equal(run('readies'), 1, 'touch: then the cover lifts, once');
  assert.equal(run('warmups.length'), 0, 'every queued word painted before it did');
  run(`warmStart(); warmups.push(...Array(200).fill(() => {})); coverUp = true; coverAt = null;`); // a device too slow to finish them
  for (let f = 0; run('coverUp') && f < 100; f++) run(`frame(${8000 + f * 40})`);
  assert(!run('coverUp') && run('warmups.length') > 0, 'the cover never waits more than COVER_WARM for them');
  run(`warmups.length = 0; COARSE.matches = false; Object.defineProperty(loader, 'covering', { get: () => false, configurable: true });`);
}
console.log('loading indicator contracts ok');

const rejectedLoads = [];
const onUnhandled = error => rejectedLoads.push(error);
process.on('unhandledRejection', onUnhandled);
run(`chip = { resume() {}, stop() {}, menu() {}, sfx() {}, ctx: { resume() {} },
  start() { return Promise.reject(new Error('recording unavailable')); } };
  startGame(0);`);
await new Promise(resolve => setImmediate(resolve));
process.removeListener('unhandledRejection', onUnhandled);
assert.equal(run('G.state'), 'select', 'failed recording returns to the menu');
assert(run('Boolean(G.audioError)'), 'failed recording explains how to retry');
assert.equal(rejectedLoads.length, 0, 'failed loading is handled');
console.log('audio error recovery contract ok');

run(`chip = { resume() {}, wake() {}, ctx: { suspend() {}, resume() {} }, stop() {}, menu() {} };
  G.state = 'play'; G.paused = false; G.collapseT = 0;`);
for (const handler of keyHandlers) handler({ code: 'Escape', target: { tagName: 'BODY' }, preventDefault() {} });
assert.equal(run('G.state'), 'play', 'Escape keeps the game');
assert.equal(run('G.paused'), true, 'Escape pauses the game');
assert(nodes.get('pause-menu').open, 'pause opens a modal menu');
run('requestPauseAction("exit");');
assert.equal(run('G.state'), 'play', 'menu requires confirmation');
assert.equal(run('G.paused'), true);
nodes.get('pause-menu').listeners.cancel({ preventDefault() {} });
assert.equal(run('G.pendingAction'), null, 'Escape dismisses confirmation first');
assert.equal(run('G.paused'), true, 'dismissing confirmation retains pause');
run('requestPauseAction("exit");');
nodes.get('confirm-action').listeners.click();
assert.equal(run('G.state'), 'select', 'confirmed menu exits');
assert.equal(nodes.get('pause-menu').open, false);
run(`chip = { resume() {}, ctx: { suspend() {}, resume() {} }, stop() {}, menu() {}, sfx() {},
  start() { return Promise.resolve(false); } };
  startGame(0); togglePause(); requestPauseAction('restart');`);
const chartBeforeRestart = run('G.chart');
assert.equal(run('G.chart'), chartBeforeRestart, 'restart waits for confirmation');
nodes.get('cancel-action').listeners.click();
assert.equal(run('G.chart'), chartBeforeRestart, 'cancel preserves the game');
run('requestPauseAction("restart");');
nodes.get('confirm-action').listeners.click();
assert.notEqual(run('G.chart'), chartBeforeRestart, 'confirmed restart creates a new game');
assert.equal(run('G.paused'), false);
console.log('Escape, pause menu and confirmation contracts ok');

run(`let suspends = 0, wakes = 0;
  chip = { resume() {}, wake() { wakes++; }, t0: 0, now: () => 5, start() { return Promise.resolve(true); }, countIn() {}, ctx: { suspend() { suspends++; }, resume() {} } };
  G.state = 'play'; G.paused = false; G.collapseT = 0;`);
document.hidden = true;
document.listeners.visibilitychange?.();
assert.equal(run('G.paused'), true, 'hiding the tab pauses gameplay');
assert(run('suspends > 0'), 'background audio is suspended');
document.listeners.visibilitychange();
assert.equal(run('G.paused'), true, 'repeated background events retain pause');
document.hidden = false;
document.listeners.visibilitychange();
assert.equal(run('G.paused'), true, 'returning to the tab requires explicit resume');
assert.equal(run('wakes'), 0, 'returning does not restart paused audio');
run('togglePause();');
assert.notEqual(run('G.resuming'), null, 'explicit resume starts a 3, 2, 1');
assert.equal(run('G.paused'), true, 'the run stays frozen during the count-in');
run('G.resuming = null; G.paused = false;'); // the count-in ends (frame() does this once the song clock reaches the pause point)
document.focused = false;
windowHandlers.blur.forEach(handler => handler());
assert.equal(run('G.paused'), true, 'an unfocused visible window also pauses');
run('togglePause();');
assert.equal(run('G.paused'), true, 'inactive windows cannot resume');
run("G.state = 'title'; G.paused = false; suspends = 0;");
windowHandlers.blur.forEach(handler => handler());
assert.equal(run('suspends'), 1, 'menu audio is suspended without focus');
document.focused = true;
windowHandlers.focus.forEach(handler => handler());
assert.equal(run('wakes'), 1, 'menu audio wakes when focus returns');
run("G.state = 'play'; G.paused = false; G.collapseT = 1;");
windowHandlers.pagehide.forEach(handler => handler());
assert.equal(run('G.paused'), true, 'page exit also pauses the collapse animation');
windowHandlers.pageshow.forEach(handler => handler());
assert.equal(run('G.paused'), true, 'restoring a page retains the paused game');
console.log('background audio and gameplay pause contracts ok');

run(`G.reason = 'fail'; G.stars = 0; G.resT = clock;
  G.errors = { early: 0, late: 0, move: 5, silent: 0 };
  drawResults();`);
assert(drawnText.includes('Segueix la fletxa: esquerra o dreta'), 'movement advice explains the available controls');
console.log('results advice matches two-sided control ok');

// GLOBUS: every tap in its window counts (never a wrong move); pops repeat every `need` taps; judged once at the end.
run(`let songNow = 0, bonks = 0;
  chip = { resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, blip() {}, noiseHit() {},
    sfx(k) { if (k === 'bonk') bonks++; }, now: () => songNow, start: () => Promise.resolve(false) };
  startGame(1); G.state = 'play'; offsetMs = 0;
  var [b1, b2] = G.balloons; G.next = G.chart.indexOf(b1);
  songNow = b1.t + 0.1; for (let i = 0; i < b1.need; i++) press(i % 2 ? 'R' : 'P');
  var afterPop = G.score; press('L'); var oneTap = G.score - afterPop;
  for (let i = 1; i < b1.need + 1; i++) press(i % 2 ? 'R' : 'L');`);
assert.equal(run('oneTap'), 50, 'taps after the first pop still score');
assert.equal(run('b1.hit'), null, 'a balloon is judged only when its window ends');
assert.equal(run('b1.count'), run('b1.need * 2 + 1'), 'counting goes on after a pop');
assert.equal(run('G.pop.word'), 'PAM! x2!', 'the second pop is announced');
assert.equal(run('bonks'), 0, 'balloon taps are never wrong moves');
run(`var perfects = G.counts.perfect; endBalloon(b1); var judged = G.counts.perfect - perfects;
  G.next = G.chart.indexOf(b2); songNow = b2.t + 0.1;
  for (let i = 0; i < Math.ceil(b2.need / 2); i++) press('L');
  songNow = b2.end - 0.05; press('R'); endBalloon(b2);`);
assert.equal(run('b1.hit'), 'perfect', 'a popped balloon is perfect');
assert.equal(run("judged"), 1, 'a balloon is judged once, however many pops');
assert.equal(run('b2.count'), run('Math.ceil(b2.need / 2)'), 'taps after the hand-off go to the next note');
assert.equal(run('b2.hit'), 'good', 'a half-inflated balloon is good');
assert.equal(run('G.praise'), null, 'balloon completion does not add a headline during the song');
console.log('balloon contracts ok');
verifyCarretillesCounter(run);

// GUAPA: from NORMAL, both buttons within 80 ms = hit x2 (judged on the first press); one button alone is an
// ERROR once the window closes (never a bonk); the partner press never eats the next note. FÀCIL takes either.
run(`startGame(2); G.state = 'play'; offsetMs = 0; bonks = 0; var misses = 0;
  const sfx0 = chip.sfx; chip.sfx = k => { if (k === 'miss') misses++; sfx0(k); }; chip.wake = () => {};
  var bigs = G.chart.filter(n => n.big), gi = G.chart.findIndex(n => n.big && G.chart[G.chart.indexOf(n) + 1].t - n.t < 0.5); // a note right after the GUAPA
  var g1 = G.chart[gi], after = G.chart[gi + 1];
  G.next = gi; songNow = g1.t + 0.06; var s0 = G.score; press('L'); var pending = g1.hit;
  songNow += 0.05; press('R'); var pair = G.score - s0, pairRing = G.ring;
  var g2 = bigs.find(n => n.t > g1.t + 1 && n.t < song.end - 1); G.next = G.chart.indexOf(g2);
  songNow = g2.t; s0 = G.score; press('R'); var lonePending = g2.hit;
  songNow += 0.09; settleBig(songNow); var lone = G.score - s0;`);
assert.equal(run('pending'), null, 'one button on a GUAPA waits for the other');
assert.equal(run('g1.hit'), 'good', 'a GUAPA is judged on the first press');
assert.equal(run('pair'), run('g1.pts * 2'), 'both buttons together score double');
assert(run('g1.gran && pairRing.kind === "gran" && pairRing.word === "GUAPA!"'), 'the pair lights the GUAPA! effect');
assert.equal(run('after.hit'), null, 'the partner press does not eat the next note');
assert.equal(run('lonePending'), null);
assert(run('g2.hit === "miss" && g2.detail === "ELS DOS ALHORA!" && !g2.gran'), 'NORMAL+: one button alone is an error');
assert.equal(run('lone'), 0, 'one button alone scores nothing');
assert(run('misses > 0 && bonks === 0'), 'the lone press plays the miss sound, never the bonk');
run(`var g3 = bigs.find(n => n.t > g2.t + 1 && n.t < song.end - 1); G.next = G.chart.indexOf(g3);
  songNow = g3.t; s0 = G.score; press('P'); var space = G.score - s0;`);
assert(run('g3.hit === "perfect" && g3.gran && space === g3.pts * 2'), 'Space is both buttons');
run(`startGame(0); G.state = 'play'; offsetMs = 0;
  var e1 = G.chart.find(n => n.big), e1n = G.chart[G.chart.indexOf(e1) + 1]; G.next = G.chart.indexOf(e1); songNow = e1.t;
  s0 = G.score; press('L'); songNow += 0.12; press('R'); var easyPts = G.score - s0;
  var e2 = G.chart.find(n => n.big && n.t > e1.t + 1 && n.t < song.end - 1); G.next = G.chart.indexOf(e2); songNow = e2.t;
  press('R'); songNow += 0.2; settleBig(songNow);`);
assert(run('e1.hit === "perfect" && e1.gran && easyPts === e1.pts * 2'), 'FÀCIL: both buttons too, with a wider window (0.12 s apart still pairs)');
assert(run('e2.hit === "miss" && e2.detail === "ELS DOS ALHORA!"'), 'FÀCIL: one button alone is an error as well');
assert.equal(run('e1n.hit'), null, 'FÀCIL: the partner press is swallowed too');
assert.equal(run('G.chart.some(n => n.end && !n.balloon)'), false, 'FÀCIL plays holds as taps');
console.log('GUAPA contracts ok');

// Headline slot: one word at a time; a higher (or equal) priority replaces, a lower one is dropped, not queued.
run(`G.praise = null; clock = 100;
  headline('FINAL ESBOJARRAT!', 'rainbow', 4, 2.2); var praiseTaken = headline('QUIN ESTIL!', 0, 2), pamTaken = headline('PAM!', 3, 3, 0.9);
  var duringFinale = G.praise.word;
  clock += 2.3; var afterFinale = headline('QUIN ESTIL!', 0, 2); var venenuTaken = headline('VENENU!', 'bad', 1);
  var patapam = headline('PATAPAM!', 'bonk', 2, 1);`);
assert(run('!praiseTaken && !pamTaken && duringFinale === "FINAL ESBOJARRAT!"'), 'the finale intro outranks everything while it shows');
assert(run('afterFinale && !venenuTaken && patapam && G.praise.word === "PATAPAM!"'), 'expired words free the slot; lower ranks are dropped; equal ranks replace');
// A wrong move still stumbles and scores an error, without an extra headline.
run(`startGame(1); G.state = 'play'; offsetMs = 0; bonks = 0; G.praise = null; clock += 5;
  var wrong = G.chart.find(n => !n.big && !n.balloon && !n.end && n.input === 'L'); G.next = G.chart.indexOf(wrong);
  songNow = wrong.t; var pitchV = S.pitch.v; press('R');`);
assert(run('bonks === 1 && wrong.hit === "miss" && wrong.detail === "MOVIMENT"'), 'a wrong move is a bonk and an error');
assert(run('G.praise === null && M.missT === clock && S.pitch.v > pitchV'), 'a wrong move trips the mulassa up without a headline');
assert.equal(run('typeof guia'), 'undefined', 'there is no guide beside the mulassa');
console.log('headline slot and wrong-move contracts ok');

// Every HUD screen draws without throwing (an exception mid-frame would leave the canvas transformed/clipped):
// each headline tier, a wrong move, the finale, a globus, a hold, the collapse and every results card.
run(`var hudT = G.chart[G.next].t;
  for (const [w, tier] of [['A', 0], ['B', 1], ['C', 2], ['D', 3], ['VENENU!', 'bad'], ['PATAPAM!', 'bonk'], ['EEEEEEH!!', 'rainbow']]) { G.praise = null; headline(w, tier, 2); drawHud(hudT); }
  G.finale = true; G.finaleT = clock; headline('FINAL ESBOJARRAT!', 'rainbow', 4, 2.2); drawHud(hudT);
  bubbles.length = 0; drawHud(hudT);
  var hb2 = G.chart.find(n => n.end && !n.balloon); G.hold = { n: hb2, got: hb2.t, pts: 0, auto: true }; G.holdDone = { t0: clock, dir: 'L' }; drawHud(hb2.t + 0.2); G.hold = null;
  var bb = G.balloons[0]; bb.count = 3; G.pop = { t0: clock, word: 'PAM!' }; G.pumpT = clock; drawHud(bb.t + 0.2);
  G.collapseT = clock; drawHud(hudT); G.collapseT = 0; G.finale = false;
  G.errors = { early: 1, late: 2, move: 3, silent: 0, both: 0, hold: 0 }; G.resT = clock - 2;
  for (const [reason, rec, prev] of [['clear', true, null], ['fail', false, { quality: 80, score: 182972 }], ['collapse', false, null]]) {
    G.state = 'results'; G.reason = reason; G.stars = 2; G.newRecord = rec; G.previous = prev; drawHud(0);
  }
  for (const st of ['splash', 'title']) { G.state = st; drawHud(0); }`);
assert(drawnText.includes('NOU RÈCORD DE PUNTS!') && drawnText.includes('MILLOR') && drawnText.includes('182.972 PUNTS'), 'the record is told in points, like the board');
console.log('HUD screens draw without exceptions ok');

// MANTÉN: head judged like a tap; hold the key to the end (last 0.12 s free) for a PERFECTE tail, half for BÉ,
// less is an ERROR; the tail trickles points while held. Head miss loses the whole hold.
const key = (type, code) => windowHandlers[type].forEach(h => h({ code, target: { tagName: 'BODY' }, preventDefault() {} }));
context.key = key;
run(`startGame(1); G.state = 'play'; offsetMs = 0;
  var holds = G.chart.filter(n => n.end && !n.balloon), [h1, h2, h3, h4] = holds;
  function playHold(h, releaseAt, code = h.input === 'L' ? 'KeyD' : 'KeyK') {
    G.next = G.chart.indexOf(h); songNow = h.t; const c0 = { ...G.counts }, s0 = G.score;
    key('keydown', code);
    const holding = G.hold?.n === h;
    for (let x = h.t; x < releaseAt; x += 0.05) { songNow = x; settleHold(x); }
    songNow = releaseAt; key('keyup', code); settleHold(releaseAt);
    return { holding, tail: h.tail, judged: Object.values(G.counts).reduce((a, b) => a + b) - Object.values(c0).reduce((a, b) => a + b), pts: G.score - s0 };
  }
  var full = playHold(h1, h1.end - 0.05), part = playHold(h2, h2.t + (h2.end - h2.t) * 0.6), early = playHold(h3, h3.t + 0.1);`);
assert(run('full.holding && full.tail === "perfect" && full.judged === 2'), 'a hold is head + tail; letting go in the last 0.12 s is full');
assert(run('full.pts > 2 * (300 + 2)'), 'holding trickles points on top of the two judgements');
assert.equal(run('part.tail'), 'good', 'half a hold is BÉ');
assert(run('early.tail === "miss" && G.judge.detail === "HAS DEIXAT ANAR"'), 'letting go early is an error');
run(`G.next = G.chart.indexOf(h4); var c0 = G.counts.miss; advance(h4.t + WIN.miss + 0.01);`);
assert(run('h4.tail === "miss" && G.counts.miss - c0 === 2 && !G.hold'), 'a missed head loses the whole hold');
run(`startGame(1); G.state = 'play'; offsetMs = 0; var hb = G.chart.find(n => n.end && !n.balloon);
  G.next = G.chart.indexOf(hb); songNow = hb.t; key('keydown', hb.input === 'L' ? 'ArrowLeft' : 'ArrowRight');
  songNow = hb.t + 0.2; settleHold(songNow);`);
windowHandlers.blur.forEach(h => h());
assert(run('hb.tail === "miss" && !G.hold'), 'losing the window focus lets go');
{ // a pad that has the keyboard focus (Tab) must not swallow the game keys; other buttons still keep theirs
  const padBtn = { tagName: 'BUTTON', closest: s => (s === '#pad' ? {} : null) }, other = { tagName: 'BUTTON', closest: () => null };
  run(`startGame(1); G.state = 'play'; offsetMs = 0; var tn = G.chart.find(n => !n.end && !n.balloon && !n.pair); G.next = G.chart.indexOf(tn); songNow = tn.t; var j0 = Object.values(G.counts).reduce((a, b) => a + b);`);
  const code = run('tn.input') === 'L' ? 'KeyD' : 'KeyK';
  windowHandlers.keydown.forEach(h => h({ code, target: other, preventDefault() {} }));
  assert.equal(run('Object.values(G.counts).reduce((a, b) => a + b) - j0'), 0, 'a focused ordinary button keeps its keys');
  windowHandlers.keydown.forEach(h => h({ code, target: padBtn, preventDefault() {} }));
  assert.equal(run('Object.values(G.counts).reduce((a, b) => a + b) - j0'), 1, 'a focused pad still plays the note');
  key('keyup', code);
}
console.log('hold contracts ok');

// autoplay: both buttons on every GUAPA and every hold kept down to the end
for (const diff of [0, 1, 2]) {
  run(`startGame(${diff}); G.state = 'play'; offsetMs = 0;
    for (let x = G.chart[0].t - 0.5; x < song.end + 0.5; x += 1 / 30) { songNow = x; G.doublePoints = x >= FINALE_T && G.guapo >= 70; autoplay(x); advance(x); }`);
  // Each full hold may retain <1 uncredited fractional point after the final floor.
  const shortLoss = referenceScore(context.song, diff) - run('G.score');
  assert(shortLoss >= 0 && shortLoss <= run('G.chart.filter(n => n.end && !n.balloon).length'), `active reference vs real scoring ${diff}: ${shortLoss} points of hold rounding`);
  assert.equal(run('G.counts.miss'), 0, `autoplay ${diff}: no errors`);
  assert(run('G.chart.filter(n => n.big).every(n => n.hit === "perfect" && n.gran)'), `autoplay ${diff}: both buttons on every GUAPA`);
  assert(run('G.chart.filter(n => n.end && !n.balloon).every(n => n.tail === "perfect")'), `autoplay ${diff}: every hold kept to the end`);
  assert.equal(run('G.counts.perfect + G.counts.good'), run('G.chart.length + G.chart.filter(n => n.end && !n.balloon).length'), 'a hold counts head + tail');
}
// The old reference also runs through the actual judge/pump/hold code, preserving the old chart's finale.
for (const diff of [0, 1, 2]) {
  run(`beginRun(${diff}, makeDanceChart(${JSON.stringify(v1Song)}, ${diff})); G.state = 'play'; offsetMs = 0;
    for (let x = G.chart[0].t - 0.5; x < ${v1Song.end} + 0.5; x += 1 / 30) {
      songNow = x; G.doublePoints = x >= ${v1Song.finale} && G.guapo >= 70; autoplay(x); advance(x);
    }`);
  assert.equal(run('G.counts.miss'), 0);
  const oldLoss = referenceScore(v1Song, diff) - run('G.score');
  assert(oldLoss >= 0 && oldLoss <= run('G.chart.filter(n => n.end && !n.balloon).length'), `legacy reference vs real scoring ${diff}: ${oldLoss} points of hold rounding`);
}
console.log('autoplay GUAPA and hold contracts ok');

// Practice (first game): the real lane, judge and FX on five small charts over a click track. Picking a
// difficulty the first time runs it; autoplay passes every step first try; then that difficulty starts.
// Skipping every input still gets through (three tries per step), back to the title. Nothing is recorded.
run(`var stored = {}; localStorage.getItem = k => stored[k] ?? null; localStorage.setItem = (k, v) => { stored[k] = String(v); };
  var minEnergy = 1, clicks = 0, started = null, maxTries = 0, seen = new Set(), ticks = [], hits = [], noteTimes = [];
  var menuOn = true; chip = { resume() {}, t0: null, ctx: { currentTime: 50, suspend() {}, resume() {} }, stop() { this.t0 = null; }, menu(on) { menuOn = on; }, sfx() {}, noiseHit() {},
    blip(w, f) { clicks++; if (f === 1320) ticks.push(w - this.t0); }, timbal(w) { clicks++; hits.push(w - this.t0); }, startClock(d, from) { this.t0 = this.ctx.currentTime + d - from; },
    now() { return this.ctx.currentTime - this.t0; }, start() { started = G.diff; return Promise.resolve(false); } };
  function practise(auto, seconds) {
    for (let i = 0; i < seconds * 60 && G.practice; i++) {
      chip.ctx.currentTime += 1 / 60; clock += 1 / 60;
      const x = songTime();
      if (auto) autoplay(x);
      advance(x);
      if (!G.practice) break;
      G.chart.forEach(n => noteTimes.includes(n.t) || noteTimes.push(n.t));
      minEnergy = Math.min(minEnergy, G.energy);
      seen.add(G.practice.step); maxTries = Math.max(maxTries, G.practice.tries);
      practiceTick(x);
      if (i % 20 === 0 && G.state === 'play') drawHud(x);
    }
  }
  offsetMs = 0; G.state = 'title'; choose(2);
  var firstTime = G.state === 'play' && G.practice?.then === 2, practiceWin = WIN;
  practise(true, 60);`);
assert(run('firstTime'), 'the first game starts with the practice');
assert.equal(run('practiceWin'), progress.WINDOWS[0], 'practice timing is forgiving');
assert(run('[0, 1, 2, 3, 4].every(k => seen.has(k)) && maxTries === 0 && started === 2 && G.practice === null'), 'autoplay passes all five steps, then the chosen difficulty starts');
assert(run('clicks > 40'), 'a click track plays under the practice');
assert(run('noteTimes.length >= 14 && noteTimes.every(t => hits.some(h => Math.abs(h - t) < 1e-3))'), 'a taiko hit on the audio clock exactly on every practice note (< 1 ms)');
assert(run('[...ticks, ...hits].every(x => song.beats.some(b => Math.abs(b - x) < 1e-3))'), 'every click sits on the song beat grid the notes use');
assert(run('!menuOn'), 'the menu ambient is off during the practice');
assert.equal(run('stored.tutorial'), 'done');
assert(run("!Object.keys(stored).some(k => k.startsWith('record'))"), 'practice records nothing');
run(`started = null; G.state = 'title'; choose(1);`);
assert(run('started === 1 && !G.practice'), 'afterwards a difficulty starts the song straight away');
run(`seen.clear(); startPractice(null); practise(false, 150);`);
assert(run("[0, 1, 2, 3, 4].every(k => seen.has(k)) && G.state === 'select' && !G.practice"), 'nobody gets stuck: three tries per step, then from the Com es juga sheet back to the title');
assert(run('minEnergy === 1 && !G.collapseT'), 'the practice never drains the ànim, however many notes go by');
run(`startPractice(null); G.praise = null; for (const n of G.chart.slice(0, 3)) judge(n, "miss");`);
assert(run("!G.praise || !/VENENU/.test(G.praise.word)"), 'no shaming VENENU! while learning');
run('startPractice(1);');
nodes.get('skip').listeners.click();
assert(run('started === 1 && !G.practice'), 'SALTA skips straight to the song');
// Stepping is bounds-safe: steps skipped as fast as possible (every frame, in debug), bumped far past the last one,
// NaN, a pause and a restart mid-way: never a throw, and past the end it wraps up once (A BALLAR!) and leaves.
run(`var fanfares = 0; chip.sfx = k => { if (k === 'fanfare3') fanfares++; };
  started = null; startPractice(1);
  for (let i = 0; i < 12 && G.practice; i++) { G.practice.step++; G.practice.wait = clock; practise(false, 1 / 60); }`);
assert(run('fanfares === 1 && (G.practice === null || G.practice.doneT != null)'), 'skipping every step rapidly: one A BALLAR!');
run('practise(false, 3);');
assert(run('started === 1 && !G.practice && fanfares === 1'), 'then the song starts, once');
for (const bump of ['STEPS.length', 'STEPS.length + 7', 'NaN', '-3']) {
  run(`started = null; fanfares = 0; startPractice(2); practise(false, 0.5); G.practice.step = ${bump}; drawHud(songTime()); practiceStep(8); practise(false, 4);`);
  assert(run('started === 2 && !G.practice && fanfares === 1'), `step = ${bump}: ends cleanly into the song`);
}
run(`started = null; startPractice(null); practise(false, 0.5); G.practice.step = STEPS.length; practiceTick(songTime());`);
nodes.get('skip').listeners.click(); run('endPractice(); practiceTick(songTime());');
assert(run("started === null && G.state === 'select' && !G.practice"), 'SALTA during A BALLAR!, then a late tick and a second end: harmless');
run(`started = null; startPractice(1); practise(false, 0.5); G.practice.step = 99; pauseGame(); drawHud(songTime());`);
assert(run('G.paused && G.practice && G.practice.step === 99'), 'paused past the end: the HUD still draws');
run(`G.pendingAction = 'restart';`); nodes.get('confirm-action').listeners.click();
assert(run('!G.paused && G.practice && G.practice.step === 0 && G.practice.then === 1 && G.chart.length'), 'restart from the pause: the practice from step 0');
run('practise(true, 60);');
assert(run('started === 1 && !G.practice'), 'and it plays through to the song');
console.log('practice contracts ok');

// The dance demo (ui/watch-ui.js, flow.js startWatch): the whole song plays itself on NORMAL, even before the
// practice was ever done; GUA/PA do nothing, the ànim never drains, the player's tick is silent. Its end records,
// snapshots, prompts and shares nothing, and its own sheet leads back to the selector.
run(`var preWatch = { chip, stored }; stored = {}; songNow = 0; var watchSfx = [];
  chip = { resume() {}, wake() {}, t0: null, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, noiseHit() {}, blip() {}, countIn() {},
    sfx(k) { watchSfx.push(k); }, start() { this.t0 = 0; return Promise.resolve(true); }, now: () => songNow };
  offsetMs = 0; G.state = 'select'; G.paused = false;
  var toLevels = 0; Object.assign(sheets.select, { figure: selectedFigure, pending: false, toLevels() { toLevels++; } }); // (the selector is stubbed here)`);
nodes.get('select-watch').listeners.click();
assert(run("G.state === 'play' && G.watch && G.diff === 1 && !G.practice"), 'Com es juga starts the demo on NORMAL, never the practice');
assert.equal(nodes.get('watch-song').textContent, run('selectedFigure.song'), 'the label names the dance');
run(`var watchFirst = G.chart.find(n => !n.balloon && !n.big && !n.end); songNow = watchFirst.t; press('L', { timeStamp: 0 });`);
assert(run('!watchFirst.hit'), 'GUA/PA judge nothing during the demo');
run(`for (; songNow < song.tail + 0.5; songNow += 1 / 30) { clock += 1 / 30; autoplay(songNow); advance(songNow); }`);
assert(run("G.chart.every(n => n.hit === 'perfect') && G.energy === 1"), 'it plays every note itself and never touches the ànim');
assert(run("!watchSfx.includes('perfect') && watchSfx.includes('eh')"), 'no tick for a player who isn\'t tapping; the plaça still shouts on a GUAPA');
run(`finish('end'); updateControls();`);
assert(run("G.state === 'results' && G.watch && G.shareRun === null && getLeaderboardResult() === null"), 'its end is no result: nothing to publish or share');
assert(run("!Object.keys(stored).some(k => k.startsWith('record') || k === 'tutorial')"), 'no record, and the practice is still to come');
assert.equal(nodes.get('results-retry').hidden, true, 'no «Torna-ho a provar»');
assert.equal(nodes.get('watch-menu').open, false, 'the plaça cheers a moment first');
run('clock += 1.1; updateControls();');
assert.equal(nodes.get('watch-menu').open, true, 'then «Ara et toca a tu!»');
keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'BUTTON' }, preventDefault() {} }));
assert.equal(run('G.state'), 'results', 'Space acts on the sheet, not on the results behind it');
nodes.get('watch-play').listeners.click();
assert(run("G.state === 'select' && !G.watch && toLevels === 1 && sheets.select.shown") && !nodes.get('watch-menu').open, '«Juga-hi»: the selector, on its level step');
nodes.get('select-watch').listeners.click(); run('togglePause();');
assert(run('G.paused && G.watch') && nodes.get('pause-sync').hidden, 'its pause has no sync');
assert.equal(nodes.get('restart-label').textContent, 'Torna a començar');
const demoChart = run('G.chart');
nodes.get('restart').listeners.click();
assert(run('!G.paused && G.watch') && run('G.chart') !== demoChart, 'restart needs no confirmation: nothing to lose');
run('togglePause();'); nodes.get('exit').listeners.click();
assert(run("G.state === 'select' && !G.watch && !G.paused"), 'neither does leaving');
run('startGame(1); togglePause();');
assert(!nodes.get('pause-sync').hidden && nodes.get('restart-label').textContent === 'Reinicia', 'a real game\'s pause is unchanged');
run('toTitle(); chip = preWatch.chip; stored = preWatch.stored;');
console.log('dance demo contracts ok');

// ⚙ Configuració on the title: shows the current offset; the sync comes back to it when closed; the practice
// starts from it; title keys don't start a game behind it.
run(`G.state = 'title'; G.practice = null; offsetMs = 40; chip.wake = () => {};`);
nodes.get('settings').listeners.click();
const settingsSheet = nodes.get('settings-menu');
assert(settingsSheet.open, 'the gear opens Configuració');
assert.equal(nodes.get('settings-offset').textContent, 'Ara: +40 ms', 'it shows the current sync offset');
keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'BODY' }, preventDefault() {} }));
assert.equal(run('G.state'), 'title', 'Space does not start a game behind the sheet');
document.listeners.click({ target: { closest: sel => (sel === '[data-privacy-open]' ? {} : null) } });
assert(nodes.get('privacy-menu').open && settingsSheet.open, 'Privadesa opens over Configuració, which stays behind it');
assert.deepEqual(privacyBodyStub.childNodes, [privacyTextStub], 'privacy text is attached while open');
assert.equal(privacyFragmentStub.childNodes.length, 0);
keyHandlers.forEach(h => h({ code: 'Enter', target: { tagName: 'DIALOG' }, preventDefault() {} }));
assert.equal(run('G.state'), 'title', 'keys on Privadesa do not start a game');
nodes.get('privacy-menu').close();
assert.equal(privacyBodyStub.childNodes.length, 0, 'closed privacy text is absent from the live DOM');
assert.deepEqual(privacyFragmentStub.childNodes, [privacyTextStub]);
run('openPrivacy(); openPrivacy();');
assert.deepEqual(privacyBodyStub.childNodes, [privacyTextStub], 'reopening preserves the text without duplicates');
nodes.get('privacy-menu').close();
nodes.get('settings-sync').listeners.click();
assert(!settingsSheet.open && context.syncSheet.open, 'Ajusta la sincronia opens the sync sheet');
context.syncSheet.open = false; run('offsetMs = -20;'); context.syncHooks.onClose();
assert(settingsSheet.open, 'closing the sync sheet returns to Configuració');
assert.equal(nodes.get('settings-offset').textContent, 'Ara: −20 ms', 'with the new offset');
settingsSheet.open = false;
context.syncHooks.onClose();
assert(!settingsSheet.open, 'the sync sheet opened from elsewhere does not reopen Configuració');
// menu placement: Configuració has both; Com es juga only the practice; the pause menu only the sync (mid-song)
const html = readPage();
const sheet = id => html.slice(html.indexOf(`<dialog id="${id}"`), html.indexOf('</dialog>', html.indexOf(`<dialog id="${id}"`)));
assert(/Ajusta la sincronia/.test(sheet('settings-menu')) && !/Fes la pràctica/.test(sheet('settings-menu')), 'Configuració: sync only (Com es juga has the practice)');
assert(/Fes la pràctica/.test(sheet('howto-menu')) && !/sincronia/.test(sheet('howto-menu')), 'Com es juga: only the practice');
assert(/Ajusta la sincronia/.test(sheet('pause-menu')) && !/pràctica/.test(sheet('pause-menu')), 'pause: only the sync');
run(`G.state = 'title'; G.practice = null;`);
nodes.get('howto-practice').listeners.click();
assert(run("G.state === 'play' && G.practice"), 'Com es juga → Fes la pràctica starts the practice');
run('endPractice();');
console.log('settings sheet contracts ok');

// Classificacions: Configuració → the sheet (closing it goes back); an open board sheet swallows the title and results
// keys (typing an alias never plays or leaves); its results row appears with TOCA PER TORNAR and the card makes room.
const boardSheet = context.boardSheet;
run(`G.state = 'title'; G.sel = 2;`);
nodes.get('settings').listeners.click();
settingsSheet.close();
// the menu music's speaker (#music): title only; a click switches the loop, remembers it and says what the next click does
{
  const stored = [], btn = nodes.get('music');
  context.localStorage.setItem = (k, v) => stored.push([k, v]);
  run(`G.state = 'title'; updateControls();`);
  assert.equal(btn.hidden, false, 'the speaker shows on the title');
  assert.equal(btn.dataset.state, 'on');
  context.navigator.connection = { effectiveType: '3g', saveData: true };
  run(`updateControls();`);
  assert.equal(btn.hidden, false, 'a slow or Save-Data connection keeps the speaker on the title');
  delete context.navigator.connection;
  btn.listeners.click();
  assert.equal(btn.dataset.state, 'off'); assert.equal(btn.title, 'Activa el so del menú');
  assert.deepEqual(stored.at(-1), ['menu-music', 'off'], 'remembered on this device');
  assert(run('menuMusic === false'));
  if (run('engine != null')) assert.deepEqual(context.menuMusicCalls.at(-1), false, 'the engine fades the loop out');
  btn.listeners.click();
  assert.equal(btn.dataset.state, 'on'); assert.deepEqual(stored.at(-1), ['menu-music', 'on']);
  context.localStorage.setItem = () => {};
  run(`G.state = 'results'; updateControls();`);
  assert.equal(btn.hidden, true, 'title only');
}
// «Bústia de la plaça» (#feedback): title only, never over another sheet; while it is up, typing never plays
{
  const fb = context.feedbackSheet;
  run(`G.state = 'title'; updateControls();`);
  assert.equal(nodes.get('feedback').hidden, false, 'the speech bubble shows on the title');
  assert.equal(fb.opts.captcha, boardSheet.captcha, 'one Turnstile: board-ui.js\'s');
  nodes.get('feedback').listeners.click();
  assert.equal(fb.shown, 1);
  for (const code of ['Space', 'Enter', 'ArrowRight', 'KeyD']) keyHandlers.forEach(h => h({ code, target: { tagName: 'TEXTAREA' }, preventDefault() { throw new Error('typing a space must stay a space'); } }));
  assert(run("G.state === 'title' && G.sel === 2"), 'title keys do nothing behind «Bústia de la plaça»');
  fb.open = false;
  boardSheet.open = true; nodes.get('feedback').listeners.click(); boardSheet.open = false;
  assert.equal(fb.shown, 1, 'not over another sheet');
  run(`G.state = 'results'; updateControls();`);
  assert.equal(nodes.get('feedback').hidden, true, 'title only');
  const nm = context.nudgeMock, before = nm.armed;
  run('toTitle();'); assert.equal(nm.armed, before + 1, 'back from a run: the nudge may show');
  run('toTitle();'); assert.equal(nm.armed, before + 1, 'title to title (the first tap) is not a run');
  fb.opts.onOpen(); assert(nm.ended, 'opening the sheet ends the nudge for good');
}
run(`G.state = 'title'; updateControls();`);
boardSheet.open = true;
for (const code of ['Space', 'Enter', 'ArrowRight', 'KeyD', 'BracketLeft']) keyHandlers.forEach(h => h({ code, target: { tagName: 'DIALOG' }, preventDefault() {} }));
assert(run("G.state === 'title' && G.sel === 2 && offsetMs === -20"), 'title keys do nothing behind Classificacions');
run(`G.state = 'results'; G.resT = clock - 5;`);
keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'DIALOG' }, preventDefault() {} }));
assert.equal(run('G.state'), 'results', 'Space on the publish sheet does not leave the results');
boardSheet.open = false;
boardSheet.shown.length = 0;
run('G.resT = clock - 0.5; updateControls(); G.resT = clock - 1.5; updateControls(); G.state = "title"; updateControls();');
assert.deepEqual(boardSheet.shown, [false, true, false], 'the results row waits for TOCA PER TORNAR and goes with the results');
drawnText.length = 0;
run(`G.state = 'results'; G.reason = 'clear'; G.resT = clock - 2; G.counts = { perfect: 100, good: 0, miss: 0 }; drawHud(0); G.state = 'title';`);
assert(drawnText.includes('ESPAI PER TORNAR'), 'the results still offer to go back');
// the publish prompt opens by itself only over a bare, visible, upright results screen (board-ui.js asks canPrompt)
run(`G.state = 'results';`);
assert(boardSheet.opts.canPrompt(), 'results, nothing else up: the prompt may open');
boardSheet.open = true; assert(!boardSheet.opts.canPrompt(), 'not over another sheet'); boardSheet.open = false;
nodes.get('share-menu').open = true; assert(!boardSheet.opts.canPrompt(), 'not over Comparteix'); nodes.get('share-menu').open = false;
document.hidden = true; assert(!boardSheet.opts.canPrompt(), 'not on a hidden page'); document.hidden = false;
run(`G.state = 'title';`);
assert(!boardSheet.opts.canPrompt(), 'only on the results');
// Turnstile (src/services/captcha.js via board-ui.js): never started ahead (only Publica / Bústia ask for a token); its tick box never mid-song
boardSheet.verifyStarts = 0;
run(`var savedChip = chip, savedState = G.state; drawn = false; G.state = 'splash'; frame(clock * 1000 + 16); frame(clock * 1000 + 32); G.state = 'title'; frame(clock * 1000 + 48);`);
run(`chip = { resume() {}, stop() {}, menu() {}, sfx() {}, ctx: { resume() {} } }; G.state = 'title'; toTitle();`);
run(`G.state = 'play'; G.counts = { perfect: 10, good: 0, miss: 0 }; finish('end');`);
assert.equal(run('G.state'), 'results');
run(`G.state = 'play'; G.diff = 2; G.counts = { perfect: 200, good: 40, miss: 0 };
  G.previous = { quality: quality({ perfect: 265, good: 53, miss: 0 }), score: 182972 };
  G.score = 139572; finish('end');`);
assert.equal(run('G.newRecord'), false, 'equal quality with fewer points cannot announce a record');
run(`G.state = 'play'; G.score = 183000; finish('end');`);
assert.equal(run('G.newRecord'), true, 'equal quality with more points earns a record');
run(`G.state = 'play'; G.counts = { perfect: 240, good: 0, miss: 0 }; G.score = 139572; finish('end');`);
assert.equal(run('G.newRecord'), false, 'a higher % with fewer points is no record');
run(`G.state = 'play'; G.counts = { perfect: 150, good: 50, miss: 40 }; G.score = 190000; finish('end');`);
assert.equal(run('G.newRecord'), true, 'more points with a lower % is a record (as on the board)');
run(`G.state = 'play'; toTitle();`);
assert.equal(boardSheet.verifyStarts, 0, 'a finished or left run asks Cloudflare nothing');
run('chip = savedChip; G.state = savedState;');
run(`G.state = 'play';`); assert(!boardSheet.opts.canVerify(), 'no tick box during a song or the practice');
run(`G.state = 'results';`); assert(boardSheet.opts.canVerify(), 'on the results it may show');
run(`G.state = 'title';`); assert(boardSheet.opts.canVerify(), 'on the title too');
// after a publication Comparteix comes next (board-ui.js afterPublish → share-ui.js openAfterPublish)
assert.equal(typeof boardSheet.opts.afterPublish, 'function', 'publishing hands over to Comparteix');
// ⚙ Configuració: its «Sobrenom» row is refreshed on every opening
const refreshed = boardSheet.settingsRefreshed;
nodes.get('settings').listeners.click();
assert.equal(boardSheet.settingsRefreshed, refreshed + 1, 'opening Configuració refreshes the nickname row');
settingsSheet.close();
console.log('classificacions integration contracts ok');

// Comparteix: the results row shows (even offline) with TOCA PER TORNAR; the nudge only for something to show off;
// the sheet opens from its button, swallows the game keys while open and closes; the card makes room for the row.
{
  const row = nodes.get('results-actions'), menu = nodes.get('share-menu');
  run(`G.state = 'results'; G.resT = clock - 0.5; G.reason = 'clear'; G.stars = 3; G.newRecord = true; G.challenge = null;
    G.shareRun = { pct: 96, score: 190000, diff: 2, reason: 'clear', stars: 3, newRecord: true, maxCombo: 80, t: G.resT, practice: false }; updateControls();`);
  assert(row.hidden !== false, 'no row during the first second (TOCA PER TORNAR waits too)');
  run('G.resT = clock - 2; G.shareRun.t = G.resT; updateControls();');
  assert(row.hidden === false && nodes.get('results-share-tag').hidden === false, 'the row with Comparteix, and «Presumeix-ne!» for a record / S');
  nodes.get('results-share').listeners.click();
  assert(menu.open && context.shareSheet.open && nodes.get('results-share-tag').hidden, 'Comparteix opens the sheet; the nudge has done its job');
  for (const code of ['Space', 'Enter', 'ArrowLeft', 'BracketRight']) keyHandlers.forEach(h => h({ code, target: { tagName: 'DIALOG' }, preventDefault() {} }));
  assert(run("G.state === 'results' && offsetMs === -20"), 'game keys do nothing behind Comparteix');
  nodes.get('share-close').listeners.click();
  assert(!menu.open, 'Tanca closes it');
  // after a publication (board-ui.js afterPublish) Comparteix opens by itself for that run: «Publicat!», then the place
  boardSheet.opts.afterPublish({ place: Promise.resolve('Ets el número 7 · top 40%!') });
  assert(menu.open && nodes.get('share-note').hidden === false && nodes.get('share-note').textContent === 'Publicat! Ja surts a la classificació.', 'published: Comparteix opens by itself');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodes.get('share-note').textContent, 'Ets el número 7 · top 40%!', '…its header then says where they stand');
  nodes.get('share-close').listeners.click(); menu.listeners.close(); // (the mock's close() fires no event)
  assert(!menu.open && nodes.get('share-note').hidden, 'Tanca closes it as usual; the line goes with it');
  context.shareSheet.openAfterPublish({});
  assert(menu.open && nodes.get('share-note').textContent === 'Publicat! Ja surts a la classificació.', 'without a place: just «Publicat!»');
  nodes.get('share-close').listeners.click();
  keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'BODY' }, preventDefault() {} }));
  assert.equal(run('G.state'), 'select', 'closed: Space leaves the results again');
  run('updateControls();');
  assert(row.hidden === true, 'the row goes with the results');
  run(`G.state = 'results'; G.resT = clock - 2; G.stars = 1; G.newRecord = false;
    G.shareRun = { score: 100000, pct: 55, diff: 1, reason: 'fail', stars: 1, newRecord: false, maxCombo: 9, t: G.resT, practice: false }; updateControls();`);
  assert(row.hidden === false && nodes.get('results-share-tag').hidden === true, 'no nudge for an ordinary run');
  drawnText.length = 0;
  run(`G.challenge = challengeResult({ pct: 50, diff: 1 }, G.shareRun); G.counts = { perfect: 40, good: 20, miss: 30 }; drawHud(0);`);
  assert(drawnText.includes('REPTE SUPERAT!') && drawnText.includes(shareLogic.SITE_LABEL), 'the card says the challenge is beaten and where to play');
  drawnText.length = 0;
  run(`G.challenge = challengeResult({ pct: 58, diff: 1 }, G.shareRun); drawHud(0);`);
  assert(drawnText.includes('Gairebé! Et falta un 4%'), 'or how close it was');
  assert.equal(run('resultsReserve()'), 48, 'one row of buttons: 48 px');
  // the row sits right under the card (drawResults writes its top), not pinned to the bottom edge
  const rowTop = parseFloat(row.style.top);
  assert(row.style.bottom === 'auto' && rowTop > 0 && rowTop + 48 < run('HH * K') - 60, `the row under the card, with the tip and the return button below it (top ${rowTop})`);
  // a collapse: nothing to share; «Torna-ho a provar» (the same level) and Classificacions stay
  run(`G.reason = 'collapse'; G.stars = 0; G.diff = 2; G.resT = clock - 2;
    G.shareRun = { score: 100000, pct: 20, diff: 2, reason: 'collapse', stars: 0, newRecord: false, maxCombo: 3, t: G.resT, practice: false }; updateControls();`);
  assert(row.hidden === false && nodes.get('results-share').hidden === true && nodes.get('results-retry').hidden === false, 'collapse: no Comparteix, Torna-ho a provar instead');
  context.shareSheet.openAfterPublish({});
  assert(!menu.open, 'collapse: the share sheet never opens');
  nodes.get('results-retry').listeners.click();
  assert(run("G.state === 'play' && G.diff === 2 && !G.practice"), 'Torna-ho a provar: the same level again');
  run(`G.state = 'results'; G.reason = 'clear'; G.resT = clock - 2;
    G.shareRun = { score: 100000, pct: 90, diff: 2, reason: 'clear', stars: 3, newRecord: false, maxCombo: 50, t: G.resT, practice: false }; updateControls();`);
  assert(nodes.get('results-share').hidden === false && nodes.get('results-retry').hidden === false, 'a finished dance offers both Comparteix and another run');
  for (const figure of ['mulassa-valls', 'drac-valls']) for (const reason of ['clear', 'fail', 'collapse']) for (const diff of [0, 1, 2]) {
    run(`G.state = 'results'; setSelectedFigure('${figure}'); G.reason = '${reason}'; G.diff = ${diff}; G.resT = clock - 0.5; updateControls();`);
    assert(nodes.get('results-retry').hidden, 'the last notes cannot accidentally restart the run');
    nodes.get('results-retry').listeners.click();
    assert.equal(run('G.state'), 'results', 'retry ignores a click before results settle');
    run('G.resT = clock - 2; updateControls();');
    assert(!nodes.get('results-retry').hidden, `${figure}/${reason}/${diff}: retry is visible`);
    nodes.get('results-retry').listeners.click();
    assert(run(`G.state === 'play' && G.figureId === '${figure}' && G.diff === ${diff} && !G.practice && G.score === 0 && G.energy === 1`), `${figure}/${reason}/${diff}: restart the same figure and level with a fresh run`);
  }
  run(`G.challenge = null; G.state = 'title'; setSelectedFigure('mulassa-valls'); updateControls();`);
}
// Comparteix asks for the place on the board of the figure that was played (sheets-setup.js composes share and board), and a
// publication refreshes the cached name (the check) before the card is drawn again
{
  const menu = nodes.get('share-menu'), kept = context.localStorage, mem = new Map();
  context.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  run(`store.set(ALIAS_KEY, 'Prova'); G.state = 'results'; setSelectedFigure('drac-valls'); G.reason = 'clear'; G.resT = clock - 2; G.stars = 1;
    G.shareRun = { figureId: 'drac-valls', score: 100000, pct: 90, diff: 1, reason: 'clear', stars: 1, newRecord: false, maxCombo: 50, t: G.resT, practice: false }; updateControls();`);
  boardSheet.standings.length = 0;
  nodes.get('results-share').listeners.click(); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(boardSheet.standings, ['drac-valls'], 'the Drac\'s share image asks for the Drac\'s board, not the Mulassa\'s');
  const asked = (context.identityAsked || []).length;
  boardSheet.opts.afterPublish({}); await Promise.resolve();
  assert.equal(context.identityAsked.length, asked + 1, 'a publication re-reads the profile for the card');
  nodes.get('share-close').listeners.click(); menu.listeners.close();
  context.localStorage = kept;
  run(`G.state = 'title'; setSelectedFigure('mulassa-valls'); updateControls();`);
}
console.log('comparteix integration contracts ok');

// The share photo (renderHero): at every quality tier it renders at the card's size, with her standing in view and the
// crowd around her, never a silent null (a ReferenceError inside it once gave every card an empty sky and ground).
{
  const { PHOTO } = await import('../src/hud/share-card.js');
  const made = document.createElement;
  document.createElement = tag => tag === 'canvas' ? { getContext: () => ({ putImageData() {} }) } : made(tag);
  context.ImageData = class { constructor(d, w, h) { Object.assign(this, { d, w, h }); } };
  run(`var heroShots = [], heroFlat = 0; Object.assign(renderer, { extensions: { has: () => true }, target: null,
    getRenderTarget() { return this.target; }, setRenderTarget(t) { this.target = t; },
    readRenderTargetPixels(t, x, y, w, h, px) { for (let i = 0; i < px.length; i++) px[i] = heroFlat ? 90 : (i * 37) & 255; heroFlat && heroFlat--; },
    render(sc, cam) {
      if (cam !== heroCam) return;
      sc.updateMatrixWorld(true); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      let shown = true; for (let o = mula.root; o; o = o.parent) shown &&= o.visible;
      const box = new THREE.Box3().setFromObject(mula.root), size = box.getSize(new THREE.Vector3());
      const a = box.min.clone().project(cam), b = box.max.clone().project(cam), c = box.getCenter(new THREE.Vector3()).project(cam);
      const people = crowd.filter(p => p.g.scale.x > 0 && frustum.containsPoint(p.g.getWorldPosition(new THREE.Vector3()))).length;
      heroShots.push({ w: this.target?.width, h: this.target?.height, shown, legs: mulaCarriers.group.visible, tall: size.y,
        inView: frustum.containsPoint(box.getCenter(new THREE.Vector3())) && Math.abs(c.x) < 0.6 && Math.abs(c.y) < 0.6,
        height: Math.abs(a.y - b.y) / 2, people });
    } });`);
  for (const level of [-1, 0, 1, 2]) for (const format of ['story', 'feed', 'og']) {
    const [w, h] = PHOTO[format];
    run(`qualityLevel = ${level}; applyRenderQuality(); G.state = 'results'; G.reason = 'clear'; heroShots.length = 0;`);
    const before = run('mula.root.position.toArray().join() + mula.root.quaternion.toArray().join()');
    const img = run(`renderHero(${w}, ${h})`), [s] = run('heroShots');
    const at = `${format} at ${profileAt(level).name}`;
    assert(img && img.width === w && img.height === h, `${at}: a photo comes back at the card's size`);
    assert(s && s.w === w && s.h === h && w * h >= 400 * 300, `${at}: drawn into a ${w}×${h} target (got ${s?.w}×${s?.h})`);
    assert(s.shown && s.legs && s.tall > 1.5, `${at}: the mulassa is visible, standing, full size`);
    assert(s.inView && s.height > 0.3, `${at}: she is in the middle of the photo and big (${s.height.toFixed(2)} of its height)`);
    assert(s.people >= (format === 'og' ? 4 : 3), `${at}: the crowd stands around her (${s.people} in view)`);
    assert.equal(run('mula.root.position.toArray().join() + mula.root.quaternion.toArray().join()'), before, `${at}: her pose is put back`);
  }
  // A capture immediately after switching figures must not inherit a hidden
  // material or wandering parent. Every state change is restored afterward.
  run(`var oldHeroRender = renderer.render, dracHeroSeen = false;
    drac.root.parent.position.set(12, 0, -12); drac.root.parent.rotation.y = 1.7;
    dracMat.opacity = 0; drac.root.visible = false; confetti.visible = true; fireworks.visible = true;
    var photoState = () => JSON.stringify([drac.root.parent.position.toArray(), drac.root.parent.quaternion.toArray(),
      drac.root.parent.scale.toArray(), dracMat.opacity, drac.root.visible, confetti.visible, fireworks.visible]);
    renderer.render = (sc, cam) => { if (cam === heroCam) {
      dracHeroSeen = drac.root.visible && !mula.root.visible && dracMat.opacity === 1
        && drac.root.parent.position.distanceTo(placeDance(new THREE.Object3D(), DRAC_YAW).position) < 1e-9 && !confetti.visible && !fireworks.visible; // back in its dance frame (drac-layout.js), where it settled
    } };`);
  const dracBefore = run('photoState()');
  assert(run("renderHero(1104, 988, 'drac-valls')") && run('dracHeroSeen'), 'Drac capture sets a visible pose and excludes effects');
  assert.equal(run('photoState()'), dracBefore, 'capture restores parent transform, opacity, figure and effects');
  run('renderer.render = oldHeroRender; dracMat.opacity = 1;');
  run('heroFlat = 1; heroShots.length = 0;'); // the float target drew nothing: the same photo again in 8 bits
  assert(run('renderHero(960, 620)') && run('heroShots.length') === 2, 'a flat float render is retried in 8 bits');
  const warn = console.warn; console.warn = () => {};
  const seen = { reports: [], crumbs: [] };
  const originalReport = errors.report, originalBreadcrumb = errors.breadcrumb;
  try {
    errors.report = (k, d) => seen.reports.push([k, d]); errors.breadcrumb = (k, d) => seen.crumbs.push([k, d]);
    const pose = () => run('mula.root.position.toArray().join() + mula.root.quaternion.toArray().join() + plaza.props.map(p => p.mesh.visible)');
    const before = pose();
    run('heroFlat = 2;');
    assert.equal(run('renderHero(960, 620)'), null, 'nothing drawn at all: no photo (the card draws its stand-in)');
    assert.deepEqual(JSON.parse(JSON.stringify(seen.reports)), [['share-hero-failed', { phase: 'flat', target: 'byte', name: 'Error' }]], 'a genuine flat render stays a warning, bounded tags');
    assert.equal(seen.crumbs.length, 0);
    seen.reports.length = 0;
    run(`var readOld = renderer.readRenderTargetPixels; renderer.readRenderTargetPixels = () => { throw Object.assign(new Error('secret detail'), { name: 'WeirdError' }); };`);
    assert.equal(run('renderHero(960, 620)'), null);
    assert.deepEqual(JSON.parse(JSON.stringify(seen.reports)), [['share-hero-failed', { phase: 'read', target: 'float', name: 'Other' }]], 'read failure: phase, target, allowlisted name only');
    assert.equal(pose(), before, 'pose and props restored after a failure');
    seen.reports.length = 0;
    run(`var rtOld = renderer.setRenderTarget; renderer.setRenderTarget = () => { throw new Error('cleanup'); };
      var disposed = 0, disposeOld = THREE.WebGLRenderTarget.prototype.dispose; THREE.WebGLRenderTarget.prototype.dispose = function () { disposed++; return disposeOld.call(this); };`);
    assert.equal(run('renderHero(960, 620)'), null, 'setRenderTarget throws inside the capture: still null');
    assert.equal(run('disposed'), 2, 'both temporary targets are disposed although setRenderTarget threw');
    run('THREE.WebGLRenderTarget.prototype.dispose = disposeOld;');
    assert.equal(pose(), before, 'pose and props restored although the GPU cleanup threw');
    assert(seen.reports.some(r => r[1].phase === 'cleanup'), 'cleanup failure is reported');
    run('renderer.setRenderTarget = rtOld; renderer.readRenderTargetPixels = readOld;'); seen.reports.length = 0;
    run('renderer.lost = true; heroShots.length = 0; var heroDrawn = 0; var renderOld = renderer.render; renderer.render = () => heroDrawn++;');
    assert.equal(run('renderHero(960, 620)'), null);
    assert(run('heroDrawn') === 0 && !seen.reports.length, 'lost before: no render, no warning');
    assert.deepEqual(JSON.parse(JSON.stringify(seen.crumbs)), [['share-hero-context-lost', { phase: 'context', target: 'none' }]]);
    seen.crumbs.length = 0;
    run('renderer.lost = false; renderer.render = renderOld; heroFlat = 2; var readFlat = renderer.readRenderTargetPixels; renderer.readRenderTargetPixels = function (...a) { this.lost = true; return readFlat.apply(this, a); };');
    assert.equal(run('renderHero(960, 620)'), null);
    assert(!seen.reports.length && seen.crumbs.length === 1 && seen.crumbs[0][1].phase === 'flat', 'lost during the render: breadcrumb, no warning');
    assert.equal(pose(), before, 'pose restored after a mid-capture loss');
    run('renderer.readRenderTargetPixels = readFlat; renderer.lost = false; heroFlat = 0;');
    seen.crumbs.length = 0;
    assert(run('renderHero(960, 620)'), 'healthy again after a loss: a photo');
    assert(!seen.reports.length && !seen.crumbs.length, 'a healthy capture reports nothing');
  } finally {
    errors.report = originalReport; errors.breadcrumb = originalBreadcrumb;
    console.warn = warn;
  }
  document.createElement = made; delete context.ImageData;
  run('qualityLevel = 2; applyRenderQuality(); G.state = "title";');
}
console.log('share photo renders her with the crowd at every quality ok');

// Capture targets: no depth on the encoding target, no depth resolve on the scene target, same samples/types/sizes as before.
{
  const made = document.createElement;
  document.createElement = tag => tag === 'canvas' ? { getContext: () => ({ putImageData() {} }) } : made(tag);
  context.ImageData = class { constructor(d, w, h) { Object.assign(this, { d, w, h }); } };
  run(`var tOpts = [], tOld = THREE.WebGLRenderTarget; heroFlat = 0; renderer.extensions = { has: () => true };
    THREE.WebGLRenderTarget = class extends tOld { constructor(w, h, o) { super(w, h, o); tOpts.push(this); } };`);
  const opts = () => JSON.parse(run(`JSON.stringify(tOpts.map(t => [t.width, t.height, t.depthBuffer, t.resolveDepthBuffer, t.samples, t.texture.type]))`));
  assert(run('renderHero(960, 620)'));
  const half = 1016; // THREE.HalfFloatType
  assert.deepEqual(opts(), [[960, 620, false, true, 0, 1009], [960, 620, true, false, 4, half]], 'out: no depth; scene: depth kept, no resolve, 4 samples, half float');
  run('tOpts.length = 0; renderer.extensions = { has: () => false };');
  assert(run('renderHero(960, 620)'));
  assert.deepEqual(opts(), [[960, 620, false, true, 0, 1009], [960, 620, true, false, 4, 1009]], 'no float extension: straight to bytes, one attempt');
  run('tOpts.length = 0; renderer.extensions = { has: () => true }; heroFlat = 1;');
  assert(run('renderHero(960, 620)'));
  assert.deepEqual(opts().map(o => [o[2], o[3], o[4], o[5]]), [[false, true, 0, 1009], [true, false, 4, half], [true, false, 4, 1009]], 'flat float: one byte retry, same options');
  run('THREE.WebGLRenderTarget = tOld;');
  document.createElement = made; delete context.ImageData;
}
console.log('share capture targets ok');

// The first screen render after a restore: renderScreen() leaves one breadcrumb once draw calls reached a live context.
{
  const crumbs = [], ob = errors.breadcrumb, or = errors.report;
  errors.breadcrumb = k => crumbs.push(k); errors.report = () => {};
  const gl = nodes.get('gl').listeners, N = 'webgl-screen-submitted-after-restore';
  run(`var scCalls = 3, scThrow = false, scOld = renderer.render, scInfoOld = renderer.info;
    renderer.info = { render: { calls: 0 } }; renderer.target = null; renderer.lost = false;
    renderer.render = function () { if (scThrow) throw new Error('boom'); this.info.render.calls = scCalls; };`);
  const frame = () => run('renderScreen()');
  const names = () => crumbs.filter(k => k === N).length;
  try {
    frame(); frame(); assert.equal(names(), 0, 'idle (no restore): no breadcrumb');
    gl.webglcontextlost(); gl.webglcontextrestored(); crumbs.length = 0;
    run('scCalls = 0;'); frame(); assert.equal(names(), 0, 'zero draw calls: still pending');
    run('scCalls = 3; renderer.target = {};'); frame(); assert.equal(names(), 0, 'a non-null target is not the screen');
    run('renderer.target = null; renderer.lost = true;'); frame(); assert.equal(names(), 0, 'context lost: still pending');
    run('renderer.lost = false; scThrow = true;');
    assert.throws(() => frame(), /boom/, 'a render error propagates'); assert.equal(names(), 0, 'and keeps it pending');
    run('scThrow = false;'); frame(); frame(); frame();
    assert.equal(names(), 1, 'valid frames: exactly one breadcrumb');
    gl.webglcontextlost(); frame(); assert.equal(names(), 1, 'a loss clears a pending restore');
    gl.webglcontextrestored(); frame(); frame(); assert.equal(names(), 2, 'the next restore re-arms it once');
    gl.webglcontextrestored(); gl.webglcontextlost(); frame(); assert.equal(names(), 2, 'loss after restore, before a frame: nothing pending');
  } finally {
    run('renderer.render = scOld; renderer.info = scInfoOld; renderer.lost = false;');
    errors.breadcrumb = ob; errors.report = or;
  }
}
console.log('screen render after a restore ok');


// L'ÀNIM DE LA PLAÇA: standing idle drains it note by note until the mulassa falls apart, on every difficulty;
// the count-in and the intro before the first note never drain; each warning threshold pulses once on the way down.
for (const diff of [0, 1, 2]) {
  run(`songNow = 0; chip = { resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, sfx() {}, noiseHit() {}, blip() {},
      now: () => songNow, start: () => Promise.resolve(false) };
    offsetMs = 0; startGame(${diff}); bubbles.length = 0; var diedAt = null, introE = 1;
    for (songNow = -LEAD; songNow < G.chart[0].t; songNow += 1 / 30) { advance(songNow); introE = Math.min(introE, G.energy); }
    var warningTimes = [], lastWarning = G.energyWarnT;
    for (; songNow < 60 && !G.collapseT; songNow += 1 / 30) { clock += 1 / 30; advance(songNow); if (G.energyWarnT !== lastWarning) { warningTimes.push(G.energyWarnT); lastWarning = G.energyWarnT; } }
    diedAt = G.collapseT ? songNow - G.chart[0].t : null;
    var lastWord = bubbles.map(b => b.txt).join();`);
  assert.equal(run('introE'), 1, 'no drain during the count-in and the intro');
  const died = run('diedAt'), misses = run('G.counts.miss');
  assert(died != null && run('G.energy === 0'), `idle on ${diff}: the mulassa collapses`);
  assert.equal(misses, [13, 10, 8][diff], `idle on ${diff}: misses from full to empty`);
  if (diff === 0) assert(died + run('LEAD + G.chart[0].t') < 30, `idle on FÀCIL loses within ~30 s (${died.toFixed(1)} s after the first note)`);
  assert.equal(run('warningTimes.length'), 2, 'each threshold pulses once');
  assert.equal(run('lastWord'), '', 'collapse clears every bubble for its fixed caption');
}
run(`startGame(2); var hitN = G.chart.find(n => !n.big && !n.balloon && !n.end); G.energy = 0.5; judge(hitN, 'perfect'); var afterHit = G.energy;
  var bigN = G.chart.find(n => n.big); G.energy = 0.5; judge(bigN, 'perfect'); var afterBig = G.energy, bigFlash = G.energyT === clock;`);
assert(run('afterHit > 0.5 && afterBig > afterHit && bigFlash'), 'hits refill the ànim, a GUAPA more (with a flash)');
drawnText.length = 0;
run(`G.state = 'results'; G.reason = 'collapse'; G.errors = { early: 0, late: 0, move: 0, silent: 9, both: 0, hold: 0 }; drawHud(0);`);
assert(drawnText.some(s => /esgotat l’ànim/.test(s)), 'a collapse explains the ànim in the tip');
console.log('ànim (energy) contracts ok');
// ENCERTS before any note is judged: no pill in the top bar (never "0%"), an em dash on the results card.
drawnText.length = 0;
run(`startGame(1); G.state = 'play'; drawTop();`);
assert(!drawnText.includes('ENCERTS') && !drawnText.includes('—') && !drawnText.includes('0%'), 'the ENCERTS pill stays hidden until the first judged note');
drawnText.length = 0;
run(`judge(G.chart.find(n => !n.big && !n.balloon && !n.end), 'perfect'); drawTop();`);
assert(drawnText.includes('ENCERTS') && drawnText.some(s => /^\d+%$/.test(s)), 'the ENCERTS pill appears with the first judged note');
run(`judge(G.chart.find(n => !n.big && !n.balloon && !n.end), 'perfect'); G.shown = G.guapo;`);
drawnText.length = 0;
run('drawTop();');
assert(drawnText.includes('100%') && !drawnText.includes('—'), 'the first judged note shows its real value');
drawnText.length = 0;
run(`G.counts = { perfect: 0, good: 0, miss: 0 }; G.state = 'results'; G.reason = 'fail'; G.resT = clock - 2; drawHud(0);`);
assert(drawnText.includes('—') && !drawnText.includes('0%'), 'results with nothing judged show —');
console.log('quality placeholder contracts ok');
// Song progress (drawTop): 0 through the count-in up to the first note, 1 from the last note on.
// Its ring is a halo round #pause (drawProgressRing): inside the screen and the safe area, clear of the panel, the lane (and its
// ring), the judge words and the x2 tag; the finale's x2 tag sits on the panel's top edge, inside the safe area, clear of the ÀNIM bar,
// ENCERTS, the mulassa, #pause and the bar. Phones, an iPad on its side, desktop.
const progressSamples = JSON.parse(run('JSON.stringify([songProgress(song.notes[0][0] - LEAD), songProgress(song.notes[0][0]), songProgress((song.notes[0][0] + song.end) / 2), songProgress(song.end), songProgress(song.end + 9)])'));
assert(progressSamples.every((v, i) => Math.abs(v - [0, 0, 0.5, 1, 1][i]) < 1e-12), 'progress: 0 at the start, 1 at the end, clamped');
assert.equal(run('song.notes[0][0]'), run('song.notes[0][0]'), 'from the first note');
const inter = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
for (const [w, h, touch, notch] of [[375, 667, true, 20], [393, 852, true, 59], [1180, 820, true, 24], [1280, 800, false, 0]]) for (const diff of [0, 1, 2]) {
  context.innerWidth = w; context.innerHeight = h;
  const r = run(`COARSE.matches = ${touch}; resize(); SAFE.t = ${notch}; startGame(${diff}); G.state = 'play';
    var T = topLayout(), L = lane(), b = T.bar, g = T.tag, ps = PAUSE_PX() / K, pb = pauseBox(), pr = pb.r + RING_GAP + RING_W / 2 + 0.5, ringR = (RING_R + 2.25) * L.s;
    ({ prog: { x: pb.cx - pr, y: pb.cy - pr, w: 2 * pr, h: 2 * pr }, // the ring's outer edge
      panel: { x: T.x - 0.75, y: T.y - 0.75, w: T.w + 1.5, h: T.h + 1.5 }, // with its stroke
      pause: { x: W - (10 + SAFE.r) / K - ps, y: ((K < 2 ? 13 : 18) + SAFE.t) / K, w: ps, h: ps }, notch: { x: 0, y: 0, w: W, h: SAFE.t / K },
      screen: { W, HH }, lane: { x: 0, y: L.top, w: W, h: L.bottom - L.top }, ring: { x: L.hx - ringR, y: L.cy - ringR, w: 2 * ringR, h: 2 * ringR },
      judge: { x: 0, y: L.bottom, w: W, h: 30 * L.sb },
      tag: { x: g.x - 0.75, y: g.y - 0.75, w: g.w + 1.5, h: g.h + 1.5 },
      bar: { x: b.x - 1.5, y: b.y - 2, w: b.w + 3, h: b.h + 4 }, // its low-energy rim and the danger tick
      encerts: { x: T.enc.x, y: T.enc.y, w: T.enc.w, h: T.enc.h }, mug: { x: T.x + T.pad - 1, y: T.cy - MULE_H / 2 - 3, w: MULE_W + 2, h: MULE_H + 6 },
      gap: L.top - (T.y + T.h + 0.75) })`);
  const name = `${w}x${h} diff ${diff}`;
  assert(r.prog.x >= 0 && r.prog.x + r.prog.w <= r.screen.W && r.prog.y >= r.notch.h, `${name}: the ring on screen, inside the safe area ${JSON.stringify(r.prog)}`);
  assert(r.gap >= 10, `${name}: the lane keeps its room under the panel (${r.gap})`);
  assert(!inter(r.encerts, r.lane) && !inter(r.encerts, r.pause) && r.encerts.x >= 0 && r.encerts.x + r.encerts.w <= r.screen.W, `${name}: the ENCERTS pill clear of the lane and #pause, on screen`);
  for (const o of ['panel', 'notch', 'lane', 'ring', 'judge', 'tag']) assert(!inter(r.prog, r[o]), `${name}: progress ring clear of the ${o} ${JSON.stringify([r.prog, r[o]])}`);
  assert(r.tag.y >= r.notch.h, `${name}: the x2 tag inside the safe area`);
  for (const o of ['bar', 'encerts', 'mug', 'pause']) assert(!inter(r.tag, r[o]), `${name}: the x2 tag clear of the ${o} ${JSON.stringify([r.tag, r[o]])}`);
}
context.innerWidth = 1280; context.innerHeight = 720; run('COARSE.matches = false; SAFE.t = 0; resize();');
console.log('song progress contracts ok');

// Lane: on every screen and difficulty the closest two notes of the chart keep a clear gap (NOTE_GAP diameters)
// and a note stays visible for at least MIN_LOOK s; the band grows on big screens; the camera stays in the plaça.
for (const [w, h] of [[393, 852], [375, 667], [852, 393], [1280, 720], [2000, 1060]]) {
  context.innerWidth = w; context.innerHeight = h; run('resize()');
  for (const diff of [0, 1, 2]) {
    const L = run(`startGame(${diff}); G.state = 'play'; var L = lane(); ({ ...L, gap: minGap(G.chart), W, R: NOTE_R, NG: NOTE_GAP, ML: MIN_LOOK })`);
    const px = L.speed * L.s, clear = px * L.gap - 2 * L.R * L.s;
    assert(clear >= L.NG * 2 * L.R * L.s - 1e-6, `${w}x${h} diff ${diff}: closest notes keep a clear gap (${clear.toFixed(1)})`);
    assert((L.W - L.hx) / px >= L.ML - 1e-6, `${w}x${h} diff ${diff}: look-ahead ${((L.W - L.hx) / px).toFixed(2)} s`);
    assert(L.bottom - L.top >= 40, `${w}x${h}: the band never shrinks`);
  }
}
assert(run('var big = lane(); big.sb') >= 1.6, 'big desktops get the tablet band (K grows with the screen, so the HUD keeps its proportions)');
assert(run('var c = insidePlaza(new THREE.Vector3(3, 10, 30), 0, 1, 12); Math.abs(c.z) <= plaza.inner - 1.5 + 1e-9 && c.y > 10'), 'the camera stays inside the plaça, higher instead');
// Trees and lamps stand out of the play camera's path: wherever she dances (during play her centre stays within
// 0.35 m of the middle; checked to 1 m) and however far the camera sits (big tablets pull back to about 22 m), none
// is on the sight line or by the lens (so none has to pop away).
assert(run(`var hit = []; for (let x = -1; x <= 1; x += 0.25) for (let z = -1; z <= 1; z += 0.25) for (let d = 8; d <= 22; d++) {
    const c = insidePlaza(new THREE.Vector3(x + d * CAM_DIR[0], 1 + d * CAM_DIR[1], z + d * CAM_DIR[2]), x, 1, z);
    for (const p of plaza.props) if (blocks(p, [c.x, c.y, c.z], [x, 1, z])) hit.push([x, z, d, p.x, p.z]); }
  hit.length === 0 || JSON.stringify(hit.slice(0, 3))`) === true, 'no prop between the play camera and the mulassa');
context.innerWidth = 1280; context.innerHeight = 720; run('resize()');
// The streak (RATXA badge, drawStreak): never inside the ring any more. From 10 in a row, «RATXA» on its plate (no COMBO); tiers climb gold -> orange -> hot pink -> 100+; a miss lets it fade, a new run clears it.
const streakDraw = (combo, dt = 0) => { drawnText.length = 0; run(`G.combo = ${combo}; clock += ${dt}; drawStreak(G.chart[0].t);`); return drawnText.slice(); };
run(`startGame(1); G.state = 'play'; G.practice = null; stk.n = 0; stk.lostT = -9; M.missT = -9;`);
assert.deepEqual(streakDraw(9), [], 'no streak under 10');
assert.deepEqual(streakDraw(12), ['RATXA', '1', '2'], 'from 10: the badge (one glyph per digit)');
assert.deepEqual(streakDraw(12), ['RATXA', '1', '2'], 'RATXA, never COMBO');
drawnText.length = 0; run('G.combo = 40; drawRing(0, lane().hx, lane().cy); drawRingTop(0, lane().hx, lane().cy, false);');
assert(!drawnText.some(s => /\d/.test(s)), 'no number inside the ring');
run('G.combo = 12; M.missT = clock;');
assert.deepEqual(streakDraw(0), ['RATXA', '1', '2'], 'a miss: the last streak lingers, fading');
assert.deepEqual(streakDraw(0, 0.7), [], '... and is gone');
run('stk.n = 30; M.missT = -9;');
assert.deepEqual(streakDraw(0), [], 'a new run clears it without the fade');
assert.deepEqual([10, 24, 25, 49, 50, 99, 100, 250].map(n => run(`streakCol(${n})`)),
  ['#f5c518', '#f5c518', '#ff9f1c', '#ff9f1c', '#ff5ea8', '#ff5ea8', '#ffffff', '#ffffff'], 'colour tiers');
assert.deepEqual([...Array(301).keys()].filter(n => run(`streakMilestone(${n})`)), [10, 25, 50, 75, 100, 150, 200, 250, 300], 'milestones');
run(`stk.n = 9; G.combo = 9; clock += 1; drawStreak(0); G.combo = 10; drawStreak(0);`);
assert(run('stk.mt === clock && stk.t === clock'), 'reaching 10 is a milestone pop');
// Every digit and tier label is painted ahead (warmups), at most six small sprites a spare frame.
assert(run('streakWarmups().length === 2 * STREAK.tiers.length'), 'streak warmups: two per tier');
// Placement: behind the ring on the band (the ring in the middle) or above-left of it (portrait phones), at its biggest
// pop and while it sinks: inside the safe screen, clear of the ring at its biggest, the notes' path (a missed GUAPA
// scrolls on to hx - 20), the judge word under the lane, the top panel, the progress ring and #pause; inside the band
// or wholly above it, never across its edges.
{
  const hit = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
  for (const [w, h, touch, notch, lane] of [[360, 760, true, 0, false], [375, 667, true, 20, false], [393, 852, true, 59, false], [393, 852, true, 0, false],
    [1180, 820, true, 24, true], [1280, 800, false, 0, true], [852, 393, true, 0, true]]) for (const diff of [0, 1, 2]) {
    context.innerWidth = w; context.innerHeight = h;
    const r = run(`COARSE.matches = ${touch}; resize(); SAFE.t = ${notch}; startGame(${diff}); G.state = 'play'; G.practice = null;
      var B = streakBox(), L = lane(), T = topLayout(), ps = PAUSE_PX() / K, pb = pauseBox(), pr = pb.r + RING_GAP + RING_W / 2;
      var drop = { x: B.cx - B.w * 0.45, y: B.cy - B.h * 0.45, w: B.w * 0.9, h: B.h * 0.9 + STREAK.drop };
      ({ lane: B.lane, box: { x: B.cx - B.w * B.M / 2, y: Math.min(B.cy - B.h * B.M / 2, drop.y), w: B.w * B.M, h: Math.max(B.cy + B.h * B.M / 2, drop.y + drop.h) - Math.min(B.cy - B.h * B.M / 2, drop.y) },
        M: B.M, W, HH, top: SAFE.t / K, hx: L.hx, cy: L.cy, R: (RING_R + 12.5) * L.s + 1.25, L: { top: L.top, bottom: L.bottom },
        notes: { x: L.hx - 47 * L.s, y: L.cy - 27 * L.s, w: W, h: 54 * L.s }, judge: { x: 0, y: L.bottom, w: W, h: 30 * L.sb },
        panel: { x: T.x - 0.75, y: T.y - 0.75, w: T.w + 1.5, h: T.h + 1.5 }, prog: { x: pb.cx - pr - 1, y: pb.cy - pr - 1, w: 2 * pr + 2, h: 2 * pr + 2 },
        pause: { x: W - (10 + SAFE.r) / K - ps, y: ((K < 2 ? 13 : 18) + SAFE.t) / K, w: ps, h: ps } })`);
    const name = `${w}x${h}${notch ? ' notch' : ''} diff ${diff}`, b = r.box;
    assert.equal(r.lane, lane, `${name}: ${lane ? 'behind the ring' : 'on the top row, left of the panel'}`);
    assert(r.M >= 1.08, `${name}: room to pop (${r.M.toFixed(2)})`);
    assert(b.x >= 0 && b.x + b.w <= r.W && b.y >= r.top && b.y + b.h <= r.HH, `${name}: on screen, under the notch ${JSON.stringify(b)}`);
    const nx = Math.max(b.x, Math.min(r.hx, b.x + b.w)), ny = Math.max(b.y, Math.min(r.cy, b.y + b.h));
    assert(Math.hypot(nx - r.hx, ny - r.cy) > r.R, `${name}: clear of the ring ${JSON.stringify([b, r.hx, r.cy, r.R])}`);
    assert(b.y >= r.L.top + 1 && b.y + b.h <= r.L.bottom - 1 || b.y + b.h <= r.L.top - 1, `${name}: inside the band or above it, never on its edges`);
    for (const o of ['notes', 'judge', 'panel', 'prog', 'pause']) assert(!hit(b, r[o]), `${name}: clear of the ${o} ${JSON.stringify([b, r[o]])}`);
  }
  context.innerWidth = 1280; context.innerHeight = 720; run('COARSE.matches = false; SAFE.t = 0; resize();');
}
drawnText.length = 0;
run(`G.state = 'results'; G.reason = 'clear'; G.resT = clock - 2; drawHud(0);`);
assert(drawnText.includes('RATXA') && drawnText.includes('ENCERTS'), 'results: RATXA and ENCERTS');
console.log('lane size, streak badge and camera contracts ok');

// A GLOBUS hanging under the ring never covers the headline: the word steps beside it or under it, on any screen.
for (const [w, h] of [[393, 852], [375, 667], [852, 393], [1280, 800], [1920, 1080]]) {
  context.innerWidth = w; context.innerHeight = h; run('resize()');
  for (const word of ['PAM!', 'PAM! x2!', 'FINAL ESBOJARRAT!']) {
    const r = run(`startGame(1); G.state = 'play'; var p = { word: ${JSON.stringify(word)}, dx: 0, dy: 0 }; dodgeBalloon(p, 3);
      var L = lane(), hs = HEADLINE_SIZE() * (1 + 3 * 0.08) * 1.15; var hw = (H.measureText(p.word).width + hs * 0.6) / 2;
      var x = L.hx + p.dx, y = PRAISE_Y() + p.dy;
      ({ w: W, l: x - hw, r: x + hw, t: y - hs * 0.6, bx0: L.hx - 31 * L.s, bx1: L.hx + 31 * L.s, by1: L.bottom + BALLOON_DROP * L.s, lab: L.bottom + 31 * L.s })`);
    const apart = r.r <= r.bx0 || r.l >= r.bx1 || r.t >= r.by1;
    assert(r.t >= r.by1 || r.t >= r.lab, `${w}x${h} ${word}: beside the balloon, under its labels`);
    assert(apart, `${w}x${h} ${word}: the headline clears the balloon ${JSON.stringify(r)}`);
  }
}
context.innerWidth = 1280; context.innerHeight = 720; run('resize()');
// Celebrations (the chant, the practice's combo praise and A BALLAR!) are big; on portrait phones (and tablets) they sit
// exactly in the middle of the free space between the lane and the pad, clear of a GLOBUS, the practice instruction
// and the pad. Landscape phones and desktops keep them under the lane. The practice's other
// words stay compact in the judge slot under the ring, and the per-note judge shows beside a big word.
for (const [w, h, touch, centred] of [[393, 852, true, true], [375, 667, true, true], [360, 760, true, true], [852, 393, true, false], [1280, 800, false, false]]) {
  context.innerWidth = w; context.innerHeight = h; context.screen = { width: w, height: h };
  nodes.get('pad').getBoundingClientRect = () => ({ top: touch ? h - (h < 400 ? 66 : 130) : h });
  run(`COARSE.matches = ${touch}; SAFE.t = SAFE.b = 0; resize(); padTop = null; startGame(1); G.state = 'play';`);
  drawnText.length = 0;
  const r = run(`(() => {
    G.practice = { step: 0, clickK: 0 }; G.praise = null; G.balloons = [];
    G.counts = { perfect: 0, good: 0, miss: 0 }; G.combo = 9; judge({ phrase: 0 }, 'perfect'); var combo = G.praise;
    G.praise = null; headline('MOLT BÉ!', 1, 3, 1.2); var small = G.praise;
    G.praise = null; headline('A BALLAR!', 'rainbow', 4, 2, 0.5, true); var L = lane();
    var S = HEADLINE_SIZE(true) * (1 + 3 * 0.08) * 1.15, y = PRAISE_Y(true), mid = (L.bottom + praiseFloor()) / 2;
    G.judge = { kind: 'perfect', word: 'PERFECTE', t: clock }; drawJudge();
    var p = { word: 'A BALLAR!', big: true }; G.balloons = [{ t: -1e9, end: 1e9, balloon: true, need: 6, count: 0 }]; dodgeBalloon(p, 3);
    return ({ combo: !!combo?.big, small: small?.big, big: G.praise.big, centred: PRAISE_CENTRED(true), y, top: y - S * 0.6, bottom: y + S * 0.6,
      mid, balloon: L.bottom + BALLOON_DROP * L.s, instr: PRACTICE_Y() - 11, pad: playBottom(), compactY: PRAISE_Y(false),
      slot: L.bottom + 16 * bandScale(), under: L.bottom + 44 * bandScale() + HEADLINE_SIZE(true) * 0.6, moved: !!(p.dx || p.dy) });
  })()`);
  assert(r.combo && r.small === false && r.big, `${w}x${h}: combo praise and A BALLAR! are big, MOLT BÉ! compact ${JSON.stringify(r)}`);
  assert.equal(r.compactY, r.slot, `${w}x${h}: compact practice words stay in the judge slot`);
  assert(drawnText.includes('PERFECTE'), `${w}x${h}: a big word does not hide the per-note judge`);
  assert.equal(r.centred, centred, `${w}x${h}: centred only on portrait screens and tablets`);
  if (centred) {
    assert(Math.abs(r.y - r.mid) < 0.5 && r.top > r.balloon && r.bottom < r.instr && r.bottom < r.pad, `${w}x${h}: in the middle, clear of the GLOBUS, instruction and pad ${JSON.stringify(r)}`);
    assert(!r.moved, `${w}x${h}: a centred word never needs to dodge the balloon`);
  } else assert.equal(r.y, r.under, `${w}x${h}: landscape keeps the word under the lane`);
}
context.innerWidth = 1280; context.innerHeight = 720; run('G.practice = null; G.balloons = []; G.judge = null; G.praise = null; COARSE.matches = false; SAFE.t = SAFE.b = 0; resize();');
// A tap that waited behind a long frame is judged at its event time (performance.now() is 1000 for this block)
assert.equal(eventAge(960, 1000), 0.04, 'event age backdates the press');
assert.equal(eventAge(700, 1000), 0.3, 'a 300 ms stall (low-end phone) is not capped');
assert.equal(eventAge(100, 1000), 0.5, 'event age is capped at half a second');
assert.equal(eventAge(1.7e12, 1000), 0, 'an epoch timestamp (other clock, future) is ignored');
assert.equal(eventAge(0, 1000), 0, 'a zero timestamp is ignored');
assert.equal(eventAge(-5, 1000), 0, 'a negative timestamp is ignored');
assert.equal(eventAge(undefined, 1000), 0, 'no event: no lag');
run('performance.now = () => 1000');
assert.equal(run('eventAt({ timeStamp: 960 })'), 960, 'press() reads the song clock at the event time');
assert.equal(run('eventAt({ timeStamp: 100 })'), 500, '... at most half a second back');
assert.equal(run('eventAt(undefined)'), 1000, 'no event: now');
assert.equal(run('eventAt({ timeStamp: 1.7e12 })'), 1000, 'a foreign-clock stamp: now');
run(`Object.assign(G, { state: 'play', paused: false, collapseT: 0, practice: null, diff: 1, next: 0, streak: 0, combo: 0, energy: 1,
  counts: { perfect: 0, good: 0, miss: 0 }, errors: { early: 0, late: 0, move: 0, silent: 0, both: 0, hold: 0 }, score: 0, maxCombo: 0 });
  G.balloons = []; bigPending = null; G.hold = null; chip = { sfx() {}, t0: 0, now: at => 5 + ((at ?? performance.now()) - 1000) / 1000 };
  var lagNote = { t: songTime() - 0.06, dir: 'L', input: 'L', phrase: 0, hit: null }; G.chart = [lagNote]; WIN = WINDOWS[1];
  press('L', { timeStamp: 940 });`);
assert.equal(run('lagNote.hit'), 'perfect', 'the press lands on the note it was aimed at, despite a 60 ms handler delay');
run(`var stallNote = { t: songTime() - 0.3, dir: 'R', input: 'R', phrase: 0, hit: null }; G.chart = [stallNote]; G.next = 0;
  press('R', { timeStamp: 700 });`);
assert.equal(run('stallNote.hit'), 'perfect', 'a 300 ms main-thread stall still judges the tap on time');
run('performance.now = () => 0');
console.log('input event-time judging ok');

// Compact feedback retains useful instruction without repeating routine error explanations.
run(`chip = { resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, sfx() {}, noiseHit() {}, blip() {}, now: () => songNow, start: () => Promise.resolve(false) };
  startGame(1); offsetMs = 0; G.state = 'play'; clock += 1; songNow = G.chart[0].t;
  G.balloons = []; G.next = 0; G.hold = null; bigPending = null;`);
for (const kind of ['perfect', 'good', 'miss']) {
  run(`G.energy = 1; judge({ phrase: 0, detail: 'SENSE TOC' }, '${kind}');`);
  assert.equal(run('G.judge.word'), { perfect: 'PERFECTE', good: 'BÉ', miss: 'ERROR' }[kind]);
  drawnText.length = 0; run('drawJudge()');
  assert(!drawnText.includes('SENSE TOC'), 'routine details stay in results');
}
for (const detail of ['ELS DOS ALHORA!', 'HAS DEIXAT ANAR']) {
  drawnText.length = 0;
  run(`G.judge.detail = ${JSON.stringify(detail)}; drawJudge();`);
  assert(drawnText.includes(detail), 'actionable instruction remains');
}
drawnText.length = 0;
run(`G.practice = { step: 0 }; G.judge.detail = 'AVIAT'; drawJudge(); G.practice = null;`);
assert(drawnText.includes('AVIAT'), 'practice retains detailed feedback');
drawnText.length = 0;
run(`G.go = G.chart[0].t; drawBanner(G.go);`);
assert(!drawnText.includes('BALLA!'), 'the first playable note is not covered by the start word');

// A special does not open a new headline slot during the song.
run(`G.praise = null; var compactBalloon = { t: songNow - 1, end: songNow + 2, balloon: true, need: 2, count: 0, phrase: 0 }; pump(compactBalloon); pump(compactBalloon);`);
assert.equal(run('G.praise'), null, 'pops retain their particles and score without a headline');
run('endBalloon(compactBalloon);');
assert.equal(run('G.praise'), null, 'no end-of-balloon tally headline');

// The camera and bubble exclusion use a stable stage, independent of feedback or active balloons.
for (const [w, h, padPixels, touch] of [[375, 667, 508, true], [393, 852, 693, true], [667, 375, 375, false], [1280, 800, 800, false], [1366, 1024, 871, true]]) {
  context.innerWidth = w; context.innerHeight = h;
  nodes.get('pad').getBoundingClientRect = () => ({ top: padPixels });
  run(`COARSE.matches = ${touch};`);
  run(`resize(); startGame(1); G.practice = null; G.collapseT = 0; G.state = 'play';
    SAFE.t = COARSE.matches ? 44 : 0; SAFE.b = COARSE.matches ? 34 : 0;
    var stableStage = JSON.stringify(playStage()); G.judge = { kind: 'miss', detail: 'ELS DOS ALHORA!', t: clock };
    G.praise = { word: 'IGNORED', tier: 0 }; G.hold = { n: G.chart[0] };`);
  assert.equal(run('JSON.stringify(playStage())'), run('stableStage'), 'temporary feedback cannot change framing');
  assert(run('bubbleView().t >= playStage().top + 2 && bubbleView().b <= playStage().bottom - 2'), 'speech respects the same stage');
  run(`G.hold = null; G.praise = null; G.balloons = [];
    var projected = []; var vertex = new THREE.Vector3();
    for (const collapsed of [false, true]) for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
      G.collapseT = collapsed ? clock : 0; var fitPoints = collapsed ? COLLAPSE_POINTS : MULA_POINTS;
      M.yaw = yaw; var shift = framePlayCamera(1, 0, 0, true);
      camera.setViewOffset(W * K, HH * K, 0, -shift, W * K, HH * K); camera.updateMatrixWorld(true);
      var sy = Math.sin(yaw), cy = Math.cos(yaw), area = playStage();
      var minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
      for (let i = 0; i < fitPoints.length; i += 3) {
        vertex.set(fitPoints[i] * cy + fitPoints[i + 2] * sy, fitPoints[i + 1], -fitPoints[i] * sy + fitPoints[i + 2] * cy).project(camera);
        var xx = (vertex.x + 1) * W / 2, yy = (1 - vertex.y) * HH / 2;
        minY = Math.min(minY, yy); maxY = Math.max(maxY, yy); minX = Math.min(minX, xx); maxX = Math.max(maxX, xx);
      }
      projected.push({ minY, maxY, minX, maxX, top: area.top, bottom: area.bottom, width: W });
    }`);
  for (const p of run('projected')) {
    // The play camera frames a fixed slice of the world (CAMV), not her whole envelope: in her wildest turn/jump she may pass
    // over the lane or the pad (and a desktop shows her feet at the very bottom on purpose), but never off a side (the wildest jump apex may just touch the top of the window).
    assert(p.minY >= -26 && p.minX >= 2 && p.maxX <= p.width - 2,
      `${w}x${h}: the turn/jump envelope stays on the screen ${JSON.stringify(p)}`);
  }
}
// Practice must leave a usable stage, not fit a tiny silhouette from above the roofs.
for (const [w, h, touch] of [[375, 667, true], [393, 852, true], [667, 375, false], [1280, 720, false], [1366, 1024, true]]) {
  context.innerWidth = w; context.innerHeight = h;
  nodes.get('pad').getBoundingClientRect = () => ({ top: touch ? h - (h < 400 ? 66 : 130) : h });
  run(`COARSE.matches = ${touch}; SAFE.t = SAFE.b = 0; resize(); startGame(1); G.practice = { step: 0, clickK: 0 };`);
  const area = run('JSON.stringify(playStage())');
  for (let step = 0; step < 5; step++) for (const yaw of [0, 1.3, 2.6, 3.9, 5.2]) {
    run(`G.practice.step = ${step}; practiceStep(4); M.yaw = ${yaw}; framePlayCamera(1, 0, 0, true);`);
    assert.equal(run('JSON.stringify(playStage())'), area, 'practice steps and special notes keep the same camera stage');
    assert(run('playStage().bottom - playStage().top > HH * 0.2'), `${w}x${h}: practice retains room for the Mulassa`);
    assert(run('(cameraTarget.y - 1.4) / Math.hypot(cameraTarget.x, cameraTarget.z) < 2.15'), `${w}x${h}: practice does not escape above the plaza ${run("JSON.stringify({pos:cameraTarget.toArray(),stage:playStage(),HH})")}`);
    assert(run('PRACTICE_Y() - 11 >= playStage().bottom && PRACTICE_Y() + 11 < playBottom()'), 'instructions clear the stage and pad');
  }
}
context.innerWidth = 1280; context.innerHeight = 720; run('G.practice = null; COARSE.matches = false; SAFE.t = SAFE.b = 0; resize();');

// Collapse is a presentation of its own: no gameplay HUD, delayed caption and restored controls on restart.
run(`startGame(1); G.state = 'play'; clock = 500; G.judge = { kind: 'miss', word: 'ERROR', t: clock };
  G.praise = { word: 'OLD', tier: 0, t0: clock }; collapse(); drawHud(songTime()); updateControls();`);
assert(run('G.judge === null && G.praise === null && bubbles.length === 0'), 'collapse clears competing feedback');
assert.equal(nodes.get('pause').hidden, true, 'collapse hides pause');
drawnText.length = 0; run('drawHud(songTime());');
assert.deepEqual(drawnText, [], 'collapse initially leaves the animation alone');
drawnText.length = 0; run('clock += 0.7; drawHud(songTime());');
assert.deepEqual(drawnText, ['LA MULASSA', 'S’HA DESMUNTAT!'], 'only the delayed caption remains (two big lines)');
run(`var collapseStage = JSON.stringify(playStage()); startGame(1); updateControls();`);
assert.equal(nodes.get('pause').hidden, false, 'a new run restores pause');
assert(run('G.collapseT === 0 && G.energyWarnT === -9 && rests.cursor === 0 && JSON.stringify(playStage()) !== collapseStage'), 'restart restores stage and rest/warning state');
run('toTitle(); updateControls();');
assert.equal(nodes.get('pause').hidden, true, 'the title does not retain pause');
console.log('compact feedback, stable stage and collapse presentation ok');

// Exercise the real frame transitions: the finale has no banner, the cheer waits for chart resolution,
// and collapse still reaches results after its existing delay.
run(`startGame(1); songNow = song.finale + 0.1; clock = 800;
  G.counts = { perfect: 100, good: 0, miss: 0 }; G.guapo = G.shown = 100;
  for (const n of G.chart) if (n.t < songNow) { n.hit = 'perfect'; if (n.end && !n.balloon) n.tail = 'perfect'; }
  G.next = G.chart.findIndex(n => !n.hit); G.praise = null; frame(1000);`);
assert(run('G.finale && G.praise === null'), 'the actual finale transition preserves effects without a banner');
run(`songNow = song.end; for (const n of G.chart) n.hit = n.hit || 'perfect'; G.next = G.chart.length; // no misses: no collapse
  G.hold = { n: G.chart.at(-1), got: songNow, pts: 0 }; bigPending = { n: G.chart.at(-1), t: songNow, done: true };
  frame(1017);`);
assert.equal(run('G.eeeh'), false, 'post-song celebration waits for pending interactions');
run(`G.hold = null; bigPending = null; for (const n of G.chart) n.hit = 'perfect'; G.next = G.chart.length; songNow = song.end + 0.1; frame(1034);`);
assert(run('G.eeeh'), 'the post-song celebration remains (the GUAPA, GUAPA... I GUAPA! chant is timed)');
run(`collapse(); clock = G.collapseT + 3.51; frame(1051);`);
assert(run('G.state === "results" && G.reason === "collapse"'), 'collapse retains its 3.5-second results transition');
// A fatal missed hold judges both ends but cannot repopulate terminal presentation.
run(`startGame(1); G.energy = 0.01; var fatalHold = G.chart.find(n => n.end && !n.balloon); judge(fatalHold, 'miss');`);
assert(run('G.collapseT && G.counts.miss === 2 && G.judge === null && G.ring === null'), 'tail judgement after a fatal head miss stays visually quiet');
console.log('finale and collapse frame transitions ok');

// The finale's festa is for everyone; only the double points (and their «x2 PUNTS» tag) need >= 70%.
for (const [perfect, miss, doubled] of [[50, 50, false], [100, 0, true]]) {
  run(`startGame(1); songNow = song.finale + 0.1; clock = 900;
    G.counts = { perfect: ${perfect}, good: 0, miss: ${miss} }; G.guapo = G.shown = quality(G.counts);
    for (const n of G.chart) if (n.t < songNow) { n.hit = 'perfect'; if (n.end && !n.balloon) n.tail = 'perfect'; }
    G.next = G.chart.findIndex(n => !n.hit); frame(1100); var finN = G.chart.find(n => !n.hit && !n.big && !n.balloon && !n.end);
    G.combo = 0; judge(finN, 'perfect');`);
  const q = run('G.guapo');
  assert(run('G.finale && (animFinaleLights(1.1), hemi.intensity !== 1.6)'), `the finale lights up at ${q.toFixed(0)}%`);
  assert(run('G.finale && sparks.some(s => s.life > 0)'), `the finale's fireworks fly at ${q.toFixed(0)}%`);
  assert.equal(run('G.doublePoints'), doubled, `double points ${doubled ? 'on' : 'off'} at ${q.toFixed(0)}%`);
  assert.equal(run('finN.pts'), doubled ? 604 : 302, `a perfect is worth ${doubled ? 'x2' : 'x1'} at ${q.toFixed(0)}%`);
  run(`for (const n of G.chart) n.hit = n.hit || 'perfect'; G.next = G.chart.length; G.hold = null; bigPending = null; songNow = song.end + 0.1; frame(1117);`);
  assert(run('G.eeeh'), `the post-song chant and volley play at ${q.toFixed(0)}%`);
}
console.log('finale festa for everyone, x2 from 70% ok');

// Dance integration (game/mula-dance.js + accents): the song's choreography owns the heading, hits only accent it and
// settle back, taps never pile up, holds release smoothly, misses recover, the practice holds its opening stance and a
// collapse freezes the song pose. No score, judgement or energy rule depends on any of it.
run(`chip = { resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, blip() {}, noiseHit() {},
    sfx() {}, now: () => songNow, start: () => Promise.resolve(false), startClock() {}, tick() {}, countIn() {} };
  var dp = newMulaPose(), dv = new THREE.Vector2(), frames = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { clock += dt; animMula(dt, beatAt(songNow)); } };
  var songYaw = () => danceMula(dp, songTimeAtBeat(beatAt(songNow)), beatAt(songNow), false, dv); // the song's own heading now (no accents)
  function danceAt(diff, x) { startGame(diff); songNow = x; M.missT = -9; frames(90); return { yaw: M.yaw, roll: mula.body.rotation.z, pitch: mula.body.rotation.x, y: mula.root.position.y, x: M.pos.x, z: M.pos.y }; }
  var sameEasy = danceAt(0, BEATS[200] + 0.1), sameHard = danceAt(2, BEATS[200] + 0.1);`);
assert.deepEqual(run('sameEasy'), run('sameHard'), 'the same dance at the same musical moment on every difficulty');
run(`startGame(1); songNow = BEATS[52]; M.missT = -9; frames(60); var dy = songYaw();`); // (running out to N, her rear three-quarter to the lens)
assert(run('Math.abs(M.yaw - dy) < 1e-9 && M.pos.distanceTo(dv) < 1e-9'), 'untouched, she follows the song: its heading and its path');
run(`var y0 = M.yaw, r0 = mula.body.rotation.z; act('L'); frames(8); var leaned = mula.body.rotation.z - r0, turned = Math.abs(M.yaw - y0); frames(120);`);
assert(run('Math.abs(leaned) > 0.03 && turned < 0.05'), 'a GUA hit leans her without turning her away');
assert(run('Math.abs(M.yaw - songYaw()) < 1e-3 && Math.abs(S.roll.x) < 1e-3 && M.air === 0'), 'the accent settles back onto the dance');
run(`songNow = BEATS[20]; frames(60); var rFront = mula.body.rotation.z; act('L'); frames(8); var guaFront = mula.body.rotation.z - rFront;
  frames(120); songNow = BEATS[52]; frames(60); var rRear = mula.body.rotation.z; act('L'); frames(8); var guaRear = mula.body.rotation.z - rRear; frames(120);`);
assert(run('Math.cos(songYaw() - CAM_AZ) < -0.5 && guaFront > 0.03 && guaRear < -0.03'), 'GUA leans to the screen’s left whichever way she faces (her own roll flips; beat 52: running out to N, her rear to the lens)');
run(`var worst = 0, bl = G.balloons[0]; songNow = bl.t + 0.1; G.next = G.chart.indexOf(bl);
  for (let i = 0; i < 400; i++) { press(i % 2 ? 'L' : 'R'); frames(1, 1 / 120);
    worst = Math.max(worst, Math.abs(M.yaw - songYaw()) / CAP.yaw, Math.abs(S.roll.x) / CAP.roll, Math.abs(S.pitch.x) / CAP.pitch, M.air / CAP.air); }`);
assert(run('bl.count === 400 && worst <= 1 + 1e-9'), 'mashing a GLOBUS (and its pops) stays within the accent caps');
run(`frames(180);`);
assert(run('M.air === 0 && Math.abs(S.roll.x) < 1e-3 && Math.abs(M.yaw - songYaw()) < 1e-3'), 'and settles once the mashing stops');
run(`startGame(1); var hn = G.chart.find(n => n.end && !n.balloon); songNow = hn.t; frames(30);
  G.hold = { n: hn, got: hn.t, pts: 0, auto: true }; frames(60); var holdNeck = S.neck.x, holdRoll = S.roll.x;
  G.hold = null; frames(4); var justLet = S.neck.x; frames(120);`);
assert(run('holdNeck < -0.1 && Math.abs(holdRoll) > 0.02'), 'a held MANTÉN sustains a restrained gesture');
assert(run('justLet < -0.05 && Math.abs(S.neck.x) < 1e-3'), 'and releases it smoothly, not in one frame');
run(`startGame(1); songNow = BEATS[40]; frames(30); var gn = G.chart.find(n => n.big); gn.pts = 0; guapaHit(gn); frames(6); var gAir = M.air, gPitch = S.pitch.x; frames(120);`);
assert(run('gAir > 0.03 && gAir <= CAP.air && gPitch < 0'), 'a GUAPA lifts her whole front, within the cap');
run(`stumble('L'); frames(4); var stumbled = S.pitch.x; frames(150);`);
assert(run('stumbled > 0.1 && Math.abs(S.pitch.x) < 1e-3 && Math.abs(M.yaw - songYaw()) < 1e-3'), 'a stumble dips her, then she recovers the song pose');
run(`var missNote = G.chart.find(n => !n.big && !n.balloon && !n.end && n.t > songNow + 1); G.next = G.chart.indexOf(missNote);
  songNow = missNote.t - WIN.good - 0.02; G.score = 0; var r0m = S.roll.v, s0 = G.score; press(missNote.input);`);
run(`startGame(1); songNow = song.finale + 1; G.finale = true; M.air = 0; M.airV = 0; var hopped = false;
  for (let i = 0; i < 240; i++) { frames(1); hopped ||= M.air > 0; }`);
assert(run('!hopped && Math.abs(M.yaw - songYaw()) < 1e-3'), 'the finale follows the choreography: no random hops or free spinning');
run(`startGame(1); songNow = BEATS[100] + 0.2; frames(30); var beforePause = M.yaw; G.paused = true; frames(30, 0); var paused = M.yaw; G.paused = false;
  startGame(1); songNow = BEATS[100] + 0.2; frames(30); var restarted = M.yaw;`);
assert(run('beforePause === paused && Math.abs(restarted - beforePause) < 1e-9'), 'pause freezes the pose; a restart lands on the same one');
run(`startPractice(null); songNow = BEATS[100]; frames(60); var practiceYaw = M.yaw; toTitle();`);
assert(run('Math.abs(practiceYaw - MULA_YAW - MULA_W) < 0.1 && Math.cos(practiceYaw - CAM_AZ) > 0.5'), 'the practice holds her opening stance (W, three-quarter to the lens), not the song’s turns');
run(`startGame(1); songNow = BEATS[76]; frames(10); collapse(); var fell = M.danceBeat; songNow = BEATS[90]; frames(60);`);
assert(run('M.danceBeat === fell && Math.abs(mula.root.position.y + 0.42) < 1e-6'), 'a collapse freezes the dance where she fell and sinks her');
run(`finish('collapse'); var leaving = M.yaw; frames(2);`);
assert(run('Math.abs(M.yaw - leaving) < 0.01 && !M.dancing'), 'results take over the heading without a jump');
run('toTitle();');
// A collapse, then back to the menu: she stands up again, exactly as on a fresh title (it looked «moixa»: sunk, neck and
// head on the floor, legs hidden, the crowd sad, until the next game). Same spot, heading and clock for both.
run(`var titlePose = () => { const b = mula.body, n = mula.neck, r = v => +v.toFixed(4); return JSON.stringify({ root: mula.root.position.toArray().map(r),
    body: [b.rotation.x, b.rotation.z, b.scale.y].map(r), neck: [n.rotation.x, n.rotation.y].map(r), head: r(mula.head.rotation.x), jaw: r(mula.jaw.rotation.x),
    ears: mula.ears.map(e => r(e.rotation.x)), legs: mulaCarriers.group.visible, tail: [mula.tail.rotation.x, mula.tail.rotation.z].map(v => +v.toFixed(2)),
    collapseT: G.collapseT, sad: Boolean(clock - M.missT < 1 || G.collapseT), air: M.air, state: G.state }); };
  var titleAt = () => { Object.assign(M, { yaw: 0, dancing: false }); Object.assign(S.yaw, { x: 0, v: 0, t: 0 }); M.pos.set(0, 0); M.pivot.set(0, PIVOT); clock = 5000;
    for (let i = 0; i < 120; i++) { clock += 1 / 60; animMula(1 / 60, clock / BEAT); } return titlePose(); };
  startGame(1); songNow = BEATS[40]; frames(30); toTitle(); var fresh = titleAt();
  startGame(1); songNow = BEATS[76]; frames(10); stumble('L'); collapse(); frames(60); finish('collapse'); frames(120); var fallen = JSON.parse(titlePose());
  toTitle(); var stood = titleAt();`);
assert(run('fallen.root[1] < -0.4 && !fallen.legs && fallen.sad'), 'the results after a collapse still show her fallen (carriers hidden under her)');
assert.equal(run('stood'), run('fresh'), 'collapse → menu: her pose and state equal a fresh title');
run(`startGame(1); songNow = BEATS[76]; frames(10); collapse(); frames(30); finish('collapse'); frames(30); startGame(1); frames(1);`);
assert(run('G.collapseT === 0 && mulaCarriers.group.visible && mula.root.position.y > -0.1'), `and a new run (Torna-ho a provar) starts her upright ${run('JSON.stringify([G.collapseT, mulaCarriers.group.visible, mula.root.position.y])')}`);
run('toTitle();');
// The splash: the Drac dances beside her and her demo walk never runs into it (head, centre and rear stay clear);
// after the tap the selector shows her alone, from the first frame.
run(`G.state = 'splash'; M.pivot.set(0, PIVOT); var pairMin = 9, pairStray = 0, pairCremas = 0, pairFrom = [PAIR.x, PAIR.z], pairWalk = 0;
  for (let i = 0; i < 60 * 120; i++) { clock += 1 / 60; animMula(1 / 60, clock / BEAT);
    if (SHOWCASE.crema) { pairCremas++; SHOWCASE.crema = false; }
    pairStray = Math.max(pairStray, Math.hypot(PAIR.x - PAIR.w.hx, PAIR.z - PAIR.w.hz)); pairWalk = Math.max(pairWalk, Math.hypot(PAIR.x - pairFrom[0], PAIR.z - pairFrom[1]));
    for (const back of [0, PIVOT, 2 * PIVOT]) pairMin = Math.min(pairMin, Math.hypot(M.pivot.x - Math.sin(M.yaw) * back - PAIR.x, M.pivot.y - Math.cos(M.yaw) * back - PAIR.z)); }
  var pairShown = drac.root.visible && mula.root.visible && dracMat.opacity === 1; G.state = 'select';
  animMula(1 / 60, clock / BEAT);`);
assert(run('!drac.root.visible && mula.root.visible && PAIR.k === 0 && dracMat.opacity === 1'), 'first selector frame: Mulassa alone, no fade');
assert(run('pairWalk > 1 && pairStray < 2.5 && pairCremas >= 4'), `splash: the Drac wanders round its spot (${run('pairWalk.toFixed(1)')} m, never over ${run('pairStray.toFixed(1)')} m away) and burns now and then (${run('pairCremas')} CREMES)`);
// its shoes stay planted on the floor while it walks and turns (they skated along with it): a planted shoe moves
// under 1 cm in the world from one frame to the next, and they do step (each one lifts, the walk carries it on)
run(`var shoeSlip = 0, shoeLifted = 0, shoeDown = [false, false], shoeAt = [null, null], shoeWalked = 0, shoeFrom = [PAIR.x, PAIR.z]; G.state = 'splash'; PAIR.k = 1;
  for (let i = 0; i < 60 * 20; i++) { clock += 1 / 60; animMula(1 / 60, clock / BEAT); drac.root.parent.updateMatrixWorld(true);
    drac.legs.forEach(({ shoe }, k) => { const down = shoe.position.y === 0, q = shoe.getWorldPosition(new THREE.Vector3());
      if (down && shoeDown[k]) shoeSlip = Math.max(shoeSlip, Math.hypot(q.x - shoeAt[k].x, q.z - shoeAt[k].z)); if (!down) shoeLifted++;
      shoeDown[k] = down; shoeAt[k] = q; });
    shoeWalked = Math.max(shoeWalked, Math.hypot(PAIR.x - shoeFrom[0], PAIR.z - shoeFrom[1])); }
  G.state = 'select'; for (let i = 0; i < 60; i++) { clock += 1 / 60; animMula(1 / 60, clock / BEAT); }`);
assert(run('shoeSlip < 0.01 && shoeLifted > 0 && shoeWalked > 0.5'), `the splash Drac's planted shoes hold the floor (shoeSlip ${run('(shoeSlip * 1000).toFixed(1)')} mm a frame, shoeWalked ${run('shoeWalked.toFixed(1)')} m)`);
assert(run('pairShown && pairMin > PAIR.clear - 0.05'), `splash: both figures shown, the Mulassa clear of the Drac (closest ${run('pairMin.toFixed(2)')} m)`);
assert(run('!drac.root.visible && PAIR.k === 0'), 'after the splash the Drac stays hidden');
run('var smokeMax = renderProfile.smoke; renderProfile.smoke = 96; dracFrame(1 / 60, 0); dracFrame(1 / 60, 0); var exitSmoke = dracFx.state().smoke; renderProfile.smoke = smokeMax;');
assert.equal(run('exitSmoke'), 0, 'entering the selector emits no exit smoke');
run('setFigureSong(DRAC); animMula(1 / 60, clock / BEAT);');
assert(run('drac.root.visible && !mula.root.visible && dracMat.opacity === 1'), 'Drac can still be selected at full opacity');
run('setFigureSong(MULASSA); animMula(1 / 60, clock / BEAT);');
console.log('dance integration contracts ok');

// Play camera (framePlayCamera): low and steady. Through the song's half turn and the finale's quick turns it keeps a
// cinematic angle, hardly changes distance, never jerks, keeps her whole silhouette in the stage every frame, and
// takes the same path at 30 and 60 fps. Taps never move it; entering play glides on from the title camera.
for (const [w, h, padPixels, touch] of [[393, 852, 695, true], [375, 667, 537, true], [1280, 800, 800, false], [1366, 1024, 871, true], [667, 375, 375, false]]) {
  context.innerWidth = w; context.innerHeight = h;
  nodes.get('pad').getBoundingClientRect = () => ({ top: padPixels });
  run(`COARSE.matches = ${touch}; SAFE.t = SAFE.b = 0; resize(); padTop = null;`);
  const sim = fps => JSON.parse(run(`(() => {
    toTitle(); G.state = 'title'; clock = 2000; camera.position.set(8, 6, 9); camera.lookAt(0, 1.2, 0); camFocus.set(0, 1.2, 0); CAMS.live = false;
    startGame(1); G.state = 'play'; M.missT = -9; trauma = 0;
    const dt = 1 / ${fps}, out = { maxAcc: 0, maxLookAcc: 0, el: [90, 0], dist: [1e9, 0], outside: -1e9, firstStep: 0, end: null }, v = new THREE.Vector3(), look = new THREE.Vector3();
    let p1 = null, p2 = null, l1 = null, l2 = null, first = true;
    for (const [a, b] of [[BEATS[64], BEATS[90]], [BEATS[204], BEATS[220]]]) for (songNow = a - 7; songNow < b; songNow += dt) { // (after a seek: 7 s to settle: the springs are slow, on purpose)
      clock += dt; animMula(dt, beatAt(songNow)); const shift = framePlayCamera(dt, M.pos.x, M.pos.y); camShift = shift;
      camera.setViewOffset(W * K, HH * K, 0, -shift, W * K, HH * K); camera.updateMatrixWorld(true);
      camera.getWorldDirection(look);
      const p = camera.position.clone(), d = Math.hypot(p.x - camFocus.x, p.y - 1.4, p.z - camFocus.z);
      if (first) { out.firstStep = p.distanceTo(new THREE.Vector3(8, 6, 9)); first = false; }
      if (songNow >= a) { // after the glide in from the title / the seek
        out.el[0] = Math.min(out.el[0], Math.asin((p.y - 1.4) / d) * 180 / Math.PI); out.el[1] = Math.max(out.el[1], Math.asin((p.y - 1.4) / d) * 180 / Math.PI);
        out.dist[0] = Math.min(out.dist[0], d); out.dist[1] = Math.max(out.dist[1], d);
        if (p2) out.maxAcc = Math.max(out.maxAcc, p.clone().sub(p1.clone().multiplyScalar(2)).add(p2).length() / dt / dt);
        if (l2) out.maxLookAcc = Math.max(out.maxLookAcc, look.clone().sub(l1.clone().multiplyScalar(2)).add(l2).length() / dt / dt);
        const area = playStage(), sy = Math.sin(M.yaw), cy = Math.cos(M.yaw);
        // her real box this frame (jumps, leans, buzz and all): the fit's margins must hold it
        mula.root.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(mula.root), pts = [];
        for (let k = 0; k < 8; k++) pts.push(v.clone().set(k & 1 ? bx.max.x : bx.min.x, k & 2 ? bx.max.y : bx.min.y, k & 4 ? bx.max.z : bx.min.z));
        for (let k = 0; k < MULA_POINTS.length + 24; k += 3) {
          if (k < MULA_POINTS.length) v.set(MULA_POINTS[k] * cy + MULA_POINTS[k + 2] * sy + M.pos.x, MULA_POINTS[k + 1], -MULA_POINTS[k] * sy + MULA_POINTS[k + 2] * cy + M.pos.y);
          else v.copy(pts[(k - MULA_POINTS.length) / 3]);
          v.project(camera);
          const yy = (1 - v.y) * HH / 2, xx = (v.x + 1) * W / 2;
          // Known: 1366x1024 (tablet), beat ~298, the head clears the top by up to ~26.7 units in the wildest jump (found when this check was repaired, 2026-09-30); 27.5 holds that, sides stay strict.
          const o = Math.max(-yy - 27.5, -xx + 2, xx - W + 2); // (never off a side; the head may just touch the top in a wild jump)
          if (o > out.outside) { out.outside = o; out.worst = [area.top - yy, yy - area.bottom, -xx, xx - W, beatAt(songNow), M.yaw - FRONT, mula.root.position.y]; } // (the fit keeps 8 units clear; the lift and accents may use some)
        }
      }
      p2 = p1; p1 = p; l2 = l1; l1 = look.clone();
    }
    out.end = camera.position.toArray();
    return JSON.stringify(out); })()`));
  const a = sim(60), b = sim(30);
  const tag = `${w}x${h} ${JSON.stringify(a)}`;
  assert(a.el[0] > 20 && a.el[1] < 34, `${tag}: a low view over the crowd (about 26 deg, swaying a few degrees, never a helicopter)`);
  assert(a.dist[1] / a.dist[0] < 1.2, `${tag}: turning only eases the distance (her apparent size)`);
  assert(a.maxAcc < 4 && a.maxLookAcc < 1.5, `${tag}: no jerks`);
  assert(a.outside <= 0, `${tag}: her silhouette stays on the screen on every frame (no side, and the head only touches the top in a wild jump)`);
  assert(a.firstStep < 0.2, `${tag}: play starts by gliding on from the title camera`);
  assert(Math.hypot(...a.end.map((x, i) => x - b.end[i])) < 0.05, `${tag}: the same path at 30 fps (${b.end})`);
}
run(`var drift0 = { ...DRIFT }; DRIFT.az = DRIFT.el = DRIFT.dist = DRIFT.follow = 0; // (the slow sway aside: checked below)
  for (let i = 0; i < 1500; i++) { clock += 1 / 60; animMula(1 / 60, beatAt(songNow)); framePlayCamera(1 / 60, M.pos.x, M.pos.y); }
  var camBefore = camera.position.clone(); for (let i = 0; i < 20; i++) { act(i % 2 ? 'L' : 'B'); clock += 1 / 60; animMula(1 / 60, beatAt(songNow)); framePlayCamera(1 / 60, M.pos.x, M.pos.y); }`);
assert(run('camera.position.distanceTo(camBefore) < 0.05'), 'taps and accents do not move the camera');
run('Object.assign(DRIFT, drift0)');
// The breath: left alone for 8 s the play camera drifts a little round her (the plaça glides behind her, she stays
// framed: checked every frame above), slowly; reduced motion keeps it still.
for (const calm of [false, true]) {
  const moved = run(`CALM.matches = ${calm}; for (let i = 0; i < 600; i++) { clock += 1 / 60; framePlayCamera(1 / 60, M.pos.x, M.pos.y); }
    (() => { const p0 = camera.position.clone(); let most = 0; for (let i = 0; i < 480; i++) { clock += 1 / 60; framePlayCamera(1 / 60, M.pos.x, M.pos.y); most = Math.max(most, camera.position.distanceTo(p0)); } return most; })()`);
  if (calm) assert(moved < 0.02, `reduced motion: no breath (${moved.toFixed(3)} m)`);
  else assert(moved > 0.1 && moved < 3, `the camera sways, gently (${moved.toFixed(2)} m over 8 s)`);
}
run('CALM.matches = false');
context.innerWidth = 1280; context.innerHeight = 720; run('COARSE.matches = false; resize(); toTitle();');
console.log('play camera smoothness ok');

// 120 fps must look like 60, only smoother: particles move by real time, not per frame (framePacer runs 120 Hz screens
// at their full rate when they keep up).
run(`var fwGap = (() => {
  sparks.forEach(s => { s.life = 0; }); firework(0, 10, 0, 700); // only this burst
  const s0 = sparks.map(s => [s.p.clone(), s.v.clone(), s.life]);
  const sim = n => { sparks.forEach((s, i) => { s.p.copy(s0[i][0]); s.v.copy(s0[i][1]); s.life = s0[i][2]; }); for (let k = 0; k < n; k++) animFireworks(0.8 / n); return sparks.map(s => s.p.clone()); };
  const a = sim(48), b = sim(96);
  return s0.reduce((m, s, i) => s[2] > 0.85 ? Math.max(m, a[i].distanceTo(b[i])) : m, 0);
})()`);
assert(run('fwGap') < 0.05, `fireworks fly the same at 60 and 120 fps (${run('fwGap').toFixed(3)} m apart)`);
// «Mostra els FPS»: off by default; the ⚙ switch shows it and remembers it; just the number, ~4 updates a second,
// on the title, selector and in play; a ~30 Hz display (iOS Low Power Mode) gets a short hint.
{
  const saved = {};
  context.localStorage = { getItem: k => saved[k] ?? null, setItem: (k, v) => { saved[k] = String(v); } };
  const fps = nodes.get('fps'), sw = nodes.get('settings-fps');
  let raised = 0, lowered = 0;
  fps.showPopover = () => raised++;
  fps.hidePopover = () => lowered++;
  run(`G.state = 'title'; fpsTick(0);`);
  assert(fps.hidden && !sw.checked, 'FPS readout off by default');
  sw.checked = true; sw.listeners.change();
  assert.equal(saved.fps, 'on', 'the switch is remembered');
  run('for (let i = 0; i <= 45; i++) fpsTick(1000 + i * 1000 / 60);');
  assert(!fps.hidden && fps.textContent === '60 FPS' && fps.dataset.l === 'ok', `a plain number (${fps.textContent})`);
  assert.equal(raised, 1, 'FPS enter the top layer once, not every frame');
  for (const fn of windowHandlers.toggle || []) fn({ target: { tagName: 'DIALOG' } });
  run('fpsTick(1760);');
  assert.equal(raised, 2, 'opening a dialog raises FPS above its backdrop');
  assert.equal(lowered, 1, 'reorder the existing readout instead of creating a duplicate');
  run('for (let i = 46; i <= 60; i++) fpsTick(1000 + i * 1000 / 60);'); // an 8th of a second more: not redrawn yet
  run(`pace.lowPower = true; pace.fps = 30; for (let i = 1; i <= 30; i++) fpsTick(2000 + i * 1000 / 30);`);
  assert.equal(fps.textContent, '30 FPS\nmode d’estalvi?', 'Low Power Mode hint at ~30 Hz');
  run(`pace.lowPower = false; pace.fps = 120; for (let i = 1; i <= 60; i++) fpsTick(3000 + i * 1000 / 60);`);
  assert(fps.textContent === '60 FPS' && fps.dataset.l === 'low', '60 of a 120 target reads red');
  run(`G.state = 'select'; pace.fps = 60; for (let i = 1; i <= 60; i++) fpsTick(4000 + i * 1000 / 60);`);
  assert(!fps.hidden && fps.textContent === '60 FPS', 'remembered FPS remain visible on the character selector');
  assert.equal(fps.style.top, `${8 + run('SAFE.t')}px`, 'selector FPS own a fixed top rail');
  assert.equal(fps.style.bottom, 'auto', 'selector FPS never anchor to the changing action row');
  run(`G.state = 'play'; fpsTick(6200);`);
  assert.equal(fps.style.top, 'auto', 'playing restores the original pad-relative placement');
  assert(!fps.hidden, 'FPS remain visible during a run');
  run(`G.state = 'results'; fpsTick(6500);`);
  assert(fps.hidden, 'hidden on the results screen (its buttons own the bottom)');
  assert.equal(lowered, 2, 'results also remove FPS from the top layer');
  sw.checked = false; sw.listeners.change(); run(`G.state = 'title'; pace.fps = 60; fpsTick(6800);`);
  assert(fps.hidden && saved.fps === 'off', 'switched off: gone and remembered');
  delete fps.showPopover; delete fps.hidePopover;
}
console.log('frame-rate independence and FPS readout ok');

// Title camera steering (src/scene/orbit.js): a drag on empty canvas turns the view and never picks a difficulty; a press
// on a canvas button still picks it; nothing steers outside the title or with a sheet up.
{
  const hud = nodes.get('hud'), k = run('K'), up = id => (windowHandlers.pointerup || []).forEach(h => h({ pointerId: id }));
  const ev = (id, x, y, more = {}) => ({ pointerId: id, clientX: x * k, clientY: y * k, pointerType: 'touch', button: 0, preventDefault() {}, ...more });
  run(`var picked = [], realChoose = choose; choose = i => picked.push(i); G.state = 'title'; orbitCancel(orbit);
    buttons = [{ x: 100, y: 200, w: 60, h: 30, i: 1 }];`);
  const yaw0 = run('orbit.yaw');
  hud.listeners.pointerdown(ev(1, 20, 60));
  for (let x = 20; x <= 140; x += 10) hud.listeners.pointermove(ev(1, x, 60 + x)); // across the button, too
  up(1);
  assert(run('picked.length === 0 && orbit.ptrs.size === 0'), 'a drag never picks a difficulty, even ending on a button');
  assert(run(`orbit.yaw`) !== yaw0, 'the drag turned the view');
  hud.listeners.pointerdown(ev(2, 120, 210)); up(2);
  assert(run('G.state === "select" && picked.length === 0 && orbit.ptrs.size === 0'), 'JUGA opens character selection before choosing a level');
  run("G.state = 'title';");
  run('picked.length = 0; settingsMenu.open = true;');
  hud.listeners.pointerdown(ev(3, 20, 60));
  assert(run('orbit.ptrs.size === 0'), 'no steering with a sheet up');
  const zoom = run('orbit.zoomTo');
  hud.listeners.wheel(ev(0, 0, 0, { deltaY: 100, deltaMode: 0, ctrlKey: false }));
  assert.equal(run('orbit.zoomTo'), zoom, 'no wheel zoom with a sheet up');
  run('settingsMenu.open = false;');
  let prevented = false;
  hud.listeners.wheel(ev(0, 0, 0, { deltaY: 100, deltaMode: 0, ctrlKey: true, preventDefault() { prevented = true; } }));
  assert(prevented && run('orbit.zoomTo') > zoom, 'the wheel / trackpad pinch backs off, never zooming the page');
  { // the selector: the camera is the showreel's (Marc, 2026-10-23): no drag turns it, no wheel or pinch zooms it, and the page never zooms
    run("G.state = 'select'; setView(false); orbitCancel(orbit);");
    const y = run('orbit.yaw'), z = run('orbit.zoomTo'); let kept = false;
    hud.listeners.pointerdown(ev(6, 20, 60)); for (let x = 20; x <= 140; x += 10) hud.listeners.pointermove(ev(6, x, 60)); up(6);
    hud.listeners.wheel(ev(0, 0, 0, { deltaY: 100, deltaMode: 0, ctrlKey: true, preventDefault() { kept = true; } }));
    assert(run('orbit.ptrs.size === 0') && run('orbit.yaw') === y && run('orbit.zoomTo') === z && kept, 'selector: no drag, no zoom, no page zoom');
    run("G.state = 'title';");
  }
  for (const state of ['play', 'results']) {
    run(`G.state = '${state}'; G.resT = clock; G.paused = false;`);
    const z = run('orbit.zoomTo');
    hud.listeners.pointerdown(ev(4, 20, 60));
    hud.listeners.pointermove(ev(4, 90, 90));
    hud.listeners.wheel(ev(0, 0, 0, { deltaY: 100, deltaMode: 0, ctrlKey: false }));
    assert(run('orbit.ptrs.size === 0') && run('orbit.zoomTo') === z, `${state}: no steering`);
    up(4);
  }
  // the splash: a tap anywhere or any key goes in (the gesture that starts the audio)
  const keyDown = code => keyHandlers.forEach(h => h({ code, target: { tagName: 'BODY' }, preventDefault() {} }));
  run(`if (chip) chip.wake ??= () => {}; var unlocks = 0, realUnlock = unlock; unlock = () => unlocks++; G.state = 'splash'; orbitCancel(orbit); buttons = [];`);
  hud.listeners.pointerdown(ev(5, 20, 60)); up(5);
  assert.equal(run('unlocks'), 1, 'splash: a tap anywhere goes in');
  keyDown('KeyA'); keyDown('Space');
  assert.equal(run('unlocks'), 3, 'splash: any key goes in');
  run(`unlock = realUnlock; choose = realChoose; G.state = 'title'; buttons = [];`);
}
console.log('title camera steering ok');
// A slow frame (a stall, a shader compile) never throws away a drag: the menu camera takes the current camera over only after another
// camera ran (cameras.js easeLensX), not after a gap in time.
{
  let tt = 300000; const f = ms => run(`performance.now = () => ${tt += ms}; frame(${tt})`);
  run(`G.state = 'title'; buttons = []; orbitCancel(orbit);`); f(16); f(16);
  run(`orbitDown(orbit, 9, 100, 100, pnow()); orbitMove(orbit, 9, 160, 100, pnow()); orbitMove(orbit, 9, 260, 100, pnow());`);
  const held = run('orbit.yaw'); f(16); f(300); f(16);
  assert(Math.abs(run('orbit.yaw') - held) < 1e-9 && run('orbit.ptrs.size') === 1, `a 300 ms frame keeps the held drag (${held.toFixed(3)} -> ${run('orbit.yaw').toFixed(3)})`);
  run('orbitCancel(orbit); performance.now = () => 0;');
}
console.log('menu camera keeps a drag through a slow frame ok');

// «Mode foto» (#viewmode, selector only): every control, tip and the HUD go (inert, the body class fades them), the camera
// still steers, a tap or a key picks nothing, no sheet opens; Escape or the same button (H does nothing) bring it all back.
{
  const btn = nodes.get('viewmode'), hud = nodes.get('hud'), k = run('K'), cls = new Set(), attrs = {}, idle = new Set();
  const bodyCl = document.body.classList;
  document.body.classList = { contains: c => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } };
  btn.setAttribute = (a, v) => { attrs[a] = v; };
  btn.classList = { add: c => idle.add(c), remove: c => idle.delete(c), toggle() {} };
  let focused = null; btn.focus = () => { focused = btn; };
  const HIDES = ['settings', 'feedback', 'music', 'howto', 'fps', 'feedback-nudge'];
  const keyDown = code => keyHandlers.forEach(h => h({ code, target: { tagName: 'BODY' }, preventDefault() {} }));
  const up = id => (windowHandlers.pointerup || []).forEach(h => h({ pointerId: id }));
  const ev = (id, x, y) => ({ pointerId: id, clientX: x * k, clientY: y * k, pointerType: 'touch', button: 0, preventDefault() {} });
  const tapTwice = () => { for (const id of [90, 91]) { hud.listeners.pointerdown(ev(id, 20, 160)); hud.listeners.pointerup?.(ev(id, 20, 160)); up(id); } };
  let t = 20000; const frames = n => { for (let i = 0; i < n; i++) run(`frame(${t += 1000 / 60})`); };
  run(`var picked = [], realChoose = choose; choose = i => picked.push(i); G.state = 'title'; G.sel = 0; orbitCancel(orbit); updateControls(); if (chip && !chip.wake) chip.wake = () => {};`);
  assert.equal(btn.hidden, true, 'no eye on the title');
  keyDown('KeyH'); tapTwice();
  assert(!run('viewMode'), 'H and two world taps do nothing outside the selector');
  frames(3);
  assert(hudWork.ops > 0, 'the title draws its HUD');
  for (const state of ['play', 'results']) { run(`G.state = '${state}'; G.paused = false; G.resT = clock; updateControls();`); assert(btn.hidden, `no eye during ${state}`); }
  run(`G.state = 'select'; sheets.select.figure = selectedFigure; sheets.select.pending = false; updateControls();`);
  assert(btn.hidden, 'the selector enters free play from its dock: no eye in its corner');
  keyDown('KeyH'); assert(!run('viewMode'), 'H does not enter free play');
  run('setView(true)');
  assert(run('viewMode') && nodes.get('select').inert, 'free play hides and disables selector controls');
  keyDown('Escape');
  assert(run('viewMode && !PHOTO.on'), 'first Escape drops control of the selected figure');
  keyDown('Escape');
  assert(!run('viewMode') && !nodes.get('select').inert && run("G.state === 'select'"), 'Escape restores the same selector state');
  const tapWorld = id => { hud.listeners.pointerdown(ev(id, 20, 160)); hud.listeners.pointerup?.(ev(id, 20, 160)); up(id); };
  tapWorld(21); tapWorld(22);
  assert(!run('viewMode'), 'two still world taps no longer open the old photo mode');
  assert(run("G.state === 'select' && picked.length === 0"), 'world taps never start a game');
  run(`choose = realChoose; G.state = 'title'; buttons = []; orbitCancel(orbit); updateControls();`);
  document.body.classList = bodyCl;
}
console.log('view mode ok');

// Canvas roundRect polyfill (src/platform/polyfills.js, Safari 15 / Chrome < 99): number or 1–4 radii, radii that don't fit shrink.
{
  const { roundRect } = await import('../src/platform/polyfills.js');
  const path = () => { const ops = []; return { ops, moveTo: (...a) => ops.push(['M', ...a]), arcTo: (...a) => ops.push(['A', ...a]), closePath: () => ops.push(['Z']) }; };
  const radii = r => { const p = path(); roundRect.call(p, 0, 0, 100, 40, r); return p.ops.filter(o => o[0] === 'A').map(o => +o[5].toFixed(3)); };
  assert.deepEqual(radii(8), [8, 8, 8, 8], 'one number: every corner (tr, br, bl, tl)');
  assert.deepEqual(radii([8]), [8, 8, 8, 8], 'an array of one');
  assert.deepEqual(radii([0, 6, 6, 0]), [6, 6, 0, 0], 'four radii in CSS order tl, tr, br, bl');
  assert.deepEqual(radii([2, 5]), [5, 2, 5, 2], 'two radii: tl/br and tr/bl');
  assert.deepEqual(radii(40), [20, 20, 20, 20], 'a pill: radii larger than half the height shrink to fit');
  assert.deepEqual(radii(), [0, 0, 0, 0], 'no radius: square corners');
  const p = path(); roundRect.call(p, 10, 20, 30, 40, 5);
  assert.deepEqual(p.ops[0], ['M', 15, 20], 'starts after the top-left corner');
  assert.deepEqual(p.ops.at(-1), ['M', 10, 20], 'a new subpath at (x, y) afterwards, like the native one');
  console.log('canvas roundRect polyfill ok');
}

{ // the drawn song clock: the audio clock only moves in whole render buffers (256 samples at 48 kHz = 5.33 ms, 1024 on
  // some phones); the frames must still advance evenly, stay with the audio and never run backwards
  const run = (hz, block, frames = 1200, rate = 1, jitter = 0) => {
    const view = smoothClock(), q = block / 48000, steps = [], drift = [];
    let prev = null, audioReal = 10, now = 0, last = 0;
    for (let i = 0; i < frames; i++) {
      const dt = 1 / hz + (jitter ? (i % 7 - 3) * jitter : 0);
      now += dt; audioReal += dt * rate;
      const audio = Math.floor(audioReal / q) * q; // what ctx.currentTime reads: the last rendered buffer
      const v = view(audio, now - last); last = now;
      if (prev != null) steps.push({ step: v - prev, dt });
      drift.push(v - audio);
      prev = v;
    }
    return { steps: steps.slice(120), drift: drift.slice(120), all: steps };
  };
  for (const [hz, block] of [[60, 256], [120, 256], [60, 1024], [144, 128], [90, 441]]) {
    const { steps, drift, all } = run(hz, block);
    assert(all.every(s => s.step >= 0), `${hz} Hz/${block}: monotonic`);
    const worst = Math.max(...steps.map(s => Math.abs(s.step - s.dt)));
    assert(worst < 0.001, `${hz} Hz/${block}: every frame advances by its real time (±1 ms), got ±${(worst * 1000).toFixed(2)} ms`);
    const raw = 1 / hz % (block / 48000);
    if (raw > 1e-4) assert(worst < raw / 3, `${hz} Hz/${block}: much smoother than the raw buffer steps`);
    assert(Math.max(...drift.map(Math.abs)) <= block / 48000 + 0.002, `${hz} Hz/${block}: within about a buffer of the audio clock`);
  }
  // uneven frame times (a busy phone) and an audio clock 0.2% off the frame clock: still bounded, still monotonic
  { const { drift, all } = run(60, 1024, 3000, 1.002, 0.002);
    assert(all.every(s => s.step >= 0), 'jittery frames: monotonic');
    assert(Math.max(...drift.map(Math.abs)) < 0.03, 'a drifting audio clock is followed (bounded)'); }
  // a jump (new song, seek, restart) is taken at once; dt = 0 (paused) holds it; a long stall re-syncs
  const view = smoothClock();
  view(5, 0.016); for (let i = 0; i < 30; i++) view(5 + i * 0.016, 0.016);
  assert.equal(view(40, 0.016), 40, 'a seek snaps');
  assert.equal(view(-3, 0.016), -3, 'a restart (backwards) snaps');
  const held = view(-2.99, 0.016);
  assert.equal(view(-2.99, 0), held, 'paused: holds');
  assert.equal(view(-2.99, 0), held, 'paused: still holds');
  assert.equal(view(7, 1), 7, 'after a stall (hidden tab) it takes the audio clock');
  // it never runs more than 30 ms ahead of an audio clock that stops (the song ended, the context suspended)
  let v = 0; for (let i = 0; i < 60; i++) v = view(7.05, 0.016);
  assert(v <= 7.05 + 0.03 + 1e-9, 'never far ahead of a stopped audio clock');
  // main.js draws the lane through it on top of the de-stepped audio clock (already smooth): identical while the audio
  // runs evenly, but a jump of the audio device itself (+4.3 ms measured on a Mac; ~27 ms in a rare glitch) is eased
  // in instead of popping every note (at 889 px/s, 4.3 ms = 3.8 px in one frame)
  for (const jump of [0.0043, 0.0267]) {
    const ease = smoothClock(); let a = 20, prevV = ease(a, 0), worst = 0, same = 0;
    for (let i = 1; i < 120; i++) {
      a += 1 / 60 + (i === 60 ? jump : 0);
      const v2 = ease(a, 1 / 60);
      if (i < 60) same = Math.max(same, Math.abs(v2 - a));
      worst = Math.max(worst, Math.abs(v2 - prevV - 1 / 60)); prevV = v2;
    }
    assert(same < 1e-9, 'an even audio clock is drawn as is');
    assert(worst < jump / 8, `a ${jump * 1000} ms jump of the audio device: at most ${(worst * 1000).toFixed(2)} ms extra in one frame`);
    assert(Math.abs(prevV - a) < jump / 4, 'and it is caught up within a second');
  }

  // The de-stepped song clock (audio.js audioClock) that draws, judges and calibrates: ctx.currentTime moves per
  // rendered buffer (each callback up to 0.5 ms late), rAF callbacks land ±1 ms off the refresh and read the clock up
  // to 2 ms into the frame; the audio clock may run ±50 ppm off the system's. `A` is the true audio time.
  const { audioClock, Chip } = await import('../src/platform/audio.js');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P0 = 5000; // performance.now() at t = 0
  const fakeCtx = (block, rate = 1) => {
    const q = block / 48000, late = k => (k * 7919 % 101) / 101 * 0.0005;
    return { t: 0, A: 3.2, state: 'running', stall: false, outputLatency: 0.012,
      go(dt) { this.t += dt; if (this.state === 'running' && !this.stall) this.A += dt * rate; },
      get currentTime() { const k = Math.floor(this.A / q + 1e-9); return (this.A - k * q < late(k) ? k - 1 : k) * q; } };
  };
  const clockFor = ctx => audioClock(ctx, { perf: () => P0 + ctx.t * 1000 });
  const frames = (ctx, clock, hz, secs, each) => { // rAF frames: the estimate at the frame's time vs the true audio time
    const t0 = ctx.t, out = [];
    for (let i = 1; i <= secs * hz; i++) {
      const at = t0 + i / hz + (rnd() - 0.5) * 0.002;
      each?.(ctx.t - t0);
      ctx.go(at - ctx.t); const truth = ctx.A;
      ctx.go(rnd() * 0.002);
      out.push({ t: at - t0, est: clock.at(P0 + at * 1000), truth, raw: ctx.currentTime });
    }
    return out;
  };
  const worst = (fs, from = 1) => Math.max(...fs.filter(f => f.t > from).map(f => Math.abs(f.est - f.truth)));
  const monotonic = fs => fs.every((f, i) => !i || f.est > fs[i - 1].est);
  for (const block of [256, 1024, 2048]) for (const hz of [60, 144]) for (const rate of [1, 1.00005, 0.99995]) {
    const ctx = fakeCtx(block, rate), fs = frames(ctx, clockFor(ctx), hz, 12), name = `${block} samples, ${hz} Hz, ×${rate}`;
    assert(worst(fs) < 0.001, `${name}: within 1 ms of the true audio time, got ${(worst(fs) * 1000).toFixed(2)} ms`);
    assert(monotonic(fs), `${name}: monotonic`);
    const raw = Math.max(...fs.map(f => f.truth - f.raw));
    assert(raw > block / 48000 * 0.8, `${name}: the raw clock really was stepped (${(raw * 1000).toFixed(1)} ms behind)`);
  }
  { // a new run (Chip.start: song start, seek, restart) snaps at once and settles within a second
    const ctx = fakeCtx(1024), chip = Object.assign(Object.create(Chip.prototype), { ctx, t0: 0 });
    chip._clock = clockFor(ctx);
    frames(ctx, chip.clock, 60, 3);
    chip.t0 = ctx.currentTime + 3 - 40; chip.clock.run(); // `from` 40 s, 3 s of count-in
    const first = chip.now(P0 + ctx.t * 1000);
    assert(Math.abs(first - (40 - 3 - 0.012)) < 1e-9, 'a seek snaps: the song position at once');
    const fs = frames(ctx, chip.clock, 60, 3);
    assert(worst(fs) < 0.001 && monotonic(fs), 'and settles within a second, monotonic');
  }
  { // pause: the context is suspended (its clock stops, performance.now doesn't); resuming takes the device 30 ms
    const ctx = fakeCtx(2048), clock = clockFor(ctx);
    frames(ctx, clock, 60, 2);
    ctx.state = 'suspended';
    const paused = frames(ctx, clock, 60, 3);
    assert(paused.every(f => f.est === paused[0].est && f.est === ctx.currentTime), 'suspended: the held audio clock, not running on');
    ctx.state = 'running'; ctx.stall = true;
    const waking = frames(ctx, clock, 60, 0.03);
    assert(waking.every(f => f.est === paused[0].est), 'resumed, the device not yet started: still held');
    ctx.stall = false;
    const fs = frames(ctx, clock, 60, 3);
    assert(fs.every(f => f.est - f.truth < 0.001), 'never ahead of the resumed audio clock (re-anchored)');
    assert(worst(fs) < 0.001 && monotonic(fs), 'resumed: within 1 ms after a second, monotonic');
  }
  { // audio stalls while running (an underrun): a long one re-anchors; a short one sinks back within a few seconds
    for (const [ms, settle] of [[200, 1], [20, 4]]) {
      const ctx = fakeCtx(1024), clock = clockFor(ctx);
      frames(ctx, clock, 60, 3);
      ctx.stall = true; const during = frames(ctx, clock, 60, ms / 1000); ctx.stall = false;
      const fs = frames(ctx, clock, 60, 6);
      assert(Math.max(...during.concat(fs).map(f => f.est - f.truth)) < 0.052, `${ms} ms stall: never far ahead`);
      assert(worst(fs, settle) < 0.001, `${ms} ms stall: back within 1 ms after ${settle} s`);
      if (ms < 50) assert(monotonic(during.concat(fs)), `${ms} ms stall: still monotonic`);
    }
  }
  { // the output latency is latched per run: the median of its first 0.5 s
    const ctx = fakeCtx(256), clock = clockFor(ctx), wobble = [0.02, 0.031, 0.019, 0.022, 0.05, 0.021];
    let i = 0;
    frames(ctx, clock, 60, 0.5, () => { ctx.outputLatency = wobble[i++ % wobble.length]; clock.latency(); });
    const latched = clock.latency();
    assert(latched >= 0.02 && latched <= 0.022, `the median, not a spike (${latched})`);
    ctx.outputLatency = 0.2; frames(ctx, clock, 60, 1, () => clock.latency());
    assert.equal(clock.latency(), latched, 'then fixed for the run');
    clock.run(); frames(ctx, clock, 60, 0.6, () => clock.latency());
    assert.equal(clock.latency(), 0.2, 'a new run latches again');
  }
  { // a tap at a known event time, with the audio clock in 1024-sample steps, is judged within 1 ms of the truth
    const main = source => vm.runInContext(source, context); // (`run` is the smooth clock's helper here)
    const ctx = fakeCtx(1024), chip = Object.assign(Object.create(Chip.prototype), { ctx, t0: 1, sfx() {} });
    chip._clock = clockFor(ctx);
    context.fakePerf = () => P0 + ctx.t * 1000;
    context.testChip = chip;
    main('performance.now = () => fakePerf(); chip = testChip; offsetMs = 0;');
    frames(ctx, chip.clock, 60, 2);
    const at = P0 + ctx.t * 1000 - 8, truth = ctx.A - 0.008 - chip.t0 - 0.012; // the event happened 8 ms ago
    assert(Math.abs(main(`songTime(eventAt({ timeStamp: ${at} }))`) - truth) < 0.001, 'the tap reads the song clock at its timeStamp, within 1 ms');
    main(`Object.assign(G, { state: 'play', paused: false, collapseT: 0, practice: null, diff: 2, next: 0, streak: 0, combo: 0, energy: 1,
      counts: { perfect: 0, good: 0, miss: 0 }, errors: { early: 0, late: 0, move: 0, silent: 0, both: 0, hold: 0 }, score: 0, maxCombo: 0 });
      G.balloons = []; bigPending = null; G.hold = null; WIN = WINDOWS[2];
      var edgeIn = { t: ${truth - 0.034}, input: 'L', phrase: 0, hit: null }, edgeOut = { t: ${truth - 0.036}, input: 'R', phrase: 0, hit: null };
      G.chart = [edgeIn]; press('L', { timeStamp: ${at} }); G.chart = [edgeOut]; G.next = 0; press('R', { timeStamp: ${at} });`);
    assert.equal(main('edgeIn.hit'), 'perfect', 'DIFÍCIL: 34 ms late is PERFECTE');
    assert.equal(main('edgeOut.hit'), 'good', 'DIFÍCIL: 36 ms late is BÉ');
    main('performance.now = () => 0');
  }
  console.log('smooth song clock ok');
}

// The real downgrade callback still updates the scene and resolution, but cannot poison the next page load.
{
  const saved = { 'render-quality': '{"level":-1}', 'leaderboard-alias': 'kept', 'menu-music': '1' };
  const writes = [];
  context.localStorage = { getItem: k => saved[k] ?? null, setItem: (k, v) => writes.push([k, v]), removeItem: k => writes.push([k]) };
  run(`G.state = 'title'; G.paused = false; chip = null;
    qualityLevel = 1; applyRenderQuality(); devicePixelRatio = 3;
    var qualityCompiles = 0, qualityDpr = 0;
    renderer.compileAsync = () => { qualityCompiles++; return Promise.resolve(); };
    renderer.setPixelRatio = dpr => { qualityDpr = dpr; };
    for (let i = 0; i < 400; i++) monitorFrames(1000 / 20, 10, pace, false);`);
  assert.equal(run('qualityLevel'), -1, 'slow frames reach the minimal floor');
  assert.equal(run('renderProfile.name'), 'minimal', 'the scene profile follows the downgrade');
  assert.equal(run('qualityDpr'), run('renderDpr(renderProfile, sizedW, sizedH, devicePixelRatio)'), 'resize applies the lower DPR');
  assert(run('qualityCompiles > 0'), 'the downgraded scene is precompiled');
  assert.deepEqual(writes, [], 'adaptive drops do not write or clear stored preferences');
  const rendererBefore = run('renderer');
  document.hidden = true;
  document.listeners.visibilitychange?.();
  document.hidden = false;
  document.listeners.visibilitychange?.();
  for (const h of windowHandlers.pageshow || []) h({ persisted: true });
  assert.equal(run('qualityLevel'), -1, 'visibility and BFCache resume retain the session level');
  assert.equal(run('renderer'), rendererBefore, 'resume does not recreate the WebGL context');
  context.localStorage = new Proxy({}, { get() { throw new Error('storage blocked'); } });
  run('qualityLevel = 1; for (let i = 0; i < 400; i++) monitorFrames(1000 / 20, 10, pace, false);');
  assert.equal(run('qualityLevel'), -1, 'adaptation also works with blocked storage');
  console.log('session-only quality recovery ok');
}

// The canvas follows the figure's buttons: the note colours change in place and the Mulassa's come back untouched.
{
  run('setFigureSong(DRAC)');
  assert.deepEqual(run('JSON.stringify([DIRC.L, DIRC.R, DIRLT.L, DIRDK.R, trf("hit.both")])'), JSON.stringify(['#ffc21f', '#b0188c', '#ffe38a', '#66084f', 'CREMA!']));
  // Wheels celebrate only the 50/100 combo milestones, for 1.2 s; other confetti requests stay silent.
  // Earlier clock tests rewind rAF time. Bring particle time forward before these isolated effect checks.
  run("G.state = 'play'; G.practice = null; G.collapseT = 0; animMula(0, 0, 1); dracFrame(Math.max(0, 1 - dracFx.state().t), 0); for (let i = 0; i < 400; i++) { animConfetti(0.05); dracFrame(0.05, 0); } var confBefore = conf.map(c => c.p.y).join();");
  for (const combo of [25, 50, 75, 100, 150]) {
    run(`G.combo = ${combo}; burst(0, 0, 'combo'); dracFrame(1 / 60, 0);`);
    assert.equal(run('dracFx.state().wheels > 0'), combo === 50 || combo === 100, `wheels at combo ${combo}`);
    run('for (let i = 0; i < 80; i++) dracFrame(1 / 60, 0);');
    assert.equal(run('dracFx.state().wheels'), 0, 'wheels stop after 1.2 s');
  }
  run('burst(0, 0); spawnConfetti(50, c => c.p.set(0, 5, 0)); animConfetti(0.01); dracFrame(1 / 60, 0);');
  assert(run('conf.map(c => c.p.y).join() === confBefore && dracFx.state().wheels === 0'), 'no confetti or continuous wheels from other effects');
  // picked on the selector it wanders and shows off from where it stood, burning now and then; a game puts it back on its spot
  run(`G.state = 'select'; var selectorSounds = []; chip = { sfx: k => selectorSounds.push(k) }; var soloFar = 0, soloCrema = false; for (let i = 0; i < 60 * 40; i++) { clock += 1 / 60; animMula(1 / 60, clock / BEAT);
    soloFar = Math.max(soloFar, M.pos.length()); if (SHOWCASE.crema) soloCrema = true; dracFrame(1 / 60, 0); }`);
  assert(run('drac.root.visible && soloFar > 1 && soloFar < 4 && soloCrema && Math.abs(drac.root.parent.position.x - M.pos.x) < 1e-9'), `the selector's Drac walks about (up to ${run('soloFar.toFixed(1)')} m) and burns`);
  assert.equal(run('selectorSounds.length'), 0, 'selector demo keeps its flames visual without requesting figure SFX');
  run(`chip = { resume() {}, stop() {}, menu() {}, sfx() {}, t0: null, buf: {},
    start: () => Promise.resolve(false) }; startGame(1); frames(1);`);
  // in the game it dances in its dance frame (drac-layout.js placeDance): the helpers' centre on the plaça's, turned to DRAC_YAW
  assert(run('drac.root.parent.position.distanceTo(placeDance(new THREE.Object3D(), DRAC_YAW).position) < 1e-9 && drac.root.parent.rotation.y === DRAC_YAW'), 'in the game it dances on its own spot');
  // the colla claps with it, and freezes with it: a pause and its resume count-in keep the helpers' arms where they were
  // (the count-in's beat runs on the restarted clock while the Drac waits on its frozen beat)
  run(`var armPose = () => JSON.stringify(colla.crew.map(c => c.bones.map(b => b.rotation.toArray().slice(0, 3).map(v => +v.toFixed(6)))));
    G.paused = false; G.collapseT = 0; for (let i = 0; i < 240; i++) animMula(1 / 60, 20.3, 1); /* its eased energy at full */ var armsAt = armPose(); G.paused = true; G.resuming = 1e9;
    for (let i = 0; i < 30; i++) animMula(1 / 60, 20.3 + i * 0.1, 1); var armsPaused = armPose(); G.paused = false; G.resuming = null;`);
  assert(run('colla.helpers.visible && armsPaused === armsAt'), 'the helpers freeze with the Drac through a pause and its resume count-in');
  // A real chart window closes through advance(), never from a target reached by pumping.
  run(`var tracaSounds = []; chip.sfx = k => tracaSounds.push(k); var originalTracas = G.balloons.slice();`);
  for (const ix of [0, 1]) {
    run(`var rollTest = { ...originalTracas[${ix}], hit: null, count: 0 }; G.chart = [rollTest]; G.balloons = [rollTest]; G.next = 0;
      G.hold = null; setBigPending(null); dracFrame(1 / 60, rollTest.t);
      for (let i = 0; i < rollTest.need * 2; i++) { rollTest.count++; dracPump(rollTest); }
      var troBefore = tracaSounds.filter(k => k === 'tro').length; advance(rollTest.end - 0.001);`);
    assert.equal(run("tracaSounds.filter(k => k === 'tro').length"), ix, 'targets reached before the end only crack');
    run('advance(rollTest.end); advance(rollTest.end + 0.01);');
    assert.equal(run("tracaSounds.filter(k => k === 'tro').length"), ix + 1, 'exactly one TRO on the closing beat');
  }
  run('toTitle(); dracFrame(1 / 60, 0);');
  // the last pass's red mist: the plaça's fog thickens and reddens while the dance is on, a menu clears it at once
  run(`G.state = 'play'; G.practice = null; G.collapseT = 0; var fog0 = [scene.fog.near, scene.fog.far, scene.fog.color.getHexString()];
    for (let i = 0; i < 60 * 12; i++) dracFrame(1 / 60, 1e6); var fogIn = [scene.fog.near, scene.fog.far, scene.fog.color.r - scene.fog.color.b];
    G.state = 'select'; dracFrame(1 / 60, 0); var fogOut = [scene.fog.near, scene.fog.far, scene.fog.color.getHexString(), scene.background.getHexString(), dracFx.flare];`);
  assert(run('fogIn[0] < 5 && fogIn[1] < 60 && fogIn[2] > 0.2'), `the dance's red mist closes in (${run('JSON.stringify(fogIn)')})`);
  assert(run('fogOut[0] === fog0[0] && fogOut[1] === fog0[1] && fogOut[2] === fog0[2] && fogOut[3] === fog0[2] && fogOut[4] === 0'), 'a menu clears it');
  // a pending figure on the selector hides both beasts, and the Drac's colla with them
  run(`G.state = 'select'; selectScreen.pending = true; frame(9e6); frame(9e6 + 17); var collaPending = colla.helpers.visible || colla.seated.visible; selectScreen.pending = false;`);
  assert(run('collaPending === false'), 'a pending figure hides the Drac\'s colla too');
  run('setFigureSong(MULASSA)');
  run('for (let i = 0; i < 400; i++) dracFrame(1 / 60, 0); burst(0, 0); animConfetti(0.01);');
  assert(run('confetti.visible && conf.some(c => c.p.y > 1) && dracFx.state().wheels === 0'), 'the Mulassa keeps her confetti');
  assert.deepEqual(run('JSON.stringify([DIRC.L, DIRC.R, DIRLT.L, DIRDK.R, C.gua, C.pa, trf("hit.both")])'), JSON.stringify(['#ff7a1a', '#14b8a6', '#ffb56b', '#0a6e63', '#ff7a1a', '#14b8a6', 'GUAPA!']));
  console.log('figure theme on the canvas ok');
}

// Manual photo walking owns neither the selected song nor the selector's stored difficulty.
{
  const photoKeyDown = (code, more = {}) => {
    let prevented = false;
    for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more });
    return prevented;
  };
  run(`if (chip) chip.wake = () => {}; setFigureSong(MULASSA); G.state = 'select'; sheets.select.figure = selectedFigure; sheets.select.pending = false; animMula(1/60, 0); M.pos.set(-3,0); M.pivot.set(-3, PIVOT); PAIR.w.x=3; PAIR.w.z=0; PAIR.x=3; PAIR.z=0; camera.position.set(0,6,10); camFocus.set(0,0,0); var photoCrowd=activeCrowd; activeCrowd=[]; setView(true); takeFigure(selectedFigure.id); animMula(1/60, 0);
    var photoSong = song, photoDiff = G.diff, photoStart = M.pos.clone();`);
  assert(run('PHOTO.on && PHOTO.pair && mula.root.visible && drac.root.visible'));
  photoKeyDown('KeyW');
  run(`for (let i=0;i<120;i++) { clock+=1/60; animMula(1/60, clock/BEAT); animCrowd(1/60, clock/BEAT, 0, 1); }`);
  assert(run('M.pos.distanceTo(photoStart) > 0.1'), 'W moves the Mulassa in free space');
  assert(photoKeyDown('Tab'), 'photo Tab consumed');
  assert(run("PHOTO.id === 'drac-valls' && PHOTO.keys.size === 0"));
  run('var photoDracStart = {x: PAIR.x, z: PAIR.z};');
  photoKeyDown('KeyD');
  run(`for (let i=0;i<120;i++) { clock+=1/60; animMula(1/60, clock/BEAT); animCrowd(1/60, clock/BEAT, 0, 1); }`);
  assert(run('Math.hypot(PAIR.x-photoDracStart.x, PAIR.z-photoDracStart.z)>0.1'), 'Tab controls the visible Drac');
  run("activeCrowd=photoCrowd;");
  windowHandlers.blur.forEach(h => h());
  assert(run('PHOTO.keys.size === 0 && PHOTO.drac.vx === 0'), 'blur releases locomotion');
  photoKeyDown('Escape'); run('animMula(1/60, clock/BEAT);');
  assert(run('!PHOTO.on && !PHOTO.ready && song === photoSong && G.diff === photoDiff'));
  assert(!photoKeyDown('Tab'), 'normal Tab untouched');
  run(`G.state='select'; setView(true); takeFigure(selectedFigure.id); animMula(1/60, clock/BEAT);`);
  photoKeyDown('Tab'); run('animMula(1/60, clock/BEAT);');
  assert(run("drac.root.visible && mula.root.visible && selectedFigure.id === 'mulassa-valls'"), 'selector keeps both figures while controlling Drac without changing selection');
  photoKeyDown('KeyA', { target: { tagName: 'TEXTAREA' } });
  assert(run('PHOTO.keys.size === 0'), 'text fields never steer');
  photoKeyDown('Escape'); photoKeyDown('Escape'); run('animMula(1/60, clock/BEAT);');
  assert(run('mula.root.visible && !drac.root.visible && song === photoSong && G.diff === photoDiff'), 'exit restores original selector figure and song');
  run(`setView(true); takeFigure(selectedFigure.id); animMula(1/60, clock/BEAT); G.state='play'; updateControls(); animMula(1/60, clock/BEAT);`);
  assert(run('!PHOTO.on && PHOTO.keys.size === 0'), 'game transition clears manual mode');
  run("G.state='select'; setView(false);");
  console.log('photo walking splash/selector, visible switching, blur and play isolation ok');
}

// Shift is owned by free control, and every transition that suspends input releases both sides.
{
  run('var shiftAudioContext = chip.ctx; chip.ctx = { suspend() {} };'); // focusin suspends the menu context
  const key = (code, more = {}) => { let prevented = false; for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more }); return prevented; };
  for (const [name, reset] of [
    ['blur', () => windowHandlers.blur.forEach(h => h())],
    ['visibility loss', () => document.listeners.visibilitychange()],
    ['pagehide', () => windowHandlers.pagehide.forEach(h => h())],
    ['focus control', () => windowHandlers.focusin.forEach(h => h({ target: { tagName: 'BUTTON' } }))],
    ['Escape', () => key('Escape')], ['Tab figure', () => key('Tab')],
    ['leave mode', () => run('setView(false);')],
    ['modal', () => run('settingsMenu.open=true; updateControls(); settingsMenu.open=false;')],
    ['game', () => run("G.state='play'; updateControls(); animMula(1/60,0);")],
  ]) {
    run("setView(false); G.state='select'; setFigureSong(MULASSA); setView(true); takeFigure('mulassa-valls');");
    assert(key('ShiftLeft') && key('ShiftRight') && key('KeyW'), `${name}: both modifiers accepted in the world`);
    reset();
    assert(run('!PHOTO.keys.size && PHOTO.mula.sprint===0 && PHOTO.drac.sprint===0'), `${name}: clears both Shift keys and sprint`);
    assert(!key('ShiftLeft', { repeat: true }) || run('!PHOTO.keys.has("ShiftLeft")'), 'a repeat cannot restore a released modifier');
  }
  run("G.state='select'; setView(true); takeFigure('drac-valls');");
  key('ShiftLeft'); key('ShiftRight'); key('KeyW');
  windowHandlers.keyup.forEach(h => h({ code: 'ShiftLeft' }));
  assert(run('!PHOTO.keys.has("ShiftLeft") && PHOTO.keys.has("ShiftRight") && PHOTO.keys.has("KeyW")'), 'keyup only releases its own Shift');
  windowHandlers.keyup.forEach(h => h({ code: 'ShiftRight' }));
  assert(run('!PHOTO.keys.has("ShiftRight") && PHOTO.keys.has("KeyW")'), 'releasing the last Shift keeps movement held');
  key('ShiftLeft'); const actor = run('PHOTO.id');
  assert(!key('Tab', { shiftKey: true }) && run('PHOTO.id') === actor && run('!PHOTO.keys.size'), 'ShiftTab navigates backwards without switching actor');
  run("setView(false); G.state='play';");
  assert(!key('ShiftLeft') && run('!PHOTO.keys.size'), 'game Shift is never a free control');
  run("G.state='select'; setFigureSong(MULASSA);");
  run('chip.ctx = shiftAudioContext;');
  console.log('free Shift reset on blur/visibility/focus/modal/Escape/figure/exit/play ok');
}

// The same scene pair on playable/pending selectors; photo controls never change the game's identity.
{
  for (const figure of ['MULASSA', 'DRAC']) for (const pending of [false, true]) {
    run(`setView(false); G.state='select'; setFigureSong(${figure}); selectScreen.pending=${pending};
      G.sel=2; G.diff=1; var pairSong=song, pairFigure=selectedFigure, pairCrowd=activeCrowd; activeCrowd=[];
      animMula(1/60,clock/BEAT); setView(true); animMula(1/60,clock/BEAT);`);
    assert(run('mula.root.visible && drac.root.visible && PAIR.k === 1'), `${figure}, pending=${pending}: free view shows both existing models`);
    for (const id of ['drac-valls', 'mulassa-valls', 'drac-valls']) {
      run(`takeFigure('${id}'); animMula(1/60,clock/BEAT); PHOTO.keys.add('KeyW');
        for(let i=0;i<12;i++){ clock+=1/60; animMula(1/60,clock/BEAT); }
        clearPhotoKeys();`);
      assert(run('mula.root.visible && drac.root.visible'), 'control changes keep both visible');
      assert(run('song===pairSong && selectedFigure===pairFigure && G.sel===2 && G.diff===1'), 'control never changes selection, song or difficulty');
      run("takeFigure(''); animMula(1/60,clock/BEAT);");
      assert(run('!PHOTO.on && PAIR.k===1'), 'Vista lliure keeps the pair');
    }
    run('setView(false); frame(clock*1000+17); activeCrowd=pairCrowd;');
    assert(run('!PHOTO.on && !PHOTO.ready && PAIR.k===0 && song===pairSong && selectedFigure===pairFigure && G.sel===2 && G.diff===1'), 'HUD return restores menu identity and releases control');
    assert(run(pending ? '!mula.root.visible && !drac.root.visible' : figure === 'DRAC' ? 'drac.root.visible && !mula.root.visible' : 'mula.root.visible && !drac.root.visible'), 'HUD return restores selected or pending visibility');
    run('selectScreen.pending=false;');
  }
  run('setFigureSong(MULASSA);');
  console.log('selector pair: both playable figures, pending, repeated controls/free view and intact HUD return ok');
}

// Mouse look while driving (src/ui/mouse-look.js): held RMB locks the pointer, the look reads movementX past any
// edge, and every way out (letting go, the browser's Escape, blur, Tab, a sheet, leaving) unlocks with no stray look.
// A mock lock: this proves the state machine, not a real hidden cursor (that is the browser QA).
{
  const hud = nodes.get('hud'), calls = { lock: 0, exit: 0, capture: [] };
  let answer = () => Promise.resolve();
  const change = () => document.listeners.pointerlockchange();
  hud.requestPointerLock = () => { calls.lock++; return answer(); };
  hud.setPointerCapture = id => calls.capture.push(id);
  document.exitPointerLock = () => { calls.exit++; if (document.pointerLockElement) { document.pointerLockElement = null; change(); } };
  const grant = () => { document.pointerLockElement = hud; change(); };
  const ev = (more = {}) => ({ pointerId: 7, pointerType: 'mouse', button: 2, buttons: 2, clientX: 5, clientY: 5, movementX: 0, movementY: 0, preventDefault() {}, ...more });
  const up = (more = {}) => (windowHandlers.mouseup || []).forEach(h => h(ev({ buttons: 0, ...more })));
  const key = code => { let prevented = false; for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; } }); return prevented; };
  run(`G.state = 'select'; setFigureSong(MULASSA); setView(false); setView(true); takeFigure('mulassa-valls'); PHOTO.cameraYaw = 0;`);
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev());
  assert(calls.lock === 1 && calls.capture.length === 0 && run('PHOTO.mouse === 2'), 'a right press asks for the lock, no capture');
  grant();
  hud.listeners.pointermove(ev({ buttons: 0, movementX: 190 })); // the lock's first move can jump (Firefox's own also says buttons 0): dropped
  run('updateControls();');
  assert(document.pointerLockElement === hud && run('PHOTO.mouse === 2 && PHOTO.cameraYaw === 0'), 'the lock survives its own first move');
  hud.listeners.pointermove(ev({ buttons: 3 })); assert(run('PHOTO.mouse === 3'), 'both buttons held while locked = run');
  hud.listeners.pointermove(ev({ buttons: 2 }));
  for (let i = 0; i < 40; i++) hud.listeners.pointermove(ev({ movementX: 150 })); // clientX stays put while locked
  assert(run('Math.abs(PHOTO.cameraYaw + 40 * 150 * 0.003) < 1e-9'), 'the look keeps turning on movementX, past where any cursor would stop');
  up();
  assert(!document.pointerLockElement && run('PHOTO.mouse === 0 && PHOTO.on'), 'letting go unlocks and ends the look');
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); grant(); hud.listeners.pointermove(ev()); // (the lock's first move)
  hud.listeners.pointermove(ev({ buttons: 0, movementX: 0 })); // Firefox's own still move while locked: no button, no motion
  assert(document.pointerLockElement === hud && run('PHOTO.mouse === 2'), 'a still no-button move keeps the lock');
  hud.listeners.pointermove(ev({ buttons: 0, movementX: 6 })); run('updateControls();'); // its pointerup went missing
  assert(!document.pointerLockElement && run('PHOTO.mouse === 0'), 'a move with no button down ends a lock whose pointerup was lost');
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); grant(); key('ShiftLeft'); key('KeyW'); key('KeyE');
  document.pointerLockElement = null; change(); // the browser's Escape
  assert(run('PHOTO.mouse === 0 && !PHOTO.keys.size && PHOTO.mula.sprint === 0'), 'browser Escape without keydown releases the drag, Shift and actions');
  assert(key('Escape') && run('PHOTO.on'), 'the Escape that freed the cursor does not also drop the figure');
  const yaw = run('PHOTO.cameraYaw');
  hud.listeners.pointermove(ev({ movementX: 80 })); up();
  assert.equal(run('PHOTO.cameraYaw'), yaw, 'no stray look after a browser unlock, button still down');
  run('performance.now = () => 1000');
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); up(); grant(); // let go before the lock came
  assert(!document.pointerLockElement, 'a late lock is handed straight back');
  answer = () => Promise.reject(new Error('refused')); calls.capture.length = 0;
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(calls.capture, [7], 'refused: the old pointer capture while the button is held'); up();
  answer = () => undefined; calls.capture.length = 0; // Firefox: no promise, an event
  hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); document.listeners.pointerlockerror();
  assert.deepEqual(calls.capture, [7]); up();
  answer = () => Promise.resolve();
  for (const [what, leave] of [['blur', () => windowHandlers.blur.forEach(h => h())], ['Tab', () => key('Tab')],
    ['a sheet', () => run('settingsMenu.open = true; updateControls(); settingsMenu.open = false;')], ['Escape back to looking', () => run('stopControl(); syncAvatars();')]]) {
    if (!run('viewMode')) run('setView(true);');
    if (!run('PHOTO.on')) run("takeFigure('mulassa-valls');");
    hud.listeners.pointerdown(ev()); hud.listeners.mousedown(ev()); grant();
    leave();
    run('updateControls();');
    assert(!document.pointerLockElement && run('PHOTO.mouse === 0'), `${what} unlocks`);
  }
  calls.lock = 0; run(`if (!viewMode) setView(true); takeFigure('mulassa-valls');`);
  hud.listeners.pointerdown(ev({ pointerType: 'touch', button: 0, buttons: 1 })); (windowHandlers.pointerup || []).forEach(h => h(ev({ pointerType: 'touch', buttons: 0 })));
  assert.equal(calls.lock, 0, 'touch never asks for the lock');
  run('setView(false); performance.now = () => 0;');
  delete hud.requestPointerLock; delete hud.setPointerCapture; delete document.exitPointerLock; document.pointerLockElement = null;
  console.log('photo mouse look: pointer lock while held, every exit unlocks ok');
}

// Entry follows a playable selector figure; reentry never remembers a different photo actor.
{
  const savedEntryFigure = context.selectScreen.figure;
  for (const figure of ['MULASSA', 'DRAC']) {
    run(`setView(false); G.state='select'; setFigureSong(${figure}); selectScreen.figure=${figure}; selectScreen.pending=false; setView(true);`);
    assert(run(`PHOTO.on && PHOTO.id === ${figure}.id && PHOTO.pair`), 'playable entry controls the selector figure');
    run(`takeFigure('${figure === 'MULASSA' ? 'drac-valls' : 'mulassa-valls'}'); setView(false); setView(true);`);
    assert(run(`PHOTO.id === ${figure}.id && PHOTO.on`), 'reentry derives the actor from selection');
    run(`setView(false); selectScreen.pending=true; setView(true);`);
    assert(run('!PHOTO.on && PHOTO.pair'), 'pending entry only looks, with both beasts');
  }
  run('setView(false); selectScreen.pending=false; G.state="splash"; setView(true);');
  assert(run('!viewMode && !PHOTO.on'), 'the splash never enters photo mode');
  run('setView(false); setFigureSong(MULASSA);');
  context.selectScreen.figure = savedEntryFigure;
}

// Looking exposes an explicit invitation; desktop frames hand a figure to WASD; touch only looks.
{
  const savedHelpStorage = context.localStorage, helpStorage = {};
  context.localStorage = { getItem: k => helpStorage[k] ?? null, setItem: (k, v) => { helpStorage[k] = String(v); } };
  const keyDown = (code, more = {}) => {
    let prevented = false;
    for (const h of keyHandlers) h({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more });
    return prevented;
  };
  run(`pfAutoShown.clear(); G.state='select'; selectScreen.figure = selectedFigure; selectScreen.pending = true; setFigureSong(MULASSA); setView(false); setView(true); animMula(1/60, clock/BEAT);`);
  assert(run('viewMode && !PHOTO.on && !avatarsEl.hidden'), 'photo mode starts in free view with the bar shown');
  assert(!keyDown('KeyW') && !keyDown('Tab'), 'free view leaves W and Tab alone');
  assert(run('PHOTO.keys.size === 0'));
  // Timers belong to the current notice: switching/exit cancels them, replay replaces them.
  const savedPhotoTimers = [context.setTimeout, context.clearTimeout], photoTimers = new Map();
  let photoTimerId = 0;
  context.setTimeout = (fn, ms) => { photoTimers.set(++photoTimerId, { fn, ms }); return photoTimerId; };
  context.clearTimeout = id => photoTimers.delete(id);
  run("takeFigure('drac-valls');");
  assert(run("PHOTO.on && PHOTO.id === 'drac-valls' && PHOTO.pair"), 'a frame takes that figure');
  assert(run('!pfTip.hidden && pfTip.dataset.visible === "true" && pfTip.innerHTML.includes("rugeix")'), 'Drac notice describes its real actions');
  assert([...photoTimers.values()].some(t => t.ms === 6000), 'initial controls stay for at most six seconds');
  assert.equal(helpStorage['photo-help-seen-figure'], '1', 'first figure help is remembered in browser storage');
  const firstNoticeTimer = run('pfTipT');
  photoTimers.get(firstNoticeTimer).fn(); // the first figure's help has already disappeared
  assert(keyDown('Tab') && run("PHOTO.id === 'mulassa-valls'"), 'Tab switches only while driving');
  assert(!photoTimers.has(firstNoticeTimer), 'switching cancels the previous notice timer');
  assert(run('pfTip.dataset.kind === "notice" && !pfTip.innerHTML.includes("pf-help-grid")'), 'Tab changes actor with compact feedback even on its first visit');
  assert.equal(photoTimers.get(run('pfTipT')).ms, 1800, 'actor feedback is brief');
  keyDown('KeyW', { target: nodes.get('hud') });
  assert(run('pfTip.dataset.visible === "true"') && photoTimers.get(run('pfTipT')).ms === 1800, 'movement preserves brief actor feedback');
  assert(run('pfHelp.textContent.includes("guitza") && !pfHelp.textContent.includes("rugeix")'), 'accessible controls follow the current actor');
  photoTimers.get(run('pfTipT')).fn();
  assert(run('pfTip.dataset.visible === "false" && pfHelp.textContent.includes("guitza")'), 'after fade the accessible help remains');
  keyDown('Tab');
  assert(run('pfTip.innerHTML.includes("Ara mous el Drac")'), 'returning to an actor gives compact feedback');
  keyDown('Tab');
  assert(run('pfTip.innerHTML.includes("Ara mous la Mulassa")'), 'each switch identifies the actual actor');
  keyDown('Slash', { key: '?' });
  assert(run('pfTip.dataset.visible === "true"'), 'question mark replays help without leaving control');
  keyDown('Tab');
  assert(run('!pfTip.innerHTML.includes("pf-help-grid")'), 'switching replaces full help with compact feedback');
  keyDown('Tab'); keyDown('Slash', { key: '?' });
  assert(run('pfTipManual'), 'manual help stays available for deliberate reading');
  const manualNoticeTimer = run('pfTipT');
  keyDown('KeyW', { target: nodes.get('hud') });
  assert(!photoTimers.has(manualNoticeTimer) && run('pfTip.dataset.visible === "true"'), 'movement does not time out manual help');
  keyDown('Slash', { key: '?' });
  assert(run('pfTip.dataset.visible === "false"'), 'the same shortcut closes manual help');
  run("setView(false); pfAutoShown.clear(); setView(true); takeFigure('mulassa-valls');");
  assert(run('pfTip.dataset.kind === "notice"'), 'remembered controls never reopen automatically after session state resets');
  run("takeFigure('drac-valls');");
  assert(run('pfTip.dataset.kind === "notice"'), 'one remembered introduction covers both figures');
  keyDown('Slash', { key: '?' });
  assert(run('pfTipManual && pfTip.innerHTML.includes("rugeix")'), 'remembered help stays recoverable with question mark');
  keyDown('Slash', { key: '?' });
  run("takeFigure('mulassa-valls');");
  run('showPhotoHelp(false);');
  keyDown('KeyX');
  keyDown('KeyW', { target: { tagName: 'BUTTON' } });
  assert(run('!pfTip.hidden'), 'unrelated keys and focused buttons do not dismiss movement instructions');
  keyDown('KeyW', { target: nodes.get('hud') });
  const usedNoticeTimer = run('pfTipT');
  assert(run('pfTip.hidden && pfTip.dataset.visible === "false"'), 'movement clears initial help immediately');
  assert(!photoTimers.has(usedNoticeTimer), 'movement cancels the initial help timer');
  keyDown('KeyA'); keyDown('KeyW', { repeat: true });
  assert(!photoTimers.has(usedNoticeTimer) && run('pfTip.hidden'), 'further movement never queues another dismissal');
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'Space', 'ShiftLeft', 'ShiftRight']) {
    run('showPhotoHelp(false);');
    keyDown(code, { target: nodes.get('hud'), repeat: true });
    assert(run('pfTip.hidden'), `${code} also clears discovery help when already held`);
    assert(!photoTimers.has(run('pfTipT')), 'held input leaves no obsolete notice timer');
  }
  assert(run('pfTip.innerHTML.includes("Mulassa de Valls")'), 'popup uses the catalog full name');

  run("takeFigure('mulassa-valls');");
  assert(run('PHOTO.on && viewMode'), 'choosing the active figure is idempotent');
  run("takeFigure('drac-valls'); updateControls();");
  photoTimers.get(run('pfTipT')).fn(); run('updateControls();');
  assert(run('!howtoEl.hidden && !howtoEl.inert'), 'after feedback fades the existing help button returns');
  run('showPhotoHelp();');
  assert(run('pfTip.dataset.visible === "true" && pfTip.innerHTML.includes("rugeix")'), 'help button reopens the active figure instructions');
  assert(run('photoHelpAvailable()'), 'the help control stays available to close manual help');
  windowHandlers.blur.forEach(h => h());
  assert(run('pfTip.hidden && pfTip.dataset.visible === "false" && !pfTipManual'), 'backgrounding clears manual help instead of resuming a stale overlay');
  assert(!photoTimers.has(run('pfTipT')), 'backgrounding cancels the owned notice timer');
  run('showPhotoHelp();');
  assert(run('pfTip.dataset.visible === "true"'), 'help can be requested again after backgrounding');
  run("takeFigure(''); takeFigure('mulassa-valls');");

  run("takeFigure('mulassa-valls'); takeFigure('');");
  assert(run('!PHOTO.on && viewMode'), 'Vista lliure goes back to viewing');
  run("takeFigure('mulassa-valls');"); keyDown('KeyW');
  keyDown('Escape');
  assert(run('!PHOTO.on && viewMode && PHOTO.keys.size === 0'), 'Escape first drops control (keys cleared)');
  keyDown('Escape');
  assert(run('!viewMode && avatarsEl.hidden'), 'the next Escape brings the buttons back');
  run("setView(true); takeFigure('mulassa-valls');"); keyDown('KeyH');
  assert(run('viewMode && PHOTO.on'), 'H does not leave free play'); run('setView(false)');
  run("COARSE.matches = true; setView(true);");
  assert(run("viewMode && avatarsEl.hidden && PHOTO.on && PHOTO.id === 'mulassa-valls' && !touchEl.hidden"), 'touch: no bar, the stick drives her');
  run("setView(false);");
  assert(run('touchEl.hidden && !PHOTO.on'), 'touch: leaving photo mode hides the stick');
  run("COARSE.matches = false; G.state = 'play';");
  assert(!keyDown('Tab') && !keyDown('KeyA'), 'during a song WASD/Tab are not photo keys');
  run("G.state = 'select';");
  assert(run('pfTip.hidden && pfTip.dataset.visible === "false"'), 'touch and exit clear the notice');
  [context.setTimeout, context.clearTimeout] = savedPhotoTimers;
  context.localStorage = savedHelpStorage;
  console.log('photo free view by default, desktop frames, Escape steps back, touch drives with the stick ok');
  // Pending selection keeps its identity; photo mode shows the two existing playable figures.
    let ft = 90000; const pendFrame = () => run(`frame(${ft += 1000 / 60})`);
  run(`var realSel = sheets.select, pendCrowd = activeCrowd; activeCrowd = []; sheets.select = { pending: true, figure: { id: 'aliga-valls', status: 'aviat' }, visible() {}, sheetOpen: false };
    G.state = 'select'; setView(false); setFigureSong(MULASSA); var pendingSounds = [], pendingChip = chip; chip = { sfx: k => pendingSounds.push(k) };`);
  pendFrame();
  assert(run('!mula.root.visible && !drac.root.visible'), 'pending selector: no model');
  run('setView(true);'); pendFrame();
  assert(run('mula.root.visible && drac.root.visible && !avatarsEl.hidden'), 'pending photo mode: both figures and the control bar show');
  run("takeFigure('drac-valls');"); pendFrame();
  assert(run("drac.root.visible && mula.root.visible && selectedFigure.id === 'mulassa-valls'"), 'driving the Drac never changes the selection');
  run("PHOTO.sparks = true;"); pendFrame(); pendFrame();
  run('setView(false);'); pendFrame();
  assert(run("!mula.root.visible && !drac.root.visible && dracFx.idle && sheets.select.figure.id === 'aliga-valls' && selectedFigure.id === 'mulassa-valls'"), 'leaving: bare again, Drac fx cleared, pending selection kept');
  run('setFigureSong(DRAC); setView(true);'); pendFrame();
  assert(run('drac.root.visible && mula.root.visible'), 'both figures show with the last playable Drac');
  run('setView(false); setFigureSong(MULASSA);'); pendFrame(); // (a frame closes the photo walk, as the game does)
  assert.equal(run('pendingSounds.length'), 0, 'pending photo controls and figure switches never request SFX');
  run('chip = pendingChip;');
  // A portrait phone: photo mode backs the camera off (same angle) so she fits across, and drops the selector band's shift.
  const sizeWas = [context.innerWidth, context.innerHeight]; context.innerWidth = 393; context.innerHeight = 852;
  run(`resize(); sheets.select.band = { top: 0, bottom: 200 }; setView(false); titleC.on = false;`); pendFrame(); // (a fresh follow: earlier tests leave the camera far across the plaça)
  const plainDist = run('orbitHome.dist'), plainPitch = run('orbitHome.pitch');
  run('setView(true);'); pendFrame();
    // her whole outline in the middle of the screen (cameras.js frameMenuLens: feet on the fitted floor, room above to rear up), not
  // in the hidden band (0-200 of 852 css px): her vertices through the pinhole (view space, the fov) plus the lens shift, sampled
  // over 5 s of her dancing (the shot follows her calmly, never locked on)
  const offAt = () => run(`camera.updateMatrixWorld(); { let lo = Infinity, hi = -Infinity; const v = new THREE.Vector3(), ppm = HH * K / (2 * Math.tan(camera.fov * Math.PI / 360)); mula.root.traverseVisible(o => { const p = o.isMesh && o.geometry.attributes.position; if (p) for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse); const y = -v.y / -v.z * ppm; if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } }); [lo + camShift, hi + camShift]; }`);
  const offs = []; for (let i = 0; i < 20; i++) { for (let j = 0; j < 15; j++) pendFrame(); offs.push(offAt()); }
  const meanMid = offs.reduce((a, [t, b]) => a + (t + b) / 2, 0) / offs.length, top = Math.min(...offs.map(o => o[0])), bottom = Math.max(...offs.map(o => o[1]));
  assert(Math.abs(meanMid) < 0.1 * 852 && top > -0.45 * 852 && bottom < 0.45 * 852, `portrait photo mode: in the middle, not the hidden selector band (mean ${meanMid.toFixed(0)}, ${top.toFixed(0)} to ${bottom.toFixed(0)} css px from the middle)`);
  // Leaving photo mode: the selector comes back at once, so the camera hands back quickly (cameras.js MENU_T.exit): her feet are back
  // above the dock within ~1.5 s, not the calm ~4 s that left her behind the cards.
  const feet = () => run(`camera.updateMatrixWorld(); { let hi = -Infinity; const v = new THREE.Vector3(), ppm = HH * K / (2 * Math.tan(camera.fov * Math.PI / 360));
    mula.root.traverseVisible(o => { const p = o.isMesh && o.geometry.attributes.position; if (p) for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse); const y = -v.y / -v.z * ppm; if (Number.isFinite(y)) hi = Math.max(hi, y); } });
    hi + camShift + HH * K / 2; }`);
  context.innerWidth = 1280; context.innerHeight = 800; // a desktop: the band right of the info panel, the dock from 476 down
  run(`resize(); sheets.select = { pending: false, figure: { id: 'mulassa-valls', status: 'joc' }, visible() {}, sheetOpen: false, band: { top: 66, bottom: 476, hardTop: 66, left: 548, right: 1280 } };`);
  run('setView(false);'); for (let i = 0; i < 360; i++) pendFrame();
  const settled = Math.max(...Array.from({ length: 30 }, () => (pendFrame(), feet())));
  run('setView(true);'); for (let i = 0; i < 240; i++) pendFrame();
  run('setView(false);');
  let clear = null; for (let i = 0; i < 300 && clear === null; i++) { pendFrame(); if (feet() <= Math.max(476, settled) + 10) clear = i / 60; }
  assert(clear !== null && clear < 1.5, `leaving photo mode: her feet are back over the dock in ${clear?.toFixed(2)} s (settled ${settled.toFixed(0)} css px, dock at 476)`);
  [context.innerWidth, context.innerHeight] = sizeWas; run('setView(false); resize();'); pendFrame();
  run('sheets.select = realSel; activeCrowd = pendCrowd;'); // (no crowd: the frames must not move the people later tests place)
  console.log('pending selection: photo mode shows the pair and preserves the pending identity ok');
}

// A nearby spectator makes way through the regular RING steering; the walker never tunnels through them.
{
  run(`G.state='select'; setFigureSong(MULASSA); M.pos.set(0,0); M.yaw=Math.PI; M.pivot.set(0,-PIVOT);
    S.yaw.x=S.yaw.t=Math.PI; S.yaw.v=0; camera.position.set(0,6,10); camFocus.set(0,0,0);
    var savedPhotoCrowd=activeCrowd, photoPerson=activeCrowd[0]; activeCrowd=[photoPerson];
    photoPerson.pos.set(0,-4.3); photoPerson.gx=0; photoPerson.gz=-4.3; photoPerson.vel.set(0,0);
    setView(true); takeFigure(selectedFigure.id); animMula(1/60,0); PHOTO.keys.add('KeyW'); PHOTO.keys.add('ShiftLeft');
    var manualMin=99, manualStep=0, personStart=photoPerson.pos.clone();
    for(let i=0;i<360;i++){
      var px=M.pos.x,pz=M.pos.y; clock+=1/60; animMula(1/60,clock/BEAT); animCrowd(1/60,clock/BEAT,0,1);
      manualStep=Math.max(manualStep,Math.hypot(M.pos.x-px,M.pos.y-pz));
      manualMin=Math.min(manualMin,photoClearance(M.pos.x,M.pos.y,M.yaw,photoPerson.gx,photoPerson.gz,photoPerson.rad));
    }`);
  assert(run('photoPerson.pos.distanceTo(personStart)>1'), 'spectator steps away from the moving figure');
  assert(run('manualStep<=PHOTO_RUN.run/60+1e-6'), 'manual motion never jumps through the audience');
  assert(run('manualMin >= -0.03'), `no overlap with the visible spectator: ${run('manualMin')}`);
  assert(run('photoFixedClearance(M.pos.x,M.pos.y,M.yaw,false)>=-1e-6'), 'figure stays inside the real plaza and clear of props');
  assert(run('M.pos.length()>MID.edge-2.65'), 'open floor beyond the old artificial circle is reachable');
  run('setView(false); animMula(1/60,clock/BEAT); activeCrowd=savedPhotoCrowd;');
  console.log('photo walking reuses crowd making-way without overlaps or jumps');
}

// R in photo mode: the Mulassa's culada flings the people round her out (fast, then they slide to a stop); the Drac's E sparks.
{
  run(`G.state='select'; setFigureSong(MULASSA); M.pos.set(0,0); M.yaw=0; M.pivot.set(0,PIVOT); S.yaw.x=S.yaw.t=0; S.yaw.v=0;
    camera.position.set(0,6,10); camFocus.set(0,0,0); setView(false);
    var savedCuladaCrowd=activeCrowd, hit=activeCrowd[0], far=activeCrowd[1]; activeCrowd=[hit,far];
    hit.pos.set(1.6,-1.2); hit.gx=1.6; hit.gz=-1.2; hit.vel.set(0,0); hit.knockT=0; far.pos.set(0,9); far.gx=0; far.gz=9; far.vel.set(0,0); far.knockT=0;
    setView(true); takeFigure('mulassa-valls'); animMula(1/60,clock/BEAT);
    var hitStart=hit.pos.clone(), farStart=far.pos.clone(), hitTop=0;
    photoKey({code:'KeyR',preventDefault(){}},true);
    for(let i=0;i<90;i++){clock+=1/60;animMula(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);hitTop=Math.max(hitTop,hit.vel.length());}`);
  assert(run('hit.pos.distanceTo(hitStart)>1.5 && hitTop>4'), `the culada flings the near one out: ${run('hit.pos.distanceTo(hitStart)')} m, ${run('hitTop')} m/s`);
  assert(run('far.pos.distanceTo(farStart)<0.5'), 'people out of her reach are untouched');
  assert(run('hit.fall > 0.9 && !far.fall && Math.abs(hit.g.rotation.x) > 1.3'), 'the one she hit lies flat on the floor (photo mode only)');
  run(`for(let i=0;i<220;i++){clock+=1/60;animMula(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);}`);
  assert(run('!hit.fall && hit.g.rotation.x === 0 && !(hit.downT > 0)'), 'and gets back up');
  assert(run('Math.abs(Math.abs(Math.atan2(Math.sin(M.yaw),Math.cos(M.yaw)))-Math.PI)<0.05'), 'she ends half round');
  assert(run('hit.knockT<=0 && hit.vel.length()<3.5'), `the flung one slides to a stop, back to their own pace (at most the 3.4 m/s flee): ${run('[hit.knockT, hit.vel.length(), hit.pos.x, hit.pos.y].map(v=>v.toFixed(2))')}`);
  run(`var previousAvoidKnock=hit.avoidKnock; hit.avoidKnock=true; hit.knockT=0; hit.downT=0; hit.fall=0;
    hit.vel.set(0.1,0); PHOTO.culada=1; culadaKnock(hit,1/60,1,1);`);
  assert(run('hit.knockT===0 && hit.downT===0 && hit.fall===0 && hit.vel.x===0.1'), 'an evading mobility variant never receives a throw or a fall, even inside the impact radius');
  run('hit.avoidKnock=previousAvoidKnock; PHOTO.culada=0;');
  run(`activeCrowd=savedCuladaCrowd; setView(false); animMula(1/60,clock/BEAT);
    setFigureSong(MULASSA); G.state='select'; setView(true); takeFigure('drac-valls'); animMula(1/60,clock/BEAT);
    var manualFireRequests = [], fireSfxWas = chip.sfx; chip.sfx = (...args) => manualFireRequests.push(args);
    photoKey({code:'KeyE',preventDefault(){}},true);
    for(let i=0;i<30;i++){clock+=1/60;animMula(1/60,clock/BEAT);dracFrame(1/60,0);}`);
  assert(run('drac.root.visible && !PHOTO.sparks && !dracFx.idle'), 'Drac E sets its sparks going');
  run(`var fireGaps = 0;
    for(let i=0;i<360;i++){clock+=1/60;animMula(1/60,clock/BEAT);dracFrame(1/60,0);if(!dracFx.objects.blast.visible)fireGaps++;}`);
  assert.equal(run('fireGaps'), 0, 'one E keydown sustains the flame every frame beyond the old 1.1 s expiry');
  assert.deepEqual(JSON.parse(run('JSON.stringify(manualFireRequests)')), [['flama', 0, true]], 'held manual fire requests its sound once without demo effects or per-frame repeats');
  run('chip.sfx = fireSfxWas;');
  run("PHOTO.keys.delete('KeyE'); dracFrame(1/60,0);");
  assert(run('dracFx.objects.blast.visible && dracFx.state().wheels === 0'), 'keyup stops emission and lets the existing flame fade naturally');
  run('for(let i=0;i<90;i++)dracFrame(1/60,0);');
  assert(run('!dracFx.objects.blast.visible'), 'released flame finishes its natural lifetime without restarting');

  run("setView(false); animMula(1/60,clock/BEAT); dracFrame(1/60,0);");
  console.log('photo culada flings the crowd; Drac E sparks ok');
}

// A running jump follows its flight arc: no music bounce or walking feet after the takeoff blend.
{
  for (const fps of [30, 60, 120]) {
    run(`G.state='select'; setFigureSong(MULASSA); setView(false); setView(true); takeFigure('mulassa-valls');
      animMula(1/60,0,1); clearPhotoKeys();
      var jumpCrowd=activeCrowd; activeCrowd=[];
      M.air=0; M.airV=0; M.missT=-9; G.collapseT=0;
      for(const s of Object.values(S)){s.x=s.v=s.t=0;}
      Object.assign(PHOTO.mula,{x:0,z:0,yaw:0,vx:0,vz:9,sprint:1});
      PHOTO.cameraYaw=Math.PI; PHOTO.keys.add('KeyW'); PHOTO.keys.add('ShiftLeft');
      for(let i=0;i<12;i++){clock+=1/${fps};animMula(1/${fps},clock/BEAT,1);}
      PHOTO.action=true;
      var airBounce=0, airStep=0, airSamples=0;
      for(let i=0;i<${fps}*0.6;i++){
        clock+=1/${fps};animMula(1/${fps},clock/BEAT,1);
        if(i/${fps}>0.2 && M.air>0.1){
          airSamples++;
          airBounce=Math.max(airBounce,Math.abs(mula.root.position.y-M.air));
          airStep=Math.max(airStep,...MULA_FEET.map(f=>Math.abs(f.y-M.air))); // the carriers' shoes fly with her, no step in the air
        }
      }
      activeCrowd=jumpCrowd; clearPhotoKeys(); setView(false);`);
    assert(run('airSamples > 4'), `sample the flight at ${fps} fps`);
    assert(run('airBounce < 0.02 && airStep < 0.02'),
      `no gait superimposed on the jump at ${fps} fps: ${run('JSON.stringify({airBounce,airStep})')}`);
  }
}

// Q held: the Mulassa rears up on her rear legs; E held: she kicks her rear up on her front legs. The Drac's Q is a roar.
{
  const legY = (front) => run(`MULA_FEET.filter((f,i)=>(i<4)===${front}).reduce((m,f)=>Math.max(m,f.y),0)`); // the carriers' shoes: 0-3 the front pair's, 4-7 the rear's
  run(`G.state='select'; setFigureSong(MULASSA); M.air=0; M.airV=0; setView(false); setView(true); takeFigure('mulassa-valls'); clearPhotoKeys(); PHOTO.keys.add('KeyQ');
    for(let i=0;i<60;i++){clock+=1/60;animMula(1/60,clock/BEAT,1);}`);
  assert(run('mula.body.rotation.x < -0.35'), 'Q: her front up');
  assert(legY(false) < 0.12 && run('MULA_FEET.slice(0,4).every(f=>f.y>0.3)'), `on her rear legs, the front ones off the floor (rear ${legY(false).toFixed(2)})`);
  run(`PHOTO.keys.delete('KeyQ'); PHOTO.keys.add('KeyE'); for(let i=0;i<60;i++){clock+=1/60;animMula(1/60,clock/BEAT,1);}`);
  assert(run('mula.body.rotation.x > 0.3 && MULA_FEET.slice(4).every(f=>f.y>0.3)'), 'E: her rear up, its legs off the floor');
  assert(legY(true) < 0.12, `on her front legs (${legY(true).toFixed(2)})`);
  run(`clearPhotoKeys(); for(let i=0;i<90;i++){clock+=1/60;animMula(1/60,clock/BEAT,1);}`);
  assert(run('Math.abs(mula.body.rotation.x) < 0.05'), 'let go: back on all fours');
  run(`takeFigure('drac-valls'); PHOTO.keys.add('KeyQ'); for(let i=0;i<60;i++){clock+=1/60;animMula(1/60,clock/BEAT,1);}`);
  assert(run('DRAC_POSE.rear > 0.8 && DRAC_POSE.jaw > 0.8'), 'Drac Q: heads up, jaws open');
  run(`clearPhotoKeys(); setView(false); animMula(1/60,clock/BEAT,1);`);
  console.log('photo Q rears up, E kicks, Drac Q roars ok');
}

{
  assert(run('photoPairClearance(0,0,0,{x:2.5,z:0,yaw:0},false)>0'), 'parallel figures have room beside each other');
  assert(run('photoPairClearance(0,0,Math.PI/2,{x:2.5,z:0,yaw:0},false)<0'), 'turning the long body into the other figure is blocked');
  run(`var switchedWalker=newWalker(0,0,0), switchedPose=newDracPose();
    manualDracStep(switchedWalker,switchedPose,1/60,0,{x:0,z:0,yaw:0,vx:0,vz:0},DRAC_SCALE,false);
    manualDracStep(switchedWalker,switchedPose,1/60,0,{x:4,z:0,yaw:0,vx:0,vz:0},DRAC_SCALE,true);`);
  assert(run('switchedWalker.feet.every(f=>Math.abs(f.x-4)<0.01) && switchedWalker.local.every(f=>f.lift===0)'), 'swapping back plants shoes at the new spot; reduced motion has no idle stepping');
  console.log('photo figure rotation clearance and returning Drac feet ok');
}

// Only the currently driven figure leaves the autonomous menu walk.
{
  run(`G.state='select'; selectScreen.figure = selectedFigure; selectScreen.pending = false; setFigureSong(MULASSA); animMula(1/60,0); setView(true); takeFigure(selectedFigure.id); animMula(1/60,0);
    clearPhotoKeys(); var idleM=M.pos.clone(), idleD={x:PAIR.x,z:PAIR.z};
    for(let i=0;i<180;i++){clock+=1/60;animMula(1/60,clock/BEAT);}`);
  assert(run('M.pos.distanceTo(idleM)<1e-6'), 'controlled Mulassa stays put without keys');
  assert(run('Math.hypot(PAIR.x-idleD.x,PAIR.z-idleD.z)>.01'), 'uncontrolled Drac keeps walking');
  run(`photoKey({code:'Tab',preventDefault(){}},true); animMula(1/60,clock/BEAT);
    idleM=M.pos.clone(); idleD={x:PAIR.x,z:PAIR.z};
    for(let i=0;i<180;i++){clock+=1/60;animMula(1/60,clock/BEAT);}`);
  assert(run('Math.hypot(PAIR.x-idleD.x,PAIR.z-idleD.z)<1e-6'), 'controlled Drac stays put without keys');
  assert(run('M.pos.distanceTo(idleM)>.01'), 'Mulassa resumes her walk after Tab');
  run('setView(false); animMula(1/60,clock/BEAT);');
  console.log('manual ownership and autonomous companion ok');
}

{
  run(`G.state='select'; setFigureSong(MULASSA); M.air=0; M.airV=0; setView(true); takeFigure(selectedFigure.id); animMula(1/60,clock/BEAT);
    photoKey({code:'Space',preventDefault(){}},true); var photoJump=0;
    for(let i=0;i<90;i++){clock+=1/60;animMula(1/60,clock/BEAT);photoJump=Math.max(photoJump,M.air);}`);
  assert(run('photoJump>.5 && M.air===0'), 'Space jumps and lands without accumulating lift');
  run(`photoKey({code:'Tab',preventDefault(){}},true); setTrauma(0); var dracUp=0, dracShake=0, booms=0, dracFire=0; chip={menu(){},sfx(k){if(k==='gran')booms++;}};
    photoKey({code:'Space',preventDefault(){}},true);
    for(let i=0;i<90;i++){clock+=1/60;animMula(1/60,clock/BEAT);dracUp=Math.max(dracUp,drac.root.parent.position.y);dracShake=Math.max(dracShake,Math.abs(manualLandingStrength()));dracFire=Math.max(dracFire,DRAC_POSE.fire);}`);
  assert(run('dracUp>.5 && drac.root.parent.position.y===0 && M.air===0'), 'Space jumps the whole Drac (not her) and lands it');
  assert(run('dracShake===.9 && booms===0'), 'its manual landing stays silent with the original Drac strength');
  assert(run('dracFire>2 && PHOTO.drac.fire===0'), 'it breathes fire as it takes off, and the flame dies away');
  run(`setView(false); animMula(1/60,clock/BEAT); chip=null; setTrauma(0);`);
  console.log('photo Space jumps for both figures; silent Drac landing preserves the shake ok');
}

{
  run(`G.state='select'; selectScreen.figure = selectedFigure; selectScreen.pending = false; setFigureSong(MULASSA); animMula(1/60,0);
    M.pos.set(-4,0);M.pivot.set(-4+PIVOT,0);M.yaw=Math.PI/2;S.yaw.x=S.yaw.t=M.yaw;S.yaw.v=0;
    PAIR.x=PAIR.w.x=3;PAIR.z=PAIR.w.z=0;PAIR.w.face=0;
    var passageCrowd=activeCrowd;activeCrowd=[];setView(true); takeFigure(selectedFigure.id);animMula(1/60,0);PHOTO.keys.add('KeyW');PHOTO.keys.add('ShiftLeft');
    var passageStart=PAIR.x,passageGap=99,passageStep=0;
    for(let i=0;i<300;i++){var lastX=PAIR.x,lastZ=PAIR.z;clock+=1/60;animMula(1/60,clock/BEAT);
      passageGap=Math.min(passageGap,photoPairClearance(M.pos.x,M.pos.y,M.yaw,{x:PAIR.x,z:PAIR.z,yaw:PAIR.w.face},false));
      passageStep=Math.max(passageStep,Math.hypot(PAIR.x-lastX,PAIR.z-lastZ));}
  `);
  assert(run('M.pos.x>-2'), 'manual figure advances toward its companion');
  assert(run('Math.abs(PAIR.x-passageStart)+Math.abs(PAIR.z)>1'), 'companion yields instead of becoming a wall');
  assert(run('passageGap>=-0.03 && passageStep<0.08'), `companion yielding is collision-free and bounded: ${run('JSON.stringify([passageGap,passageStep])')}`);
  run('setView(false);animMula(1/60,clock/BEAT);activeCrowd=passageCrowd;');
  assert(run('photoFixedClearance(10,0,0,false)>0 && photoFixedClearance(plaza.inner,0,0,false)<0'), 'actual plaza bounds replace the circular fence');
  console.log('companion yields smoothly and open plaza bounds are reachable');
}

{
  run(`G.state='select';setFigureSong(MULASSA);M.pos.set(0,0);M.yaw=Math.atan2(MID.fx,MID.fz);M.pivot.set(Math.sin(M.yaw)*PIVOT,Math.cos(M.yaw)*PIVOT);S.yaw.x=S.yaw.t=M.yaw;S.yaw.v=0;
    setView(true); takeFigure(selectedFigure.id);animMula(1/60,clock/BEAT);PHOTO.keys.add('KeyW');PHOTO.keys.add('ShiftLeft');var extrasMoved=0,extraMaxStep=0,travelClear=99;
    for(let i=0;i<480;i++){clock+=1/60;animMula(1/60,clock/BEAT);animCrowd(1/60,clock/BEAT,0,1);
      travelClear=Math.min(travelClear,photoSafe(M.pos.x,M.pos.y,M.yaw));
      for(const p of photoExtras)extrasMoved=Math.max(extrasMoved,Math.hypot(p.pos.x-p.homeX,p.pos.y-p.homeZ));}
  `);
  assert(run('extrasMoved>.1'), 'the instanced spectators also yield');
  assert(run('M.pos.length()>7'), `walk through the old fence towards the dense audience: ${run('M.pos.length()')}`);
  assert(run('travelClear>-.08'), `passage keeps visible collision clearance: ${run('travelClear')}`);
  run('setView(false);animMula(1/60,clock/BEAT);');
  console.log('dense crowd passage and yielding floor spectators ok');
}

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
    run('var earlyYield=new THREE.Vector2();photoEscape(photoBody().x+Math.sin(photoBody().yaw)*7.5,photoBody().z+Math.cos(photoBody().yaw)*7.5,earlyYield);');
    assert(run('earlyYield.fear>0'), `${scenario}: the corridor opens ahead of the walking figure`);
    if (charred) assert(run('trappedPerson.sootW===1 && trappedPerson.sootT===4'), `${scenario}: stepping aside preserves the soot effect`);
    run('setView(false);animMula(1/60,clock/BEAT);');
  }
  // Resolving a crowded pair may move the outer person; it must not push the inner one into the figure.
  run(`var crowdNeighbour=passageSavedCrowd[1], neighbourRadius=crowdNeighbour.rad;
    setPhotoControl(true,'drac-valls',false);Object.assign(photoBody(),{x:0,z:0,yaw:0});
    activeCrowd=[trappedPerson,crowdNeighbour];photoExtras.length=0;plaza.props=[];
    trappedPerson.rad=crowdNeighbour.rad=.52;trappedPerson.sootT=trappedPerson.sootW=crowdNeighbour.sootT=0;
    trappedPerson.pos.set(1.95,0);crowdNeighbour.pos.set(2.9,0);trappedPerson.vel.set(0,0);crowdNeighbour.vel.set(0,0);
    animCrowd(0,0,0,1);`);
  assert(run('photoClearance(0,0,0,trappedPerson.pos.x,trappedPerson.pos.y,.52,true)>=-1e-6'), 'neighbour separation preserves clearance to the figure');
  assert(run('trappedPerson.pos.distanceTo(crowdNeighbour.pos)>=1.08-1e-6'), 'the outside spectator makes the remaining room');
  run(`setPhotoControl(false);crowdNeighbour.rad=neighbourRadius;
    trappedPerson.rad=trappedRadius;trappedPerson.sootT=trappedSootT;trappedPerson.sootW=trappedSootW;activeCrowd=passageSavedCrowd;plaza.props=passageSavedProps;bandSpots=passageSavedBand;
    photoBandSource=passageSavedSource;photoExtras.length=0;photoExtras.push(...passageSavedExtras);
    plaza.backdrop.mesh.count=passageBackdropCount;midCrowd.mesh.count=passageMidCount;`);
  console.log('held WASD clears a spectator trapped against scenery for both figures');
}

// Manual camera: one centre, independent of the selector dock, throughout locomotion and at the plaza edge.
{
  run(`G.state='select';setView(true); takeFigure(selectedFigure.id);animMula(1/60,0);camera.setViewOffset(1280,800,0,160,1280,800);
    for(let i=0;i<180;i++)framePhotoCamera(1/60);
    var cameraError=0,cameraStep=0,photoCameraPrevious=camera.position.clone();
    for(let i=0;i<180;i++){
      PHOTO.mula.x+=.02;PHOTO.mula.z+=.01;framePhotoCamera(1/60);camera.updateMatrixWorld(true);
      var projectedPhoto=new THREE.Vector3(PHOTO.mula.x,PHOTO_CAM.aimY[PHOTO.id],PHOTO.mula.z).project(camera);
      cameraError=Math.max(cameraError,Math.hypot(projectedPhoto.x,projectedPhoto.y));
      cameraStep=Math.max(cameraStep,camera.position.distanceTo(photoCameraPrevious));photoCameraPrevious.copy(camera.position);
    }`);
  assert(run('cameraError<.002 && cameraStep<.05 && !camera.view.enabled'), `centred camera while walking: ${run('JSON.stringify([cameraError,cameraStep])')}`);
  run(`PHOTO.mula.x=plaza.inner-2;PHOTO.mula.z=0;PHOTO.cameraYaw=Math.PI/2;PHOTO.zoom=20;
    for(let i=0;i<180;i++)framePhotoCamera(1/60);camera.updateMatrixWorld(true);
    var edgeProjection=new THREE.Vector3(PHOTO.mula.x,PHOTO_CAM.aimY[PHOTO.id],0).project(camera);`);
  assert(run('camera.position.x<=plaza.inner-.54 && Math.hypot(edgeProjection.x,edgeProjection.y)<.002'), 'wall compresses camera boom without moving the centre');
  run(`setView(false);releasePhotoCamera();PHOTO.mula.x=0;PHOTO.mula.z=0;camera.position.set(0,14,6);camFocus.set(0,1.2,0);
    var wowStart=camera.position.clone();setView(true); takeFigure(selectedFigure.id);framePhotoCamera(1/60);
    var wowStep=camera.position.distanceTo(wowStart);for(let i=0;i<180;i++)framePhotoCamera(1/60);camera.updateMatrixWorld(true);
    var wowPitch=Math.asin((camera.position.y-camFocus.y)/camera.position.distanceTo(camFocus)),wowBody=new THREE.Vector3(0,1.4,0).project(camera).y;`);
  assert(run('wowStep<.5 && Math.abs(wowPitch-PHOTO_CAM.pitch)<.01 && Math.abs(camera.position.distanceTo(camFocus)-PHOTO_CAM.zoom)<.05 && wowBody<-.1'), `WoW framing eases in, body below the centre: ${run('JSON.stringify([wowStep,wowPitch,wowBody])')}`);
  run(`setView(false);releasePhotoCamera();`);
  assert(run('Number.isFinite(orbit.yaw) && !photoRig.on'), 'exit hands a valid camera back to the menu');
  console.log('manual camera stays centred in motion, ignores menu offset and compresses at walls');
}

// Visible-but-blurred menus used to advance the demo against a suspended audio clock.
{
  run("G.state = 'select'; G.paused = false; G.resuming = null; setView(false); setFigureSong(DRAC); var returningSounds = []; chip = { sfx: k => returningSounds.push(k), wake() {}, ctx: { state: 'suspended', suspend() {} } }; last = 1000;");
  const before = run('clock');
  document.focused = false;
  run('frame(2000); frame(122000);');
  assert.equal(run('clock'), before, 'short and long unfocused frames cannot advance the demo');
  document.focused = true;
  run('frame(122016);');
  assert.equal(run('clock'), before, 'the returning frame consumes no background delta');
  run('frame(122032);');
  assert(run('clock > ' + before), 'the next active frame advances normally');
  run("sheets.select.pending = true; SHOWCASE.crema = true; frame(122048);");
  assert(run('!mula.root.visible && !drac.root.visible && dracFx.idle && !SHOWCASE.crema'), 'pending hides both models and clears a queued showcase and all effects');
  run('sheets.select.pending = false; frame(122064);');
  assert(run('drac.root.visible'), 'returning to a playable Drac restores the model');
  run('SHOWCASE.crema = true; dracFrame(1/60, 0);');
  assert.equal(run('returningSounds.length'), 0, 'even a pending demo burst consumed after focus returns cannot request sound');
  console.log('background demo time and pending effect lifecycle ok');
}

verifyJumpImpact(run, assert);
verifyManualSway(run, assert);

{
  const savedTimer = context.setTimeout, timers = [];
  context.setTimeout = fn => timers.push(fn);
  run('G.paused = false; var delayedEffects = 0; afterActive(700, () => delayedEffects++);');
  document.focused = false; windowHandlers.blur.forEach(fn => fn());
  document.focused = true; windowHandlers.focus.forEach(fn => fn());
  timers.splice(0).forEach(fn => fn());
  assert.equal(run('delayedEffects'), 0, 'an overdue callback cannot fire after returning to foreground');
  run('afterActive(700, () => delayedEffects++);'); timers.splice(0).forEach(fn => fn());
  assert.equal(run('delayedEffects'), 1, 'uninterrupted delayed effects still fire');
  context.setTimeout = savedTimer;
}

// The showreel's idle screen (ui/reel-idle.js): untouched on the selector, its UI fades (she keeps her framing);
// any move brings it back; never in photo mode.
{ let it = 300000; const idleFrames = n => { for (let i = 0; i < n; i++) run(`frame(${it += 1000 / 60})`); };
  run("var idleSel = sheets.select; sheets.select = { pending: false, figure: MULASSA, visible() {}, sheetOpen: false, band: { top: 300, bottom: 600 } }; setView(false); G.state = 'select'; setFigureSong(MULASSA);"); windowHandlers.pointermove.forEach(h => h({})); idleFrames(30);
  assert(run('REEL.on && !reelIdleOn'), 'showreel: the selector stays while it was just touched');
  idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30);
  assert(run('reelIdleOn'), 'showreel idle: untouched, the UI fades and the dance has the screen');
  windowHandlers.pointermove.forEach(h => h({})); idleFrames(1);
  assert(run('!reelIdleOn'), 'showreel idle: a move brings the selector back at once');
  idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30); // the press that wakes it only wakes it: it, its up and its click never reach the game
  const ptr = type => { const e = { type, pointerId: 7, cancelable: true, stopped: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() {} }; windowHandlers[type].forEach(h => h(e)); return e.stopped; };
  assert(ptr('pointerdown') && run('!reelIdleOn') && ptr('pointerup') && ptr('click'), 'showreel idle: the waking tap is swallowed whole');
  assert(!ptr('pointerdown') && !ptr('pointerup') && !ptr('click'), 'showreel idle: the next tap is a real one');
  idleFrames(1); assert(run('!reelIdleOn'), 'awake after that tap');
  // leaving the page puts the selector back (everything pauses), and coming back the time away never counts
  idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30); assert(run('reelIdleOn'));
  document.focused = false; (windowHandlers.blur || []).forEach(h => h());
  assert(run('!reelIdleOn'), 'showreel idle: leaving the page brings the selector back');
  it += 60000; document.focused = true; (windowHandlers.focus || []).forEach(h => h()); idleFrames(2);
  assert(run('!reelIdleOn'), 'showreel idle: a minute away is not idleness');
  run('setView(true);'); idleFrames(Math.ceil(run('REEL_IDLE.after') * 60) + 30);
  assert(run('!reelIdleOn'), 'showreel idle: never in photo mode');
  run('setView(false);'); console.log('showreel idle screen ok');
// The showreel never shoots over an attendant's shoulder: over a stretch of her dance (runs to the attendants' marks
// included), no colla helper between the lens and her stands near the line of sight.
run(`frame(${it += 1000 / 60})`); // (leaving photo mode hands its camera over: the player's angle, held for a while)
run('var shoulder = { worst: 9, seen: 0 }; orbit.ptrs.clear(); orbit.last = -Infinity;'); // (and the mock clock never moves past it)
const shoulderCheck = `{ const v = new THREE.Vector3(), cx = camFocus.x, cz = camFocus.z, yaw = Math.atan2(camera.position.x - cx, camera.position.z - cz), hd = Math.hypot(camera.position.x - cx, camera.position.z - cz);
  for (const p of mulaColla.crew) { p.g.getWorldPosition(v); const dx = v.x - cx, dz = v.z - cz; if (dx * dx + dz * dz > hd * hd) continue; shoulder.seen++;
    shoulder.worst = Math.min(shoulder.worst, Math.abs(Math.atan2(Math.sin(yaw - Math.atan2(dx, dz)), Math.cos(yaw - Math.atan2(dx, dz))))); } }`;
// (and its cuts dissolve: the copy that fades out is taken in the outgoing shot's camera, before the cut moves it)
run("var fades = [], cutSettle = [], seenFades = 0, cutLast = false, lastCam = camera.position.clone(); document.getElementById('reel-fade').animate = () => (fades.push(camera.position.distanceTo(lastCam)), { cancel() {} });");
// (and the frame after a cut holds the new shot: no second step, Marc 2026-10-24: the cut was aimed at the old shot's distance)
for (let i = 0; i < 60 * 40; i++) { run(`frame(${it += 1000 / 60}); if (cutLast) cutSettle.push(camera.position.distanceTo(lastCam)); cutLast = fades.length > seenFades; seenFades = fades.length; lastCam.copy(camera.position);`); if (i % 4 === 0 && !run('orbit.ptrs.size')) run(shoulderCheck); }
const fades = JSON.parse(run('JSON.stringify(fades)'));
const cutSettle = JSON.parse(run('JSON.stringify(cutSettle)'));
assert(cutSettle.length > 0 && cutSettle.every(d => d < 0.1), `showreel: one step per cut, the next frame holds it (${JSON.stringify(cutSettle.map(d => +d.toFixed(3)))})`);
assert(fades.length > 0 && fades.every(d => d < 1e-6), `showreel: every cut dissolves from the outgoing shot (${fades.length} cuts, ${JSON.stringify(fades)})`);
// a figure change is one plain cut: its "outgoing shot" would already show the new figure (Marc saw two shot changes)
run("fades.length = 0; setSelectedFigure('drac-valls');"); windowHandlers.pointermove.forEach(h => h({}));
const swapMoves = []; for (let i = 0; i < 4; i++) { run(`lastCam.copy(camera.position); frame(${it += 1000 / 60});`); swapMoves.push(run('camera.position.distanceTo(lastCam)')); }
assert(run('REEL.id') === 'drac-valls' && run('fades.length') === 0, 'showreel: a figure change cuts without a dissolve');
// and that cut is final in its own frame: the new figure measured where it stands now (Marc 2026-10-24: a provisional frame, then a snap)
assert(swapMoves[0] > 0.3 && swapMoves.slice(1).every(d => d < 0.1), `showreel: a figure change is one step (${JSON.stringify(swapMoves.map(d => +d.toFixed(3)))})`);
// the Drac's close-up (beats 96-104: in on a long lens at the orbit's nearest, out to a wide shot) is one step each way too
run('sheets.select.band = { top: 430, bottom: 600, hardTop: 60, left: 0, right: 1280 }; REEL.anchor = REEL.acc + SHOWREELS[DRAC.id].start - 93; cutSettle.length = 0; seenFades = fades.length; cutLast = false;');
windowHandlers.pointermove.forEach(h => h({})); // (awake: the selector's band, not the idle screen's)
for (let i = 0; i < 60 * 6; i++) run(`frame(${it += 1000 / 60}); if (cutLast) cutSettle.push(camera.position.distanceTo(lastCam)); cutLast = fades.length > seenFades; seenFades = fades.length; lastCam.copy(camera.position);`);
const dracSettle = JSON.parse(run('JSON.stringify(cutSettle)'));
assert(dracSettle.length >= 2 && dracSettle.every(d => d < 0.1), `showreel: the Drac's close-up cuts in and out in one step (${JSON.stringify(dracSettle.map(d => +d.toFixed(3)))})`);
run("setSelectedFigure('mulassa-valls');"); for (let i = 0; i < 3; i++) run(`frame(${it += 1000 / 60});`);
const sh = JSON.parse(run('JSON.stringify(shoulder)'));
assert(sh.seen > 0 && sh.worst > 0.3, `showreel: no attendant over the lens's shoulder (closest ${sh.worst.toFixed(2)} rad off the line of sight)`);
run('sheets.select = idleSel;'); console.log('showreel clear of the attendants ok'); }
