// Quality transitions and shadows, crowd bubbles, scene downgrade and the crowd's spacing: contracts on the shared
// running game (game-context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { PROFILES } from '../../src/platform/render-quality.js';
import { THREE, energy, drawing, context, hostSeed, run, nodes, document, errors } from './game-context.mjs';
{ // a GPU crash restores the 2D contexts blank, with the identity transform: the HUD is sized and scaled again
  const hudNode = nodes.get('hud');
  assert.equal(typeof hudNode.listeners.contextrestored, 'function', 'the HUD listens for its 2D context restore');
  hudNode.width = 0;
  hudNode.listeners.contextrestored();
  assert(hudNode.width > 0, 'a context restore re-runs resize()');
}
{ // a WebGL context lost and never restored: after NO_RESTORE_MS on screen the music stops and the error card offers a reload
  const fails = [], reports = [], report = errors.report, paused = run('G.paused');
  context.window.__mulassaFail = (...a) => fails.push(a); errors.report = k => reports.push(k);
  try {
    run('renderer.lost = false; restoreLate();');
    assert(!fails.length && !reports.length, 'restored in time: nothing happens');
    run('renderer.lost = true; restoreLate();');
    assert.deepEqual(reports, ['webgl-not-restored'], 'never restored: reported');
    assert(fails.length === 1 && fails[0][2] === true, 'never restored: the error card, with a reload');
    assert.equal(fails[0][0], 'Ups! El joc s’ha aturat', 'its words from the catalogue');
    assert(run('G.paused'), 'and the run is held, so the pause menu never opens over the card');
  } finally { errors.report = report; delete context.window.__mulassaFail; run(`renderer.lost = false; G.paused = ${paused};`); }
}
{ // the text sprites' canvases are blanked too, each restoring on its own: any one coming back drops the cache, and a
  // sprite painted while its context is still lost is never kept (it would stay blank)
  const made = document.createElement, canvases = [], ctx = { lost: false, setTransform() {}, isContextLost() { return this.lost; } };
  document.createElement = tag => tag === 'canvas' ? (canvases.push({ listeners: {}, addEventListener(t, h) { this.listeners[t] = h; }, getContext: () => ctx }), canvases.at(-1)) : made(tag);
  const okBefore = run('spriteOk'), glyphsBefore = run('glyphsOk'); run('spriteOk = true; glyphsOk = true;');
  const probe = key => run(`sprite('${key}', 1, () => ({ w: 4, h: 4 }), () => {})`);
  assert(probe('restore-a') && run(`sprites.has('restore-a')`), 'a healthy sprite is cached');
  assert.equal(typeof canvases[0].listeners.contextrestored, 'function', 'each sprite canvas listens for its own restore');
  canvases[0].listeners.contextrestored();
  assert(!run(`sprites.has('restore-a')`), 'a restored (blank) sprite canvas drops the cache');
  ctx.lost = true;
  assert.equal(probe('restore-b'), null, 'painted into a lost context: drawn directly instead');
  assert(!run(`sprites.has('restore-b')`), 'and never cached blank');
  document.createElement = made; run(`spriteOk = ${okBefore}; glyphsOk = ${glyphsBefore}; sprites.clear(); spare.length = 0; spritePx = 0;`);
}
run('qualityLevel = peopleLevel = 0; applyRenderQuality();');
assert(run('crowd.some(p => !p.g.visible)'), 'downgrade hides some spectators');
assert(run('crowd.every(p => p.g.scale.x === (p.g.visible ? p.scale : 0))'), 'hidden spectators shrink to nothing in the skinned crowd mesh');
assert(run('[...crowd, ...plaza.band, ...plaza.balcony].every(p => { let n = 0; p.g.traverse(o => { if (o.isMesh) n++; }); return n === 0; }) && crowdMesh.isSkinnedMesh && crowdMesh.skeleton.bones.length === [...crowd, ...plaza.band, ...plaza.balcony].reduce((n, p) => n + 1 + p.legs.length + p.arms.length, 0)'),
  'the whole crowd, the band (instruments and all) and balcony people are one skinned mesh, its bones their own pivots');
assert(run('(() => { let plain = 0, shared = 0; scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) { plain++; if (o.material === crowdMesh.material) shared++; } }); return plain > 0 && shared === 0; })()'),
  'the skinned crowd has a material of its own (shared with plain meshes, three.js would switch programs twice a frame)');
