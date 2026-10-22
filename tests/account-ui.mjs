// The Perfil, the statistics, seasons and players' cards (src/ui/account-ui.js, stats-view.js, seasons-ui.js, player-card.js)
// in a small fake DOM with a mocked service: what each sheet shows (public totals never with days, errors or dates; the
// private days only in Perfil), the season's calendar and words («queden 23 dies», «d’Estrena»; places as plain numbers, «12 de 48»), the Saló de la
// fama (closed seasons only, the player's place), the end-of-season sheet once per profile and season, and the stats notice.
import assert from 'node:assert/strict';
import { statsData, renderStats, playTime, sinceText } from '../src/ui/stats-view.js';
import { calendarSeason, seasonLine, ofSeason, boardName, setupSeasons, setupSeasonEnd, seasonSeenKey, forgetSeasons, figureSeasons, seasonDates, hallSeasons } from '../src/ui/seasons-ui.js';
import { setupCard } from '../src/ui/player-card.js';
import { setupAccount } from '../src/ui/account-ui.js';
import { setupGreeting } from '../src/ui/greeting.js';
import { setupDeviceHint } from '../src/ui/device-hint.js';
import { refreshIdentity, savedName } from '../src/ui/board-list.js';
import { setStatsOwner } from '../src/game/stats.js';
import { createStatsSync } from '../src/services/stats-sync.js';
import { readPage } from './page.mjs';

