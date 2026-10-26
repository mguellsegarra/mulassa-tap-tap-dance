import { UNRELEASED_IDS } from '../../../src/figures/index.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectCss } from '../../ui/page.mjs';
import { FIGURES, TOWNS, MULASSA, DRAC, BOU, portraitArt, portraitPalette, portraitStand, STAND, playable, upFront, townOf, rememberedLevel, rememberLevel, recordKey, aviatText, aviatDraft, inviteText, INVITE, INVITE_TOWN, INVITE_DRAFT } from '../../../src/game/figures.js';
import { FIGURE_PORTRAITS } from '../../../src/game/figure-portraits.js';
import { setupSelect, peekGap, pixelSvg } from '../../../src/ui/select-ui.js';
import { cellOutline } from '../../../src/ui/selector-portraits.js';
import { DRAWN_SILHOUETTES } from '../../../src/ui/pending-silhouettes.js';
import { escutSvg } from '../../../src/ui/escuts.js';
import { clampStand } from '../../../src/dev/sizes-edit.js';
import { fitPendingNote } from '../../../src/ui/pending-title.js';
import '../../ui/strip-scroll.mjs';
const MULE_ART = FIGURE_PORTRAITS['mulassa-valls'].art, DRAC_ART = FIGURE_PORTRAITS['drac-valls'].art;
assert.equal(new Set(FIGURES.map(f => f.id)).size, FIGURES.length);
assert.equal(new Set(TOWNS.map(t => t.id)).size, TOWNS.length);
assert(FIGURES.filter(playable).includes(MULASSA));
for (const id of ['valls', 'tarragona', 'reus', 'solsona', 'vilanova']) assert(TOWNS.some(t => t.id === id), `existing town ${id} remains`);
assert.deepEqual(FIGURES.filter(playable).map(f => f.id), [MULASSA.id, DRAC.id, 'bou-tradicional-valls'].filter(id => !UNRELEASED_IDS.has(id)));
assert.equal(BOU.status, UNRELEASED_IDS.has(BOU.id) ? 'aviat' : 'playable', 'an unreleased figure is a pending one: no song, no play');
assert(FIGURES.slice(0, FIGURES.filter(playable).length).every(playable), 'available figures come first');
assert(FIGURES.every(f => townOf(f) && ['playable', 'aviat'].includes(f.status)));
assert.deepEqual(FIGURES.filter(f => f.town === 'valls').map(f => f.id).sort(), ['mulassa-valls', 'drac-valls', 'aliga-valls', 'bou-tradicional-valls', 'os-trabucaires-valls', 'gegants-ciutat-valls', 'cavallets-valls', 'basilisc-valls'].sort(), 'only the requested principal Valls figures remain');
const sourceCatalog = JSON.parse(readFileSync(new URL('../../../src/game/figure-catalog.json', import.meta.url), 'utf8'));
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
const vilanovaFigures = FIGURES.filter(f => f.town === 'vilanova');
assert.deepEqual(vilanovaFigures.map(f => f.id), ['boja-vilanova', 'drac-vilanova'], 'Vilanova replaces the grouped Mulasses with two distinct figures, Boja first');
assert(vilanovaFigures.every(f => !playable(f) && f.visualSources.length), 'both are pending with direct visual references');
assert(!sourceCatalog.figures.some(f => f.id === 'mulasses-vilanova'), 'the replaced group is absent');
assert.notDeepEqual(portraitArt(vilanovaFigures[1]), DRAC_ART, 'Vilanova has its own one-headed dragon portrait');

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
{ // a portrait is a few paths (one per colour), not a node per pixel: 27 cards of rects made every selector restyle slow
  const svg = pixelSvg(MULE_ART, portraitPalette(MULASSA), '#2a1a10'), colours = new Set(MULE_ART.join('').replace(/\./g, '')).size;
  assert(!svg.includes('<rect') && (svg.match(/<path/g) || []).length <= colours + 1, 'at most one path per colour plus the rim');
  const lit = MULE_ART.join('').replace(/\./g, '').length;
  assert.equal((svg.match(/h1\.02v1\.02h-1\.02z/g) || []).length > lit, true, 'every lit pixel and its rim are drawn');
}
assert.equal(portraitArt(DRAC), DRAC_ART, 'original Drac portrait is retained');
assert(TOWNS.every(t => !('color' in t)), 'a town\'s colour is its accent in select-cards.css (--town), never a bare catalogue value');
const memory = new Map(), store = { get: k => memory.get(k) ?? null, set: (k, v) => memory.set(k, v) };
assert.equal(rememberedLevel(store, MULASSA.id), 1);
rememberLevel(store, MULASSA.id, 2); assert.equal(rememberedLevel(store, MULASSA.id), 2);
assert.equal(rememberedLevel(store, 'another'), 1, 'memory belongs to the figure');
for (const value of ['-1', '3', 'NaN', '1.5', '']) { memory.set('level-mulassa-valls', value); assert.equal(rememberedLevel(store, MULASSA.id), 1); }
assert.equal(recordKey(MULASSA, 2), 'record-points-mulassa-v3-2', 'each Mulassa score version has its own record namespace');
assert.equal(sourceCatalog.figures.find(f => f.id === 'nans-valls').music, 'Francesc Sans', 'pending Valls figures credit their own music');
const pendingName = id => sourceCatalog.figures.find(f => f.id === id);
for (const [id, verb] of [['gegants-ciutat-valls', 'surtin'], ['nans-valls', 'surtin'], ['mulassa-solsona', 'surtin'], ['aliga-solsona', 'surtin'], ['boja-vilanova', 'surti'], ['drac-vilanova', 'surti'], ['guites-berga', 'surtin'],
  ['os-trabucaires-valls', 'surti'], ['diables-valls', 'surti'], ['cavallets-valls', 'surti'], ['gegants-mulassa-reus', 'surti'], ['gegants-bojos-solsona', 'surtin'], ['basilisc-valls', 'surti'], ['aliga-valls', 'surti'], ['cucafera-tarragona', 'surti']]) {
  assert.match(aviatText(pendingName(id)), new RegExp(`^Volem que ${verb} a la plaça`), `${id}: the verb agrees with its name`);
}
assert.equal(aviatText(pendingName('aliga-valls')).split('\n\n').length, 2, 'pending cards: how to help, then the open code');

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
for (const id of ['free', 'viewmode', 'feedback', 'music', 'settings', 'select-carousel', 'select-prev', 'select-forward', 'select-nav', 'select', 'select-towns', 'select-strip', 'select-level', 'select-song', 'select-entity', 'select-act', 'select-name', 'select-song-name', 'select-song-credit', 'select-play', 'select-next', 'select-next-label', 'select-figures-back', 'select-board', 'select-howto', 'aviat-write', 'aviat-text', 'select-info', 'select-bottom', 'select-pos', 'select-tiles', 'select-rank-tile', 'select-pending', 'aviat-entity', 'aviat-icon', 'aviat-title', 'select-level-stats', 'select-level-title', 'select-level-sub']) nodes.set(id, new Node(id));
// The level row's title reports an overflow while it carries what a narrow screen can't hold (the points).
Object.defineProperties(nodes.get('select-level-title'), { clientWidth: { value: 200 }, scrollWidth: { get() { return narrow && /punts/.test(this.textContent) ? 999 : 100; } },
  textContent: { get() { return (this.html ?? '').replace(/<[^>]*>/g, ''); }, set(v) { this.html = v; } } }); // its level word is a coloured span
