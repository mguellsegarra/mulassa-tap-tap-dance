// Campanar (POC): the end's camera. A tall tower is first framed close at its top and held there until the crown has
// grown, then eased out to the whole tower; a short one goes straight to the whole, with no pointless second move.
import assert from 'node:assert/strict';
import { SIZE, FLOOR } from '../../src/jocs/games/campanar/rules.js';
import { endShot, stepEndShot, widenEndShot } from '../../src/jocs/games/campanar/end-camera.js';

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
console.log('campanar end camera ok');