class El {
  constructor(tag = 'div', id = '') { Object.assign(this, { tag, id, children: [], hidden: false, attrs: {}, dataset: {}, on: {}, open: false, own: '', className: '', offsetHeight: 470, style: { p: {}, getPropertyValue(k) { return this.p[k] ?? ''; }, setProperty(k, v) { this.p[k] = v; }, removeProperty(k) { delete this.p[k]; } } }); }
  get textContent() { return this.own + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.own = String(v); this.children = []; }
  get classList() { const el = this; return { toggle(n, f) { const s = new Set(el.className.split(' ').filter(Boolean)); (f ?? !s.has(n)) ? s.add(n) : s.delete(n); el.className = [...s].join(' '); }, contains: n => el.className.split(' ').includes(n) }; }
  get parentElement() { return this.parent; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === 'string' ? Object.assign(new El('#text'), { own: c }) : c); }
  prepend(c) { this.children.unshift(c); c.parent = this; }
  replaceChildren(...cs) { this.children = []; this.own = ''; this.append(...cs); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t, ev = {}) { for (const f of this.on[t] || []) f({ preventDefault() {}, ...ev }); }
  click() { this.fire('click'); }
  showModal() { this.open = true; }
  close() { if (!this.open) return; this.open = false; this.fire('close'); }
  find(test) { if (test(this)) return this; for (const c of this.children) { const f = c.find(test); if (f) return f; } return null; }
  all(test, out = []) { if (test(this)) out.push(this); for (const c of this.children) c.all(test, out); return out; }
}
function fakeDoc(ids, figures = []) {
  const els = new Map(ids.map(id => [id, new El('div', id)]));
  for (const id of ids) if (id.endsWith('-status')) { const box = new El('div'); box.appendChild(els.get(id)); } // a status inside its state box
  const figs = figures.map(f => Object.assign(new El('button'), { dataset: { figure: f } }));
  return { els, figs, doc: { getElementById: id => els.get(id), createElement: tag => new El(tag), querySelectorAll: sel => (sel.includes('figures') ? figs : []) }, $: id => els.get(id) };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const DAY = 864e5, NOW = Date.parse('2026-10-20T10:00:00Z');
const bucket = o => ({ runs: 0, completed: 0, collapsed: 0, seconds: 0, perfect: 0, good: 0, miss: 0, guapa: 0, guapaTotal: 0, balloons: 0, holds: 0, bestCombo: 0, bestStars: 0, ...o });

// --- stats-view: totals over buckets, its words
{
  assert.equal(playTime(3 * 3600 + 12 * 60 + 40), '3 h 12 min'); assert.equal(playTime(45 * 60), '45 min'); assert.equal(playTime(20), 'menys d’1 min');
  assert.equal(sinceText('2026-11-05'), 'Des del 5 de novembre de 2026'); assert.equal(sinceText('2026-11-01'), 'Des de l’1 de novembre de 2026');
  const d = statsData({
    'mulassa-valls/mulassa-v3/1': bucket({ runs: 10, completed: 8, collapsed: 1, seconds: 700, perfect: 900, good: 100, miss: 64, guapa: 70, guapaTotal: 88, balloons: 9, holds: 20, bestCombo: 120, bestStars: 3, errors: { early: 30, late: 10, silent: 20 } }),
    'drac-valls/drac-v1/0': bucket({ runs: 2, completed: 2, seconds: 200, perfect: 200, good: 12, guapaTotal: 24, guapa: 20, bestCombo: 90, bestStars: 2 }), // no errors: a card's totals
    'mulassa-valls/mulassa-v2b/2': bucket({ runs: 1, completed: 1, bestStars: 3 }), // a dance replaced: its stars stay out of the 18
    practice: { runs: 2, seconds: 60 },
  }, ['2026-10-18', '2026-10-19']);
  assert.deepEqual([d.runs, d.seconds, d.collapsed, d.guapa, d.guapaTotal, d.bestCombo], [13, 900, 1, 90, 112, 120]);
  assert.deepEqual(d.byFigure, { 'mulassa-valls': 11, 'drac-valls': 2 });
  assert.deepEqual([d.stars, d.starsMax], [5, 18], 'stars of the current dances, out of 3 levels × 3 stars × 2 figures');
  assert.deepEqual([d.errors.early, d.errors.late, d.errors.silent, d.errors.both], [30, 10, 20, 0]);
  assert.equal(d.daysPlayed, 2);
  const { doc } = fakeDoc([]), box = new El();
  box.id = 'card-stats';
  renderStats(doc, box, d, { podiums: [{ position: 1, place: '1', text: 'a Estrena 2026 · Mulassa' }] });
  const text = box.textContent;
  assert(/13 ballsMulassa\u00a011 · Drac\u00a02/.test(text) && /15 mina la plaça/.test(text) && /120la millor ratxa/.test(text) && /\d+%de precisió mitjana/.test(text), 'four facts');
  assert(/1Podi a Estrena 2026 · Mulassa/.test(text), 'the podiums as achievements');
  assert(/1.100 PERFECTE · 112 BÉ · 64 ERROR/.test(text) && /La plaça s’ha quedat sense ànim 1 cop/.test(text) && /90 de 112 cops dobles/.test(text) && /5 de 18 estrelles/.test(text), 'public since Marc 2026-10-21: judgements and falls too');
  assert(!/Has jugat|seguits ara|rècord|Aviat|On se t’escapen/.test(text), 'a card: no days, no streaks, no errors per kind');
  const more = box.find(e => e.tag === 'button' && e.className.includes('stat-toggle')), panel = box.find(e => e.id === 'card-stats-more');
  assert(panel.hidden && more.attrs['aria-expanded'] === 'false' && more.attrs['aria-controls'] === 'card-stats-more' && /Més estadístiques/.test(more.textContent), 'a card: folded');
  more.click(); assert(!panel.hidden && more.attrs['aria-expanded'] === 'true' && /Menys estadístiques/.test(more.textContent), '«Més estadístiques» unfolds it in place');
  let synced = 0;
  renderStats(doc, box, d, { own: true, onSync: () => synced++ });
  assert(/Has jugat 2 dies/.test(box.textContent) && /La plaça s’ha quedat sense ànim 1 cop/.test(box.textContent) && /9 picades ràpides/.test(box.textContent) && /Aviat 30/.test(box.textContent), 'the Perfil: second person, days, errors per kind');
  assert(!box.find(e => e.id === 'card-stats-more').hidden, 'the Perfil: unfolded');
  assert(/Sovint t’avances una mica/.test(box.textContent), 'early taps most of the errors: the tip');
  box.find(e => e.textContent === 'Ajusta la sincronia' && e.tag === 'button').click(); assert.equal(synced, 1, '«Ajusta la sincronia» opens the sync');
  renderStats(doc, box, statsData({ 'mulassa-valls/mulassa-v3/1': bucket({ runs: 3, completed: 3, perfect: 300, good: 10, miss: 9, errors: { silent: 9 } }) }), { own: true, onSync: () => {} });
  assert(!/Ajusta la sincronia/.test(box.textContent), 'other errors: no sync tip');
}
// --- seasons: the calendar (00:00 in Catalonia), its words
{
  assert.deepEqual(calendarSeason(NOW), { name: 'Tardor 2026', endsAt: Date.parse('2027-01-01T00:00:00+01:00') });
  assert.deepEqual(calendarSeason(Date.parse('2027-03-31T21:59:00Z')), { name: 'Hivern 2027', endsAt: Date.parse('2027-04-01T00:00:00+02:00') }, 'summer time already');
  assert.equal(calendarSeason(Date.parse('2027-03-31T22:00:00Z')).name, 'Primavera 2027', 'midnight in Valls, not in UTC');
  assert.equal(seasonLine({ name: 'Tardor 2026', endsAt: NOW + 23 * DAY }, NOW), 'Tardor 2026 · queden 23 dies');
  assert.equal(seasonLine({ name: 'Tardor 2026', endsAt: NOW + 5 * 3600e3 }, NOW), 'Tardor 2026 · s’acaba avui');
  assert.equal(seasonLine({ name: 'Estrena 2026', endsAt: null }, NOW), 'Estrena 2026');
  assert.deepEqual(['Estrena 2026', 'Hivern 2027', 'Tardor 2026', 'Primavera 2027'].map(ofSeason), ['d’Estrena 2026', 'd’Hivern 2027', 'de Tardor 2026', 'de Primavera 2027']);
  assert.equal(boardName('mulassa-valls', { previousDance: true }), 'Mulassa de Valls (ball anterior)');
  // a season's days in Catalan time (its end is the next one's first instant); «Estrena 2026» lasted until the next began
  const tardor = { startsAt: Date.parse('2026-10-01T00:00:00+02:00'), until: Date.parse('2027-01-01T00:00:00+01:00') };
  assert.equal(seasonDates(tardor), '1 d’octubre – 31 de desembre de 2026');
  assert.equal(seasonDates(tardor, 'short'), '1 d’oct. – 31 de des. 2026');
  const estrena = Date.parse('2026-09-27T00:00:00+02:00');
  assert.equal(seasonDates({ startsAt: estrena, until: tardor.startsAt }), '27–30 de setembre de 2026');
  assert.equal(seasonDates({ startsAt: estrena, until: Infinity }), 'des del 27 de setembre de 2026');
  const grouped = hallSeasons([{ seasonId: 1, name: 'Tardor 2026', startsAt: tardor.startsAt, endsAt: NOW - DAY, previousDance: true }, { seasonId: 1, name: 'Tardor 2026', startsAt: tardor.startsAt, endsAt: NOW - DAY, previousDance: false },
    { seasonId: 0, name: 'Estrena 2026', startsAt: estrena, endsAt: null }], NOW);
  assert.deepEqual(grouped.map(g => [g.id, g.boards.map(b => b.previousDance)]), [[1, [false, true]], [0, [undefined]]], 'one per season, the current dance first');
  assert.equal(grouped[1].until, tardor.startsAt);
}
const pod = [{ position: 1, alias: 'Portadora', tag: null, verified: true, score: 172795, difficulty: 2 }, { position: 2, alias: 'Baldufa', tag: 1103, verified: false, score: 171996, difficulty: 1 }];
const pod3 = [...pod, { position: 3, alias: 'Prova123', tag: 4821, verified: false, score: 169186, difficulty: 2 }];
const SEASONS = {
  'mulassa-valls': [
    { seasonId: 2, name: 'Hivern 2027', startsAt: NOW - 3 * DAY, endsAt: NOW + 87 * DAY, version: 'mulassa-v3', previousDance: false, players: 15, podium: pod, myPosition: 6 },
    { seasonId: 1, name: 'Tardor 2026', startsAt: NOW - 80 * DAY, endsAt: NOW - 3 * DAY, version: 'mulassa-v3', previousDance: false, players: 20, podium: pod, myPosition: null },
    { seasonId: 1, name: 'Tardor 2026', startsAt: NOW - 80 * DAY, endsAt: NOW - 3 * DAY, version: 'mulassa-v2b', previousDance: true, players: 48, podium: pod, myPosition: 12, myScore: 142310, myDifficulty: 1 },
    { seasonId: 0, name: 'Estrena 2026', startsAt: 0, endsAt: null, version: 'mulassa-v2-short', previousDance: false, players: 60, podium: pod, myPosition: 2, myScore: 171996, myDifficulty: 1 }],
  'drac-valls': [{ seasonId: 1, name: 'Tardor 2026', startsAt: NOW - 80 * DAY, endsAt: NOW - 3 * DAY, version: 'drac-v1', previousDance: false, players: 15, podium: pod3, myPosition: 3 }],
};
const HALL_IDS = ['seasons-menu', 'seasons-list', 'seasons-status', 'seasons-retry', 'seasons-close', 'seasons-figure', 'seasons-figure-pic', 'seasons-figure-name', 'seasons-picker', 'seasons-figures', 'seasons-main'];
const service = (o = {}) => ({ configured: true, asked: [], async seasons(f) { this.asked.push(f); return SEASONS[f] ?? []; }, async ownerId() { return 'u1'; }, ...o });
// --- Saló de la fama: one closed season at a time (the newest; the open one is not history yet), the player's own dance, its band
{
  const svc = service(), boards = [], cards = [], focused = [];
  const { $, doc } = fakeDoc(HALL_IDS);
  const hall = setupSeasons({ focusIn: (m, id) => focused.push(id), service: svc, doc, now: () => NOW, minLoad: 0, onBoard: (f, e) => boards.push([f, e?.seasonId, e?.version]), onCard: p => cards.push(p) });
  hall.open('mulassa-valls'); await tick(); await tick();
  const view = () => $('seasons-list').children[0], byId = id => view().find(e => e.id === id);
  const text = cls => view().all(e => e.className === cls).map(e => e.textContent);
  assert.deepEqual(text('hall-name'), ['Tardor 2026'], 'the newest closed season');
  assert.equal(text('hall-meta')[0], 'Ball anterior · 48 participants', 'the dance the player was on');
  assert.equal(text('hall-dance')[0], 'Hi ha dos balls · Mira el ball actual', 'the other dance: one quiet link, no switch');
  assert.equal(text('hall-mine')[0], 'La teva posició12 de 48142.310 puntsNORMAL', 'its own band: place (no gendered ordinal), points, level');
  const figs = $('seasons-figures').children; // «Tria figura»: the board's dropdown
  assert($('seasons-figure-name').textContent === 'Mulassa de Valls' && /<svg/.test($('seasons-figure-pic').innerHTML) && figs[0].attrs['aria-pressed'] === 'true' && figs[1].attrs['aria-pressed'] === 'false');
  view().find(e => e.className?.includes?.('player-name') && e.tag === 'button').click(); assert.deepEqual(cards[0], { alias: 'Portadora', tag: null, verified: true });
  byId('seasons-dance').click();
  assert(text('hall-meta')[0] === '20 participants' && byId('seasons-dance').textContent === 'Mira el ball anterior' && focused.at(-1) === 'seasons-dance', 'the current dance, its link back');
  assert.equal(text('hall-mine none')[0], 'La teva posicióNo hi ha cap resultat teu publicat.', 'the other dance: no place');
  byId('seasons-board').click();
  assert(!$('seasons-menu').open && boards[0].join() === 'mulassa-valls,1,mulassa-v3', 'that season\'s board, the dance shown');
  // «Tria temporada»: by year, the winner, the player's place; picking one shows it
  hall.open('mulassa-valls'); await tick(); await tick();
  byId('seasons-pick').click();
  assert.deepEqual(text('hall-year'), ['2026']);
  assert.deepEqual(text('r-name'), ['Tardor 2026 · 2 balls', 'Estrena 2026']);
  assert.deepEqual(text('r-side'), ['12de 48', '2de 60']);
  assert(view().find(e => e.id === 'seasons-current')?.textContent.startsWith('Tardor 2026') && focused.at(-1) === 'seasons-current', 'the shown one marked, focused');
  view().all(e => e.className === 'idx-row')[1].click();
  assert.deepEqual([text('hall-name')[0], text('hall-meta')[0]], ['Estrena 2026', '60 participants']);
  assert(!view().find(e => e.className?.startsWith?.('hall-mine')) && view().find(e => e.className === 'me')?.find(e => e.className === 'me-tag'), 'on the podium: «TU» there, no band');
  assert.deepEqual(view().all(e => /^pos p[123]$/.test(e.className)).map(e => e.textContent), ['1', '2'], 'the podium (two played): the boards\' solid discs');
  const held = () => $('seasons-menu').style.p['--hall-h'];
  assert.equal(held(), undefined, 'a season shown: the sheet hugs it (desktop)');
  byId('seasons-pick').click();
  assert(held() === '470px' && view().all(e => e.className === 'r-sub').every(s => s.children[0].className === 'pos p1'), '«Tria temporada» keeps the season\'s height; each winner on the gold disc');
  view().find(e => e.id === 'seasons-back').click();
  assert(text('hall-name')[0] === 'Estrena 2026' && held() === undefined, 'back: the season it left, its own height');
  $('seasons-figure').click();
  assert(!$('seasons-picker').hidden && $('seasons-main').hidden && $('seasons-figure').attrs['aria-expanded'] === 'true' && focused.at(-1) === 'seasons-fig-mulassa-valls', 'the picker in the season\'s place');
  let prevented = false; $('seasons-menu').fire('cancel', { preventDefault: () => { prevented = true; } });
  assert(prevented && $('seasons-picker').hidden && !$('seasons-main').hidden && $('seasons-menu').open && focused.at(-1) === 'seasons-figure', 'Escape: back, the sheet stays');
  $('seasons-figure').click(); $('seasons-close').click();
  assert($('seasons-picker').hidden && $('seasons-menu').open, '×: back too');
  $('seasons-figure').click(); figs[1].click(); await tick(); await tick();
  assert($('seasons-picker').hidden && $('seasons-figure-name').textContent === 'Drac de Valls');
  assert.deepEqual([text('hall-name')[0], text('hall-meta')[0]], ['Tardor 2026', '15 participants'], 'the Drac\'s own history');
  assert(!byId('seasons-pick'), 'one season: nothing to choose');
  // none closed yet: the open season and its board; a failure: retry
  const e2 = fakeDoc(HALL_IDS), opened = [];
  setupSeasons({ focusIn() {}, service: service({ seasons: async () => [SEASONS['mulassa-valls'][0]] }), doc: e2.doc, now: () => NOW, minLoad: 0, onBoard: (f, e) => opened.push([f, e]) }).open('drac-valls'); await tick(); await tick();
  const wait = e2.$('seasons-list').children[0];
  assert(/^La primera temporada encara està en joc\.Aquí hi trobaràs el podi quan s’acabi\.Hivern 2027 · fins al 15 de gener/.test(wait.textContent), wait.textContent);
  wait.find(e => e.id === 'seasons-board').click(); assert.deepEqual(opened, [['drac-valls', null]], 'the open season\'s board');
  const f = fakeDoc(HALL_IDS);
  const broken = setupSeasons({ focusIn() {}, service: service({ seasons: async () => { throw Object.assign(new Error('No s’ha pogut connectar amb la classificació.'), { code: 'unavailable' }); } }), doc: f.doc, now: () => NOW, minLoad: 0 });
  broken.open('drac-valls'); await tick(); await tick();
  assert(/No s’ha pogut connectar/.test(f.$('seasons-status').textContent) && !f.$('seasons-retry').hidden);
}
// --- «Tardor 2026 s’ha acabat»: once per profile and season, every board the profile was on, the newest season only; a podium
// shows that figure on its step, none a garland; the whole podium is the Saló de la fama's
{
  const mem = new Map(), store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
  const svc = service(), halls = [];
  const { $, doc } = fakeDoc(['season-end-menu', 'season-end-boards', 'season-end-title', 'season-end-ok', 'season-end-close', 'season-end-hall']);
  mem.set(seasonSeenKey('u1', 0), '1');
  let backs = 0;
  const end = setupSeasonEnd({ focusIn() {}, service: svc, store, doc, now: () => NOW, onHall: (f, b) => halls.push([f, b]) });
  assert.equal(await end.check(() => true, () => backs++), true);
  assert.equal($('season-end-title').textContent, 'Tardor 2026 s’ha acabat');
  const body = $('season-end-boards'), part = cls => body.find(e => e.className?.startsWith?.(cls));
  assert.deepEqual(body.all(e => e.tag === 'tr' && e.parent?.tag === 'tbody').map(tr => tr.textContent), ['Mulassa de Valls (ball anterior)12 de 48', 'Drac de Valls33 de 15'], // (the podium's disc, aria-hidden, then its place)
    'each board it played, its place; not the open season, not a board without it');
  assert(part('se-cheer').textContent === 'Has fet podi!' && /blk me/.test(part('se-art-box').innerHTML) && (part('se-art-box').innerHTML.match(/blk me/g) || []).length === 1, 'the podium, its step');
  assert.equal(part('se-now').textContent, 'Ara: Hivern 2027\u00a0· queden 87 dies', 'the «·» kept with the name (a no-break space): a wrap falls after it');
  assert(!body.find(e => e.className === 'podium') && body.all(e => /^pos p/.test(e.className)).map(e => e.className).join() === 'pos p3', 'no full podium here; a podium place on its disc');
  assert.equal(mem.get(seasonSeenKey('u1', 1)), '1', 'seen: per profile and season');
  $('season-end-hall').click();
  assert(!$('season-end-menu').open && backs === 0 && halls[0][0] === 'drac-valls', 'the Saló de la fama of the podium\'s figure, with this sheet\'s way back');
  halls[0][1](); assert.equal(backs, 1);
  forgetSeasons(svc);
  assert.equal(await end.check(), false, 'once');
  const other = setupSeasonEnd({ focusIn() {}, service: service({ ownerId: async () => 'u2' }), store, doc: fakeDoc(['season-end-menu', 'season-end-boards', 'season-end-title', 'season-end-ok', 'season-end-close', 'season-end-hall']).doc, now: () => NOW });
  assert.equal(await other.check(), true, 'another profile on this device sees its own');
  const anon = setupSeasonEnd({ focusIn() {}, service: service({ ownerId: async () => null }), store, doc: fakeDoc(['season-end-menu', 'season-end-boards', 'season-end-title', 'season-end-ok', 'season-end-close', 'season-end-hall']).doc, now: () => NOW });
  assert.equal(await anon.check(), false, 'no profile: nothing to tell');
  const plain = fakeDoc(['season-end-menu', 'season-end-boards', 'season-end-title', 'season-end-ok', 'season-end-close', 'season-end-hall']);
  await setupSeasonEnd({ focusIn() {}, service: service({ ownerId: async () => 'u3', seasons: async f => (f === 'drac-valls' ? [] : [SEASONS['mulassa-valls'][2]]) }), store, doc: plain.doc, now: () => NOW }).check();
  const cheer = plain.$('season-end-boards').find(e => e.className?.startsWith?.('se-cheer'));
  assert(cheer.textContent === 'Gràcies per fer plaça!' && cheer.className === 'se-cheer' && /garland/.test(plain.$('season-end-boards').children[0].innerHTML), 'no podium: the garland, the thanks');
}
// --- a player's card: the name (a guest says «Convidat»), the public totals, podiums, the source line
{
  const totals = { 'mulassa-valls/mulassa-v3/2': bucket({ runs: 30, completed: 25, collapsed: 2, seconds: 11520, perfect: 5000, good: 600, miss: 400, bestStars: 3, bestCombo: 210, guapa: 200, guapaTotal: 260 }) };
  let card = { alias: 'Baldufa', tag: 1103, name: 'Baldufa#1103', verified: false, totals, podiums: [{ seasonId: 1, version: 'mulassa-v2b', position: 1 }] };
  const asked = [];
  const svc = service({ async playerCard(a, t) { asked.push([a, t]); if (card instanceof Error) throw card; return card; } });
  const f = fakeDoc(['card-menu', 'card-name', 'card-kind', 'card-from', 'card-stats', 'card-status', 'card-retry', 'card-close']);
  const c = setupCard({ focusIn() {}, service: svc, doc: f.doc, now: () => NOW, minLoad: 0 });
  c.open({ alias: 'Baldufa', tag: 1103, verified: false, from: { figure: 'mulassa-valls', season: 'Tardor 2026', position: 3, score: 84210, difficulty: 2 } });
  assert(f.$('card-menu').open && f.$('card-name').textContent === 'Baldufa#1103' && f.$('card-kind').textContent === 'Convidat' && !f.$('card-kind').hidden, 'the name from the first frame');
  assert(!f.$('card-from').hidden && f.$('card-from').textContent === 'Mulassa de Valls · Tardor 2026384.210 puntsDIFÍCIL', 'the board row it came from (its place a plain number in the disc)');
  await tick(); await tick(); await tick();
  assert.deepEqual(asked[0], ['Baldufa', 1103], 'asked by name and tag');
  assert(/3 h 12 mina la plaça/.test(f.$('card-stats').textContent) && !/Has jugat|dies/.test(f.$('card-stats').textContent), 'the totals, never the days');
  assert(/1Podi a Tardor 2026 · Mulassa de Valls \(ball anterior\)/.test(f.$('card-stats').textContent), 'its podiums, with the season\'s name');
  card = { ...card, alias: 'Portadora', tag: null, verified: true, totals: {}, podiums: [] };
  c.open({ alias: 'Portadora', tag: null, verified: true }); await tick(); await tick(); // over itself: a new card
  assert(f.$('card-from').hidden, 'no row passed (a podium): no row shown');
  assert(f.$('card-kind').hidden && f.$('card-name').find(e => e.className === 'verified-check'), 'confirmed: the check, no «Convidat»');
  f.$('card-close').click();
  const g = fakeDoc(['card-menu', 'card-name', 'card-kind', 'card-from', 'card-stats', 'card-status', 'card-retry', 'card-close']);
  card = null; const none = setupCard({ focusIn() {}, service: svc, doc: g.doc, minLoad: 0 }); none.open({ alias: 'Tabal', tag: 4571 }); await tick(); await tick();
  assert(g.$('card-status').textContent === 'Encara no hi ha estadístiques per mostrar.');
  card = Object.assign(new Error('No s’ha pogut connectar amb la classificació.'), { code: 'unavailable' }); none.open({ alias: 'Tabal', tag: 4571 }); g.$('card-close').click(); none.open({ alias: 'Tabal', tag: 4571 }); await tick(); await tick();
  assert(!g.$('card-retry').hidden, 'a failure: retry inside the box');
}
// --- Perfil: this device's numbers at once, every device's when there is a profile (whichever knows more); the notice once
{
  const f = fakeDoc(['account-menu', 'account-close', 'account-stats', 'account-status', 'account-since', 'account-empty', 'account-join',
    'account-previous', 'account-previous-list', 'profile-row', 'stats-notice-menu', 'stats-notice-ok', 'stats-notice-close']);
  const mem = new Map([['record-v2-duet-1', JSON.stringify({ quality: 91.5, score: 70000 })]]);
  const store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
  const server = { buckets: { 'mulassa-valls/mulassa-v3/1': bucket({ runs: 40, completed: 40, perfect: 4000, good: 100, miss: 100 }) }, days: ['2026-10-19', '2026-10-20'], daysPlayed: 2, currentStreak: 2, longestStreak: 2 };
  let owner = 'u1', needed = true, accepted = 0, refreshed = 0, opened = [];
  const svc = service({ ownerId: async () => owner, myStats: async () => server });
  const acc = setupAccount({ focusIn() {}, profile: { refresh() { refreshed++; }, open(a, back) { opened.push([a, back]); }, forget() {}, isOpen: false }, service: svc, store, doc: f.doc, now: () => NOW,
    stats: { noticeNeeded: () => needed, acceptNotice() { accepted++; needed = false; } } });
  acc.open(); assert(f.$('account-menu').open && refreshed === 1, 'the profile block refreshes with it');
  assert(f.$('account-empty').hidden && f.$('account-stats').hidden && !f.$('account-status').hidden && /Carregant/.test(f.$('account-status').textContent), 'nothing played here yet and a service: loading inside the statistics\' room, no zero tiles');
  await tick(); await tick(); await tick(); await tick();
  assert(/40 balls/.test(f.$('account-stats').textContent) && /Has jugat 2 dies/.test(f.$('account-stats').textContent), 'every device\'s numbers (the server knows more)');
  assert(f.$('account-join').hidden, 'a profile: no «Crea un perfil…»');
  assert.equal(f.$('account-previous-list').textContent, 'NORMAL: 70.000 punts · 92%', 'the previous dance\'s record, read only');
  const wins = f.$('account-stats').find(e => e.className === 'stat-wins');
  assert.equal(wins?.textContent, '2Podi a Estrena 2026 · Mulassa de Valls3Podi a Tardor 2026 · Drac de Valls', 'its podiums among the statistics: closed seasons only (not the open one\'s 6th, not 12th)');
  assert.deepEqual(wins.all(e => /^pos/.test(e.className)).map(e => e.className), ['pos p2', 'pos p3'], 'on the podium\'s discs');
  f.$('account-close').click();
  // a profile with nothing played here: the loading line keeps the room until the server answers (no shift), then the numbers, the empty line if it has none, or «No s’han pogut carregar» if it fails
  setStatsOwner('u1'); acc.open();
  assert(f.$('account-empty').hidden && !f.$('account-status').hidden && f.$('account-stats').hidden, 'waiting for the server: loading, not «Encara no has jugat»');
  await tick(); await tick(); await tick(); await tick();
  assert(f.$('account-status').hidden && /40 balls/.test(f.$('account-stats').textContent), 'answered: the numbers replace it');
  f.$('account-close').click();
  svc.myStats = async () => { throw new Error('offline'); }; acc.open(); await tick(); await tick(); await tick(); await tick();
  assert(f.$('account-empty').hidden && f.$('account-stats').hidden && /No s’han pogut carregar/.test(f.$('account-status').textContent), 'a failed answer with nothing played here: said inside the box');
  f.$('account-close').click(); svc.myStats = async () => null; acc.open(); await tick(); await tick(); await tick(); await tick();
  assert(!f.$('account-empty').hidden && f.$('account-status').hidden && f.$('account-stats').hidden, 'no answer: the loading gives way to the empty line');
  setStatsOwner(null);
  f.$('account-close').click();
  owner = null; acc.open(); await tick(); await tick();
  assert(!f.$('account-join').hidden, 'no profile: «Crea un perfil per guardar-les…»');
  f.$('account-close').click();
  // the stats notice, once: only while needed; closing it counts as seen
  assert.equal(acc.notice(), true); assert(f.$('stats-notice-menu').open);
  f.$('stats-notice-ok').click(); assert(accepted === 1 && !f.$('stats-notice-menu').open);
  assert.equal(acc.notice(), false, 'seen: never again');
}
// --- markup: the sheets exist, copy is Catalan, one primary each, «Dades enviades…» and «Convidat» words
{
  const html = readPage();
  const sheet = id => html.slice(html.indexOf(`<dialog id="${id}"`), html.indexOf('</dialog>', html.indexOf(`<dialog id="${id}"`)));
  for (const id of ['account-menu', 'stats-notice-menu', 'seasons-menu', 'season-end-menu', 'card-menu']) {
    assert(html.includes(`<dialog id="${id}" class="sheet"`), `#${id}`);
    assert(/class="sheet-x" aria-label="Tanca"/.test(sheet(id)), `${id}: the corner X`);
    assert((sheet(id).match(/btn-primary/g) || []).length <= 1, `${id}: one primary at most`);
    assert(!/<button(?![^>]*class="(btn|sheet-x))/.test(sheet(id)), `${id}: every button is a .btn (or the corner X)`);
  }
  assert(!/card-source/.test(sheet('card-menu')) && /id="card-from" class="card-from" hidden/.test(sheet('card-menu')));
  // the statistics notice (Marc, 2026-10-21): a title and three short lines with a drawn icon each, then Privadesa and D’acord;
  // the details it no longer says stay in the Privadesa text
  const facts = [...sheet('stats-notice-menu').matchAll(/<li><svg[^>]*aria-hidden="true"[^>]*>[^]*?<\/svg><span[^>]*>([^<]*)<\/span><\/li>/g)].map(m => m[1]);
  assert.deepEqual(facts, ['Guardem les teves partides, el temps jugat i els encerts.', 'Tothom pot veure els totals si toca el teu nom.', 'Els dies que jugues només els veus tu.'], 'the notice: three short lines, each with its icon');
  assert(/<h2 id="stats-notice-title"[^>]*>Les teves estadístiques<\/h2>/.test(sheet('stats-notice-menu')) && /data-privacy-open[^>]*>Privadesa<\/button>[^]*id="stats-notice-ok"[^>]*>D’acord</.test(sheet('stats-notice-menu')), 'title, then Privadesa and D’acord');
  const privacy = html.slice(html.indexOf('<section data-privacy="leaderboards"'), html.indexOf('</section>', html.indexOf('<section data-privacy="leaderboards"')));
  assert(/sumats entre (tots )?els teus dispositius/.test(privacy) && /Mai no s’hi envia l’hora en què jugues ni cap dada del dispositiu/.test(privacy) && /Tot s’esborra amb el perfil/.test(privacy), 'Privadesa keeps what the notice dropped');
  assert(/Crea un perfil per guardar-les i sortir a les classificacions\./.test(sheet('account-menu')));
  assert(/<button id="profile" class="round-btn" hidden aria-haspopup="dialog" aria-label="Perfil"/.test(html), 'the Perfil corner button');
  // layout rules (docs: names never cut; a lone season card not stranded at the top of the fixed-height hall; stat tiles read from the top)
  assert(/\.who \.player-name \.alias \{ white-space: normal; overflow-wrap: anywhere; \}/.test(html) && /\.who \.player-name \{ flex-wrap: wrap;/.test(html), 'list names wrap, never an ellipsis; a «#1234» goes under the name whole');
  assert(/#seasons-menu \{[^}]*height: var\(--hall-h, fit-content\); max-height:/.test(html) && /\.hall-detail \{[^}]*align-content: start;/.test(html), 'the hall on every screen: the sheet hugs its season, no free band above or under it');
  assert(/\.pos\.p1, \.pos\.p2, \.pos\.p3 \{[^}]*width: var\(--pos-size, 24px\)/.test(html) && !/class="medal|\.medal\b|pod-medal/.test(html), 'one podium medal: the sized disc, no ribbon medal left');
  assert(/\.hall-main \{[^}]*gap: 16px;/.test(html) && !/\.hall-main \{[^}]*space-evenly/.test(html) && /grid-template-areas: "season season" "pod me" "pod act"/.test(html), 'the hall: one 16 px gap between its blocks (no shared free space); desktop: podium left, context right');
  assert(/<button id="season-end-ok"[^>]*btn-primary[^>]*>Torna a la plaça<\/button><button id="season-end-hall"[^>]*btn-link[^>]*>Saló de la fama</.test(sheet('season-end-menu')) && !/Tria figura/.test(sheet('season-end-menu')), 'the season\'s end: back to the plaça, the hall as a link');
  assert(/\.stat-fact \{[^}]*align-content: start;/.test(html) && /\.stat-facts \{ display: grid; grid-template-columns: 1fr 1fr;/.test(html), 'four facts in two columns, read from the top: a row\'s numbers line up');
  assert(/\.profile-actions \.btn \{[^}]*flex: 1 1 0; min-width: fit-content;/.test(html), 'the profile\'s buttons: equal while side by side');
  assert(/\.card-name \{[^}]*flex-wrap: wrap;/.test(html) && /#card-menu \.card-name \{ font-size: clamp\(18px, 5\.6vw, 30px\); \}/.test(html), 'a card\'s 16-letter name and its check on one line at 320 px');
  assert(/Temporades anteriors/.test(sheet('board-menu')) && /id="board-figures"[^>]*aria-label="Figura"/.test(sheet('board-menu')), 'the board: the figure switch and the history');
}

// --- the seasons' answer carries the caller's own places: kept per owner, and an account event drops it
{
  const owner = { id: 'u1' }, listeners = new Set();
  const mine = { u1: 5, u2: 9 };
  let asked = 0;
  const svc = service({ ownerId: async () => owner.id, onAccount: f => { listeners.add(f); return () => listeners.delete(f); },
    async seasons() { asked++; return [{ seasonId: 1, name: 'Tardor 2026', endsAt: NOW - DAY, version: 'v', podium: [], players: 20, myPosition: mine[owner.id] }]; } });
  assert.equal((await figureSeasons(svc, 'mulassa-valls', NOW))[0].myPosition, 5);
  assert.equal((await figureSeasons(svc, 'mulassa-valls', NOW + 1000))[0].myPosition, 5); assert.equal(asked, 1, 'within a minute: the cache');
  owner.id = 'u2';
  assert.equal((await figureSeasons(svc, 'mulassa-valls', NOW + 2000))[0].myPosition, 9, 'another profile within a minute: its own places');
  owner.id = 'u1'; asked = 0; mine.u1 = 4;
  assert.equal((await figureSeasons(svc, 'mulassa-valls', NOW + 3000))[0].myPosition, 5, 'back to the first one: its entry is still good');
  for (const f of listeners) f({ type: 'changed' });
  assert.equal((await figureSeasons(svc, 'mulassa-valls', NOW + 4000))[0].myPosition, 4, 'an account event: asked again'); assert.equal(asked, 1);
}
// --- several ended seasons unseen: the newest first; the older ones are not marked until they are shown
{
  const mem = new Map(), store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
  const ended = id => ({ seasonId: id, name: `Temporada ${id}`, endsAt: NOW - id * DAY, version: 'v', previousDance: false, players: 10, podium: pod, myPosition: id });
  const svc = service({ seasons: async f => (f === 'mulassa-valls' ? [ended(3), ended(2), ended(1)] : []) });
  const ids = ['season-end-menu', 'season-end-boards', 'season-end-title', 'season-end-ok', 'season-end-close', 'season-end-hall'];
  const { $, doc } = fakeDoc(ids);
  const end = setupSeasonEnd({ focusIn() {}, service: svc, store, doc, now: () => NOW });
  const told = [];
  for (let i = 0; i < 4; i++) {
    forgetSeasons(svc);
    const shown = await end.check();
    if (shown) { told.push($('season-end-title').textContent); $('season-end-ok').click(); }
  }
  assert.deepEqual(told, ['Temporada 3 s’ha acabat', 'Temporada 2 s’ha acabat', 'Temporada 1 s’ha acabat'], 'one at a time, newest first, none lost');
  assert.deepEqual([1, 2, 3].map(id => mem.get(seasonSeenKey('u1', id))), ['1', '1', '1']);
}
// --- the greeting: what a profile has pending, told when the selector is idle; one sheet per visit (page load)
{
  const state = { free: false, news: null, noticeNeeded: false, owner: 'a' };
  const log = [], tick5 = () => new Promise(r => setTimeout(r, 5));
  const visit = () => setupGreeting({
    stats: { async init() { log.push(`init:${state.owner}`); } }, identity: async () => { log.push('identity'); },
    seasonEnd: { async news() { return state.news; }, show(n) { log.push(`season:${n}`); state.news = null; state.free = false; } },
    account: { notice() { if (!state.noticeNeeded) return false; log.push(`notice:${state.owner}`); state.noticeNeeded = false; state.free = false; return true; } },
    free: () => state.free, back: () => log.push('back') });
  let g = visit();
  state.noticeNeeded = true; state.news = 'S1';
  await g.greet(); assert.deepEqual(log, [], 'a sheet is up (or a run): nothing happens, nothing is spent');
  state.free = true; await g.greet();
  assert.deepEqual(log, ['init:a', 'identity', 'season:S1'], 'the season first');
  state.free = true; g.poke(); await tick5();
  assert.deepEqual(log.slice(3), [], 'its sheet closed: nothing more this visit');
  g = visit(); state.free = true; await g.greet();
  assert.deepEqual(log.slice(3), ['init:a', 'identity', 'notice:a'], 'the next visit: the stats notice, still after the season');
  state.free = true; state.news = 'S0'; g.poke(); await tick5();
  assert.equal(log.length, 6, 'a late-arriving item waits too');
  g = visit(); state.free = true; await g.greet();
  assert.deepEqual(log.slice(6), ['init:a', 'identity', 'season:S0'], 'and is told at the next visit');
  state.free = true; g.poke(); await tick5();
  const settledAt = log.length;
  state.free = true; state.noticeNeeded = true; g.poke(); await tick5();
  assert.equal(log.length, settledAt, 'settled until the account changes');
  state.owner = 'b'; g.accountChanged(); await tick5();
  assert.equal(log.length, settledAt, 'another profile after this visit\'s sheet: its notice waits for the next visit too');
  g = visit(); state.free = true; await g.greet();
  assert.deepEqual(log.slice(settledAt), ['init:b', 'identity', 'notice:b'], 'the next visit tells it, the owner read again');
  // nothing told yet this visit: an account change (a recovery inside Perfil) is told once the selector is idle again
  const quiet = log.length; g = visit(); state.free = true; await g.greet();
  assert.equal(log.length, quiet + 2, 'nothing pending: the visit tells nothing');
  state.free = false; state.owner = 'c'; state.noticeNeeded = true; g.accountChanged(); await tick5();
  assert.equal(log.at(-1), 'identity', 'not while a sheet is up');
  state.free = true; g.poke(); await tick5();
  assert.equal(log.at(-1), 'notice:c');
  // a failing season lookup (offline) is not settled: the next visit tries again
  const flaky = { fail: true, shown: 0 };
  const g2 = setupGreeting({ stats: { init: async () => {} }, seasonEnd: { news: async () => { if (flaky.fail) throw new Error('offline'); return 'S'; }, show() { flaky.shown++; } }, account: { notice: () => false }, free: () => true });
  await g2.greet(); assert.equal(flaky.shown, 0);
  flaky.fail = false; await g2.greet(); assert.equal(flaky.shown, 1, 'offline once: asked again at the next visit');
}
// --- the greeting over the real statistics sync: the owner is read at the first idle selector and again after an account change
{
  const kv = new Map(), io = { s: { since: null, owners: {} }, load() { return this.s; }, save(v) { this.s = v; } };
  const svc = { owner: 'a', listeners: new Set(), configured: true, async ownerId() { return this.owner; }, async profile() { return { alias: 'X' }; }, async syncStats() {},
    onAccount(f) { this.listeners.add(f); return () => this.listeners.delete(f); } };
  const stats = createStatsSync({ service: svc, kv: { get: k => kv.get(k) ?? null, set: (k, v) => kv.set(k, v), remove: k => kv.delete(k) }, io, timer: () => 0, clear() {} });
  const told = [], visit = () => setupGreeting({ stats, seasonEnd: { news: async () => null }, account: { notice: () => { if (!stats.noticeNeeded()) return false; told.push(stats.owner); stats.acceptNotice(); return true; } }, free: () => true });
  let g = visit();
  await g.greet();
  assert.deepEqual(told, ['a'], 'the profile existing before the statistics: its notice is told');
  svc.owner = 'b'; for (const f of svc.listeners) f({ type: 'changed' }); g.accountChanged(); await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(told, ['a'], 'recovering another profile in the same visit: its notice waits (one sheet per visit)');
  assert.equal(stats.owner, 'b'); assert.equal(stats.noticeNeeded(), true);
  assert.equal(await stats.send(), 'notice', 'and nothing of b\'s is uploaded before b has seen it');
  g = visit(); await g.greet();
  assert.deepEqual(told, ['a', 'b'], 'the next visit tells it');
}
// --- the share image's name: this browser's profile as the server last said it, kept from the first answer
{
  const mem = new Map(), store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v), remove: k => mem.delete(k) };
  let prof = { alias: 'Portadora', tag: null, verified: true, published: true }, calls = 0, release;
  const svc = { configured: true, async profile() { calls++; await new Promise(r => { release = r; }); if (prof instanceof Error) throw prof; return prof; } };
  assert.equal(savedName(store).verified, false, 'Perfil never opened here: no check');
  const answer = async p => { release(); await p; };
  const a = refreshIdentity(svc, store), b = refreshIdentity(svc, store); await tick();
  assert.equal(calls, 1, 'one request at a time'); await answer(Promise.all([a, b]));
  assert.deepEqual(savedName(store), { alias: 'Portadora', tag: null, verified: true }, 'a confirmed profile shows its check');
  prof = { alias: 'Timbaler', tag: 3821, verified: false, published: false }; const c = refreshIdentity(svc, store); await tick(); await answer(c);
  assert.deepEqual(savedName(store), { alias: 'Timbaler', tag: 3821, verified: false }, 'a guest: «nom#1234», no check');
  mem.set('leaderboard-alias:identity', JSON.stringify({ hasSession: true, mailOn: 'a@b.cat', persistent: false, prof }));
  prof = { alias: 'Timbaler', tag: null, verified: true, published: true }; const d = refreshIdentity(svc, store); await tick(); await answer(d);
  const kept = JSON.parse(mem.get('leaderboard-alias:identity'));
  assert(kept.mailOn === 'a@b.cat' && kept.persistent === false && kept.prof.verified, 'the Perfil block\'s own fields are kept');
  prof = new Error('offline'); const e = refreshIdentity(svc, store); await tick(); await answer(e);
  assert.equal(savedName(store).verified, true, 'offline: what is remembered stands');
  prof = null; const f = refreshIdentity(svc, store); await tick(); await answer(f);
  assert.equal(savedName(store).verified, false, 'gone / signed out: the check goes');
  assert.equal(mem.has('leaderboard-alias:identity'), false);
  // an account change while a read is out: the late answer for the profile before never overwrites the new one's name or check
  { const asked = [], svc2 = { configured: true, profile() { return new Promise(r => asked.push(r)); } };
    mem.clear();
    const a = refreshIdentity(svc2, store); await tick(); assert.equal(asked.length, 1);
    assert.equal(refreshIdentity(svc2, store), a, 'no account change: the read in flight is shared');
    const b = refreshIdentity(svc2, store, { fresh: true }); await tick(); assert.equal(asked.length, 2, 'an account change asks again');
    asked[1]({ alias: 'Nova', tag: null, verified: true, published: true }); await b;
    asked[0]({ alias: 'Vella', tag: 1234, verified: false, published: false }); await a;
    assert.deepEqual(savedName(store), { alias: 'Nova', tag: null, verified: true }, 'the stale answer is dropped');
    const c = refreshIdentity(svc2, store); await tick(); assert.equal(asked.length, 3, 'the stale read does not hold the next one up'); asked[2](null); await c; }
  assert.equal(await refreshIdentity({ configured: false, profile() { throw new Error('never'); } }, store), undefined, 'no service: nothing asked');
}
// --- the device tips (src/ui/device-hint.js): last in the greeting's queue, once ever, only when their condition holds
{
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
  const ids = ['gpu-hint', 'ios-hint'].flatMap(k => ['menu', 'ok', 'close'].map(x => `${k}-${x}`));
  const make = (o, mem = new Map()) => {
    const { doc, $ } = fakeDoc(ids), focused = [];
    const store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
    return { $, mem, focused, hint: setupDeviceHint({ focusIn: (m, id) => focused.push(id), store, doc, ua: 'Mozilla/5.0 (Macintosh)', standalone: undefined, softwareGl: false, ...o }) };
  };
  assert.equal(make({}).hint.show(), false, 'hardware GL on a desktop: nothing to tell');
  assert.equal(make({ ua: IPHONE, standalone: true }).hint.show(), false, 'the home-screen app: nothing to tell');
  assert.equal(make({ ua: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', standalone: false }).hint.show(), false, 'iPhone and iPod only, as before');
  // software GL takes precedence over the iPhone tip; «D’acord» stores its key, it never comes back
  const both = make({ softwareGl: true, ua: IPHONE, standalone: false });
  assert.equal(both.hint.show(), true);
  assert.deepEqual([both.$('gpu-hint-menu').open, both.$('ios-hint-menu').open, both.focused[0]], [true, false, 'gpu-hint-ok']);
  assert.equal(both.hint.show(), false, 'one sheet at a time'); assert.equal(both.hint.isOpen, true);
  both.$('gpu-hint-ok').click();
  assert.deepEqual([both.$('gpu-hint-menu').open, both.mem.get('gpu-hint'), both.mem.get('ios-hint')], [false, 'off', undefined]);
  assert.equal(both.hint.show(), false, 'closed once: never again this session');
  assert.equal(make({ softwareGl: true }, both.mem).hint.show(), false, 'nor at the next start');
  const next = make({ softwareGl: true, ua: IPHONE, standalone: false }, both.mem);
  assert.equal(next.hint.show(), true, 'the GPU tip told, a later start tells the iPhone one');
  assert.equal(next.$('ios-hint-menu').open, true);
  let backs = 0; next.$('ios-hint-menu').close(); next.hint.show(() => backs++);
  assert.deepEqual([next.mem.get('ios-hint'), backs], ['off', 0], 'Escape (the dialog\'s own close) stores it too');
  const x = make({ ua: IPHONE, standalone: false });
  x.hint.show(() => backs++); x.$('ios-hint-close').click();
  assert.deepEqual([x.mem.get('ios-hint'), backs], ['off', 1], 'the round × stores it and hands the focus back');

  // the queue: the season's end, then the statistics notice, then the tip; never while a sheet is up; offline it is still told
  const state = { free: true, news: 'S1', notice: true }, log = [];
  const t = make({ softwareGl: true });
  const visit = () => setupGreeting({ stats: { async init() {} }, hint: { show: b => { if (!state.free) throw new Error('over a sheet'); const r = t.hint.show(b); if (r) { log.push('tip'); state.free = false; } return r; } },
    seasonEnd: { async news() { return state.news; }, show(n) { log.push(`season:${n}`); state.news = null; state.free = false; } },
    account: { notice() { if (!state.notice) return false; log.push('notice'); state.notice = false; state.free = false; return true; } }, free: () => state.free });
  let g = visit();
  await g.greet(); state.free = true; g.poke(); await tick(); await tick();
  assert.deepEqual(log, ['season:S1'], 'one sheet a visit: the notice and the tip wait');
  await (g = visit()).greet(); state.free = true; g.poke(); await tick(); await tick();
  assert.deepEqual(log, ['season:S1', 'notice'], 'the next visit: the notice, and the tip still waits');
  await (g = visit()).greet();
  assert.deepEqual(log, ['season:S1', 'notice', 'tip'], 'the visit after: the tip, in order');
  state.free = true; t.$('gpu-hint-ok').click(); g.poke(); await tick(); await tick(); await (g = visit()).greet();
  assert.deepEqual(log, ['season:S1', 'notice', 'tip'], 'told once');
  const off = make({ softwareGl: true }), g3 = setupGreeting({ stats: { async init() {} }, hint: off.hint, seasonEnd: { async news() { throw new Error('offline'); } }, account: { notice: () => false }, free: () => true });
  await g3.greet(); assert.equal(off.$('gpu-hint-menu').open, true, 'offline: the tip needs no network');
  const busy = make({ softwareGl: true }), g4 = setupGreeting({ stats: { async init() {} }, hint: busy.hint, seasonEnd: { async news() { return null; } }, account: { notice: () => false }, free: () => false });
  await g4.greet(); assert.equal(busy.$('gpu-hint-menu').open, false, 'never over another sheet, a run or photo mode');
  // both sheets: a dialog, the round ×, one primary «D’acord», described by their text
  const html = readPage();
  for (const k of ['gpu-hint', 'ios-hint']) {
    const m = new RegExp(`<dialog id="${k}-menu" class="sheet hint-menu"[^>]*aria-labelledby="${k}-title" aria-describedby="${k}-text">([\\s\\S]*?)</dialog>`).exec(html);
    assert(m, `${k}: a sheet`);
    assert(new RegExp(`id="${k}-close" type="button"[^>]*class="sheet-x" aria-label="Tanca"`).test(m[1]) && new RegExp(`id="${k}-ok" type="button" class="btn btn-primary"[^>]*>D’acord`).test(m[1]), `${k}: × and D’acord`);
    assert.equal((m[1].match(/btn-primary/g) || []).length, 1);
  }
  assert(/acceleració per maquinari/.test(html) && /Compartir → Afegeix a la pantalla d’inici/.test(html), 'the same copy');
  assert(!/id="ios-hint"/.test(html), 'the inline banner is gone');
}
console.log('perfil, statistics, seasons and cards ok');

// --- one podium medal everywhere: every renderer of a place takes the boards' disc from posDisc (sheet-kit.js), none draws its own
{
  const { readFileSync } = await import('node:fs');
  for (const f of ['seasons-ui', 'select-podium', 'board-list', 'player-card', 'stats-view']) {
    const src = readFileSync(new URL(`../src/ui/${f}.js`, import.meta.url), 'utf8');
    assert(/import \{[^}]*\bposDisc\b[^}]*\} from '\.\/sheet-kit\.js'/.test(src) && /posDisc\(doc, /.test(src) && !/pos p\$\{|<svg[^`]*medal/.test(src), `${f}.js: its podium places through posDisc`);
  }
  const { posDisc } = await import('../src/ui/sheet-kit.js');
  const d = { createElement: () => ({}) };
  assert.deepEqual([1, 2, 3, 4].map(n => posDisc(d, n)).map(e => [e.className, e.textContent]), [['pos p1', '1'], ['pos p2', '2'], ['pos p3', '3'], ['pos', '4']]);
}
console.log('podium discs ok');
