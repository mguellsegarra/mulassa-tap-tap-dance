import { COPY as T } from './copy.js';
import { blip } from './sound.js';
import { makeScene } from './scene.js';
import { LADDER, WIDTH, HOLD_Y, newGame, tick, drop, clampX } from './rules.js';

const BEST_KEY = 'jocs.suika.best';
// Each ball fills its image: a circle of radius 248 px centred in 512 px.
const ART = ['nan', 'barret-verd', 'arlequi', 'diable', 'drac', 'aliga', 'lleo', 'basilisc', 'mulassa', 'gegant', 'calcot'].map(src => ({ src, cx: 256, cy: 256, fit: 248 }));
const MARGIN = 10, GAP = 8, HEADER = 76, MIN_H = 120, MAX_H = 160, HOLD_ZONE = 40;
const BROWN = '#704322';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function start(root, leave) {
  root.innerHTML = `<div class="stage"><canvas></canvas><button class="back" aria-label="${T.menu}">‹</button><button class="back" aria-label="${T.retry}">↻</button><div class="overlay"></div><div style="position:absolute;height:env(safe-area-inset-top)"></div><div style="position:absolute;height:env(safe-area-inset-bottom)"></div></div>`;
  const stage = root.firstChild, canvas = stage.querySelector('canvas'), overlay = stage.querySelector('.overlay');
  const [backBtn, restartBtn] = stage.querySelectorAll('.back'), safeProbe = stage.lastChild, safeTop = safeProbe.previousSibling;
  for (const b of [backBtn, restartBtn]) { b.style.background = '#fff5d4'; b.style.color = BROWN; b.style.borderRadius = '50%'; b.style.fontWeight = 800; }
  restartBtn.onclick = () => { if (!ended) play(); };
  const ctx = canvas.getContext('2d');
  backBtn.onclick = leave;
  let g = null, raf = 0, last = 0, W = 0, H = 0, dpr = 1, armTimer = 0, finishTimer = 0, ended = true, aim = WIDTH / 2, shown = WIDTH / 2, pending = false, activePointer = null;
  let L = {}; // layout, in CSS px
  let pops = [], flash = null;
  const sprites = [];
  const images = ART.map(a => Object.assign(new Image(), { src: `/jocs/suika/cards/${a.src}.webp`, onload: () => { sprites.length = 0; } }));

  let scene = null; // set once `figure` exists; layout() runs through it after that
  const best = () => Number(localStorage.getItem(BEST_KEY) ?? 0);

  // The box takes the room under the header row; on a wide screen the height sets the scale instead.
  function metrics() {
    const headY = Math.max(GAP / 2, safeTop.getBoundingClientRect().height), top = headY + HEADER, bottom = safeProbe.getBoundingClientRect().height;
    const room = H - top - GAP - Math.max(MARGIN, bottom);
    let s = (W - MARGIN * 2) / WIDTH;
    if (room / s - HOLD_ZONE < MIN_H) s = room / (MIN_H + HOLD_ZONE);
    return { s, h: Math.min(MAX_H, room / s - HOLD_ZONE), top, room, headY };
  }

  function layout() {
    const { s, h, top, room, headY } = metrics();
    const worldH = g ? g.h : h;
    const scale = Math.min(s, room / (worldH + HOLD_ZONE));
    const cw = WIDTH * scale, ch = worldH * scale, spare = Math.max(0, room - (worldH + HOLD_ZONE) * scale);
    L = { s: scale, cw, ch, x: (W - cw) / 2, y: top + GAP + spare / 2 + HOLD_ZONE * scale, headY };
    backBtn.style.left = `${L.x}px`; backBtn.style.top = `${headY + (HEADER - 44) / 2}px`;
    restartBtn.style.left = `${L.x + cw - 44}px`; restartBtn.style.top = `${headY + (HEADER - 44) / 2}px`;
    sprites.length = 0;
    scene?.invalidate();
  }

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }

  // Pre-scaled once per tier: 512 px images are too heavy to shrink every frame.
  function sprite(tier) {
    if (sprites[tier]) return sprites[tier];
    const img = images[tier], a = ART[tier];
    if (!img.complete || !img.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(LADDER[tier].r * L.s * 512 / a.fit * dpr);
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    // trims the dark fringe the generated art leaves on its outer edge
    x.beginPath();
    x.arc(c.width / 2, c.height / 2, c.width * 246 / 512, 0, 7);
    x.clip();
    x.drawImage(img, 0, 0, c.width, c.height);
    return (sprites[tier] = c);
  }

  // Draws a figure so its physics circle has radius r (CSS px) around the current origin.
  function figure(tier, r) {
    const a = ART[tier], c = sprite(tier), k = r / a.fit;
    if (c) ctx.drawImage(c, -a.cx * k, -a.cy * k, 512 * k, 512 * k);
    else { ctx.fillStyle = '#b9a9b0'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); }
  }

  function feedback(ev, d) {
    if (ev === 'drop') blip(240 + d * 50, 70);
    if (ev === 'merge') {
      if (!reduced) pops.push({ x: d.x, y: d.y, r: d.tier === null ? LADDER.at(-1).r : LADDER[d.tier].r, age: 0, gold: d.tier === null });
      blip(330 * 2 ** ((d.tier ?? LADDER.length) / 6), 150);
      if (d.tier === null) { [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => blip(n, 180), i * 110)); flash = { text: T.vanish, age: 0 }; }
      else if (d.first && d.tier >= 2) flash = { text: T.reached(T.figures[LADDER[d.tier].id]), age: 0 };
    }
    if (ev === 'over') blip(90, 500, 'sawtooth');
  }

  function panel(title, text, buttons) {
    overlay.style.display = '';
    // a player still tapping must not hit a button that has just appeared
    overlay.style.pointerEvents = 'none';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { overlay.style.pointerEvents = ''; }, 500);
    overlay.innerHTML = `<div class="panel"><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}</div>`;
    for (const [name, fn, alt] of buttons) {
      const b = document.createElement('button');
      b.className = alt ? 'btn alt' : 'btn';
      if (alt) b.style.background = '#f3dca8';
      b.textContent = name;
      b.onclick = fn;
      overlay.firstChild.append(b);
    }
  }

  function fresh() {
    // the world height is chosen for this screen, then fixed for the whole game
    g = newGame(metrics().h, { on: feedback });
    pops = []; flash = null; aim = shown = WIDTH / 2; pending = false; activePointer = null;
    layout();
  }

  function play() {
    clearTimeout(finishTimer);
    fresh();
    ended = false;
    overlay.style.display = 'none';
  }

  function home() {
    fresh();
    ended = true;
    const b = best();
    panel(T.title, T.how + (b ? `<br>${T.best(b)}` : ''), [[T.play, play], [T.menu, leave, true]]);
  }

  function finish() {
    const b = best(), record = g.score > b;
    if (record) localStorage.setItem(BEST_KEY, g.score);
    panel(T.over, `${T.score(g.score)}<br>${record ? T.record : T.best(b)}`, [[T.retry, play], [T.menu, home, true]]);
  }

  const toWorld = clientX => (clientX - stage.getBoundingClientRect().left - L.x) / L.s;
  const onDown = e => {
    if (ended) return; // a new touch always takes over: a lost pointerup must not freeze the aim
    activePointer = e.pointerId;
    aim = toWorld(e.clientX);
  };
  const onMove = e => { if (e.pointerId === activePointer) aim = shown = toWorld(e.clientX); }; // 1:1 under the finger; only a tap glides
  const onUp = e => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    if (!ended) pending = true; // waits for the figure to reach the finger, and for the next one if none is ready
  };
  const onCancel = e => { if (e.pointerId === activePointer) activePointer = null; };
  const onKey = e => {
    if (ended) return;
    if (e.code === 'ArrowLeft') aim = Math.max(0, aim - 4);
    if (e.code === 'ArrowRight') aim = Math.min(WIDTH, aim + 4);
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); pending = true; }
  };

  scene = makeScene(ctx, canvas, figure);

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0), time = now / 1000;
    last = now;
    if (!ended) {
      tick(g, dt);
      shown += (aim - shown) * (1 - Math.exp(-dt * 35));
      if (pending && g.held !== null && Math.abs(clampX(aim, g.held) - clampX(shown, g.held)) < 1.5) { drop(g, clampX(aim, g.held)); pending = false; }
    }
    if (!ended && g.state === 'over') {
      ended = true; // a moment to see what overflowed before the panel covers it
      finishTimer = setTimeout(finish, 700);
    }
    scene.sync({ L, W, H, dpr, g, best: best() });
    scene.background();
    scene.header();
    scene.boxBack();
    const wx = v => L.x + v * L.s, wy = v => L.y + v * L.s;
    const cx = clampX(shown, g.held ?? 0);
    scene.ring(wx(cx));
    if (g.state === 'play') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx(cx), wy(HOLD_Y));
      ctx.lineTo(wx(cx), L.y + L.ch);
      if (g.held !== null) ctx.stroke();
    }
    for (const b of g.bodies) {
      ctx.save();
      // drawn between the last two physics steps, so motion stays smooth at any refresh rate
      ctx.translate(wx(b.px + (b.x - b.px) * g.alpha), wy(b.py + (b.y - b.py) * g.alpha));
      ctx.rotate(b.prot + (b.rot - b.prot) * g.alpha);
      figure(b.tier, b.r * L.s);
      ctx.restore();
    }
    if (g.state === 'play') {
      if (g.held !== null) {
        ctx.save();
        ctx.translate(wx(cx), wy(HOLD_Y));
        figure(g.held, LADDER[g.held].r * L.s);
        ctx.restore();
      }
      scene.cloud(wx(cx), wy(HOLD_Y - 16));
    }
    scene.boxFront(time);
    pops = pops.filter(p => (p.age += dt) < .35);
    for (const p of pops) {
      ctx.globalAlpha = 1 - p.age / .35;
      ctx.strokeStyle = p.gold ? '#f5c518' : '#fff2d5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wx(p.x), wy(p.y), (p.r + p.age * 40) * L.s, 0, 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (flash && (flash.age += dt) < 1.1) {
      ctx.globalAlpha = Math.min(1, 2.2 - flash.age * 2);
      ctx.textAlign = 'center';
      ctx.font = `400 ${Math.round(L.cw * .12)}px 'Jersey 10', monospace`;
      ctx.strokeStyle = BROWN;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeText(flash.text, W / 2, L.y + L.ch * .3);
      ctx.fillStyle = '#fff';
      ctx.fillText(flash.text, W / 2, L.y + L.ch * .3);
      ctx.globalAlpha = 1;
    }
  }

  size();
  home();
  addEventListener('resize', size);
  addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onCancel);
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(finishTimer);
    clearTimeout(armTimer);
    removeEventListener('resize', size);
    removeEventListener('keydown', onKey);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onCancel);
  };
}
