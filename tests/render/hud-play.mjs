// The play HUD (progress, lane, streak, judging, feedback, finale), the dance and the play, title and menu cameras:
// contracts on the shared running game (game-context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { framePacer } from '../../src/platform/render-quality.js';
import { eventAge } from '../../src/game/progress.js';
import { THREE, chart, progress, practice, energy, framing, dance, errors, nodes, keyHandlers, windowHandlers, drawnText, hudWork, document, context, run } from './game-context.mjs';
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
run(`chip = { suspend() { this.ctx.suspend(); }, resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, sfx() {}, noiseHit() {}, blip() {}, now: () => songNow, start: () => Promise.resolve(false) };
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

// Dance integration (figures/mulassa/mula-dance.js + accents): the song's choreography owns the heading, hits only accent it and
// settle back, taps never pile up, holds release smoothly, misses recover, the practice holds its opening stance and a
// collapse freezes the song pose. No score, judgement or energy rule depends on any of it.
run(`chip = { suspend() { this.ctx.suspend(); }, resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, blip() {}, noiseHit() {},
    sfx() {}, now: () => songNow, start: () => Promise.resolve(false), startClock() {}, tick() {}, countIn() {} };
  var dp = newMulaPose(), dv = new THREE.Vector2(), frames = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { clock += dt; animStage(dt, beatAt(songNow)); } };
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
    for (let i = 0; i < 120; i++) { clock += 1 / 60; animStage(1 / 60, clock / BEAT); } return titlePose(); };
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
  for (let i = 0; i < 60 * 120; i++) { clock += 1 / 60; animStage(1 / 60, clock / BEAT);
    if (SHOWCASE.crema) { pairCremas++; SHOWCASE.crema = false; }
    pairStray = Math.max(pairStray, Math.hypot(PAIR.x - PAIR.w.hx, PAIR.z - PAIR.w.hz)); pairWalk = Math.max(pairWalk, Math.hypot(PAIR.x - pairFrom[0], PAIR.z - pairFrom[1]));
    for (const back of [0, PIVOT, 2 * PIVOT]) pairMin = Math.min(pairMin, Math.hypot(M.pivot.x - Math.sin(M.yaw) * back - PAIR.x, M.pivot.y - Math.cos(M.yaw) * back - PAIR.z)); }
  var pairShown = drac.root.visible && mula.root.visible && dracMat.opacity === 1; G.state = 'select';
  animStage(1 / 60, clock / BEAT);`);
assert(run('!drac.root.visible && mula.root.visible && PAIR.k === 0 && dracMat.opacity === 1'), 'first selector frame: Mulassa alone, no fade');
assert(run('pairWalk > 1 && pairStray < 2.5 && pairCremas >= 4'), `splash: the Drac wanders round its spot (${run('pairWalk.toFixed(1)')} m, never over ${run('pairStray.toFixed(1)')} m away) and burns now and then (${run('pairCremas')} CREMES)`);
// its shoes stay planted on the floor while it walks and turns (they skated along with it): a planted shoe moves
// under 1 cm in the world from one frame to the next, and they do step (each one lifts, the walk carries it on)
run(`var shoeSlip = 0, shoeLifted = 0, shoeDown = [false, false], shoeAt = [null, null], shoeWalked = 0, shoeFrom = [PAIR.x, PAIR.z]; G.state = 'splash'; PAIR.k = 1;
  for (let i = 0; i < 60 * 20; i++) { clock += 1 / 60; animStage(1 / 60, clock / BEAT); drac.root.parent.updateMatrixWorld(true);
    drac.legs.forEach(({ shoe }, k) => { const down = shoe.position.y === 0, q = shoe.getWorldPosition(new THREE.Vector3());
      if (down && shoeDown[k]) shoeSlip = Math.max(shoeSlip, Math.hypot(q.x - shoeAt[k].x, q.z - shoeAt[k].z)); if (!down) shoeLifted++;
      shoeDown[k] = down; shoeAt[k] = q; });
    shoeWalked = Math.max(shoeWalked, Math.hypot(PAIR.x - shoeFrom[0], PAIR.z - shoeFrom[1])); }
  G.state = 'select'; for (let i = 0; i < 60; i++) { clock += 1 / 60; animStage(1 / 60, clock / BEAT); }`);
assert(run('shoeSlip < 0.01 && shoeLifted > 0 && shoeWalked > 0.5'), `the splash Drac's planted shoes hold the floor (shoeSlip ${run('(shoeSlip * 1000).toFixed(1)')} mm a frame, shoeWalked ${run('shoeWalked.toFixed(1)')} m)`);
assert(run('pairShown && pairMin > PAIR.clear - 0.05'), `splash: both figures shown, the Mulassa clear of the Drac (closest ${run('pairMin.toFixed(2)')} m)`);
assert(run('!drac.root.visible && PAIR.k === 0'), 'after the splash the Drac stays hidden');
run('var smokeMax = renderProfile.smoke; renderProfile.smoke = 96; dracFrame(1 / 60, 0); dracFrame(1 / 60, 0); var exitSmoke = dracFx.state().smoke; renderProfile.smoke = smokeMax;');
assert.equal(run('exitSmoke'), 0, 'entering the selector emits no exit smoke');
run('setFigureSong(DRAC); animStage(1 / 60, clock / BEAT);');
assert(run('drac.root.visible && !mula.root.visible && dracMat.opacity === 1'), 'Drac can still be selected at full opacity');
run('setFigureSong(MULASSA); animStage(1 / 60, clock / BEAT);');
console.log('dance integration contracts ok');

