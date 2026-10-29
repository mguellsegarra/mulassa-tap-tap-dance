// L'ÀNIM DE LA PLAÇA: the energy bar's tuning, independent of the game loop.
import assert from 'node:assert/strict';
import { ENERGY, WARN, drain, warnings } from '../../src/game/energy.js';

const missesToEmpty = diff => { let e = 1, k = 0; while (e > 0 && k < 100) { e = drain(e, diff, 'miss'); k++; } return k; };
const [easy, normal, hard] = [0, 1, 2].map(missesToEmpty);
assert(easy >= 12 && easy <= 15, `FÀCIL: 12-15 misses in a row from full (${easy})`);
assert.equal(normal, 10, 'NORMAL: 10 misses in a row');
assert.equal(hard, 8, 'DIFÍCIL: 8 misses in a row');

const alternate = (diff, kind, pairs = 200) => { let e = 1; for (let i = 0; i < pairs; i++) { e = drain(e, diff, 'miss'); if (!e) return 0; e = drain(e, diff, kind); } return e; };
assert(alternate(0, 'good') > 0.9 && alternate(0, 'perfect') > 0.9, 'FÀCIL: one hit, one miss survives');
assert.equal(alternate(2, 'perfect'), 0, 'DIFÍCIL: one hit, one miss loses...');
let e = 1, pairs = 0; while (e > 0) { pairs++; e = drain(e, 2, 'miss'); if (e) e = drain(e, 2, 'perfect'); }
assert(pairs >= 15, `...but slowly (${pairs} pairs)`);
for (const k of ENERGY) assert(k.perfect > k.good && k.bonus > 0, 'perfect refills more than good, specials more still');
assert(Math.abs(drain(0.5, 1, 'good', true) - drain(0.5, 1, 'good') - ENERGY[1].bonus) < 1e-9, 'a finished GUAPA / MANTÉN / GLOBUS adds the bonus');
assert.equal(drain(0.99, 0, 'perfect', true), 1, 'never over full');

const armed = [true, true];
assert.deepEqual(warnings(0.6, armed), []);
assert.deepEqual(warnings(0.3, armed), [WARN[0][2]], 'AGUANTEU under 35%');
assert.deepEqual(warnings(0.32, armed), [], 'once per dip');
assert.deepEqual(warnings(0.1, armed), [WARN[1][2]], 'NO PODEM MÉS under 15%');
assert.deepEqual(warnings(0.05, armed), []);
warnings(0.6, armed);
assert.deepEqual(armed, [true, true], 're-armed once the plaça cheers up');
assert.deepEqual(warnings(0.3, armed), [WARN[0][2]], 'and warns again on the next dip');
console.log('energy tuning ok', { easy, normal, hard, hardAlternatePairs: pairs });
