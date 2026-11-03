// Screen-space paper sparks and fire; bounded lifetime and particle count.
export function createFlatEffects(ctx, screenOf) {
  let sparks = [], rays = [], clock = 0;
  function burst(i, colors = ['#f5c518', '#fff3d6', '#c0283c'], n = 24, power = 1) {
    const s = screenOf(i);
    for (let j = 0; j < n; j++) {
      const a = Math.random() * Math.PI * 2, v = (25 + Math.random() * 100) * power;
      sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 35, life: .4 + Math.random() * .4, color: colors[j % colors.length], r: 2 + Math.random() * 3 });
    }
    sparks = sparks.slice(-700);
  }
  function fire(cells, burning, mouthOf) {
    rays = cells.filter(c => c.kind === 'drac' && !burning.has(c.i)).map(c => {
      const a = mouthOf(c.i);
      const b = [...burning.keys()].map(screenOf).sort((u, v) => Math.hypot(u.x - a.x, u.y - a.y) - Math.hypot(v.x - a.x, v.y - a.y))[0];
      return b && { a, b, until: clock + 1.1 };
    }).filter(Boolean);
  }
  function frame(dt) {
    clock += dt;
    rays = rays.filter(r => r.until > clock);
    ctx.save(); ctx.lineCap = 'round';
    for (const { a, b, until } of rays) {
      const k = Math.min(1, (1.1 - until + clock) * 8, (until - clock) * 5);
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length, ny = dx / length;
      const tx = dx / length, ty = dy / length;
      for (let j = 0; j < 9; j++) {
        const u = ((clock * 1.6 + j / 9 + a.x) % 1) * k;
        const flutter = Math.sin(u * 19 + clock * 20) * 4;
        const x = a.x + dx * u + nx * flutter, y = a.y + dy * u + ny * flutter;
        const size = 4 + Math.sin(u * Math.PI) * 3;
        for (const [color, w] of [['#e75c2e', size], ['#ffb532', size * .7], ['#fff2ac', size * .3]]) {
          ctx.fillStyle = color; ctx.beginPath();
          ctx.moveTo(x + tx * size * 2.4, y + ty * size * 2.4);
          ctx.quadraticCurveTo(x - tx * size + nx * w * 1.8, y - ty * size + ny * w * 1.8, x - tx * size * 1.4, y - ty * size * 1.4);
          ctx.quadraticCurveTo(x - tx * size - nx * w * 1.8, y - ty * size - ny * w * 1.8, x + tx * size * 2.4, y + ty * size * 2.4); ctx.fill();
        }
      }
    }
    sparks = sparks.filter(p => p.life > 0);
    for (const p of sparks) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt;
      ctx.globalAlpha = Math.min(1, Math.max(0, p.life * 3)); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .6, clock * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  return { burst, fire, frame, reset: () => { sparks = []; rays = []; } };
}
