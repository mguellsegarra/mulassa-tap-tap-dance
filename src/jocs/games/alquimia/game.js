import { COPY } from './copy.js';
import { blip } from './sound.js';
import { rulesFor } from './rules.js';
import { iconHtml, tintOf } from './icons.js';
import { startFx } from './fx.js';
import { restoreHints, refreshHints, requestHint, hintView, seen } from './hints.js';

const T = COPY.alquimia;
const NUDGE_AFTER = 4, NUDGE_AFTER_LATE = 8; // tries in a row without a discovery before the hint button glows
const LAST_STRETCH = 12; // elements left when the nudge starts to wait longer
const FLY_MS = 200, MIX_MS = 380, REVEAL_MS = 750;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="#fff2d5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CAULDRON = `<svg viewBox="0 0 120 92" aria-hidden="true">
  <defs>
    <linearGradient id="alq-iron" x1="0" x2="1"><stop offset="0" stop-color="#17131a"/><stop offset=".35" stop-color="#4a4152"/><stop offset="1" stop-color="#17131a"/></linearGradient>
    <radialGradient id="alq-brew"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".6" stop-color="#ff9d3c"/><stop offset="1" stop-color="#b8451c"/></radialGradient>
  </defs>
  <path d="M6 22q-6 10 6 16M114 22q6 10-6 16" fill="none" stroke="#2b2530" stroke-width="5"/>
  <path d="M10 24h100c2 34-14 58-50 58S8 58 10 24z" fill="url(#alq-iron)"/>
  <ellipse cx="60" cy="24" rx="52" ry="12" fill="#2b2530"/>
  <ellipse cx="60" cy="25" rx="44" ry="8.5" fill="url(#alq-brew)"/>
  <circle class="bub b1" cx="42" cy="25" r="3" fill="#fff2d5"/><circle class="bub b2" cx="62" cy="26" r="2.5" fill="#fff2d5"/><circle class="bub b3" cx="80" cy="24" r="3" fill="#fff2d5"/>
  <path d="M6 24a54 13 0 0 0 108 0" fill="none" stroke="#e3bf62" stroke-width="3"/>
  <path d="M34 80l-6 10M86 80l6 10" stroke="#17131a" stroke-width="7" stroke-linecap="round"/>