// the no-record subtitle overflows a 308–324 px column (while shown)
Object.defineProperties(nodes.get('select-level-sub'), { clientWidth: { value: 200 }, scrollWidth: { get() { return narrowSub && !this.hidden && /primer ball/.test(this.html) ? 999 : 100; } } });
let narrow = false, narrowSub = false;
const $ = id => nodes.get(id), win = { innerWidth: 393, innerHeight: 852, addEventListener(k, f) { (handlers[k] ||= []).push(f); } };
let boards = [], sounds = [], played = [], how = 0, drafts = [], busy = false, selected = [];
let standingOf = async f => (f === DRAC.id ? { pos: 3, total: 12 } : { pos: 7, total: 1350 });
const api = setupSelect({ doc, win, store, keyboard: () => true, reduced: () => true, busy: () => busy,
  sfx: k => sounds.push(k), firstLevel: 0, standing: f => standingOf(f), onBoard: f => boards.push(f.id), ranked: true, demo: true, // ?demo stays off outside a dev build
  onPlay: (d, f) => played.push([d, f.id]), onSelect: f => selected.push(f.id), onHowto: () => how++, onWrite: draft => drafts.push(draft) });
const key = (key, options = {}) => { const e = { key, ...options, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const f of handlers.keydown) f(e); return e; };
const click = (root, target = root) => root.fire('click', { target });
api.visible(true); await Promise.resolve();
assert.match($('select-entity').innerHTML, /<svg.*<span>Unió Anelles de la Flama<\/span>/, 'UAF badge uses its flame and full name');
assert.equal($('select-song-credit').textContent, 'Francesc Bofarull i Figuerola · 1987');
assert.equal($('select-level').children[0].attrs['aria-pressed'], 'true', 'challenge overrides remembered level once');
const SEASON = / · (Hivern|Primavera|Estiu|Tardor) \d{4}$/;
assert.match($('select-pos').textContent, /^Posició 7 de 1\.350 · /, 'the real board, not the ?demo position'); assert.match($('select-pos').textContent, SEASON, 'the open season after the place'); const lv = () => $('select-level').children;
assert(!/12\.340|8\.120/.test([...lv()].map(b => b.html).join('')), 'nor its made-up records');
assert([...lv()].every((b, i) => b.html === ['FÀCIL', 'NORMAL', 'DIFÍCIL'][i] && !/rècord/.test(b.attrs['aria-label'])), 'no record: the name alone, no dash or empty line');
assert.equal($('select-rank-tile').attrs['aria-label'], `Classificació: ${$('select-pos').textContent}`);
click($('select-rank-tile')); assert.deepEqual(boards, [MULASSA.id], 'the line opens Classificacions on the selected figure');
assert(!readFileSync(new URL('../../../index.html', import.meta.url), 'utf8').includes('select-first'), 'the leader lives in Classificacions only');
assert(!$('select-rank-tile').hidden, 'a position from the board is shown');
assert.equal($('select-rank-tile').attrs['data-loading'], false, 'the answered line is no placeholder bar');
assert($('select-act').hidden, 'difficulty is a second step');
click($('select-play')); assert.equal(played.length, 0, 'cannot skip the difficulty step');
click($('select-next')); assert(!$('select-act').hidden && $('select-strip').hidden);
assert(!$('select-level-stats').hidden, 'step 2 shows the chosen level\'s row');
assert.equal($('select-level-title').html, 'Encara no tens rècord a <span class="lvt0">FÀCIL</span>', 'the level word in its colour');
assert.equal($('select-level-sub').html, 'El primer ball que acabis serà el teu rècord', 'no record: what makes one (whose record, and why none)');
assert(!$('select-level-sub').hidden);
assert.equal($('select-level-stats').attrs['aria-label'], 'Encara no tens rècord a FÀCIL, El primer ball que acabis serà el teu rècord');
narrowSub = true; click($('select-level'), $('select-level').children[1]); click($('select-level'), $('select-level').children[0]);
assert(!$('select-level-stats').hidden && $('select-level-sub').hidden, 'a narrow column drops the subtitle, never the row');
assert.equal($('select-level-title').textContent, 'Encara no tens rècord a FÀCIL', 'the full title first, without its subtitle');
narrowSub = false;
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
{ // ‹ › select like ← → (the fold too); the wheel only browses; availability follows the selection, never the scroll position
  const strip = $('select-strip'), resize = () => handlers.resize.forEach(f => f()), more = cards.find(c => c.dataset.more);
  strip.clientWidth = 100; resize();
  assert($('select-prev').disabled && !$('select-forward').disabled, 'the first figure has nothing before it');
  const sound = sounds.length;
  click($('select-forward'));
  assert(api.figure === DRAC && cards[1].attrs['aria-selected'] === 'true', 'the mouse arrow selects the next figure');
  assert.equal(strip.scrollLeft, 87, 'and centres it');
  assert.equal(sounds.length, sound + 1, 'with one menu sound');
  assert(!$('select-prev').disabled, 'Drac always has Mulassa before it, whatever the scroll');
  busy = true; click($('select-prev')); assert.equal(api.figure, DRAC, 'sheets guard the arrows'); busy = false;
  const bou = cards.find(c => c.dataset.id === 'bou-tradicional-valls');
  if (!UNRELEASED_IDS.has('bou-tradicional-valls')) {
    assert.equal(cards.indexOf(bou), 2, 'the Bou stands beside the Drac, before the fold');
    assert(!bou.cls.includes('aviat') && !bou.cls.includes('later'), 'playable, never folded away');
    // the arrows walk Drac → Bou → fold and back (from Drac, back at Drac)
    click($('select-forward'));
    assert(api.figure.id === 'bou-tradicional-valls' && bou.attrs['aria-selected'] === 'true' && $('select-pending').hidden, 'the arrow reaches the Bou, with its own info (no pending card)');
    click($('select-forward'));
    assert(more.attrs['aria-selected'] === 'true' && bou.attrs['aria-selected'] === 'false', 'the fold is the one selection, no figure marked underneath');
    assert(!api.unfolded && !$('select-pending').hidden && $('aviat-title').textContent === 'Aviat a la plaça', 'it shows its own card without unfolding');
    assert.equal(sounds.length, sound + 3, 'reaching the fold sounds too');
    assert($('select-forward').disabled, 'folded, the fold is the last stop');
    click($('select-prev')); assert(bou.attrs['aria-selected'] === 'true' && more.attrs['aria-selected'] === 'false');
    click($('select-prev')); assert(api.figure === DRAC && cards[1].attrs['aria-selected'] === 'true');
  } else assert(bou.cls.includes('aviat'), 'until its release the Bou is a pending card');
  click($('select-prev')); assert(api.figure === MULASSA && $('select-prev').disabled);
  let prevented = false;
  strip.fire('wheel', { deltaY: 100, deltaX: 0, deltaMode: 0, preventDefault() { prevented = true; } });
  assert(prevented && strip.scrollLeft === 100 && api.figure === MULASSA, 'the wheel browses without selecting');
  assert($('select-prev').disabled, 'scrolling never enables the arrow before the first figure');
  click($('select-forward')); assert.equal(api.figure, DRAC, 'the next arrow goes on from the selection, not from what the wheel shows');
  strip.scrollLeft = 900; click($('select-next')); click($('select-figures-back'));
  assert.equal(strip.scrollLeft, 87, 'back from difficulty, the selected figure is centred again');
  strip.scrollLeft = 900; resize(); assert.equal(strip.scrollLeft, 87, 'and after a resize');
  click($('select-prev'));
  strip.clientWidth = 393; strip.scrollLeft = 0; resize();
  assert($('select-prev').disabled && $('select-forward').disabled, 'fitting cards have no arrows');
}

