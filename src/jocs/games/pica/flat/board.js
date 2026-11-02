import { FUSE } from '../rules.js';
import { createFlatArt } from './art.js';
import { createFlatEffects } from './effects.js';

export async function createBoard(canvas) {
  const ctx = canvas.getContext('2d');
  const { sprites, portraits } = await createFlatArt();
  const insets = { top: 0, bottom: 0 };
  let game, W = 1, H = 1, pitchX = 1, pitchY = 1, time = 0, trauma = 0;
  let screen = [], poses = [], seen = [], booms = [], burning = new Map();
  const floor = document.createElement('canvas');
  const fx = createFlatEffects(ctx, i => screen[i]);

  function fit() {
    if (!game) return;
    W = innerWidth; H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    floor.width = canvas.width; floor.height = canvas.height;
    pitchX = Math.min((W - 24) / game.cols, (H - insets.top - insets.bottom - 32) / game.rows / 1.1);
    pitchY = pitchX * 1.1;
    const left = (W - pitchX * game.cols) / 2;
    const top = insets.top + (H - insets.top - insets.bottom - pitchY * game.rows) / 2;
    screen = game.cells.map(c => ({ x: left + (c.i % game.cols + .5) * pitchX, y: top + (Math.floor(c.i / game.cols) + .5) * pitchY, r: Math.min(pitchX, pitchY) * .58 }));
    const f = floor.getContext('2d'); f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.fillStyle = '#e7c994'; f.fillRect(0, 0, W, H);
    // Wide stone planes, quiet enough for the red velvet to read immediately.
    for (let row = -2; row <= game.rows + 2; row++) for (let col = -4; col <= game.cols + 4; col++) {
      const x = left + col * pitchX, y = top + row * pitchY;
      f.fillStyle = (row + col) % 2 ? '#e8ce9f' : '#efd6a9';
      f.fillRect(x + 1, y + 1, pitchX - 2, pitchY - 2);
      f.strokeStyle = '#c4a574'; f.lineWidth = .7; f.strokeRect(x, y, pitchX, pitchY);
      f.strokeStyle = '#f8e3ba'; f.beginPath(); f.moveTo(x + 2, y + pitchY - 2); f.lineTo(x + pitchX - 2, y + pitchY - 2); f.stroke();
    }
  }
  canvas.addEventListener('contextrestored', fit);
  floor.addEventListener('contextrestored', fit);

  function setGame(g) {
    game = g; seen = g.cells.map(() => ''); poses = g.cells.map(() => 0);
    booms = g.cells.map(() => Infinity); burning = new Map(); trauma = 0; fx.reset(); fit();
  }
  function pick(x, y) {
    for (const safe of [true, false]) {
      let best = -1, distance = Infinity;
      screen.forEach((s, i) => {
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < s.r && d < distance && (!safe || game.cells[i].kind !== 'drac')) { best = i; distance = d; }
      });
      if (best >= 0) return game.cells[best].age < 0 ? -1 : best;
    }
    return -1;
  }
  function burn(cell) {
    cell.age = -.9;
    burning.set(cell.i, poses[cell.i]);
  }
  function explodeAll(culprit) {
    const a = screen[culprit];
    booms = screen.map(b => time + Math.hypot(b.x - a.x, b.y - a.y) / pitchX * .13);
    // Emit and paint the culprit now: input can arrive between animation frames.
    fx.burst(culprit, ['#ff8a1e', '#ffe066', '#c0283c', '#3a2c22'], 40, 1.4);
    trauma = 1;
    paint(0);
  }
  function figure(c, kind, scale, charred = false) {
    if (scale <= 0) return;
    const s = screen[c.i], phase = c.i * 1.73;
    const mule = kind.startsWith('mula'), urgent = kind === 'mula' && !charred ? Math.max(0, 1 - c.left / FUSE) : 0;
    const bounce = mule ? Math.abs(Math.sin(time * 7 + phase)) : Math.sin(time * 3 + phase) * .25;
    const pose = charred ? burning.get(c.i) : poses[c.i];
    const clac = mule ? Math.floor((time * 7 + phase) % 3) : 0;
    const img = sprites[kind][pose * (mule ? 3 : 1) + clac];
    const width = pitchX * 1.08, height = width * .7;
    ctx.save();
    ctx.translate(s.x + (urgent > .5 ? Math.sin(time * 63) * urgent * 2 : 0), s.y + height * .44 - bounce * pitchY * .055);
    ctx.rotate(Math.sin(time * (mule ? 7 : 2.5) + phase) * (mule ? .035 : .012));
    ctx.scale(scale * (1 - bounce * .025), scale * (1 + bounce * .04));
    if (charred) ctx.filter = `brightness(${Math.max(.16, 1 - (c.age + .9) * 1.4)}) grayscale(.8)`;
    ctx.drawImage(img, -width / 2, -height, width, height);
    ctx.restore();
    if (urgent > 0) {
      const y = s.y + height * .56, w = pitchX * .48;
      ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#b99866';
      ctx.beginPath(); ctx.moveTo(s.x - w / 2, y); ctx.lineTo(s.x + w / 2, y); ctx.stroke();
      ctx.strokeStyle = urgent > .6 ? '#ce3934' : '#e4a324';
      ctx.beginPath(); ctx.moveTo(s.x - w / 2, y); ctx.lineTo(s.x - w / 2 + w * (1 - urgent), y); ctx.stroke();
      ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(s.x - w / 2 + w * (1 - urgent), y, 2 + Math.sin(time * 25) * .7, 0, Math.PI * 2); ctx.fill();
    }
  }
  function paint(dt) {
    const dpr = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(floor, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save(); ctx.translate(Math.sin(time * 71) * trauma * trauma * 5, Math.cos(time * 83) * trauma * trauma * 4);
    for (const c of game.cells) {
      if (seen[c.i] !== c.kind) { seen[c.i] = c.kind; poses[c.i] = Math.floor(Math.random() * 4); }
      if (booms[c.i] <= time) {
        if (booms[c.i] > time - dt && c.i !== game.culprit) fx.burst(c.i, ['#ff8a1e', '#ffe066', '#c0283c', '#3a2c22'], 18);
        continue;
      }
      const s = screen[c.i];
      ctx.fillStyle = '#67482430'; ctx.beginPath(); ctx.ellipse(s.x, s.y + pitchX * .31, pitchX * .34, pitchX * .065, -.08, 0, Math.PI * 2); ctx.fill();
      if (burning.has(c.i)) {
        if (c.age < .1) {
          figure(c, 'mula', c.age < 0 ? 1 : 1 - c.age / .1, true);
          if (c.age < 0) {
            ctx.fillStyle = '#ff9c27';
            for (let j = 0; j < 4; j++) {
              const x = s.x + (j - 1.5) * pitchX * .12, y = s.y + pitchX * .15;
              ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x - 8, y - 10, x + Math.sin(time * 22 + j) * 5, y - 17 - Math.sin(time * 17 + j) * 7); ctx.quadraticCurveTo(x + 10, y, x - 5, y); ctx.fill();
            }
          }
          continue;
        }
        burning.delete(c.i);
      }
      const k = Math.min(1, Math.max(0, (c.age - .1) / .22));
      const u = k - 1, pop = 1 + u * u * (3.2 * u + 2.2);
      figure(c, c.kind, c.age < .1 ? 0 : pop);
      if (c.prev !== c.kind && c.age < .1) figure(c, c.prev, Math.max(0, 1 - c.age / .1));
    }
    fx.frame(dt); ctx.restore();
  }
  function frame(dt) { time += dt; trauma = Math.max(0, trauma - dt * 1.6); paint(dt); }
  return { setGame, fit, pick, frame, burst: fx.burst, explodeAll, dragonFire: () => { fx.fire(game.cells, burning, i => ({ x: screen[i].x + (poses[i] % 2 ? -1 : 1) * pitchX * .28, y: screen[i].y - pitchX * .07 })); trauma = .4; }, burn,
    thumbs: () => portraits, insets, screenOf: i => screen[i], shake: k => { trauma = Math.min(1, trauma + k); } };
}