// Play camera (framePlayCamera): low and steady. Through the song's half turn and the finale's quick turns it keeps a
// cinematic angle, hardly changes distance, never jerks, keeps her whole silhouette in the stage every frame, and
// takes the same path at 30 and 60 fps. Taps never move it; entering play glides on from the title camera.
for (const [w, h, padPixels, touch] of [[393, 852, 695, true], [375, 667, 537, true], [1280, 800, 800, false], [1366, 1024, 871, true], [667, 375, 375, false]]) {
  context.innerWidth = w; context.innerHeight = h;
  nodes.get('pad').getBoundingClientRect = () => ({ top: padPixels });
  run(`COARSE.matches = ${touch}; SAFE.t = SAFE.b = 0; resize(); padTop = null;`);
  const sim = fps => JSON.parse(run(`(() => {
    toTitle(); G.state = 'select'; clock = 2000; camera.position.set(8, 6, 9); camera.lookAt(0, 1.2, 0); camFocus.set(0, 1.2, 0); CAMS.live = false;
    startGame(1); G.state = 'play'; M.missT = -9; trauma = 0;
    const dt = 1 / ${fps}, out = { maxAcc: 0, maxLookAcc: 0, el: [90, 0], dist: [1e9, 0], outside: -1e9, firstStep: 0, end: null }, v = new THREE.Vector3(), look = new THREE.Vector3();
    let p1 = null, p2 = null, l1 = null, l2 = null, first = true;
    for (const [a, b] of [[BEATS[64], BEATS[90]], [BEATS[204], BEATS[220]]]) for (songNow = a - 7; songNow < b; songNow += dt) { // (after a seek: 7 s to settle: the springs are slow, on purpose)
      clock += dt; animStage(dt, beatAt(songNow)); const shift = framePlayCamera(dt, M.pos.x, M.pos.y); camShift = shift;
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
  for (let i = 0; i < 1500; i++) { clock += 1 / 60; animStage(1 / 60, beatAt(songNow)); framePlayCamera(1 / 60, M.pos.x, M.pos.y); }
  var camBefore = camera.position.clone(); for (let i = 0; i < 20; i++) { act(i % 2 ? 'L' : 'B'); clock += 1 / 60; animStage(1 / 60, beatAt(songNow)); framePlayCamera(1 / 60, M.pos.x, M.pos.y); }`);
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
  run(`G.state = 'play'; fpsTick(0);`);
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
  run(`G.state = 'play'; pace.lowPower = true; pace.fps = 30; for (let i = 1; i <= 30; i++) fpsTick(2000 + i * 1000 / 30);`); // (the hint is a run's: the selector keeps its rail clean)
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
  sw.checked = false; sw.listeners.change(); run(`G.state = 'select'; pace.fps = 60; fpsTick(6800);`);
  assert(fps.hidden && saved.fps === 'off', 'switched off: gone and remembered');
  delete fps.showPopover; delete fps.hidePopover;
}
console.log('frame-rate independence and FPS readout ok');

// Selector input stays locked to its showreel; the splash accepts the entry gesture.
{
  const hud = nodes.get('hud'), k = run('K'), up = id => (windowHandlers.pointerup || []).forEach(h => h({ pointerId: id }));
  const ev = (id, x, y, more = {}) => ({ pointerId: id, clientX: x * k, clientY: y * k, pointerType: 'touch', button: 0, preventDefault() {}, ...more });
  { // the selector: the camera is the showreel's: no drag turns it, no wheel or pinch zooms it, and the page never zooms
    run("G.state = 'select'; setView(false); orbitCancel(orbit);");
    const y = run('orbit.yaw'), z = run('orbit.zoomTo'); let kept = false;
    hud.listeners.pointerdown(ev(6, 20, 60)); for (let x = 20; x <= 140; x += 10) hud.listeners.pointermove(ev(6, x, 60)); up(6);
    hud.listeners.wheel(ev(0, 0, 0, { deltaY: 100, deltaMode: 0, ctrlKey: true, preventDefault() { kept = true; } }));
    assert(run('orbit.ptrs.size === 0') && run('orbit.yaw') === y && run('orbit.zoomTo') === z && kept, 'selector: no drag, no zoom, no page zoom');
    run("G.state = 'select';");
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
  run(`if (chip) chip.wake ??= () => {}; var unlocks = 0, realUnlock = unlock; unlock = () => unlocks++; G.state = 'splash'; orbitCancel(orbit);`);
  hud.listeners.pointerdown(ev(5, 20, 60)); up(5);
  assert.equal(run('unlocks'), 1, 'splash: a tap anywhere goes in');
  keyDown('KeyA'); keyDown('Space');
  assert.equal(run('unlocks'), 3, 'splash: any key goes in');
  run(`unlock = realUnlock; G.state = 'select';`);
}
console.log('selector camera lock and splash entry ok');
// A stalled render must not discard a held orbit in the menu camera itself.
{
  let tt = 300000;
  const step = ms => run(`performance.now = () => ${tt += ms}; frameMenuCamera(${ms / 1000}, 0, 0, null, null, 0);`);
  run("G.state = 'select'; orbitCancel(orbit);"); step(16); step(16);
  run('orbitDown(orbit, 9, 100, 100, pnow()); orbitMove(orbit, 9, 160, 100, pnow()); orbitMove(orbit, 9, 260, 100, pnow());');
  const held = run('orbit.yaw'); step(16); step(300); step(16);
  assert(Math.abs(run('orbit.yaw') - held) < 1e-9 && run('orbit.ptrs.size') === 1, 'a 300 ms frame keeps the held camera drag');
  run('orbitCancel(orbit); performance.now = () => 0;');
}

// «Mode foto» (#viewmode, selector only): every control, tip and the HUD go (inert, the body class fades them), the camera
// still steers, a tap or a key picks nothing, no sheet opens; Escape or the same button (H does nothing) bring it all back.
{
  const btn = nodes.get('viewmode'), hud = nodes.get('hud'), k = run('K'), cls = new Set(), attrs = {}, idle = new Set();
  const bodyCl = document.body.classList;
  document.body.classList = { contains: c => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } };
  btn.setAttribute = (a, v) => { attrs[a] = v; };
  btn.classList = { add: c => idle.add(c), remove: c => idle.delete(c), toggle() {} };
  let focused = null; btn.focus = () => { focused = btn; };
  const HIDES = ['settings', 'music', 'howto', 'fps'];
  const keyDown = code => keyHandlers.forEach(h => h({ code, target: { tagName: 'BODY' }, preventDefault() {} }));
  const up = id => (windowHandlers.pointerup || []).forEach(h => h({ pointerId: id }));
  const ev = (id, x, y) => ({ pointerId: id, clientX: x * k, clientY: y * k, pointerType: 'touch', button: 0, preventDefault() {} });
  const tapTwice = () => { for (const id of [90, 91]) { hud.listeners.pointerdown(ev(id, 20, 160)); hud.listeners.pointerup?.(ev(id, 20, 160)); up(id); } };
  let t = 20000; const frames = n => { for (let i = 0; i < n; i++) run(`frame(${t += 1000 / 60})`); };
  run(`var picked = [], realChoose = choose; choose = i => picked.push(i); G.state = 'results'; G.resT = clock; G.sel = 0; orbitCancel(orbit); updateControls(); if (chip && !chip.wake) chip.wake = () => {};`);
  assert.equal(btn.hidden, true, 'no eye on results');
  keyDown('KeyH'); tapTwice();
  assert(!run('viewMode'), 'H and two world taps do nothing outside the selector');
  frames(3);
  assert(hudWork.ops > 0, 'results draw their HUD');
  for (const state of ['play', 'results']) { run(`G.state = '${state}'; G.paused = false; G.resT = clock; updateControls();`); assert(btn.hidden, `no eye during ${state}`); }
  run(`G.state = 'select'; sheets.select.figure = selectedFigure; sheets.select.pending = false; updateControls();`);
  assert(btn.hidden, 'the selector enters free play from its dock: no eye in its corner');
  keyDown('KeyH'); assert(!run('viewMode'), 'H does not enter free play');
  run('setView(true)');
  assert(run('viewMode') && nodes.get('select').inert, 'free play hides and disables selector controls');
  keyDown('Escape');
  assert(!run('viewMode') && !nodes.get('select').inert && run("G.state === 'select'"), 'one Escape leaves free play, same selector state');
  const tapWorld = id => { hud.listeners.pointerdown(ev(id, 20, 160)); hud.listeners.pointerup?.(ev(id, 20, 160)); up(id); };
  tapWorld(21); tapWorld(22);
  assert(!run('viewMode'), 'two still world taps no longer open the old photo mode');
  assert(run("G.state === 'select' && picked.length === 0"), 'world taps never start a game');
  run(`choose = realChoose; G.state = 'select'; orbitCancel(orbit); updateControls();`);
  document.body.classList = bodyCl;
}
console.log('view mode ok');
