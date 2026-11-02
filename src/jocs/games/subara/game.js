import { COPY as T } from './copy.js';
import { blip } from './sound.js';
import { newVila, merge, demolish, preview, pieceOf, rankOf, COLS, ROWS } from './rules.js';
import { PIECES, VISITORS, HEIGHT, NAVY, CONVERGE, POP, FALL, easeInOut, bakePiece } from './art.js';
import { makePainter } from './board.js';

const BEST_KEY = 'jocs.subara.best';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function start(root, leave) {
  // padding only to read the safe area from the canvas code
  root.innerHTML = `<div class="stage" style="padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)"><canvas style="position:absolute;inset:0"></canvas><button class="back" style="background:${NAVY};border:3px solid #fff;color:#fff" aria-label="${T.menu}">‹</button><div class="overlay"></div></div>`;
  const stage = root.firstChild, canvas = stage.querySelector('canvas'), overlay = stage.querySelector('.overlay');
  const ctx = canvas.getContext('2d');
  stage.querySelector('.back').onclick = leave;
  let g = newVila(), raf = 0, last = 0, W = 0, H = 0, ended = true, finishTimer = 0, armTimer = 0, alive = true;
  let L = null, press = null, views = new Map(), gone = [], anim = null, flash = 0, quip = null, visitor = null, pieces = null;

  const best = () => Number(localStorage.getItem(BEST_KEY) ?? 0);

  function bake() {
    if (!L || !PIECES.every(i => i.complete && i.naturalWidth)) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    pieces = PIECES.map((img, i) => bakePiece(img, L.cw * HEIGHT[i], L.cw * .9, dpr));
  }

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(stage);
    const safeTop = parseFloat(css.paddingTop) || 0, safeBottom = parseFloat(css.paddingBottom) || 0;
    const margin = 8, gap = 4, hintH = 40;
    const cw = Math.floor((Math.min(W, 560) - margin * 2 + gap) / COLS);
    const panelH = Math.round(safeTop + 60);
    const free = H - panelH - safeBottom - hintH;
    const ch = Math.floor(Math.min(cw * 1.2, (free - cw * .75) / ROWS));
    const boardH = ch * ROWS;
    // room above for the towers, and the rest split evenly around the board
    const y = Math.round(panelH + cw * .75 + (free - cw * .75 - boardH) / 2);
    L = { x: Math.round((W - cw * COLS + gap) / 2), y, cw, ch, gap, boardH, panelH, cardY: safeTop + 8, hintY: y + boardH + (H - safeBottom - y - boardH) / 2, depth: Math.round(ch * .17) };
    bake();
  }
  Promise.all(PIECES.map(i => i.decode().catch(() => {}))).then(() => { if (alive) bake(); });

  const tile = (c, r) => ({ x: L.x + c * L.cw, y: L.y + r * L.ch });
  const cellAt = (px, py) => {
    const c = Math.floor((px - L.x) / L.cw), r = Math.floor((py - L.y) / L.ch);
    return c >= 0 && c < COLS && r >= 0 && r < ROWS ? [c, r] : null;
  };

  // Everything on the board sits still at its place until a move moves it.
  function placeAll() {
    views = new Map();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      views.set(g.grid[r][c].id, { ...tile(c, r), pop: 0, shake: 0, alpha: 1, held: null });
    }
  }

  function panel(title, text, buttons, image) {
    overlay.style.display = '';
    overlay.style.opacity = '';
    // a player still tapping must not hit a button that has just appeared
    overlay.style.pointerEvents = 'none';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { overlay.style.pointerEvents = ''; }, 500);
    const img = image ? `<img src="/jocs/subara/cards/${image}.webp" alt="" width="128" height="128" style="align-self:center">` : '';
    overlay.innerHTML = `<div class="panel" style="background:${NAVY};border:4px solid #fff">${img}<h2 style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:30px;color:#fff">${title}</h2>${text ? `<p style="color:#d6e4f2">${text}</p>` : ''}</div>`;
    for (const [name, fn, alt] of buttons) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.background = alt ? '#2d4f85' : '#0a7fb5';
      b.textContent = name;
      b.onclick = fn;
      overlay.firstChild.append(b);
    }
  }

  // The board under the home panel is the board you play: the panel fades and nothing else moves.
  function play() {
    if (g.years) { g = newVila(); placeAll(); }
    gone = [];
    press = null;
    anim = null;
    visitor = null;
    quip = null;
    ended = false;
    clearTimeout(armTimer);
    overlay.style.transition = reduced ? '' : 'opacity .2s';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => { if (!ended) overlay.style.display = 'none'; }, reduced ? 0 : 200);
  }

  function home() {
    ended = true;
    const b = best();
    panel(T.title, T.how + (b ? `<br>${T.best(b)}` : ''), [[T.play, play], [T.menu, leave, true]]);
  }

  function finish() {
    const b = best();
    if (g.score > b) localStorage.setItem(BEST_KEY, g.score);
    const rank = rankOf(g.score);
    const lines = [T.score(g.score), T.towers(g.campanars), g.score > b && b ? T.record : T.best(Math.max(b, g.score))];
    panel(T.ranks[rank], lines.join('<br>'), [[T.retry, play], [T.menu, leave, true]], rank);
    [440, 554, 659].forEach((n, i) => setTimeout(() => blip(n, 220, 'sine', .08), i * 140));
  }

  // One event at a time: the group gathers, the result appears, and only then does anything fall. Input waits for the end.
  function startAnim(res = {}) {
    for (let c = 0; c < COLS; c++) {
      let fresh = 0;
      for (let r = 0; r < ROWS; r++) if (!views.has(g.grid[r][c].id)) fresh++;
      for (let r = 0; r < fresh; r++) {
        const t = tile(c, r); // new plots start just above the column, as far up as they need
        views.set(g.grid[r][c].id, { x: t.x, y: t.y - fresh * L.ch, pop: 0, shake: 0, alpha: 0, held: null, fresh: true });
      }
    }
    anim = { t: 0, target: res.target, became: res.became, fell: false };
    if (reduced) endAnim();
  }

  function endAnim() {
    gone = [];
    placeAll();
    const a = anim;
    anim = null;
    if (a?.became && !reduced && !visitor) visitor = { img: VISITORS[g.campanars % VISITORS.length], age: 0 };
    if (g.state === 'over' && !ended) {
      ended = true;
      finishTimer = setTimeout(finish, 600);
    }
  }

  function stepAnim(dt) {
    anim.t += dt;
    const t = anim.t;
    for (const f of gone) f.p = Math.min(1, t / CONVERGE);
    if (t >= CONVERGE && gone.length) {
      gone = [];
      const v = anim.target && views.get(anim.target.id);
      if (v) { v.held = null; v.pop = 1; }
    }
    if (t >= CONVERGE + POP) {
      const p = easeInOut(Math.min(1, (t - CONVERGE - POP) / FALL));
      if (!anim.fell) {
        anim.fell = true;
        for (const v of views.values()) { v.y0 = v.y; v.x0 = v.x; }
      }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const b = g.grid[r][c], v = views.get(b.id), to = tile(c, r);
        v.y = v.y0 + (to.y - v.y0) * p;
        v.x = v.x0 + (to.x - v.x0) * p;
        if (v.fresh) v.alpha = p;
      }
      if (t >= CONVERGE + POP + FALL) endAnim();
    }
  }

  const onDown = e => {
    if (ended || anim) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    const block = g.grid[cell[1]][cell[0]];
    press = { c: cell[0], r: cell[1], id: block.id, age: 0, info: g.state === 'play' ? preview(g, cell[0], cell[1]) : null };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onUp = e => {
    const p = press;
    press = null;
    if (!p || ended || anim) return;
    const cell = cellAt(e.clientX, e.clientY);
    // lifting the finger off the pressed group cancels, so nothing is merged by accident
    const inside = cell && (g.state === 'stuck' ? cell[0] === p.c && cell[1] === p.r : p.info?.group.some(([x, y]) => x === cell[0] && y === cell[1]));
    if (g.state === 'stuck') {
      if (!inside) return;
      const t = tile(p.c, p.r), b = demolish(g, p.c, p.r);
      if (b) {
        views.delete(b.id);
        gone.push({ b, x: t.x, y: t.y, tx: t.x, ty: t.y, p: 0, fade: true });
        blip(196, 160, 'sine', .08);
        startAnim();
      }
      return;
    }
    if (!p.info) {
      if (cell && cell[0] === p.c && cell[1] === p.r) {
        const v = views.get(p.id);
        if (v && !reduced) v.shake = 1;
        blip(220, 80, 'sine', .05);
        flash = 1.6;
      }
      return;
    }
    if (!inside) return;
    const pos = tile(p.c, p.r), before = { ...g.grid[p.r][p.c] };
    const blocks = p.info.group.map(([x, y]) => ({ b: { ...g.grid[y][x] }, id: g.grid[y][x].id, x, y }));
    const res = merge(g, p.c, p.r);
    if (!res) return;
    for (const item of blocks) {
      if (item.id === res.target.id) continue;
      views.delete(item.id);
      const t = tile(item.x, item.y);
      gone.push({ b: item.b, x: t.x, y: t.y, tx: pos.x, ty: pos.y, p: 0 });
    }
    const made = pieceOf(res.target);
    quip = T.quips[made] ? { text: `${T.levels[made]}: ${T.quips[made]}`, left: 2.4 } : null;
    views.get(res.target.id).held = before; // still looks like it did until the group arrives
    if (res.became || res.joined) [523, 659, 784].forEach((n, i) => setTimeout(() => blip(n, 200, 'sine', .08), 120 + i * 110));
    else setTimeout(() => blip(330 + res.target.v * 30, 120, 'sine', .07), 120);
    startAnim(res);
  };
  const onCancel = () => { press = null; };

  const { drawBoard, drawHud } = makePainter(ctx, {
    get L() { return L; }, get g() { return g; }, get press() { return press; }, get gone() { return gone; }, get anim() { return anim; }, get views() { return views; },
    get W() { return W; }, get H() { return H; }, get pieces() { return pieces; }, tile,
  });

  function hintText() {
    if (g.state === 'stuck') return T.stuck(g.demolitions);
    if (press?.info && press.age > .2) return T.becomes(T.levels[pieceOf(press.info)], press.info.points);
    if (quip) return quip.text;
    return flash > 0 ? T.alone : T.tap;
  }

  function drawHint() {
    ctx.fillStyle = NAVY;
    ctx.font = `800 ${W < 360 ? 14 : 16}px 'Baloo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hintText(), W / 2, L.hintY);
    ctx.textBaseline = 'alphabetic';
  }

  // A prize for each new campanar: a figure of the Seguici strolls past over the town.
  function drawVisitor(dt) {
    if (!visitor) return;
    visitor.age += dt;
    const p = visitor.age / 5, s = L.cw * .9;
    if (p >= 1) { visitor = null; return; }
    ctx.drawImage(visitor.img, -s + (W + s) * p, L.y - s * .95, s, s);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    flash = Math.max(0, flash - dt);
    if (quip && (quip.left -= dt) <= 0) quip = null;
    if (anim) stepAnim(dt);
    drawBoard(dt);
    drawVisitor(dt);
    drawHud();
    drawHint();
  }

  size();
  placeAll();
  home();
  const onResize = () => { size(); if (!anim) placeAll(); };
  addEventListener('resize', onResize);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  raf = requestAnimationFrame(frame);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(finishTimer);
    clearTimeout(armTimer);
    removeEventListener('resize', onResize);
  };
}
