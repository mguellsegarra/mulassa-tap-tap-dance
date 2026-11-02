// Everything on screen but the figures themselves: table, score bubbles, evolution ring, glass box, cloud.
import { COPY as T } from './copy.js';
import { LADDER } from './rules.js';

const GAP = 8, HEADER = 76, BROWN = '#704322', GOLD = '#e8bd58';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const campanar = Object.assign(new Image(), { src: '/campanar-valls.svg' });

export function makeScene(ctx, canvas, figure) {
  let L, W, H, dpr, g, best;
  let table = null; // the backdrop, drawn once per layout
  campanar.addEventListener('load', () => { table = null; });

  function background() {
    if (!table) {
      table = document.createElement('canvas');
      table.width = canvas.width; table.height = canvas.height;
      const t = table.getContext('2d');
      t.scale(dpr, dpr);
      const edge = L.y + L.ch * .36, front = H - Math.min(24, H * .03); // wall meets table; the table's front edge
      t.fillStyle = '#c58e59'; t.fillRect(0, 0, W, edge);
      if (campanar.complete && campanar.naturalWidth) {
        const ch = L.y * .62, cw = ch * campanar.naturalWidth / campanar.naturalHeight;
        t.globalAlpha = .2;
        t.drawImage(campanar, L.x + L.cw * .06, L.y - ch, cw, ch);
        t.globalAlpha = 1;
      }
      t.fillStyle = '#e8c788'; t.fillRect(0, edge, W, H - edge);
      t.fillStyle = 'rgba(255, 243, 205, .55)';
      const cell = 24;
      for (let i = 0; i * cell < W; i += 2) t.fillRect(i * cell, edge, cell, H - edge);
      for (let j = 0; edge + j * cell < H; j += 2) t.fillRect(0, edge + j * cell, W, cell);
      t.fillStyle = '#b5703a'; t.fillRect(0, front, W, H - front);
    }
    ctx.drawImage(table, 0, 0, W, H);
  }
  
  function bubble(cx, r, label, value, tier) {
    const cy = L.headY + HEADER / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.fillStyle = 'rgba(255, 245, 212, .45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, .9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = BROWN;
    ctx.font = `700 ${Math.round(r * .36)}px 'Baloo 2', sans-serif`;
    ctx.fillText(label, cx, cy - r * .42);
    if (tier !== undefined) {
      ctx.save();
      ctx.translate(cx, cy + r * .2);
      figure(tier, r * .56);
      ctx.restore();
    } else {
      ctx.font = `800 ${Math.round(r * (value > 9999 ? .5 : .62))}px 'Baloo 2', sans-serif`;
      ctx.fillText(value, cx, cy + r * .46);
    }
  }
  
  function header() {
    const r = Math.min(34, (L.cw - 88 - GAP * 3) / 6), step = r * 2 + 4;
    bubble(W / 2 - step, r, T.scoreLabel, g.score);
    bubble(W / 2, r, T.bestLabel, Math.max(best, g.score));
    bubble(W / 2 + step, r, T.next, 0, g.next);
  }
  
  // The evolution ring: a small map of the whole ladder, clockwise from the top, with the goal lit up.
  function ring(cloudX) {
    const R = L.cw * .1, x = L.x + L.cw * .84, y = (L.headY + HEADER + L.y) / 2 - 2, icon = R * Math.sin(Math.PI / LADDER.length) * .95;
    ctx.globalAlpha = Math.abs(cloudX - x) < R + 10 * L.s ? .35 : 1; // the cloud must stay readable when it passes in front
    ctx.beginPath();
    ctx.arc(x, y, R, 0, 7);
    ctx.strokeStyle = 'rgba(255, 245, 212, .6)';
    ctx.lineWidth = icon * 2.5;
    ctx.stroke();
    LADDER.forEach((_, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / LADDER.length, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      if (i === LADDER.length - 1) {
        ctx.beginPath();
        ctx.arc(px, py, icon * 1.25, 0, 7);
        ctx.fillStyle = '#fbe77a';
        ctx.fill();
      }
      ctx.save();
      ctx.translate(px, py);
      figure(i, icon);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  
  // The back of the glass box: drawn behind the figures.
  function boxBack() {
    const d = L.cw * .03, { x, y, cw, ch } = L;
    ctx.fillStyle = 'rgba(255, 245, 212, .2)';
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, [0, 0, 14, 14]);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + cw - d, y - d); ctx.lineTo(x + cw, y);
    ctx.stroke();
    // one soft reflection on the glass
    ctx.fillStyle = 'rgba(255, 255, 255, .28)';
    ctx.beginPath();
    ctx.ellipse(x + cw * .07, y + cw * .06, cw * .035, cw * .02, -.6, 0, 7);
    ctx.fill();
  }
  
  // The front of the box and its rim: drawn over the figures.
  function boxFront(time) {
    const { x, y, cw, ch } = L, o = 3; // half the frame's width: its inner edge is the physics wall
    ctx.beginPath();
    ctx.moveTo(x - o, y);
    ctx.arcTo(x - o, y + ch + o, x + cw + o, y + ch + o, 14);
    ctx.arcTo(x + cw + o, y + ch + o, x + cw + o, y, 14);
    ctx.lineTo(x + cw + o, y);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + cw, y);
    const danger = g.danger > .15;
    ctx.strokeStyle = danger ? '#e5343f' : 'rgba(232, 189, 88, .75)';
    ctx.lineWidth = danger && !reduced ? 3 + Math.abs(Math.sin(time * 10)) * 2 : 3;
    ctx.stroke();
  }
  
  // The little cloud that carries the next figure.
  function cloud(x, y) {
    const u = L.s;
    ctx.fillStyle = '#fff6da';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    const puffs = [[-7, 1, 4.5], [-2.5, -2, 5.5], [3, -1.5, 5], [7.5, 1, 4], [0, 2, 5.5]];
    ctx.beginPath();
    for (const [a, b, r] of puffs) { ctx.moveTo(x + (a + r) * u, y + b * u); ctx.arc(x + a * u, y + b * u, r * u, 0, 7); }
    ctx.stroke();
    ctx.beginPath();
    for (const [a, b, r] of puffs) { ctx.moveTo(x + (a + r) * u, y + b * u); ctx.arc(x + a * u, y + b * u, r * u, 0, 7); }
    ctx.fill();
    ctx.fillStyle = BROWN;
    for (const a of [-2, 2]) { ctx.beginPath(); ctx.arc(x + a * u, y, .6 * u, 0, 7); ctx.fill(); }
  }

  return {
    sync(state) { ({ L, W, H, dpr, g, best } = state); },
    invalidate() { table = null; },
    background, header, ring, boxBack, boxFront, cloud,
  };
}
