// Replays the rules' events on a canvas. Positions are in cell units and tweens in seconds, so motion does not depend on screen size or frame rate.
import { blip } from './sound.js';
import { CARRETILLA, TRONADA } from './rules.js';
import { T } from './copy.js';
import { COLOURS, artVersion, paintPiece, paintBackground } from './art.js';
import { drawBadge, drawBeams, zigzag } from './draw.js';

export { paintIcon } from './art.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = {
  out: t => 1 - (1 - t) ** 3,
  in: t => t * t,
  inOut: t => (t < .5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2),
  back: t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

export function createView(canvas, onEvent) {
  const ctx = canvas.getContext('2d');
  const sprites = new Map(); // id -> { id, kind, special, dir, x, y, scale, land, alpha, z }
  let tweens = [], particles = [], beams = [], queue = [];
  let flash = null, shake = 0, shakeSeed = 0, sheets = {}, sheetKey = '', bg = null, bgVersion = -1;
  let W = 0, H = 0, dpr = 1;
  const box = { x: 0, y: 0, cell: 40, cols: 8, rows: 8 };

  function tween(o, k, to, dur, ease = 'out', delay = 0, opts = {}) {
    tweens.push({ o, k, to, dur, ease: EASE[ease], delay, t: 0, from: null, ...opts });
  }
  const later = (delay, done, soft = false) => tweens.push({ dur: 0, delay, t: 0, done, soft });

  function addSprite(p, r, c, y = r) {
    const s = { id: p.id, kind: p.kind, special: p.special, dir: p.dir, x: c, y, scale: 1, land: 0, alpha: 1, z: 0 };
    sprites.set(p.id, s);
    return s;
  }

  function burst(c, r, colour, n = 7) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = 1.5 + Math.random() * 3;
      const life = .35 + Math.random() * .25;
      particles.push({ x: c + .5, y: r + .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life, max: life, size: .05 + Math.random() * .07, colour });
    }
  }

  function dropIn(s, to, delay = 0) {
    const dist = Math.max(.5, to - s.y);
    const dur = reduced ? .1 : Math.min(.55, .06 + .075 * dist);
    tween(s, 'y', to, dur, reduced ? 'out' : 'in', delay);
    if (!reduced) {
      // the bounce does not hold input or the next cascade back
      s.land = 0;
      tween(s, 'land', 1, .12, 'out', delay + dur, { soft: true, after: () => { s.land = 0; } });
    }
  }

  function play(e) {
    onEvent?.(e);
    if (e.t === 'swap' || e.t === 'back') {
      const a = sprites.get(e.aId), b = sprites.get(e.bId), [pa, pb] = e.t === 'swap' ? [e.b, e.a] : [e.a, e.b];
      a.z = 1;
      b.z = 0;
      for (const [s, p] of [[a, pa], [b, pb]]) {
        tween(s, 'x', p.c, .16, 'inOut');
        tween(s, 'y', p.r, .16, 'inOut');
      }
      blip(e.t === 'swap' ? 520 : 220, 70, 'triangle', .07);
          }
    if (e.t === 'clear') playClear(e);
    if (e.t === 'praise') showText(T.praise[e.tier][Math.floor(Math.random() * T.praise[e.tier].length)]);
    if (e.t === 'fall') {
      for (const m of e.shifts) dropIn(sprites.get(m.id), m.to, reduced ? 0 : (box.rows - 1 - m.to) * .012);
      for (const d of e.drops) dropIn(addSprite(d.piece, d.to, d.c, d.from), d.to, reduced ? 0 : (box.rows - 1 - d.to) * .012);
      later(.25, () => blip(150, 50, 'sine', .05), true);
    }
    if (e.t === 'shuffle') {
      showText(T.shuffle);
      for (const p of e.pieces) {
        const s = sprites.get(p.id);
        s.kind = p.kind;
        tween(s, 'x', p.c, reduced ? .1 : .5, 'inOut');
        tween(s, 'y', p.r, reduced ? .1 : .5, 'inOut');
      }
      blip(330, 300, 'sine', .08);
    }
  }

  function playClear(e) {
    const pitch = 330 * 2 ** (Math.min(e.step - 1, 12) * 2 / 12);
    blip(pitch, 110);
    later(.07, () => blip(pitch * 1.5, 120), true);
    for (const f of e.fired) {
      if (!reduced) shake = Math.max(shake, f.special === TRONADA ? .5 : .25);
      if (f.special === CARRETILLA) {
        beams.push({ age: 0, dur: .3, ...f });
        blip(900, 220, 'triangle', .06);
      } else {
        const bolts = f.targets.map(t => zigzag(f, t));
        beams.push({ age: 0, dur: .35, bolts });
        blip(150, 450, 'sine', .14); // a phone speaker cannot play lower: it only buzzes
      }
    }
    const pace = reduced ? 0 : .022;
    for (const cell of e.cells) {
      const s = sprites.get(cell.id), delay = cell.wave * pace;
      s.z = 1;
      const gone = () => sprites.delete(cell.id);
      if (cell.into) {
        tween(s, 'x', cell.into.c, .16, 'in');
        tween(s, 'y', cell.into.r, .16, 'in');
        tween(s, 'scale', .6, .16, 'in', 0, { done: gone });
      } else if (reduced) {
        tween(s, 'alpha', 0, .1, 'out', 0, { done: gone });
      } else {
        tween(s, 'scale', 1.22, .06, 'out', delay);
        tween(s, 'scale', 0, .13, 'in', delay + .06, { done: gone });
        later(delay + .06, () => burst(cell.c, cell.r, COLOURS[cell.kind ?? TRONADA]));
      }
    }
    for (const sp of e.spawned) {
      later(reduced ? .1 : .16, () => {
        const s = addSprite(sp.piece, sp.r, sp.c);
        s.scale = 0;
        tween(s, 'scale', 1, reduced ? .08 : .26, reduced ? 'out' : 'back');
        burst(sp.c, sp.r, COLOURS[sp.piece.special], 14);
        blip(sp.piece.special === TRONADA ? 1320 : 990, 160);
      });
    }
  }

  function showText(text) { flash = { text, age: 0, dur: reduced ? 1 : .75 }; }

  function advance(dt) {
    for (const tw of tweens) {
      tw.t += dt;
      if (tw.t < tw.delay) continue;
      if (tw.o) {
        tw.from ??= tw.o[tw.k];
        const p = tw.dur ? Math.min(1, (tw.t - tw.delay) / tw.dur) : 1;
        tw.o[tw.k] = tw.from + (tw.to - tw.from) * tw.ease(p);
      }
    }
    const live = [];
    const finished = [];
    for (const tw of tweens) (tw.t >= tw.delay + tw.dur ? finished : live).push(tw);
    tweens = live;
    for (const tw of finished) { tw.done?.(); tw.after?.(); }
    while (queue.length && !tweens.some(t => !t.soft)) play(queue.shift());
    for (const p of particles) { p.life -= dt; p.vy += 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter(p => p.life > 0);
    for (const b of beams) b.age += dt;
    beams = beams.filter(b => b.age < b.dur);
    if (flash) { flash.age += dt; if (flash.age > flash.dur) flash = null; }
    shake = Math.max(0, shake - dt * 3);
    shakeSeed += dt;
  }

  function sheet(name) {
    const size = Math.round(box.cell * dpr);
    const id = `${size}/${artVersion()}`;
    if (id !== sheetKey) { sheets = {}; sheetKey = id; }
    if (!sheets[name]) {
      const c = Object.assign(document.createElement('canvas'), { width: size, height: size });
      paintPiece(c.getContext('2d'), name, size);
      sheets[name] = c;
    }
    return sheets[name];
  }

  function drawSprite(s, ring = 0, pulse = 0, dx = 0, dy = 0) {
    const bounce = s.land > 0 ? Math.sin(s.land * Math.PI) : 0;
    const cell = box.cell;
    const cx = box.x + (s.x + .5 + dx) * cell;
    const cy = box.y + (s.y + .5 + dy - bounce * .03) * cell;
    const base = cell * s.scale * (1 + pulse * .06 + (ring ? .08 : 0));
    if (base <= 0) return;
    const w = base * (1 + bounce * .03), h = base * (1 - bounce * .04);
    ctx.globalAlpha = s.alpha;
    if (ring) { // the selected piece: its whole cell lights up, and the art stays uncovered
      ctx.fillStyle = 'rgba(255, 214, 90, .4)';
      ctx.beginPath();
      ctx.roundRect(box.x + s.x * cell + 1, box.y + s.y * cell + 1, cell - 2, cell - 2, cell * .16);
      ctx.fill();
    }
    if (s.special === TRONADA) {
      const glow = .55;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * .55);
      g.addColorStop(0, `rgba(255, 220, 90, ${glow})`);
      g.addColorStop(1, 'rgba(255, 220, 90, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - cell * .55, cy - cell * .55, cell * 1.1, cell * 1.1);
      ctx.drawImage(sheet(TRONADA), cx - w / 2, cy - h / 2, w, h);
    } else if (s.special === CARRETILLA) {
      ctx.drawImage(sheet(s.kind), cx - w / 2, cy - h / 2, w, h);
      drawBadge(ctx, cx, cy, base, s.dir);
    } else {
      ctx.drawImage(sheet(s.kind), cx - w / 2, cy - h / 2, w, h);
    }
    if (pulse && !s.special) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = s.alpha * pulse * .18;
      ctx.drawImage(sheet(s.kind), cx - w / 2, cy - h / 2, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  function paintBg() {
    bg = paintBackground(canvas.width, canvas.height, W, H, dpr);
    bgVersion = artVersion();
  }

  return {
    get busy() { return queue.length > 0 || tweens.some(t => !t.soft); },
    get version() { return artVersion(); },
    box,
    resize(w, h, ratio) {
      W = w; H = h; dpr = ratio;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      paintBg();
    },
    reset(board, intro) {
      sprites.clear();
      tweens = []; particles = []; beams = []; queue = []; flash = null; shake = 0;
      board.forEach((row, r) => row.forEach((p, c) => {
        const s = addSprite(p, r, c);
        if (intro) { s.y = r - board.length - 1; dropIn(s, r, reduced ? 0 : c * .025 + (board.length - r) * .03); }
      }));
    },
    play(events) { queue.push(...events); },
    later,
    text: showText,
    nudge(id, x, y) { const s = sprites.get(id); if (s) { s.x = x; s.y = y; } },
    settle(id, c, r) {
      const s = sprites.get(id);
      if (!s) return;
      tween(s, 'x', c, .1, 'out', 0, { soft: true });
      tween(s, 'y', r, .1, 'out', 0, { soft: true });
    },
    frame(dt, time, marks) {
      advance(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bgVersion !== artVersion()) paintBg();
      ctx.drawImage(bg, 0, 0, W, H);
      const { cell, x: bx, y: by, cols, rows } = box;
      const bw = cell * cols, bh = cell * rows, inset = 4;
      // on a phone the board reaches the screen's edges, so its frame does too
      const bleed = bx < inset * 2, fx = bleed ? 0 : bx - inset, fw = bleed ? W : bw + inset * 2;
      const sx = shake > 0 ? Math.sin(shakeSeed * 70) * shake * cell * .08 : 0;
      const sy = shake > 0 ? Math.cos(shakeSeed * 55) * shake * cell * .08 : 0;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = '#3d2417';
      ctx.beginPath();
      ctx.roundRect(fx, by - inset, fw, bh + inset * 2, bleed ? 0 : 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 170, .08)';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) ctx.fillRect(bx + c * cell, by + r * cell, cell, cell);
      }
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bleed ? 0 : 8); // new pieces come out from behind the top edge
      ctx.clip();
      for (const z of [0, 1]) for (const s of sprites.values()) {
        if (s.z !== z) continue;
        const mark = marks?.get(s.id);
        drawSprite(s, mark?.ring, mark?.pulse, mark?.dx, mark?.dy);
      }
      ctx.restore();
      drawBeams(ctx, beams, box);
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(bx + p.x * cell, by + p.y * cell, p.size * cell, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (flash) {
        const t = flash.age / flash.dur;
        const zoom = reduced ? 1 : EASE.back(Math.min(1, flash.age / .15));
        ctx.globalAlpha = t > .7 ? (1 - t) / .3 : 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `400 ${Math.round(cell * .95 * zoom)}px 'Jersey 10', monospace`;
        ctx.lineWidth = Math.max(4, cell * .14);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1b1420';
        ctx.fillStyle = '#f5c518';
        ctx.strokeText(flash.text, bx + bw / 2, by + bh / 2);
        ctx.fillText(flash.text, bx + bw / 2, by + bh / 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
  };
}
