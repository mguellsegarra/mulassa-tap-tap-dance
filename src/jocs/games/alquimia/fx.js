// Embers rising from the cauldron and bursts of sparks, on one canvas over the scene.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GOLD = ['#ffd76a', '#ff9d3c', '#fff2d5'];
const SMOKE = ['#8d8497', '#6f6679'];
// One soft puff, drawn once and reused: a blur per frame would be too slow on a phone.
const puffSprite = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(235, 215, 235, .55)');
  g.addColorStop(1, 'rgba(235, 215, 235, 0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return c;
})();

export function startFx(canvas, emberSource) {
  const ctx = canvas.getContext('2d');
  let bits = [], raf = 0, last = 0, embers = true;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  function spawn(x, y, n, speed, colors, up) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .7);
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, r: 1.5 + Math.random() * 2.5, age: 0, life: .5 + Math.random() * .6, color: colors[i % colors.length] });
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    if (embers && !reduced) {
      const p = emberSource();
      if (Math.random() < dt * 9) bits.push({ x: p.x + (Math.random() - .5) * p.w, y: p.y, vx: (Math.random() - .5) * 18, vy: -35 - Math.random() * 40, r: 1 + Math.random() * 1.6, age: 0, life: 1 + Math.random() * 1.2, color: GOLD[bits.length % 3] });
      if (Math.random() < dt * 7) bits.push({ x: p.x + (Math.random() - .5) * p.w * .5, y: p.y, vx: (Math.random() - .5) * 8, vy: -22 - Math.random() * 14, r: 10 + Math.random() * 6, age: 0, life: 2.4 + Math.random() * 1.2, puff: true, sway: Math.random() * 6 });
      if (Math.random() < dt * 6) bits.push({ x: p.x + (Math.random() - .5) * p.w * .9, y: p.fireY, vx: (Math.random() - .5) * 34, vy: -55 - Math.random() * 45, r: 1 + Math.random(), age: 0, life: .35 + Math.random() * .35, color: '#ffb04a' });
    }
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    bits = bits.filter(b => (b.age += dt) < b.life);
    for (const b of bits) {
      const t = b.age / b.life;
      if (b.puff) { // rises slowly, sways and spreads as it fades
        b.x += (b.vx + Math.sin(b.age * 2 + b.sway) * 10) * dt;
        b.y += b.vy * dt;
        const size = b.r * (1 + t * 2.4);
        ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, t * 1.15)) * .7;
        ctx.drawImage(puffSprite, b.x - size, b.y - size, size * 2, size * 2);
        continue;
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 40 * dt;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  size();
  addEventListener('resize', size);
  raf = requestAnimationFrame(frame);
  return {
    burst: (x, y) => spawn(x, y, 46, 260, GOLD, 60),
    puff: (x, y) => spawn(x, y, 16, 60, SMOKE, 50),
    embers(on) { embers = on; bits = []; },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); },
  };
}
