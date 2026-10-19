// A schematic view of the current model path, on the comparison's existing video clock.
// Path/pose coordinates are model units; helper anchors and the camera are metres. +z is screen-down; dance S is
// the diagonal opening advance, independent of the reference camera's station.
import { DRAC_SCALE } from '../../scene/models/drac.js';
import { rootAt, END } from './path.js';
import { PHRASES, phraseAt } from './phrases.js';
import { HELPERS, HELPER_CENTRE } from './helpers.js';

const COLOUR = { floor: '#efe5cb', grid: '#d8cdb2', ink: '#403d32', path: '#aaa38e', gold: '#b97700',
  green: '#39754c', darkGreen: '#215338', travel: '#087e8b', helper: '#f5c518' };

export function createOverhead(canvas) {
  const ctx = canvas.getContext('2d'), sample = { x: 0, z: 0, yaw: 0 };
  const before = { x: 0, z: 0, yaw: 0 }, after = { x: 0, z: 0, yaw: 0 };
  // Prepared once; rendering only reads these points and the shared pose, never advances its own animation.
  const paths = PHRASES.map(p => {
    const count = Math.max(2, Math.ceil((p.end - p.start) * 15) + 1), points = new Float64Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = p.start + (p.end - p.start) * i / (count - 1);
      rootAt(sample, t);
      points[i * 3] = t; points[i * 3 + 1] = sample.x * DRAC_SCALE; points[i * 3 + 2] = sample.z * DRAC_SCALE;
    }
    return points;
  });
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const include = (x, z) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); };
  for (const p of paths) for (let i = 0; i < p.length; i += 3) include(p[i + 1], p[i + 2]);
  for (const h of HELPERS) include(h.x, h.z);
  minX -= 0.85; maxX += 0.85; minZ -= 0.85; maxZ += 0.85;
  let width = 1, height = 1, scale = 1, ox = 0, oy = 0, ratio = 1;
  const px = x => ox + x * scale, py = z => oy + z * scale;

  function resize() {
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    fit();
  }
  function fit(camera) {
    const x0 = Math.min(minX, (camera?.pos[0] ?? minX) - 0.85), x1 = Math.max(maxX, (camera?.pos[0] ?? maxX) + 0.85);
    const z0 = Math.min(minZ, (camera?.pos[2] ?? minZ) - 0.85), z1 = Math.max(maxZ, (camera?.pos[2] ?? maxZ) + 1.1);
    scale = Math.min((width - 24) / (x1 - x0), (height - 30) / (z1 - z0));
    scale = Math.max(0.01, scale);
    ox = (width - (x1 + x0) * scale) / 2; oy = (height - (z1 + z0) * scale) / 2 - 3;
  }
  function line(points, until = Infinity) {
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < points.length && points[i] <= until; i += 3) {
      if (first) { ctx.moveTo(px(points[i + 1]), py(points[i + 2])); first = false; }
      else ctx.lineTo(px(points[i + 1]), py(points[i + 2]));
    }
    return !first;
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function arrow(x, y, dx, dy, length, colour) {
    const ex = x + dx * length, ey = y + dy * length;
    ctx.strokeStyle = ctx.fillStyle = colour; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - dx * 8 - dy * 4, ey - dy * 8 + dx * 4);
    ctx.lineTo(ex - dx * 8 + dy * 4, ey - dy * 8 - dx * 4); ctx.closePath(); ctx.fill();
  }
  function render(t, pose, camera) {
    fit(camera);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = COLOUR.floor; ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1; ctx.strokeStyle = COLOUR.grid;
    ctx.beginPath();
    for (let x = Math.ceil(minX); x <= maxX; x++) { ctx.moveTo(px(x), py(minZ)); ctx.lineTo(px(x), py(maxZ)); }
    for (let z = Math.ceil(minZ); z <= maxZ; z++) { ctx.moveTo(px(minX), py(z)); ctx.lineTo(px(maxX), py(z)); }
    ctx.stroke();
    ctx.fillStyle = COLOUR.path; circle(px(HELPER_CENTRE[0]), py(HELPER_CENTRE[1]), 2.5);

    ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = COLOUR.path; ctx.lineWidth = 1.5;
    for (const p of paths) { line(p); ctx.stroke(); }
    const current = paths[phraseAt(t).i];
    ctx.strokeStyle = '#d7b86f'; ctx.lineWidth = 4; line(current); ctx.stroke();
    ctx.strokeStyle = COLOUR.gold; ctx.lineWidth = 3; line(current, t);
    ctx.lineTo(px(pose.x * DRAC_SCALE), py(pose.z * DRAC_SCALE)); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 13px system-ui, sans-serif';
    for (const h of HELPERS) {
      const x = px(h.x), y = py(h.z);
      ctx.fillStyle = COLOUR.helper; circle(x, y, 12);
      ctx.fillStyle = COLOUR.ink; ctx.fillText(h.id, x, y + 0.5);
    }
    if (camera) {
      const cx = px(camera.pos[0]), cy = py(camera.pos[2]);
      const ax = camera.target[0] - camera.pos[0], az = camera.target[2] - camera.pos[2], length = Math.hypot(ax, az);
      ctx.fillStyle = COLOUR.ink; ctx.fillRect(cx - 7, cy - 5, 14, 10);
      if (length > 0) arrow(cx, cy, ax / length, az / length, 20, COLOUR.ink);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillText('càmera', cx, cy + 18);
    }

    const x = px(pose.x * DRAC_SCALE), y = py(pose.z * DRAC_SCALE), dx = Math.sin(pose.yaw), dy = Math.cos(pose.yaw);
    // A cyan arrow indicates travel, separately from the green head/facing cue. Holds have no travel arrow.
    rootAt(before, Math.max(0, t - 0.08)); rootAt(after, Math.min(END, t + 0.08));
    const vx = after.x - before.x, vz = after.z - before.z, speed = Math.hypot(vx, vz);
    if (speed > 0.005) arrow(x + vx / speed * 22, y + vz / speed * 22, vx / speed, vz / speed, 22, COLOUR.travel);

    ctx.save(); ctx.translate(x, y); ctx.rotate(-pose.yaw);
    ctx.fillStyle = COLOUR.darkGreen;
    ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(0, -25); ctx.lineTo(5, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COLOUR.green; ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLOUR.darkGreen; circle(-6, 13, 6); circle(6, 13, 6);
    ctx.fillStyle = '#fff3d6'; circle(-7, 15, 1.7); circle(5, 15, 1.7);
    ctx.restore();
    arrow(x + dx * 20, y + dy * 20, dx, dy, 13, COLOUR.darkGreen);
  }
  resize();
  return { resize, render };
}
