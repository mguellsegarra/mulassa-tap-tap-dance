export function createOverhead(canvas, motion) {
  const ctx = canvas.getContext('2d'), W = 560, H = 360, scale = 31, originX = W / 2, originY = 140;
  canvas.width = W; canvas.height = H;
  const path = Array.from({ length: 333 }, (_, i) => motion.pose(i / 2));
  const x = p => originX + p.x * scale, y = p => originY + p.z * scale;
  return (t, pose, phase, showPath = true) => {
    ctx.fillStyle = '#f1e6c9'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#dfd3b6'; ctx.lineWidth = 1;
    for (let n = 0; n < W; n += scale) { ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, H); ctx.stroke(); }
    for (let n = 0; n < H; n += scale) { ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(W, n); ctx.stroke(); }
    function trail(a, b, color, width) {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
      for (let i = a; i <= Math.min(b, path.length - 1); i++) {
        if (i === a) ctx.moveTo(x(path[i]), y(path[i])); else ctx.lineTo(x(path[i]), y(path[i]));
      }
      ctx.stroke();
    }
    if (showPath) {
      trail(0, path.length - 1, '#b6aa90', 2);
      trail(Math.floor(phase.start * 2), Math.ceil(phase.end * 2), '#c88813', 4);
    }
    ctx.fillStyle = '#6d6455'; ctx.font = '14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Zona inicial', originX, originY - 85);
    ctx.save(); ctx.translate(x(pose), y(pose)); ctx.rotate(-pose.yaw);
    ctx.fillStyle = '#9e3040'; ctx.fillRect(-16, -49, 32, 98);
    ctx.fillStyle = '#267346'; ctx.fillRect(-17, -22, 34, 32);
    ctx.fillStyle = '#75462e'; ctx.fillRect(-7, 39, 14, 30);
    ctx.beginPath(); ctx.moveTo(0, 82); ctx.lineTo(-8, 69); ctx.lineTo(8, 69); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#343c48'; ctx.fillRect(originX - 15, 305, 30, 20);
    ctx.beginPath(); ctx.moveTo(originX - 10, 305); ctx.lineTo(originX, 292); ctx.lineTo(originX + 10, 305); ctx.fill();
    ctx.fillText('Càmera · orientació inicial', originX, 348);
  };
}
