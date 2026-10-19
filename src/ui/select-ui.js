// Main menu over the plaça: town pills, the playable figures, records, difficulty. What is still to come starts folded into
// one chevron fold and one «Pròximament» pill; either unfolds it in place (its cards, its towns' pills),
// the fold and an «Amaga» pill fold it back. A pending figure shows its own panel instead of the records.
// Arrows rove cards; Enter confirms a figure. On the next step arrows choose difficulty; Escape returns.
import { FIGURES, TOWNS, MULASSA, portraitArt, portraitPalette, portraitStand, townOf, playable, rememberedLevel, rememberLevel, readFigureRecord, aviatText, aviatDraft, INVITE, INVITE_TOWN, inviteText, INVITE_DRAFT } from '../game/figures.js';
import { DIFFS } from '../game/chart.js';
import { num } from './sheet-kit.js';
import { escutSvg, escutField } from './escuts.js';
import { PESSIGOLLA_MARK } from './pessigolla-logo.js';
import { GIFTS } from './pending-gifts.js';
import { stripScroll } from './strip-scroll.js';
import { fitPendingTitle, fitPendingNote } from './pending-title.js';
import { SELECTOR_PORTRAITS, pendingSilhouette } from './selector-portraits.js';

// pixel art as an SVG: each cell a square, the cells round the shape a dark rim
export function pixelSvg(art, palette, rim) {
  // One path per colour, not a rect per pixel: ~200 nodes a card made every selector restyle walk thousands of elements.
  const h = art.length, w = art[0].length, on = (x, y) => (art[y]?.[x] ?? '.') !== '.', paths = new Map([[rim, '']]);
  const cell = (fill, x, y) => paths.set(fill, (paths.get(fill) ?? '') + `M${x + 1} ${y + 1}h1.02v1.02h-1.02z`);
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) cell(rim, x, y);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) cell(palette[art[y][x]], x, y);
  return `<svg viewBox="0 0 ${w + 2} ${h + 2}" shape-rendering="crispEdges" aria-hidden="true">${[...paths].filter(([, d]) => d).map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')}</svg>`;
}
const pillHtml = t => `<button type="button" class="btn btn-secondary sel-pill" data-town="${t.id}" tabindex="0" aria-pressed="false"${t.color ? ` style="--c:${t.color}"` : ''}>${escutSvg(t.id) || '<i aria-hidden="true"></i>'}${t.name}</button>`;
const DEMO_BEST = [8120, 12340, null]; // ?demo: made-up best scores per level
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10V9a5 5 0 0 1-10 0zM7 5.5H3.5V7A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5V7a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8 20.5h8M9.5 17.5h5"/></svg>';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Reuse the UAF's flame already shown in the game's credits, in its original red.
const UAF_FLAME = `<svg viewBox="0 0 525 829" aria-hidden="true"><path transform="matrix(.1 0 0 -.1 0 829)" d="M1988 8232 c-19 -11 -28 -25 -28 -42 0 -115 -67 -432 -133 -625 -134 -399 -258 -618 -849 -1497 -464 -693 -665 -1089 -806 -1593 -139 -492 -170 -1065 -86 -1565 72 -427 274 -961 493 -1297 l60 -93 68 26 c113 42 257 105 270 117 10 10 2 30 -37 94 -240 398 -413 874 -481 1323 -53 343 -23 835 72 1215 129 511 317 871 875 1676 468 675 698 1121 824 1597 6 23 16 42 22 42 27 0 481 -356 713 -560 1248 -1092 1846 -2225 1846 -3500 0 -1498 -849 -2605 -2488 -3245 -68 -26 -123 -53 -123 -60 0 -21 237 -128 409 -184 l63 -21 97 41 c1183 504 1994 1352 2295 2400 239 834 182 1773 -159 2634 -428 1081 -1374 2138 -2713 3033 -163 110 -163 110 -204 84z M2553 5408 c-506 -474 -762 -905 -864 -1458 -30 -159 -37 -514 -14 -685 43 -323 177 -683 335 -898 l50 -67 43 26 c99 62 247 201 247 232 0 5 -23 47 -50 93 -248 417 -313 948 -175 1429 75 260 208 495 415 729 39 45 77 81 84 81 28 0 230 -252 317 -397 266 -439 328 -1017 164 -1508 -231 -689 -899 -1268 -2012 -1745 -95 -40 -173 -75 -173 -78 0 -11 147 -166 210 -222 l69 -62 128 57 c1268 566 1990 1248 2197 2073 88 352 85 775 -9 1136 -77 296 -233 596 -455 876 -98 124 -410 440 -434 440 -10 0 -42 -24 -73 -52z"/></svg>`;
const entityLabel = f => f.owner && f.manager ? `${f.owner} + ${f.manager}` : f.entityName || f.entity || townOf(f).name;
const ENTITY_MARK = { UAF: UAF_FLAME, 'La Pessigolla': PESSIGOLLA_MARK };
const entityPart = (mark, name) => `<span class="sel-entity-part">${mark}<span>${escapeHtml(name)}</span></span>`;
const entityHtml = f => f.entity === 'Ajuntament + UAF' ? `${entityPart(escutSvg(f.town), f.owner)} <span>+</span> ${entityPart(UAF_FLAME, f.manager)}`
  : ENTITY_MARK[f.entity] ? `${ENTITY_MARK[f.entity]}<span>${escapeHtml(entityLabel(f))}</span>` : escapeHtml(entityLabel(f));
