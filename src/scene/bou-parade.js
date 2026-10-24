// The festa's procession (Marc 24/10/2026: «la gent del públic es posa just darrera del bou i el segueix fent una
// rotllana»): while its colla carries the Bou once round the plaça (game/bou-dance.js BOU_CARRY, LAP), part of the front
// row lines up right behind its rump, one file (Marc 24/10/2026: «fent una fila i corrent picant de mans festiu») on the same ring (S -> E -> N -> W) and follows it round, a ring of
// people more than half way round the plaça, then walks back to its places. Driven by the song beat bou-stage.js hands
// over (PARADE), seekable: a restart before it, or another figure, sends them home.
// crowd.js asks paradeSteer(p, dt) first for each person: true = this module moved them this frame.
import { BOU_CARRY, LAP, lapWay } from '../game/bou-dance.js';
import { BOU_CAPATAS, bouToWorld } from './bou-colla.js';

export const PARADE = { on: false, beat: 0, yaw: 0, x: 0, z: 0, heading: 0, colla: [] }; // x z heading: the Bou's (compass frame), an obstacle; colla: its attendants ({ pos: Vector2 }, the plaça's), too
// who: up to `count` (and `share` of the crowd) of those standing round it, each the nearest to their place; the conga's first row `gap` m (along the
// ring) behind its middle (its tail ends 1.45 m back, the rear attendants 0.7), `space` m apart, `ranks` files `files` m apart round
// of the ring, weaving `weave` m in and out; `run` / `walk` m/s; `room` m kept from each other, `wide` m from the capatàs on the way; `bou` m from its spine, `clear` m from an attendant
// who and when: up to `count` (and `share` of the crowd), one file behind it; its first `tail` side by side right at its
// rump (`touch` m from its middle), reaching to touch it, then the file on its trail round the ring, `gap` m behind its
// middle, `space` m apart. They join one at a time from its head, `every` beats apart from `after` beats past its
// colla's grip, each the one standing nearest to their place (in from outside, so no one crosses the file); `leadOut`
// beats before it is lowered they leave one at a time from the tail, `outEvery` apart, each straight out to the front
// row (Marc 24/10/2026: «que es vegi la serp des del principi… quan van a baixar el bou, un o dos segons abans han de
// marxar suaument»). `run` / `walk` m/s; `room` m kept from each other, `wide` m from the capatàs on the way; `bou` m from
// its footprint, `clear` m from an attendant; the hard limits `touchMin`, `bouMin`, `collaMin`
export const PARADE_K = { count: 12, share: 0.6, tail: 2, touch: 2.02, gap: 2.75, space: 0.9, files: 0.6, weave: 0.08, run: 5, walk: 1.4,
  every: 0.5, after: 0.5, leadOut: 4, outEvery: 0.25, room: 0.5, touchMin: 0.45, bouMin: 0.12, collaMin: 0.52, hop: 0.16, clear: 0.8, wide: 1.2, bou: 0.22 };
const paraders = [], homers = [], PARADE_LISTS = [paraders, homers], paradeAt = { x: 0, z: 0 }; // in the file; walking back
const paradeWorld = (x, z, yaw, out) => { out.x = x * Math.cos(yaw) + z * Math.sin(yaw); out.z = -x * Math.sin(yaw) + z * Math.cos(yaw); return out; };
export const paradeJoinAt = k => BOU_CARRY.grip + PARADE_K.after + k * PARADE_K.every;
export const paradeLeaveAt = (k, n) => BOU_CARRY.lower - PARADE_K.leadOut + (n - 1 - k) * PARADE_K.outEvery;
const paradeLive = () => PARADE.on && PARADE.beat >= paradeJoinAt(0) && PARADE.beat < BOU_CARRY.lower;
let paradeN = 0, paradeNext = 0; // this festa's file length, the next place to fill

