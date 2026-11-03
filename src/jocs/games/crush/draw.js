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

// A phrase or a banner, over the middle of the board (showText in view.js).
export function drawFlash(ctx, flash, bx, by, bw, bh, cell, zoom) {
  const t = flash.age / flash.dur;
  ctx.globalAlpha = t > .7 ? (1 - t) / .3 : 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontAt = px => `800 ${px}px 'Baloo 2', system-ui, sans-serif`;
  ctx.font = fontAt(100);
  // the longest phrase still has to fit the narrowest board
  const size = Math.min(cell * (flash.banner ? .62 : .8), bw * .88 / ctx.measureText(flash.text).width * 100);
  if (flash.banner) {
    const band = size * 1.9;
    ctx.fillStyle = 'rgba(27, 20, 32, .86)';
    ctx.fillRect(bx, by + bh / 2 - band / 2, bw, band);
  }
  ctx.font = fontAt(Math.round(size * zoom));
  ctx.lineWidth = Math.max(4, size * .18);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1b1420';
  ctx.fillStyle = '#f5c518';
  ctx.strokeText(flash.text, bx + bw / 2, by + bh / 2);
  ctx.fillText(flash.text, bx + bw / 2, by + bh / 2);
  ctx.globalAlpha = 1;
}
