import assert from 'node:assert/strict';
import { RIPPLE, pulses, pushPulse, ripple, rippleLive } from '../src/scene/crowd-fx.js';

assert(!rippleLive(0), 'no pulse, nobody reads anything');
pushPulse(10, 1, 1); // a GUA at t = 10, everyone answers
assert(rippleLive(10.5) && !rippleLive(10 + 5), 'live while a pulse can still reach someone, then off');
assert.equal(ripple(10, 6, 1, 0), 0, 'the pulse has not reached 6 m yet');
const at = d => Math.max(...Array.from({ length: 200 }, (_, i) => ripple(10 + i * 0.01, d, 1, 0)));
assert(at(2) > 0.9 && at(8) > 0.9, 'it reaches near and far with its full strength');
assert(ripple(10 + 3 / RIPPLE.speed, 3, 1, 0) === 0 && ripple(10 + 3, 3, 1, 0) === 0, 'it starts (when it arrives) and ends at zero');
assert(ripple(10 + 2 / RIPPLE.speed + 0.09, 8, 1, 0) === 0 && ripple(10 + 8 / RIPPLE.speed + 0.09, 8, 1, 0) > 0.9, 'far people answer later, not less');
assert(ripple(10.1, 0, 1, 0) > ripple(10.1, 0, -1, 0) * 4, 'a GUA (+1) lifts the left of the screen more than the right');
assert(ripple(10.1, 0, 1, 0.99) > 0, 'share 1: everyone answers');
pulses.length = 0; pushPulse(0, 1, 0, 0.3);
assert(ripple(0.1, 0, 0, 0.2) > 0 && ripple(0.1, 0, 0, 0.5) === 0, 'share 0.3: only a third of the people answer');
for (let i = 0; i < 20; i++) pushPulse(i, 1);
assert.equal(pulses.length, RIPPLE.max, 'never more than max live pulses (no growth)');
console.log('crowd ripple ok');