const cardEntityHtml = f => f.entity === 'UAF' || f.entity === 'Ajuntament + UAF'
  ? `<small class="sel-entity-icons" aria-hidden="true">${f.entity === 'Ajuntament + UAF' ? `<span>${escutSvg('valls')}Ajuntament</span><span>+</span>` : ''}<span>${UAF_FLAME}UAF</span></small>`
  : f.entity === 'La Pessigolla' ? `<small class="sel-entity-icons" aria-hidden="true"><span>${PESSIGOLLA_MARK}La Pessigolla</span></small>`
  : `<small>${escapeHtml(f.entity || townOf(f).name)}</small>`;
const portraitHtml = f => f.thumbnail ? `<img src="${escapeHtml(f.thumbnail)}" alt="" width="96" height="96" loading="lazy" decoding="async">` : pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10');
function stripHtml(figures, later = false, last = null) { // later: what the fold hides; last: the town before (no banner twice)
  let html = '';
  for (const f of figures) {
    const t = townOf(f);
    if (t !== last) html += `<span class="sel-banner${later ? ' later' : ''}" data-town="${t.id}" data-field="${escutField(t.id)}"${(t.short ?? t.name).length > 9 ? ' data-long' : ''} aria-hidden="true"><span>${(t.short ?? t.name).toUpperCase()}</span></span>`;
    last = t;
    const name = f.name || 'Aviat', entity = f.entity || t.name;
    const ok = playable(f), art = f.thumbnail ? null : portraitArt(f); // the portrait's grid with its rim: whole-pixel sizing (select.css)
    html += `<button type="button" class="btn btn-secondary sel-card${ok ? '' : ' aviat'}${later ? ' later' : ''}" role="option" data-id="${escapeHtml(f.id)}" data-field="${escutField(t.id)}" tabindex="-1" aria-selected="false" aria-label="${escapeHtml(f.invite ? `${name}: ${entity.toLowerCase()} per al joc` : `${name}, ${entityLabel(f)}, ${t.name}${ok ? '' : ', pròximament'}`)}"${art ? ` style="--gw:${art[0].length + 2};--gh:${art.length + 2};--s:${portraitStand(f)}"` : ''}><span class="por">${SELECTOR_PORTRAITS[f.id] || (ok || f.thumbnail ? portraitHtml(f) : pendingSilhouette(art))}</span><span class="nb"><span class="sel-card-name">${escapeHtml(name)}</span>${cardEntityHtml(f)}</span></button>`;
  }
  return html;
}
// the fold between the playable figures and the rest: › folded, ‹ unfolded
const moreHtml = () => `<button type="button" class="btn btn-secondary sel-card sel-more" data-more="1" role="option" tabindex="-1" aria-selected="false" aria-expanded="false" aria-label="Pròximament"><span class="sel-more-flag" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="open" d="m9 5 7 7-7 7"/><path class="close" d="m15 5-7 7 7 7"/></svg></span></button>`;
// the pills' last one: the arms of the towns with nothing to play yet, fanned out; unfolded, «Amaga»
const soonPillHtml = towns => `<button type="button" class="btn btn-secondary sel-pill sel-soon" data-soon="1" tabindex="0" aria-expanded="false"><span class="sel-fan" aria-hidden="true">${towns.map(t => escutSvg(t.id)).join('')}</span><span class="sel-soon-text">Pròximament</span></button>`;

// keyboard(): true while the player uses keys (focus rings, focus follows); busy(): a sheet is up; reduced(): reduced motion
// firstLevel: a friend's challenge's level, preselected the first time only. standing(): Promise<{ pos, total } | null>;
// onBoard: the position chip opens Classificacions
// The gap for a row that scrolls (item widths, its room from the first item to the right edge) that leaves the item at
// that edge near half shown (a fifth to four fifths), the cue that there is more: the one nearest `base` within 0.6-2x; `base` when all fit.
export function peekGap(widths, room, base) {
  if (widths.reduce((s, w) => s + w, 0) + base * (widths.length - 1) <= room) return base;
  let best = base, worst = Infinity;
  for (let g = base * 0.6; g <= base * 2; g += 0.25) {
    let x = 0, f = 0;
    for (const w of widths) { if (x + w > room) { f = Math.max(0, (room - x) / w); break; } x += w + g; }
    const off = Math.abs(f - 0.5), miss = (off > 0.3 ? 1000 : 0) + off * 40 + Math.abs(g - base); // 1 px of gap = 2.5% of the cut
    if (miss < worst) { worst = miss; best = g; }
  }
  return best;
}

