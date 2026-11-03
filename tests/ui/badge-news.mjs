// The badges' news (src/ui/badge-news.js) and the confirm gate (src/ui/confirm-gate.js) in a small fake DOM: who is told, once,
// where each button leads, and how the gate carries a new profile on to its address without losing what was asked for.
import assert from 'node:assert/strict';
import { setupBadgeNews } from '../../src/ui/badge-news.js';
import { setupConfirmGate } from '../../src/ui/confirm-gate.js';
import { savedName, ownerKey } from '../../src/services/leaderboard-identity.js';
import { setupGreeting } from '../../src/ui/greeting.js';

class El {
  constructor() { Object.assign(this, { hidden: false, dataset: {}, on: {}, open: false, kids: [], attrs: {}, className: '', innerHTML: '', text: '' }); }
  get childElementCount() { return this.kids.length; } get firstChild() { return this.kids[0] ?? null; }
  get textContent() { return this.text; } set textContent(v) { this.text = String(v); }
  get classList() { return { add() {}, remove() {}, toggle() {}, contains: () => false }; }
  append(...c) { this.kids.push(...c); } appendChild(c) { this.kids.push(c); return c; } replaceChildren(...c) { this.kids = c; }
  setAttribute(k, v) { this.attrs[k] = v; } insertAdjacentHTML() {} querySelector() { return null; } querySelectorAll() { return []; }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); } click() { for (const f of this.on.click || []) f({}); }
  showModal() { this.open = true; } close() { if (!this.open) return; this.open = false; for (const f of this.on.close || []) f({}); }
}
const fakeDoc = () => { const els = new Map(); return { getElementById: id => { if (!els.has(id)) els.set(id, new El()); return els.get(id); }, createElement: () => new El(), createElementNS: () => new El() }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const memStore = () => { const m = new Map(); return { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, String(v)), m }; };
const guest = { alias: 'Prova', verified: false, released: false, publicId: 'p1', badgeId: null, canBadge: true };

function news({ prof = guest, publishingEnabled = true, idle = () => true, after = prof, store = memStore(), server } = {}) {
  const doc = fakeDoc(), log = []; let reads = 0;
  const service = { publishingEnabled, ownerId: async () => 'u1', seenNotices: async () => server, profile: async () => { if (prof instanceof Error) throw prof; return reads++ ? after : prof; } };
  const badges = { open: b => log.push(['picker', b]) }, profile = { open: (what, b) => log.push([what, b]) };
  const n = setupBadgeNews({ focusIn() {}, service, store, badges, profile, refresh: async () => {}, idle, reduced: () => true, doc });
  return { n, doc, log, store, $: id => doc.getElementById(id) };
}
// nobody without something to gain, and no seen mark spent on them
for (const [why, o] of [['no profile', { prof: null }], ['a released name', { prof: { ...guest, released: true } }], ['an older server', { prof: { ...guest, canBadge: false } }],
  ['no public id', { prof: { ...guest, publicId: null } }], ['offline', { prof: new Error('offline') }], ['publishing off', { publishingEnabled: false }]]) {
  const x = news(o);
  assert.equal(await x.n.show(), false, why); assert.equal(x.$('badge-news-menu').open, false, why); assert.equal(x.store.m.size, 0, `${why}: nothing marked`);
}
{ const x = news({ prof: { ...guest, verified: true, badgeId: 'senyera' } });
  assert.equal(await x.n.show(), false, 'a badge already chosen: nothing to tell'); assert.equal(x.store.get('seen:u1:badge-news'), '1'); }
{ const x = news({ server: ['badge-news'] });
  assert.equal(await x.n.show(), false, 'seen on another device (the server\'s list): not shown here'); }
{ const x = news();
  assert.equal(await x.n.show(null, () => false), false, 'the selector moved on during the read'); assert.equal(x.store.m.size, 0); }
{ const x = news(); x.n.holdVisit();
  assert.equal(await x.n.show(), false, 'a profile made this visit is not asked again at once'); assert.equal(x.store.m.size, 0, 'it waits for the next visit'); }
// confirmed: told once, «Ara no» and the button both spend it; the button opens the picker
{ const x = news({ prof: { ...guest, verified: true } }); let backs = 0;
  assert.equal(await x.n.show(() => backs++), true); assert.equal(x.$('badge-news-name').hidden, false); assert.equal(x.$('badge-news-shelf').hidden, true);
  x.$('badge-news-later').click();
  assert.deepEqual([x.log.length, backs, x.store.get('seen:u1:badge-news')], [0, 1, '1']);
  assert.equal(await x.n.show(), false, 'once');
  const y = news({ prof: { ...guest, verified: true } }); await y.n.show(); y.$('badge-news-go').click();
  assert.equal(y.log[0][0], 'picker'); }
