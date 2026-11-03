import { COPY } from './copy.js';
import { blip } from './sound.js';
import { rulesFor } from './rules.js';
import { COLLECTIONS } from './collections.js';
import { iconHtml, CAULDRON } from './icons.js';
import { startFx } from './fx.js';

const T = COPY.alquimia;
const HINT_AFTER = 4, HINT_AFTER_LATE = 8; // tries in a row without a discovery
const LAST_STRETCH = 12; // elements left when the hint starts to wait longer
const FLY_MS = 200, MIX_MS = 380, REVEAL_MS = 750;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// One list for every collection: what you discover counts wherever it exists.
const KEY = 'minijocs.alquimia.found';
const LAST_KEY = 'minijocs.alquimia.last';
const OLD_CATALANA_KEY = 'minijocs.alquimia.catalana'; // separate progress, for a short while
const stored = () => {
  const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch { return []; } };
  return [...new Set([...read(KEY), ...read(OLD_CATALANA_KEY)])];
};
const loadFound = rules => rules.restore(stored());
const nameOf = id => T.items[id].name;
const orb = id => `<span class="orb">${iconHtml(id)}</span>`;
const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// Where the painted cauldron is, wherever the art ends up. Sizes and positions as in the CSS.
function menuCauldron() {
  const W = innerWidth, H = innerHeight, wide = matchMedia('(orientation: landscape)').matches;
  const [iw, ih, cx, cy, cw, fy, posX] = wide ? [1672, 941, 810, 620, 180, 850, .85] : [911, 1727, 225, 1020, 200, 1290, .5];
  const s = Math.max(W / iw, H / ih), left = (W - iw * s) * posX, top = (H - ih * s) / 2;
  return { x: left + cx * s, y: top + cy * s, w: cw * s, fireY: top + fy * s };
}

// The start menu, and the choice of collection.
export function start(root, leave) {
  let stopGame = null, stopMenu = null;
  const leaveMenu = () => { stopMenu?.(); stopMenu = null; };
  const showMenu = () => {
    const played = stored().length > 0;
    root.innerHTML = `<div class="alq alq-menu"><button class="alq-round alq-back" aria-label="${T.menu}">‹</button>
      <div class="alq-menu-title"><h1>${COPY.games.alquimia.name}</h1><p>${T.tagline}</p></div>
      <div class="alq-menu-actions"><button class="alq-btn alq-play">${played ? T.continue : T.play}</button>${played ? `<button class="alq-btn alt alq-to-colls">${T.collectionsButton}</button>` : ''}</div><canvas class="alq-fx"></canvas></div>`;
    root.querySelector('.alq-back').onclick = () => { leaveMenu(); leave(); };
    stopMenu = startFx(root.querySelector('.alq-fx'), menuCauldron).stop;
    root.querySelector('.alq-play').onclick = () => {
      if (!played) return showCollections();
      leaveMenu();
      // games from before this was remembered: the big collection has everything they found
      openCollection(COLLECTIONS.find(c => c.id === localStorage.getItem(LAST_KEY)) ?? COLLECTIONS.at(-1));
    };
    if (played) root.querySelector('.alq-to-colls').onclick = showCollections;
  };
  const openCollection = col => {
    localStorage.setItem(LAST_KEY, col.id);
    stopGame = play(root, col, showCollections);
  };
  const showCollections = () => {
    leaveMenu();
    stopGame?.();
    stopGame = null;
    const cards = COLLECTIONS.map(col => {
      const rules = rulesFor(col.recipes), n = loadFound(rules).length, total = rules.all.length;
      return `<button class="alq-coll" data-col="${col.id}"><img src="${col.art}" alt="" draggable="false"><span class="alq-coll-body"><b>${T.collectionNames[col.id]}</b><span class="alq-coll-count">${T.count(n, total)}</span><span class="alq-meter"><i style="width:${n / total * 100}%"></i></span></span></button>`;
    }).join('');
    root.innerHTML = `<div class="alq alq-picker"><div class="alq-col"><header class="alq-top"><button class="alq-round alq-back" aria-label="${T.menu}">‹</button><div class="alq-title"><h1>${T.collections}</h1></div><span></span></header><p class="alq-help">${T.collectionsHelp}</p><div class="alq-colls">${cards}</div></div></div>`;
    root.querySelector('.alq-back').onclick = showMenu;
    root.querySelector('.alq-colls').onclick = e => {
      const id = e.target.closest('[data-col]')?.dataset.col;
      if (id) openCollection(COLLECTIONS.find(c => c.id === id));
    };
  };
  showMenu();
  return () => { leaveMenu(); stopGame?.(); };
}