// person k's place at song beat `beat` (the plaça's metres)
export function paradeSlot(k, beat, yaw, out) {
  if (k < PARADE_K.tail) {
    const h = PARADE.heading, side = (k - (PARADE_K.tail - 1) / 2) * PARADE_K.files;
    return paradeWorld(PARADE.x - Math.sin(h) * PARADE_K.touch + Math.cos(h) * side, PARADE.z - Math.cos(h) * PARADE_K.touch - Math.sin(h) * side, yaw, out);
  }
  const j = k - PARADE_K.tail, lap = lapWay(beat); // (the Bou's own pace round)
  const a = LAP.a0 + 2 * Math.PI * LAP.turns * lap - (PARADE_K.gap + PARADE_K.space * j) / LAP.r;
  const r = LAP.r + PARADE_K.weave * Math.sin(beat * Math.PI * 0.5 + j * 0.6); // dancing, not marching: the file sways in and out, a wave down it
  return paradeWorld(r * Math.sin(a), r * Math.cos(a), yaw, out);
}
// once a frame, before the crowd steers (crowd.js animCrowd)
export function paradeTick(crowd) {
  if (!paradeLive()) { for (const p of paraders) { p.parade = 'home'; homers.push(p); } paraders.length = 0; paradeN = paradeNext = 0; return; }
  const n = paradeN ||= Math.min(PARADE_K.count, Math.floor(crowd.length * PARADE_K.share));
  for (let i = paraders.length - 1; i >= 0; i--) { // leaving, from the tail: straight out to the front row's distance
    const p = paraders[i];
    if (PARADE.beat < paradeLeaveAt(p.paradeSlot, n)) continue;
    const a = Math.atan2(p.pos.x, p.pos.y), r = Math.hypot(p.paradeHome.x, p.paradeHome.y);
    p.paradeHome.set(r * Math.sin(a), r * Math.cos(a)); p.parade = 'home'; homers.push(p); paraders.splice(i, 1);
  }
  const cap = bouToWorld(BOU_CAPATAS.x, BOU_CAPATAS.z, PARADE.yaw);
  for (; paradeNext < n && PARADE.beat >= paradeJoinAt(paradeNext); paradeNext++) { // joining, from the head
    if (PARADE.beat >= paradeLeaveAt(paradeNext, n)) continue;
    paradeSlot(paradeNext, PARADE.beat, PARADE.yaw, paradeAt);
    let best = null, bd = Infinity;
    for (const p of crowd) {
      if (p.parade || p.thr || (p.qualityScale ?? 1) <= 0.5) continue;
      const ax = p.pos.x, az = p.pos.y, bx = paradeAt.x - ax, bz = paradeAt.z - az, d = Math.hypot(bx, bz);
      const u = Math.min(1, Math.max(0, ((cap.x - ax) * bx + (cap.z - az) * bz) / (d * d || 1)));
      if (d < bd && Math.hypot(ax + bx * u - cap.x, az + bz * u - cap.z) > PARADE_K.wide) { bd = d; best = p; } // (the capatàs off their way)
    }
    if (!best) continue;
    best.parade = 'run'; best.paradeSlot = paradeNext; best.paradeHome ??= best.pos.clone(); paraders.push(best);
  }
}
// Moves one person under the parade's control (true), or leaves them to their own steering (false).
export function paradeSteer(p, dt) {
  let tx, tz, cap, fx = 0, fz = 0;
  if (p.parade === 'run') {
    paradeSlot(p.paradeSlot, PARADE.beat, PARADE.yaw, paradeAt); tx = paradeAt.x; tz = paradeAt.z; cap = PARADE_K.run;
    // run at their place's own pace (it moves with the Bou), closing the gap on top: a lag-free chase
    if (p.paradeAt && dt > 0 && Math.hypot(tx - p.paradeAt.x, tz - p.paradeAt.y) < 0.5) { fx = (tx - p.paradeAt.x) / dt; fz = (tz - p.paradeAt.y) / dt; }
    (p.paradeAt ??= p.pos.clone()).set(tx, tz);
  } else {
    tx = p.paradeHome.x; tz = p.paradeHome.y; cap = PARADE_K.walk;
    if (Math.hypot(tx - p.pos.x, tz - p.pos.y) < 0.15 && p.vel.lengthSq() < 0.04) { // home: their own steering again
      p.parade = null; p.spot.copy(p.paradeHome); p.paradeHome = null; p.paradeAt = null; p.away = false; p.vel.set(0, 0);
      const i = homers.indexOf(p); if (i >= 0) homers.splice(i, 1); return false;
    }
  }
  const dx = tx - p.pos.x, dz = tz - p.pos.y, d = Math.hypot(dx, dz) || 1, v = Math.min(cap, d * 2.5);
  let ax = fx + dx / d * v, az = fz + dz / d * v;
  const sp = Math.hypot(ax, az); if (sp > cap) { ax *= cap / sp; az *= cap / sp; }
  { // and round the Bou itself: its footprint (tail 1.65 m back, muzzle 1.95 ahead, flanks 0.66), kept `bou` m clear
    paradeWorld(PARADE.x, PARADE.z, PARADE.yaw, paradeAt);
    const h = PARADE.heading + PARADE.yaw, fx = Math.sin(h), fz = Math.cos(h), ox = p.pos.x - paradeAt.x, oz = p.pos.y - paradeAt.z;
    const al = ox * fx + oz * fz, sd = ox * fz - oz * fx, ea = Math.max(0, al - 1.95, -1.65 - al), es = Math.max(0, Math.abs(sd) - 0.66);
    const o = Math.hypot(ea, es), room = PARADE_K.bou + 0.2; // (+ their own half-width)
    if (o < room) { // pushed straight out of the nearest side (from inside: out through the nearer end or flank)
      const na = ea > 0 ? Math.sign(al) * ea : 0, ns = es > 0 ? Math.sign(sd) * es : 0, len = Math.hypot(na, ns);
      const ua = len ? na / len : (Math.abs(sd) > 0.66 - Math.min(1.95 - al, al + 1.65) ? 0 : Math.sign(al)), us = len ? ns / len : (ua ? 0 : Math.sign(sd) || 1);
      const k = Math.max(cap, 2.5) * 5 * (1 - o / room);
      ax += (ua * fx + us * fz) * k; az += (ua * fz - us * fx) * k;
    }
  }
  for (const q of PARADE.colla) { // the attendants running in and back
    const ox = p.pos.x - q.pos.x, oz = p.pos.y - q.pos.y, o = Math.hypot(ox, oz);
    if (o < PARADE_K.clear && o > 1e-6) { const k = Math.max(cap, 2.5) * 4 * (1 - o / PARADE_K.clear) / o; ax += ox * k; az += oz * k; }
  }
  for (const list of PARADE_LISTS) for (const q of list) { // running in or round, or walking home, they step round each other
    if (q === p) continue;
    const ox = p.pos.x - q.pos.x, oz = p.pos.y - q.pos.y, o = Math.hypot(ox, oz);
    if (o < PARADE_K.room && o > 1e-6) { const k = cap * 7 * (1 - o / PARADE_K.room) / o; ax += ox * k; az += oz * k; }
  }
  const e = 1 - Math.exp(-dt / (p.parade === 'run' ? 0.12 : 0.25)); // eased: no one bolts from standing (the chase, quicker)
  p.vel.x += (ax - p.vel.x) * e; p.vel.y += (az - p.vel.y) * e;
  p.rest = false; p.pos.addScaledVector(p.vel, dt);
  // the hard limits, as crowd.js's separate(): never through its colla or each other, nor (last, it wins) into the Bou's footprint
  for (let pass = 0; pass < 3; pass++) { // (three times: a push off the Bou or its colla can land them on a neighbour)
    for (const q of PARADE.colla) { const ox = p.pos.x - q.pos.x, oz = p.pos.y - q.pos.y, o = Math.hypot(ox, oz); if (o < PARADE_K.collaMin && o > 1e-6) { const k = (PARADE_K.collaMin - o) / o; p.pos.x += ox * k; p.pos.y += oz * k; } }
    for (const list of PARADE_LISTS) for (const q of list) {
      if (q === p) continue;
      const ox = p.pos.x - q.pos.x, oz = p.pos.y - q.pos.y, o = Math.hypot(ox, oz);
      if (o < PARADE_K.touchMin && o > 1e-6) { const k = (PARADE_K.touchMin - o) / o; p.pos.x += ox * k; p.pos.y += oz * k; }
    }
    paradeWorld(PARADE.x, PARADE.z, PARADE.yaw, paradeAt);
    { const h = PARADE.heading + PARADE.yaw, fx = Math.sin(h), fz = Math.cos(h), ox = p.pos.x - paradeAt.x, oz = p.pos.y - paradeAt.z;
      const al = ox * fx + oz * fz, sd = ox * fz - oz * fx, m = 0.2 + PARADE_K.bouMin;
      const pa = Math.min(1.95 + m - al, al + 1.65 + m), ps = 0.66 + m - Math.abs(sd); // how deep inside the grown footprint
      if (pa > 0 && ps > 0) { if (ps < pa) { const k = Math.sign(sd) || 1; p.pos.x += fz * k * ps; p.pos.y -= fx * k * ps; } else { const k = 1.95 + m - al < al + 1.65 + m ? 1 : -1; p.pos.x += fx * k * pa; p.pos.y += fz * k * pa; } } }
  }
  return true;
}
