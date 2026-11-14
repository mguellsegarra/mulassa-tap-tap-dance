// What the tiles POC shows: the four lanes, the tiles coming down to the line, and what a tap leaves behind (a burst, sparks,
// a word, a jolt). It owns the canvas, its layout and those effects; the run's state is main.js's and comes in at draw().
import { SPB, END, HIT, MISS, HELD } from './song.js';

const NIGHT = '#11152c', LANE = '#24223f', EDGE = '#53436b', DEEP = '#d99a1e', RED = '#e0452f';
export const GOLD = '#ffc928', CREAM = '#fff2e4';
const page = () => performance.now() / 1000;

export function createView(canvas) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, x0 = 0, colW = 0, hitY = 0, pps = 0;
  // all in page seconds: a column's last tap and its last tap on nothing, the tiles that burst, the sparks, the word, the
  // shake and the flash
  const pressed = [-9, -9, -9, -9], wrong = [-9, -9, -9, -9];
  let pops = [], sparks = [], word = null, shake = -9, flash = -9;

  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = Math.min(W, H * .62); // a desktop window keeps a phone's lanes
    x0 = (W - wide) / 2; colW = wide / 4;
    hitY = H * .8;
    pps = H * .27 / SPB; // a beat is a good quarter of the screen: a tile is on show for a little over a second
  }
  addEventListener('resize', fit);
  fit();

  function burst(col, y, count, color, power = 1) {
    const x = x0 + (col + .5) * colW;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, v = (160 + Math.random() * 260) * power;
      sparks.push({ x: x + (Math.random() - .5) * colW * .6, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, at: page(), life: .35 + Math.random() * .3, color });
    }
    if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
  }
  function box(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.min(r, h / 2)); g.fill(); }
  function dot(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function drawTile(n, t) {
    const bottom = hitY - (n.t - t) * pps, x = x0 + n.col * colW + 5, w = colW - 10, mid = x + w / 2;
    const head = Math.min(n.len, SPB) * pps - 8; // a tapped tile, and a held one's head: the note's length, a beat at most
    if (n.state === MISS) {
      g.globalAlpha = .55 + .45 * Math.sin(page() * 22);
      g.fillStyle = RED;
      box(x, bottom - (n.hold ? n.hold * pps : head), w, n.hold ? n.hold * pps : head, 14);
    } else if (n.hold) {
      const top = bottom - n.hold * pps, held = n.state === HELD, low = held ? Math.min(bottom, hitY) : bottom; // held: what has crossed the line is played
      g.globalAlpha = held ? .95 : .4;
      g.fillStyle = held ? CREAM : GOLD;
      box(x, top, w, low - top, 14);
      g.globalAlpha = 1;
      if (!held) { g.fillStyle = GOLD; box(x, bottom - head, w, head, 14); }
      g.fillStyle = held ? DEEP : CREAM; // a point waits at each beat of the hold
      for (let k = n.got + 1; k <= n.dots; k++) dot(mid, bottom - k * SPB * pps, w * .09);
      if (!held) { g.fillStyle = DEEP; dot(mid, bottom - head / 2, w * .1); }
    } else {
      g.fillStyle = GOLD;
      box(x, bottom - head, w, head, 14);
      g.fillStyle = DEEP;
      dot(mid, bottom - head / 2, w * .1);
    }
    g.globalAlpha = 1;
  }
  function draw({ t, dt, notes, first, holds, mode }) {
    const p = page(), wide = colW * 4, pulse = mode === 'run' ? (1 - (((t / SPB) % 1) + 1) % 1) ** 2 : 0; // 1 on the beat, fading to the next
    g.fillStyle = NIGHT;
    g.fillRect(0, 0, W, H);
    g.save();
    const s = 1 - (p - shake) / .16;
    if (s > 0) g.translate(Math.sin(p * 90) * 5 * s, 0); // a miss jolts the lanes
    g.fillStyle = LANE;
    g.fillRect(x0 + colW, 0, colW, H);
    g.fillRect(x0 + colW * 3, 0, colW, H);
    g.fillStyle = EDGE;
    for (let c = 1; c < 4; c++) g.fillRect(x0 + c * colW - 1, 0, 2, H);
    // a tap lights its column: gold, or red on nothing
    for (let c = 0; c < 4; c++) {
      const a = 1 - (p - pressed[c]) / .2;
      if (a <= 0) continue;
      const beam = g.createLinearGradient(0, hitY - H * .45, 0, hitY);
      beam.addColorStop(0, 'transparent');
      beam.addColorStop(1, wrong[c] === pressed[c] ? RED : GOLD);
      g.globalAlpha = a * .45;
      g.fillStyle = beam;
      g.fillRect(x0 + c * colW, hitY - H * .45, colW, H * .45 + (H - hitY));
    }
    g.globalAlpha = 1;
    for (let i = first; i < notes.length; i++) {
      const n = notes[i];
      if (hitY - (n.t - t) * pps < -4) break;
      if (n.state !== HIT) drawTile(n, t);
    }
    // the line, beating with the tune
    g.globalAlpha = .12 + pulse * .25;
    g.fillStyle = GOLD;
    g.fillRect(x0, hitY - 9, wide, 18);
    g.globalAlpha = 1;
    g.fillStyle = CREAM;
    g.fillRect(x0, hitY - 2, wide, 4);
    // a tile that was hit bursts on the line, bigger and whiter on the dot
    pops = pops.filter(o => p - o.at < .22);
    for (const o of pops) {
      const k = (p - o.at) / .22, grow = k * colW * (o.perfect ? .3 : .16), hgt = colW * .7;
      g.globalAlpha = (1 - k) * .9;
      g.fillStyle = o.perfect ? CREAM : GOLD;
      box(x0 + o.col * colW + 5 - grow, o.y - hgt / 2 - grow, colW - 10 + grow * 2, hgt + grow * 2, 16);
    }
    // a held note glows where it meets the line
    for (const n of holds.values()) {
      g.globalAlpha = .5 + pulse * .3;
      g.fillStyle = CREAM;
      dot(x0 + (n.col + .5) * colW, hitY, colW * .34);
      if (Math.random() < .5) burst(n.col, hitY, 1, GOLD, .7);
    }
    sparks = sparks.filter(o => p - o.at < o.life);
    for (const o of sparks) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 900 * dt;
      g.globalAlpha = 1 - (p - o.at) / o.life;
      g.fillStyle = o.color;
      g.fillRect(o.x - 3, o.y - 3, 6, 6);
    }
    g.globalAlpha = 1;
    g.restore();
    if (word && p - word.at < .5) {
      const k = (p - word.at) / .5, size = Math.round(colW * .42 * (1 + Math.max(0, .12 - k) * 3.5));
      g.globalAlpha = Math.min(1, (1 - k) * 2.5);
      g.font = `800 ${size}px 'Baloo 2', system-ui, sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = size * .22;
      g.strokeStyle = NIGHT;
      g.strokeText(word.text, W / 2, hitY - H * .16);
      g.fillStyle = word.color;
      g.fillText(word.text, W / 2, hitY - H * .16);
      g.globalAlpha = 1;
    }
    const f = 1 - (p - flash) / .3;
    if (f > 0) { g.globalAlpha = f * .25; g.fillStyle = CREAM; g.fillRect(x0, 0, wide, H); g.globalAlpha = 1; } // every 25 in a row
    if (mode !== 'menu' && notes.length) { g.fillStyle = GOLD; g.fillRect(x0, 0, wide * Math.min(1, Math.max(0, t / (END * SPB))), 4); } // how far through the tune
  }

  return {
    draw,
    colAt: x => Math.max(0, Math.min(3, Math.floor((x - x0) / colW))),
    clear() { pops = []; sparks = []; word = null; },
    press(col, onNothing) { pressed[col] = page(); if (onNothing) wrong[col] = pressed[col]; },
    // a tile hit `lead` seconds before its time bursts where it was, above the line; `whole` is a held note's end
    hit(col, perfect, lead = 0, whole = false) {
      const y = hitY - Math.max(0, lead) * pps;
      pops.push({ col, y, at: page(), perfect });
      burst(col, y, whole ? 16 : perfect ? 12 : 6, perfect ? CREAM : GOLD, whole ? 1.3 : 1);
    },
    point: col => burst(col, hitY, 5, CREAM), // a held note's beat
    say(text, color) { word = { text, at: page(), color }; },
    jolt() { shake = page(); },
    flare() { flash = page(); },
  };
}