</svg>`;

const KEY = 'minijocs.alquimia.found';
const HINTS_KEY = 'minijocs.alquimia.hints';
const OLD_CATALANA_KEY = 'minijocs.alquimia.catalana'; // progress from when there were two collections
const stored = () => {
  const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch { return []; } };
  return [...new Set([...read(KEY), ...read(OLD_CATALANA_KEY)])];
};
const nameOf = id => T.items[id].name;
const orb = id => `<span class="orb">${iconHtml(id)}</span>`;
const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// The Mulassa logo, as in Tap Tap Dance: MULASSA in pixels on a dark extrusion, and the game's word under it, a piece per beat.
const SPARKS = [[-6, 22], [72, 96], [104, 18]]; // the word under MULASSA, still, with a few soft sparks around it: [x %, y %]
const logo = name => `<h1 class="alq-logo" aria-label="${name}"><span class="alq-logo-main" data-text="${name.split(' ')[0]}" aria-hidden="true">${name.split(' ')[0]}</span><span class="alq-logo-sub" aria-hidden="true">${name.split(' ')[1]}${SPARKS.map(([x, y], i) => `<i style="--i:${i};left:${x}%;top:${y}%"></i>`).join('')}</span></h1>`;

// Where the painted cauldron is, wherever the art ends up. Sizes and positions as in the CSS.
function menuCauldron() {
  const W = innerWidth, H = innerHeight, wide = matchMedia('(orientation: landscape)').matches;
  const [iw, ih, cx, cy, cw, fy, posX] = wide ? [1672, 941, 810, 620, 180, 850, .85] : [911, 1727, 225, 1020, 200, 1290, .5];
  const s = Math.max(W / iw, H / ih), left = (W - iw * s) * posX, top = (H - ih * s) / 2;
  return { x: left + cx * s, y: top + cy * s, w: cw * s, fireY: top + fy * s };
}

// The start menu.
export function start(root, leave) {
  let stopGame = null, stopMenu = null;
  const showMenu = () => {
    stopGame?.();
    stopGame = null;
    root.innerHTML = `<div class="alq alq-menu"><button class="alq-round alq-back" aria-label="${T.menu}">${BACK}</button>
      <div class="alq-menu-title">${logo(COPY.games.alquimia.name)}<p>${T.tagline}</p></div>
      <div class="alq-menu-actions"><button class="alq-btn alq-play">${stored().length ? T.continue : T.play}</button></div><canvas class="alq-fx"></canvas></div>`;
    stopMenu = startFx(root.querySelector('.alq-fx'), menuCauldron).stop;
    root.querySelector('.alq-back').onclick = () => { stopMenu(); leave(); };
    root.querySelector('.alq-play').onclick = () => { stopMenu(); stopGame = play(root, showMenu); };
  };
  showMenu();
  return () => { stopMenu?.(); stopGame?.(); };
}

function play(root, leave) {
  const rules = rulesFor(), { all: ALL, hint, ingredientsOf, isFinished, mix } = rules;
  const stillNew = pair => !!pair && mix(found, pair[0], pair[1]).isNew; // a hint is done once its result is found
  const load = () => rules.restore(stored());
  const factOf = id => T.items[id].fact;
  const recipeText = (id, r = ingredientsOf(id)) => (r ? `${nameOf(r[0])} + ${nameOf(r[1])}` : T.base);
  root.innerHTML = `<div class="alq"><div class="alq-col">
    <header class="alq-top">
      <button class="alq-round alq-back" aria-label="${T.menu}">${BACK}</button>
      <div class="alq-title">${logo(COPY.games.alquimia.name)}<div class="alq-bar"><i></i><span></span></div></div>
      <div class="alq-tools"><button class="alq-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="#ffd76a" stroke="#7a4a10" stroke-width="1.4"/><path d="M9.8 18.2h4.4M10.4 20.6h3.2" stroke="#efdcb0" stroke-width="1.8" stroke-linecap="round"/></svg><span></span></button>
      <button class="alq-round alq-book" aria-label="${T.book}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6C9.5 4.5 6.5 4 3 4v15c3.5 0 6.5.5 9 2 2.5-1.5 5.5-2 9-2V4c-3.5 0-6.5.5-9 2z" fill="#efdcb0" stroke="#7a4a10" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 6v15" stroke="#7a4a10" stroke-width="1.5"/></svg></button></div>
    </header>
    <section class="alq-scene">
      <button class="alq-slot" data-slot="0" aria-label="${T.clear}"></button>
      <div class="alq-pot">${CAULDRON}<div class="alq-flames"></div></div>
      <button class="alq-slot" data-slot="1" aria-label="${T.clear}"></button>
      <div class="alq-result" aria-live="polite"></div>
    </section>
    <p class="alq-msg" aria-live="polite"></p>
    <div class="alq-shelf"><div class="alq-grid"></div></div>
  </div><canvas class="alq-fx"></canvas><div class="overlay alq-overlay" style="display:none"></div></div>`;
  const $ = s => root.querySelector(s);
  const hintButton = $('.alq-hint'), slots = [$('[data-slot="0"]'), $('[data-slot="1"]')], resultBox = $('.alq-result'), grid = $('.alq-grid'), overlay = $('.alq-overlay'), msg = $('.alq-msg'), pot = $('.alq-pot');
  const fx = startFx($('.alq-fx'), () => { const r = pot.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .25, w: r.width * .6, fireY: r.bottom + 2 }; });
  let found = load(), picked = [], fails = 0, timer = 0, locked = false, hints = restoreHints(localStorage.getItem(HINTS_KEY), Date.now(), found.length);
  const saveHints = () => { if (!stillNew(hints.pair)) hints = { ...hints, pair: null }; localStorage.setItem(HINTS_KEY, JSON.stringify(hints)); };
  saveHints();

  const fill = (el, id) => { el.innerHTML = id ? `${orb(id)}<b>${nameOf(id)}</b>` : '<span class="orb empty">?</span>'; };
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };

  function renderGrid() {
    const wait = ALL.length - found.length <= LAST_STRETCH ? NUDGE_AFTER_LATE : NUDGE_AFTER;
    const pulse = hints.pair ?? [];
    hintButton.classList.toggle('nudge', fails >= wait && !hints.pair && found.length < ALL.length);
    renderHintButton();
    // Updated in place: rebuilding would re-decode every image on each tap, and flicker.
    for (const b of [...grid.children]) if (!found.includes(b.dataset.id)) b.remove();
    for (const id of found) {
      let b = grid.querySelector(`[data-id="${id}"]`);
      if (!b) {
        b = Object.assign(document.createElement('button'), { className: 'alq-item', innerHTML: `${orb(id)}<b>${nameOf(id)}</b>` });
        b.dataset.id = id;
        grid.append(b);
      }
      b.classList.toggle('done', isFinished(found, id) && !picked.includes(id));
      b.classList.toggle('on', picked.includes(id));
      b.classList.toggle('hint', pulse.includes(id));
    }
    $('.alq-bar span').textContent = T.count(found.length, ALL.length);
    $('.alq-bar i').style.width = `${found.length / ALL.length * 100}%`;
  }

  function clearMix() {
    clearTimeout(timer);
    picked = [];
    slots.forEach(s => { s.classList.remove('into'); fill(s); });
    fill(resultBox);
    resultBox.classList.remove('up');
    pot.classList.remove('boil', 'burp');
    msg.textContent = hints.pair ? T.hintTry(nameOf(hints.pair[0]), nameOf(hints.pair[1])) : T.how;
    renderGrid();
  }

  // The pill: how many hints are left, or infinite while they are free.
  function renderHintButton() {
    const v = hintView(hints, Date.now());
    hintButton.lastChild.textContent = v.free ? '∞' : v.credits;
    hintButton.setAttribute('aria-label', v.free ? T.hintFree : T.hintLeft(v.credits));
  }
  const waitText = ms => { const m = Math.ceil(ms / 60e3); return T.hintWait(Math.floor(m / 60), m % 60); };
  function askHint() {
    if (locked) return;
    const r = requestHint(hints, hint(found), Date.now(), found.length);
    hints = r.state;
    saveHints();
    if (r.pair) { fails = 0; clearMix(); return; }
    msg.textContent = r.status === 'empty' ? T.hintEmpty(waitText(hintView(hints, Date.now()).remainingMs)) : T.hintNone;
    renderGrid();
  }

  // The tapped element flies to its slot.
  function fly(from, to) {
    if (reduced || !from) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const ghost = from.cloneNode(true);
    ghost.classList.add('alq-ghost');
    Object.assign(ghost.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    ghost.style.setProperty('--orb', `${b.width}px`);
    $('.alq').append(ghost);
    const dx = a.left + a.width / 2 - b.left - b.width / 2, dy = a.top + a.height / 2 - b.top - b.height / 2;
    ghost.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width})` }, { transform: 'none' }], { duration: FLY_MS, easing: 'ease-in' }).onfinish = () => ghost.remove();
  }

  function pick(id, el) {
    if (locked) return;
    if (picked.length === 2) clearMix();
    const slot = slots[picked.length];
    fly(el?.querySelector('.orb'), slot.querySelector('.orb'));
    picked.push(id);
    fill(slot, id);
    if (!reduced) slot.animate([{ opacity: 0 }, { opacity: 0, offset: .99 }, { opacity: 1 }], FLY_MS);
    blip(440 + picked.length * 110, 60);
    renderGrid();
    if (picked.length === 2) { locked = true; later(brew, reduced ? 0 : FLY_MS); }
  }

  // Both elements drop into the cauldron; what comes out depends on the recipe.
  function brew() {
    const c = center(pot);
    slots.forEach(s => {
      const o = center(s.querySelector('.orb'));
      s.style.setProperty('--dx', `${c.x - o.x}px`);
      s.style.setProperty('--dy', `${c.y - o.y}px`);
      s.classList.add('into');
    });
    pot.classList.add('boil');
    blip(220, 200, 'sine');
    later(reveal, reduced ? 0 : MIX_MS);
  }

  function reveal() {
    const { result, isNew } = mix(found, picked[0], picked[1]);
    const c = center(pot);
    pot.classList.remove('boil');
    if (!result) {
      fails++;
      locked = false;
      pot.classList.add('burp');
      fx.puff(c.x, c.y - 20);
      msg.textContent = T.nothing;
      blip(180, 160);
      renderGrid();
      later(clearMix, 900);
      return;
    }
    fill(resultBox, result);
    resultBox.classList.add('up');
    fx.burst(c.x, c.y - 20);
    if (!isNew) {
      fails++;
      locked = false;
      msg.textContent = T.known;
      blip(520, 90);
      renderGrid();
      later(clearMix, 1100);
      return;
    }
    fails = 0;
    msg.textContent = T.fresh;
    const pair = picked.slice();
    found.push(result);
    localStorage.setItem(KEY, JSON.stringify(found));
    hints = seen(hints, found.length);
    saveHints();
    localStorage.removeItem(OLD_CATALANA_KEY);
    [523, 659, 784].forEach((n, i) => setTimeout(() => blip(n, 140), i * 90));
    renderGrid();
    grid.scrollTop = grid.scrollHeight; // scrollIntoView can also shift the fixed page on iOS
    later(() => { locked = false; showFound(result, pair); }, REVEAL_MS);
  }

  function showOverlay(html, tint = null) {
    overlay.innerHTML = html;
    overlay.style.setProperty('--tint', tint ?? '#ffd76a');
    overlay.style.display = '';
    fx.embers(false);
  }
  const closeOverlay = () => { overlay.style.display = 'none'; overlay.innerHTML = ''; fx.embers(true); };

  function showFound(id, pair) {
    const fact = factOf(id), done = found.length === ALL.length;
    showOverlay(`<div class="alq-rays"></div><div class="alq-found">
      <h2>${nameOf(id)}</h2>${orb(id)}<p class="alq-recipe">${recipeText(id, pair)}</p>
      ${fact || done ? `<div class="alq-parch">${fact ? `<p>${fact}</p>` : ''}${done ? `<p><strong>${T.allFound}</strong></p>` : ''}</div>` : ''}
      <button class="alq-btn" data-act="go">${T.go}</button></div>`, tintOf(id));
    overlay.querySelector('[data-act="go"]').focus({ preventScroll: true });
    // offsets, not rects: the card is still animating in
    const card = overlay.querySelector('.alq-found'), big = card.querySelector('.orb');
    const y = card.offsetTop + big.offsetTop + big.offsetHeight / 2;
    overlay.querySelector('.alq-rays').style.top = `${y}px`;
    fx.burst(innerWidth / 2, y);
  }

  function showBook(armed = false) {
    const missing = ALL.length - found.length;
    const entries = found.map(id => {
      const fact = factOf(id);
      return `<div class="alq-entry">${orb(id)}<div><strong>${nameOf(id)}</strong><small>${recipeText(id)}</small>${fact ? `<p>${fact}</p>` : ''}</div></div>`;
    }).join('');
    showOverlay(`<div class="alq-sheet"><h2>${T.book}</h2><div class="alq-list">${entries}</div>
      ${missing ? `<p class="alq-missing">${T.missing(missing)}</p>` : ''}
      <div class="alq-actions"><button class="alq-btn alt" data-act="${armed ? 'reset' : 'arm'}">${armed ? T.resetSure : T.reset}</button><button class="alq-btn" data-act="go">${T.go}</button></div></div>`);
  }

  hintButton.onclick = askHint;
  // Hints come back while the game is open, or in the background.
  const tick = () => { hints = refreshHints(hints, Date.now()); saveHints(); renderHintButton(); };
  const ticker = setInterval(tick, 30e3);
  document.addEventListener('visibilitychange', tick);
  grid.onclick = e => { const b = e.target.closest('[data-id]'); if (b) pick(b.dataset.id, b); };
  slots.forEach(s => { s.onclick = () => { if (!locked) clearMix(); }; });
  $('.alq-back').onclick = leave;
  $('.alq-book').onclick = () => { if (!locked) showBook(); };
  overlay.onclick = e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'go') { closeOverlay(); clearMix(); }
    if (act === 'arm') showBook(true);
    if (act === 'reset') {
      localStorage.removeItem(KEY);
      localStorage.removeItem(OLD_CATALANA_KEY);
      found = load(); fails = 0;
      hints = { ...hints, pair: null }; // the store and the end of the free start stay
      saveHints();
      closeOverlay(); clearMix();
    }
  };

  clearMix();
  return () => { clearTimeout(timer); clearInterval(ticker); document.removeEventListener('visibilitychange', tick); fx.stop(); };
}
