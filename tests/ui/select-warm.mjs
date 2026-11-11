// The selector's rehearsal under the page cover (src/ui/select-warm.js): once, at least its time, let go when never smooth.
import assert from 'node:assert/strict';
import { rehearseSelect, selectRehearsing } from '../../src/ui/select-warm.js';
assert(!selectRehearsing(), 'nothing before the cover asks');
assert.equal(rehearseSelect(1000, true, true), false, 'the first ask starts it'); assert(selectRehearsing());
assert.equal(rehearseSelect(1800, true, true), false, 'smooth, but its time is not up');
assert.equal(rehearseSelect(2400, false, true), false, 'its time up, still stuttering: it waits');
assert.equal(rehearseSelect(2500, true, true), true, 'smooth again: over'); assert(!selectRehearsing());
assert.equal(rehearseSelect(9000, true, true), true, 'once only');
console.log('select rehearsal ok');
