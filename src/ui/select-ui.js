// Main menu over the plaça: town pills, the playable figures, records, difficulty. What is still to come starts folded into
// one chevron fold and one «Pròximament» pill; either unfolds it in place (its cards, its towns' pills),
// the fold and an «Amaga» pill fold it back. A pending figure shows its own panel instead of the records.
// Arrows rove cards; Enter confirms a figure. On the next step arrows choose difficulty; Escape returns. The fold, the keys
// and the layout's measure are select-fold.js, select-keys.js and select-layout.js.
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
import { pixelSvg, pillHtml, stripHtml, moreHtml, soonPillHtml, peekGap } from './select-strip.js';
import { setupFold } from './select-fold.js';
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
  const $ = id => doc.getElementById(id), cardOf = p => onCard({ ...p, from: { ...p.from, figure: figure.id } }), facts = setupStandings({ doc, $, onBoard: () => onBoard(figure), onCard: cardOf, busy, levels: () => step === 'level', onSwapped: () => { if (shown) { levelStats(); measure(); } } }); // facts: desktops' medals and board card (select-standings.js)
  const podium = setupPodium({ doc, win, $, onBoard: () => { if (!busy()) onBoard(figure); }, onCard: cardOf, load: ranked && levelPodium, refit: () => levelStats() }); // step 2's podium (select-podium.js)
  let standingNow = null; // the board's last answer, for the podium
  const root = $('select'), towns = $('select-towns'), strip = $('select-strip'), levels = $('select-level'), pending = $('select-pending');
  const live = FIGURES.filter(upFront), soon = FIGURES.filter(f => !upFront(f));
  const liveTowns = TOWNS.filter(t => live.some(f => f.town === t.id)), restTowns = [...TOWNS.filter(t => !liveTowns.includes(t) && soon.some(f => f.town === t.id)), INVITE_TOWN]; // the invitation folds with what is to come, last
  // the toggle sits right after the live towns, like the strip's fold: it stays under the finger and the rest opens after it
  towns.setAttribute('role', 'group'); // Native Tab order, with optional arrow shortcuts between visible buttons.
  towns.innerHTML = liveTowns.map(pillHtml).join('') + (restTowns.length ? soonPillHtml(restTowns.filter(t => t !== INVITE_TOWN)) : '') + restTowns.map(pillHtml).join('');
  strip.innerHTML = stripHtml(live) + (soon.length ? moreHtml() + stripHtml([...soon, INVITE], true, townOf(live.at(-1))) : '');
  levels.innerHTML = DIFFS.map((d, i) => `<button type="button" class="btn btn-secondary" data-level="${i}" aria-pressed="false">${d.name}</button>`).join('');
  const bar = [...towns.querySelectorAll('.sel-pill')], pills = bar.filter(p => p.dataset.town), cards = [...strip.querySelectorAll('.sel-card')];
  const fold = cards.find(c => c.dataset.more), soonPill = bar.find(p => p.dataset.soon), later = [...strip.querySelectorAll('.later')];
  const restPills = pills.filter(p => restTowns.some(t => t.id === p.dataset.town));
  const foldLabel = tr('ui.select.foldLabel', { n: soon.length, towns: new Set(soon.map(f => f.town)).size });
  let figure = live.find(f => f.id === firstFigure) ?? live[0], lastPlayable = figure; // catalog selection is independent of the host's last playable figure
  let opening = false, shown = false, teasing = false, level = 1, town = null, cur = 0, req = 0, step = 'figures';
  const smooth = () => (reduced() ? 'auto' : 'smooth');
  const api = { band: null, fpsFooter: [], measure: () => { if (shown) measure(); }, onSelect, get figure() { return figure; }, get pending() { return teasing || !playable(figure); }, get unfolded() { return folding.open; }, visible, toLevels: () => nextStep() };

  const scrolling = stripScroll(strip, win, reduced);
  const townScrolling = stripScroll(towns, win, reduced);
    function updateArrows() { // the selection's neighbours, not the scroll position: the centring padding is never «more»
    const available = visibleCards(), i = available.indexOf(cards[cur]), fits = $('select-carousel').hasAttribute('data-fits');
    $('select-prev').disabled = fits || i <= 0;
    $('select-forward').disabled = fits || i < 0 || i >= available.length - 1;
  }
  const centre = (row, el, behavior = smooth()) => { // both rows share one bounded motion (native smooth scrolling grows with the distance)
    const clip = row === strip ? parseFloat(strip.style.getPropertyValue?.('--strip-clip')) || 0 : 0; // the strip's box is constant: its left `clip` px (under the info column) are clipped, not cut off
    let left = el.offsetLeft - clip - (row.clientWidth - clip - el.offsetWidth) / 2;
    if (clip && !later.includes(el) && el.offsetLeft + el.offsetWidth <= row.clientWidth) left = Math.min(left, 0); // a live card in view at rest stays: centring it slid Valls's banner under the column's clip
    if (row === strip) scrolling.to(left, behavior !== 'smooth', folding.closing ? folding.finishFold : null);
    else townScrolling.to(left, behavior !== 'smooth');
  };
  const { fill: pendingFill, teaser: teaserFill, freeze, thaw } = setupPendingPanel({ $, win, pending }), flip = setupFlip({ win, root, els: () => [towns, ...towns.children, $('select-prev'), $('select-forward'), $('select-nav'), ...strip.children], reduced: () => reduced() }); // flip: the pending layout slides instead of jumping; never the strip or its carousel: their box clips the cards, and a sliding clip swept the row (only their contents move)
  function panel() { // the centre shows what the cursor is on: the selected figure, or the fold's own card (opening: it was hidden, nothing slides)
    flip.snap(shown && !opening); const ok = playable(figure), leave = ok && !(Boolean(fold) && cards[cur] === fold);
    if (leave && !pending.hidden) freeze(); else if (!leave) thaw(); // read before the attributes below move the dock
    teasing = Boolean(fold) && cards[cur] === fold;
    root.toggleAttribute('data-pending', !ok);
    root.toggleAttribute('data-fold', teasing);
    pending.hidden = leave;
    $('select-info').inert = $('select-info').hidden = !ok || teasing;
    $('select-next').disabled = !ok || teasing; // desktop keeps a disabled placeholder; touch hides it
    $('select-next-label').textContent = tr(!ok || teasing ? 'ui.select.soonQ' : 'ui.select.pickLevel');
    if (teasing) teaserFill();
    else if (!ok) { pending.toggleAttribute('data-fold', false); pendingFill(figure); }
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
    if (!shown || !playable(figure) || teasing || busy()) return;
    if (folding.closing) { scrolling.stop(); folding.finishFold(); } // the action is valid as soon as the playable selection commits
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
  const visibleCards = () => cards.filter(c => !c.hidden && !c.inert);
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
    if (restTowns.some(t => t.id === id)) folding.unfold(true, 'pill');
    const first = cards.find(c => figureOf(c)?.town === id);
    pick(first, 'filter'); // the pill's tap already made the sound
    centre(strip, first, smooth());
  }
  function roveCard(i) { // the strip's one tab stop and its one selection (the fold included)
    cur = i;
    cards.forEach((c, k) => { c.tabIndex = k === i ? 0 : -1; c.setAttribute('aria-selected', String(k === i)); });
    updateArrows();
    if (teasing !== (Boolean(fold) && cards[i] === fold)) { panel(); if (shown && !opening && !folding.settling) measure(); }
  }
  const corner = ['free', 'music', 'settings'].map($).filter(Boolean);
  const figureOf = card => card.dataset.id === INVITE.id ? INVITE : FIGURES.find(f => f.id === card.dataset.id);
  const play = () => {
    if (!shown || step !== 'level' || !playable(figure) || busy()) return;
    rememberLevel(store, figure.id, level); sfx('menu'); onPlay(level, figure);
  };
  function pick(card, how) {
    if (!card || card.hidden || card.inert) return;
    if (card.dataset.more && folding.open && (how === 'tap' || how === 'enter') && shown && !busy()) { folding.unfold(false, 'tap'); return; }
    if (folding.closing && !card.dataset.more) { scrolling.stop(); folding.finishFold(); }
    const unfolding = Boolean(card.dataset.more) && (how === 'tap' || how === 'enter') && shown && !busy(), was = folding.settling; folding.settling ||= unfolding; try { roveCard(cards.indexOf(card)); } finally { folding.settling = was; }
    if (card.dataset.more) { if (unfolding) folding.unfold(!folding.open, 'tap'); return; } // arrows only reach it
    const next = figureOf(card);
    if (next !== figure) {
      if (how !== 'filter' && how !== 'fold') sfx('menu');
      figure = next; opening = !folding.settling; info(); setLevel(rememberedLevel(store, figure.id), 'open'); opening = false; // one fit after one measure, as visible()
      if (how !== 'fold') mark(figure.town, how === 'arrow' ? 'instant' : smooth());
      if (playable(figure)) { lastPlayable = figure; api.onSelect(figure); } // pending figures never replace the song/model state
      if (!folding.settling) { measure(); levelStats(); }
    }
    if (how === 'enter') nextStep();
  }

  towns.addEventListener('click', e => { const p = e.target.closest?.('.sel-pill'); if (p?.dataset.soon) folding.unfold(!folding.open, 'pill'); else if (p) { sfx('menu'); setTown(p.dataset.town); } });
  strip.addEventListener('click', e => { const c = e.target.closest?.('.sel-card'); if (c) { pick(c, 'tap'); if (!c.hidden && !c.dataset.more) centre(strip, c, smooth()); } }); // the tapped card comes fully into view (the fold places the row itself)
  levels.addEventListener('click', e => { const b = e.target.closest?.('[data-level]'); if (b && step === 'level') setLevel(Number(b.dataset.level)); });
  function scrollBy(distance) {
    if (folding.closing) return; // the short fold owns its destination until its exit has finished
    scrolling.to(Math.max(0, Math.min(layout.stripLimit, scrolling.target + distance)), false, folding.closing ? folding.finishFold : null);
  }
  function moveStrip(delta) { // ‹ › are the arrow keys for the mouse: they select, the wheel only browses
    if (!shown || step !== 'figures' || busy() || $(delta < 0 ? 'select-prev' : 'select-forward').disabled) return;
    const available = visibleCards(), target = available[available.indexOf(cards[cur]) + delta], previous = figure;
    pick(target, 'arrow');
    if (figure === previous) sfx('menu'); // the fold changes no figure, so pick made no sound
    centre(strip, target);
  }
  $('select-rank-tile').addEventListener('click', () => { if (!busy()) onBoard(figure); });
  $('select-prev').addEventListener('click', () => moveStrip(-1));
  $('select-forward').addEventListener('click', () => moveStrip(1));
  strip.addEventListener('wheel', e => {
    if (e.ctrlKey || strip.scrollWidth <= strip.clientWidth) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const distance = delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? strip.clientWidth : 1);
    scrollBy(distance);
  }, { passive: false });
  strip.addEventListener('pointerdown', () => { if (!folding.closing) scrolling.stop(); });
  for (const type of ['pointerdown', 'wheel']) towns.addEventListener(type, () => { if (!folding.closing) townScrolling.stop(); }, { passive: true }); // a hand on the pills wins
  $('select-next').addEventListener('click', nextStep);
  $('select-figures-back').addEventListener('click', () => { setStep('figures'); api.refocus(); });
  $('select-play').addEventListener('click', play);
  $('select-howto').addEventListener('click', () => { if (playable(figure)) onHowto(); });
  $('aviat-write').addEventListener('click', () => { if (teasing) onWrite(''); else if (!playable(figure)) onWrite(figure.invite ? INVITE_DRAFT : aviatDraft(figure, townOf(figure).name)); });

  const view = { get figure() { return figure; }, get lastPlayable() { return lastPlayable; }, get shown() { return shown; }, get cur() { return cur; },
    get step() { return step; }, get level() { return level; }, get town() { return town; } }; // what the fold, the keys and the layout read
  const layout = createSelectLayout({ win, $, root, towns, strip, pending, bar, restPills, later, corner, facts, flip, api, view, updateArrows });
  const measure = () => layout.measure();
  const folding = setupFold({ doc, win, $, root, towns, strip, pending, cards, pills, restPills, later, bar, fold, soonPill, foldLabel,
    scrolling, townScrolling, flip, layout, reduced, sfx, view, roveCard, pick, press, figureOf });
  setupSelectKeys({ doc, win, $, root, towns, strip, levels, pending, bar, cards, pills, corner, view, folding, soonPill,
    busy, sfx, centre, visibleCards, pick, setStep, setLevel, setTown, nextStep, play, refocus: () => api.refocus() });
  win.addEventListener('resize', () => { if (shown) { scrolling.stop(); if (folding.closing) folding.finishFold(); folding.settleHeader(); if (teasing) teaserFill(); levelStats(); measure(); if (step === 'figures') centre(strip, cards[cur], 'instant'); } });
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
    if (!on) { scrolling.stop(); if (folding.closing) folding.finishFold(); townScrolling.stop(); folding.settleHeader(); if (root.contains(doc.activeElement)) doc.activeElement.blur(); return; }
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
