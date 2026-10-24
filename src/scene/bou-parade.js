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
export const PARADE_K = { count: 20, share: 0.6, tail: 3, touch: 2.02, ranks: 2, hold: 0.6, out: 0.6, close: 3, weave: 0.08, gap: 2.75, space: 0.85, files: 0.6, run: 5, form: 4.5, stagger: 0.04, walk: 1.4, join: 1, leave: 0.5, room: 0.5, touchMin: 0.45, bouMin: 0.12, collaMin: 0.52, hop: 0.16, clear: 0.8, wide: 1.2, bou: 0.22 };
const paraders = [], homers = [], PARADE_LISTS = [paraders, homers], paradeAt = { x: 0, z: 0 }; // running behind it; walking back home
const paradeWorld = (x, z, yaw, out) => { out.x = x * Math.cos(yaw) + z * Math.sin(yaw); out.z = -x * Math.sin(yaw) + z * Math.cos(yaw); return out; };
// they set off `join` beats after its colla, running in behind them (their paths never cross: the colla is already in
// past the ring when they get there), a snake behind it by the time it is lifted (Marc 24/10/2026)
const [paradeLap0, paradeLap1] = BOU_CARRY.lap, paradeFrom = BOU_CARRY.come + PARADE_K.join, paradeTo = paradeLap1 + PARADE_K.leave;
const paradeLive = () => PARADE.on && PARADE.beat >= paradeFrom && PARADE.beat < paradeTo;

// person k's place at song beat `beat` (the plaça's metres): the first `tail` right at its rump, straight behind it
// (`touch` m from its middle: a hand from its tail), reaching to touch it; the rest a conga `ranks` abreast on its
// trail round the ring
export function paradeSlot(k, beat, yaw, out) {
  if (k < PARADE_K.tail) {
    const h = PARADE.heading, side = (k - (PARADE_K.tail - 1) / 2) * PARADE_K.files;
    return paradeWorld(PARADE.x - Math.sin(h) * PARADE_K.touch + Math.cos(h) * side, PARADE.z - Math.cos(h) * PARADE_K.touch - Math.sin(h) * side, yaw, out);
  }
  // waiting a little further back and further out while it is lifted in the middle and carried out to its start (its
  // colla closing in on its flanks, its rear swinging that way), closing in as it sets off
  const wait = 1 - Math.min(1, Math.max(0, (beat - paradeLap0) / PARADE_K.close)), ease = wait * wait * (3 - 2 * wait), back = PARADE_K.hold * ease;
  const j = k - PARADE_K.tail, n = PARADE_K.ranks, r = LAP.r + PARADE_K.out * ease + (j % n - (n - 1) / 2) * PARADE_K.files, lap = lapWay(beat); // (the Bou's own pace round)
  const a = LAP.a0 + 2 * Math.PI * LAP.turns * lap - (PARADE_K.gap + back + PARADE_K.space * Math.floor(j / n)) / LAP.r; // rows abreast (an inner file spaced by its own radius would wrap round onto the Bou's head)
  // dancing, not marching: each row weaves a little in and out on its own beat
  const row = Math.floor(j / n), rr = r + PARADE_K.weave * Math.sin(beat * Math.PI * (0.5 + 0.13 * (row % 5)) + row * 1.7); // (a row sways as one)
  return paradeWorld(rr * Math.sin(a), rr * Math.cos(a), yaw, out);
}
// once a frame, before the crowd steers (crowd.js animCrowd)
export function paradeTick(crowd) {
  if (!paradeLive()) { for (const p of paraders) { p.parade = 'home'; homers.push(p); } paraders.length = 0; return; }
  if (paraders.length) return;
  // An orderly join (Marc 24/10/2026: «fins que no es forma és un merder»): the n standing nearest to the snake's places
  // (from any row: a sixth of a medium crowd, 59 people, made a snake of 9; never one who comes and goes with how well
  // it goes, PRES p.thr, nor one whose run in or back would pass the capatàs), paired with the places in the same order
  // round the plaça (no two runs cross), setting off one after another from the snake's head, at a jog (`form` m/s).
  const n0 = Math.min(PARADE_K.count, Math.floor(crowd.length * PARADE_K.share));
  const slots = Array.from({ length: n0 }, (_, k) => { paradeSlot(k, paradeLap0, PARADE.yaw, paradeAt); return { k, x: paradeAt.x, z: paradeAt.z }; });
  const cap = bouToWorld(BOU_CAPATAS.x, BOU_CAPATAS.z, PARADE.yaw), nearest = p => {
    let best = null, bd = Infinity; for (const q of slots) { const d = Math.hypot(p.pos.x - q.x, p.pos.y - q.z); if (d < bd) { bd = d; best = q; } } return { q: best, d: bd };
  }, clearOf = (p, q) => { // the capatàs off the straight run from p to place q
    const ax = p.pos.x, az = p.pos.y, bx = q.x - ax, bz = q.z - az;
    const u = Math.min(1, Math.max(0, ((cap.x - ax) * bx + (cap.z - az) * bz) / (bx * bx + bz * bz || 1)));
    return Math.hypot(ax + bx * u - cap.x, az + bz * u - cap.z) > PARADE_K.wide;
  };
  const front = crowd.filter(p => !p.parade && !p.thr && (p.qualityScale ?? 1) > 0.5).map(p => ({ p, ...nearest(p) })).filter(o => clearOf(o.p, o.q));
  const n = Math.min(n0, front.length);
  slots.length = n;
  const picked = front.sort((a, b) => a.d - b.d).slice(0, n).map(o => o.p);
  const ang = (x, z) => Math.atan2(x, z), byAng = (a, b) => a.a - b.a;
  const ps = picked.map(p => ({ p, a: ang(p.pos.x, p.pos.y) })).sort(byAng), ss = slots.map(q => ({ q, a: ang(q.x, q.z) })).sort(byAng);
  let shift = 0, best = Infinity; // the rotation of one ring onto the other that runs least
  for (let r = 0; r < n; r++) { let sum = 0; for (let i = 0; i < n; i++) { const p = ps[i].p, q = ss[(i + r) % n].q; sum += Math.hypot(p.pos.x - q.x, p.pos.y - q.z); } if (sum < best) { best = sum; shift = r; } }
  for (let i = 0; i < n; i++) {
    const p = ps[i].p, k = ss[(i + shift) % n].q.k;
    p.parade = 'run'; p.paradeSlot = k; p.paradeGo = paradeFrom + k * PARADE_K.stagger; p.paradeHome ??= p.pos.clone(); paraders.push(p);
  }
}
// Moves one person under the parade's control (true), or leaves them to their own steering (false).
export function paradeSteer(p, dt) {
  let tx, tz, cap, fx = 0, fz = 0;
  if (p.parade === 'run') {
    if (PARADE.beat < p.paradeGo) return false; // not their turn yet: still with the crowd, cheering
    paradeSlot(p.paradeSlot, PARADE.beat, PARADE.yaw, paradeAt); tx = paradeAt.x; tz = paradeAt.z; cap = PARADE.beat < paradeLap0 ? PARADE_K.form : PARADE_K.run;
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
