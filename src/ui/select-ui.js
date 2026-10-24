// Main menu over the plaça: town pills, the playable figures, records, difficulty. What is still to come starts folded into
// one chevron fold and one «Pròximament» pill; either unfolds it in place (its cards, its towns' pills),
// the fold and an «Amaga» pill fold it back. A pending figure shows its own panel instead of the records.
// Arrows rove cards; Enter confirms a figure. On the next step arrows choose difficulty; Escape returns.
import { FIGURES, TOWNS, townOf, playable, hasBoard, upFront, rememberedLevel, rememberLevel, readFigureRecord, aviatDraft, INVITE, INVITE_TOWN, INVITE_DRAFT } from '../game/figures.js';
import { DIFFS } from '../game/chart.js';
import { num } from './sheet-kit.js';
import { showLevelStats } from './level-stats.js';
import { setupStandings, rankText, rankLabel } from './select-standings.js';
import { setupPodium } from './select-podium.js';
import { ownerKey } from './board-list.js';
import { entityHtml, fitEntityLabel } from './figure-entities.js';
import { setupPendingPanel } from './pending-panel.js';
import { stripScroll } from './strip-scroll.js';
import { fitPendingTitle } from './pending-title.js';
import { setupFlip } from './select-flip.js';
import { pixelSvg, pillHtml, stripHtml, moreHtml, soonPillHtml, peekGap, navX } from './select-strip.js';
import { tr } from '../i18n/messages.js';
export { pixelSvg, peekGap }; // the strip's helpers moved to select-strip.js; their callers keep this path
const DEMO_BEST = [48920, 80000, null], DEMO_PCT = [96, 91, null]; // ?demo: made-up best scores (and their %) per level (NORMAL: the mock board's own row)
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10V9a5 5 0 0 1-10 0zM7 5.5H3.5V7A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5V7a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8 20.5h8M9.5 17.5h5"/></svg>';

