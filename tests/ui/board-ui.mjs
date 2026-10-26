// Classificacions sheets (src/ui/board-ui.js) in a small fake DOM, with a mocked leaderboard service and Turnstile:
// lists (loading, empty, error, retry, own row, stale answers, the switch only once published), publishing (only on
// request, a Turnstile token only for a new profile, errors with their code, non-improvements, double taps, late answers,
// Comparteix next), the startup verification, alias (also from ⚙ Configuració) and deletion.
import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { readFileSync } from 'node:fs';
import { ALIAS_KEY } from '../../src/services/leaderboard-identity.js';
import { setupBoard } from '../../src/ui/board-ui.js';
import { suggestAlias, DECLINES_KEY, OPTOUT_KEY, MAX_DECLINES, PERSIST_KEY } from '../../src/ui/publish-ui.js';
import { deviceRisk, DEVICE_NOTES } from '../../src/ui/profile-notes.js';
import { normalizeAlias } from '../../src/services/leaderboard-rules.js';
import { checkAlias, ALIAS_MESSAGES } from '../../src/services/alias-rules.js';
import { VERIFIED } from '../../src/ui/profile-notes.js';

class El {
  constructor(tag, id = '') { Object.assign(this, { tag, id, children: [], hidden: false, disabled: false, value: '', readOnly: false, dataset: {}, attrs: {}, on: {}, open: false, own: '', className: '' }); }
  get textContent() { return this.own + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.own = String(v); this.children = []; }
  get classList() { const el = this; return { toggle(n, f) { const s = new Set(el.className.split(' ').filter(Boolean)); (f ?? !s.has(n)) ? s.add(n) : s.delete(n); el.className = [...s].join(' '); }, contains: n => el.className.split(' ').includes(n) }; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === 'string' ? Object.assign(new El('#text'), { own: c }) : c); }
  prepend(c) { this.children.unshift(c); c.parent = this; return c; }
  before(...cs) { const sib = this.parent.children; sib.splice(sib.indexOf(this), 0, ...cs); for (const c of cs) c.parent = this.parent; }
  remove() { const sib = this.parent?.children; if (sib) sib.splice(sib.indexOf(this), 1); this.parent = null; }
  replaceChildren(...cs) { this.children = []; this.append(...cs); }
  contains(el) { for (let e = el; e; e = e.parent) if (e === this) return true; return false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t, ev = {}) { const e = { preventDefault() { this.prevented = true; }, ...ev }; for (const f of this.on[t] || []) f(e); return e; }
  click() { return this.fire('click'); }
  focus() { doc.activeElement = this; }
  blur() { if (doc.activeElement === this) doc.activeElement = null; }
  showModal() { this.open = true; }
  close() { if (!this.open) return; this.open = false; this.fire('close'); }
}
const ids = ['board-menu', 'publish-menu', 'board-rows', 'board-table', 'board-status', 'board-retry', 'board-list-view',
  'board-close',
  'publish-form', 'publish-title', 'publish-summary', 'publish-about', 'publish-temp', 'publish-alias', 'publish-status', 'publish-send',
  'publish-cancel', 'publish-never', 'settings-prompt-row', 'settings-prompt', 'publish-place', 'publish-as', 'publish-as-name', 'publish-field', 'publish-rule', 'publish-error', 'publish-board',
  'results-actions', 'results-publish', 'results-board', 'publish-device', 'publish-recover',
  'board-figure', 'board-figure-pic', 'board-figure-name', 'board-picker', 'board-figures', 'board-main', 'board-place', 'board-jump', 'board-jump-t', 'board-place-sub',
  'board-publish-link', 'board-scroll', 'board-art', 'board-hint', 'board-more', 'board-more-status', 'board-more-btn', 'board-summary', 'board-publish', 'captcha-menu', 'captcha-box',
  'publish-offer', 'publish-confirm', 'board-season', 'board-previous', 'board-seasons', 'board-play', 'board-play-name'];
const NOW = Date.parse('2026-10-20T10:00:00Z');
let doc;
const tick = () => new Promise(r => setTimeout(r, 0));
const deferred = () => { let resolve, reject; const p = new Promise((a, b) => { resolve = a; reject = b; }); return { p, resolve, reject }; };
const RUN = Object.freeze({ version: 'mulassa-v1', difficulty: 1, counts: Object.freeze({ perfect: 150, good: 20, miss: 11 }), score: 43210, maxCombo: 60 });
// under 2 stars: a named player's run that never goes up by itself (publishQuietly), so only the sheet publishes it
const WEAK = Object.freeze({ ...RUN, counts: Object.freeze({ perfect: 60, good: 20, miss: 101 }) });

function make({ configured = true, publishingEnabled = true, captchaRequired = true, siteKey = 'site', session = false, persistent = true, email = 'contacte@example.test',
  detachedPrivacy = false, alias = null, declined = 0, afterPublish = null, onRecover = null, automated = false, ua = '', standalone = false, touch = 0,
  prof, onConfirm = null, mail = '', onCard, onSeasons, onKeep = null, canPlay, onPlay } = {}) { // prof: what service.profile() answers (undefined: a service without it)
  doc = { activeElement: null, els: new Map(), getElementById(id) { return this.els.get(id); }, createElement: tag => new El(tag) };
  for (const id of ids) doc.els.set(id, new El('x', id));
  doc.els.set('privacy-contact', Object.assign(new El('p', 'privacy-contact'), { hidden: true, dataset: { email } }));
  doc.els.set('privacy-contact-link', new El('a', 'privacy-contact-link'));
  const $ = id => doc.els.get(id);
  if (detachedPrivacy) {
    doc.getElementById = id => id === 'privacy-contact' || id === 'privacy-contact-link' ? null : $(id);
    $('privacy-contact').querySelector = () => $('privacy-contact-link');
    doc.els.set('privacy-content', { content: { querySelector: () => $('privacy-contact') } });
  }
  $('board-table').hidden = true; $('results-actions').hidden = true;
  const calls = { all: 0, pages: [], lists: [], identity: 0, publish: [], alias: [], del: 0, captcha: 0, render: [], reset: 0, remove: 0, persist: 0, profile: 0, signout: 0, accept: 0 };
  const T = { session, persistent, alls: [], publishes: [], prof, seasons: [] }; // queued deferreds the test runs
  const service = {
    configured, publishingEnabled, captchaRequired,
    listAll(o = {}) { calls.all++; calls.pages.push(o.offset ?? 0); calls.lists.push(o); const x = deferred(); T.alls.push(x); return x.p; },
    async seasons() { return T.seasons; },
    async identity() { calls.identity++; return { hasSession: T.session, persistent: T.persistent, ...(mail && { email: mail }) }; },
    ...(prof !== undefined && { async profile() { calls.profile++; return T.prof; } }),
    async signOut() { calls.signout++; T.session = false; return { signedOut: true }; },
    publish(result, alias, opts) { calls.publish.push({ result, alias, opts }); const x = deferred(); T.publishes.push(x); return x.p; },
  };
  const widgets = [];
  const turnstile = {
    render(box, o) { calls.render.push(o); widgets.push(o); return `w${widgets.length}`; },
    reset() { calls.reset++; }, remove() { calls.remove++; },
  };
  T.captchaFails = false;
  const captcha = async () => { calls.captcha++; if (T.captchaFails) throw new Error('offline'); return turnstile; };
  const mem = new Map([['record-v2-duet-1', '{"quality":90}']]);
  if (alias) mem.set(ALIAS_KEY, alias);
  if (declined) mem.set(DECLINES_KEY, String(declined));
  const env = { canPrompt: true, online: true, t: 0 }; // the prompt's world: main.js's screen check, navigator.onLine, the clock
  const store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, String(v)), remove: k => mem.delete(k) };
  let listener = null;
  const subscribe = fn => { listener = fn; fn(null); return () => {}; };
  const focused = [];
  const shares = [], reports = [], io = {};
  const board = setupBoard({ focusIn: (sheet, id) => { focused.push(id); $(id).focus(); }, store, service, siteKey, captcha, doc, subscribe,
    canPrompt: () => env.canPrompt, online: () => env.online, promptDelay: 0, now: () => NOW + env.t, minLoad: 0,
    verifyOpts: { report: (k, t) => reports.push([k, t]), log: { warn() {} }, schedule() {} },
    afterPublish: afterPublish && (o => { shares.push(o); afterPublish(o); }), shareDelay: 0, settle: 0, observe: (el, root, fn) => { io.el = el; io.fire = fn; },
    onRecover, env: () => ({ ua, standalone, touch }), persist: async () => { calls.persist++; return true; },
    onConfirm, onCard, onSeasons, onKeep, canPlay, onPlay, acceptStats: () => { calls.accept++; } });
  const [figMula, figDrac] = $('board-figures').children; // «Tria figura»: built from the playable figures
  for (const b of $('board-figures').children) doc.els.set(b.id, b);
  return { board, $, calls, T, widgets, mem, focused, env, shares, reports, io, figMula, figDrac, setRun: r => listener(r), rows: () => $('board-rows').children.map(tr => tr.children.map(td => td.textContent)) };
}
const submit = $ => $('publish-form').fire('submit');

// Each visit reads the current identity; earlier requests never populate a shared rank cache.
{
  const { board, calls, T } = make();
  const profileA = board.standing();
  const signedOut = board.standing();
  const strip = s => s && { pos: s.pos, total: s.total }; // the rows ride along for the selector's card
  T.alls[1].resolve([{ position: 1, alias: '<Leader>' }]);
  assert.deepEqual(await signedOut, { pos: null, total: null, rows: [{ position: 1, alias: '<Leader>' }] }, 'no row of mine: still the board\'s rows');
  T.alls[0].resolve([{ position: 1, alias: '<Leader>', total: 135 }, { position: 22, is_self: true, total: 135 }]);
  assert.deepEqual(strip(await profileA), { pos: 22, total: 135 });
  const recovered = board.standing();
  assert.equal(calls.all, 3, 'recovery/deletion/sign-out cannot reuse a previous identity response');
  T.alls[2].resolve([{ position: 1, alias: '<Leader>' }, { position: 7, is_self: true }]);
  assert.deepEqual(strip(await recovered), { pos: 7, total: null });
  const failed = board.standing(); T.alls[3].reject(new Error('offline'));
  assert.equal(await failed, null);
  const retry = board.standing(); T.alls[4].resolve([]);
  assert.deepEqual(strip(await retry), { pos: null, total: null });
  const drac = board.standing('drac-valls'); T.alls[5].resolve([{ position: 3, is_self: true, total: 12 }]);
  assert.deepEqual(strip(await drac), { pos: 3, total: 12 }); assert.deepEqual(calls.lists.at(-1), { figure: 'drac-valls' }, 'the Drac\'s place on its own board');
}
// The privacy contact is detached at startup, but publishing still requires it.
{
  const ready = make({ detachedPrivacy: true }); ready.setRun(RUN); ready.board.results(true);
  assert(ready.board.publishable && !ready.$('results-publish').hidden, 'a contact inside the template permits publishing');
  assert.equal(ready.$('privacy-contact-link').href, 'mailto:contacte@example.test');
  assert(!ready.$('privacy-contact').hidden, 'contact is ready before the privacy sheet opens');
  const absent = make({ detachedPrivacy: true, email: ' ' }); absent.setRun(RUN); absent.board.results(true);
  assert(!absent.board.publishable && absent.$('results-publish').hidden, 'an empty detached contact still blocks publishing');
}

