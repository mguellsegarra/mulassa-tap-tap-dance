// The game-over blast (board-blast.js): the culprit goes first, the board is empty before the end sheet, no figure jumps
// when the wave reaches it or blinks out at full size when it leaves, and no two blasts in a row look alike.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document = { createElement: () => ({ style: {}, animate() {} }) };
const { createBlast } = await import('../../src/jocs/games/pop/board-blast.js');
const { fresh } = await import('../../src/jocs/games/pop/fresh.js');

const END_SHEET = +readFileSync(new URL('../../src/jocs/games/pop/main.js', import.meta.url), 'utf8').match(/setTimeout\(showEnd, (\d+)\)/)[1] / 1000; // gameOver()'s
const PITCH = 2, PITCH_Z = 2.2;
const sky = { intensity: 2.2 };
let bursts = [];
const sparks = { burst: (c, colours) => bursts.push(colours), ring() {}, flame() {} };
const blast = createBlast({ after() {} }, sparks, sky);
const col = { multiplyScalar() {} };
function start(cols, rows, culprit) {
  const centres = Array.from({ length: cols * rows }, (_, i) => ({ x: (i % cols) * PITCH, z: Math.floor(i / cols) * PITCH_Z }));
  blast.reset(centres.length);
  blast.start(centres, culprit, { x: 0, y: 0 }, cols, PITCH, PITCH_Z, 0);
  return centres.length;
}
// what tells one blast from another: the wave's timing, the fling's path, the colours of the bangs
const look = n => ({ wave: Array.from({ length: n }, (_, i) => blast.progress(i, 0)), fling: { ...blast.place(0, .5, col) } });

test('every blast starts at the culprit, empties the board before the end sheet, and no figure jumps or blinks out', () => {
  // the mix is random: many blasts in a row see every wave and every fling
  const waves = new Set(), flings = new Set();
  for (const [cols, rows] of [[4, 6], [6, 4]]) for (let round = 0; round < 8; round++) for (let culprit = 0; culprit < cols * rows; culprit++) {
    const n = start(cols, rows, culprit), { wave, fling } = look(n);
    waves.add(wave.map(d => d.toFixed(3)).join()); flings.add(JSON.stringify(fling));
    assert.equal(blast.progress(culprit, 0), 0, 'the culprit goes first');
    for (let i = 0; i < n; i++) {
      assert.ok(blast.progress(i, 0) <= 0, `cell ${i} before the culprit`);
      assert.ok(blast.progress(i, END_SHEET - .2) >= 1, `${cols}x${rows}: cell ${i} still flying when the end sheet comes`);
    }
    for (const i of [0, culprit, n - 1]) {
      const a = Object.fromEntries(Object.entries(blast.place(i, 0, col)).map(([k, v]) => [k, v + 0])) /* -0 is still home */, b = { ...blast.place(i, 1, col) };
      assert.deepEqual(a, { x: 0, y: 0, z: 0, ry: 0, rz: 0, sx: 1, sy: 1 }, 'no jump as the wave arrives');
      assert.ok(Math.abs(b.sx) < 1e-6 && Math.abs(b.sy) < 1e-6, `cell ${i} blinks out at ${b.sx.toFixed(2)}x${b.sy.toFixed(2)}`);
    }
  }
  assert.ok(waves.size > 4 && flings.size >= 4, 'every wave and fling came up'); // the traca's timing is random: more than 4 waves' looks
});

test('two blasts in a row never share a wave, a fling or a colour', () => {
  let before = null;
  for (let k = 0; k < 300; k++) {
    bursts = [];
    start(4, 6, 9);
    for (let t = 1 / 60; t < END_SHEET; t += 1 / 60) blast.step(t, 1 / 60);
    const now = { ...look(24), colours: bursts[0].join() };
    if (before) {
      assert.notDeepEqual(now.fling, before.fling, `blast ${k}: the same fling again`);
      assert.notEqual(now.colours, before.colours, `blast ${k}: the same colours again`);
      assert.notDeepEqual(now.wave, before.wave, `blast ${k}: the same wave again`); // a traca twice would pass: its timing is random; fresh() is tested below
    }
    before = now;
  }
});

test('each cell bangs once, whatever the frame rate, and the light comes back to day', () => {
  for (const hz of [60, 90, 120]) for (let culprit = 0; culprit < 24; culprit++) for (let round = 0; round < 4; round++) {
    const n = start(4, 6, culprit);
    bursts = [];
    let kick = 0, t = 0;
    while (t < END_SHEET) { t += 1 / hz; kick += blast.step(t, 1 / hz); } // summed like board.js's clock, not k / hz
    assert.equal(bursts.length, n, `${hz} Hz, culprit ${culprit}`);
    assert.ok(kick > 0);
    assert.equal(sky.intensity, 2.2);
  }
});

test('fresh(): never the same twice in a row, and every item comes up as often', () => {
  const next = fresh(['a', 'b', 'c', 'd']), seen = { a: 0, b: 0, c: 0, d: 0 };
  let last = null;
  for (let k = 0; k < 4000; k++) {
    const x = next();
    assert.notEqual(x, last);
    seen[x] += 1;
    last = x;
  }
  for (const n of Object.values(seen)) assert.ok(n > 850 && n < 1150, JSON.stringify(seen));
});
