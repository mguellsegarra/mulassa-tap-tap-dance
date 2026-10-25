// select-flip.js: a pending figure's re-layout is slid from where things were painted, not jumped: one transform animation per element
// that moved, a child's relative to its container's, none for what stayed, none under reduced motion or before the selector shows.
import assert from 'node:assert/strict';
import { setupFlip } from '../../src/ui/select-flip.js';

const box = (x, y, parent = null) => ({ x, y, parentElement: parent, anims: [], getBoundingClientRect() { return { left: this.x, top: this.y, width: 10, height: 10 }; },
  animate(frames, opts) { const a = { frames, opts, cancel() {}, finished: new Promise(() => {}) }; this.anims.push(a); return a; } });
const row = box(100, 0), card = box(110, 0, row), still = box(500, 0, row), lone = box(0, 300);
let reduced = false, now = 0;
const flip = setupFlip({ win: { performance: { now: () => now }, getComputedStyle: () => ({ zoom: '1' }) }, root: {}, els: () => [row, card, still, lone], reduced: () => reduced });

flip.snap(true); row.x = 40; card.x = 40; lone.y = 340; flip.play(); // the row moves 60 left, its card 70, the lone button 40 down, `still` stays put
assert.equal(row.anims[0].frames.transform[0], 'translate(60px, 0px)', 'the container starts where it was painted');
assert.equal(card.anims[0].frames.transform[0], 'translate(10px, 0px)', 'a child slides relative to its container: 70 of its own, 60 of them come with the row');
assert.equal(still.anims[0].frames.transform[0], 'translate(-60px, 0px)', 'what stayed put in the page counters its container\'s slide');
assert.equal(lone.anims[0].frames.transform[0], 'translate(0px, -40px)');
flip.play(); assert.equal(row.anims.length, 1, 'play() consumes the snapshot: nothing animates twice');

for (const e of [row, card, still, lone]) e.anims.length = 0;
reduced = true; flip.snap(true); row.x = 0; flip.play(); assert.equal(row.anims.length, 0, 'reduced motion: no slide');
reduced = false; flip.snap(false); row.x = 100; flip.play(); assert.equal(row.anims.length, 0, 'the selector is not shown: no slide');
console.log('select-flip ok');
