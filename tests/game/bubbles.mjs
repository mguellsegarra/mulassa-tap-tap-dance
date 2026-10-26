// Crowd bubbles: the distraction tuning and the placement rule, independent of the game loop.
import assert from 'node:assert/strict';
import { TALK, CHATTER, rattled, mayTalk, restTimeline, updateRest, placeBubble } from '../../src/game/bubble-rules.js';

const ok = { live: true, restAvailable: true, rattled: false, sinceMiss: 9, onScreen: 0, sinceLast: 9, combo: 5, energy: 1 };
const may = (kind, diff, s = {}) => mayTalk(kind, { ...ok, diff, ...s });
for (const d of [0, 1, 2]) {
  assert(may('crowd', d) && may('chatter', d), 'all difficulties allow speech in rests');
  assert(!may('celebrate', d) && may('celebrate', d, { combo: 20 }), 'celebration threshold still applies');
  assert.equal(TALK[d].gap, 8); assert.equal(TALK[d].max, 1);
  for (const s of [{ live: false }, { restAvailable: false }, { rattled: true }, { sinceMiss: 1 }, { sinceLast: 7.99 }, { onScreen: 1 }]) {
    for (const k of ['crowd', 'chatter', 'celebrate']) assert(!may(k, d, { combo: 40, ...s }), `hushed: ${JSON.stringify(s)}`);
  }
  assert(!may('must', d), 'mandatory speech cannot bypass active-play policy');
  assert(!may('must', d, { live: false }), 'collapse has its own caption, no mandatory bubble bypass');
  assert(!may('ooh', d) && !may('peek', d), 'physical miss reactions replace text');
}
const rest = restTimeline([{ t: 1, end: 3 }, { t: 5, end: 8, balloon: true }, { t: 12 }, { t: 16 }]);
assert(!updateRest(rest, 0).available, 'no rest before the first event');
assert(!updateRest(rest, 2).available, 'hold tail is playable');
assert(!updateRest(rest, 3.4).available, 'next note must leave 2.2 seconds');
assert(!updateRest(rest, 7).available, 'balloon tail is playable');
assert(!updateRest(rest, 8.39).available, 'wait 0.4 seconds after the previous tail');
assert(updateRest(rest, 8.4).available, 'a real rest after the balloon');
assert(!updateRest(rest, 8.4, true).available, 'active interaction or GUAPA pair blocks speech');
assert(updateRest(rest, 9.8).available, 'exactly 2.2 seconds remain');
assert(!updateRest(rest, 9.81).available, 'too late to start a readable bubble');
assert(updateRest(rest, 12.4).available, 'a rest after a regular tap');
assert.equal(updateRest(rest, 15.81).remaining < 0.2, true, 'clear before the next note');
assert(!updateRest(rest, 1).available && rest.cursor === 1, 'rewinding resets the cursor');
const zeroEnd = restTimeline([{ t: 5, end: 0 }, { t: 10, end: 0 }]);
assert(!updateRest(zeroEnd, 5.39).available && zeroEnd.previousEnd === 5, 'generated tap charts use end: 0, not a zero-time tail');
assert(updateRest(zeroEnd, 5.4).available, 'rest starts after the tap itself');
const overlap = restTimeline([{ t: 1, end: 10 }, { t: 2 }, { t: 15 }]);
assert(!updateRest(overlap, 5).available, 'a tap inside a hold does not truncate its tail');
assert(updateRest(overlap, 10.4).available, 'overlapping tails have ended');
assert(!updateRest(restTimeline([]), 10).available, 'empty charts never offer a rest');
assert(CHATTER.every(w => w.length <= 24 && w === w.toUpperCase()), 'short, shouted chatter');

let r = rattled(false, { streak: 2, combo: 0, energy: 1 });
assert(r && rattled(false, { streak: 0, combo: 9, energy: 0.4 }), 'a miss streak or a low ànim shakes the player');
r = rattled(r, { streak: 0, combo: 3, energy: 0.8 });
assert(r && !rattled(r, { streak: 0, combo: 4, energy: 0.5 }), 'recovered after 4 hits in a row with the ànim ≥ 50%');

const view = { l: 10, t: 100, r: 300, b: 400 };
const inside = (p, w, h) => p.x - w / 2 >= view.l && p.x + w / 2 <= view.r && p.y0 >= view.t && p.y1 <= view.b && p.y1 <= p.tipY;
for (const a of [[12, 200], [298, 399], [150, 100 + 14 + 3], [150, 250]]) {
  const p = placeBubble(a, 80, 14, 7, view);
  assert(p && inside(p, 80, 14) && p.tipX === a[0] && p.tipY === a[1], `whole inside, tail on the speaker at ${a}`);
  assert(p.baseX >= p.x - 40 + 6 && p.baseX <= p.x + 40 - 6, 'the tail leaves from the body');
}
for (const a of [null, [5, 200], [305, 200], [150, 401], [150, 110], [150, -50]]) assert.equal(placeBubble(a, 80, 14, 7, view), null, `no spot for ${a}`);
assert.equal(placeBubble([150, 300], 400, 14, 7, view), null, 'too wide');
const first = placeBubble([150, 300], 80, 14, 7, view);
assert.equal(placeBubble([160, 305], 80, 14, 7, view, [{ x0: first.x - 40, y0: first.y0, x1: first.x + 40, y1: first.y1 }]), null, 'never over another bubble');
console.log('crowd bubbles ok');