// --- suggestions and the alias rule
for (let i = 0; i < 50; i++) { const s = suggestAlias(); assert(normalizeAlias(s) && checkAlias(s).alias === s, 'every suggested alias is valid'); }
assert.equal(suggestAlias(() => 0), 'Timbaler100');
{ // a nickname remembered from before the no-spaces rule (migration 0012 joined it on the server): joined here too
  const { mem } = make({ alias: 'Drac 101' });
  assert.equal(mem.get(ALIAS_KEY), 'Drac101');
}

// --- nothing online until asked; one board for every level, in pages of 50: every rank in order (podium, level line,
// points), opened at the own row («Posició 22 de 60»), one link to the top and back; stale answers dropped
const NAMES = ['<b>Jan</b>', 'Marta', 'Jordi', 'Núria', 'Pau', 'Laia', 'Arnau', 'Ona', 'Pere', 'Carla'];
// get_leaderboard_all as the server answers it (202609280005): ranks offset+1..offset+50, plus on the first page the
// caller's row with 5 neighbours each side; `total` on every row
const player = (p, total, selfAt) => ({ position: p, alias: p <= 10 ? NAMES[p - 1] : p === selfAt ? 'Gegant300' : `Jugador${p}`, difficulty: p <= 10 ? (p - 1) % 3 : 1,
  quality: 98.7 - p / 10, score: 123456 - p * 100, max_combo: 1200 - p, is_self: p === selfAt, total });