// keyboard(): true while the player uses keys (focus rings, focus follows); busy(): a sheet is up; reduced(): reduced motion
// firstLevel: a friend's challenge's level, preselected the first time only; firstFigure: the figure it opens on (?figura, debug). standing(): Promise<{ pos, total } | null>;
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
  towns.innerHTML = liveTowns.map(pillHtml).join('') + (restTowns.length ? soonPillHtml(restTowns) : '') + restTowns.map(pillHtml).join('');
  strip.innerHTML = stripHtml(live) + (soon.length ? moreHtml() + stripHtml([...soon, INVITE], true, townOf(live.at(-1))) : '');
  levels.innerHTML = DIFFS.map((d, i) => `<button type="button" class="btn btn-secondary" data-level="${i}" aria-pressed="false">${d.name}</button>`).join('');
  const bar = [...towns.querySelectorAll('.sel-pill')], pills = bar.filter(p => p.dataset.town), cards = [...strip.querySelectorAll('.sel-card')];
  const fold = cards.find(c => c.dataset.more), soonPill = bar.find(p => p.dataset.soon), later = [...strip.querySelectorAll('.later')];
  const restPills = pills.filter(p => restTowns.some(t => t.id === p.dataset.town));
  const foldLabel = tr('ui.select.foldLabel', { n: soon.length, towns: new Set(soon.map(f => f.town)).size });
  let figure = live.find(f => f.id === firstFigure) ?? live[0], lastPlayable = figure, open = true; // catalog selection is independent of the host's last playable figure
  let opening = false, shown = false, teasing = false, level = 1, town = null, cur = 0, req = 0, step = 'figures';
  const smooth = () => (reduced() ? 'auto' : 'smooth');
  const api = { band: null, fpsFooter: [], measure: () => { if (shown) measure(); }, onSelect, get figure() { return figure; }, get pending() { return teasing || !playable(figure); }, get unfolded() { return open; }, visible, toLevels: () => nextStep() };

  const scrolling = stripScroll(strip, win, reduced);
  const townScrolling = stripScroll(towns, win, reduced);
  let stripLimit = 0, restWidth = Infinity; // restWidth: what the folded pills add to the header row once opened (unknown until they were shown)
  function updateArrows() { // the selection's neighbours, not the scroll position: the centring padding is never «more»
    const available = visibleCards(), i = available.indexOf(cards[cur]), fits = $('select-carousel').hasAttribute('data-fits');
    $('select-prev').disabled = fits || i <= 0;
    $('select-forward').disabled = fits || i < 0 || i >= available.length - 1;
  }
  const centre = (row, el, behavior = smooth()) => { // both rows share one bounded motion (native smooth scrolling grows with the distance)
    const clip = row === strip ? parseFloat(strip.style.getPropertyValue?.('--strip-clip')) || 0 : 0; // the strip's box is constant: its left `clip` px (under the info column) are clipped, not cut off
    let left = el.offsetLeft - clip - (row.clientWidth - clip - el.offsetWidth) / 2;
    if (clip && !later.includes(el) && el.offsetLeft + el.offsetWidth <= row.clientWidth) left = Math.min(left, 0); // a live card in view at rest stays: centring it slid Valls's banner under the column's clip
    if (row === strip) scrolling.to(left, behavior !== 'smooth', closing ? finishFold : null);
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
    // Only the panel coming in is rewritten: the other one fades out as it was (select.css).
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
    if (closing) { scrolling.stop(); finishFold(); } // the action is valid as soon as the playable selection commits
    sfx('menu'); setStep('level');
    if (keyboard()) levels.children[level].focus({ preventScroll: true });
  }
  // the last answer per figure and owner (memory only): shown again while the board is asked, so a figure change moves and
  // rewrites nothing when the place has not changed (Marc: «Classificació» then «Posició …» flashed on each change)
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
    level = l; levels.toggleAttribute('data-quiet', by === 'open'); // only a tap shakes (Marc; select.css)
    for (const b of levels.children) b.setAttribute('aria-pressed', String(Number(b.dataset.level) === l));
    levelStats(); // step 2's row (level-stats.js)
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
    flip.snap(shown); revealItems(false); // snap before the hidden items re-lay the strip: measure()'s own snap would read it already moved
    if (shown) { measure(); if (header) moveHeader(header); else if (reduced()) for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); }
  }
  // The collapsed towns can fit beside the corner buttons. Preserve their painted position across
  // that one layout change, then move on the compositor; the first pill also accounts for centring.
  function headerPositions() {
    return [towns, $('select-info')].map(el => ({ el, rect: (el === towns ? pills[0] : el).getBoundingClientRect() }));
  }
  function moveHeader(before) {
    const zoom = parseFloat(win.getComputedStyle?.(root).zoom) || 1;
    for (const { el, rect } of before) {
      arrivals.get(el)?.cancel();
      const after = (el === towns ? pills[0] : el).getBoundingClientRect();
      const x = (rect.left - after.left) / zoom, y = (rect.top - after.top) / zoom;
      if (!reduced() && el.animate && (Math.abs(x) > 1 || Math.abs(y) > 1)) {
        arrivals.set(el, el.animate({ transform: [`translate(${x}px, ${y}px)`, 'translate(0, 0)'] }, { duration: FOLD_MS, easing: 'ease-in-out', fill: 'backwards' }));
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
      fold.setAttribute('aria-expanded', String(open)); fold.setAttribute('aria-label', open ? tr('ui.select.foldHide') : foldLabel);
      soonPill?.setAttribute('aria-expanded', String(open));
      if (text) text.textContent = tr(open ? 'ui.select.hide' : 'ui.select.soon');
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
      // flip.play() (from the fold card) already fades in what it shows after its slides: a second fade on top ended first and blinked them out
      if (!reduced()) for (const el of items) if (el.animate && onScreen(el)) arrivals.set(el, el.getAnimations?.()[0] ?? el.animate({ opacity: [0, 1] }, { duration: 180 }));
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
      // No start time: the fades start at their first painted frame. Timed from the click, the re-layout's slow first frame (~150 ms)
      // ate most of them, so the catalogue jumped to a quarter and vanished.
      if (movingTowns) {
        townScrolling.to(0, true);
        moveHeader(foldingHeader);
        townExit.animation = townExit.layer.animate({ opacity: [1, 0] }, { duration: FOLD_MS, fill: 'forwards', easing: 'ease-in-out' });
      }
      const fade = new Set(reduced() ? [] : exiting.filter(el => el.animate && onScreen(el))); for (const el of exiting) { // every read before the first cancel: each one restyles
        arrivals.get(el)?.cancel();
        if (fade.has(el)) {
          arrivals.set(el, el.animate({ opacity: [1, 0] }, { duration: FOLD_MS, fill: 'forwards', easing: 'ease-in-out' }));
        }
      }
      // The rows' timed scroll (whose end removes the items) starts with the fades, once they are ready
      const go = () => { if (!closing || open) return; if (!movingTowns) townScrolling.to(townDestination, false, null, FOLD_MS); scrolling.to(destination, false, finishFold, FOLD_MS); };
      const first = townExit?.animation ?? exiting.map(el => arrivals.get(el)).find(Boolean);
      if (first?.ready) first.ready.then(go, () => {}); else go();
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
  const corner = ['free', 'music', 'settings'].map($).filter(Boolean);
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
      figure = next; opening = !settling; info(); setLevel(rememberedLevel(store, figure.id), 'open'); opening = false; // one fit after one measure, as visible()
      if (how !== 'fold') mark(figure.town, how === 'arrow' ? 'instant' : smooth());
      if (playable(figure)) { lastPlayable = figure; api.onSelect(figure); } // pending figures never replace the song/model state
      if (!settling) { measure(); levelStats(); }
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
  strip.addEventListener('pointerdown', () => { if (!closing) scrolling.stop(); });
  for (const type of ['pointerdown', 'wheel']) towns.addEventListener(type, () => { if (!closing) townScrolling.stop(); }, { passive: true }); // a hand on the pills wins
  $('select-next').addEventListener('click', nextStep);
  $('select-figures-back').addEventListener('click', () => { setStep('figures'); api.refocus(); });
  $('select-play').addEventListener('click', play);
  $('select-howto').addEventListener('click', () => { if (playable(figure)) onHowto(); });
  $('aviat-write').addEventListener('click', () => { if (teasing) onWrite(''); else if (!playable(figure)) onWrite(figure.invite ? INVITE_DRAFT : aviatDraft(figure, townOf(figure).name)); });

  win.addEventListener('keydown', e => {
    if (e.defaultPrevented || !shown || busy() || e.altKey || e.ctrlKey || e.metaKey) return;
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

  function measure() { flip.snap(shown, true); // her free band (css px): under the info block, or (info at the side) under the pills; above the strip
    const r = el => el.getBoundingClientRect(), side = win.innerWidth >= 900 || win.innerHeight <= 500;
    const z = parseFloat(win.getComputedStyle?.(root).zoom) || 1, px = v => `${v / z}px`; // big desktops zoom the layer: rects are screen px, its CSS isn't
    // header: logo left, corner buttons right; the towns fit between (asymmetric gutter: a symmetric one dropped them on an iPad) or get their own row
    const logo = [...root.querySelectorAll('.sel-logo')].map(r).filter(b => b.width > 0), right = corner.filter(el => !el.hidden).map(r).filter(b => b.width > 0);
    const oneLine = Boolean(root.querySelector('.sel-logo-line')?.getClientRects().length); // desktops: the one-line logo, the towns always on their own row below it
    // The header must not change with the fold (the info block under it would jump): decide on the unfolded row, the folded pills' width remembered from when they showed.
    if (restPills.length && restPills.every(pill => !pill.hidden)) restWidth = restPills.reduce((width, pill) => width + r(pill).width, 0); // (the gaps are in `needed` already: it counts every pill)
    const needed = bar.reduce((width, pill) => width + r(pill).width, 0) + GAPS.get(towns) * z * (bar.length - 1)  + (restPills.some(pill => pill.hidden) ? restWidth : 0);
    const gutterL = Math.max(0, ...logo.map(b => b.right)) + 24, gutterR = Math.max(0, ...right.map(b => win.innerWidth - b.left)) + 24;
    const inline = Boolean(!oneLine && right.length && win.innerWidth - gutterL - gutterR >= needed);
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
    // Desktops: the first banner never starts left of the narrowest info column + 12 (Marc: the column ends at most there): 308, or
    // 410 from 1200 px (the board card keeps its %: > 400 px, select.css), 530 from 1280 (its foot keeps one line, ~492 px, ~512 with a 7-digit gap; Marc, 2026-10-21);
    // a centred strip that would (under ~1180 px) moves right instead, as far as it must. Set before peek(): its room starts there.
    const desk = win.innerWidth >= 900 && win.innerHeight >= 600, narrowest = win.innerWidth >= 1280 ? 530 : win.innerWidth >= 1200 ? 410 : 308, flag = strip.querySelector('.sel-banner');
    // Fine-pointer desktops: the strip's box starts right of the info column (below), so its cards never scroll under the column
    // and its empty part never covers the ranking's names. Laid out full width first: the column's width comes from that rest place.
    const boxed = desk && Boolean(win.matchMedia?.('(pointer: fine)').matches);
    root.style.setProperty('--strip-x', '0px'); strip.style.removeProperty?.('--strip-clip');
    const shift = desk && flag?.offsetParent ? (($('select-info').hidden ? 0 : r($('select-info')).left) - r(strip).left) / z + narrowest + 12 - (flag.offsetLeft - (parseFloat(win.getComputedStyle?.(strip).paddingLeft) || 0)) : 0;
    strip.style.setProperty('--strip-l', `${shift}px`);
    // Reserve the expanded header row even while towns fit inline: folding must not move the contact card.
    peek();
    // The live group keeps its centred origin when the catalog opens. Only scrollLeft moves the cards.
    const base = [...strip.children].filter(el => !later.includes(el));
    const style = win.getComputedStyle?.(strip), gap = parseFloat(style?.gap) || 8;
    const width = base.reduce((sum, el) => {
      const css = win.getComputedStyle?.(el);
      return sum + el.offsetWidth + (parseFloat(css?.marginLeft) || 0) + (parseFloat(css?.marginRight) || 0);
    }, 0) + gap * Math.max(0, base.length - 1);
    const cw = $('select-carousel').clientWidth, centred = Math.max(0, (cw - width) / 2), left = Math.max(centred, shift);
    strip.style.setProperty('--strip-inset', `${centred}px`);
    strip.style.setProperty('--strip-l', `${left}px`); strip.style.setProperty('--strip-r', `${Math.max(0, cw - width - left)}px`);
    stripLimit = Math.max(0, Math.min(rowEdge(strip), strip.scrollWidth) - strip.clientWidth);
    $('select-carousel').toggleAttribute('data-fits', stripLimit <= 1);
    updateArrows();
    // The arrow group stands above the strip while it overflows (none on touch): her band and a pending card keep clear of it.
    const nav = stripLimit > 1 ? ($('select-nav').offsetHeight || 0) * z : 0;
    // Desktops: the info column ends 12 px before the strip's first banner (Marc), at its rest place (offsetLeft: the centring,
    // not the scroll), never under a 300 px panel; long names wrap. Step 2 hides the strip: the column keeps its width.
    if (flag && desk) { if (flag.offsetParent) root.style.setProperty('--info-w', px(Math.max(narrowest * z, r(strip).left + flag.offsetLeft * z - 12 * z - r($('select-info')).left))); }
    else root.style.removeProperty?.('--info-w');
    if (desk) root.style.setProperty('--info-floor', `${narrowest}px`); else root.style.removeProperty?.('--info-floor');
    // Step 1, fine-pointer desktops: no card sits under the column (boxed, below), only the action row may. The column ends 12 px
    // before its buttons when it stays as wide as `narrowest` and the card keeps its % (Marc,
    // 2026-10-21: «no estretis tant») and then runs down to the foot; else down to 12 px above them.
    // select-standings.js fills what this gives (step 2: levelStats()).
    if (step !== 'level') {
      const was = root.style.getPropertyValue?.('--info-dock') ?? '';
      if (boxed) {
        const drop = r(dock).top - dockTop, info = r($('select-info')); // drop: a pending figure's transform, the buttons at rest
        const btns = [r($('select-next'))].filter(b => b.width);
        const edge = Math.min(...btns.map(b => b.left)) - 12 * z;
        if (edge < info.right && edge - info.left >= Math.max(narrowest, 410) * z) root.style.setProperty('--info-w', px(edge - info.left));
        const under = btns.filter(b => b.left - 12 * z < r($('select-info')).right).map(b => b.top - drop);
        root.style.setProperty('--info-dock', under.length ? px(r(root).bottom - Math.min(...under) + 6 * z) : '50px');
      } else root.style.removeProperty?.('--info-dock');
      if ((root.style.getPropertyValue?.('--info-dock') ?? '') !== was) facts.fit();
    }
    if (boxed && flag?.offsetParent) { // the same rest place inside a box from the column's edge + 12: its room (peek()'s gap) and stripLimit are unchanged
      // A hidden column (pending figure) keeps its old rect for its 220 ms display fade, and the observer may skip the refit: ignore it.
      const x = $('select-info').hidden ? 12 : Math.max(0, (r($('select-info')).right - r(strip).left) / z + 12);
      const x0 = Math.min(x, 12); root.style.setProperty('--strip-x', `${x0}px`); strip.style.setProperty('--strip-clip', `${x - x0}px`); strip.style.setProperty('--strip-l', `${Math.max(0, left - x0)}px`);
    }
    root.style.setProperty('--nav-x', px(navX(win, towns, $('select-carousel'), z))); // the arrows stand at the screen's middle, whatever the info column or the dock does (clear of the pills)
    const info = r($('select-info')); // the camera's free rect (cameras.js frameMenuLens): hardTop = the pills' floor (she may rise behind the info's lower rows), a side panel takes the left
    api.band = { top: side ? townsBottom : info.bottom, bottom: dockTop - nav, hardTop: townsBottom, left: side ? info.right : 0, right: win.innerWidth };
    // Use the strip's final layout position, including its painted top gutter. CSS subtracts
    // --drop so touch reserves the lowered dock without reading its animated transform.
    const stripTop = dockTop + r(strip).top - r(dock).top;
    const pendingEnd = nav ? dockTop + r($('select-nav')).top - r(dock).top : stripTop + Math.min(...base.map(el => el.offsetTop)) * z;
    root.style.setProperty('--pending-rest-bottom', px(Math.max(0, r(root).height - pendingEnd) + 12 * z));
    if (!pending.hidden) { fitEntityLabel($('aviat-entity')); fitPendingTitle($('aviat-title'), win); }
    // Cached action bounds for diagnostic overlays; no frame-loop layout reads.
    api.fpsFooter = ['select-figures-back', 'select-next', 'select-play'].map($).filter(el => !el.hidden).map(r); flip.play();
    measured = sizes(); // what the observer would report for this layout
  }
  const sizes = () => [$('select-info'), root].map(el => `${el.offsetWidth}x${el.offsetHeight}`).join(); let measured = '';
  win.addEventListener('resize', () => { if (shown) { scrolling.stop(); if (closing) finishFold(); for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); if (teasing) teaserFill(); levelStats(); measure(); if (step === 'figures') centre(strip, cards[cur], 'instant'); } });
  if (win.ResizeObserver) {
    // a hint closing or the viewport settling: the level row fits again; not measure()'s own layout (a figure change's: a second long task)
    const observer = new win.ResizeObserver(() => { if (shown && !facts.fading && sizes() !== measured) { levelStats(); measure(); } });
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
