import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIGURES, TOWNS, MULASSA, DRAC, MULE_ART, DRAC_ART, portraitArt, portraitPalette, playable, townOf, rememberedLevel, rememberLevel, recordKey, aviatText, INVITE, INVITE_TOWN, INVITE_DRAFT } from '../src/game/figures.js';
import { FIGURE_PORTRAITS } from '../src/game/figure-portraits.js';
import { setupSelect, peekGap } from '../src/ui/select-ui.js';
import { escutSvg } from '../src/ui/escuts.js';
import './strip-scroll.mjs';
assert.equal(new Set(FIGURES.map(f => f.id)).size, FIGURES.length);
assert.equal(new Set(TOWNS.map(t => t.id)).size, TOWNS.length);
assert(FIGURES.filter(playable).includes(MULASSA));
for (const id of ['valls', 'tarragona', 'reus', 'solsona', 'vilanova']) assert(TOWNS.some(t => t.id === id), `existing town ${id} remains`);
assert.deepEqual(FIGURES.filter(playable).map(f => f.id), [MULASSA.id, DRAC.id]);
assert(FIGURES.slice(0, FIGURES.filter(playable).length).every(playable), 'available figures come first');
assert(FIGURES.every(f => townOf(f) && ['playable', 'aviat'].includes(f.status)));
assert.deepEqual(FIGURES.filter(f => f.town === 'valls').map(f => f.id).sort(), ['mulassa-valls', 'drac-valls', 'aliga-valls', 'bou-tradicional-valls', 'os-trabucaires-valls', 'gegants-ciutat-valls', 'cavallets-valls', 'gegant-calcot-valls', 'campanar-valls', 'basilisc-valls'].sort(), 'only the requested principal Valls figures remain');
const sourceCatalog = JSON.parse(readFileSync(new URL('../src/game/figure-catalog.json', import.meta.url), 'utf8'));
assert.deepEqual(sourceCatalog.figures.filter(f => f.selectorVisible === false).map(f => f.id), ['nans-valls', 'diables-valls']);
for (const id of ['nans-valls', 'diables-valls']) {
  assert(sourceCatalog.figures.find(f => f.id === id).sources.length && FIGURE_PORTRAITS[id], `${id}: hidden figure retains sources and portrait`);
}
assert.equal(FIGURES.find(f => f.id === 'os-trabucaires-valls').fullName, 'Ós de Valls', 'the figure is distinct from its accompanying Trabucaires');
for (const id of ['aliga-valls', 'nans-valls', 'gegants-ciutat-valls']) {
  const f = sourceCatalog.figures.find(f => f.id === id);
  assert.equal(f.owner, 'Ajuntament de Valls');
  assert.equal(f.manager, 'Unió Anelles de la Flama');
  assert.equal(f.entity, 'Ajuntament + UAF');
  assert.equal(f.entityName, 'Ajuntament + UAF', 'compact joint attribution in the card and information panel');
}
const basilisc = FIGURES.find(f => f.id === 'basilisc-valls');
assert.equal(basilisc.entity, 'La Pessigolla');
assert.equal(FIGURES[FIGURES.findIndex(f => f.id === 'cavallets-valls') + 1], basilisc, 'Basilisc immediately follows Cavallets');
assert.equal(basilisc.status, 'aviat', 'Basilisc joins the catalog without becoming playable');
assert.equal(basilisc.manager, 'Agrupació Cultural La Pessigolla');
assert.equal(TOWNS.find(t => t.id === 'vilanova').name, 'Vilanova i la Geltrú');
for (const f of FIGURES) {
  assert(f.name && f.entity && f.sources?.length, `${f.id}: named and attributed catalog entry`);
  assert(!f.thumbnail, `${f.id}: native pixel portrait`);
  if (!playable(f)) assert(FIGURE_PORTRAITS[f.id], `${f.id}: has its own portrait`);
  const art = portraitArt(f), palette = portraitPalette(f);
  assert(art.length <= 14 && art[0].length <= 18, `${f.id}: small sprite grid`);
  assert(art.every(row => row.length === art[0].length), `${f.id}: uniform rows`);
  for (const cell of art.join('')) assert(cell === '.' || palette[cell], `${f.id}: unknown palette cell ${cell}`);
}
assert(portraitArt(INVITE).join('').split('').every(c => c === '.' || portraitPalette(INVITE)[c]), 'the invitation has its own portrait');
assert.equal(portraitArt(MULASSA), MULE_ART, 'original Mulassa portrait is retained');
assert.equal(portraitArt(DRAC), DRAC_ART, 'original Drac portrait is retained');
assert(FIGURES.every(f => /^#[0-9a-f]{6}$/i.test(townOf(f).color)));
const hue = hex => {
  const [r, g, b] = hex.match(/\w\w/g).map(n => parseInt(n, 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  return ((max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
};
const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
for (const t of TOWNS) {
  for (const input of ['#ff7a1a', '#14b8a6']) assert(gap(hue(t.color), hue(input)) > 30, `${t.name}: distinct from input colours`);

}
const memory = new Map(), store = { get: k => memory.get(k) ?? null, set: (k, v) => memory.set(k, v) };
assert.equal(rememberedLevel(store, MULASSA.id), 1);
rememberLevel(store, MULASSA.id, 2); assert.equal(rememberedLevel(store, MULASSA.id), 2);
assert.equal(rememberedLevel(store, 'another'), 1, 'memory belongs to the figure');
for (const value of ['-1', '3', 'NaN', '1.5', '']) { memory.set('level-mulassa-valls', value); assert.equal(rememberedLevel(store, MULASSA.id), 1); }
assert.equal(recordKey(MULASSA, 2), 'record-family-mulassa-2', 'short records have a separate namespace');
assert.equal(sourceCatalog.figures.find(f => f.id === 'nans-valls').music, 'Francesc Sans', 'pending Valls figures credit their own music');
assert.equal(aviatText('Reus').split('\n\n').length, 1, 'pending invitation stays compact');

// A named asset-backed fixture exercises future catalog entries without prescribing the research roster.
const catalogFixture = { id: 'selector-fixture', town: 'vilanova', status: 'aviat', name: 'Figura de prova amb nom llarg', entity: 'Entitat de prova amb nom llarg', thumbnail: '/figures/selector-fixture.webp' };
FIGURES.push(catalogFixture);
// The selector's DOM contract, with no rendering or network dependency.
const nodes = new Map(), handlers = {};
const doc = { activeElement: null, body: {}, getElementById: id => nodes.get(id) };
class Node {
  constructor(id = '', cls = '', dataset = {}) { Object.assign(this, { id, cls, dataset, children: [], attrs: {}, listeners: {}, style: { setProperty() {} }, hidden: false, open: false, scrollLeft: 0, scrollWidth: 700, clientWidth: 393, offsetLeft: 0, offsetWidth: 74 }); }
  set innerHTML(html) {
    this.banners = [...html.matchAll(/<span class="(sel-banner[^"]*)" data-town="([^"]+)"/g)].map(m => new Node('', m[1], { town: m[2] }));
    this.html = html; this.children = [...html.matchAll(/<button\b([^>]+)>/g)].map(([_, attrs], i) => {
      const data = Object.fromEntries([...attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
      const n = new Node('', attrs.match(/class="([^"]*)"/)?.[1], data); n.tabIndex = Number(attrs.match(/tabindex="([^"]*)"/)?.[1] ?? 0); n.parent = this; n.offsetLeft = i * 100; return n;
    });
  }
  get innerHTML() { return this.html; }
  querySelectorAll(sel) { return [...this.children, ...(this.banners || [])].filter(c => c.cls?.split(' ').includes(sel.slice(1))); }
  querySelector(sel) { return sel.startsWith('.sel-banner') ? { offsetLeft: 100 } : null; }
  setAttribute(k, v) { this.attrs[k] = v; }
  toggleAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return Boolean(this.attrs[k]); }
  getClientRects() { return this.hidden ? [] : [{}]; }
  addEventListener(k, f) { (this.listeners[k] ||= []).push(f); }
  fire(k, e = {}) { for (const f of this.listeners[k] || []) f(e); }
  contains(n) { return n === this || n?.parent === this; }
  closest(sel) { return sel.startsWith('[data-level]') ? this.dataset.level != null && this : this.cls?.split(' ').includes(sel.slice(1)) ? this : null; }
  focus() { doc.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  blur() { doc.activeElement = doc.body; }
  scrollTo({ left, behavior }) { this.scrollLeft = left; this.behavior = behavior; }
  getBoundingClientRect() { return { top: 100, right: 200, bottom: 300 }; }
}
for (const id of ['leaders', 'viewmode', 'feedback', 'music', 'settings', 'select-carousel', 'select-prev', 'select-forward', 'select', 'select-towns', 'select-strip', 'select-level', 'select-song', 'select-entity', 'select-act', 'select-name', 'select-song-name', 'select-song-credit', 'select-play', 'select-next', 'select-figures-back', 'select-board', 'select-howto', 'aviat-write', 'aviat-text', 'select-info', 'select-bottom', 'select-pos', 'select-tiles', 'select-rank-tile', 'select-pending', 'aviat-entity', 'aviat-icon', 'aviat-title']) nodes.set(id, new Node(id));
const $ = id => nodes.get(id), win = { innerWidth: 393, innerHeight: 852, addEventListener(k, f) { (handlers[k] ||= []).push(f); } };
let boards = 0, sounds = [], played = [], how = 0, drafts = [], busy = false, selected = [];
const api = setupSelect({ doc, win, store, keyboard: () => true, reduced: () => true, busy: () => busy,
  sfx: k => sounds.push(k), firstLevel: 0, standing: async () => ({ pos: 7, total: 1350 }), onBoard: () => boards++, demo: true, // ?demo stays off outside a dev build
  onPlay: (d, f) => played.push([d, f.id]), onSelect: f => selected.push(f.id), onHowto: () => how++, onWrite: draft => drafts.push(draft) });
const key = (key, options = {}) => { const e = { key, ...options, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const f of handlers.keydown) f(e); return e; };
const click = (root, target = root) => root.fire('click', { target });
api.visible(true); await Promise.resolve();
assert.match($('select-entity').innerHTML, /<svg.*<span>Unió Anelles de la Flama<\/span>/, 'UAF badge uses its flame and full name');
assert.equal($('select-song-credit').textContent, 'Francesc Bofarull i Figuerola · 1987');
assert.equal($('select-level').children[0].attrs['aria-pressed'], 'true', 'challenge overrides remembered level once');
assert.equal($('select-pos').textContent, 'Ets el número 7 de 1.350', 'the real board, not the ?demo position'); const lv = () => $('select-level').children;
assert(!/12\.340|8\.120/.test([...lv()].map(b => b.html).join('')), 'nor its made-up records');
assert([...lv()].every((b, i) => b.html === `${['FÀCIL', 'NORMAL', 'DIFÍCIL'][i]}<span class="sub">—</span>` && !/rècord/.test(b.attrs['aria-label'])), 'no record: «—» keeps the line, the name alone is read');
assert.equal($('select-rank-tile').attrs['aria-label'], 'Classificacions: ets el número 7 de 1.350');
click($('select-rank-tile')); assert.equal(boards, 1, 'the position opens Classificacions');
assert(!readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes('select-first'), 'the leader lives in Classificacions only');
assert(!$('select-rank-tile').hidden, 'a position from the board is shown');
assert($('select-act').hidden, 'difficulty is a second step');
click($('select-play')); assert.equal(played.length, 0, 'cannot skip the difficulty step');
click($('select-next')); assert(!$('select-act').hidden && $('select-strip').hidden);
click($('select-level'), $('select-level').children[1]);
click($('select-level'), $('select-level').children[0]);
click($('select-figures-back')); assert($('select-act').hidden && !$('select-strip').hidden);
const cards = $('select-strip').children;
{ // Closing items must not count as available destinations, even before their layout disappears.
  const strip = $('select-strip'), carousel = $('select-carousel');
  const resize = () => handlers.resize.forEach(f => f());
  const ghost = new Node(); ghost.inert = true; ghost.offsetLeft = 2000;
  strip.children.push(ghost);
  strip.scrollWidth = 3000;
  resize();
  assert(carousel.hasAttribute('data-fits'), 'fitting cards hide arrows even while an inert item extends scrollWidth');
  strip.clientWidth = 200; resize();
  assert(!carousel.hasAttribute('data-fits'), 'real card overflow restores arrows on resize');
  strip.clientWidth = 393; resize();
  assert(carousel.hasAttribute('data-fits'), 'growing the viewport hides arrows again');
  strip.children.pop(); strip.scrollWidth = 700;
  const end = strip.children.find(c => c.dataset.more), previousLeft = end.offsetLeft;
  end.offsetLeft = strip.clientWidth - end.offsetWidth + 5;
  win.getComputedStyle = el => ({ marginRight: el === end ? '-5px' : '0px' });
  resize();
  assert(carousel.hasAttribute('data-fits'), 'the disclosure negative margin is part of its layout footprint');
  delete win.getComputedStyle; end.offsetLeft = previousLeft;
}
assert($('select-prev').disabled && $('select-forward').disabled, 'fitting cards have no scroll actions');
const soundBefore = sounds.length;
key('ArrowRight');
assert.equal(api.figure, DRAC, 'keyboard arrows select and preview the next figure');
assert.equal(cards[1].attrs['aria-selected'], 'true');
assert($('select-prev').disabled, 'selecting Drac at scroll zero cannot enable the left arrow');
assert.equal(sounds.length, soundBefore + 1);
key('ArrowLeft'); assert.equal(api.figure, MULASSA);
assert.equal(sounds.length, soundBefore + 2);
click($('select-prev')); click($('select-forward'));
assert.equal(sounds.length, soundBefore + 2, 'unavailable scroll actions make no sound');
{
  const strip = $('select-strip'), resize = () => handlers.resize.forEach(f => f());
  strip.clientWidth = 100; resize();
  assert($('select-prev').disabled && !$('select-forward').disabled, 'overflow only to the right at the start');
  click($('select-forward'));
  assert.equal(strip.scrollLeft, 120, 'mouse arrow scrolls the strip');
  assert.equal(api.figure, MULASSA, 'scrolling does not change selection');
  assert(!$('select-prev').disabled && !$('select-forward').disabled);
  click($('select-forward'));
  assert.equal(strip.scrollLeft, 174, 'repeated clicks stop at the available content boundary');
  assert($('select-forward').disabled && !$('select-prev').disabled);
  busy = true; click($('select-prev')); assert.equal(strip.scrollLeft, 174, 'sheets guard scrolling'); busy = false;
  click($('select-prev')); assert.equal(strip.scrollLeft, 54, 'left works even with the first figure selected');
  strip.scrollLeft = 0; strip.fire('scroll');
  assert($('select-prev').disabled, 'native scrolling also refreshes arrow availability');
  let prevented = false;
  strip.fire('wheel', { deltaY: 100, deltaX: 0, deltaMode: 0, preventDefault() { prevented = true; } });
  assert(prevented && strip.scrollLeft === 100, 'mouse wheel scrolls the horizontal strip');
  strip.clientWidth = 393; strip.scrollLeft = 0; resize();
  assert($('select-prev').disabled && $('select-forward').disabled, 'growing the viewport removes unavailable arrows');
}

const cardMarkup = id => $('select-strip').innerHTML.match(new RegExp(`<button[^>]*data-id="${id}"[^]*?</button>`))[0];
assert.match(cardMarkup('mulassa-valls'), /aria-label="Mulassa, Unió Anelles de la Flama, Valls/);
assert.match(cardMarkup('aliga-valls'), /aria-label="Àliga, Ajuntament de Valls \+ Unió Anelles de la Flama, Valls/);
for (const [id, count] of [['mulassa-valls', 1], ['aliga-valls', 2]]) {
  const icons = cardMarkup(id).match(/<small class="sel-entity-icons" aria-hidden="true">([^]*?)<\/small>/)[1];
  assert.match(icons, /UAF<\/span>/);
  if (count === 2) assert.match(icons, /Ajuntament<\/span>/);
  assert.equal((icons.match(/<svg/g) || []).length, count, `${id}: entity icons accompany the card caption`);
}
const live = FIGURES.filter(f => playable(f)), soon = FIGURES.filter(f => !playable(f));
const more = cards.find(c => c.dataset.more), later = cards.filter(c => c.cls.includes('later'));
assert(!cards.some(c => ['diables-valls', 'nans-valls'].includes(c.dataset.id)), 'Diables and Nans have no card for clicks, keyboard navigation or town selection');
assert.deepEqual(cards.slice(0, live.length).map(c => c.dataset.id), live.map(f => f.id), 'the playable figures come first');
assert.equal(cards[live.length], more, 'then the fold');
assert.deepEqual(later.map(c => c.dataset.id), [...soon, INVITE].map(f => f.id), 'then everything still to come, and the invitation last');
assert(/aria-label="Pròximament"><span class="sel-more-flag" aria-hidden="true"><svg[^]*?<\/svg><span class="sel-fan"><svg class="escut"/.test($('select-strip').innerHTML), 'the fold is named Pròximament and shows the coming towns\' arms, no count');
assert.equal($('select-strip').banners.filter(b => b.dataset.town === 'valls').length, 1, 'Valls goes on past the fold with no second banner');
const banners = $('select-strip').banners;
assert(later.every(c => c.hidden) && banners.filter(b => b.cls.includes('later')).every(b => b.hidden) && !banners[0].hidden, 'folded at first: only the playable figures and their banner');
assert.equal(more.attrs['aria-expanded'], 'false');
const pills = $('select-towns').children, soonPill = pills.find(p => p.dataset.soon);
const restTowns = TOWNS.filter(t => t.id !== 'valls' && soon.some(f => f.town === t.id));
assert.deepEqual(pills.filter(p => p.dataset.town && !p.hidden).map(p => p.dataset.town), ['valls'], 'folded: only towns with something to play');
assert(soonPill && $('select-towns').innerHTML.includes('<span class="sel-soon-text">Pròximament</span>'), 'the other towns fold into one pill');
assert.equal(($('select-towns').innerHTML.match(/class="escut"/g) || []).length, 1 + 2 * restTowns.length, 'their arms fanned out in it');

// Visible town controls stay in DOM Tab order; arrows must never land on folded towns.
assert.equal(soonPill.tabIndex, 0, 'Pròximament is reachable by Tab');
assert(pills.filter(p => !p.hidden).every(p => p.tabIndex === 0));
pills[0].focus(); key('End');
assert.equal(doc.activeElement, soonPill, 'End stops at the last visible pill');
key('ArrowRight'); assert.equal(doc.activeElement, soonPill, 'Right cannot focus a folded town');
click($('select-towns'), soonPill);
assert(pills.every(p => p.tabIndex === 0), 'expanded towns are all reachable by Tab');
key('ArrowRight'); assert.equal(doc.activeElement, pills[2]);
click($('select-towns'), pills[2]);
assert.equal(api.figure.town, pills[2].dataset.town, 'keyboard-focused town activates normally');
key('Escape');
assert(!api.unfolded && doc.activeElement === soonPill, 'Escape folds and returns focus to the disclosure');
assert(pills.filter(p => p.hidden).every(p => p.tabIndex === -1));
assert.equal(soonPill.tabIndex, 0, 'collapsing preserves the disclosure Tab stop');
key('Home'); assert.equal(doc.activeElement, pills[0]);
click($('select-next')); soonPill.focus(); key('Escape');
assert($('select-act').hidden, 'Escape still leaves difficulty when the town row is folded');
// A desktop's inline header is one visible row, including its town controls.
$('select').toggleAttribute('data-header-inline', true);
const headerSounds = sounds.length;
$('viewmode').focus(); key('ArrowRight');
assert.equal(doc.activeElement, pills[0], 'Right from the eye reaches Valls in the inline header');
key('ArrowRight'); assert.equal(doc.activeElement, soonPill);
key('ArrowRight'); assert.equal(doc.activeElement, $('feedback'), 'Right leaves the towns for the right corner controls');
key('ArrowRight'); key('ArrowRight'); assert.equal(doc.activeElement, $('settings'), 'Settings is reachable without leaving the visible row');
assert.equal(sounds.length, headerSounds + 5, 'each header focus move plays exactly one menu sound');
key('ArrowRight'); assert.equal(sounds.length, headerSounds + 5, 'no sound at the header boundary');
key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); assert.equal(doc.activeElement, soonPill, 'Left returns from the corner to the towns');
key('ArrowLeft'); key('ArrowLeft'); assert.equal(doc.activeElement, $('viewmode'));
$('select').toggleAttribute('data-header-inline', false);
key('ArrowRight'); assert.equal(doc.activeElement, $('feedback'), 'on separate rows the corner controls stay together');
soonPill.focus(); key('ArrowRight'); assert.equal(doc.activeElement, soonPill, 'folded towns stay out of the separate row');
const rowSounds = sounds.length;
pills[0].focus(); key('ArrowUp');
assert.equal(doc.activeElement, $('leaders'));
assert.equal(sounds.length, rowSounds + 1, 'moving up to the corner row plays one sound');
key('ArrowDown');
assert.equal(doc.activeElement, pills[0]);
assert.equal(sounds.length, rowSounds + 2, 'moving down to towns plays one sound');
cards[0].focus();

const e1 = key('ArrowRight');
assert(e1.defaultPrevented && api.figure === DRAC && doc.activeElement === cards[1] && cards[1].attrs['aria-selected'] === 'true');
assert.equal($('select-strip').behavior, 'instant', 'reduced motion centres keyboard selection immediately');
{
  const sound = sounds.length, scroll = $('select-strip').scrollLeft;
  for (let i = 0; i < 40; i++) assert(key('ArrowRight', { repeat: true }).defaultPrevented);
  assert.equal(api.figure, DRAC, 'holding Right does not select more figures');
  assert.equal(doc.activeElement, cards[1], 'holding Right does not advance focus');
  assert.equal($('select-strip').scrollLeft, scroll, 'holding Right does not retarget scrolling');
  assert.equal(sounds.length, sound, 'holding Right does not repeat menu sounds');
}
const foldSounds = sounds.length;
key('ArrowRight');
assert.equal(sounds.length, foldSounds + 1, 'focusing the fold plays one sound without changing figure');
assert(doc.activeElement === more && api.figure === DRAC && !api.unfolded, 'arrows reach the fold without unfolding it or changing the figure');
// the cursor on the fold shows the fold's own card: what is coming, no difficulty, the dock where it was
assert(!$('select-pending').hidden && $('select-info').hidden && $('select-pending').attrs['data-fold'], 'the fold has its own card');
assert.equal($('aviat-title').textContent, 'Aviat a la plaça');
assert.match($('aviat-entity').innerHTML, new RegExp(`${soon.length} figures · ${new Set(soon.map(f => f.town)).size} poblacions`));
assert.equal(($('aviat-icon').innerHTML.match(/class="sel-peek"/g) || []).length, 3, 'three coming figures peek out');
assert($('select-next').disabled && $('select').attrs['data-fold'], 'its action hides; the dock drops over its row (select.css)');
key('ArrowRight'); assert.equal(doc.activeElement, more, 'folded, it is the end of the strip');
assert.equal(sounds.length, foldSounds + 1, 'no sound when the fold focus cannot move farther');
key('Enter'); assert(api.unfolded && later.every(c => !c.hidden) && more.attrs['aria-expanded'] === 'true', 'Enter unfolds it in place');
assert(!$('select-forward').disabled, 'expanding from the last folded item immediately enables the next arrow');
assert(pills.every(p => !p.hidden), 'with its towns\' pills');
{
  const strip = $('select-strip');
  strip.scrollLeft = 1800; strip.scrollWidth = 3000;
  key('Enter');
  assert.equal(strip.scrollLeft, 0, 'reduced-motion folding returns to the remaining cards');
  assert.equal(strip.behavior, 'instant', 'reduced motion also applies to folding');
  key('Enter'); strip.scrollWidth = 700;
}
key('ArrowRight'); assert.equal(api.figure, soon[0], 'the arrows go on into it');
{
  const focus = doc.activeElement, scroll = $('select-strip').scrollLeft, sound = sounds.length;
  for (const held of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
    assert(key(held, { repeat: true }).defaultPrevented, `${held}: consume repeated navigation`);
  }
  assert.equal(api.figure, soon[0], 'expanded figures do not run away under a held navigation key');
  assert.equal(doc.activeElement, focus);
  assert.equal($('select-strip').scrollLeft, scroll);
  assert.equal(sounds.length, sound);
  key('ArrowRight'); assert.equal(api.figure, soon[1], 'a fresh press still advances immediately');
  key('ArrowLeft'); assert.equal(api.figure, soon[0], 'a fresh press still reverses immediately');
}
assert(!$('select-pending').hidden && $('select-info').hidden, 'a pending figure shows its own panel');
assert.equal($('aviat-title').textContent, soon[0].fullName || soon[0].name); assert.match($('aviat-icon').innerHTML, /<svg|<img/);
assert.equal(($('aviat-text').innerHTML.match(/<p>/g) || []).length, 1); assert.match($('aviat-text').innerHTML, /Encara no s’hi pot jugar/);
assert($('select-next').disabled && !$('select-next').hidden, 'no difficulty for it: its action hides');
assert($('select').attrs['data-pending'], 'the dock drops over the action\'s empty row');
assert.equal($('select-name').textContent, DRAC.fullName || DRAC.name, 'the playable panel fades out as it was');
assert.equal(selected.at(-1), DRAC.id, 'nor does it change the song or the model');
click($('select-next')); key('Enter'); assert($('select-act').hidden, 'it cannot be played');
click($('aviat-write')); assert.deepEqual(drafts, [`Sobre ${townOf(soon[0]).name}: `]);
click($('select-strip'), more); assert(!api.unfolded && later.every(c => c.hidden), 'the banner folds it back');
assert.equal(api.figure, DRAC, 'a hidden figure falls back to Drac');
assert($('select-pending').hidden && !$('select').attrs['data-fold'], 'closing never replaces the outgoing figure with the teaser');
click($('select-strip'), cards[1]); assert($('select-pending').hidden && !$('select-info').hidden && !$('select-next').disabled, 'leaving the fold brings the figure back');
const tarragona = pills.find(p => p.dataset.town === 'tarragona');
click($('select-towns'), soonPill); assert(api.unfolded && !tarragona.hidden, 'the pill unfolds too');
click($('select-towns'), soonPill); assert(!api.unfolded && tarragona.hidden, 'and folds');
click($('select-towns'), soonPill); click($('select-towns'), tarragona);
assert.equal(api.figure, soon.find(f => f.town === 'tarragona'), 'a town pill goes to its first figure');
assert.equal(tarragona.attrs['aria-pressed'], 'true');
{ // the last pill and card invite a colla to propose its figure: the pending panel with its own copy and draft, never playable
  const invite = pills.at(-1);
  assert.equal(invite.dataset.town, INVITE_TOWN.id); assert.equal(cards.at(-1).dataset.id, INVITE.id, 'the invitation closes the strip');
  assert(!TOWNS.some(t => t.id === INVITE_TOWN.id) && !FIGURES.includes(INVITE), 'no real town, no catalog figure');
  assert.equal(banners.at(-1).dataset.town, INVITE_TOWN.id, 'under its own estendard');
  const notified = selected.length;
  click($('select-towns'), invite);
  assert.equal(api.figure, INVITE); assert.equal(invite.attrs['aria-pressed'], 'true');
  assert(!$('select-pending').hidden && $('select-info').hidden && $('select-next').disabled, 'the pending panel: no difficulty, no records');
  assert.equal($('aviat-title').textContent, 'La teva colla'); assert.match($('aviat-text').innerHTML, /el teu poble surti al joc/);
  assert.equal(selected.length, notified, 'the stage keeps the last playable figure');
  click($('select-next')); assert($('select-act').hidden, 'it cannot be played');
  click($('aviat-write')); assert.equal(drafts.at(-1), INVITE_DRAFT, 'the Bústia opens with a proposal draft');
  click($('select-towns'), tarragona);
}
assert.match($('select-strip').innerHTML, /<img src="\/figures\/selector-fixture\.webp" alt="" width="96" height="96" loading="lazy"/);
assert.match($('select-strip').innerHTML, /Figura de prova amb nom llarg<\/span><small>Entitat de prova amb nom llarg/);
busy = true; click($('select-strip'), more); assert(api.unfolded, 'not over a sheet'); busy = false;
click($('select-strip'), more); assert(!api.unfolded); assert.equal(api.figure, DRAC);
cards[1].focus(); key('ArrowLeft'); assert.equal(api.figure, MULASSA);
{ // a tapped card is brought into view; a pill goes to its town's first figure
  const strip = $('select-strip'), valls = pills.find(p => p.dataset.town === 'valls');
  strip.scrollLeft = 0; strip.scrollWidth = 1800; cards[1].offsetLeft = 900; cards[1].offsetWidth = 128; strip.clientWidth = 393;
  click(strip, cards[1]); assert.equal(strip.scrollLeft, 900 - (393 - 128) / 2, 'the tapped card is centred');
  click($('select-towns'), valls); assert.equal(api.figure, MULASSA, 'Valls selects the first of the list');
  assert.equal(strip.scrollLeft, 0, 'centring the first card stops at the real scroll boundary');
  assert.equal(valls.attrs['aria-pressed'], 'true', 'its pill reads as active');
  cards[1].offsetLeft = 100; cards[1].offsetWidth = 74; strip.scrollWidth = 700;
}
assert(selected.every(id => live.some(f => f.id === id)) && selected.at(-1) === MULASSA.id, 'playable figure changes notify the host, pending ones never');
key('Home'); assert.equal(api.figure, MULASSA);
key('Escape'); assert(!$('select').hidden, 'Escape does not create a title loop');
api.visible(false); api.visible(true);
assert.equal($('select-level').children[0].attrs['aria-pressed'], 'true', 'later visits restore the figure level');
rememberLevel(store, DRAC.id, 2);
store.set(recordKey(DRAC, 2), JSON.stringify({ quality: 88, score: 1234 })); store.set(recordKey(DRAC, 0), JSON.stringify({ quality: 99 })); // a record from before `score` counts as none
click($('select-strip'), cards[1]);
assert.equal(api.figure, DRAC); assert.equal(selected.at(-1), DRAC.id, 'selection notifies the stage host');
assert.equal($('select-level').children[2].attrs['aria-pressed'], 'true', 'each figure restores its own difficulty');
assert.equal(lv()[2].html.replace(/<svg[^]*<\/svg>/, '★'), 'DIFÍCIL<span class="sub">★1.234</span>', 'step 2: the best score under its level, with a trophy');
assert.equal(lv()[2].attrs['aria-label'], 'DIFÍCIL, el teu rècord 1.234 punts');
assert(lv()[0].html.endsWith('<span class="sub">—</span>') && lv()[1].html.endsWith('<span class="sub">—</span>'), 'no score, or no record: «—»');
await Promise.resolve();
assert($('select-rank-tile').hidden, 'local-only figures show no public Mulassa standings');
cards[1].focus();
key('Enter'); assert(!$('select-act').hidden, 'Enter confirms the figure before playing');
key('ArrowLeft'); assert.equal($('select-level').children[1].attrs['aria-pressed'], 'true');
key('ArrowRight'); key('Escape'); assert($('select-act').hidden, 'Escape leaves difficulty without a run');
click($('select-next'));
assert.equal($('select-act').inert, false, 'the difficulty step accepts input');
click($('select-play')); assert.deepEqual(played.at(-1), [2, DRAC.id], 'play receives the selected figure and level');
click($('select-strip'), cards[0]); await Promise.resolve();
assert(!$('select-rank-tile').hidden);
assert.equal($('select-pos').textContent, 'Ets el número 7 de 1.350', 'returning to Mulassa refreshes its own board');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<section id="select-pending"/); assert(!html.includes('id="soon-menu"'), 'no sheet: it unfolds in place');
assert.match(html, /href="mailto:holi@mulassa.cat"/);
assert(html.indexOf('id="select-name"') < html.indexOf('id="select-howto"') && html.indexOf('id="select-howto"') < html.indexOf('id="select-rank-tile"'), 'the ? sits by the name');
assert.match(html, /id="select-howto"[^>]*aria-label="Com es juga"[^>]*><span aria-hidden="true">\?<\/span><\/button>/);
assert.match(html, /<button id="select-rank-tile" type="button" class="sel-tile sel-rank" aria-haspopup="dialog" hidden><svg[^]*class="chev"/, 'the position: a real button, the same chip as the record, a chevron to say so');
FIGURES.splice(FIGURES.indexOf(catalogFixture), 1);
const ui = readFileSync(new URL('../src/ui/select-ui.js', import.meta.url), 'utf8');
assert.match(ui, /f\.thumbnail/); assert.match(ui, /<img src=/);
assert(!/showModal|aviat\.close|aviat-menu|aviat-close/.test(ui));
{ // every town carries its arms in the pills, each copy with its own clip id
  for (const t of TOWNS) assert.match(escutSvg(t.id), /^<svg class="escut"[^>]*aria-hidden="true"/, `${t.name}: escut`);
  const ids = TOWNS.flatMap(t => [escutSvg(t.id), escutSvg(t.id)]).map(svg => svg.match(/clipPath id="([^"]+)"/)[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(escutSvg('nowhere'), '');
  assert.match(ui, /escutSvg\(t\.id\) \|\|/); assert.match(ui, /aria-hidden="true"><span>\$\{\(t\.short/, 'banners carry the name only');
  // the banner's cloth is the shirt of the town's colla castellera; Solsona has none active and keeps its own colour
  const css = readFileSync(new URL('../src/styles/select.css', import.meta.url), 'utf8');
  for (const t of TOWNS.filter(t => t.id !== 'solsona')) assert.match(css, new RegExp(`\\.sel-banner\\[data-town="${t.id}"\\]`), `${t.name}: a colla's cloth`);
}
assert.match(readFileSync(new URL('../src/styles/select.css', import.meta.url), 'utf8'), /@media \(pointer: coarse\) \{[^}]*\}\s*\.sel-carousel \.sel-arrow \{ display: none; \}/, 'touch screens swipe the strip: no arrows');
{ // a pending figure takes the action's row back: the dock drops, its card follows on the same clock, no layout animated
  const css = readFileSync(new URL('../src/styles/select.css', import.meta.url), 'utf8');
  assert.match(css, /#select:is\(\[data-pending\], \[data-fold\]\) \{ --drop: var\(--drop-h\); \}/, 'a pending figure or the fold\'s card');
  assert.match(css, /--drop-h: calc\(var\(--action-h\) \+ var\(--ga\)\)/, 'by exactly the action and its gap');
  assert.match(css, /\.sel-bottom \{[^}]*transform: translateY\(var\(--drop\)\); transition: transform \.32s/);
  assert.match(css, /\.sel-pending \{ --sink: calc\(var\(--drop\) \/ 2\); transform: translateY\(var\(--sink\)\); transition: [^}]*transform \.32s[^}]*max-height \.32s/);
  assert.match(css, /\.sel-pending \{[^}]*max-height: calc\(100% - var\(--pending-top, 144px\) - var\(--pending-bottom, 254px\) \+ var\(--drop\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ #select :is\(\.sel-pending, \.sel-info\) \{ transition: none; \} \}/);
  assert.match(css, /#select\[data-fold\] \.sel-card\.sel-more:not\(:focus-visible\)::before \{ border: 3px solid #fff3d6; \}/, 'the fold\'s card shows: the fold wears the cream ring');
  assert.match(css, /#select\[data-fold\] \.sel-card\[aria-selected="true"\] \{ transform: none;/, 'and the figure underneath lets it go');
  assert.match(ui, /dockTop = \(dock\.offsetTop/, 'measure() reads the dock\'s layout box, never its moving rect');
}
console.log('catalog selection, the PRÒXIMAMENT fold, pending panel, town pills, town arms, touch strip without arrows, feedback focus and per-figure records ok');


{ // a row that scrolls leaves the item at its right edge partly shown; one that fits keeps its gap
  const cut = (widths, room, g) => { let x = 0; for (const w of widths) { if (x + w > room) return (room - x) / w; x += w + g; } return 1; };
  for (const room of [300, 381, 400, 520, 700]) {
    const pills = [60, 90, 120, 80, 110, 120, 90, 80, 110], g = peekGap(pills, room, 7);
    assert.ok(Math.abs(cut(pills, room, g) - 0.5) <= Math.abs(cut(pills, room, 7) - 0.5), `pills at ${room}px: gap ${g} cuts no better than 7`);
    if (room !== 381) assert.ok(Math.abs(cut(pills, room, g) - 0.5) <= 0.3, `pills at ${room}px: gap ${g}`); // 381: out of reach within 2x
  }
  assert.equal(peekGap([60, 60], 400, 7), 7);
}

{ // Selection commits before the first exit frame; hiding the catalog only finishes the visual transition.
  for (const n of nodes.values()) n.listeners = {};
  for (const k of Object.keys(handlers)) delete handlers[k];
  doc.activeElement = null;
  let now = 0, frameId = 0;
  const frames = new Map();
  win.performance = { now: () => now };
  win.requestAnimationFrame = f => { frames.set(++frameId, f); return frameId; };
  win.cancelAnimationFrame = id => frames.delete(id);
  Node.prototype.animate = function (keyframes, options) {
    const animation = { keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
    this.animation = animation; return animation;
  };
  const tick = ms => { now += ms; for (const [id, f] of [...frames]) if (frames.delete(id)) f(now); }; // honour cancellation by an earlier callback in this frame
  let reducedMotion = false;
  const notifications = [], foldSfx = [];
  const animated = setupSelect({ doc, win, store, reduced: () => reducedMotion, keyboard: () => true,
    onPlay() {}, onSelect: f => notifications.push(f.id), sfx: k => foldSfx.push(k) });
  animated.visible(true);
  const row = $('select-strip'), toggle = row.children.find(c => c.dataset.more);
  const dragon = row.children.find(c => c.dataset.id === DRAC.id);
  const eagle = row.children.find(c => c.dataset.id === 'aliga-valls');
  click(row, dragon); click(row, toggle); click(row, eagle);
  for (let i = 0; i < 120; i++) tick(1000 / 60);
  click(row, toggle);
  assert.equal(animated.figure, DRAC);
  assert.equal($('aviat-title').textContent, 'Àliga de la Ciutat de Valls', 'the outgoing panel retains its content');
  assert($('select-pending').hidden && !$('select').hasAttribute('data-fold'), 'the pending panel fades without an intermediate teaser');
  tick(120);
  assert.equal(animated.figure, DRAC, 'selection stays stable through the exit');
  assert(!eagle.hidden && eagle.inert, 'fading figures retain layout but cannot be selected');
  assert.deepEqual(eagle.animation.keyframes.opacity, [1, 0]);
  tick(120);
  assert(eagle.hidden && animated.figure === DRAC, 'completion only removes the faded catalog');
  assert(!$('select-next').disabled && !$('select').hasAttribute('data-folding') && !$('select').hasAttribute('data-fold'), 'the cursor comes back with the figure: its action, the dock up');
  click(row, toggle); click(row, dragon); click(row, toggle); tick(300);
  assert(!$('select-next').disabled && !$('select').hasAttribute('data-fold'), 'folding with a playable figure selected brings its action back');
  click(row, dragon);
  click(row, toggle); click(row, eagle); tick(300);
  click(row, toggle); tick(80); click(row, toggle); tick(500);
  assert(!eagle.hidden && !eagle.inert && animated.figure === DRAC, 'reopening keeps the committed selection and cancels the old exit');
  assert(!$('select-pending').inert && !$('select').hasAttribute('data-folding'));
  for (const reduced of [false, true]) {
    reducedMotion = reduced;
    for (const id of [MULASSA.id, DRAC.id, 'aliga-valls', INVITE.id]) {
      if (!animated.unfolded) click(row, toggle);
      click(row, row.children.find(c => c.dataset.id === MULASSA.id));
      const source = row.children.find(c => c.dataset.id === id);
      click(row, source); source.focus();
      tick(500);
      const title = $('aviat-title').textContent, before = notifications.length, soundCount = foldSfx.length;
      const expected = id === MULASSA.id ? MULASSA : DRAC;
      click(row, toggle);
      assert.equal(animated.figure, expected, `${id}: selection commits synchronously (reduced=${reduced})`);
      assert(!$('select').hasAttribute('data-fold'), 'no teaser, including keyboard mode');
      assert.equal($('aviat-title').textContent, title, 'outgoing content is not rewritten');
      assert.deepEqual(foldSfx.slice(soundCount), ['menu'], 'one ordinary menu sound, no Drac effect');
      assert.equal(notifications.length - before, playable(FIGURES.find(f => f.id === id) ?? INVITE) ? 0 : 1, 'host notified only for a changed figure');
      if (!playable(FIGURES.find(f => f.id === id) ?? INVITE)) assert.equal(doc.activeElement, toggle, 'focus returns from the disappearing card');
      tick(300);
      assert.equal(animated.figure, expected, 'completion does not change selection');
      assert(!row.children.some(c => c.inert && !c.hidden), 'no lingering invisible interactive cards');
    }
  }
  reducedMotion = false;
  click(row, toggle);
  click(row, row.children.find(c => c.dataset.id === INVITE.id));
  const townRow = $('select-towns');
  townRow.scrollWidth = 2000; townRow.scrollLeft = 1400;
  click(row, toggle);
  tick(120);
  assert(townRow.scrollLeft > 0 && townRow.scrollLeft < 1400, 'distant pills return while the catalog fades');
  tick(120);
  assert.equal(townRow.scrollLeft, 0, 'pills arrive before removing their overflow can clamp the scroll');
  assert.equal(animated.figure, DRAC);
}
console.log('pending fold: immediate selection, preserved outgoing content, shared exit and reopening ok');