function page(offset, total, selfAt = 0) {
  const ranks = new Set();
  for (let p = offset + 1; p <= Math.min(total, offset + 50); p++) ranks.add(p);
  if (!offset && selfAt) for (let p = Math.max(1, selfAt - 5); p <= Math.min(total, selfAt + 5); p++) ranks.add(p);
  return [...ranks].sort((a, b) => a - b).map(p => player(p, total, selfAt));
}
const BOARD = page(0, 60, 22);
// A repeated short result can be weaker than the retained full-song record on the combined board.
{
  const { board, $, T, setRun } = make({ session: true, alias: 'Versions', captchaRequired: false });
  setRun({ version: 'mulassa-v2-short', difficulty: 0, counts: { perfect: 108, good: 0, miss: 0 }, score: 69350, maxCombo: 108 });
  board.openPublish(); await tick(); await tick();
  submit($);
  T.publishes[0].resolve({ improved: false, quality: 100, score: 96572 }); await tick();
  T.alls.at(-1).resolve([{ position: 1, alias: 'Versions', difficulty: 0, quality: 100, score: 100072, is_self: true, total: 1 }]); await tick();
  assert.match($('publish-status').textContent, /^Publicat com a .+\. La classificació mostra el teu millor resultat\.$/, 'publication must not claim the version-specific score is the combined record');
  assert($('publish-status').classList.contains('ok'), 'a non-improving cross-version retry remains a successful publication');
}
{
  const { board, $, calls, T, rows, focused, io } = make();
  assert.equal(calls.all + calls.identity + calls.captcha, 0, 'no network or CAPTCHA on page load');
  board.openBoard();
  assert($('board-menu').open && focused.at(-1) === 'board-close');
  assert.equal($('board-status').textContent, 'Carregant la classificació…');
  assert($('board-table').hidden && $('board-retry').hidden && $('board-more').hidden && $('board-place').hidden);
  assert.deepEqual(calls.pages, [0], 'one read: the first page of the joint board');
  T.alls[0].resolve(BOARD); await tick();
  assert.equal(rows().length, 50, 'the first page: 50 ranks (the own row among them, once)');
  assert.deepEqual(rows()[0], ['1', '<b>Jan</b>FÀCILratxa ' + (1199).toLocaleString('ca-ES'), '99%', (123356).toLocaleString('ca-ES') + '99%'], 'aliases stay text; level and streak under the name; % rounds like the game; points (+ the % phones show under them)');
  const trs = () => $('board-rows').children;
  assert.deepEqual(trs().slice(0, 4).map(tr => tr.children[0].children[0].className), ['pos p1', 'pos p2', 'pos p3', 'pos'], 'the podium: top 3 only');
  assert.equal(trs()[0].children.length, 4, 'four columns, as the header: # · Sobrenom · Encerts · Punts');
  const me = trs().filter(tr => tr.className === 'me');
  assert(me.length === 1 && me[0].children[1].textContent === 'Gegant300TUNORMALratxa ' + (1178).toLocaleString('ca-ES'), 'own row highlighted and labelled');
  assert(!$('board-place').hidden && $('board-summary').textContent === 'Posició 22 de 60', 'where they stand, over the list');
  // the link follows the list: the own row out of view → back to it; in view → to the top; at the very top with it in view: nothing
  const box = $('board-scroll'); box.clientHeight = 230;
  trs().forEach((tr, i) => Object.assign(tr, { offsetTop: i * 46, offsetHeight: 46 }));
  box.scrollTop = 0; box.fire('scroll');
  const jumpIs = (label, name, down) => { assert.equal($('board-jump-t').textContent, label); assert.equal($('board-jump').getAttribute('aria-label'), name); assert.equal($('board-jump').classList.contains('down'), down, 'its arrow towards where it goes'); };
  jumpIs('A la meva fila', 'Ves a la teva fila', true); assert(!$('board-jump').classList.contains('off'));
  $('board-jump').click(); box.fire('scroll');
  assert.equal(box.scrollTop, 19 * 46, 'its row in the middle of the box, snapped to a row');
  jumpIs('Al capdamunt', 'Ves al capdamunt de la classificació', false);
  box.scrollTop = 40 * 46; box.fire('scroll');
  jumpIs('A la meva fila', 'Ves a la teva fila', false); // scrolled past it: the row is above, the arrow up
  box.scrollTop = 19 * 46; box.fire('scroll'); $('board-jump').click(); box.fire('scroll');
  assert.equal(box.scrollTop, 0, '«Al capdamunt» goes to the top');
  jumpIs('A la meva fila', 'Ves a la teva fila', true);
  assert(!$('board-more').hidden && !$('board-more-btn').hidden, 'more to come: «Carrega’n més» at the end');
  // the list's end comes into view: the next page (ranks 51-60), appended, then the end
  io.fire();
  assert.deepEqual(calls.pages, [0, 50], 'the next page starts where the list ends');
  assert(/Carregant-ne més/.test($('board-more-status').textContent) && $('board-more-btn').hidden, 'a spinner row while it loads');
  io.fire(); assert.equal(calls.all, 2, 'one page at a time');
  T.alls[1].resolve(page(50, 60)); await tick();
  assert.deepEqual(rows().map(r => r[0]), Array.from({ length: 60 }, (_, i) => String(i + 1)), 'every rank once, in order');
  assert($('board-more').hidden && $('board-more-btn').hidden && $('board-more-status').textContent === '', 'all 60 here: nothing at the end (no button, no line, no gap)');
  io.fire(); assert.equal(calls.all, 2, 'nothing more to ask');
  // an error, then Torna-ho a provar; a late answer for an earlier read is dropped
  board.openBoard();
  T.alls[2].reject(Object.assign(new Error('No s’ha pogut connectar amb la classificació. Torna-ho a provar.'), { code: 'unavailable' })); await tick();
  assert(!$('board-retry').hidden, 'an error offers Torna-ho a provar');
  assert.equal($('board-status').textContent, 'No s’ha pogut carregar la classificació');
  assert($('board-status').dataset.kind === 'error' && !$('board-art').hidden && $('board-hint').textContent === 'Comprova la connexió i torna-ho a provar.', 'a headline, a picture and what to do (not the same words twice)');
  assert($('board-place').hidden && $('board-table').hidden);
  $('board-retry').click();
  assert.equal(calls.all, 4, 'retry reads again');
  assert($('board-retry').hidden && $('board-hint').hidden && $('board-status').textContent === 'Carregant la classificació…');
  $('board-close').click();
  T.alls[3].resolve(BOARD); await tick();
  assert.equal(rows().length, 0, 'an answer after closing is dropped');
  assert(!$('board-menu').open);
}
// --- a crowded board: the own row far down shows after a gap, which fills as its pages come (never a rank twice); pages
// up to the cap, stale pages dropped
{
  const { board, $, calls, T, rows, io } = make({ alias: 'Gegant300' });
  board.openBoard();
  T.alls[0].resolve(page(0, 700, 300)); await tick();
  const gapBtn = () => $('board-rows').children.find(tr => tr.className === 'gap')?.children[0].children[0];
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
  assert.deepEqual(rows().map(r => r[0]), [...range(1, 50), 'Carrega’n més', ...range(295, 305)], 'the top, a gap, the own row with 5 each side');
  assert.equal($('board-summary').textContent, 'Posició 300 de 700');
  assert($('board-more').hidden, 'past a gap the list end loads nothing: the gap\'s button does');
  io.fire(); assert.equal(calls.all, 1);
  gapBtn().click();
  assert(gapBtn().disabled && gapBtn().textContent === 'Carregant-ne més…');
  for (let n = 1; n <= 5; n++) { T.alls[n].resolve(page(calls.pages[n], 700, 300)); await tick(); if (n < 5) gapBtn().click(); }
  assert(!gapBtn(), 'joined up: no gap');
  assert.deepEqual(rows().map(r => r[0]), range(1, 305), 'every rank once, in order: the neighbours deduped');
  for (let n = 6; n < 10; n++) { io.fire(); T.alls[n].resolve(page(calls.pages[n], 700, 300)); await tick(); }
  assert.deepEqual(calls.pages, [0, 50, 100, 150, 200, 250, 305, 355, 405, 455], 'offsets follow the unbroken list (301-305 came with the first page)');
  const shown = rows().map(r => Number(r[0]));
  assert(shown.length === 500 && shown.every((p, i) => p === i + 1), 'ranks 1-500 once each');
  assert($('board-more-btn').hidden && $('board-more-status').textContent === 'Mostrant els 500 primers', 'the cap');
  io.fire(); assert.equal(calls.all, 10, 'nothing past the cap');
  // a page answering after the sheet was reopened belongs to the old list
  board.openBoard();
  T.alls[10].resolve(page(0, 120)); await tick();
  io.fire(); board.openBoard(); T.alls[11].resolve(page(50, 120)); await tick();
  assert.equal(rows().length, 0, 'a stale page is dropped');
  T.alls[12].resolve(page(0, 120)); await tick();
  assert.equal(rows().length, 50, 'the new list only');
  io.fire(); T.alls[13].reject(new Error('x')); await tick();
  assert(/No s’han pogut carregar més/.test($('board-more-status').textContent) && !$('board-more-btn').hidden, 'a failed page: the button stays for another try');
  // past the cap the gap stays, without a button
  board.openBoard(); T.alls[14].resolve(page(0, 900, 800)); await tick();
  for (let n = 15; n < 24; n++) { gapBtn().click(); T.alls[n].resolve(page(calls.pages[n], 900, 800)); await tick(); }
  assert(gapBtn().hidden && rows().length === 500 + 1 + 11, 'capped: the top 500, the gap, the own row\'s neighbours');
}
// --- no own row: the list from the top, the participants over it, the link hidden until the list moves
{
  const { board, $, T, rows } = make();
  board.openBoard();
  T.alls[0].resolve(page(0, 30)); await tick();
  assert.equal(rows().length, 30);
  assert.equal($('board-summary').textContent, '30 participants');
  assert($('board-jump-t').textContent === 'Al capdamunt' && $('board-jump').classList.contains('off'), 'at the top: nothing to go to (its place kept)');
  $('board-scroll').scrollTop = 300; $('board-scroll').fire('scroll');
  assert(!$('board-jump').classList.contains('off'), 'scrolled: back to the top');
  board.openBoard(); T.alls[1].resolve([{ position: 1, alias: 'Gegant300', difficulty: 2, quality: 99, score: 150000, is_self: true, total: 2140 }]); await tick();
  assert.equal($('board-summary').textContent, 'Posició 1 de 2.140', 'thousands dots');
  board.openBoard(); T.alls[2].resolve([{ position: 1, alias: 'Sol', difficulty: 2, quality: 99, score: 1, total: 1 }]); await tick();
  assert.equal($('board-summary').textContent, '1 participant');
}
// --- a result that can still be published: the call to publish it (where it would land)
{
  const { board, $, T, setRun } = make();
  setRun(RUN); board.results(true);
  board.openBoard();
  T.alls[0].resolve(BOARD.filter(r => !r.is_self).map(r => ({ ...r }))); await tick();
  assert(!$('board-publish-link').hidden && $('board-place-sub').hidden, 'no own row: «Publica el teu resultat per veure on quedes» in its place');
  $('board-publish-link').click();
  assert($('publish-menu').open && !$('board-menu').open, 'the publish sheet, over the results');
  $('publish-cancel').click();
  board.openBoard(); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert(!$('board-publish').hidden && $('board-hint').textContent === 'Publica el teu resultat per estrenar la classificació.', 'an empty board: the primary to publish it');
  board.openBoard(null, { figure: 'drac-valls' }); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert($('board-publish').hidden, 'a Mulassa run is not the Drac\'s');
}
// --- an empty open board over the selector: «Juga amb …» closes it (not back where it came from) and leaves that figure there
{
  const played = [], where = { selector: true };
  let backs = 0;
  const { board, $, T, setRun } = make({ canPlay: () => where.selector, onPlay: id => played.push(id) });
  board.openBoard(() => backs++, { figure: 'drac-valls' }); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert(!$('board-play').hidden && $('board-play-name').textContent === 'Juga amb el Drac' && $('board-publish').hidden, 'the one primary: play that figure');
  $('board-play').click();
  assert(!$('board-menu').open && backs === 0, 'closed, and not back to Configuració');
  assert.deepEqual(played, ['drac-valls']);
  board.openBoard(); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert.equal($('board-play-name').textContent, 'Juga amb la Mulassa');
  where.selector = false; board.openBoard(); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert($('board-play').hidden, 'no selector under the board (results, another sheet): no button');
  where.selector = true; setRun(RUN); board.results(true); board.openBoard(); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert(!$('board-publish').hidden && $('board-play').hidden, 'a run to publish: only its primary');
  board.openBoard(null, { figure: 'mulassa-valls', seasonId: 0, version: 'mulassa-v2-short', name: 'Estrena 2026' }); T.alls.at(-1).resolve([]); await tick(); await tick();
  assert($('board-play').hidden, 'a closed season: nothing to play for');
}
// --- results row: publish only for an eligible, unpublished run with publishing on; the board button whenever configured
{
  const { board, $, setRun } = make();
  board.results(true);
  assert(!$('results-board').hidden && $('results-publish').hidden && !board.publishable, 'no eligible run: only Classificacions');
  setRun(RUN); board.results(true);
  assert(!$('results-publish').hidden && board.publishable, 'eligible run: Publica el resultat');
  board.results(false);
  assert($('results-board').hidden && $('results-publish').hidden, 'leaving the results hides its buttons (the row is share-ui.js\'s)');
  const off = make({ publishingEnabled: false }); off.setRun(RUN); off.board.results(true);
  assert(!off.$('results-board').hidden && off.$('results-publish').hidden && !off.board.publishable, 'publishing disabled: lists only');
  off.board.openPublish();
  assert(!off.$('publish-menu').open, 'publishing disabled: the sheet never opens');
  const ready = make();
  assert(!ready.$('privacy-contact').hidden && ready.$('privacy-contact-link').href === 'mailto:contacte@example.test', 'a contact e-mail shows in Privadesa');
  const todo = make({ email: '  ', session: true }); todo.setRun(RUN); todo.board.results(true);
  assert(todo.$('privacy-contact').hidden, 'no contact yet: nothing half-filled on screen');
  assert(todo.$('results-publish').hidden, 'no privacy contact (#privacy-contact data-email): no publishing, even with the flag on');
  todo.board.openPublish();
  assert(!todo.$('publish-menu').open);
  todo.board.openBoard(); await tick();
  const none = make({ configured: false }); none.setRun(RUN); none.board.results(true);
  assert(none.$('results-board').hidden && none.$('results-publish').hidden && !none.board.publishable, 'not configured: no online entry points');
  none.board.openBoard();
  assert(!none.$('board-menu').open);
}
// --- publishing a new profile: nothing sent before Publica; the press asks Turnstile for a token (the widget loads if the
// startup check didn't run), which sends it without a second tap; errors say their code; non-improvement is success
{
  const { board, $, calls, T, widgets, mem, setRun, focused } = make();
  setRun(RUN); board.results(true);
  $('results-publish').click();
  assert($('publish-menu').open && focused.at(-1) === 'publish-alias');
  assert.equal($('publish-title').textContent, 'Publica el teu resultat!');
  assert.equal($('publish-summary').textContent, '92% a NORMAL · ★★★', 'the run in one line: %, level, stars');
  assert(!$('publish-field').hidden && $('publish-as').hidden, 'a new player picks a nickname');
  assert(!$('publish-rule').hidden && $('publish-error').hidden, 'the hint under the field, no error');
  assert.equal($('publish-alias').value, '', 'the field starts empty');
  assert(checkAlias($('publish-alias').placeholder.replace('p. ex. ', '')).ok, 'a fictional alias is only the placeholder');
  assert($('publish-send').disabled, 'Publica waits until it knows whether a CAPTCHA is needed');
  await tick(); await tick();
  assert.equal(calls.captcha + calls.publish.length, 0, 'opening loads no Turnstile and sends nothing');
  assert(!$('publish-send').disabled);
  $('publish-alias').value = '  Ànecd’Òdena ';
  submit($);
  assert.match($('publish-status').textContent, /Comprovant que no ets un robot/);
  assert($('publish-send').disabled, 'one press at a time');
  await tick(); await tick();
  assert.equal(calls.captcha, 1, 'Publica loads Turnstile (the startup check did not run here)');
  assert(widgets[0].sitekey === 'site' && widgets[0].appearance === 'interaction-only' && widgets[0].theme === 'dark');
  submit($);
  assert.equal(calls.publish.length, 0, 'no publish without a token, and a second press does nothing');
  widgets[0].callback('tok-1'); await tick();
  assert.equal(calls.publish.length, 1, 'the token sends it: no second tap');
  submit($);
  assert.equal(calls.publish.length, 1, 'a double tap sends once');
  assert.deepEqual([calls.publish[0].alias, calls.publish[0].opts.captchaToken, calls.publish[0].result], ['Ànecd’Òdena', 'tok-1', RUN]);
  assert($('publish-send').disabled && $('publish-send').textContent === 'Publicant…');
  T.publishes[0].reject(Object.assign(new Error('Completa la verificació per publicar el resultat.'), { code: 'captcha' })); await tick();
  assert.match($('publish-status').textContent, /Completa la verificació/);
  assert.equal($('publish-send').textContent, 'Torna-ho a provar');
  submit($); await tick();
  assert.equal(calls.reset, 1, 'Torna-ho a provar: a fresh token (the widget runs again)');
  widgets[0]['error-callback']('600010'); await tick();
  assert.match($('publish-status').textContent, /no ha pogut confirmar que no ets un robot\. Torna-ho a provar\. \(codi 600010\)/, 'the error says its code');
  assert.equal($('publish-send').textContent, 'Torna-ho a provar');
  submit($); await tick();
  assert.equal(calls.reset, 2, 'and again');
  widgets[0].callback('tok-3'); await tick();
  assert.equal(calls.publish.at(-1).opts.captchaToken, 'tok-3');
  T.session = true;
  T.publishes[1].resolve({ improved: false, quality: 95.4, score: 50000 }); await tick();
  assert.match($('publish-status').textContent, /^Publicat com a .+\. La classificació mostra el teu millor resultat\.$/, 'a non-improvement is a success');
  assert($('publish-status').classList.contains('ok') && $('publish-alias').readOnly);
  assert.equal($('publish-title').textContent, 'Publicat!');
  assert.equal(mem.get(ALIAS_KEY), 'Ànecd’Òdena', 'the alias is remembered');
  assert(![...mem.values()].some(v => /tok-/.test(v)), 'CAPTCHA tokens are never stored');
  assert.equal(calls.all, 1, 'then where they stand: the joint board');
  T.alls.at(-1).resolve([{ position: 1, alias: 'Marta', difficulty: 2, quality: 99, score: 9, is_self: false, total: 2 }, { position: 2, alias: 'Ànecd’Òdena', difficulty: 1, quality: 95, score: 5, is_self: true, total: 2 }]); await tick();
  assert(!$('publish-place').hidden && $('publish-place').textContent === 'Ets el número 2 · top 100%!');
  board.results(true);
  assert($('results-publish').hidden, 'a published run is not offered again');
  assert($('publish-board').hidden && $('publish-form').dataset.view === 'done', 'the success view: the two lines and only D’acord');
}
// --- after a publication Comparteix comes next by itself (a moment after the success), with where they stand
{
  const opened = [];
  const { board, $, T, setRun, shares } = make({ session: true, alias: 'Drac101', afterPublish: o => opened.push(o) });
  setRun(RUN); board.openPublish(); await tick(); await tick();
  submit($); T.publishes[0].resolve({ improved: true }); await tick();
  assert.equal($('publish-send').textContent, 'D’acord', 'the success: D’acord as the only button');
  assert($('publish-board').hidden && $('publish-cancel').hidden && $('publish-form').dataset.view === 'done');
  T.alls[0].resolve([{ position: 7, alias: 'Drac101', difficulty: 1, quality: 90, score: 1, is_self: true, total: 20 }]);
  await new Promise(r => setTimeout(r, 5));
  assert(!$('publish-menu').open && shares.length === 1, 'Comparteix opens by itself');
  assert.equal(await shares[0].place, 'Ets el número 7 · top 35%!', 'its header gets the place line');
  const now = make({ session: true, alias: 'Drac101', afterPublish: () => {} });
  now.setRun(RUN); now.board.openPublish(); await tick(); await tick();
  submit(now.$); await tick();
  assert.equal(now.$('publish-form').dataset.view, 'wait', 'publishing: the calçot view');
  assert.equal(now.$('publish-title').textContent, 'Publicant…');
  now.T.publishes[0].resolve({ improved: true }); await tick();
  submit(now.$);
  assert(!now.$('publish-menu').open && now.shares.length === 1, 'D’acord does it at once, once');
  await new Promise(r => setTimeout(r, 5)); assert.equal(now.shares.length, 1);
}
{
  const run = async (reduce, manual) => {
    globalThis.matchMedia = () => ({ matches: reduce });
    try {
      const s = make({ session: true, alias: 'Drac101', afterPublish: () => {} });
      const fades = [];
      s.$('publish-menu').animate = (frames) => { const d = deferred(); const f = { frames, cancels: 0, finished: d.p, end: d, cancel() { this.cancels++; } }; fades.push(f); return f; };
      s.setRun(RUN); s.board.openPublish(); await tick(); await tick();
      submit(s.$); s.T.publishes[0].resolve({ improved: true }); await tick();
      if (manual) submit(s.$);
      else await new Promise(r => setTimeout(r, 5));
      return { s, fades };
    } finally { delete globalThis.matchMedia; }
  };
  for (const manual of [true, false]) {
    const { s, fades } = await run(true, manual);
    assert(!s.$('publish-menu').open && s.shares.length === 1 && !fades.length, `reduced motion (${manual ? 'D’acord' : 'automatic'}): no fade, Comparteix once`);
    await new Promise(r => setTimeout(r, 5)); assert.equal(s.shares.length, 1);
    const n = await run(false, manual);
    assert(n.s.$('publish-menu').open && !n.s.shares.length && n.fades.length === 1 && n.fades[0].frames[1].opacity === 0, 'normal motion: the sheet fades first');
    n.fades[0].end.resolve(); await tick();
    assert(!n.s.$('publish-menu').open && n.s.shares.length === 1 && n.fades[0].cancels === 1, 'the fade ends: its hold is cancelled, Comparteix once');
    const r = await run(false, manual);
    r.fades[0].end.reject(new Error('cancelled')); await tick();
    assert(!r.s.$('publish-menu').open && r.s.shares.length === 1, 'an interrupted fade still hands off');
  }
}
// --- Turnstile runs only when a token is needed (Publica for a new profile), never ahead; never a Supabase session before it
{
  const s = make(); await tick();
  assert.equal(s.calls.captcha, 0, 'nothing loads before a publish');
  s.setRun(RUN); s.board.openPublish(); s.$('publish-alias').value = 'Drac101'; await tick(); await tick();
  assert.equal(s.calls.captcha, 0, 'opening the sheet asks nothing either');
  assert(!s.$('publish-send').disabled);
  submit(s.$); await tick();
  assert.equal(s.calls.captcha, 1, 'Publica loads it');
  s.widgets[0]['error-callback']('110200'); await tick();
  assert.deepEqual(s.reports.at(-1), ['turnstile-failed', { code: '110200' }], 'a failure is reported (the code only)');
  assert.match(s.$('publish-status').textContent, /no està autoritzat.*codi 110200/, '…and says what went wrong, with the code');
  assert(s.board.open === true, 'the board counts as open while its sheets are up');
  s.$('captcha-menu').showModal(); s.$('publish-menu').close(); assert(s.board.open, '…the tick box too (game keys blocked)');
}
// --- closing mid-request: a late token or success changes nothing on screen, but a sent run is marked published
{
  const { board, $, calls, T, widgets, setRun } = make();
  setRun(RUN); board.results(true); board.openPublish(); $('publish-alias').value = 'Drac101'; await tick();
  submit($); await tick(); await tick();
  $('publish-cancel').click();
  widgets[0].callback('tok'); await tick();
  assert.equal(calls.publish.length, 0, 'closed while verifying: the token publishes nothing');
  board.openPublish(); $('publish-alias').value = 'Drac101'; await tick(); await tick();
  submit($); await tick(); await tick();
  assert.equal(calls.publish.length, 1, 'the fresh token from before is used on the next press');
  $('publish-cancel').click();
  T.publishes[0].resolve({ improved: true, quality: 90, score: 43210 }); await tick();
  assert.equal($('publish-status').textContent, '', 'no late message on a closed sheet');
  board.results(true);
  assert($('results-publish').hidden);
  // a new run replaces the snapshot: it can be published again
  setRun({ ...WEAK, score: 1 }); board.results(true);
  assert(!$('results-publish').hidden);
  // a late error after reopening belongs to the old request
  board.openPublish(); $('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  submit($); await tick(); await tick();
  widgets[0].callback('tok2'); await tick();
  $('publish-cancel').click(); board.openPublish(); $('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  T.publishes[1].reject(Object.assign(new Error('x'), { code: 'unavailable' })); await tick();
  assert.equal($('publish-status').textContent, '', 'a stale failure does not show on the new sheet');
}
// --- existing session: no CAPTCHA; blocked storage: temporary profile note; no site key: unavailable; load fails
{
  const s = make({ session: true }); s.setRun(RUN); s.board.openPublish(); s.$('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  assert.equal(s.calls.captcha, 0, 'an existing profile publishes without a challenge');
  assert(!s.$('publish-send').disabled && s.$('publish-temp').hidden);
  submit(s.$);
  assert.equal(s.calls.publish[0].opts.captchaToken, null);
  const p = make({ persistent: false, captchaRequired: false }); p.setRun(RUN); p.board.openPublish(); p.$('publish-alias').value ||= 'Drac101'; await tick();
  assert(!p.$('publish-temp').hidden && p.calls.captcha === 0, 'blocked storage explains the profile is temporary');
  const k = make({ siteKey: '' }); k.setRun(RUN); k.board.openPublish(); k.$('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  assert(k.$('publish-send').disabled && k.calls.captcha === 0, 'no site key: no unprotected sign-up');
  assert.match(k.$('publish-status').textContent, /no es poden publicar/);
  const f = make(); f.T.captchaFails = true; f.setRun(RUN); f.board.openPublish(); f.$('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  submit(f.$); await tick(); await tick();
  assert.match(f.$('publish-status').textContent, /No s’ha pogut carregar la verificació.*codi load/);
  f.T.captchaFails = false; submit(f.$); await tick(); await tick();
  assert(f.calls.captcha === 2 && f.widgets.length === 1 && f.calls.publish.length === 0, 'Torna-ho a provar reloads the check');
}
{
  const { board, $, calls, T, setRun } = make({ session: true, alias: 'Drac101' });
  setRun(WEAK); board.results(true); board.openPublish(); await tick(); await tick();
  submit($);
  T.publishes[0].reject(Object.assign(new Error('No s’ha pogut connectar. Torna-ho a provar.'), { code: 'unavailable', detail: 'rpc:Error:0' }));
  await tick(); await tick();
  assert.equal(calls.publish.length, 1, 'a lost response never triggers an automatic publish retry');
  assert.equal($('publish-send').textContent, 'Torna-ho a provar');
  assert(!$('publish-send').disabled, 'the player can retry after a transport failure');
  board.results(true);
  assert(!$('results-publish').hidden, 'the pending result survives the failed request');
  submit($);
  T.publishes[1].reject(Object.assign(new Error('Espera uns segons i torna-ho a provar.'), { code: 'rate_limit' }));
  await tick();
  assert(!$('publish-send').disabled, 'a rate limit after a lost response also permits a later retry');
  submit($);
  assert.equal(calls.publish.length, 3);
  for (const call of calls.publish) {
    assert.strictEqual(call.result, WEAK, 'manual retries send the same pending result');
    assert.equal(call.alias, 'Drac101');
  }
  T.publishes[2].resolve({ improved: false, quality: 90, score: RUN.score }); await tick();
  assert.match($('publish-status').textContent, /^Publicat com a .+\. La classificació mostra el teu millor resultat\.$/);
  board.results(true);
  assert($('results-publish').hidden, 'a confirmed non-improving retry completes publication');
}
// --- a nickname someone else has (server: leaderboard_alias_taken): under the field, marked, focused
{
  const { board, $, T, setRun } = make({ session: true });
  setRun(RUN); board.openPublish(); $('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  $('publish-alias').value = 'Drac101'; submit($);
  T.publishes[0].reject(Object.assign(new Error('Aquest sobrenom ja és d’algú. Prova’n un altre.'), { code: 'taken' })); await tick();
  assert.equal($('publish-alias').getAttribute('aria-invalid'), 'true');
  assert(!$('publish-error').hidden && $('publish-error').textContent === 'Aquest sobrenom ja és d’algú. Prova’n un altre.', 'the error right under the field');
  assert($('publish-rule').hidden && $('publish-status').textContent === '', 'in the hint’s place, not in the status line');
  assert.equal(doc.activeElement, $('publish-alias'));
  $('publish-alias').value = 'Drac202'; $('publish-alias').fire('input');
  assert($('publish-error').hidden && !$('publish-rule').hidden, 'typing a valid one clears it');
}
// --- the prompt that opens by itself: once per eligible run, over a bare results screen, sending nothing until Publica
{
  const wait = async () => { await tick(); await tick(); };
  const a = make();
  a.board.results(true); await wait();
  assert(!a.$('publish-menu').open, 'no eligible run (practice, ?autoplay, ?from…: no snapshot): no prompt');
  a.board.results(false);
  a.setRun(RUN); a.board.results(true);
  assert(!a.$('publish-menu').open, 'not at once: a moment after the row appears');
  await wait();
  assert(a.$('publish-menu').open, 'eligible: it opens by itself');
  assert.equal(doc.activeElement, a.$('publish-menu'), 'the sheet takes focus, not Publica (a Space for the results must not publish)');
  assert.equal(a.calls.publish.length + a.calls.captcha + a.calls.all, 0, 'consent: nothing sent, no Turnstile, no list');
  assert(!a.$('publish-field').hidden && a.$('publish-alias').value === '', 'new player: the field, empty');
  a.$('publish-alias').value = 'Drac101';
  a.env.t = 100; submit(a.$);
  assert.equal(a.calls.captcha, 0, 'a tap already on its way when it appeared does nothing');
  a.$('publish-cancel').click();
  assert.equal(a.mem.get(DECLINES_KEY), '1', '«Ara no» counts');
  a.board.results(true); a.board.results(false); a.board.results(true); await wait();
  assert(!a.$('publish-menu').open, 'once per run');
  assert(!a.$('results-publish').hidden, 'the results row keeps «Publica el resultat»');
  a.$('results-publish').click(); await wait();
  a.$('publish-cancel').click();
  assert.equal(a.mem.get(DECLINES_KEY), '1', 'closing a sheet they opened themselves is not a decline');
  // never over another sheet, off the results, hidden/rotated (main.js canPrompt), offline, or for a run with 0 hits
  for (const [why, set, run] of [['another sheet up', e => { e.canPrompt = false; }], ['offline', e => { e.online = false; }],
    ['0 hits (a fail with nothing hit)', () => {}, { ...RUN, counts: { perfect: 0, good: 0, miss: 181 } }]]) {
    const m = make(); set(m.env); m.setRun(run || RUN); m.board.results(true); await wait();
    assert(!m.$('publish-menu').open, `no prompt: ${why}`);
  }
  const gone = make(); gone.setRun(RUN); gone.board.results(true); gone.board.results(false); await wait();
  assert(!gone.$('publish-menu').open, 'left the results before it came: nothing');
  const offWrite = make({ publishingEnabled: false }); offWrite.setRun(RUN); offWrite.board.results(true); await wait();
  assert(!offWrite.$('publish-menu').open, 'publishing off: no prompt');
  const offline = make({ configured: false }); offline.setRun(RUN); offline.board.results(true); await wait();
  assert(!offline.$('publish-menu').open, 'leaderboard not configured: no prompt');
}
// --- «No m’ho tornis a recordar»: a permanent opt-out (only on the prompt that opened by itself); ⚙ Configuració turns it back on
{
  const wait = async () => { await tick(); await tick(); };
  const a = make({ afterPublish: () => {} }); a.setRun(RUN); a.board.results(true); await wait();
  assert(a.$('publish-menu').open && !a.$('publish-never').hidden, 'the auto prompt offers it');
  a.$('publish-never').click();
  assert(!a.$('publish-menu').open && a.mem.get(OPTOUT_KEY) === '1', 'stores the opt-out');
  assert(!a.mem.has(DECLINES_KEY), 'and is not counted as a decline');
  assert.equal(a.shares.length, 1, 'Comparteix opens next, like «Ara no»');
  assert.equal(a.shares[0].published, false);
  a.board.results(false); a.setRun({ ...RUN, score: 5 }); a.board.results(true); await wait();
  assert(!a.$('publish-menu').open, 'never opens by itself again');
  a.$('results-publish').click(); await wait();
  assert(a.$('publish-menu').open && a.$('publish-never').hidden, 'opened on purpose: no such button');
  a.$('publish-cancel').click();
  // ⚙ Configuració: the row only while the prompt is off; «Activa» clears the opt-out and the decline count
  a.board.refreshSettings();
  assert.equal(a.$('settings-prompt-row').hidden, false, 'opted out: the row shows');
  a.$('settings-prompt').fire('click');
  assert(!a.mem.has(OPTOUT_KEY) && !a.mem.has(DECLINES_KEY) && a.$('settings-prompt-row').hidden, 'Activa: both cleared, the row goes');
  { const on = make(); on.board.refreshSettings(); assert.equal(on.$('settings-prompt-row').hidden, true, 'prompt on: no row'); }
  const t = make({ declined: MAX_DECLINES }); t.board.refreshSettings();
  assert.equal(t.$('settings-prompt-row').hidden, false, 'three declines also show it');
  t.$('settings-prompt').fire('click');
  assert(!t.mem.has(DECLINES_KEY), 'Activa resets the decline count');
  t.setRun(RUN); t.board.results(true); await wait();
  assert(t.$('publish-menu').open, 'and it prompts again');
  assert(make({ configured: false }).$('settings-prompt-row').hidden, 'offline game: no row');
}
// --- «Ara no» three times in a row: it stops opening by itself; Escape / a tap outside count too; a publication resets
{
  const wait = async () => { await tick(); await tick(); };
  const m = make();
  for (let i = 0; i < MAX_DECLINES; i++) {
    m.setRun({ ...RUN, score: i }); m.board.results(true); await wait();
    assert(m.$('publish-menu').open, `prompt ${i + 1}`);
    if (i === 1) m.$('publish-menu').close(); else m.$('publish-cancel').click(); // Escape / light dismiss close the dialog too
    m.board.results(false);
  }
  assert.equal(m.mem.get(DECLINES_KEY), String(MAX_DECLINES));
  m.setRun({ ...RUN, score: 9 }); m.board.results(true); await wait();
  assert(!m.$('publish-menu').open, 'after three «Ara no» in a row it stays closed');
  assert(!m.$('results-publish').hidden, '…and «Publica el resultat» is still on the results row');
  m.$('results-publish').click(); await wait(); m.$('publish-alias').value = 'Drac101';
  submit(m.$); await wait(); m.widgets[0].callback('tok'); await wait(); m.T.publishes[0].resolve({ improved: true }); await wait();
  assert(!m.mem.has(DECLINES_KEY), 'a publication starts the count again');
  m.board.results(false); m.$('publish-menu').close();
  m.setRun({ ...RUN, score: 10 }); m.board.results(true); await wait();
  assert(m.$('publish-menu').open, 'so it opens by itself again');
  const tired = make({ declined: MAX_DECLINES }); tired.setRun(RUN); tired.board.results(true); await wait();
  assert(!tired.$('publish-menu').open, 'remembered across visits');
  const weak = make(); weak.setRun({ ...RUN, counts: { perfect: 20, good: 30, miss: 130 } }); weak.board.results(true); await wait();
  assert(!weak.$('publish-menu').open && !weak.$('results-publish').hidden, 'under 2 stars: never asked by itself, the button stays');
}
// --- a returning player (profile + remembered alias): ONE tap, as that alias; «Canvia el sobrenom» opens the field
{
  const wait = async () => { await tick(); await tick(); };
  // a run worth asking about goes up by itself: no sheet, the remembered alias, no Turnstile; the button goes meanwhile
  const q = make({ session: true, alias: 'Drac101', afterPublish: () => {} });
  q.setRun(RUN); q.board.results(true); await wait();
  assert(!q.$('publish-menu').open && q.calls.publish.length === 1, 'published by itself, with no prompt');
  assert.deepEqual([q.calls.publish[0].result, q.calls.publish[0].alias, q.calls.publish[0].opts.captchaToken, q.calls.captcha], [RUN, 'Drac101', undefined, 0]);
  q.board.results(true); q.board.results(false); q.board.results(true);
  assert(q.$('results-publish').hidden, 'while it goes up: no «Publica el resultat» to send it twice');
  q.T.publishes[0].resolve({ improved: true }); await wait();
  assert(q.$('results-publish').hidden && !q.$('publish-menu').open && !q.shares.length, 'done: nothing on screen, no Comparteix');
  q.board.results(false); q.setRun(WEAK); q.board.results(true); await wait();
  assert(q.calls.publish.length === 1 && !q.$('results-publish').hidden, 'under 2 stars: not by itself, the button stays');
  // it fails (network, rate limit) or the profile is gone: the prompt, as for anyone
  const f = make({ session: true, alias: 'Drac101' });
  f.setRun(RUN); f.board.results(true); await wait();
  f.T.publishes[0].reject(Object.assign(new Error('x'), { code: 'unavailable' })); await wait();
  assert(f.$('publish-menu').open && !f.$('results-publish').hidden, 'a failed quiet publish falls back to the prompt');
  const gone = make({ session: true, alias: 'Drac101', prof: null });
  gone.setRun(RUN); gone.board.results(true); await wait(); await wait();
  assert(gone.calls.publish.length === 0 && gone.$('publish-menu').open, 'a profile gone: never quietly, the sheet makes a new one');
  // opened by hand (or a weak run): ONE tap, as that alias
  const r = make({ session: true, alias: 'Drac101' });
  r.setRun(WEAK); r.board.results(true); r.board.openPublish(); await wait();
  assert(r.$('publish-menu').open && !r.$('publish-as').hidden && r.$('publish-field').hidden, 'one-tap view');
  assert.equal(r.$('publish-as-name').textContent, 'Drac101');
  assert.equal(r.calls.publish.length + r.calls.captcha, 0, 'nothing before the tap');
  r.env.t = 1000; submit(r.$);
  assert.equal(r.calls.publish.length, 1, 'one tap publishes');
  assert.deepEqual([r.calls.publish[0].alias, r.calls.publish[0].opts.captchaToken, r.calls.captcha], ['Drac101', null, 0], 'as the remembered alias, no Turnstile');
  r.T.publishes[0].resolve({ improved: true }); await wait();
  r.T.alls[0].resolve([{ position: 7, alias: 'Drac101', difficulty: 1, quality: 90, score: 40000, is_self: true, total: 60 }]); await wait();
  assert.equal(r.$('publish-place').textContent, 'Ets el número 7 · top 12%!', 'the place on the joint board');
  { // not on the first page (nor its neighbours): no line
    const x = make({ session: true, alias: 'Drac101' });
    x.setRun(RUN); x.board.openPublish(); await wait(); x.env.t = 1000; submit(x.$);
    x.T.publishes[0].resolve({ improved: true }); await wait();
    x.T.alls[0].resolve([{ position: 1, alias: 'Jan', difficulty: 2, quality: 99, score: 90000, is_self: false, total: 60 }]); await wait();
    assert(x.$('publish-place').hidden, 'success line: only with an own row');
    assert(x.$('publish-status').classList.contains('ok'), 'the success itself stays');
  }
  const e = make({ session: true, alias: 'Drac101' });
  e.setRun(RUN); e.board.openPublish(); await wait();
  assert.equal(e.focused.at(-1), 'publish-send', 'opened by hand: Publica has the focus (Enter publishes)');
  assert(e.$('publish-field').hidden && !e.$('publish-as').hidden, 'one tap: the alias is shown, not editable');
  // a remembered alias but no profile any more (cleared elsewhere): the field, prefilled, and Turnstile on the press
  const g = make({ alias: 'Drac101' });
  g.setRun(RUN); g.board.openPublish(); await wait();
  assert(!g.$('publish-field').hidden && g.$('publish-alias').value === 'Drac101' && g.calls.captcha === 0);
  // an old alias the current rules refuse: straight to the field
  const old = make({ session: true, alias: 'Mu' });
  old.setRun(RUN); old.board.openPublish();
  assert(!old.$('publish-field').hidden, 'an alias the rules refuse is not offered for one tap');
}
// --- alias rule on send; typing a valid alias clears the complaint
{
  const { board, $, calls, setRun, focused } = make({ session: true });
  setRun(RUN); board.openPublish(); $('publish-alias').value ||= 'Drac101'; await tick();
  for (const [bad, why] of [['<script>', 'Només lletres, números i guions. Treu els altres símbols.'],
    ['Put4', 'Aquest sobrenom conté «Put4», que no es pot fer servir. Tria’n un altre.'],
    ['p-u-t-a', 'Aquest sobrenom conté «p-u-t-a», que no es pot fer servir. Tria’n un altre.'],
    ['Drac De Valls', 'No pot tenir espais. Ajunta les paraules, per exemple DracDeValls.'], // never joined for them
    ['Admin', '«Admin» està reservat. Tria’n un altre.'], ['x', 'Ha de tenir entre 3 i 16 caràcters. Escurça’l o allarga’l.']]) {
    $('publish-alias').value = bad; submit($);
    assert.equal($('publish-alias').getAttribute('aria-invalid'), 'true');
    assert.equal($('publish-error').textContent, why, 'the refusal says which part and what to do (src/services/alias-rules.js), under the field');
    assert(!$('publish-error').hidden && $('publish-rule').hidden && $('publish-status').textContent === '');
  }
  assert.equal(calls.publish.length, 0);
  assert.equal(focused.at(-1), 'publish-alias');
  $('publish-alias').value = 'Mar'; $('publish-alias').fire('input');
  assert.equal($('publish-alias').getAttribute('aria-invalid'), 'false');
  assert($('publish-error').hidden && $('publish-error').textContent === '');
  $('publish-alias').value = 'Mulassa'; submit($); // "mulassa" is not reserved (0010)
  assert.deepEqual(calls.publish.map(p => p.alias), ['Mulassa'], 'Mulassa publishes');
}
// --- the server refuses a nickname the client let through (lists drifted): the generic message, under the field
{
  const { board, $, T, setRun, calls } = make({ session: true });
  setRun(RUN); board.openPublish(); $('publish-alias').value ||= 'Drac101'; await tick(); await tick();
  $('publish-alias').value = 'Drac101'; submit($);
  T.publishes[0].reject(Object.assign(new Error(ALIAS_MESSAGES.blocked), { code: 'blocked' })); await tick();
  assert.equal($('publish-alias').getAttribute('aria-invalid'), 'true');
  assert.equal($('publish-error').textContent, 'Aquest sobrenom no es pot fer servir. Tria’n un altre.');
  assert($('publish-status').textContent === '' && $('publish-send').textContent === 'Publica' && doc.activeElement === $('publish-alias'));
  $('publish-alias').value = 'Drac202'; submit($);
  assert.equal(calls.publish.length, 2, 'another nickname, the same press again');
}
// --- «Ja tens un perfil? Recupera’l» on the publish sheet: only where there is no profile; leaving is not an «Ara no»
{
  let recovers = 0;
  const y = make({ session: true, alias: 'Drac101', onRecover: () => recovers++ }); y.setRun(RUN); y.board.openPublish(); await tick(); await tick();
  assert(y.$('publish-recover').hidden, 'a profile here: nothing to recover');
  const n = make({ onRecover: () => recovers++ }); n.setRun(RUN); n.board.openPublish({ auto: true });
  assert(!n.$('publish-recover').hidden, 'recovery is present on the first paint, before identity resolves: no late row insertion');
  await tick(); await tick();
  assert(!n.$('publish-recover').hidden, 'no profile here: the link shows');
  n.$('publish-recover').click();
  assert.equal(recovers, 1); assert(!n.$('publish-menu').open, 'the publish sheet gives way');
  assert.equal(n.mem.get(DECLINES_KEY) ?? null, null, 'leaving for the profile sheet is not a decline');
  const off = make({}); off.setRun(RUN); off.board.openPublish(); await tick(); await tick();
  assert(off.$('publish-recover').hidden, 'no handler: no link');
}
// --- closing the board goes back to where it was opened from
{
  const { board, $ } = make({ session: true, alias: 'Drac101' });
  let backs = 0;
  board.openBoard(() => backs++); await tick();
  $('board-close').click();
  assert.equal(backs, 1, 'closing goes back to where it was opened from');
}
// --- device-bound profile: a short note only for someone who has published, only where this browser loses storage
{
  const UA = {
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    chrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
    crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
    macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_5; ca_ES)',
    facebook: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
    tiktok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_36.0 BytedanceWebview/d8a21c6',
    whatsapp: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 WhatsApp/2.24',
    firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  };
  assert.equal(deviceRisk({ ua: UA.iphone }), 'ios');
  assert.equal(deviceRisk({ ua: UA.ipad, touch: 5 }), 'ios', 'iPadOS says Macintosh: its touch points tell');
  assert.equal(deviceRisk({ ua: UA.mac }), 'safari');
  for (const k of ['instagram', 'facebook', 'tiktok', 'whatsapp']) assert.equal(deviceRisk({ ua: UA[k] }), 'inapp', k);
  for (const k of ['chrome', 'crios', 'macChrome', 'firefox']) assert.equal(deviceRisk({ ua: UA[k] }), null, `${k}: no note`);
  for (const k of ['iphone', 'instagram', 'mac']) assert.equal(deviceRisk({ ua: UA[k], standalone: true }), null, `${k} from the home screen: no note`);
  assert.equal(deviceRisk({ ua: UA.chrome, persistent: false }), 'private', 'storage blocked (private modes): it goes with the page');
  for (const t of Object.values(DEVICE_NOTES)) assert(t.startsWith('Aquest perfil només viu en aquest navegador.') && t.length <= 130 && !/'/.test(t), `short, Catalan apostrophes: ${t}`);

  // the note the ⚙ «Perfil» block shows (board.deviceNote): the browser decides, `persistent` is identity()'s storage probe
  const noteOf = (o, persistent = true) => make(o).board.deviceNote(persistent);
  assert.equal(noteOf({ ua: UA.iphone }), DEVICE_NOTES.ios, 'iPhone Safari');
  assert(/uns dies sense jugar/.test(DEVICE_NOTES.ios) && !/7 dies/.test(DEVICE_NOTES.ios) && /pantalla d’inici/.test(DEVICE_NOTES.ios), 'Safari: its own storage cap (no game deadline), the home screen');
  assert.equal(noteOf({ ua: UA.instagram }), DEVICE_NOTES.inapp, 'an in-app browser');
  assert.equal(noteOf({ ua: UA.iphone, standalone: true }), '', 'the home-screen app: no note');
  assert.equal(noteOf({ ua: UA.chrome }), '', 'ordinary Chrome: no note');
  assert.equal(noteOf({ ua: UA.chrome }, false), DEVICE_NOTES.private, 'storage blocked: it goes with the page');

  // the publish sheet: as a known alias, in Safari
  const pub = make({ ua: UA.iphone, alias: 'Drac101', session: true });
  pub.setRun(RUN); pub.board.openPublish(); assert(pub.$('publish-device').hidden, 'nothing before identity() answers');
  await tick(); await tick();
  assert(!pub.$('publish-device').hidden && pub.$('publish-device').textContent === DEVICE_NOTES.ios, 'publishing as a known alias on Safari: the note');
  const fresh = make({ ua: UA.iphone }); fresh.setRun(RUN); fresh.board.openPublish(); await tick(); await tick();
  assert(fresh.$('publish-device').hidden, 'a first publication: no note');
  const blocked = make({ ua: UA.iphone, alias: 'Drac101', session: true, persistent: false }); blocked.setRun(RUN); blocked.board.openPublish(); await tick(); await tick();
  assert(!blocked.$('publish-temp').hidden && blocked.$('publish-device').hidden, 'blocked storage: publish-temp says it, once');

  // storage.persist(): once, after the first successful publication
  const first = make({ ua: UA.chrome, captchaRequired: false });
  first.setRun(RUN); first.board.openPublish(); await tick(); await tick();
  first.$('publish-alias').value = 'Drac101'; submit(first.$); await tick();
  assert.equal(first.calls.persist, 0, 'not before it succeeds');
  first.T.publishes[0].resolve({ improved: true, quality: 90, score: 1 }); await tick();
  assert(first.calls.persist === 1 && first.mem.get(PERSIST_KEY) === '1', 'asked once the profile exists');
  first.$('publish-menu').close(); first.setRun({ ...RUN }); first.board.openPublish(); await tick(); await tick();
  submit(first.$); await tick(); first.T.publishes[1].resolve({ improved: false, quality: 90, score: 1 }); await tick();
  assert.equal(first.calls.persist, 1, 'never again');
}
// --- «ja és d’algú» for someone with no profile here yet: maybe theirs from another browser; a person can release it
{
  const n = make({ captchaRequired: false });
  n.setRun(RUN); n.board.openPublish(); await tick(); await tick();
  n.$('publish-alias').value = 'Drac101'; submit(n.$); await tick();
  n.T.publishes[0].reject(Object.assign(new Error('Aquest sobrenom ja és d’algú. Prova’n un altre.'), { code: 'taken' })); await tick();
  assert.equal(n.$('publish-error').textContent, 'Aquest sobrenom ja és d’algú. Si és teu i hi vas confirmar el correu, recupera el perfil.', 'recovery needs a confirmed address: said so');
}
// --- profiles without a deadline (docs/rankings/strategy.md §6): «Publicat com a» the name as the boards show it (a guest's
// «#1234» from the server, a confirmed address's check); a guest's «Publicat!» offers «Confirma el correu» (never by
// itself); the statistics' note goes with the publication (acceptStats); nothing about days or deadlines
const find = (el, test) => (test(el) ? el : el.children.map(c => find(c, test)).find(Boolean) ?? null);
{ // a new player: the guest profile the server made, its tag remembered apart from the name, the offer under Publicat!
  const confirms = [];
  const n = make({ captchaRequired: false, afterPublish: () => {}, onConfirm: o => confirms.push(o), prof: null });
  n.setRun(RUN); n.board.openPublish(); await tick(); await tick();
  assert(n.$('publish-offer').hidden, 'no offer before publishing');
  n.$('publish-alias').value = 'Drac101'; submit(n.$); await tick();
  assert.deepEqual(Object.keys(n.calls.publish[0].opts), ['captchaToken'], 'no notice flag any more');
  n.T.session = true; n.T.prof = { alias: 'Drac101', tag: 42, verified: false, published: true };
  n.T.publishes[0].resolve({ improved: true, quality: 90, score: 1 }); await tick();
  assert.equal(n.$('publish-form').dataset.view, 'done');
  assert.equal(n.$('publish-status').textContent, 'Publicat com a Drac101#0042. La classificació mostra el teu millor resultat.', 'the name as the boards show it');
  assert(!find(n.$('publish-status'), e => e.className?.includes?.('verified-check')), 'a guest: no check');
  assert(n.mem.get(ALIAS_KEY) === 'Drac101' && n.mem.get('leaderboard-tag') === '42', 'the name without its tag (an old tab reads it), the tag apart');
  assert.equal(n.calls.accept, 1, 'the statistics may be sent now');
  assert(!n.$('publish-offer').hidden && n.$('publish-send').textContent === 'D’acord', 'a guest: the offer, D’acord stays');
  assert(n.$('publish-menu').open && !confirms.length && !n.shares.length, 'nothing opens by itself');
  n.$('publish-confirm').click();
  assert(!n.$('publish-menu').open && confirms.length === 1 && 'place' in confirms[0], '«Confirma el correu»: the profile sheet next, the place along for Comparteix');
  // a confirmed address: the check, no offer
  const v = make({ session: true, alias: 'Drac101', mail: 'jo@example.test', afterPublish: () => {}, onConfirm: () => {}, prof: { alias: 'Drac101', tag: null, verified: true, published: true } });
  v.setRun(RUN); v.board.openPublish(); await tick(); await tick();
  assert(find(v.$('publish-as-name'), e => e.className?.includes?.('verified-check')), 'the one-tap row shows the check');
  submit(v.$); await tick(); v.T.publishes[0].resolve({ improved: true }); await tick(); await tick();
  assert(find(v.$('publish-status'), e => e.className?.includes?.('verified-check')) && v.$('publish-offer').hidden, 'confirmed: the check, no offer');
  // without an onConfirm (no profile sheet to go to): no offer
  const q = make({ captchaRequired: false, afterPublish: () => {}, prof: null });
  q.setRun(RUN); q.board.openPublish(); await tick(); await tick();
  q.$('publish-alias').value = 'Drac101'; submit(q.$); await tick();
  q.T.session = true; q.T.prof = { alias: 'Drac101', tag: 7, verified: false }; q.T.publishes[0].resolve({ improved: true }); await tick(); await tick();
  assert(q.$('publish-offer').hidden);
  // the account behind the session was purged: the publication left it, the retry asks for a new profile's token
  const purged = make({ session: true, alias: 'Drac101', afterPublish: () => {}, prof: { alias: 'Drac101', tag: 3, verified: false } });
  purged.setRun(RUN); purged.board.openPublish(); await tick(); await tick();
  submit(purged.$); await tick();
  purged.T.session = false; purged.T.publishes[0].reject(Object.assign(new Error('La sessió ha caducat. Torna-ho a provar.'), { code: 'session' })); await tick(); await tick();
  assert(!purged.$('publish-field').hidden, 'a new profile: the field');
}
{ // a remembered name whose profile row is gone (deleted, or 12 months away): this browser leaves the old session, picks a name again
  const g = make({ session: true, alias: 'Drac101', prof: null });
  g.setRun(RUN); g.board.openPublish(); await tick(); await tick(); await tick();
  assert.equal(g.calls.signout, 1, 'the old session goes');
  assert(!g.$('publish-field').hidden && g.$('publish-as').hidden, 'the field: the old name may be free or taken now');
  // a confirmed account with no row, or a session never published from here: kept
  const keepMail = make({ session: true, alias: 'Drac101', mail: 'jo@example.test', prof: null });
  keepMail.setRun(RUN); keepMail.board.openPublish(); await tick(); await tick(); await tick();
  const keepNew = make({ session: true, prof: null }); keepNew.setRun(RUN); keepNew.board.openPublish(); await tick(); await tick(); await tick();
  assert(keepMail.calls.signout === 0 && keepNew.calls.signout === 0);
}
{ // the board: a check for a confirmed address only; a tap shows what it means, leaving it hides it
  const b = make();
  b.board.openBoard(); await tick();
  b.T.alls[0].resolve([{ ...player(1, 2, 0), verified: true }, { ...player(2, 2, 0), verified: false }]); await tick(); await tick();
  const [first, second] = b.$('board-rows').children;
  const check = find(first, e => e.className?.includes?.('verified-check'));
  assert(check && check.tag === 'span' && check.attrs.role === 'img' && check.attrs['aria-label'] === VERIFIED && !check.dataset.tip, 'a mark named «Correu confirmat», no tip');
  assert(!find(second, e => e.className?.includes?.('verified-check')), 'unconfirmed: no check');
  assert.deepEqual(b.rows()[0], ['1', `${NAMES[0]}FÀCILratxa 1.199`, '99%', '123.35699%'], 'the check adds no text to the row');
  assert(!JSON.stringify(b.$('board-rows').children.map(tr => tr.textContent)).includes('@'), 'never an address');
}
// --- one board per figure and season: «Tria figura», the season's name and days left, guests, cards, an empty season, history
{
  const cards = [], halls = [], keeps = [];
  const b = make({ onCard: p => cards.push(p), onSeasons: f => halls.push(f), onKeep: () => keeps.push(1), alias: 'Gegant300' });
  b.T.seasons = [{ seasonId: 1, name: 'Tardor 2026', startsAt: NOW - 15 * 864e5, endsAt: NOW + 23 * 864e5, version: 'mulassa-v3', previousDance: false, players: 3, podium: [], myPosition: 2 },
    { seasonId: 0, name: 'Estrena 2026', startsAt: 0, endsAt: null, version: 'mulassa-v2-short', previousDance: false, players: 60, myPosition: null,
      podium: [{ position: 1, alias: 'Portadora', tag: null, verified: true, score: 172795, difficulty: 2 }, { position: 2, alias: 'Baldufa', tag: 1103, verified: false, score: 171996, difficulty: 2 }] }];
  b.board.openBoard(); await tick();
  assert.deepEqual(b.calls.lists.at(-1), { figure: 'mulassa-valls' }, 'the selector\'s figure, the open season');
  assert.equal(b.$('board-season').textContent.split(' · ')[0], 'Tardor 2026', 'the calendar names the season from the first frame');
  b.T.alls[0].resolve([{ position: 1, alias: 'Baldufa#1103', tag: 1103, verified: false, difficulty: 2, quality: 98, score: 9, total: 3, season_id: 1 },
    { position: 2, alias: 'Gegant300#0042', tag: 42, verified: false, is_self: true, difficulty: 1, quality: 90, score: 8, total: 3, season_id: 1 }]); await tick(); await tick(); await tick();
  assert.equal(b.$('board-season').textContent, 'Tardor 2026 · queden 23 dies', 'the server\'s season: its name and the days left');
  const rows = b.$('board-rows').children;
  assert.equal(rows.length, 3, 'a guest\'s own row has its quiet line under it');
  assert.equal(rows[2].className, 'me-hint');
  assert.equal(rows[2].textContent, 'Confirma el correu per no perdre el perfil');
  find(rows[2], e => e.tag === 'button').click(); assert.equal(keeps.length, 1, 'it opens the e-mail step');
  const guest = find(rows[0], e => e.className?.includes?.('player-name'));
  assert(guest.className.includes('guest') && find(guest, e => e.className === 'tag').textContent === '#1103' && find(guest, e => e.className === 'alias').textContent === 'Baldufa', 'a guest: the name, its tag apart (quieter)');
  guest.click(); assert.deepEqual(cards.at(-1), { alias: 'Baldufa', tag: 1103, verified: false,
    from: { figure: 'mulassa-valls', season: 'Tardor 2026', position: 1, score: 9, difficulty: 2 } }, 'a tap opens that player\'s card, with the row it came from');
  b.$('board-seasons').click(); assert.deepEqual(halls, ['mulassa-valls'], '«Temporades anteriors» for this figure');
  assert(b.$('board-menu').open, 'over the board');
  // «Tria figura»: the button over the list opens it in the same sheet, the shown figure cream; Escape and × come back
  assert(b.$('board-figure-name').textContent === 'Mulassa de Valls' && /<svg/.test(b.$('board-figure-pic').innerHTML), 'the figure\'s portrait and name');
  b.$('board-figure').click();
  assert(!b.$('board-picker').hidden && b.$('board-main').hidden && b.$('board-figure').attrs['aria-expanded'] === 'true', 'the picker in the list\'s place');
  assert.equal(b.focused.at(-1), 'board-pick-mulassa-valls', 'the shown figure takes the focus (a ring only for keyboard: focus.js)');
  assert(b.figMula.attrs['aria-pressed'] === 'true' && b.figDrac.attrs['aria-pressed'] === 'false');
  const esc = b.$('board-menu').fire('cancel');
  assert(esc.prevented && b.$('board-picker').hidden && !b.$('board-main').hidden && b.$('board-menu').open, 'Escape: back to the board, the sheet stays');
  assert.equal(b.focused.at(-1), 'board-figure');
  b.$('board-figure').click(); b.$('board-close').click();
  assert(b.$('board-picker').hidden && b.$('board-menu').open, '×: back to the board too');
  const reads = b.calls.all;
  b.$('board-figure').click(); b.figMula.click();
  assert(b.$('board-picker').hidden && b.calls.all === reads, 'the same figure: nothing to read');
  // the Drac: its own board, same season
  b.$('board-figure').click(); b.figDrac.click(); await tick();
  assert.deepEqual(b.calls.lists.at(-1), { figure: 'drac-valls' });
  assert(b.$('board-picker').hidden && b.$('board-figure-name').textContent === 'Drac de Valls');
  assert(b.figDrac.attrs['aria-pressed'] === 'true' && b.figMula.attrs['aria-pressed'] === 'false');
  // an empty season: what it means and what to do, and the season before's podium under it
  b.T.alls.at(-1).resolve([]); await tick(); await tick(); await tick();
  assert.equal(b.$('board-status').textContent, 'Encara no hi ha resultats');
  assert.equal(b.$('board-hint').textContent, 'Juga amb el Drac i publica el resultat per estrenar la classificació.');
  assert(!b.$('board-art').hidden && b.$('board-place').hidden && !b.$('board-seasons').hidden, 'its portrait; a history: «Temporades anteriors» stays');
  assert(!b.$('board-previous').hidden && b.$('board-previous').textContent.startsWith('Podi d’Estrena 2026'), 'the last season\'s podium, «d’» before a vowel');
  assert(b.$('board-previous').textContent.includes('Baldufa#1103'));
  // a closed season from the Saló de la fama: that board, its name alone, no guest line, no publish offer
  b.board.openBoard(null, { figure: 'mulassa-valls', seasonId: 0, version: 'mulassa-v2-short', name: 'Estrena 2026' }); await tick();
  assert.deepEqual(b.calls.lists.at(-1), { version: 'mulassa-v2-short', season: 0 });
  assert.equal(b.$('board-season').textContent, 'Estrena 2026');
  b.T.alls.at(-1).resolve([{ position: 1, alias: 'Gegant300#0042', tag: 42, is_self: true, difficulty: 1, quality: 90, score: 8, total: 1, season_id: 0 }]); await tick(); await tick();
  assert(b.$('board-rows').children.every(tr => tr.className !== 'me-hint'), 'history: no «Confirma el correu» line');
  assert.equal(b.$('board-summary').textContent, 'Posició 1 de 1');
  b.$('board-figure').click(); b.figMula.click(); await tick();
  assert.deepEqual(b.calls.lists.at(-1), { figure: 'mulassa-valls' }, 'the pressed figure again: back to the current season');
  // no history at all: no podium, no «Temporades anteriors»
  b.T.seasons = []; b.env.t += 61e3; b.board.openBoard(null, { figure: 'drac-valls' }); b.T.alls.at(-1).resolve([]); await tick(); await tick(); await tick(); // (past the season cache's minute)
  assert(b.$('board-previous').hidden && b.$('board-seasons').hidden && b.$('board-status').textContent === 'Encara no hi ha resultats');
}
// --- markup: every id the module needs exists, copy is Catalan, buttons are .btn, live regions, privacy section
{
  const html = readPage();
  for (const id of ids) assert(html.includes(`id="${id}"`), `index.html has #${id}`);
  assert(!/board-diff/.test(html), 'one board: no level tabs');
  const heads = [...html.matchAll(/<thead>([\s\S]*?)<\/thead>/g)].map(m => (m[1].match(/<th[ >]/g) || []).length);
  assert.deepEqual(heads, [4, 4], 'the visible headings (above the scroll) and the table\u2019s own (screen readers) have the rows\u2019 four columns');
  const cols = [...html.matchAll(/<colgroup>([\s\S]*?)<\/colgroup>/g)].map(m => m[1]);
  assert(cols.length === 2 && cols[0] === cols[1], 'both tables share the same column widths');
  // portrait phones: the % under the points, its whole column gone (cells and <col>: WebKit kept a width-0 column's share), the name gets that room
  const phones = [...html.matchAll(/@media \(max-width: 519px\) \{\n([\s\S]*?)\n\}/g)].map(m => m[1]).find(b => b.includes('pct-sub')) ?? '';
  assert(/:is\(\.c-pct, :is\(th, td\):nth-child\(3\)\) \{ display: none; \}/.test(phones) && /\.pct-sub \{ display: block;/.test(phones) && /\.pct-sub \{ display: none; \}/.test(html),
    'phones: the % moves under the points and its column gives its room to the name');
  assert(!/\.streak \{[^}]*ellipsis/.test(html) && /#board-table \.sub \{[^}]*flex-wrap: wrap;/.test(html), 'the level and streak line wraps, never «ratxa …»');
  for (const id of ['board-status', 'publish-status', 'profile-status']) assert(new RegExp(`id="${id}"[^>]*role="status"`).test(html), `#${id} is announced`);
  const sheet = id => html.slice(html.indexOf(`<dialog id="${id}"`), html.indexOf('</dialog>', html.indexOf(`<dialog id="${id}"`)));
  for (const id of ['board-menu', 'publish-menu']) {
    assert(!/<button(?![^>]*class="(btn|sheet-x))/.test(sheet(id)), `${id}: every button is a .btn (or the corner X)`);
    // «Publica el teu resultat» and «Juga amb …» never show together (tested above); «Confirma el correu» only while
    // its .publish-offer steps #publish-send down to secondary (board.css)
    assert.equal((sheet(id).replace(/id="board-(publish|play)"[^>]*/g, '').replace(/id="publish-confirm"[^>]*/, '').match(/btn-primary/g) || []).length, id === 'publish-menu' ? 1 : 0, `${id}: one primary per view (the board has none but «Publica el teu resultat» / «Juga amb …»)`);
    assert(!/\b(OK|Cancel|Delete|Submit|Leaderboard|Settings)(?![·\w])/.test(sheet(id).replace(/<[^>]*>/g, ' ')), `${id}: no English copy`);
  }
  assert(/No cal que sigui el teu nom real · 3–16 caràcters/.test(sheet('publish-menu')), 'a real name is not required (one short line)');
  assert(!/publish-captcha/.test(html), 'no Turnstile box inside the publish sheet: its own centred sheet');
  const cap = sheet('captcha-menu');
  assert(/Una comprovació ràpida/.test(cap) && /Marca la casella per confirmar que no ets un robot\./.test(cap) && /id="captcha-box"/.test(cap), 'the tick box sheet: title, one line, the widget');
  assert(!/Cancel·la|btn-primary/.test(cap), 'not dismissable: no Cancel·la');
  assert(!/setmana|board-period/i.test(sheet('board-menu')) && !/de la setmana/.test(html), 'no weekly board anywhere');
  assert(!/settings-alias|board-alias|publish-edit|board-delete|delete-confirm|board-note/.test(html), 'no nickname editing and no deletion in Classificacions: the profile is one block in Configuració');
  assert(/id="profile-row"[^>]*>[\s\S]*id="profile-main"[\s\S]*id="profile-alt"/.test(sheet('account-menu')) && !/id="profile-(row|main|alt)"/.test(sheet('settings-menu')) && /id="settings-profile"/.test(sheet('settings-menu')) && /id="publish-recover"/.test(sheet('publish-menu')), 'the profile block lives in Perfil (⚙ only opens it), and «Recupera» on the publish sheet');
  assert(/data-privacy-open/.test(sheet('publish-menu')) && /data-privacy-open/.test(sheet('board-menu')), 'privacy reachable before publishing');
  const privacy = sheet('privacy-menu');
  assert(/data-privacy="leaderboards"/.test(privacy) && /Supabase/.test(privacy) && /Turnstile/.test(privacy), 'Privadesa: a Supabase section of its own');
  assert(/després de la teva primera partida <b>Cloudflare Turnstile<\/b>/.test(privacy) && /a tothom, publiquis o no/.test(privacy) && !/Només es carrega quan prems/.test(privacy), 'Turnstile runs for everyone after their first game: said plainly');
  assert(!/RGPD|GDPR|compleix/i.test(privacy), 'no compliance claims');
  const owner = privacy.slice(privacy.lastIndexOf('</section>'));
  assert(/Responsable: <b>Marc Güell Segarra<\/b>, de <b>Mulassa Tap Tap Dance<\/b> \(projecte de codi obert, Valls\)/.test(owner) && /aepd\.es/.test(owner), 'the controller (a person), once, for the whole sheet (after every section), and where to complain');
  assert(/Correu \(opcional\)/.test(privacy) && /Resend/.test(privacy) && /menys de 14 anys/.test(privacy) && /No fem servir galetes de seguiment/.test(privacy), 'the optional e-mail, its processor, minors, and the cookie statement');
  assert.equal((html.match(/Responsable:/g) || []).length, 1, 'not repeated per section');
  assert.equal((html.match(/data-email="/g) || []).length, 1, 'one place for the contact e-mail');
  assert(/<span id="privacy-contact" data-email="holi@mulassa\.cat" hidden>/.test(owner), 'the published contact; shown by board-ui as a mailto link');
  assert(/autocomplete="off"/.test(sheet('publish-menu')) && /maxlength="24"/.test(sheet('publish-menu')));
  // the offer is the done view's primary (D'acord steps down); no deadline anywhere
  assert(/id="publish-offer" class="publish-offer" hidden>[\s\S]*id="publish-confirm" type="button" class="btn btn-primary"/.test(sheet('publish-menu')), 'the offer: hidden, the primary, after the place line');
  assert(/Ets convidat: si esborres les dades del navegador, perdràs el perfil\./.test(sheet('publish-menu')));
  assert(/els totals de les teves estadístiques seran públics/.test(sheet('publish-menu')), 'publishing says the statistics\' totals go public with the profile (their notice)');
  assert(!/7 dies|caduca|temporal/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'no 7-day text anywhere');
  assert(/Tens un perfil amb el correu confirmat\? Recupera’l/.test(sheet('publish-menu')), 'recovery needs a confirmed address');
  assert(/<b>convidat<\/b>/.test(privacy) && /Timbaler#3821/.test(privacy) && /<b>12 mesos<\/b> sense jugar ni publicar/.test(privacy) && /rècords del dispositiu es mantenen/.test(privacy), 'Privadesa: guests, their #1234, the 12 months, local records');
  assert(/totals[^.]*són <b>públics<\/b>[^.]*tocant?[^.]*sobrenom|Els totals són <b>públics<\/b>/.test(privacy) && /Els dies són <b>privats<\/b>/.test(privacy) && /Mai no s’hi envia l’hora/.test(privacy) && /Tot s’esborra amb el perfil/.test(privacy), 'Privadesa: public totals, private days, never times or the device, all deleted with the profile');
  assert(/<b>estadístiques<\/b>/.test(privacy.slice(privacy.indexOf('data-privacy="device"'), privacy.indexOf('data-privacy="leaderboards"'))), 'Privadesa: the statistics are kept on the device');
  assert(/marca de «Correu confirmat»/.test(privacy) && /no confirmat no compta/.test(privacy) && !/El perfil i els resultats es conserven fins que els esborres: ho/.test(privacy.replace('Amb el correu confirmat, el perfil i els resultats es conserven fins que els esborres', '')), 'Privadesa: the check, a pending address, and no longer «kept until you delete it» for everyone');
  assert(!/torneig|tornejos/i.test(privacy), 'no tournament claims in the privacy text');
}
console.log('classificacions sheets ok');
