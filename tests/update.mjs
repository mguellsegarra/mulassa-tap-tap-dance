// The woken app's update check (src/services/update-rules.js): reload only for a different, untried build, only when quiet.
import assert from 'node:assert/strict';
import { shouldReload, quietMoment } from '../src/services/update-rules.js';
assert(shouldReload('1.2.1+abc1234', '1.2.0+def5678', null), 'a newer deploy reloads');
assert(!shouldReload('1.2.0+def5678', '1.2.0+def5678', null), 'the same build stays');
assert(!shouldReload('1.2.1+abc1234', '1.2.0+def5678', '1.2.1+abc1234'), 'a reload already tried for it: no loop on a stale CDN');
assert(!shouldReload(undefined, '1.2.0+def5678', null), 'no build in the file: nothing');
const doc = open => ({ querySelector: () => (open ? {} : null) });
assert(quietMoment('select', doc(false)) && quietMoment('splash', doc(false)), 'the menus with nothing open are quiet');
assert(!quietMoment('play', doc(false)) && !quietMoment('results', doc(false)), 'never mid-song or on the results');
assert(!quietMoment('select', doc(true)), 'never under a sheet or a typed field');
console.log('update check: newer builds only, once, on a quiet menu ok');
