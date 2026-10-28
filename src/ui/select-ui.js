// Main menu over the plaça: town pills, the figures (playable first, then what is still to come), records, difficulty.
// A pending figure shows its own panel instead of the records.
// Arrows rove cards; Enter confirms a figure. On the next step arrows choose difficulty; Escape returns. The keys
// and the layout's measure are select-keys.js and select-layout.js.
import { FIGURES, TOWNS, townOf, playable, hasBoard, upFront, rememberedLevel, rememberLevel, readFigureRecord, aviatDraft, INVITE, INVITE_TOWN, INVITE_DRAFT } from '../game/figures.js';
import { DIFFS } from '../game/chart.js';
import { num } from './sheet-kit.js';
import { showLevelStats } from './level-stats.js';
import { setupStandings, rankText, rankLabel } from './select-standings.js';
import { setupPodium } from './select-podium.js';
import { ownerKey } from '../services/leaderboard-identity.js';
import { entityHtml } from './figure-entities.js';
import { setupPendingPanel } from './pending-panel.js';
import { stripScroll } from './strip-scroll.js';
import { setupFlip } from './select-flip.js';
import { pixelSvg, pillHtml, stripHtml, peekGap } from './select-strip.js';
import { setupSelectKeys } from './select-keys.js';
import { createSelectLayout } from './select-layout.js';
import { tr } from '../i18n/messages.js';
export { pixelSvg, peekGap }; // the strip's helpers moved to select-strip.js; their callers keep this path
const DEMO_BEST = [48920, 80000, null], DEMO_PCT = [96, 91, null]; // ?demo: made-up best scores (and their %) per level (NORMAL: the mock board's own row)
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10V9a5 5 0 0 1-10 0zM7 5.5H3.5V7A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5V7a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8 20.5h8M9.5 17.5h5"/></svg>';

// keyboard(): true while the player uses keys (focus rings, focus follows); busy(): a sheet is up; reduced(): reduced motion
// firstLevel: a friend's challenge's level, preselected the first time only; firstFigure: the figure it opens on (the challenge's, or ?figura in debug). standing(): Promise<{ pos, total } | null>;
// ranked: a board is configured (the ranking line shows); onBoard(figure): the line opens Classificacions on that figure;
// onCard(p): a name on the desktop card opens that player's card (player-card.js)

