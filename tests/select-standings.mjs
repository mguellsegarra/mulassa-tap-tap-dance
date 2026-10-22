// The selector's desktop board card (src/ui/select-standings.js): which rows, the gaps in its foot, the verified check, and
// what goes first when the info column is short.
import assert from 'node:assert/strict';
import { setupStandings, rankText } from '../src/ui/select-standings.js';

class Node {
  constructor(tag = 'div') { this.tag = tag; this.kids = []; this.attrs = {}; this.className = ''; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.listeners = {}; this.dataset = {}; }
  appendChild(k) { this.kids.push(k); return k; }
  replaceChildren(...k) { this.kids = k; }
  get rows() { return this.kids[0]?.kids ?? []; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(k, f) { (this.listeners[k] ||= []).push(f); }
  getClientRects() { return this.hidden ? [] : [{}]; }
}
const doc = { createElement: tag => new Node(tag) };
const ids = ['select-meds', 'select-standings', 'select-standings-head', 'select-standings-pos', 'select-standings-rows', 'select-standings-foot', 'select-standings-body', 'select-standings-sk', 'select-standings-msg', 'select-info'];
const nodes = new Map(ids.map(id => [id, new Node()]));
const $ = id => nodes.get(id);
let room = Infinity; // rows the info column holds before it scrolls (full medals take two, one-line ones one)
const info = $('select-info'), list = $('select-standings-rows'), foot = $('select-standings-foot');
Object.defineProperties(info, { clientHeight: { value: 0 }, scrollHeight: { get: () => { const m = $('select-meds').attrs; return list.kids.length + ('data-gone' in m ? 0 : 2) > room ? 10 : 0; } } });
let boards = 0;
const facts = setupStandings({ doc, $, onBoard: () => boards++ });

// The ranking line (phones: under the song; desktops: this card's header), one wording everywhere (Marc: «Una línia a tot arreu»)
assert.equal(rankText({ pos: 18, total: 46 }, 'Tardor 2026'), 'Posició 18 de 46 · Tardor 2026');
assert.equal(rankText({ pos: null, total: 46 }, 'Tardor 2026'), 'Classificació · 46 participants', 'no row of yours: how many play');
assert.equal(rankText({ pos: null, total: 1 }), 'Classificació · 1 participant');
assert.equal(rankText({ pos: null, total: null, rows: [] }), 'Classificació · encara buida');
assert.equal(rankText(null), 'Classificació', 'not answered yet (or offline): the name alone');
assert.match(rankText({ pos: 3, total: 1200 }), /^Posició 3 de 1\.200 · (Hivern|Primavera|Estiu|Tardor) \d{4}$/, 'the open season by default');

const rows = Array.from({ length: 20 }, (_, i) => ({ position: i + 1, alias: `Jugador${i + 1}`, difficulty: i % 3, quality: 90, score: 100000 - i * 1000, verified: i === 2 }));
rows[12] = { ...rows[12], alias: '<b>Jo</b>', is_self: true };
rows[1] = { ...rows[1], tag: 7 }; // a guest
facts.board({ pos: 13, total: 63, rows }, true);
assert.match($('select-standings-pos').textContent, /^Posició 13 de 63 · /);
assert.equal($('select-standings-head').attrs['aria-label'], `Classificació: ${$('select-standings-pos').textContent}`);
const shown = () => list.kids.map(k => (k.className === 'dots' ? '·' : Number(k.kids[0].textContent)));
assert.deepEqual(shown(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 'a tall column: the top 10 and two rows each side of yours');
const me = list.kids.find(k => k.className === 'me');
const name = li => li.kids[1].kids[0]; // .who > .player-name (profile-notes.js appendName, as on the boards)
assert.equal(name(me).kids[0].textContent, '<b>Jo</b>', 'a nickname is text, never HTML');
assert(list.kids[2].kids[1].kids.some(k => k.className === 'verified-check'), 'a confirmed address gets the check');
assert(!list.kids[0].kids[1].kids.some(k => k.className === 'verified-check'), 'an unconfirmed one does not');
assert.equal(name(list.kids[1]).kids[1].textContent, '#0007', 'a guest shows its tag, as on the boards');
assert.match(foot.innerHTML, /A <b>12\.000<\/b> punts del primer lloc/);
assert.match(foot.innerHTML, /A <b>1\.000<\/b> punts del número 12/);

room = 11; facts.fit();
assert.deepEqual(shown(), [1, 2, 3, 4, 5, '·', 12, 13, 14], 'shorter: the top 5, ··· and your neighbours');
assert(!('data-gone' in $('select-meds').attrs), 'the medals stay while the top 5 fits');
facts.medals([null, { score: 52000, quality: 90 }, null]);
assert.match($('select-meds').innerHTML, /sel-meds-t[^>]*>Els teus rècords<.*Sense rècord/s, 'the medals say they are yours; no record is quiet words, no dash or star goal');
assert(!/—|1a estrella/.test($('select-meds').innerHTML));
room = 8; facts.fit();
assert.deepEqual(shown(), [1, '·', 12, 13, 14], 'shorter still: rows go, the medals stay full (never one line: Marc)');
assert(!('data-compact' in $('select-meds').attrs) && !('data-gone' in $('select-meds').attrs));
room = 5; facts.fit();
assert.deepEqual(shown(), [12, 13, 14], 'then the top rows: your neighbours stay beside the medals');
assert(!('data-gone' in $('select-meds').attrs), 'the medals stay while any row fits');
room = -1; facts.fit();
assert(!$('select-standings').hidden && $('select-standings-body').hidden, 'no room at all: the rows go, the header (the way to the board) stays');
room = Infinity;

facts.fit(true);
assert(!$('select-standings').hidden && $('select-standings-body').hidden, 'step 2: the rows step aside while the level row is fitted, beside the header');
room = Infinity;
facts.board({ pos: 1, total: 63, rows: rows.map((r, i) => ({ ...r, is_self: i === 0 })) }, true);
assert(foot.hidden, 'the first has no gap to show');
facts.board({ pos: null, total: 63, rows }, true);
assert.equal($('select-standings-pos').textContent, 'Classificació · 63 participants', 'no row of yours: the board still shows');
facts.board(null, true);
assert(!$('select-standings').hidden && $('select-standings-pos').textContent === 'Classificació', 'before the answer: the header and the placeholder');
facts.board(null, false);
assert($('select-standings').hidden, 'no board configured (offline): no card');
// The loading card: a skeleton made of the rows' own markup (one grid cell while loading, select.css), cross-faded with them.
// Its shape is the last answer seen for this figure and owner; the first time, the most a board shows.
const bodyEl = $('select-standings-body'), sk = $('select-standings-sk'), msgEl = $('select-standings-msg');
const kinds = ol => ol.map(k => (k.className === 'dots' ? '·' : 'r')).join('');
let eased = [], calm = false; // body.animate's calls; prefers-reduced-motion
globalThis.matchMedia = () => ({ matches: calm });
bodyEl.animate = (frames, o) => { eased.push([parseFloat(frames[0].height), parseFloat(frames[1].height), o.duration]); return { cancel() {} }; };
bodyEl.getBoundingClientRect = () => ({ height: 34 * Math.max(bodyEl.dataset.state === 'loading' ? sk.rows.length : 0, list.kids.length) + 20 }); // in the flow: the skeleton only while loading
facts.board(null, true, false, 'drac:Jo#1');
const most = kinds(sk.rows);
assert.equal(bodyEl.dataset.state, 'loading');
assert.equal(most, 'rrrrrrrrrr·rrrrr', 'never seen: the most a board shows (the top 10, ···, two each side of yours)');
const few = rows.slice(0, 12).map(r => ({ ...r, is_self: false }));
eased = [];
facts.board({ pos: null, total: 12, rows: few }, true, false, 'drac:Jo#1');
assert(bodyEl.dataset.state === 'ready' && msgEl.hidden && kinds(list.kids) === 'rrrrrrrrrr', 'twelve players, none of them you: the top 10');
assert.equal(eased.length, 1, 'a shorter answer eases the card down (no empty band under the last row)');
assert(eased[0][0] > eased[0][1] && eased[0][1] === 34 * 10 + 20 && eased[0][2] === 250, 'from the placeholder to the rows, 250 ms');
eased = [];
facts.board(null, true, false, 'drac:Jo#1');
assert.equal(kinds(sk.rows), 'rrrrrrrrrr', 'seen before: the placeholder takes that answer\'s shape');
assert(foot.hidden && !sk.kids.some(k => k.className === 'sel-standings-foot'), 'no gaps last time: no foot in the placeholder either');
facts.board({ pos: null, total: 12, rows: few }, true, false, 'drac:Jo#1');
assert.equal(eased.length, 0, 'the same answer again: nothing moves');
facts.board(null, true, false, 'drac:Altre#2');
assert.equal(kinds(sk.rows), most, 'another owner: their own shape (none yet: the most)');
facts.board({ pos: 13, total: 63, rows }, true, false, 'mulassa:Jo#1');
const real = kinds(list.kids);
facts.board(null, true, false, 'mulassa:Jo#1');
assert(kinds(sk.rows) === real && sk.kids.some(k => k.className === 'sel-standings-foot'), 'the Mulassa\'s shape, ··· and the foot included');
facts.board({ pos: 12, total: 135 }, true, false, 'mulassa:Jo#1');
assert(bodyEl.dataset.state === 'loading' && msgEl.hidden, 'a position with no rows yet (?demo) keeps the skeleton, never the empty message');
calm = true; eased = [];
facts.board({ pos: null, total: null, rows: [] }, true, false, 'mulassa:Jo#1');
assert(bodyEl.dataset.state === 'ready' && !msgEl.hidden && /Encara no hi ha/.test(msgEl.textContent), 'empty: the message');
assert.equal(eased.length, 0, 'reduced motion: the height changes at once');
calm = false;
facts.board(null, true, false, 'mulassa:Jo#1');
assert.equal(kinds(sk.rows), 'r', 'an empty board last time: about the message\'s room');
facts.board(null, true, true, 'mulassa:Jo#1');
assert(bodyEl.dataset.state === 'ready' && !msgEl.hidden && /No s’han pogut/.test(msgEl.textContent), 'failed: a message');
facts.board(null, true, false, 'mulassa:Jo#1');
assert.equal(kinds(sk.rows), 'r', 'a failure is not an answer: the last shape stays');
facts.fit(true);
assert(bodyEl.hidden, 'step 2: the body (skeleton too) steps aside');
facts.fit();
$('select-standings-head').listeners.click[0]();
assert.equal(boards, 1, 'the header opens Classificacions');
console.log('selector standings: rows, gaps, verified check and fitting ok');

// The ease, as WAAPI measures it: a running animation's height is its keyframe. Step 2's refit is level-stats' own eased call
// (select-ui.js levelStats), so the calls nest: still one ease, from the old height to the new.
{ let lv = false, h = 100, live = null, anims = [];
  const easeFacts = setupStandings({ doc, $, onBoard() {}, levels: () => lv });
  bodyEl.getBoundingClientRect = () => ({ height: live ? parseFloat(live.frames[0].height) : h });
  bodyEl.animate = (frames, o) => { const a = { frames, o, cancel() { this.cancelled = true; if (live === a) live = null; } }; anims.push(a); live = a; return a; };
  const answer = { pos: 13, total: 63, rows };
  const kept = () => anims.filter(a => !a.cancelled).map(a => [parseFloat(a.frames[0].height), parseFloat(a.frames[1].height), a.o.duration]);
  for (const step of [1, 2]) {
    lv = step === 2; live = null;
    const refit = to => (lv ? () => easeFacts.eased(() => { bodyEl.hidden = false; h = to; }) : () => { bodyEl.hidden = false; h = to; });
    easeFacts.board(answer, true, false, 'mulassa:Jo#1', refit(100)); // the step's own layout first: no ease
    for (const calmNow of [false, true]) {
      calm = calmNow; anims = []; live = null;
      easeFacts.board(answer, true, false, 'mulassa:Jo#1', refit(140));
      assert.deepEqual(kept(), calmNow ? [] : [[100, 140, 250]], `step ${step}${calmNow ? ', reduced motion: at once' : ': one 250 ms ease from the old height'}`);
      h = 100; live = null; easeFacts.board(answer, true, false, 'mulassa:Jo#1', refit(100)); live = null;
    }
  }
  calm = false; }

// Step 2 on a short laptop (Marc, 2026-10-21): the song's credit gives way first, then the board's foot goals, then the song row;
// the level row (and the ranking line, outside it) stays.
const { showLevelStats } = await import('../src/ui/level-stats.js');
const panel = new Node(), lvl = new Node(), ttl = new Node(), sub = new Node(), col = new Node();
lvl.parentElement = panel;
for (const n of [ttl, sub]) Object.assign(n, { scrollWidth: 0, clientWidth: 0 });
let goalsOn = null, lines = 0; // lines: what the column holds besides the level row (credit, goals, song: one each)
Object.defineProperties(col, { clientHeight: { value: 0 }, scrollHeight: { get: () => {
  const snug = panel.attrs['data-snug'], used = (snug ? 0 : 1) + (goalsOn ? 1 : 0) + (snug === 'song' ? 0 : 1);
  return used > lines ? 10 : 0;
} } });
const lv$ = id => ({ 'select-level-stats': lvl, 'select-level-title': ttl, 'select-level-sub': sub, 'select-info': col })[id];
const fitAt = n => { lines = n; showLevelStats(lv$, { on: true, level: 1, record: { score: 52000, quality: 90 }, goals: on => { goalsOn = on; } }); return [panel.attrs['data-snug'] ?? '', goalsOn, !lvl.hidden]; };
assert.deepEqual(fitAt(3), ['', true, true], 'room for all: credit, goals and song');
assert.deepEqual(fitAt(2), ['credit', true, true], 'first the credit goes');
assert.deepEqual(fitAt(1), ['credit', false, true], 'then the foot goals');
assert.deepEqual(fitAt(0), ['song', false, true], 'then the song row; the level row stays');
console.log('step 2 give-way order: credit, goals, song ok');