function play(root, col, leave) {
  const rules = rulesFor(col.recipes), { all: ALL, chapters, chapterOf, openChapters, hint, ingredientsOf, mix } = rules;
  const load = () => loadFound(rules);
  const factOf = id => (col.hidesFact(id) ? null : T.items[id].fact);
  const recipeText = id => { const r = ingredientsOf(id); return r ? `${nameOf(r[0])} + ${nameOf(r[1])}` : T.base; };
  root.innerHTML = `<div class="alq"><div class="alq-col">
    <header class="alq-top">
      <button class="alq-round alq-back" aria-label="${T.menu}">‹</button>
      <div class="alq-title"><h1>${COPY.games.alquimia.name}</h1><div class="alq-bar"><i></i><span></span></div></div>
      <button class="alq-round alq-book" aria-label="${T.book}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6C9.5 4.5 6.5 4 3 4v15c3.5 0 6.5.5 9 2 2.5-1.5 5.5-2 9-2V4c-3.5 0-6.5.5-9 2z" fill="#efdcb0" stroke="#7a4a10" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 6v15" stroke="#7a4a10" stroke-width="1.5"/></svg></button>
    </header>
    <section class="alq-scene">
      <button class="alq-slot" data-slot="0" aria-label="${T.clear}"></button>
      <div class="alq-pot">${CAULDRON}<div class="alq-flames"></div></div>
      <button class="alq-slot" data-slot="1" aria-label="${T.clear}"></button>
      <div class="alq-result" aria-live="polite"></div>
    </section>
    <p class="alq-msg" aria-live="polite"></p>
    <div class="alq-shelf"><div class="alq-tabs"></div><p class="alq-empty">${T.chapterEmpty}</p><div class="alq-grid"></div></div>
  </div><canvas class="alq-fx"></canvas><div class="overlay alq-overlay" style="display:none"></div></div>`;
  const $ = s => root.querySelector(s);
  const slots = [$('[data-slot="0"]'), $('[data-slot="1"]')], resultBox = $('.alq-result'), grid = $('.alq-grid'), overlay = $('.alq-overlay'), msg = $('.alq-msg'), pot = $('.alq-pot'), tabs = $('.alq-tabs');
  const fx = startFx($('.alq-fx'), () => { const r = pot.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .25, w: r.width * .6, fireY: r.bottom + 2 }; });
  let found = load(), picked = [], fails = 0, timer = 0, locked = false, tab = Math.max(...found.map(chapterOf)), newChapter = null;
  tabs.innerHTML = chapters.map((_, i) => `<button class="alq-tab" data-ch="${i}"><b>${T.chapterNames[i]}</b><small></small></button>`).join('');

  const fill = (el, id) => { el.innerHTML = id ? `${orb(id)}<b>${nameOf(id)}</b>` : '<span class="orb empty">?</span>'; };
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };

  function renderGrid() {
    const wait = ALL.length - found.length <= LAST_STRETCH ? HINT_AFTER_LATE : HINT_AFTER;
    const pulse = fails >= wait ? hint(found) ?? [] : [];
    const open = openChapters(found);
    for (const b of tabs.children) {
      const i = Number(b.dataset.ch), list = chapters[i];
      b.disabled = i >= open;
      b.classList.toggle('on', i === tab);
      b.classList.toggle('hint', pulse.some(id => chapterOf(id) === i) && i !== tab);
      b.lastChild.textContent = i < open ? T.count(list.filter(id => found.includes(id)).length, list.length) : '?';
    }
    // Updated in place: rebuilding would re-decode every image on each tap, and flicker.
    for (const b of [...grid.children]) if (!found.includes(b.dataset.id)) b.remove();
    for (const id of found) {
      let b = grid.querySelector(`[data-id="${id}"]`);
      if (!b) {
        b = Object.assign(document.createElement('button'), { className: 'alq-item', innerHTML: `${orb(id)}<b>${nameOf(id)}</b>` });
        b.dataset.id = id;
        grid.append(b);
      }
      b.hidden = chapterOf(id) !== tab;
      b.classList.toggle('on', picked.includes(id));
      b.classList.toggle('hint', pulse.includes(id));
    }
    // A chapter starts empty: its first element comes from what the earlier ones gave.
    $('.alq-empty').hidden = chapters[tab].some(id => found.includes(id));
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
    msg.textContent = newChapter === null ? T.how : T.chapterOpen(T.chapterNames[newChapter]);
    newChapter = null;
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
    const { result, isNew, laterChapter } = mix(found, picked[0], picked[1]);
    const c = center(pot);
    pot.classList.remove('boil');
    if (!result) {
      fails++;
      locked = false;
      pot.classList.add('burp');
      fx.puff(c.x, c.y - 20);
      msg.textContent = laterChapter === undefined ? T.nothing : T.laterChapter(T.chapterNames[laterChapter]);
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
    const openBefore = openChapters(found);
    found.push(result);
    if (openChapters(found) > openBefore) newChapter = openBefore;
    tab = chapterOf(result);
    // keeps what only the other collection has
    localStorage.setItem(KEY, JSON.stringify([...new Set([...stored(), ...found])]));
    localStorage.removeItem(OLD_CATALANA_KEY);
    [523, 659, 784].forEach((n, i) => setTimeout(() => blip(n, 140), i * 90));
    renderGrid();
    grid.scrollTop = grid.scrollHeight; // scrollIntoView can also shift the fixed page on iOS
    later(() => { locked = false; showFound(result); }, REVEAL_MS);
  }

  function showOverlay(html) {
    overlay.innerHTML = html;
    overlay.style.display = '';
    fx.embers(false);
  }
  const closeOverlay = () => { overlay.style.display = 'none'; overlay.innerHTML = ''; fx.embers(true); };

  function showFound(id) {
    const fact = factOf(id), done = found.length === ALL.length;
    showOverlay(`<div class="alq-rays"></div><div class="alq-found">
      <h2>${nameOf(id)}</h2>${orb(id)}<p class="alq-recipe">${recipeText(id)}</p>
      ${fact || done ? `<div class="alq-parch">${fact ? `<p>${fact}</p>` : ''}${done ? `<p><strong>${T.allFound}</strong></p>` : ''}</div>` : ''}
      <button class="alq-btn" data-act="go">${T.go}</button></div>`);
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

  tabs.onclick = e => {
    const b = e.target.closest('[data-ch]');
    if (!b || b.disabled) return;
    tab = Number(b.dataset.ch);
    renderGrid();
    grid.scrollTop = 0;
  };
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
      localStorage.removeItem(LAST_KEY);
      found = load(); fails = 0; tab = 0;
      closeOverlay(); clearMix();
    }
  };

  clearMix();
  return () => { clearTimeout(timer); fx.stop(); };
}
