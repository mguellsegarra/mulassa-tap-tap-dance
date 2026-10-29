// The selector's desktop board card (src/ui/select-standings.js): which rows, the gaps in its foot, the verified check, and
// what goes first when the info column is short.
import assert from 'node:assert/strict';
import { setupStandings, rankText } from '../../src/ui/select-standings.js';

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
  querySelectorAll() { return []; } // no layout here: phones' long names never overflow
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

// The ranking line (phones: under the song; desktops: this card's header), one wording everywhere
assert.equal(rankText({ pos: 18, total: 46 }, 'Tardor 2026'), 'Posició 18 de 46 · Tardor 2026');
assert.equal(rankText({ pos: null, total: 46 }, 'Tardor 2026'), 'Classificació · 46 participants', 'no row of yours: how many play');
assert.equal(rankText({ pos: null, total: 1 }), 'Classificació · 1 participant');
assert.equal(rankText({ pos: null, total: null, rows: [] }), 'Classificació · encara buida');
assert.equal(rankText(null), 'Classificació', 'not answered yet (or offline): the name alone');
assert.match(rankText({ pos: 3, total: 1200 }), /^Posició 3 de 1\.200 · (Hivern|Primavera|Estiu|Tardor) \d{4}$/, 'the open season by default');

const rows = Array.from({ length: 20 }, (_, i) => ({ position: i + 1, alias: `Jugador${i + 1}`, difficulty: i % 3, quality: 90, score: 100000 - i * 1000, verified: i === 2 }));
rows[12] = { ...rows[12], alias: '<b>Jo</b>', is_self: true };
rows[1] = { ...rows[1], released: true, public_id: 'id-2' }; // a released profile
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
assert(name(list.kids[1]).className.includes('released') && name(list.kids[1]).kids.length === 1 && !name(list.kids[0]).className.includes('released'), 'a released profile is faded, with no tag next to it');
assert(!JSON.stringify(list.kids.map(k => k.kids.map(c => c.textContent))).includes('#'), 'no «#» in the column');
assert.match(foot.innerHTML, /A <b>12\.000<\/b> punts del primer lloc/);
assert.match(foot.innerHTML, /A <b>1\.000<\/b> punts del número 12/);