assert(run('plaza.balcony.length > 20 && plaza.balcony.length <= PROFILES[2].balconies && plaza.balcony.every((p, i) => p.g.scale.x === (i < PROFILES[0].balconies ? 1 : 0))'), 'fewer balcony people at low');
assert(run('plaza.backdrop.mesh.count === PROFILES[0].backdrop && plaza.backdrop.n === PROFILES[2].backdrop'), 'the backdrop thins out at low');
assert(run('midCrowd.mesh.count === PROFILES[0].mid && midCrowd.n >= PROFILES[1].mid'), 'the mid band thins out at low');
run('qualityLevel = peopleLevel = 2; applyRenderQuality();');
assert(run('crowd.every(p => p.g.visible && p.g.scale.x === p.scale && p.scale === (p.kid ? 0.72 : 1)) && crowdMesh.castShadow'), 'upgraded again: everyone back at full size (kids smaller), casting shadows');
assert(run('plaza.balcony.every(p => p.g.scale.x === 1) && plaza.backdrop.mesh.count === PROFILES[2].backdrop'), 'balconies and the full backdrop come back');
// A runtime downgrade keeps its first exposed frame and retires every kind of spectator smoothly.
run(`qualityLevel = peopleLevel = 2; applyRenderQuality();
  var retiring = crowd.find(p => p.slot % 2 === 1), kept = crowd.find(p => p.row === 0 && p.slot % 2 === 0);
  retiring.pres = 0.7; retiring.g.scale.setScalar(retiring.scale * retiring.pres);
  var crowdBefore = retiring.g.scale.x, bandBefore = plaza.band[9].g.scale.x,
    backdropBefore = plaza.backdrop.mesh.count, midBefore = midCrowd.mesh.count;
  qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('retiring.g.visible && retiring.g.scale.x === crowdBefore && retiring.pres === 0.7'), 'a downgrade preserves the exposed pose and gameplay presence');
assert(run('plaza.backdrop.mesh.count === backdropBefore && midCrowd.mesh.count === midBefore && plaza.band[9].g.scale.x === bandBefore'), 'static spectators and musicians do not disappear on the profile switch');
run('animateRenderQuality(0);');
assert(run('retiring.g.scale.x === crowdBefore'), 'paused time cannot advance the quality transition');
run('animateRenderQuality(0.2);'); // the 0.4 s fade (quality.js QUALITY_FADE), halfway
assert(run('Math.abs(retiring.g.scale.x - crowdBefore / 2) < 1e-6 && activeCrowd.includes(retiring) && kept.qualityScale === 1'), 'halfway: retiring spectators shrink smoothly, stay simulated, and retained people keep their size');
assert(run('plaza.band[9].g.scale.x > 0 && plaza.band[9].g.scale.x < 1 && plaza.balcony.at(-1).g.scale.x > 0'), 'musicians and balconies also have intermediate sizes');
assert(run(`(() => { const m = new THREE.Matrix4(); plaza.backdrop.mesh.getMatrixAt(PROFILES[0].backdrop, m); return m.elements[0] ** 2 + m.elements[2] ** 2 > 0; })()`), 'retiring instanced spectators still have geometry halfway through');
run('animateRenderQuality(0.2);');
assert(run('!retiring.g.visible && retiring.g.scale.x === 0 && !activeCrowd.includes(retiring) && retiring.pres === 0.7'), 'completed retirement releases simulation without changing gameplay presence');
assert(run('plaza.backdrop.mesh.count === PROFILES[0].backdrop && midCrowd.mesh.count === Math.min(midCrowd.n, PROFILES[0].mid) && plaza.balcony.at(-1).g.scale.x === 0'), 'completed retirement restores the target drawing budgets');
run(`qualityLevel = peopleLevel = 2; applyRenderQuality({ transition: true }); animateRenderQuality(0.1);
  var reversingScale = retiring.g.scale.x; qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('retiring.g.scale.x === reversingScale'), 'a new profile continues from the currently visible size');
