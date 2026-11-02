// Canvas drawing with no state of its own.
// A round badge in the corner says which line it clears; nothing covers the figure.
export function drawBadge(ctx, cx, cy, size, dir) {
  const r = size * .2, x = cx + size * .27, y = cy + size * .27, arm = r * .62, head = r * .36;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1b1420';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = Math.max(1.5, r * .16);
  ctx.stroke();
  if (dir === 'col') ctx.rotate(Math.PI / 2);
  ctx.lineWidth = Math.max(1.5, r * .2);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-arm, 0);
  ctx.lineTo(arm, 0);
  for (const side of [-1, 1]) {
    ctx.moveTo(side * (arm - head), -head);
    ctx.lineTo(side * arm, 0);
    ctx.lineTo(side * (arm - head), head);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawBeams(ctx, beams, box) {
  const { cell, x: bx, y: by } = box;
  ctx.lineCap = 'round';
  for (const b of beams) {
    const fade = 1 - b.age / b.dur;
    if (b.bolts) {
      ctx.strokeStyle = `rgba(255, 236, 140, ${fade})`;
      ctx.lineWidth = Math.max(1.5, cell * .05);
      for (const pts of b.bolts) {
        ctx.beginPath();
        pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](bx + x * cell, by + y * cell));
        ctx.stroke();
      }
      continue;
    }
    const reach = Math.min(1, b.age / (b.dur * .5)) * Math.max(box.cols, box.rows) * cell;
    const thick = cell * .7 * fade;
    ctx.fillStyle = `rgba(255, 214, 110, ${fade * .7})`;
    if (b.dir === 'row') {
      const cx = bx + (b.c + .5) * cell, cy = by + (b.r + .5) * cell;
      const x0 = Math.max(bx, cx - reach), x1 = Math.min(bx + box.cols * cell, cx + reach);
      ctx.fillRect(x0, cy - thick / 2, x1 - x0, thick);
    } else {
      const cx = bx + (b.c + .5) * cell, cy = by + (b.r + .5) * cell;
      const y0 = Math.max(by, cy - reach), y1 = Math.min(by + box.rows * cell, cy + reach);
      ctx.fillRect(cx - thick / 2, y0, thick, y1 - y0);
    }
  }
}

export function zigzag(from, to) {
  const pts = [[from.c + .5, from.r + .5]];
  for (let i = 1; i < 4; i++) {
    const f = i / 4;
    pts.push([from.c + .5 + (to.c - from.c) * f + (Math.random() - .5) * .5, from.r + .5 + (to.r - from.r) * f + (Math.random() - .5) * .5]);
  }
  pts.push([to.c + .5, to.r + .5]);
  return pts;
}