room = 11; facts.fit();
assert.deepEqual(shown(), [1, 2, 3, 4, 5, '·', 12, 13, 14], 'shorter: the top 5, ··· and your neighbours');
assert(!('data-gone' in $('select-meds').attrs), 'the medals stay while the top 5 fits');
facts.medals([null, { score: 52000, quality: 90 }, null]);
assert.match($('select-meds').innerHTML, /sel-meds-t[^>]*>Els teus rècords<.*Sense rècord/s, 'the medals say they are yours; no record is quiet words, no dash or star goal');
assert(!/—|1a estrella/.test($('select-meds').innerHTML));
room = 8; facts.fit();
assert.deepEqual(shown(), [1, '·', 12, 13, 14], 'shorter still: rows go, the medals stay full (never one line)');
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
// The loading card: a skeleton made of the rows' own markup (one grid cell while loading, select-sizes.css), cross-faded with them.
// Its shape is the last answer seen for this figure and owner; the first time, the owner's last answer shown, else the most a board shows.
const bodyEl = $('select-standings-body'), sk = $('select-standings-sk'), msgEl = $('select-standings-msg');
const kinds = ol => ol.map(k => (k.className === 'dots' ? '·' : 'r')).join('');
let calm = false; // prefers-reduced-motion
globalThis.matchMedia = q => ({ matches: /reduce/.test(q) ? calm : true }); // the desktop column, not a phone
bodyEl.getBoundingClientRect = () => ({ height: 34 * Math.max(bodyEl.dataset.state === 'loading' ? sk.rows.length : 0, list.kids.length) + 20 }); // in the flow: the skeleton only while loading
facts.board(null, true, false, 'drac:Jo#1');
const most = kinds(sk.rows);
assert.equal(bodyEl.dataset.state, 'loading');
assert.equal(most, 'rrrrrrrrrr·rrrrr', 'never seen: the most a board shows (the top 10, ···, two each side of yours)');
const few = rows.slice(0, 12).map(r => ({ ...r, is_self: false }));
facts.board({ pos: null, total: 12, rows: few }, true, false, 'drac:Jo#1');
assert(bodyEl.dataset.state === 'ready' && msgEl.hidden && kinds(list.kids) === 'rrrrrrrrrr', 'twelve players, none of them you: the top 10');
facts.board(null, true, false, 'drac:Jo#1');
assert.equal(kinds(sk.rows), 'rrrrrrrrrr', 'seen before: the placeholder takes that answer\'s shape');
assert(foot.hidden && !sk.kids.some(k => k.className === 'sel-standings-foot'), 'no gaps last time: no foot in the placeholder either');
facts.board({ pos: null, total: 12, rows: few }, true, false, 'drac:Jo#1');
facts.board(null, true, false, 'drac:Altre#2');
assert.equal(kinds(sk.rows), most, 'another owner: their own shape (none yet: the most)');
facts.board({ pos: 13, total: 63, rows }, true, false, 'mulassa:Jo#1');
const real = kinds(list.kids);
facts.board(null, true, false, 'aliga:Jo#1');
assert.equal(kinds(sk.rows), real, 'a figure never seen: the shape on screen (the Mulassa\'s), not the most: no grow, then shrink');
facts.board(null, true, false, 'mulassa:Jo#1');
assert(kinds(sk.rows) === real && sk.kids.some(k => k.className === 'sel-standings-foot'), 'the Mulassa\'s shape, ··· and the foot included');
facts.board({ pos: 12, total: 135 }, true, false, 'mulassa:Jo#1');
assert(bodyEl.dataset.state === 'loading' && msgEl.hidden, 'a position with no rows yet (?demo) keeps the skeleton, never the empty message');
facts.board({ pos: null, total: null, rows: [] }, true, false, 'mulassa:Jo#1');
assert(bodyEl.dataset.state === 'ready' && !msgEl.hidden && /Encara no hi ha/.test(msgEl.textContent), 'empty: the message');
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

// Another board, or the first answer after a placeholder (a fade, not a height ease): the card fades out
// with the old board, swaps to the newest answer while unseen, then fades in; a refresh rewrites in place, reduced motion at once.
{ const card = $('select-standings'), fades = []; let swapped = 0;
  card.animate = frames => { let done; const a = { frames, cancel() {}, finished: new Promise(r => { done = r; }) }; a.done = done; fades.push(a); return a; };
  const fadeFacts = setupStandings({ doc, $, onBoard() {}, onSwapped: () => swapped++ });
  const head = () => $('select-standings-pos').textContent, tick = () => new Promise(r => setTimeout(r));
  fadeFacts.board({ pos: 13, total: 63, rows }, true, false, 'mulassa:Jo#1');
  assert.equal(fades.length, 0, 'the first board shows at once');
  fadeFacts.board({ pos: 13, total: 63, rows }, true, false, 'mulassa:Jo#1');
  assert.equal(fades.length, 0, 'the same board again: rewritten in place');
  const before = head();
  fadeFacts.board(null, true, false, 'drac:Jo#1');
  assert.deepEqual(fades.map(f => f.frames.opacity), [[1, 0]], 'another figure: the card fades out');
  assert.equal(head(), before, 'the old board stays while it fades out');
  fadeFacts.board({ pos: 2, total: 9, rows: rows.slice(0, 9) }, true, false, 'drac:Jo#1');
  assert(fadeFacts.fading && head() === before, 'an answer meanwhile waits for the fade too');
  fades[0].done(); await tick();
  assert(!fadeFacts.fading && head() !== before && /2/.test(head()), 'swapped to the newest answer while unseen');
  assert.equal(swapped, 1, 'the selector refits the new card');
  assert.deepEqual(fades[1].frames.opacity, [0, 1], 'then it fades in');
  fadeFacts.board(null, true, false, 'ós:Jo#1'); fades.at(-1).done(); await tick();
  fadeFacts.board({ pos: 3, total: 4, rows: rows.slice(0, 4) }, true, false, 'ós:Jo#1');
  assert(/3/.test(head()) && fades.length === 4, 'no answer when the card is out: it waits unseen, and a prompt answer comes in with one fade');
  fadeFacts.board(null, true, false, 'aliga:Jo#1'); fades.at(-1).done(); await tick(); await new Promise(r => setTimeout(r, 400));
  assert(head() === 'Classificació' && fades.length === 6, 'a slow answer: the placeholder fades in after the wait');
  fadeFacts.board({ pos: 5, total: 7, rows: rows.slice(0, 7) }, true, false, 'aliga:Jo#1');
  assert.deepEqual(fades.at(-1).frames.opacity, [1, 0], 'its first answer fades the placeholder out (the card must not grow or shrink in sight)');
  fades.at(-1).done(); await tick();
  assert(/5/.test(head()) && fades.length === 8, 'and the answer in');
  calm = true; fadeFacts.board({ pos: 13, total: 63, rows }, true, false, 'mulassa:Jo#1');
  assert(fades.length === 8 && /13/.test(head()), 'reduced motion: swapped at once');
  calm = false; delete card.animate; }