// a guest: the whole shelf, then the address, then the picker only if it really got confirmed
{ const x = news({ after: { ...guest, verified: true } });
  assert.equal(await x.n.show(), true); assert.equal(x.$('badge-news-shelf').hidden, false); assert.equal(x.$('badge-news-name').hidden, true);
  assert.equal(x.$('badge-news-shelf').kids.length, 3, 'three rows'); x.$('badge-news-go').click();
  assert.equal(x.log[0][0], 'link'); x.log[0][1](); await tick(); await tick();
  assert.equal(x.log[1]?.[0], 'picker', 'confirmed: the picker'); }
{ const x = news(); let backs = 0; await x.n.show(() => backs++); x.$('badge-news-go').click(); x.log[0][1](); await tick(); await tick();
  assert.deepEqual([x.log.length, backs], [1, 1], 'cancelled: back, no picker'); }
{ let free = true; const x = news({ after: { ...guest, verified: true }, idle: () => free }); let backs = 0;
  await x.n.show(() => backs++); x.$('badge-news-go').click(); x.log[0][1](); free = false; await tick(); await tick();
  assert.deepEqual([x.log.length, backs], [1, 0], 'a game or a sheet started meanwhile: nothing opens over it, nothing steals the focus'); }

// the greeting: «answered» (the heart's ribbon waits for it) only once the news has had its say
{ let release; const gate = new Promise(r => { release = r; }), seen = [];
  const g = setupGreeting({ stats: { async init() {} }, seasonEnd: { async news() { return null; } }, account: { notice: () => false }, free: () => true,
    badgeNews: { show: async () => { await gate; return true; } }, asked: () => seen.push('asked') });
  const run = g.greet(); await tick(); await tick();
  assert.equal(g.answered, false, 'the ribbon must not be spent behind a sheet about to open');
  release(); await run; assert.equal(g.answered, true); assert.deepEqual(seen, ['asked']); }

// a device from 1.2.6: its cached identity has no badge fields and still reads as the same confirmed profile
{ const old = JSON.stringify({ hasSession: true, mailOn: 'a@b.cat', persistent: true, prof: { alias: 'Vell', verified: true, published: true, released: false, publicId: 'p9' } });
  const kv = { get: k => ({ 'leaderboard-alias': 'Vell', 'leaderboard-alias:identity': old })[k] ?? null };
  const me = savedName(kv);
  assert.deepEqual([me.alias, me.verified, me.publicId, me.badgeId], ['Vell', true, 'p9', null]); assert.equal(ownerKey(kv), 'p9', 'the selector\'s cached answers stay'); }
// the gate: a failed read is never «no account», which would offer Crea to a real profile and rename it
{ const doc = fakeDoc(), log = []; let done = 0;
  const need = setupConfirmGate({ focusIn() {}, identity: async () => { throw new Error('offline'); }, hasProfile: async () => false, openProfile: (...a) => log.push(a), doc });
  await need('heart', () => done++);
  assert(doc.getElementById('gate-menu').open && doc.getElementById('gate-go').hidden, 'identity failed: it says so, with no way on');
  assert.equal(done, 0); assert.equal(log.length, 0);
  const again = setupConfirmGate({ focusIn() {}, identity: async () => ({ hasSession: true, email: '' }), hasProfile: async () => { throw new Error('offline'); }, openProfile() {}, doc: fakeDoc() });
  await again('heart', () => done++); assert.equal(done, 0, 'a failed profile read neither'); }
// the gate
function gate({ email = '', hasSession = true, profiled = false } = {}) {
  const doc = fakeDoc(), log = [], T = { email }; let done = 0, reads = 0;
  const need = setupConfirmGate({ focusIn() {}, identity: async () => ({ hasSession, email: T.email }), hasProfile: async () => { reads++; return profiled; }, openProfile: (...a) => log.push(a), doc });
  return { need, doc, log, T, $: id => doc.getElementById(id), run: () => done++, get done() { return done; }, get reads() { return reads; } };
}
{ const g = gate({ email: 'a@b.cat' }); await g.need('heart', g.run); assert.equal(g.done, 1, 'confirmed: straight to the action'); assert.equal(g.$('gate-menu').open, false); }
{ const g = gate({ hasSession: false }); await g.need('heart', g.run);
  assert.equal(g.reads, 0, 'no session: no profile, without asking the server'); assert.equal(g.$('gate-menu').open, true);
  g.$('gate-go').click(); assert.equal(g.log[0][0], 'create'); assert.deepEqual(g.log[0][2], { thenLink: true }, 'the create step goes on to the address');
  g.T.email = 'a@b.cat'; await g.log[0][1](); assert.equal(g.done, 1, 'confirmed in that sheet: what was asked for runs, once'); await g.log[0][1](); assert.equal(g.done, 1); }
{ const g = gate({ hasSession: false }); await g.need('heart', g.run); g.$('gate-go').click(); await g.log[0][1]();
  assert.equal(g.done, 0, 'closed without confirming: a cancel'); assert.equal(g.log.length, 1, 'and it is not asked again'); }
{ const g = gate({ profiled: true }); await g.need('heart', g.run); g.$('gate-go').click();
  assert.equal(g.log[0][0], 'link'); assert.equal(g.log[0][2].thenLink, false); }
console.log('badge news and confirm gate ok');
