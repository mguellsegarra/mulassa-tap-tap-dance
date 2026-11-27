// Campanar (POC): the end's camera. A tall tower is first framed close at its top and held there until the crown has
// grown, then eased out to the whole tower; a short one goes straight to the whole, with no pointless second move.
import assert from 'node:assert/strict';
import { SIZE, FLOOR } from '../../src/jocs/games/campanar/rules.js';
import { endShot, stepEndShot, widenEndShot, focusEndShot, zoomEndShot } from '../../src/jocs/games/campanar/end-camera.js';
import { createTowerTurn } from '../../src/jocs/games/campanar/turn.js';

const fit = half => Math.max(1, half / Math.tan(25 * Math.PI / 180) / (2.3 * Math.sqrt(3) * SIZE)); // as scene.js's
const look = { tilt: 0.35, lens: 1.8 };
const run = (o, s) => { for (let t = 0; t < s; t += 1 / 60) stepEndShot(o, 1 / 60); return o; };

// a tall tower (~85 m): close on the top, held while the crown grows (the fallback start is later than this)
const tall = endShot(48 * FLOOR, 48 * FLOOR, fit, look);
assert.notEqual(tall.near, tall.whole, 'a tall tower gets the close shot first');
run(tall, 1.2);
assert(Math.abs(tall.y - tall.near[0]) < 1e-6 && Math.abs(tall.k - tall.near[1] * look.lens) < 1e-6, 'held on the top');
assert.equal(tall.zoom, look.lens);
widenEndShot(tall); // the crown has grown
const held = tall.k;
run(tall, 0.3);
assert.equal(tall.k, held, 'a moment on the grown crown before moving');
run(tall, 2);
assert(Math.abs(tall.y - tall.whole[0]) < 1e-6 && Math.abs(tall.k - tall.whole[1] * look.lens) < 1e-6, 'then the whole tower');
assert(tall.whole[1] > 2 * tall.near[1], 'the whole is well farther: the move is worth it');
// never stuck close: without the crown's signal the ease out still starts
assert(Math.abs(run(endShot(48 * FLOOR, 48 * FLOOR, fit, look), 4.5).k - tall.k) < 1e-6);

// a short tower (~32 m): one move, straight to the whole, as before the close shot existed
const short = endShot(18 * FLOOR, 18 * FLOOR, fit, look);
assert.equal(short.near, short.whole, 'a short tower goes straight whole');
run(short, 0.8);
const k = short.k, y = short.y;
widenEndShot(short);
run(short, 3);
assert.equal(short.k, k);
assert.equal(short.y, y);

// a piece from the collection (pieces.js): in and over to it as one move, the piece never out of the view on the way
// (its offset from the view's middle, in the view's half heights, stays inside ±1), then still and centred, as close as
// play; the player's fingers take over at once; nothing while the camera is still easing out
const UNDER = 0.3 * SIZE, off = (o, y) => (y - (o.ey - UNDER * o.f)) / (o.f * o.span);
for (const piece of [3 * FLOOR, 30 * FLOOR, 200 * FLOOR]) { // on a 440 m tower: a zoom and a pan eased apart lost these from view (up to 1.85)
  const o = run(endShot(250 * FLOOR, 250 * FLOOR, fit, look), 0.5);
  focusEndShot(o, piece);
  assert.equal(o.focus, undefined, 'not while still easing out');
  widenEndShot(o);
  run(o, 3);
  focusEndShot(o, piece);
  let worst = 0;
  for (let t = 0; t < 2; t += 1 / 60) { stepEndShot(o, 1 / 60); worst = Math.max(worst, Math.abs(off(o, piece))); }
  assert(worst <= 1, `the piece at ${piece.toFixed(1)} stays in view (${worst.toFixed(2)})`);
  assert.equal(o.focus, null, 'arrived');
  assert.equal(o.ez, 1, 'as close as the player can zoom');
  if (piece === 30 * FLOOR) assert(Math.abs(off(o, piece)) < 0.02, 'centred (low and high ones are held back by the foot and the cross)');
}
const user = run(endShot(48 * FLOOR, 48 * FLOOR, fit, look), 0.5);
widenEndShot(user);
run(user, 3);
focusEndShot(user, 10 * FLOOR);
run(user, 0.3);
zoomEndShot(user, 0.5, 0);
assert.equal(user.focus, null, "the player's pinch stops the move");

// the free look goes back round to the front (where the special pieces are) the shorter way, never faster than the
// camera skill's 0.55 rad/s
const turn = createTowerTurn(0), cam = { position: { set(x, y, z) { this.a = Math.atan2(x, z); } } };
turn.drag(-Math.PI * 0.8 / 0.006, 0, 0);
turn.letGo(false);
turn.front();
let last = turn.spin, fastest = 0;
for (let t = 0; t < 8; t += 1 / 60) { turn.place(cam, 1, 1, 0, 1 / 60); fastest = Math.max(fastest, Math.abs(turn.spin - last) * 60); last = turn.spin; }
assert(Math.abs(turn.spin) < 1e-3, 'back to the front');
assert(fastest <= 0.55 + 1e-9, `at most 0.55 rad/s (${fastest.toFixed(3)})`);
console.log('campanar end camera ok');
