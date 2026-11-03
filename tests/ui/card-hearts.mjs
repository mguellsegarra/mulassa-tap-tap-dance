// Each selector card shows its figure's heart total once the totals are in; nothing for none, nothing on the invitation.
import assert from 'node:assert/strict';
import { stripHtml, paintCardHearts } from '../../src/ui/select-strip.js';
import { FIGURES, INVITE } from '../../src/game/figures.js';

const html = stripHtml([FIGURES[0], INVITE]);
assert.equal(html.match(/class="sel-card-hearts"/g)?.length, 1, 'a count on the figure, none on the invitation');

const card = id => {
  const n = { textContent: '' }, attrs = new Set();
  const box = { lastChild: n, toggleAttribute: (a, on) => (on ? attrs.add(a) : attrs.delete(a)) };
  return { dataset: { id }, querySelector: () => box, box, n, attrs };
};
const invite = { dataset: { id: 'la-teva-colla' }, querySelector: () => null };
const cards = [card('a'), card('b'), card('c')], on = c => c.attrs.has('data-on');
let totals = null;
const hearts = { count: id => (totals ? totals.get(id) ?? 0 : null), mine: id => id === 'a' };
paintCardHearts([...cards, invite], hearts);
assert(!cards.some(on), 'totals not in yet: no count');
totals = new Map([['a', 248], ['b', 3]]);
paintCardHearts([...cards, invite], hearts);
assert.deepEqual(cards.map(c => [on(c), String(c.n.textContent)]), [[true, '248'], [true, '3'], [false, '']], 'a count where there are hearts, none at zero');
assert(cards[0].attrs.has('data-mine') && !cards[1].attrs.has('data-mine'), 'the filled heart only where this player gave one');
totals.set('a', 0); paintCardHearts(cards, { ...hearts, mine: () => false });
assert(!on(cards[0]) && !cards[0].attrs.has('data-mine'), 'a heart taken back to zero hides it again');
assert.equal(String(cards[0].n.textContent), '248', 'its last number stays while it fades out');
console.log('card hearts ok');
