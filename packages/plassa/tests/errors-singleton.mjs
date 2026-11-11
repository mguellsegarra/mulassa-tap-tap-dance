// One crash reporter a page: a game page loads Plassa's errors.js and the main game's (through the ⚙ sheets' leaderboard).
// A second createErrors on the same window must hand back the first, or Sentry starts twice and the second client has no game context.
import assert from 'node:assert/strict';
import { createErrors } from '../src/errors.js';

const win = { listeners: 0, timers: 0, addEventListener() { this.listeners++; }, removeEventListener() {}, setTimeout() { this.timers++; } };
const first = createErrors({ mode: 'production', win, load: async () => ({}) });
const listeners = win.listeners, timers = win.timers;
const second = createErrors({ mode: 'production', win, load: async () => { throw new Error('a second Sentry'); } });
assert.equal(second, first, 'the window\'s reporter is the first one');
assert.deepEqual([win.listeners, win.timers], [listeners, timers], 'no second set of listeners and 20 s timer');
assert.notEqual(createErrors({ mode: 'production', win: { ...win, __mulassaErrors: undefined }, load: async () => ({}) }), first, 'another window has its own');
assert.equal(createErrors({ mode: null, win }).on, false, 'off stays off');
console.log('errors: one reporter a page ok');