run('animateRenderQuality(2);');
for (const hz of [30, 60, 120]) {
  run(`qualityLevel = peopleLevel = 2; applyRenderQuality(); qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true });
    for (let i = 0; i <= 2 * ${hz}; i++) animateRenderQuality(1 / ${hz}); // (one frame over: summed 1/hz steps fall a hair short of 2 s)`);
  assert(run('!qualityTransition && !retiring.g.visible'), `quality retirement finishes at ${hz} fps`);
}
run('var calmBeforeQuality = CALM.matches; CALM.matches = true; qualityLevel = peopleLevel = 2; applyRenderQuality({ transition: true });');
assert(run('!qualityTransition && retiring.g.scale.x === retiring.scale'), 'reduced motion installs the final profile without scaling animation');
run('CALM.matches = calmBeforeQuality;');
run(`qualityLevel = peopleLevel = 0; applyRenderQuality(); var emerging = crowd.find(p => !p.g.visible);
  qualityLevel = peopleLevel = 2; applyRenderQuality({ transition: true }); animateRenderQuality(0.05);`);
assert(run('emerging.g.visible && emerging.qualityScale < 1 && activeCrowd.includes(emerging)'), 'a growing spectator is simulated before reaching full size');
run('animateRenderQuality(2);');
run(`qualityLevel = peopleLevel = 2; applyRenderQuality(); var bandBeforeMove = plaza.band[0].g.position.clone();
  qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('plaza.band[0].g.position.distanceTo(bandBeforeMove) < 1e-9'), 'a quality change cannot teleport the visible band');
run('animateRenderQuality(0.2); var bandMidMove = plaza.band[0].g.position.clone(); animateRenderQuality(0.2);');
assert(run('bandMidMove.distanceTo(bandBeforeMove) > 0.1 && plaza.band[0].g.position.distanceTo(bandMidMove) > 0.1'), 'the band travels through an intermediate position');

console.log('quality transitions: continuous presence, bounded retirement, reversal, reduced motion and 30/60/120 Hz ok');
// Changing shadow support needs new material programs, and a visible downgrade fades before releasing its map.
run(`qualityLevel = peopleLevel = 1; applyRenderQuality();
  var shadowFloor = plaza.group.children.find(o => o.isMesh && o.receiveShadow), shadowVersion = shadowFloor.material.version;
  var shadowDisposals = 0, fadingShadowMap = { dispose() { shadowDisposals++; } }; sun.shadow.map = fadingShadowMap;
  qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true });`);
assert(run('renderer.shadowMap.enabled && sun.shadow.map === fadingShadowMap && sun.shadow.intensity === 1'), 'a visible shadow downgrade preserves the first frame and its live map');
run('animateRenderQuality(0.2);');
assert(run('sun.shadow.intensity > 0 && sun.shadow.intensity < 1 && shadowDisposals === 0'), 'the shadow fades while its map remains available');
run('animateRenderQuality(0.2);');
assert(run('!renderer.shadowMap.enabled && sun.shadow.intensity === 0 && sun.shadow.map === null && shadowDisposals === 1'), 'only the completed fade turns shadows off and releases their GPU map');
assert(run('shadowFloor.material.version > shadowVersion'), 'receiving materials invalidate their shadow program when support turns off');
run(`shadowVersion = shadowFloor.material.version; qualityLevel = peopleLevel = 1; applyRenderQuality({ transition: true });`);
assert(run('renderer.shadowMap.enabled && sun.shadow.intensity === 0 && shadowFloor.material.version > shadowVersion'), 'returning shadows start at zero with the correct material programs');
run('animateRenderQuality(0.1); var interruptedShadow = sun.shadow.intensity; qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true });');
assert(run('sun.shadow.intensity === interruptedShadow'), 'reversing a shadow fade preserves its current light level');
run('animateRenderQuality(2); qualityLevel = peopleLevel = 1; applyRenderQuality();');
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
// The figure on show's line-up replaces the band in the same spot, whole at every quality; the others are hidden.
for (const q of [0, 1, 2]) {
  run(`qualityLevel = peopleLevel = ${q}; applyRenderQuality(); setBandLineup('cobla');`);
  const on = JSON.parse(run(`JSON.stringify(plaza.band.filter(p => p.g.scale.x > 0).map(p => ({ kind: p.kind, lineup: p.lineup, r: Math.hypot(p.g.position.x, p.g.position.z) })))`));
  assert.deepEqual(on.map(m => m.kind).sort(), ['flabiol', 'xeremies'], `quality ${q}: the whole mitja cobla`);
  assert(on.every(m => m.lineup === 'cobla' && m.r > 9.5 && m.r < 11), `quality ${q}: only the cobla, at the ring's edge`);
  assert.equal(run('bandSpots.length'), 2, `quality ${q}: the crowd keeps clear of the cobla, not of the band`);
  run(`setBandLineup('banda');`);
  assert.equal(run(`plaza.band.filter(p => p.lineup === 'cobla' && p.g.scale.x > 0).length`), 0, `quality ${q}: the cobla leaves with its figure`);
  assert.equal(run('bandSpots.length'), run(`PROFILES[${q}].band`), `quality ${q}: the band is back`);
}
// The hidden line-up costs nothing: out of the scene, and no triangle of its people in the crowd's index.
run(`var coblaBones = new Set(plaza.band.filter(p => p.lineup === 'cobla').flatMap(p => [p.torso, ...p.legs, ...p.arms]).map(b => crowdMesh.skeleton.bones.indexOf(b)));
  var drawsCobla = () => { const { index, attributes: { skinIndex } } = crowdMesh.geometry; for (let i = 0; i < index.count; i++) if (coblaBones.has(skinIndex.getX(index.getX(i)))) return true; return false; };`);
