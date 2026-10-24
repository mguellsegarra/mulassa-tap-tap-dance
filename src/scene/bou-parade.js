// The festa's procession (Marc 24/10/2026: «que molta gent del públic vagi darrera seu, fa voltes fent una rodona seguint
// NWSE perimetralment»): while its colla carries the Bou once round the plaça (game/bou-dance.js BOU_CARRY, LAP), part of
// the front row runs behind it in two files on the same ring (S -> E -> N -> W), then walks back to its places. Driven
// by the song beat bou-stage.js hands over (PARADE), seekable: a restart before it, or another figure, sends them home.
// crowd.js asks paradeSteer(p, dt) first for each person: true = this module moved them this frame.
import { BOU_CARRY, LAP } from '../game/bou-dance.js';

export const PARADE = { on: false, beat: 0, yaw: 0 };
// who: up to `count` of the front row nearest the ring's start; the files `gap` m behind its middle, `space` m apart,
// `files` m either side of the ring; `run` / `walk` m/s
const PARADE_K = { count: 16, gap: 2.7, space: 0.8, files: 0.45, run: 3.2, walk: 1.4, join: 2, leave: 0.5 };
const paraders = [], paradeAt = { x: 0, z: 0 };
const paradeWorld = (x, z, yaw, out) => { out.x = x * Math.cos(yaw) + z * Math.sin(yaw); out.z = -x * Math.sin(yaw) + z * Math.cos(yaw); return out; };
const [paradeLap0, paradeLap1] = BOU_CARRY.lap, paradeFrom = BOU_CARRY.up - PARADE_K.join, paradeTo = paradeLap1 + PARADE_K.leave;
const paradeLive = () => PARADE.on && PARADE.beat >= paradeFrom && PARADE.beat < paradeTo;

// once a frame, before the crowd steers (crowd.js animCrowd)
export function paradeTick(crowd) {
  if (!paradeLive()) { for (const p of paraders) p.parade = 'home'; paraders.length = 0; return; }
  if (paraders.length) return;
  paradeWorld(LAP.r, 1, PARADE.yaw, paradeAt); // just behind its S point, where the lap starts
  const front = crowd.filter(p => p.row === 0 && !p.parade && (p.qualityScale ?? 1) > 0.5);
  front.sort((a, b) => Math.hypot(a.pos.x - paradeAt.x, a.pos.y - paradeAt.z) - Math.hypot(b.pos.x - paradeAt.x, b.pos.y - paradeAt.z));
  for (const p of front.slice(0, Math.min(PARADE_K.count, Math.floor(crowd.length / 6)))) {
    p.parade = 'run'; p.paradeSlot = paraders.length; p.paradeHome ??= p.pos.clone(); paraders.push(p);
  }
}
// Moves one person under the parade's control (true), or leaves them to their own steering (false).
export function paradeSteer(p, dt) {
  let tx, tz, cap;
  if (p.parade === 'run') {
    const k = p.paradeSlot, a = LAP.a0 + 2 * Math.PI * Math.min(1, Math.max(0, (PARADE.beat - paradeLap0) / (paradeLap1 - paradeLap0)))
      - (PARADE_K.gap + PARADE_K.space * (k >> 1)) / LAP.r, r = LAP.r + (k % 2 ? PARADE_K.files : -PARADE_K.files);
    paradeWorld(r * Math.sin(a), r * Math.cos(a), PARADE.yaw, paradeAt); tx = paradeAt.x; tz = paradeAt.z; cap = PARADE_K.run;
  } else {
    tx = p.paradeHome.x; tz = p.paradeHome.y; cap = PARADE_K.walk;
    if (Math.hypot(tx - p.pos.x, tz - p.pos.y) < 0.15 && p.vel.lengthSq() < 0.04) { // home: their own steering again
      p.parade = null; p.spot.copy(p.paradeHome); p.paradeHome = null; p.away = false; p.vel.set(0, 0); return false;
    }
  }
  const dx = tx - p.pos.x, dz = tz - p.pos.y, d = Math.hypot(dx, dz) || 1, v = Math.min(cap, d * 2.5);
  const e = 1 - Math.exp(-dt / 0.25); // eased: no one bolts from standing
  p.vel.x += (dx / d * v - p.vel.x) * e; p.vel.y += (dz / d * v - p.vel.y) * e;
  p.rest = false; p.pos.addScaledVector(p.vel, dt);
  return true;
}