// Phones: the header and the first three, one fixed shape, so the card never fades out (that left a hole, then a flash of
// skeleton): another figure swaps in place and its words fade in; the answer cross-fades with the skeleton (data-state).
{ const card = $('select-standings'), body = $('select-standings-body'), pos = $('select-standings-pos'), anims = [];
  const spy = who => frames => { anims.push([who, frames.opacity.join('→')]); return { cancel() {}, finished: Promise.resolve() }; };
  card.animate = spy('card'); body.animate = spy('body'); pos.animate = spy('head');
  const phoneFacts = setupStandings({ doc, win: { matchMedia: () => ({ matches: false }) }, $, onBoard() {} });
  const real = () => list.kids.map(li => (li.textContent === '···' ? '·' : li.kids[0].textContent));
  phoneFacts.board({ pos: 13, total: 63, rows }, true, false, 'mulassa:Jo#1');
  assert.deepEqual(real(), ['1', '2', '3'], 'the first three alone: no ··· nor your row');
  assert.deepEqual($('select-standings-sk').kids[0].kids.map(li => li.kids[0].className), ['pos p1', 'pos p2', 'pos p3'], 'the skeleton keeps the three medals');
  assert.equal(anims.length, 0, 'the first board shows at once');
  phoneFacts.board(null, true, false, 'drac:Jo#1');
  assert(!card.hidden && pos.textContent === 'Classificació' && body.dataset.state === 'loading', 'another figure: its skeleton at once, in place');
  assert.deepEqual(anims, [['body', '0→1'], ['head', '0→1']], 'the card stays; its new words fade in');
  phoneFacts.board({ pos: 2, total: 9, rows: rows.slice(0, 9) }, true, false, 'drac:Jo#1');
  assert(pos.textContent === 'Classificació (9)' && body.dataset.state === 'ready', 'the answer replaces the skeleton in place; the narrow header gives the board\'s size');
  assert.equal($('select-standings-head').attrs['aria-label'], 'Classificació: Posició 2 de 9 · ' + rankText({ pos: 2, total: 9 }).split(' · ')[1], 'its accessible name keeps your place');
  assert.deepEqual(anims.slice(2), [['head', '0→1']], 'no card fade: the rows cross-fade with the skeleton, the header fades its new words');
  delete card.animate; delete body.animate; delete pos.animate; }
console.log('phones: the card stays, boards swap in place ok');

// Step 2 on a short laptop: the song's credit gives way first, then the board's foot goals, then the song row;
// the level row (and the ranking line, outside it) stays.
const { showLevelStats } = await import('../../src/ui/level-stats.js');
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