export function setupSelect({ doc = document, win = globalThis, store, keyboard = () => false, busy = () => false, reduced = () => false,
  firstLevel = null, demo = false, getError = () => null, standing = () => Promise.resolve(null), onBoard = () => {}, sfx = () => {}, onPlay, onSelect = () => {}, onHowto, onWrite }) {
  const DEMO = demo && Boolean((import.meta.env ?? {}).DEV); // ?demo: made-up facts on show only, never stored or sent; gone from production builds
  const $ = id => doc.getElementById(id);
  const root = $('select'), towns = $('select-towns'), strip = $('select-strip'), levels = $('select-level'), pending = $('select-pending');
  const live = FIGURES.filter(playable), soon = FIGURES.filter(f => !playable(f));
  const liveTowns = TOWNS.filter(t => live.some(f => f.town === t.id)), restTowns = [...TOWNS.filter(t => !liveTowns.includes(t) && soon.some(f => f.town === t.id)), INVITE_TOWN]; // the invitation folds with what is to come, last
  // the toggle sits right after the live towns, like the strip's fold: it stays under the finger and the rest opens after it
  towns.setAttribute('role', 'group'); // Native Tab order, with optional arrow shortcuts between visible buttons.
  towns.innerHTML = liveTowns.map(pillHtml).join('') + (restTowns.length ? soonPillHtml(restTowns) : '') + restTowns.map(pillHtml).join('');
  strip.innerHTML = stripHtml(live) + (soon.length ? moreHtml() + stripHtml([...soon, INVITE], true, townOf(live.at(-1))) : '');
  levels.innerHTML = DIFFS.map((d, i) => `<button type="button" class="btn btn-secondary" data-level="${i}" aria-pressed="false">${d.name}</button>`).join('');
  // Keep device guidance in the information flow, clear of the dock and its actions.
  const hint = $('ios-hint');
  if (hint) $('select-info').prepend?.(hint);
  const bar = [...towns.querySelectorAll('.sel-pill')], pills = bar.filter(p => p.dataset.town), cards = [...strip.querySelectorAll('.sel-card')];
  const fold = cards.find(c => c.dataset.more), soonPill = bar.find(p => p.dataset.soon), later = [...strip.querySelectorAll('.later')];
  const restPills = pills.filter(p => restTowns.some(t => t.id === p.dataset.town));
  const foldLabel = `${soon.length} figures més, pròximament, de ${new Set(soon.map(f => f.town)).size} poblacions`;
  let figure = live[0], lastPlayable = figure, open = true; // catalog selection is independent of the host's last playable figure
  let opening = false, shown = false, teasing = false, level = 1, town = null, cur = 0, req = 0, step = 'figures';
  const smooth = () => (reduced() ? 'auto' : 'smooth');
  const api = { band: null, fpsFooter: [], measure: () => { if (shown) measure(); }, onSelect, get figure() { return figure; }, get pending() { return teasing || !playable(figure); }, get unfolded() { return open; }, visible, toLevels: () => nextStep() };

  const scrolling = stripScroll(strip, win, reduced);
  const townScrolling = stripScroll(towns, win, reduced);
  let stripLimit = 0;
  function updateArrows() { // the selection's neighbours, not the scroll position: the centring padding is never «more»
    const available = visibleCards(), i = available.indexOf(cards[cur]), fits = $('select-carousel').hasAttribute('data-fits');
    $('select-prev').disabled = fits || i <= 0;
    $('select-forward').disabled = fits || i < 0 || i >= available.length - 1;
  }
  const centre = (row, el, behavior = smooth()) => { // both rows share one bounded motion (native smooth scrolling grows with the distance)
    const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    if (row === strip) scrolling.to(left, behavior !== 'smooth', closing ? finishFold : null);
    else townScrolling.to(left, behavior !== 'smooth');
  };

  function pendingFill(f) {
    $('aviat-title').textContent = f.fullName || f.name;
    $('aviat-entity').hidden = false;
    $('aviat-entity').innerHTML = entityHtml(f);
    $('aviat-icon').innerHTML = ''; $('aviat-icon').hidden = true; // the strip below already shows its portrait
    $('aviat-text').innerHTML = (f.invite ? inviteText() : aviatText(f)).split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
  }
  function teaserFill() {
    pending.toggleAttribute('data-fold', true); // same GitHub/mail row as a pending figure: the fan yields the room (select.css)
    $('aviat-title').textContent = 'Aviat a la plaça';
    $('aviat-icon').innerHTML = GIFTS; $('aviat-icon').hidden = false;
    $('aviat-entity').hidden = true;
    $('aviat-entity').innerHTML = '';
    $('aviat-text').innerHTML = '<p>Volem que surtin a la plaça. Envia’ns el que tinguis o explica’ns com es balla.</p>';
  }
  // Leaving, the card keeps the box it had: the dock rising and the room it frees would otherwise resize and move it
  // mid-fade (a jump and a repaint as it went). Its next showing lets go first.
  const FROZEN = ['top', 'maxHeight', 'minHeight', 'height', 'transform'];
  function freeze() {
    const cs = win.getComputedStyle?.(pending);
    if (!cs) return;
    // getComputedStyle is live: capture every value before any write can change the layout.
    const values = FROZEN.map(k => k === 'minHeight' ? cs.height : cs[k]);
    FROZEN.forEach((k, i) => { pending.style[k] = values[i]; });
    pending.toggleAttribute('data-leaving', true);
  }
  function thaw() { for (const k of FROZEN) pending.style[k] = ''; pending.toggleAttribute('data-leaving', false); }
  function panel() { // the centre shows what the cursor is on: the selected figure, or the fold's own card
    const ok = playable(figure), leave = ok && !(Boolean(fold) && cards[cur] === fold);
    if (leave && !pending.hidden) freeze(); else if (!leave) thaw(); // read before the attributes below move the dock
    teasing = Boolean(fold) && cards[cur] === fold;
    root.toggleAttribute('data-pending', !ok);
    root.toggleAttribute('data-fold', teasing);
    pending.hidden = leave;
    $('select-info').inert = $('select-info').hidden = !ok || teasing;
    $('select-next').disabled = !ok || teasing; // desktop keeps a disabled placeholder; touch hides it
    $('select-next-label').textContent = !ok || teasing ? 'Pròximament?' : 'Tria la dificultat';
    if (teasing) teaserFill();
    else if (!ok) { pending.toggleAttribute('data-fold', false); pendingFill(figure); }
  }
  function info() {
    const ok = playable(figure);
    // Only the panel coming in is rewritten: the other one fades out as it was (select.css).
    panel();
    if (ok) {
      $('select-entity').innerHTML = entityHtml(figure);
      $('select-name').textContent = figure.fullName || figure.name || 'Aviat';
      $('select-song-name').textContent = figure.song || '';
      $('select-song-credit').textContent = [figure.composer, figure.year].filter(Boolean).join(' · ');
    }
    setStep('figures');
    if (ok) { records(); updateStanding(); }
  }
  function setStep(next) {
    const back = step === 'level';
    step = next === 'level' && playable(figure) ? 'level' : 'figures';
    const choosing = step === 'level';
    root.setAttribute('data-step', step);
    strip.hidden = choosing;
    $('select-carousel').hidden = choosing;
    $('select-act').hidden = !choosing;
    $('select-act').inert = !choosing;
    $('select-next').hidden = choosing;
    $('select-play').hidden = !choosing;
    $('select-figures-back').hidden = !choosing;
    if (choosing) scrolling.stop(); // a hidden strip cannot finish a motion
    if (shown && !opening) { measure(); if (back && !choosing) centre(strip, cards[cur], 'instant'); }
  }
  function nextStep() {
    if (!shown || !playable(figure) || teasing || busy()) return;
    if (closing) { scrolling.stop(); finishFold(); } // the action is valid as soon as the playable selection commits
    sfx('menu'); setStep('level');
    if (keyboard()) levels.children[level].focus({ preventScroll: true });
  }
  function updateStanding() {
    const mine = ++req;
    rank(DEMO ? { pos: 12, total: 135 } : null); // until the board gives one
    if (DEMO || figure.id !== MULASSA.id) return; // the public board currently contains only Mulassa runs
    standing().then(s => { if (mine === req && s?.pos) rank(s); }, () => {});
  }
  function rank(s) { // «Ets el número 12 de 135» («el número»: no gendered ordinal); a button, it opens Classificacions
    const el = $('select-rank-tile');
    el.hidden = !s; tiles();
    if (!s) return;
    $('select-pos').textContent = `Ets el número ${num(s.pos)}${s.total ? ` de ${num(s.total)}` : ''}`;
    el.setAttribute('aria-label', `Classificacions: ets el número ${num(s.pos)}${s.total ? ` de ${num(s.total)}` : ''}`);
  }
  function tiles() { // no position yet: the row keeps its height, empty
    $('select-tiles').hidden = !playable(figure) || $('select-rank-tile').hidden;
  }
  function records() { // step 2: this device's best score on each level under its name, «—» without one (records saved before `score` have none)
    for (const b of levels.children) {
      const l = Number(b.dataset.level), d = DIFFS[l].name;
      const score = DEMO ? DEMO_BEST[l] : readFigureRecord(store, figure, l)?.score, has = Number.isFinite(score);
      b.innerHTML = `${d}<span class="sub">${has ? `${TROPHY}${num(score)}` : '—'}</span>`;
      b.setAttribute('aria-label', has ? `${d}, el teu rècord ${num(score)} punts` : d);
    }
  }
  function setLevel(l, by = 'tap') {
    if (!playable(figure)) return;
    l = Math.max(0, Math.min(DIFFS.length - 1, l));
    if (l !== level && by !== 'open') { rememberLevel(store, figure.id, l); sfx('menu'); }
    level = l;
    for (const b of levels.children) b.setAttribute('aria-pressed', String(Number(b.dataset.level) === l));
  }
  const visibleCards = () => cards.filter(c => !c.hidden && !c.inert);
  // Only available items count: the closing catalog stays laid out until scrolling comes to rest.
  const rowEdge = row => Math.max(0, ...[...row.children].filter(el => !el.hidden && !el.inert).map(el =>
    el.offsetLeft + el.offsetWidth + (parseFloat(win.getComputedStyle?.(el).marginRight) || 0)))
    + (parseFloat(win.getComputedStyle?.(row).paddingRight) || 0);
  const GAPS = new Map([[towns, 7], [strip, 8]]); // their CSS gaps
  function peek() { // spaces both rows so the one at the right edge is cut (all fit: as CSS has them)
    for (const [row, base] of GAPS) {
      const items = [...row.children].filter(el => !el.hidden && !el.inert && el.offsetWidth && (row !== strip || !later.includes(el))), cs = win.getComputedStyle?.(row);
      const room = row.clientWidth - (parseFloat(cs?.paddingLeft) || 0);
      if (items.length && room > 0) row.style.gap = `${peekGap(items.map(el => el.offsetWidth), room, base)}px`;
    }
  }
  function mark(id, behavior = smooth()) { // the pill that reads as active: the selected figure's town
    const pill = press(id);
    if (pill) centre(towns, pill, behavior);
  }
  function press(id) { // (its writes alone: opening reads the layout once, after every write)
    if (id === town) return null;
    town = id;
    pills.forEach(p => p.setAttribute('aria-pressed', String(p.dataset.town === id)));
    return pills.find(p => p.dataset.town === id);
  }
  const arrivals = new Map();
  let closing = false, townExit = null, settling = false; // settling: unfold() measures once after the steps it runs (each measure forces a layout)
  const FOLD_MS = 240;
  function clearTownExit() {
    if (!townExit) return;
    townExit.animation?.cancel(); townExit.layer.remove(); townExit = null;
  }
  function exitTowns() {
    // Keep only a painted copy of the outgoing pills. Their real layout can then reach its
    // folded size now, so centring and the fade share one motion instead of two queued ones.
    if (!win.matchMedia?.('(pointer: fine)').matches || reduced()) return false;
    const rect = towns.getBoundingClientRect(), zoom = parseFloat(win.getComputedStyle(root).zoom) || 1;
    const layer = towns.cloneNode(true), scroll = towns.scrollLeft;
    layer.removeAttribute('id'); layer.removeAttribute('role'); layer.removeAttribute('aria-label');
    layer.setAttribute('aria-hidden', 'true'); layer.inert = true;
    Object.assign(layer.style, { left: `${rect.left / zoom}px`, top: `${rect.top / zoom}px`,
      right: 'auto', width: `${rect.width / zoom}px`, height: `${rect.height / zoom}px`,
      transform: 'none', translate: 'none', pointerEvents: 'none', zIndex: '1', justifyContent: win.getComputedStyle(towns).justifyContent,
      paddingLeft: win.getComputedStyle(towns).paddingLeft, paddingRight: win.getComputedStyle(towns).paddingRight });
    [...layer.children].forEach((el, i) => { if (!restPills.includes(bar[i])) el.style.visibility = 'hidden'; else el.style.opacity = win.getComputedStyle(bar[i]).opacity; });
    root.append(layer); layer.scrollLeft = scroll;
    townExit = { layer, animation: null };
    restPills.forEach(p => { p.hidden = true; });
    return true;
  }
  const onScreen = el => { const b = el.getBoundingClientRect(); return !(b.right <= 0 || b.left >= win.innerWidth * 2); }; // only these fade: each animated item is a compositor layer (unfolding: 170–355 ms of compositing on an iPhone)
  function revealItems(on) { // unfold() fades them in after its measure, whose layout its reads reuse
    for (const el of [...later, ...restPills]) { arrivals.get(el)?.cancel(); el.hidden = !on; el.inert = !on; }
  }
  function finishFold() {
    if (open) return;
    townScrolling.to(townScrolling.target, true);
    const header = townExit ? null : headerPositions();
    clearTownExit();
    closing = false; root.toggleAttribute('data-folding', false);
    arrivals.get(pending)?.cancel(); pending.inert = false;
    revealItems(false);
    if (shown) { measure(); if (header) moveHeader(header); else if (reduced()) for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); }
  }
  // The collapsed towns can fit beside the corner buttons. Preserve their painted position across
  // that one layout change, then move on the compositor; the first pill also accounts for centring.
  function headerPositions() {
    return [towns, $('select-info')].map(el => ({ el, rect: (el === towns ? pills[0] : el).getBoundingClientRect() }));
  }
  function moveHeader(before, startTime) {
    const zoom = parseFloat(win.getComputedStyle?.(root).zoom) || 1;
    for (const { el, rect } of before) {
      arrivals.get(el)?.cancel();
      const after = (el === towns ? pills[0] : el).getBoundingClientRect();
      const x = (rect.left - after.left) / zoom, y = (rect.top - after.top) / zoom;
      if (!reduced() && el.animate && (Math.abs(x) > 1 || Math.abs(y) > 1)) {
        const motion = el.animate({ transform: [`translate(${x}px, ${y}px)`, 'translate(0, 0)'] }, { duration: FOLD_MS, easing: 'ease-in-out', fill: 'backwards' });
        if (Number.isFinite(startTime)) motion.startTime = startTime;
        arrivals.set(el, motion);
      }
    }
  }
  function foldedMax() {
    const padding = parseFloat(win.getComputedStyle?.(strip).paddingRight) || 0;
    const margin = parseFloat(win.getComputedStyle?.(fold).marginRight) || 0;
    return Math.max(0, fold.offsetLeft + fold.offsetWidth + margin + padding - strip.clientWidth);
  }
  function unfold(on, how) { // shows or hides what is still to come: its cards and banners, its towns' pills
    if (on === open || !fold) return;
    open = on;
    townScrolling.stop();
    const items = [...later, ...restPills];
    const restoreFocus = !on && items.includes(doc.activeElement);
    restPills.forEach(p => { p.tabIndex = on ? 0 : -1; });
    const text = soonPill?.querySelector?.('.sel-soon-text'), label = () => { // the toggles' state (their look changes with it)
      fold.setAttribute('aria-expanded', String(open)); fold.setAttribute('aria-label', open ? 'Amaga les figures pròximament' : foldLabel);
      soonPill?.setAttribute('aria-expanded', String(open));
      if (text) text.textContent = open ? 'Amaga' : 'Pròximament';
    };
    if (how === 'open') { label(); for (const el of items) el.hidden = !on; return; }
    sfx('menu');
    const foldingHeader = !on ? headerPositions() : null, movingTowns = !on && exitTowns();
    label();
    if (on) {
      const header = headerPositions();
      clearTownExit();
      closing = false; root.toggleAttribute('data-folding', false);
      arrivals.get(pending)?.cancel(); pending.inert = false;
      revealItems(true);
      roveCard(cur);
      if (shown) { measure(); moveHeader(header); }
      if (!reduced()) for (const el of items) if (el.animate && onScreen(el)) arrivals.set(el, el.animate({ opacity: [0, 1] }, { duration: 180 }));
      // Keep the existing cards in place; reveal just enough of the first new card to invite navigation.
      const first = cards.find(c => later.includes(c));
      const right = first ? first.offsetLeft + first.offsetWidth - strip.clientWidth + 12 : scrolling.target;
      scrolling.to(how === 'tap' ? Math.max(scrolling.target, right) : scrolling.target);
    } else {
      // Commit the selection before the exit starts. Keep the outgoing panel's text for its CSS fade;
      // the disclosure's keyboard focus is independent of the selected card and never needs a teaser here.
      const target = cards.find(c => figureOf(c) === (playable(figure) ? figure : lastPlayable));
      settling = true; try { pick(target, 'fold'); } finally { settling = false; }
      press(figure.town);
      closing = true;
      root.toggleAttribute('data-folding', true);
      const exiting = movingTowns ? later : items;
      for (const el of items) el.inert = true;
      if (shown) measure();
      if (restoreFocus) (how === 'pill' ? soonPill : fold)?.focus({ preventScroll: true });
      const destination = Math.min(scrolling.target, foldedMax());
      // Both rows arrive before the outgoing items lose their layout boxes (or a far pill would be clamped abruptly).
      const pill = pills.find(p => p.dataset.town === figure.town);
      const townDestination = Math.max(0, Math.min(pill.offsetLeft - (towns.clientWidth - pill.offsetWidth) / 2, rowEdge(towns) - towns.clientWidth));
      // Start both clocks after layout; a slow first paint must not delay the fade.
      const fadeStart = win.performance?.now();
      if (movingTowns) {
        townScrolling.to(0, true);
        moveHeader(foldingHeader, fadeStart);
        townExit.animation = townExit.layer.animate({ opacity: [1, 0] }, { duration: FOLD_MS, fill: 'forwards', easing: 'ease-in-out' });
        townExit.animation.startTime = fadeStart;
      }
      const fade = new Set(reduced() ? [] : exiting.filter(el => el.animate && onScreen(el))); for (const el of exiting) { // every read before the first cancel: each one restyles
        arrivals.get(el)?.cancel();
        if (fade.has(el)) {
          const exit = el.animate({ opacity: [1, 0] }, { duration: FOLD_MS, fill: 'forwards', easing: 'ease-in-out' });
          if (Number.isFinite(fadeStart)) exit.startTime = fadeStart;
          arrivals.set(el, exit);
        }
      }
      if (!movingTowns) townScrolling.to(townDestination, false, null, FOLD_MS);
      scrolling.to(destination, false, finishFold, FOLD_MS);
    }
  }
  unfold(false, 'open');
  function setTown(id) { // a pill jumps to its town's first figure and selects it; nothing is filtered
    setStep('figures');
    if (restTowns.some(t => t.id === id)) unfold(true, 'pill');
    const first = cards.find(c => figureOf(c)?.town === id);
    pick(first, 'filter'); // the pill's tap already made the sound
    centre(strip, first, smooth());
  }
  function roveCard(i) { // the strip's one tab stop and its one selection (the fold included)
    cur = i;
    cards.forEach((c, k) => { c.tabIndex = k === i ? 0 : -1; c.setAttribute('aria-selected', String(k === i)); });
    updateArrows();
    if (teasing !== (Boolean(fold) && cards[i] === fold)) { panel(); if (shown && !opening && !settling) measure(); }
  }
  // ↑↓ jump between the screen's rows like a game menu: the corner buttons, pills, info tiles, «Aviat», figures or levels,
  // footer buttons; ←→ walk the corner row (left to right as drawn).
  const corner = ['leaders', 'viewmode', 'feedback', 'music', 'settings'].map($).filter(Boolean);
  const cornerRow = { contains: el => corner.includes(el) };
  const rows = [cornerRow, towns, $('select-info'), pending, strip, levels, root.querySelector('.sel-footer')];
  const usable = el => el && !el.disabled && !el.closest('[hidden]') && el.getClientRects().length > 0; // fixed corners have no offsetParent
  const rowTarget = r => (r === cornerRow ? corner.find(usable) : r === towns ? bar.find(p => p.dataset.town === town && usable(p)) || bar.find(usable) : r === strip ? cards[cur] : r === levels ? levels.children[level]
    : [...r.querySelectorAll('button, a[href]')].find(el => el.tabIndex >= 0 && usable(el)));
  function focusMove(target, sound = true) {
    if (!target || target === doc.activeElement) return;
    target.focus({ preventScroll: true });
    if (sound && doc.activeElement === target) sfx('menu');
  }
  function rowStep(a, dir) {
    const at = rows.findIndex(r => r.contains(a));
    if (at < 0) { focusMove(rowTarget(step === 'level' ? levels : strip)); return; } // nothing focused yet
    for (let i = at + dir; i >= 0 && i < rows.length; i += dir) {
      const t = rowTarget(rows[i]);
      if (usable(t)) { focusMove(t); return; }
    }
  }
  function focusCard(i) {
    const available = visibleCards();
    const target = available[Math.max(0, Math.min(available.length - 1, i))];
    if (target === doc.activeElement && target === cards[cur]) return;
    const previousFigure = figure;
    pick(target, 'arrow');
    focusMove(target, figure === previousFigure);
    centre(strip, target);
  }
  const figureOf = card => card.dataset.id === INVITE.id ? INVITE : FIGURES.find(f => f.id === card.dataset.id);
  const play = () => {
    if (!shown || step !== 'level' || !playable(figure) || busy()) return;
    rememberLevel(store, figure.id, level); sfx('menu'); onPlay(level, figure);
  };
  function pick(card, how) {
    if (!card || card.hidden || card.inert) return;
    if (card.dataset.more && open && (how === 'tap' || how === 'enter') && shown && !busy()) { unfold(false, 'tap'); return; }
    if (closing && !card.dataset.more) { scrolling.stop(); finishFold(); }
    const unfolding = Boolean(card.dataset.more) && (how === 'tap' || how === 'enter') && shown && !busy(), was = settling; settling ||= unfolding; try { roveCard(cards.indexOf(card)); } finally { settling = was; }
    if (card.dataset.more) { if (unfolding) unfold(!open, 'tap'); return; } // arrows only reach it
    const next = figureOf(card);
    if (next !== figure) {
      if (how !== 'filter' && how !== 'fold') sfx('menu');
      figure = next; info(); setLevel(rememberedLevel(store, figure.id), 'open');
      if (how !== 'fold') mark(figure.town, how === 'arrow' ? 'instant' : smooth());
      if (playable(figure)) { lastPlayable = figure; api.onSelect(figure); } // pending figures never replace the song/model state
      if (!settling) measure();
    }
    if (how === 'enter') nextStep();
  }

  towns.addEventListener('click', e => { const p = e.target.closest?.('.sel-pill'); if (p?.dataset.soon) unfold(!open, 'pill'); else if (p) { sfx('menu'); setTown(p.dataset.town); } });
  strip.addEventListener('click', e => { const c = e.target.closest?.('.sel-card'); if (c) { pick(c, 'tap'); if (!c.hidden && !c.dataset.more) centre(strip, c, smooth()); } }); // the tapped card comes fully into view (the fold places the row itself)
  levels.addEventListener('click', e => { const b = e.target.closest?.('[data-level]'); if (b && step === 'level') setLevel(Number(b.dataset.level)); });
  function scrollBy(distance) {
    if (closing) return; // the short fold owns its destination until its exit has finished
    scrolling.to(Math.max(0, Math.min(stripLimit, scrolling.target + distance)), false, closing ? finishFold : null);
  }
  function moveStrip(delta) { // ‹ › are the arrow keys for the mouse: they select, the wheel only browses
    if (!shown || step !== 'figures' || busy() || $(delta < 0 ? 'select-prev' : 'select-forward').disabled) return;
    const available = visibleCards(), target = available[available.indexOf(cards[cur]) + delta], previous = figure;
    pick(target, 'arrow');
    if (figure === previous) sfx('menu'); // the fold changes no figure, so pick made no sound
    centre(strip, target);
  }
  $('select-rank-tile').addEventListener('click', () => { if (!busy()) onBoard(); });
  $('select-prev').addEventListener('click', () => moveStrip(-1));
  $('select-forward').addEventListener('click', () => moveStrip(1));
  strip.addEventListener('wheel', e => {
    if (e.ctrlKey || strip.scrollWidth <= strip.clientWidth) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const distance = delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? strip.clientWidth : 1);
    scrollBy(distance);
  }, { passive: false });
  strip.addEventListener('pointerdown', () => { if (!closing) scrolling.stop(); });
  for (const type of ['pointerdown', 'wheel']) towns.addEventListener(type, () => { if (!closing) townScrolling.stop(); }, { passive: true }); // a hand on the pills wins
  $('select-next').addEventListener('click', nextStep);
  $('select-figures-back').addEventListener('click', () => { setStep('figures'); api.refocus(); });
  $('select-play').addEventListener('click', play);
  $('select-howto').addEventListener('click', () => { if (playable(figure)) onHowto(); });
  $('aviat-write').addEventListener('click', () => { if (teasing) onWrite(''); else if (!playable(figure)) onWrite(figure.invite ? INVITE_DRAFT : aviatDraft(townOf(figure).name)); });

  win.addEventListener('keydown', e => {
    if (!shown || busy() || e.altKey || e.ctrlKey || e.metaKey) return;
    const a = doc.activeElement, inTowns = towns.contains(a), card = a?.closest?.('.sel-card');
    const key = e.key, move = { ArrowLeft: -1, ArrowRight: 1 }[key];
    // One move per press. Consume repeats so a held key cannot scroll the browser either.
    if (e.repeat) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)
        || (key === 'Enter' || key === ' ') && root.contains(a)) e.preventDefault();
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') { e.preventDefault(); rowStep(a, key === 'ArrowUp' ? -1 : 1); return; }
    const inlineHeader = root.hasAttribute('data-header-inline');
    if (move && (corner.includes(a) || inlineHeader && inTowns)) {
      e.preventDefault();
      // On wide screens the towns sit between the logo and the corner buttons: follow that visible order.
      const header = (inlineHeader ? [...bar, ...corner] : corner).filter(usable);
      const target = header[header.indexOf(a) + move];
      if (target) {
        focusMove(target);
        if (towns.contains(target)) centre(towns, target, 'instant');
      }
      return;
    }
    if (inTowns && (move || key === 'Home' || key === 'End')) { // Optional arrows; Tab and native Enter / Space still work.
      e.preventDefault();
      const visible = bar.filter(p => !p.hidden);
      const i = Math.max(0, Math.min(visible.length - 1, key === 'Home' ? 0 : key === 'End' ? visible.length - 1 : visible.indexOf(a) + move));
      focusMove(visible[i]); centre(towns, visible[i], 'instant');
      return;
    }
    if (inTowns) {
      if (key === 'Escape' && open) { e.preventDefault(); unfold(false, 'pill'); soonPill?.focus({ preventScroll: true }); return; }
      if (key !== 'Escape' || step !== 'level') return; // Keep Escape's existing return from difficulty.
    }
    if (a?.closest?.('a, input, textarea') || pending.contains(a)) return;
    if (step === 'level') {
      if (key === 'Escape') { e.preventDefault(); setStep('figures'); api.refocus(); }
      else if (move) { e.preventDefault(); setLevel(level + move); if (levels.contains(a)) levels.children[level].focus({ preventScroll: true }); }
      else if ((key === 'Enter' || key === ' ') && (levels.contains(a) || a === $('select-play') || !a || a === doc.body)) { e.preventDefault(); play(); }
      return;
    }

    if (move || key === 'Home' || key === 'End') {
      e.preventDefault();
      const available = visibleCards();
      focusCard(key === 'Home' ? 0 : key === 'End' ? available.length - 1 : available.indexOf(card ?? cards[cur]) + move);
      return;
    }
    if (key === 'PageUp' || key === 'PageDown') {
      e.preventDefault();
      const ids = pills.map(p => p.dataset.town), i = (ids.indexOf(town) + (key === 'PageUp' ? -1 : 1) + ids.length) % ids.length;
      setTown(ids[i]);
      return;
    }
    if ((key === 'Enter' || key === ' ') && (card || !a || a === doc.body)) { e.preventDefault(); if (card) pick(card, 'enter'); else nextStep(); }
  });

  function measure() { // her free band (css px): under the info block, or (info at the side) under the pills; above the strip
    const r = el => el.getBoundingClientRect(), side = win.innerWidth >= 900 || win.innerHeight <= 500;
    const z = parseFloat(win.getComputedStyle?.(root).zoom) || 1, px = v => `${v / z}px`; // big desktops zoom the layer: rects are screen px, its CSS isn't
    // header: logo left, corner buttons right; the towns fit between (asymmetric gutter: a symmetric one dropped them on an iPad) or get their own row
    const logo = [root.querySelector('.sel-logo')].filter(Boolean).map(r).filter(b => b.width > 0), right = corner.filter(el => !el.hidden).map(r).filter(b => b.width > 0);
    const needed = bar.reduce((width, pill) => width + r(pill).width, 0) + GAPS.get(towns) * z * (bar.length - 1);
    const gutterL = Math.max(0, ...logo.map(b => b.right)) + 24, gutterR = Math.max(0, ...right.map(b => win.innerWidth - b.left)) + 24;
    const inline = Boolean(right.length && win.innerWidth - gutterL - gutterR >= needed);
    root.toggleAttribute('data-header-inline', inline);
    if (inline) {
      root.style.setProperty('--town-gutter-l', px(gutterL)); root.style.setProperty('--town-gutter-r', px(gutterR));
      root.style.setProperty('--town-top', px(right[0].top + (right[0].height - r(towns).height) / 2));
      root.style.setProperty('--info-top', px(Math.max(...logo.map(b => b.bottom), ...right.map(b => b.bottom)) + 16));
    } else root.style.removeProperty?.('--info-top');
    // The dock's layout box, not its rect: a pending figure drops it by a transform that may still be under way.
    const dock = $('select-bottom'), dockTop = (dock.offsetTop ?? r(dock).top / z) * z;
    // The pills' layout box, not their rect: unfolding slides them to their new row by a transform that may still be under way.
    const townsBottom = ((towns.offsetTop ?? r(towns).top / z) + (towns.offsetHeight ?? r(towns).height / z)) * z;
    // Reserve the expanded header row even while towns fit inline: folding must not move the contact card.
    peek();
    // The live group keeps its centred origin when the catalog opens. Only scrollLeft moves the cards.
    const base = [...strip.children].filter(el => !later.includes(el));
    const style = win.getComputedStyle?.(strip), gap = parseFloat(style?.gap) || 8;
    const width = base.reduce((sum, el) => {
      const css = win.getComputedStyle?.(el);
      return sum + el.offsetWidth + (parseFloat(css?.marginLeft) || 0) + (parseFloat(css?.marginRight) || 0);
    }, 0) + gap * Math.max(0, base.length - 1);
    strip.style.setProperty('--strip-inset', `${Math.max(0, ($('select-carousel').clientWidth - width) / 2)}px`);
    stripLimit = Math.max(0, Math.min(rowEdge(strip), strip.scrollWidth) - strip.clientWidth);
    $('select-carousel').toggleAttribute('data-fits', stripLimit <= 1);
    updateArrows();
    // The arrow group stands above the strip while it overflows (none on touch): her band and a pending card keep clear of it.
    const nav = stripLimit > 1 ? ($('select-nav').offsetHeight || 0) * z : 0;
    api.band = { top: side ? townsBottom : r($('select-info')).bottom, bottom: dockTop - nav };
    // Use the strip's final layout position, including its painted top gutter. CSS subtracts
    // --drop so touch reserves the lowered dock without reading its animated transform.
    const stripTop = dockTop + r(strip).top - r(dock).top;
    const pendingEnd = nav ? dockTop + r($('select-nav')).top - r(dock).top : stripTop + Math.min(...base.map(el => el.offsetTop)) * z;
    root.style.setProperty('--pending-rest-bottom', px(Math.max(0, r(root).height - pendingEnd) + 12 * z));
    if (!pending.hidden) { fitPendingTitle($('aviat-title'), win); fitPendingNote(pending); }
    // Cached action bounds for diagnostic overlays; no frame-loop layout reads.
    api.fpsFooter = ['select-figures-back', 'select-next', 'select-play'].map($).filter(el => !el.hidden).map(r);
  }
  win.addEventListener('resize', () => { if (shown) { scrolling.stop(); if (closing) finishFold(); for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); if (teasing) teaserFill(); measure(); if (step === 'figures') centre(strip, cards[cur], 'instant'); } });
  if (win.ResizeObserver) {
    const observer = new win.ResizeObserver(() => { if (shown) measure(); });
    observer.observe($('select-info')); observer.observe(root); // --app-h can settle after Safari's viewport event.
  }
  doc.fonts?.ready.then(() => { if (shown) measure(); });
  function visible(on) {
    const error = $('select-error'), message = getError() ?? '';
    if (error && error.textContent !== message) { error.textContent = message; error.hidden = !message; if (shown) measure(); }
    if (on === shown) return;
    shown = on; root.inert = root.hidden = !on;
    root.removeAttribute('data-shown'); // navigation waits for the opening layout; panel fades also cover reopening
    if (on) win.requestAnimationFrame?.(() => win.requestAnimationFrame(() => root.toggleAttribute('data-shown', shown))); // after its first paint
    if (!on) { scrolling.stop(); if (closing) finishFold(); townScrolling.stop(); for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); if (root.contains(doc.activeElement)) doc.activeElement.blur(); return; }
    // Every write first, then one read of the layout, then the scrolls: each read after a write recomputed the whole
    // selector's styles, and this runs in the frame that shows it (the splash's ENTRA: ~0.3 s on a slow phone).
    opening = true; info(); opening = false;
    setLevel(firstLevel ?? rememberedLevel(store, figure.id), 'open'); firstLevel = null;
    const i = cards.findIndex(c => c.dataset.id === figure.id);
    roveCard(i);
    const pill = press(figure.town);
    measure();
    centre(strip, cards[i], 'auto');
    if (pill) centre(towns, pill, 'auto');
    if (playable(figure)) api.onSelect(figure);
    if (keyboard()) cards[i].focus({ preventScroll: true }); else doc.activeElement?.blur?.();

  }
  api.refocus = () => { if (shown && keyboard()) cards[cur].focus({ preventScroll: true }); }; // back from a sheet it opened
  return api;
}