export function setupSelect({ doc = document, win = globalThis, store, keyboard = () => false, busy = () => false, reduced = () => false,
  firstLevel = null, firstFigure = null, demo = false, getError = () => null, standing = () => Promise.resolve(null), levelPodium = null, ranked = false, onBoard = () => {}, onCard = () => {}, sfx = () => {}, onPlay, onSelect = () => {}, onHowto, onWrite }) {
  const DEMO = demo && Boolean((import.meta.env ?? {}).DEV); // ?demo: made-up facts on show only, never stored or sent; gone from production builds
  const $ = id => doc.getElementById(id), cardOf = p => onCard({ ...p, from: { ...p.from, figure: figure.id } }), facts = setupStandings({ doc, win, $, onBoard: () => onBoard(figure), onCard: cardOf, busy, levels: () => step === 'level', onSwapped: () => { if (shown) { levelStats(); measure(); } } }); // facts: desktops' medals and board card (select-standings.js)
  const podium = setupPodium({ doc, win, $, onBoard: () => { if (!busy()) onBoard(figure); }, onCard: cardOf, load: ranked && levelPodium, refit: () => levelStats() }); // step 2's podium (select-podium.js)
  let standingNow = null; // the board's last answer, for the podium
  const root = $('select'), towns = $('select-towns'), strip = $('select-strip'), levels = $('select-level'), pending = $('select-pending');
  const live = FIGURES.filter(upFront), soon = FIGURES.filter(f => !upFront(f));
  const liveTowns = TOWNS.filter(t => live.some(f => f.town === t.id)), soonTowns = [...TOWNS.filter(t => !liveTowns.includes(t) && soon.some(f => f.town === t.id)), INVITE_TOWN]; // the invitation comes with what is to come, last
  towns.setAttribute('role', 'group'); // Native Tab order, with optional arrow shortcuts between visible buttons.
  towns.innerHTML = [...liveTowns, ...soonTowns].map(pillHtml).join('');
  strip.innerHTML = stripHtml(live) + (soon.length ? stripHtml([...soon, INVITE], true, townOf(live.at(-1))) : '');
  levels.innerHTML = DIFFS.map((d, i) => `<button type="button" class="btn btn-secondary" data-level="${i}" aria-pressed="false">${d.name}</button>`).join('');
  const bar = [...towns.querySelectorAll('.sel-pill')], pills = bar.filter(p => p.dataset.town), cards = [...strip.querySelectorAll('.sel-card')];
  const later = [...strip.querySelectorAll('.later')];
  let figure = live.find(f => f.id === firstFigure) ?? live[0], lastPlayable = figure; // catalog selection is independent of the host's last playable figure
  let opening = false, shown = false, level = 1, town = null, cur = 0, req = 0, step = 'figures';
  const smooth = () => (reduced() ? 'auto' : 'smooth');
  const api = { band: null, fpsFooter: [], measure: () => { if (shown) measure(); }, onSelect, get figure() { return figure; }, get pending() { return !playable(figure); }, visible, toLevels: () => nextStep() };

  const scrolling = stripScroll(strip, win, reduced);
  const townScrolling = stripScroll(towns, win, reduced);
  function updateArrows() { // the selection's neighbours, not the scroll position: the centring padding is never «more»
    const fits = $('select-carousel').hasAttribute('data-fits');
    $('select-prev').disabled = fits || cur <= 0;
    $('select-forward').disabled = fits || cur >= cards.length - 1;
  }
  const centre = (row, el, behavior = smooth()) => { // both rows share one bounded motion (native smooth scrolling grows with the distance)
    const clip = row === strip ? parseFloat(strip.style.getPropertyValue?.('--strip-clip')) || 0 : 0; // the strip's box is constant: its left `clip` px (under the info column) are clipped, not cut off
    let left = el.offsetLeft - clip - (row.clientWidth - clip - el.offsetWidth) / 2;
    if (clip && !later.includes(el) && el.offsetLeft + el.offsetWidth <= row.clientWidth) left = Math.min(left, 0); // a live card in view at rest stays: centring it slid Valls's banner under the column's clip
    if (row === strip) scrolling.to(left, behavior !== 'smooth');
    else townScrolling.to(left, behavior !== 'smooth');
  };
  const { fill: pendingFill, freeze, thaw } = setupPendingPanel({ $, win, pending }), flip = setupFlip({ win, root, els: () => [towns, ...towns.children, $('select-prev'), $('select-forward'), $('select-nav'), ...strip.children], reduced: () => reduced() }); // flip: the pending layout slides instead of jumping; never the strip or its carousel: their box clips the cards, and a sliding clip swept the row (only their contents move)
  function panel() { // the centre shows what the cursor is on: the selected figure, or its pending panel (opening: it was hidden, nothing slides)
    flip.snap(shown && !opening); const ok = playable(figure);
    if (ok && !pending.hidden) freeze(); else if (!ok) thaw(); // read before the attributes below move the dock
    root.toggleAttribute('data-pending', !ok);
    pending.hidden = ok;
    $('select-info').inert = $('select-info').hidden = !ok;
    $('select-next').disabled = !ok; // desktop keeps a disabled placeholder; touch hides it
    $('select-next-label').textContent = tr(ok ? 'ui.select.pickLevel' : 'ui.select.soonQ');
    if (!ok) pendingFill(figure);
  }
  function info() {
    const ok = playable(figure);
    // Only the panel coming in is rewritten: the other one fades out as it was (select-pending.css).
    panel();
    if (ok) {
      $('select-entity').innerHTML = entityHtml(figure);
      $('select-name').textContent = figure.fullName || figure.name || tr('ui.select.aviat');
      $('select-song-name').textContent = figure.song || '';
      $('select-song-credit').textContent = [figure.composer, figure.year].filter(Boolean).join(' · ');
    }
    // every write first, then one fit and one measure: fitting after each (the step, the medals, the board) cost ~80 ms a figure change
    const back = setStep('figures', false);
    if (ok) { records(); facts.medals(DIFFS.map((_, l) => (DEMO ? DEMO_BEST[l] != null && { score: DEMO_BEST[l], quality: DEMO_PCT[l] } : readFigureRecord(store, figure, l)) || null), false); updateStanding(levelStats); }
    else levelStats();
    if (shown && !opening) { measure(); if (back) centre(strip, cards[cur], 'instant'); }
  }
  // Free play (photo mode, driving this figure) is a step-one action of a playable figure, beside the primary.
  function setStep(next, settle = true) { // settle false: the caller fits and measures once its other writes are done (returns whether to recentre)
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
    $('select-figures-back').hidden = !choosing; if (choosing && !back) levels.toggleAttribute('data-quiet', true); // showing it again restarts its animations: no shake
    if (choosing) scrolling.stop(); // a hidden strip cannot finish a motion
    if (!settle) return back && !choosing;
    levelStats();
    if (shown && !opening) { measure(); if (back && !choosing) centre(strip, cards[cur], 'instant'); }
  }
  function nextStep() {
    if (!shown || !playable(figure) || busy()) return;
    sfx('menu'); setStep('level');
    if (keyboard()) levels.children[level].focus({ preventScroll: true });
  }
  // the last answer per figure and owner (memory only): shown again while the board is asked, so a figure change moves and
  // rewrites nothing when the place has not changed («Classificació» then «Posició …» flashed on each change)
  const seenRank = new Map();
  const rankKey = () => `${figure.id}:${ownerKey(store)}`; // a sign-out changes it: never the previous profile's place
  function updateStanding(refit) {
    const mine = ++req, key = rankKey(); if (!hasBoard(figure)) return rank(null, false, refit); // no online board (the Bou): no line, no request
    rank(seenRank.get(key) ?? null, false, refit); // until the board answers (?demo once showed a made-up «12 de 135» here)
    const fail = () => { if (mine === req) { seenRank.delete(key); rank(null, true); } }; // no answer: the card says so in the room it kept
    standing(figure.id).then(s => (s ? mine === req && (seenRank.set(key, s), rank(s)) : fail()), fail); // each figure has its own board (Drac included)
  }
  function rank(s, failed = false, refit = step === 'level' ? levelStats : undefined) { // the ranking line («Posició 12 de 135 · Tardor 2026», select-standings.js); a button, it opens Classificacions
    const el = $('select-rank-tile'), text = rankText(s), on = ranked && hasBoard(figure);
    standingNow = s;
    el.hidden = !on; tiles(); // the placeholder takes this figure's and owner's last shape; step 2 fits the answer's goals beside the level row
    facts.board(s, on, failed, rankKey(), refit);
    el.toggleAttribute('data-loading', !s && !failed);
    $('select-pos').textContent = text;
    el.setAttribute('aria-label', rankLabel(text));
  }
  function tiles() { // no board configured: the row keeps its height, empty
    $('select-tiles').hidden = !playable(figure) || $('select-rank-tile').hidden;
  }
  function records() { // step 2: this device's best score on each level under its name; without one the name stands alone, centred (records saved before `score` have none)
    for (const b of levels.children) {
      const l = Number(b.dataset.level), d = DIFFS[l].name;
      const score = DEMO ? DEMO_BEST[l] : readFigureRecord(store, figure, l)?.score, has = Number.isFinite(score);
      b.innerHTML = has ? `${d}<span class="sub">${TROPHY}${num(score)}</span>` : d;
      b.setAttribute('aria-label', has ? tr('ui.select.levelAria', { level: d, score: num(score) }) : d);
    }
  }
  // desktops, step 2: the info column may run down to the level card (12 px above it), not the dock's top
  function levelStats() { if (opening) return; // visible() fits once, after measure() has laid the column out (before it every try failed: ~60 ms of layouts)
    const card = step === 'level' && win.innerWidth >= 900 && win.innerHeight >= 600 && $('select-act').getBoundingClientRect();
    if (card?.height) root.style.setProperty('--info-dock', `${(root.getBoundingClientRect().bottom - card.top) / (parseFloat(win.getComputedStyle?.(root).zoom) || 1) + 6}px`);
    else if (step === 'level') root.style.removeProperty?.('--info-dock'); // step 1's: measure()
    const two = step === 'level' && playable(figure);
    facts.fit(true); showLevelStats($, { on: two, level, record: DEMO ? { score: DEMO_BEST[level], quality: DEMO_PCT[level] } : readFigureRecord(store, figure, level), goals: facts.goals });
    if (!two) facts.fit(); // step 1: the medals and the rows
    podium.fit({ on: two && ranked && hasBoard(figure), figure: figure.id, level, owner: ownerKey(store), s: standingNow });
  }
  function setLevel(l, by = 'tap') { // 'open': the figure's last level (NORMAL at first) or a challenge's, marked without a tap's shake
    if (!playable(figure)) return;
    l = Math.max(0, Math.min(DIFFS.length - 1, l));
    if (l !== level && by !== 'open') { rememberLevel(store, figure.id, l); sfx('menu'); }
    level = l; levels.toggleAttribute('data-quiet', by === 'open'); // only a tap shakes (select-cards.css)
    for (const b of levels.children) b.setAttribute('aria-pressed', String(Number(b.dataset.level) === l));
    levelStats(); // step 2's row (level-stats.js)
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
  function setTown(id) { // a pill jumps to its town's first figure and selects it; nothing is filtered
    setStep('figures');
    const first = cards.find(c => figureOf(c)?.town === id);
    pick(first, 'filter'); // the pill's tap already made the sound
    centre(strip, first, smooth());
  }
  function roveCard(i) { // the strip's one tab stop and its one selection
    cur = i;
    cards.forEach((c, k) => { c.tabIndex = k === i ? 0 : -1; c.setAttribute('aria-selected', String(k === i)); });
    updateArrows();
  }
  const corner = ['free', 'music', 'settings'].map($).filter(Boolean);
  const figureOf = card => card.dataset.id === INVITE.id ? INVITE : FIGURES.find(f => f.id === card.dataset.id);
  const play = () => {
    if (!shown || step !== 'level' || !playable(figure) || busy()) return;
    rememberLevel(store, figure.id, level); sfx('menu'); onPlay(level, figure);
  };
  function pick(card, how) {
    if (!card) return;
    roveCard(cards.indexOf(card));
    const next = figureOf(card);
    if (next !== figure) {
      if (how !== 'filter') sfx('menu');
      figure = next; opening = true; info(); setLevel(rememberedLevel(store, figure.id), 'open'); opening = false; // one fit after one measure, as visible()
      mark(figure.town, how === 'arrow' ? 'instant' : smooth());
      if (playable(figure)) { lastPlayable = figure; api.onSelect(figure); } // pending figures never replace the song/model state
      measure(); levelStats();
    }
    if (how === 'enter') nextStep();
  }

  towns.addEventListener('click', e => { const p = e.target.closest?.('.sel-pill'); if (p) { sfx('menu'); setTown(p.dataset.town); } });
  strip.addEventListener('click', e => { const c = e.target.closest?.('.sel-card'); if (c) { pick(c, 'tap'); centre(strip, c, smooth()); } }); // the tapped card comes fully into view
  levels.addEventListener('click', e => { const b = e.target.closest?.('[data-level]'); if (b && step === 'level') setLevel(Number(b.dataset.level)); });
  function scrollBy(distance) {
    scrolling.to(Math.max(0, Math.min(layout.stripLimit, scrolling.target + distance)));
  }
  function moveStrip(delta) { // ‹ › are the arrow keys for the mouse: they select, the wheel only browses
    if (!shown || step !== 'figures' || busy() || $(delta < 0 ? 'select-prev' : 'select-forward').disabled) return;
    const target = cards[cur + delta];
    pick(target, 'arrow');
    centre(strip, target);
  }
  $('select-rank-tile').addEventListener('click', () => { if (!busy()) onBoard(figure); });
  $('select-prev').addEventListener('click', () => moveStrip(-1));
  $('select-forward').addEventListener('click', () => moveStrip(1));
  function wheelRow(row, by) { // a vertical mouse wheel browses a horizontal row
    row.addEventListener('wheel', e => {
      if (e.ctrlKey || row.scrollWidth <= row.clientWidth) return;
      e.preventDefault();
      const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      by(delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? row.clientWidth : 1));
    }, { passive: false });
  }
  wheelRow(strip, scrollBy);
  wheelRow(towns, distance => townScrolling.to(townScrolling.target + distance)); // to() clamps to the row
  strip.addEventListener('pointerdown', () => scrolling.stop());
  towns.addEventListener('pointerdown', () => townScrolling.stop()); // a hand on the pills wins
  $('select-next').addEventListener('click', nextStep);
  $('select-figures-back').addEventListener('click', () => { setStep('figures'); api.refocus(); });
  $('select-play').addEventListener('click', play);
  $('select-howto').addEventListener('click', () => { if (playable(figure)) onHowto(); });
  $('aviat-write').addEventListener('click', () => { if (!playable(figure)) onWrite(figure.invite ? INVITE_DRAFT : aviatDraft(figure, townOf(figure).name)); });

  const view = { get figure() { return figure; }, get lastPlayable() { return lastPlayable; }, get shown() { return shown; }, get cur() { return cur; },
    get step() { return step; }, get level() { return level; }, get town() { return town; } }; // what the keys and the layout read
  const layout = createSelectLayout({ win, $, root, towns, strip, pending, bar, later, corner, facts, flip, api, view, updateArrows });
  const measure = () => layout.measure();
  setupSelectKeys({ doc, win, $, root, towns, strip, levels, pending, bar, cards, pills, corner, view,
    busy, sfx, centre, pick, setStep, setLevel, setTown, nextStep, play, refocus: () => api.refocus() });
  win.addEventListener('resize', () => { if (shown) { scrolling.stop(); levelStats(); measure(); if (step === 'figures') centre(strip, cards[cur], 'instant'); } });
  if (win.ResizeObserver) {
    // a hint closing or the viewport settling: the level row fits again; not measure()'s own layout (a figure change's: a second long task)
    const observer = new win.ResizeObserver(() => { if (shown && !facts.fading && layout.stale()) { levelStats(); measure(); } });
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
    if (!on) { scrolling.stop(); townScrolling.stop(); if (root.contains(doc.activeElement)) doc.activeElement.blur(); return; }
    // Every write first, then one read of the layout, then the scrolls: each read after a write recomputed the whole
    // selector's styles, and this runs in the frame that shows it (the splash's ENTRA: ~0.3 s on a slow phone).
    opening = true; info();
    setLevel(firstLevel ?? rememberedLevel(store, figure.id), 'open'); firstLevel = null; opening = false;
    const i = cards.findIndex(c => c.dataset.id === figure.id);
    roveCard(i);
    const pill = press(figure.town);
    measure(); levelStats();
    centre(strip, cards[i], 'auto');
    if (pill) centre(towns, pill, 'auto');
    if (playable(figure)) api.onSelect(figure);
    if (keyboard()) cards[i].focus({ preventScroll: true }); else doc.activeElement?.blur?.();

  }
  api.show = id => { // a figure picked elsewhere (an empty board's «Juga amb …»): its card selected and centred, step 1
    const card = cards.find(c => c.dataset.id === id);
    if (!shown || !card) return;
    setStep('figures'); pick(card, 'filter'); centre(strip, card, smooth()); api.refocus();
  };
  api.refocus = () => { // back from a sheet or photo mode: keep the current selector step
    if (!shown || !keyboard()) return;
    const target = step === 'level' ? levels.children[level] : cards[cur];
    target?.focus({ preventScroll: true });
  };
  return api;
}
