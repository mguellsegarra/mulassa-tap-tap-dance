// The selector's desktop board card (src/ui/select-standings.js): which rows, the gaps in its foot, the verified check, and
// what goes first when the info column is short.
import assert from 'node:assert/strict';
import { setupStandings } from '../src/ui/select-standings.js';

class Node {
  constructor(tag = 'div') { this.tag = tag; this.kids = []; this.attrs = {}; this.className = ''; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.listeners = {}; this.dataset = {}; }
  appendChild(k) { this.kids.push(k); return k; }
  replaceChildren(...k) { this.kids = k; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  addEventListener(k, f) { (this.listeners[k] ||= []).push(f); }
  getClientRects() { return this.hidden ? [] : [{}]; }
}
const doc = { createElement: tag => new Node(tag) };
const ids = ['select-meds', 'select-standings', 'select-standings-head', 'select-standings-pos', 'select-standings-rows', 'select-standings-foot', 'select-info'];
const nodes = new Map(ids.map(id => [id, new Node()]));
const $ = id => nodes.get(id);
let room = Infinity; // rows the info column holds before it scrolls (full medals take two, one-line ones one)
const info = $('select-info'), list = $('select-standings-rows'), foot = $('select-standings-foot');
Object.defineProperties(info, { clientHeight: { value: 0 }, scrollHeight: { get: () => { const m = $('select-meds').attrs; return list.kids.length + ('data-gone' in m ? 0 : 'data-compact' in m ? 1 : 2) > room ? 10 : 0; } } });
let boards = 0;
const facts = setupStandings({ doc, $, onBoard: () => boards++ });

const rows = Array.from({ length: 20 }, (_, i) => ({ position: i + 1, alias: `Jugador${i + 1}`, difficulty: i % 3, quality: 90, score: 100000 - i * 1000, verified: i === 2 }));
rows[12] = { ...rows[12], alias: '<b>Jo</b>', is_self: true };
facts.board({ pos: 13, total: 63, rows });
assert.equal($('select-standings-pos').textContent, 'Ets el número 13 de 63');
const shown = () => list.kids.map(k => (k.className === 'dots' ? '·' : Number(k.kids[0].textContent)));
assert.deepEqual(shown(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 'a tall column: the top 10 and two rows each side of yours');
const me = list.kids.find(k => k.className === 'me');
assert.equal(me.kids[1].kids[0].textContent, '<b>Jo</b>', 'a nickname is text, never HTML');
assert(list.kids[2].kids[1].kids.some(k => k.className === 'verified-check'), 'a confirmed address gets the check');
assert(!list.kids[0].kids[1].kids.some(k => k.className === 'verified-check'), 'an unconfirmed one does not');
assert.match(foot.innerHTML, /A <b>12\.000<\/b> punts del primer/);
assert.match(foot.innerHTML, /A <b>1\.000<\/b> punts del número 12/);

room = 11; facts.fit();
assert.deepEqual(shown(), [1, 2, 3, 4, 5, '·', 12, 13, 14], 'shorter: the top 5, ··· and your neighbours');
assert(!('data-gone' in $('select-meds').attrs), 'the medals stay while the top 5 fits');
room = 8; facts.fit();
assert.deepEqual(shown(), [1, 2, 3, '·', 12, 13, 14], 'shorter still: the medals shrink to one line first');
assert('data-compact' in $('select-meds').attrs && !('data-gone' in $('select-meds').attrs));
room = 5; facts.fit();
assert.deepEqual(shown(), [1, '·', 12, 13, 14], 'names before the medals');
assert('data-gone' in $('select-meds').attrs);

facts.fit(true);
assert($('select-standings').hidden, 'step 2: the card steps aside while the level row is fitted');
room = Infinity;
facts.board({ pos: 1, total: 63, rows: rows.map((r, i) => ({ ...r, is_self: i === 0 })) });
assert(foot.hidden, 'the first has no gap to show');
facts.board({ pos: null, total: 63, rows });
assert.equal($('select-standings-pos').textContent, 'Classificació', 'no row of yours: the board still shows');
facts.board(null);
assert($('select-standings').hidden, 'no board (offline, the Drac): no card');
$('select-standings-head').listeners.click[0]();
assert.equal(boards, 1, 'the header opens Classificacions');
console.log('selector standings: rows, gaps, verified check and fitting ok');