assert(!run('drawsCobla()') && run(`plaza.band.every(p => (p.g.parent !== null) === (p.lineup === 'banda'))`), 'the banda on show: the cobla is neither drawn nor in the scene');
run(`setBandLineup('cobla');`);
assert(run('drawsCobla()') && run(`plaza.band.every(p => (p.g.parent !== null) === (p.lineup === 'cobla'))`), 'the cobla on show: drawn, and the banda out of the scene');
run(`setBandLineup('banda');`);
// Free play: no musicians at all, and nobody keeps clear of them.
run(`setBandLineup(null);`);
assert.equal(run('plaza.band.filter(p => p.g.scale.x > 0).length + bandSpots.length'), 0, 'free play has no band');
run(`setBandLineup('banda');`);
// A quality fade cannot bring a line-up back once another has taken over.
run(`qualityLevel = peopleLevel = 2; applyRenderQuality(); qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true }); setBandLineup('cobla'); animateRenderQuality(1);`);
assert.equal(run(`plaza.band.filter(p => p.lineup === 'banda' && p.g.scale.x > 0).length`), 0, 'a fade under way leaves the band hidden');
assert.equal(run(`plaza.band.filter(p => p.lineup === 'cobla' && p.g.scale.x === 1).length`), 2, 'a fade under way leaves the cobla whole');
run(`setBandLineup('banda'); qualityLevel = peopleLevel = 2; applyRenderQuality(); qualityLevel = peopleLevel = 0; applyRenderQuality({ transition: true }); setBandLineup(null); setBandLineup('banda'); animateRenderQuality(0.1);`);
assert.equal(run(`plaza.band.filter(p => p.g.scale.x > 0).length`), run('PROFILES[0].band'), 'a fade from before free play cannot bring back the retired musicians');
run(`animateRenderQuality(1); setBandLineup('banda'); qualityLevel = peopleLevel = 2; applyRenderQuality();`);
// The band: as many as the quality allows (a full line-up at every size), at the ring's edge across the plaça from the
// play camera, facing the middle, never between the camera and her, with room in the ring; it plays on the song's beat.
for (const q of [0, 1, 2]) {
  run(`qualityLevel = peopleLevel = ${q}; applyRenderQuality();`);
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
run('qualityLevel = peopleLevel = 0; applyRenderQuality();');
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
// The confetti pool is sized at boot: a later step up the quality ladder asks for more pieces than it holds, and a burst
// then must throw what there is, not crash (it did, mid-song, on a page that had stepped up past its boot profile).
assert.doesNotThrow(() => run(`(() => { const saved = renderProfile; setRenderProfile({ ...renderProfile, confetti: conf.length * 2 });
  try { burst(0, 0); spawnConfetti(conf.length * 2, c => c.p.set(0, 5, 0)); } finally { setRenderProfile(saved); } })()`), 'a profile above the boot pool');
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
    chip = { suspend() { this.ctx.suspend(); }, resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {} }, resume() {}, stop() {}, menu() {}, sfx() {}, noiseHit() {}, blip() {}, wake() {},
      now: () => crowdNow, start: () => Promise.resolve(false) };
    qualityLevel = peopleLevel = 2; applyRenderQuality(); offsetMs = 0; startGame(1); G.state = 'play'; G.guapo = 80;
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
      animStage(dt, beat, 1);
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