const cardMarkup = id => $('select-strip').innerHTML.match(new RegExp(`<button[^>]*data-id="${id}"[^]*?</button>`))[0];
assert.match(cardMarkup('mulassa-valls'), /aria-label="Mulassa, Unió Anelles de la Flama, Valls/);
assert.match(cardMarkup('aliga-valls'), /aria-label="Àliga, Ajuntament de Valls \+ Unió Anelles de la Flama, Valls/);
{ // pending cards wear a hand-drawn vector silhouette, the Bou its colour drawing; the traced one is the fallback for new figures
  assert.deepEqual(Object.keys(DRAWN_SILHOUETTES).sort(), cards.filter(c => c.cls.includes('aviat') && !['bou-tradicional-valls', INVITE.id, 'selector-fixture'].includes(c.dataset.id)).map(c => c.dataset.id).sort(), 'every pending card is hand-drawn (the Bou and the invitation have their own)');
  const art = id => cardMarkup(id).match(/<span class="por">([^]*?)<\/span>/)[1];
  for (const c of cards.filter(c => c.cls.includes('aviat') && c.dataset.id !== 'bou-tradicional-valls' && c.dataset.id !== INVITE.id)) {
    if (art(c.dataset.id).startsWith('<img')) { assert.equal(c.dataset.id, 'selector-fixture', 'only a figure with a photo keeps it'); continue; }
    const grid = portraitArt({ id: c.dataset.id }), svg = art(c.dataset.id);
    assert.match(svg, new RegExp(`^<svg viewBox="0 0 ${grid[0].length + 2} ${grid.length + 2}"`), `${c.dataset.id}: same box as its pixel portrait, so the same size`);
    assert(!svg.includes('crispEdges') && svg.includes('#120b07'), `${c.dataset.id}: ink silhouette, no pixel cells`);
    assert.match(svg, /stroke-width="2"[^]*?vector-effect="non-scaling-stroke"/, `${c.dataset.id}: the halo is a fixed 2 px line, not a share of a cell`);
    if (DRAWN_SILHOUETTES[c.dataset.id]) assert.equal(svg, DRAWN_SILHOUETTES[c.dataset.id], `${c.dataset.id}: its hand-drawn silhouette`);
    else assert.match(svg, /<path d="M[^"]+Z" fill="#120b07" stroke="#f5e3b8"/, `${c.dataset.id}: one traced ink path with its halo`);
  }
  if (UNRELEASED_IDS.has('bou-tradicional-valls')) assert.doesNotMatch(art('bou-tradicional-valls'), /sel-bou-illustration/, 'until its release the Bou is a silhouette like the other pending figures');
  else assert.match(art('bou-tradicional-valls'), /class="sel-bou-illustration" aria-hidden="true"/, 'the Bou wears its colour illustration');
  assert.doesNotMatch(art('bou-tradicional-valls'), /\sid="/, 'no ids in the Bou: a card and the figure picker may show it at once');
  assert.match(art(INVITE.id), /class="sel-invite-illustration" aria-hidden="true"/, 'the invitation uses its selected vector illustration');
  assert.match(art(INVITE.id), /#a3182f/, 'the invitation retains its red standard instead of a silhouette');
  for (const id of ['mulassa-valls', 'drac-valls', 'bou-tradicional-valls', INVITE.id].filter(id => !UNRELEASED_IDS.has(id))) assert.doesNotMatch(art(id), /#120b07" stroke="#f5e3b8/, `${id} keeps its colour illustration`);
  for (const [id, { art: grid }] of Object.entries(FIGURE_PORTRAITS)) { // the traced outline encloses exactly the drawn cells (shoelace area)
    const area = cellOutline(grid).reduce((s, l) => s + l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2, 0);
    assert.equal(area, grid.join('').replace(/\./g, '').length, `${id}: the outline loses or adds no cell`);
  }
}
for (const [id, count] of [['mulassa-valls', 1], ['aliga-valls', 2]]) {
  const icons = cardMarkup(id).match(/<small class="sel-entity-icons" aria-hidden="true">([^]*?)<\/small>/)[1];
  assert.match(icons, /UAF<\/span>/);
  if (count === 2) assert.match(icons, /Ajuntament<\/span>/);
  assert.equal((icons.match(/<svg/g) || []).length, count, `${id}: entity icons accompany the card caption`);
}
const live = FIGURES.filter(upFront), soon = FIGURES.filter(f => !upFront(f));
const more = cards.find(c => c.dataset.more), later = cards.filter(c => c.cls.includes('later'));
assert(!cards.some(c => ['diables-valls', 'nans-valls'].includes(c.dataset.id)), 'Diables and Nans have no card for clicks, keyboard navigation or town selection');
assert.deepEqual(cards.slice(0, live.length).map(c => c.dataset.id), live.map(f => f.id), 'the playable figures (and the Bou, up front) come first');
assert.equal(cards[live.length], more, 'then the fold');
assert.deepEqual(later.map(c => c.dataset.id), [...soon, INVITE].map(f => f.id), 'then everything still to come, and the invitation last');
const foldMarkup = $('select-strip').innerHTML.match(/<button[^>]*data-more="1"[^]*?<\/button>/)[0];
assert.match(foldMarkup, /aria-label="Pròximament"/, 'the fold keeps its accessible name');
assert.match(foldMarkup, /<path class="open"[^]*?<path class="close"/, 'the fold keeps both directional chevrons');
assert(!/class="(?:escut|sel-fan)"/.test(foldMarkup), 'the strip fold has no decorative town arms');
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
// The logo holds the left end (not focusable); the towns come first, then the three corner buttons on the right
// (free play's gamepad first: the eye is no corner control on the selector).
const headerSounds = sounds.length;
pills[0].focus(); key('ArrowRight');
assert.equal(doc.activeElement, soonPill);
key('ArrowRight'); assert.equal(doc.activeElement, $('free'), 'Right leaves the towns for the corner buttons (free play first, as drawn)');
key('ArrowRight'); key('ArrowRight'); assert.equal(doc.activeElement, $('settings'), 'Settings is reachable without leaving the visible row');
assert.equal(sounds.length, headerSounds + 4, 'each header focus move plays exactly one menu sound');
key('ArrowRight'); assert.equal(sounds.length, headerSounds + 4, 'no sound at the header boundary');
key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); assert.equal(doc.activeElement, soonPill, 'Left returns from the corner to the towns');
key('ArrowLeft'); assert.equal(doc.activeElement, pills[0]);
key('ArrowLeft'); assert.equal(doc.activeElement, pills[0], 'Valls is the header\'s left end');
$('select').toggleAttribute('data-header-inline', false);
$('music').focus(); key('ArrowRight'); assert.equal(doc.activeElement, $('settings'), 'on separate rows the corner controls stay together');
soonPill.focus(); key('ArrowRight'); assert.equal(doc.activeElement, soonPill, 'folded towns stay out of the separate row');
const rowSounds = sounds.length;
pills[0].focus(); key('ArrowUp');
assert.equal(doc.activeElement, $('free'));
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
const LAST = FIGURES.filter(playable).at(-1); // the figure beside the fold: the Bou once released, else the Drac
if (LAST !== DRAC) {
  key('ArrowRight');
  assert(api.figure === LAST && doc.activeElement === cards[2], 'Right goes on to the Bou, beside the Drac');
}
const foldSounds = sounds.length;
key('ArrowRight');
assert.equal(sounds.length, foldSounds + 1, 'focusing the fold plays one sound without changing figure');
assert(doc.activeElement === more && api.figure === LAST && !api.unfolded, 'arrows reach the fold without unfolding it or changing the figure');
// the cursor on the fold shows the fold's own card: what is coming, no difficulty, the dock where it was
assert(!$('select-pending').hidden && $('select-info').hidden && $('select-pending').attrs['data-fold'], 'the fold has its own card');
assert.equal($('aviat-title').textContent, 'Aviat a la plaça');
assert.equal($('select-next-label').textContent, 'Pròximament?', 'the fold has the disabled pending label');
assert($('aviat-entity').hidden, 'the teaser has no count pill');
assert.equal($('aviat-entity').innerHTML, '');
{ // what anyone can send, each in its own gradient, read out as a list
  const html = $('aviat-icon').innerHTML;
  assert.deepEqual([...html.matchAll(/<\/svg>([^<]+)<\/li>/g)].map(m => m[1]), ['Fotos', 'Vídeos', 'Partitures', 'El ball']);
  const stops = [...html.matchAll(/<linearGradient id="(gift-[a-z]+)"[^>]*><stop offset="0" stop-color="(#[0-9a-f]+)"/g)];
  assert.equal(new Set(stops.map(m => m[1])).size, 4, 'one gradient id per icon');
  assert.equal(new Set(stops.map(m => m[2])).size, 4, 'four different colours');
  assert.match(html, /^<ul class="sel-gifts" aria-label="Què ens pots enviar">/, 'a labelled list');
  assert.match(readFileSync(new URL('../../../index.html', import.meta.url), 'utf8'), /<span id="aviat-icon" class="sel-pending-icon"><\/span>/, 'the slot is not hidden from screen readers');
}
assert($('select-next').disabled && $('select').attrs['data-fold'], 'its action hides; desktop reserves its row and touch reclaims it (select.css)');
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
assert.equal($('aviat-title').textContent, soon[0].fullName || soon[0].name); assert($('aviat-icon').hidden && !$('aviat-icon').innerHTML, 'no portrait in the panel: the strip shows it');
assert.equal(soon[0].id, UNRELEASED_IDS.has('bou-tradicional-valls') ? 'bou-tradicional-valls' : 'os-trabucaires-valls', 'the agreed order: (the Bou, until its release) Ós, Cavallets, Basilisc, Àliga, Gegants'); assert.match($('aviat-entity').innerHTML, /viewBox="0 0 525 829".*Unió Anelles de la Flama/, 'a pending figure shows its entity\'s mark, as its card does'); assert.doesNotMatch($('aviat-entity').innerHTML, /class="escut"/);
assert(!$('aviat-entity').hidden, 'a pending figure restores its entity after the teaser');
assert.equal(($('aviat-text').innerHTML.match(/<p>/g) || []).length, 2); assert.match($('aviat-text').innerHTML, /Volem que surti a la plaça/);
assert($('select-next').disabled && !$('select-next').hidden, 'pending keeps a disabled action for the desktop placeholder');
assert.equal($('select-next-label').textContent, 'Pròximament?');
assert($('select').attrs['data-pending'], 'pending selection hides the action');
assert.equal($('select-name').textContent, LAST.fullName || LAST.name, 'the playable panel fades out as it was');
assert.equal(selected.at(-1), LAST.id, 'nor does it change the song or the model');
click($('select-next')); key('Enter'); assert($('select-act').hidden, 'it cannot be played');
click($('aviat-write')); assert.deepEqual(drafts, [aviatDraft(soon[0], townOf(soon[0]).name)]);
click($('select-strip'), more); assert(!api.unfolded && later.every(c => c.hidden), 'the banner folds it back');
assert.equal(api.figure, LAST, 'a hidden figure falls back to the last playable one (beside the fold)');
assert.equal($('select-next-label').textContent, 'Tria la dificultat', 'returning to a playable figure restores its action label');
assert($('select-pending').hidden && !$('select').attrs['data-fold'], 'closing never replaces the outgoing figure with the teaser');
click($('select-strip'), cards[1]); assert($('select-pending').hidden && !$('select-info').hidden && !$('select-next').disabled, 'leaving the fold brings the figure back');
click($('select-next')); click($('select-figures-back'));
const tarragona = pills.find(p => p.dataset.town === 'tarragona');
click($('select-towns'), soonPill); assert(api.unfolded && !tarragona.hidden, 'the pill unfolds too');
click($('select-towns'), soonPill); assert(!api.unfolded && tarragona.hidden, 'and folds');
click($('select-towns'), soonPill); click($('select-towns'), tarragona);
assert.equal(api.figure, soon.find(f => f.town === 'tarragona'), 'a town pill goes to its first figure');
assert.equal(tarragona.attrs['aria-pressed'], 'true');
{ // One town, two pending identities: pill -> first card -> keyboard -> second card -> pointer -> first.
  const vilanova = pills.find(p => p.dataset.town === 'vilanova');
  const notified = selected.length, runs = played.length;
  click($('select-towns'), vilanova);
  assert.equal(api.figure.id, 'boja-vilanova');
  cards.find(c => c.dataset.id === 'boja-vilanova').focus();
  key('ArrowRight');
  assert.equal(api.figure.id, 'drac-vilanova');
  assert.equal($('aviat-title').textContent, 'Drac de Vilanova i la Geltrú');
  assert.match($('aviat-entity').innerHTML, /Ajuntament de Vilanova i la Geltrú.*La Unió Vilanovina/);
  assert.equal(($('aviat-entity').innerHTML.match(/class="sel-entity-part"/g) || []).length, 2, 'Vilanova uses the same two attribution labels as Valls');
  assert.match($('aviat-entity').innerHTML, /class="sel-entity-unit"><span class="sel-entity-plus"> \+ <\/span><span class="sel-entity-part">/, 'the separator stays with the manager when the labels wrap');
  assert.equal(vilanova.attrs['aria-pressed'], 'true');
  key('Enter'); click($('select-next'));
  assert($('select-act').hidden && $('select-info').hidden && !$('select-pending').hidden, 'no game, levels or records for Vilanova');
  const vilanovaBoja = api.figure;
  click($('aviat-write')); assert.equal(drafts.at(-1), aviatDraft(vilanovaBoja, 'Vilanova i la Geltrú'), 'the collaboration draft names the figure and the shared town');
  click($('select-strip'), cards.find(c => c.dataset.id === 'boja-vilanova'));
  assert.equal(api.figure.id, 'boja-vilanova');
  assert.equal($('aviat-title').textContent, 'Mulassa La Boja de Vilanova i la Geltrú');
  assert.equal(selected.length, notified, 'neither pending identity changes the active song/model');
  assert.equal(played.length, runs, 'no pending run can start');
  click($('select-towns'), tarragona);
}

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
  assert.match($('aviat-text').innerHTML.split('</p>')[0], /envia’ns fotos, vídeos o la música del ball/, 'the material request stays in the always-visible paragraph on compact screens');
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
assert.equal(lv()[0].attrs['aria-pressed'], 'true', 'later visits restore the figure level');
click($('select-next'));
assert(lv()[0].attrs['aria-pressed'] === 'true' && $('select-level').attrs['data-quiet'], 'step 2 opens on the remembered level, marked but quiet: no shake before a tap');
doc.activeElement = doc.body; api.refocus();
assert.equal(doc.activeElement, lv()[0], 'returning from photo mode focuses the visible level, not the hidden card strip');
for (const handler of handlers.keydown) handler({ key: 'Escape', defaultPrevented: true, preventDefault() {} });
assert(!$('select-act').hidden, 'Escape consumed by photo mode must not also leave the difficulty step');
click($('select-level'), lv()[0]); assert(!$('select-level').attrs['data-quiet'] && lv()[0].attrs['aria-pressed'] === 'true', 'a tap, even on the marked level, brings its shake');
click($('select-figures-back')); click($('select-next')); assert($('select-level').attrs['data-quiet'], 'showing step 2 again restarts it quiet');
api.show(DRAC.id); // an empty board's «Juga amb el Drac» (board-list.js): step 1, that figure selected and notified
assert(api.figure === DRAC && selected.at(-1) === DRAC.id && $('select-act').hidden && !$('select-strip').hidden, 'show(): the Drac on the cards, step 1');
api.show(MULASSA.id); click($('select-next'));
click($('select-figures-back'));
rememberLevel(store, DRAC.id, 2);
store.set(recordKey(DRAC, 2), JSON.stringify({ quality: 88, score: 1234 })); store.set(recordKey(DRAC, 0), JSON.stringify({ quality: 99 })); // a record from before `score` counts as none
click($('select-strip'), cards[1]);
assert.equal(api.figure, DRAC); assert.equal(selected.at(-1), DRAC.id, 'selection notifies the stage host');
assert.equal(lv()[2].attrs['aria-pressed'], 'true', 'each figure restores its own difficulty');
assert.equal(lv()[2].html.replace(/<svg[^]*<\/svg>/, '★'), 'DIFÍCIL<span class="sub">★1.234</span>', 'step 2: the best score under its level, with a trophy');
assert.equal(lv()[2].attrs['aria-label'], 'DIFÍCIL, el teu rècord 1.234 punts');
assert(lv()[0].html === 'FÀCIL' && lv()[1].html === 'NORMAL', 'no score, or no record: the name alone, beside a level that has one');
await Promise.resolve();
assert(!$('select-rank-tile').hidden && /^Posició 3 de 12 · /.test($('select-pos').textContent), 'the Drac: its place on its own board (never the Mulassa\'s)');
click($('select-rank-tile')); assert.equal(boards.at(-1), DRAC.id, 'and its line opens the Drac\'s board');
cards[1].focus();
key('Enter'); assert(!$('select-act').hidden, 'Enter confirms the figure before playing');
assert.equal(lv()[2].attrs['aria-pressed'], 'true', 'its remembered DIFÍCIL is marked');
assert(!$('select-level-sub').hidden, 'a record restores its stars and percentage');
assert.equal($('select-level-title').textContent, 'El teu rècord a DIFÍCIL: 1.234 punts', 'the record\'s points head the row, saying what they are');
assert.equal($('select-level-sub').html.replace(/<span class="stars">([^]*?)<\/span>/, (_, s) => '★'.repeat((s.match(/class="on"/g) || []).length)), '★★★88% d’encerts', 'stars and % of that record');
assert.equal($('select-level-stats').attrs['aria-label'], 'El teu rècord a DIFÍCIL: 1.234 punts, 3 de 3 estrelles, 88% d’encerts');
narrow = true; key('ArrowLeft'); key('ArrowRight');
assert.equal($('select-level-title').textContent, 'El teu rècord a DIFÍCIL', 'too narrow: the points go, never a second line');
narrow = false;
Object.assign($('select-info'), { scrollHeight: 500, clientHeight: 400 }); key('ArrowLeft'); key('ArrowRight');
assert($('select-level-stats').hidden, 'an info block that would scroll drops the row');
Object.assign($('select-info'), { scrollHeight: 0, clientHeight: 0 });
key('ArrowLeft'); assert.equal($('select-level').children[1].attrs['aria-pressed'], 'true');
key('ArrowRight'); key('Escape'); assert($('select-act').hidden, 'Escape leaves difficulty without a run');
click($('select-next'));
assert.equal($('select-act').inert, false, 'the difficulty step accepts input');
click($('select-play')); assert.deepEqual(played.at(-1), [2, DRAC.id], 'play receives the selected figure and level');
click($('select-strip'), cards[0]); await Promise.resolve();
assert(!$('select-rank-tile').hidden);
assert.match($('select-pos').textContent, /^Posició 7 de 1\.350 · /, 'returning to Mulassa refreshes its own board');
{ // the last place shown again while the board is asked belongs to one profile: a sign-out (here or in another tab: refreshIdentity
  // drops the identity, the name and tag stay for the next publication) never shows that profile's place again
  const identity = 'leaderboard-alias:identity', answer = standingOf, swap = async () => { click($('select-strip'), cards[1]); click($('select-strip'), cards[0]); await Promise.resolve(); };
  memory.set('leaderboard-alias', 'Jo'); memory.set('leaderboard-tag', '7'); memory.set(identity, JSON.stringify({ prof: { alias: 'Jo', tag: 7 } }));
  standingOf = async f => (f === DRAC.id ? null : { pos: 2, total: 1350 }); // Jo's own place
  await swap(); assert.match($('select-pos').textContent, /^Posició 2 de 1\.350 · /);
  standingOf = () => new Promise(() => {}); // the board has not answered yet
  await swap(); assert.match($('select-pos').textContent, /^Posició 2 de 1\.350 · /, 'the same profile: its last place stays meanwhile (nothing moves)');
  memory.delete(identity);
  await swap(); assert(!/^Posició 2 /.test($('select-pos').textContent), 'signed out: never the previous profile\'s place');
  standingOf = answer; await swap(); }
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
assert(!html.includes('id="select-free"') && /<button id="free" class="round-btn"[^>]*aria-label="Ball lliure"/.test(html), 'free play is the corner gamepad «Ball lliure», not a dock button');
assert.match(html, /<section id="select-pending"/); assert(!html.includes('id="soon-menu"'), 'no sheet: it unfolds in place');
assert.match(html, /href="mailto:holi@mulassa.cat"/);
assert(html.indexOf('id="select-name"') < html.indexOf('id="select-howto"') && html.indexOf('id="select-howto"') < html.indexOf('id="select-rank-tile"'), 'the ? sits by the name');
assert.match(html, /id="select-howto"[^>]*aria-label="Com es juga"[^>]*><span aria-hidden="true">\?<\/span><\/button>/);
assert.match(html, /<button id="select-rank-tile" type="button" class="sel-tile sel-rank" aria-haspopup="dialog" hidden><svg[^]*<span id="select-pos"[^>]*>Classificació<\/span><svg class="chev"/, 'the ranking line: a real button with the board icon and a chevron, «Classificació» from the first frame');
FIGURES.splice(FIGURES.indexOf(catalogFixture), 1);
const ui = ['select-ui', 'select-fold', 'select-keys', 'select-layout'].map(f => readFileSync(new URL(`../../../src/ui/${f}.js`, import.meta.url), 'utf8')).join('\n'); // the selector's code
const strip = readFileSync(new URL('../../../src/ui/select-strip.js', import.meta.url), 'utf8'); // the cards' HTML
assert.match(strip, /f\.thumbnail/); assert.match(strip, /<img src=/);
assert(!/showModal|aviat\.close|aviat-menu|aviat-close/.test(ui));
{ // every town carries its arms in the pills, each copy with its own clip id
  for (const t of TOWNS) assert.match(escutSvg(t.id), /^<svg class="escut"[^>]*aria-hidden="true"/, `${t.name}: escut`);
  const ids = TOWNS.flatMap(t => [escutSvg(t.id), escutSvg(t.id)]).map(svg => svg.match(/clipPath id="([^"]+)"/)[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(escutSvg('nowhere'), '');
  assert.match(strip, /escutSvg\(t\.id\) \|\|/); assert.match(strip, /aria-hidden="true"><span>\$\{\(t\.short/, 'banners carry the name only');
  // One accent per town: its banner's cloth and its cards'/avatars' tint at one fixed lightness (the owner chose the game's
  // own palette, 2026-10-19). The accents are the banners' agreed colours.
  const css = selectCss();
  const accent = { valls: '#c8202f', solsona: '#c0283c', tarragona: '#7d5aa8', reus: '#8f6340', vilanova: '#d9a521', barcelona: '#c8202f', berga: '#1f3f7a', olot: '#8e2a5c', vilafranca: '#00b09a', lleida: '#7e2236', terrassa: '#8d68c0', manresa: '#3f6fc0', montblanc: '#b03a48' };
  assert.deepEqual(Object.keys(accent).sort(), TOWNS.map(t => t.id).sort(), 'every town has an accent');
  for (const [town, colour] of Object.entries(accent)) {
    assert(css.includes(`:is(.sel-banner, .sel-card, #photo-figs .pf)[data-town="${town}"] { --town: ${colour}; }`), `${town}: banner, cards and avatars share ${colour}`);
  }
  assert.match(css, /\.sel-banner \{[^}]*background: linear-gradient\(var\(--town\), var\(--town\)\)/, 'the banner cloth is the accent');
  assert.match(css, /--t: oklch\(from var\(--town\) \.42 min\(c, \.1\) h\)/, 'cards: the accent at one lightness, chroma capped');
  assert.match(css, /\[data-town\]:not\(\[data-town="el-teu-poble"\]\) \{ --t: color-mix\(in srgb, var\(--town\) /, 'a fallback without relative colours');
  assert.match(css, /\.sel-card \{[^}]*background: linear-gradient\(var\(--t\), /, 'the card top is the toned accent');
  assert(css.includes('.sel-banner[data-town="valls"] { background: linear-gradient(90deg, #fff 0 calc(100% / 6), #c8202f 0 calc(500% / 6), #fff 0)'), 'Valls: wide red centre with thin white vertical edges, as requested');
  assert.match(css, /\.sel-banner\[data-town="el-teu-poble"\] \{ background: repeating-linear-gradient\(90deg, #fcdd09 0 calc\(100% \/ 9\), #da121a 0 calc\(200% \/ 9\)\)/, 'the invitation keeps its nine-bar senyera');
  assert(!css.includes(`[data-town="${INVITE_TOWN.id}"] { --town`), 'the invitation has no accent: the neutral tint');
  assert.match(strip, /sel-card[^`]*data-town="\$\{t\.id\}"/, 'cards carry their town');
  // one surface, no divider; each portrait (all vectors now) at its real relative size, never more than its box holds
  assert(!/\.sel-card \.por \{[^}]*border-bottom/.test(css), 'no line between portrait and caption');
  assert.match(css, /--ref: min\(var\(--reach\) \* 100cqh \/ 14, var\(--sky\) \* 100cqw \/ 18\)/, 'one reference cell: the biggest grid without its rim, at the panel\'s reach');
  const [, sky, reach] = css.match(/\.sel-card \.por \{ --sky: (\.\d+); --reach: ([\d.]+);/) ?? [];
  assert(sky < 1 && reach > sky && portraitStand(MULASSA) * reach < sky && sky / (portraitStand(MULASSA) * reach) >= 1.15, 'the tallest figures leave air above them; the rest grow, still clearly under the gegants');
  assert.match(css, /min\(var\(--s, 1\) \* 14 \* var\(--ref\) \/ \(var\(--gh\) - 2\), var\(--sky\) \* 100cqh \/ \(var\(--gh\) - 2\), var\(--sky\) \* 100cqw \/ \(var\(--gw\) - 2\)\)/, 'the cell at the figure\'s share, clamped to fit');
  assert(Math.max(...FIGURES.map(f => portraitArt(f)[0].length)) === 18 && Math.max(...FIGURES.map(f => portraitArt(f).length)) === 14, 'the reference divisors match the biggest portrait');
  assert.match(css, /width: calc\(var\(--gw\) \* var\(--cell\)\); height: calc\(var\(--gh\) \* var\(--cell\)\); margin: calc\(-1 \* var\(--cell\)\);/, 'the rim hangs outside the box: the drawing stands on the floor');
  assert.match(css, /--mula-cell: max\(2px, min\(\.8 \* 14 \* min\(var\(--reach\) \* 100cqh \/ 14, var\(--sky\) \* 100cqw \/ 18\) \/ 11\.02/, 'the Mulassa\'s body on the same reference, at her stand');
  assert.match(strip, /--gw:\$\{art\[0\]\.length \+ 2\};--gh:\$\{art\.length \+ 2\};--s:\$\{portraitStand\(f\)\}/, 'the svg grid, rim included, and its stand');
  for (const f of [...FIGURES, INVITE]) assert(STAND[f.id] > 0 && STAND[f.id] <= 1.2 && portraitStand(f) === STAND[f.id], `${f.id}: its own stand beside the gegants (?sizes output pastes over STAND)`);
  assert.deepEqual([clampStand(0), clampStand(0.734), clampStand(9)], [0.2, 0.73, 1.2], '?sizes keeps two decimals within its range');
  assert(portraitStand(FIGURES.find(f => f.id === 'gegants-ciutat-valls')) > portraitStand(MULASSA) && portraitStand(MULASSA) > portraitStand(FIGURES.find(f => f.id === 'cavallets-valls')), 'gegants > mulassa > cavallets');
  assert.match(css, /\.sel-card\.aviat::after \{ box-shadow: none; border: 1\.5px dashed/, 'pending: a dashed edge, not only a tone');
  assert(!/\.sel-card\[aria-selected="true"\] \{[^}]*transform/.test(css), 'the selected card is not lifted: every foot on one floor line');
  assert.match(css, /\.sel-card \.por \{[^}]*place-items: end center; padding: 5px 4px var\(--floor\);[^}]*at 50% calc\(100% - var\(--floor\)\)/, 'portraits stand on one tiled floor, their contact shadow under the soles');
}
assert.match(selectCss(), /@media \(pointer: coarse\) \{[^}]*\}\s*\.sel-carousel \.sel-arrow \{ display: none; \}/, 'touch screens swipe the strip: no arrows');
{ // Touch reclaims the action row; desktop keeps navigation fixed (verified in the browser).
  const css = selectCss();
  assert.match(css, /#select:is\(\[data-pending\], \[data-fold\]\) \{ --drop: var\(--drop-h\); \}/, 'a pending figure or the fold\'s card');
  assert(!/--keep-h/.test(css + ui), 'all pending identities share viewport sizing; no first-figure height snapshot');
  assert.match(css, /--drop-h: calc\(var\(--action-h\) \+ var\(--ga\)\)/, 'by exactly the action and its gap');
  assert.match(css, /\.sel-bottom \{[^}]*transform: translateY\(var\(--drop\)\); transition: transform \.32s/);
  assert.match(css, /height: min\(360px, var\(--pending-max\)\)/, 'the shared box fits the viewport band');
  assert.match(css, /grid-template-rows: minmax\(0, 1fr\) 48px calc\(44px \+ var\(--contact-gap\)\)/, 'the content distributes its free space above fixed accessible footer tracks');
  assert(!/transition:[^;}]*(?:max-height|height) \./.test(css), 'no height animation conceals layout shifts');
  assert(!/overflow-y: auto/.test(css.slice(css.indexOf('/* All pending identities'), css.indexOf('/* Narrow, short portrait windows:'))), 'the central card has no internal scroll');
  assert(!/pending\.style\.minHeight/.test(ui), 'no fixed min-height that would beat max-height');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ #select :is\(\.sel-pending, \.sel-info\) \{ transition: none; \} \}/);
  assert.match(css, /#select \.sel-card\.sel-more\[aria-selected="true"\]:not\(:focus-visible\)::before \{ border: 3px solid #fff3d6; \}/, 'selected, the fold wears the cream ring');
  assert(!/\[data-fold\] \.sel-card\[aria-selected/.test(css), 'no figure stays selected underneath the fold');
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
  const far = row.children.at(-1); far.getBoundingClientRect = () => ({ left: 5000, right: 5100, top: 100, bottom: 300 });
  click(row, dragon); click(row, toggle);
  assert(eagle.animation && !far.animation, 'unfolding fades only what is on or next to the screen (each fade is a compositor layer)');
  click(row, eagle);
  for (let i = 0; i < 120; i++) tick(1000 / 60);
  click(row, toggle);
  assert(!far.animation, 'folding never animates an off-screen item either');
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
  click(row, toggle); click(row, eagle); tick(500);
  click(row, toggle); tick(80); click($('select-next'));
  assert(!$('select-act').hidden, 'the committed playable figure can enter difficulty during folding');
  assert(eagle.hidden && eagle.inert && !$('select').hasAttribute('data-folding'), 'entering difficulty completes the outgoing catalog');
  click($('select-figures-back')); tick(500);
  assert(eagle.hidden && animated.figure === DRAC, 'returning from difficulty preserves the folded catalog and figure');
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
      const expected = id === DRAC.id ? DRAC : MULASSA; // folding from a pending card returns to the last playable one (Mulassa, just clicked)
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
  assert.equal(animated.figure, MULASSA, 'the last playable figure, never a fixed one');
  { // a far jump (a distant town) arrives within the capped time, and a hitch (the unfold's layout) never teleports it
    row.scrollWidth = 9000; row.scrollLeft = 0; tick(500);
    const pill = townRow.children.find(p => p.dataset.soon); click(townRow, pill);
    const far = townRow.children.find(p => p.dataset.town === 'tarragona'); click(townRow, far);
    const card = row.children.find(c => c.dataset.id === animated.figure.id), target = card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2;
    assert(target > row.clientWidth, 'the town is more than a screen away');
    tick(300); assert(row.scrollLeft > 0 && row.scrollLeft < target * 0.25, 'a stalled first frame still moves, never teleports');
    for (let i = 0; i < 27; i++) tick(1000 / 60);
    assert.equal(row.scrollLeft, target, 'and is there within the 450 ms cap (plus the stalled frame)');
    row.scrollWidth = 700;
  }
  { // Desktop folding starts the header's final journey with the exit, never in its completion callback.
    const root = $('select'), first = townRow.children[0], rest = townRow.children.filter(p => p.dataset.town && p !== first);
    const oldStyle = win.getComputedStyle, oldRect = first.getBoundingClientRect;
    win.matchMedia = () => ({ matches: true });
    win.getComputedStyle = () => ({ zoom: '1', gap: '7', paddingLeft: '16px', paddingRight: '16px', justifyContent: 'flex-start' });
    first.getBoundingClientRect = () => ({ left: rest.every(p => p.hidden) ? 468 : 16 - townRow.scrollLeft, top: rest.every(p => p.hidden) ? 22 : 84 });
    let layer;
    townRow.cloneNode = () => {
      layer = new Node(); layer.children = townRow.children.map(p => new Node('', p.cls, p.dataset));
      layer.remove = () => { layer.removed = true; }; return layer;
    };
    root.append = child => { assert.equal(child, layer); };
    const collapse = () => { click(row, toggle); return townRow.animation; };
    tick(500); townRow.scrollLeft = 0;
    const motion = collapse();
    assert(rest.every(p => p.hidden), 'the final town layout is committed before the first exit frame');
    assert.deepEqual(motion.keyframes.transform, ['translate(-452px, 62px)', 'translate(0, 0)']);
    assert.equal(motion.startTime, eagle.animation.startTime, 'header movement and card fade share their start time');
    assert.equal(motion.options.fill, 'backwards', 'keep the initial position while the document timeline catches up to the shared start');
    assert(layer.inert && layer.attrs['aria-hidden'] === 'true', 'outgoing artwork cannot receive focus or be announced');
    tick(240);
    assert.equal(townRow.animation, motion, 'completion must not queue a second header movement');
    assert(layer.removed, 'the exit artwork is removed on completion');
    click(row, toggle); tick(500); townRow.scrollLeft = 1400;
    const farMotion = collapse();
    assert.equal(layer.scrollLeft, 1400, 'outgoing artwork preserves the scrolled viewport');
    assert.equal(townRow.scrollLeft, 0, 'the live folded row has no leftover scroll');
    assert.equal(farMotion.keyframes.transform[0], 'translate(-1852px, 62px)', 'the painted position includes the old scroll exactly once');
    tick(80); const interrupted = layer; click(row, toggle);
    assert(interrupted.removed && interrupted.animation.cancelled, 'reopening disposes of the interrupted exit');
    tick(500); collapse();
    for (const f of handlers.resize) f();
    assert(layer.removed && townRow.animation.cancelled, 'resize settles the current layout without stale geometry');
    click(row, toggle); tick(500); collapse(); animated.visible(false);
    assert(layer.removed && townRow.animation.cancelled, 'leaving the selector clears the exit and movement');
    win.getComputedStyle = oldStyle; delete win.matchMedia; first.getBoundingClientRect = oldRect;
  }
}
console.log('pending fold: immediate selection, preserved outgoing content, shared exit and reopening ok');

// The open-code note gives way only when the card would scroll, and comes back when there is room again.
{
  const note = { hidden: false }; let room = 100;
  const card = { querySelector: () => note, get clientHeight() { return room; }, get scrollHeight() { return note.hidden ? 90 : 112; } };
  fitPendingNote(card); assert(note.hidden, 'a card that would scroll drops the note');
  room = 120; fitPendingNote(card); assert(!note.hidden, 'room again: the note is back');
  note.closest = () => ({ getBoundingClientRect: () => ({ bottom: 95 }) });
  note.getBoundingClientRect = () => ({ bottom: 112 });
  fitPendingNote(card); assert(note.hidden, 'fixed footer tracks still require the note to fit inside the content row');
  fitPendingNote({ querySelector: () => null }); // a card without a note (the invitation): nothing to do
  console.log('pending note: shown only when it fits ok');
}

// Literal oracle from git show HEAD:src/game/figures.js.
const wasPlural = figure => / i /.test(figure.name) || /^\S{3,}s(?=\s|$)/.test(figure.fullName || figure.name);
const oldAviatText = figure => `Volem que ${wasPlural(figure) ? 'surtin' : 'surti'} a la plaça. Tens fotos, vídeos, partitures o coneixes el ball? Dona’ns un cop de mà!\n\nEl joc és de codi obert: també pots ajudar a programar-lo a GitHub.`;

for (const figure of sourceCatalog.figures) assert.equal(aviatText(figure), oldAviatText(figure), figure.id);

assert.equal(aviatDraft({ name: 'Nans' }, 'Valls'), 'Sobre Nans (Valls): ');
assert.equal(aviatDraft({ name: 'Nans de Valls' }, 'Valls'), 'Sobre Nans de Valls: ', 'a name that says the town is not repeated');
assert.equal(aviatDraft({ name: 'A {town} <B>' }, 'Valls'), 'Sobre A {town} <B> (Valls): ', 'the name is opaque user data');
assert.equal(inviteText(), 'Tens una colla gegantera o de bestiari? Vols que el teu poble surti al joc? Explica’ns quina figura és i d’on és. Si en tens, envia’ns fotos, vídeos o la música del ball.\n\nEl joc és de codi obert: també pots ajudar a programar-lo a GitHub.');
assert.equal(INVITE_DRAFT, 'Proposo una figura. Poble i colla: ');
for (const figure of sourceCatalog.figures) assert.equal(aviatText({ ...figure, name: 'Noms canviats', fullName: 'Altres noms' }), oldAviatText(figure), 'grammar is keyed by ID, never inferred from names');
