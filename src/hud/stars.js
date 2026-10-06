// The result stars, drawn like a game's: chunky rounded gold stars with a dark outline, a soft shadow and a gloss, in one
// row centred on (x, y); `r` = the row's half-width (as big as they get without touching). `t` = seconds since the
// results appeared: each earned star drops onto its slot, lands with a squash, a flash, a shockwave ring and sparks
// (nothing earned: nothing moves); the third of three sets off a golden burst and the trio then twinkles.
// Infinity = settled (the share image).
const DARK = '#2a1a10', START = 0.25, GAP = 0.4, FALL = 0.2;
const SPOTS = [[-0.67, 0, 0.29], [0, 0, 0.29], [0.67, 0, 0.29]]; // [dx, dy, size] in r: one row, r = its half-width
function starPath(c, cx, cy, R) { // 5 points, the corners rounded
  const p = [];
  for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, d = j % 2 ? R * 0.55 : R; p.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath(); c.moveTo(...mid(p[9], p[0]));
  p.forEach((v, j) => c.arcTo(v[0], v[1], ...mid(v, p[(j + 1) % 10]), R * 0.11));
  c.closePath();
}
export function drawStars(c, n, x, y, r, t = Infinity) {
  const live = Number.isFinite(t), T = live ? t : 99, last = T - START - 2 * GAP - FALL; // last: since the 3rd star landed
  if (n === 3 && live && last > 0 && last < 1.3) { // the golden burst behind the trio
    const g = c.createRadialGradient(x, y, 0, x, y, r * (1 + last * 1.4));
    g.addColorStop(0, `rgba(255,224,110,${0.55 * (1 - last / 1.3)})`); g.addColorStop(1, 'rgba(255,224,110,0)');
    c.fillStyle = g; c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  SPOTS.forEach(([dx, dy, k], i) => {
    const R = r * k, cx = x + dx * r, cy = y + dy * r, u = T - START - i * GAP, w = u - FALL, on = i < n;
    c.save();
    c.lineJoin = 'round';
    starPath(c, cx, cy, R); c.fillStyle = 'rgba(0,0,0,0.32)'; c.fill(); // the empty slot, always there
    c.lineWidth = R * 0.14; c.strokeStyle = 'rgba(255,243,214,0.14)'; c.stroke();
    if (on && u > 0) {
      const fall = u < FALL, f = fall ? u / FALL : 1, q = fall ? 0 : 0.25 * Math.exp(-9 * w) * Math.cos(22 * w); // q: the landing squash
      const grow = fall ? 1 + 0.5 * (1 - f) : 1; // big while it is "near", settling to its size
      c.translate(cx, cy + (fall ? -R * 3.5 * (1 - f * f) : 0)); c.rotate(fall ? (1 - f) * -0.7 : 0); c.scale(grow * (1 + q), grow * (1 - q)); c.translate(-cx, -cy);
      starPath(c, cx, cy, R);
      c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = R * 0.35; c.shadowOffsetY = R * 0.14;
      c.lineWidth = R * 0.28; c.strokeStyle = DARK; c.stroke();
      c.shadowColor = 'transparent';
      const g = c.createLinearGradient(0, cy - R, 0, cy + R);
      g.addColorStop(0, '#fff0a0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#f59a00');
      c.fillStyle = g; c.fill();
      c.clip(); // the gloss and the flash stay inside the star
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(cx - R * 0.25, cy - R * 0.45, R * 0.5, R * 0.22, -0.5, 0, 7); c.fill();
      if (w > 0 && w < 0.3) { c.fillStyle = `rgba(255,255,255,${0.9 * (1 - w / 0.3)})`; c.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
    }
    c.restore();
    if (!on || w <= 0) return;
    if (w < 0.5) { // the shockwave ring
      c.beginPath(); c.arc(cx, cy, R * (1.1 + 2.2 * w / 0.5), 0, 7);
      c.strokeStyle = `rgba(255,236,150,${0.8 * (1 - w / 0.5)})`; c.lineWidth = 1 + R * 0.2 * (1 - w / 0.5); c.stroke();
    }
    const grand = n === 3 && i === 2, sparks = grand ? 16 : 7; // the finale throws more, further
    if (w < 1) for (let j = 0; j < sparks; j++) {
      const a = j * 2 * Math.PI / sparks + i, d = R * (0.9 + (grand ? 2.6 : 1.5) * w * (1 - 0.25 * (j % 2)));
      c.globalAlpha = 1 - w; c.fillStyle = j % 2 ? '#fff6c8' : '#ffd23f';
      c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (grand ? 0.13 : 0.1) * (1 - w), 0, 7); c.fill();
      c.globalAlpha = 1;
    }
    if (live && n === 3 && last > 0.6) { // then the trio twinkles, one star at a time
      const s = Math.sin(T * 2.4 - i * 2.1), tw = s > 0.75 ? (s - 0.75) * 4 : 0, sx = cx + R * 0.55, sy = cy - R * 0.55, z = R * 0.5 * tw;
      if (tw) { c.fillStyle = `rgba(255,255,255,${tw})`; c.beginPath(); c.moveTo(sx, sy - z); c.lineTo(sx + z * 0.25, sy - z * 0.25); c.lineTo(sx + z, sy); c.lineTo(sx + z * 0.25, sy + z * 0.25); c.lineTo(sx, sy + z); c.lineTo(sx - z * 0.25, sy + z * 0.25); c.lineTo(sx - z, sy); c.lineTo(sx - z * 0.25, sy - z * 0.25); c.closePath(); c.fill(); }
    }
  });
}
