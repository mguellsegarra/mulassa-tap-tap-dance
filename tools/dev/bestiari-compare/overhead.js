// The map: the compass marks (W = the opening heading), the path of whichever dance is shown, her outline now.
// path: [{x, z}] samples of that dance; span: [from, to] of the samples to highlight; helpers: optional attendants' spots.
export function createOverhead(canvas, directions) {
  const ctx = canvas.getContext('2d'), W = 560, H = 360, scale = 23, originX = W / 2, originY = 165;
  canvas.width = W; canvas.height = H;
  const x = p => originX + directions.east(p.x, p.z) * scale;
  const y = p => originY + directions.south(p.x, p.z) * scale;
  const compass = [['N', 0, -1], ['S', 0, 1], ['W', -1, 0], ['E', 1, 0]];
  const cx = directions.east(-.95, 10), cy = directions.south(-.95, 10), length = Math.hypot(cx, cy);
  const cameraX = originX + cx / length * 160, cameraY = originY + cy / length * 160;
  return (pose, path, span, helpers = null) => {
    ctx.fillStyle = '#f1e6c9'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#dfd3b6'; ctx.lineWidth = 1;
    for (let n = 0; n < W; n += scale) { ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, H); ctx.stroke(); }
    for (let n = 0; n < H; n += scale) { ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(W, n); ctx.stroke(); }
    function trail(a, b, color, width) {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
      for (let i = Math.max(0, a); i <= Math.min(b, path.length - 1); i++) {
        if (i === Math.max(0, a)) ctx.moveTo(x(path[i]), y(path[i])); else ctx.lineTo(x(path[i]), y(path[i]));
      }
      ctx.stroke();
    }
    trail(0, path.length - 1, '#cbc1aa', 1);
    trail(span[0], span[1], '#b87b08', 3);
    ctx.fillStyle = '#6d6455'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Marques de guió · W = orientació inicial', W / 2, 20);
    ctx.strokeStyle = '#8d846e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(originX - 5, originY); ctx.lineTo(originX + 5, originY); ctx.moveTo(originX, originY - 5); ctx.lineTo(originX, originY + 5); ctx.stroke();
    for (const [name, dx, dy] of compass) {
      const mx = originX + dx * 132, my = originY + dy * 132;
      ctx.fillStyle = '#eac333'; ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#514820'; ctx.font = 'bold 15px system-ui'; ctx.textBaseline = 'middle'; ctx.fillText(name, mx, my + 1);
    }
    if (helpers) for (const h of helpers) { // the game's attendants, on their marks (a person: a small dot)
      ctx.fillStyle = '#5d7d9a'; ctx.beginPath(); ctx.arc(x(h), y(h), 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
    ctx.save(); ctx.translate(x(pose), y(pose)); ctx.rotate(-directions.angle(pose.yaw));
    ctx.fillStyle = '#9e3040'; ctx.fillRect(-.55 * scale, -1.65 * scale, 1.1 * scale, 3.3 * scale);
    ctx.fillStyle = '#267346'; ctx.fillRect(-.57 * scale, -.825 * scale, 1.14 * scale, 1.35 * scale);
    ctx.fillStyle = '#75462e'; ctx.fillRect(-.22 * scale, 1.4 * scale, .44 * scale, .8 * scale);
    ctx.beginPath(); ctx.moveTo(0, 2.55 * scale); ctx.lineTo(-.24 * scale, 2.2 * scale); ctx.lineTo(.24 * scale, 2.2 * scale); ctx.closePath(); ctx.fill(); ctx.restore();
    // Opening camera is an independent direction on the rim, not the S marker.
    ctx.save(); ctx.translate(cameraX, cameraY); ctx.rotate(Math.atan2(-cx, cy));
    ctx.fillStyle = '#343c48'; ctx.fillRect(-10, -6, 20, 14);
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(0, -14); ctx.lineTo(7, -6); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#514b3c'; ctx.font = '13px system-ui'; ctx.fillText('Càmera de 2017', cameraX, 348);
  };
}
