import { shoeSeparation } from './mula-supports.js';

// Deterministic phrase interpolation and world-space contacts, adapted from the Bou reference study.
const clamp = u => Math.min(1, Math.max(0, u));
const ease = u => { u = clamp(u); return u * u * u * (10 + u * (-15 + 6 * u)); };
const slope = (keys, j) => (keys[j + 1][1] - keys[j][1]) / (keys[j + 1][0] - keys[j][0]);
function tangent(keys, j) {
  if (j === 0 || j === keys.length - 1) return 0;
  const left = slope(keys, j - 1), right = slope(keys, j);
  return left * right <= 0 ? 0 : 2 * left * right / (left + right);
}
export function sampleTrack(keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], span = b[0] - a[0], u = clamp((t - a[0]) / span);
  // Monotone Hermite: preserve travel through anchors; stop only at a reversal or an observed hold.
  return (2 * u ** 3 - 3 * u ** 2 + 1) * a[1] + (u ** 3 - 2 * u ** 2 + u) * span * tangent(keys, i)
    + (-2 * u ** 3 + 3 * u ** 2) * b[1] + (u ** 3 - u ** 2) * span * tangent(keys, i + 1);
}
// The carriers' leg gesture on the music (26.4-27.8 s, Marc 23/10/2026): one leg stretched forward and out, straight,
// heel on the floor and toe up, for about three beats, then the other. Inferred: an 8-beat cycle, both carriers in phase.
// heel: the foot's lift stretched forward (its heel corner, 10 cm back, stays on the floor); tiptoe: stretched back, toe
// down, the toe (17 cm forward) reaching 17 * sin(.45) = 7.4 cm down: lifted that far, it rests on the floor, not through it
const GESTURE = { reach: .34, back: .28, out: .06, toe: .45, heel: .05, tiptoe: .076 };
const envelope = c => clamp(c < .5 ? ease(c / .5) : c < 3 ? 1 : c < 3.5 ? 1 - ease((c - 3) / .5) : 0);
export function legGesture(beats, first) {
  if (!beats?.length) return () => 0;
  const zero = beats.findIndex(b => b >= first - 1e-6);
  // Left feet are layout 0 and 2, right 1 and 3; the left leg leads the cycle.
  return (t, index) => {
    if (t < beats[0]) return 0;
    // Past the last tracked beat the grid carries on at its last interval.
    let lo = 0, hi = beats.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (beats[mid] <= t) lo = mid; else hi = mid; }
    if (t >= beats[hi]) lo = hi;
    const span = lo < beats.length - 1 ? beats[lo + 1] - beats[lo] : beats[lo] - beats[lo - 1];
    const s = lo - zero + (t - beats[lo]) / span - (index % 2) * 4;
    return s < 0 ? 0 : envelope(s % 8);
  };
}
// Two people, one fore and one aft, 1.3 m apart (33 s, espadrille scale). Nominal positions are inferred; contacts stay in world space between swings.
// A stretched leg comes back to where the body now needs it, so on holds the gesture itself walks the feet; ordinary
// steps wait for both of a carrier's feet to be down, unless the body turns or travels too far to wait (fast turns).
const layout = [-.66, .66].flatMap(z => [-.13, .13].map(x => ({ x, z })));
const nominal = (p, i) => ({ x: p.x + layout[i].x * Math.cos(p.yaw) + layout[i].z * Math.sin(p.yaw),
  z: p.z - layout[i].x * Math.sin(p.yaw) + layout[i].z * Math.cos(p.yaw), yaw: p.yaw });
// legRoom: the least distance across between a carrier's two feet (m; .26 at rest, legs .14-.16 wide).
// due/half/late: step units off before a pair steps on a beat / on a half beat / off the grid; a step lasts `share` of a half beat.
const STEP = { legRoom: .22, legPush: .45, due: .5, half: .8, late: 2.5, share: .9, min: .18, max: .34, lead: .3, lift: .1, run: { speed: .3, carrier: .5, share: 1, lead: .5 } };   // lift: a stepping sole 1.5 cm over the other shoe (8.5 cm) when it passes over it
export function planBouFeet(poseAt, start, end, gesture = () => 0) {
  const initial = layout.map((_, i) => nominal(poseAt(start), i)), planted = initial.map(p => ({ ...p }));
  const events = layout.map(() => []), busy = [start, start, start, start], quiet = [start, start, start, start];
  // Gesture cycles a foot sits out, [from, to], for the sampler too.
  const rests = layout.map(() => []), rest = (i, a, b) => { if (b > a) { rests[i].push([a, b]); quiet[i] = Math.max(quiet[i], b); } };
  const zeroAfter = (i, t) => { while (t < end && gesture(t, i) !== 0) t += .005; return t; };
  const land = (i, at, most = STEP.legPush) => {
    const to = nominal(poseAt(at), i), target = { ...to }, separation = {};
    // Its own side of its partner, a leg's room apart (the trousers are wider than the shoes): a body turning or sliding
    // sideways would otherwise land a foot across the other one, and the two legs through each other.
    const mate = planted[i ^ 1], side = i % 2 ? 1 : -1, c = Math.cos(to.yaw), s = Math.sin(to.yaw);
    const short = STEP.legRoom - side * ((target.x - mate.x) * c - (target.z - mate.z) * s);
    const push = Math.min(short, most); if (push > 0) { target.x += side * push * c; target.z -= side * push * s; }
    for (let ring = 0; ring <= 20; ring++) for (const sign of (ring ? [-1, 1] : [0])) {
      to.x = target.x + sign * ring * .025 * Math.sin(to.yaw);
      to.z = target.z + sign * ring * .025 * Math.cos(to.yaw);
      // Clear of the others' planted feet and of where a stretched leg may reach meanwhile.
      if (planted.every((other, j) => i === j || (shoeSeparation(to, other, separation).gap >= .018
        && shoeSeparation(to, stretch(other, j, 1), separation).gap >= .018))) return to;
    }
    throw new Error(`No clear Bou landing at ${at}, foot ${i}`);
  };
  const out = (i, t) => (t < quiet[i] ? 0 : gesture(t, i));
  // How far a foot is from where the body wants it, in step units (0.11 m, 0.2 rad).
  const gap = (i, p) => { const n = nominal(p, i), f = planted[i]; return Math.max(Math.hypot(n.x - f.x, n.z - f.z) / .11, Math.abs(n.yaw - f.yaw) / .2); };
  let free = start, group = 0, lastBeat = poseAt(start).beat;
  // each carrier's centre (fore, aft): it runs only when its middle travels and both carriers do (run.carrier); a body
  // turning round its rear (the opening's pivots, the rear carrier ~0.3 m/s) is walked
  const ends = q => [.66, -.66].map(z => ({ x: q.x + z * Math.sin(q.yaw), z: q.z + z * Math.cos(q.yaw) }));
  let prev = ends(poseAt(start));
  for (let frame = 1; start + frame / 100 < end; frame++) {
    const t = start + frame / 100, p = poseAt(t), beats = (p.beat - lastBeat) * 100;   // beats a second here
    // Ordinary steps keep the music (Marc, 24/10/2026: natural steps when it turns, not a shuffle): a pair steps on a
    // beat when half a step unit out, on the half beat between only when further behind (a fast turn), taking most of a
    // half beat; only a body running away from its feet steps off the grid.
    const onHalf = Math.floor(p.beat * 2) !== Math.floor(lastBeat * 2), onBeat = Math.floor(p.beat) !== Math.floor(lastBeat); lastBeat = p.beat;
    // No stretch when the body will turn or travel too far for the carrier to stay put until the leg is back.
    for (let i = 0; i < 4; i++) if (t >= quiet[i] && gesture(t - .01, i) === 0 && gesture(t, i) !== 0) {
      const back = zeroAfter(i, t);
      for (let u = t; u < back; u += .05) { const q = poseAt(u); if (gap(i, q) > 5 || gap(i ^ 1, q) > 5) { rest(i, t - .01, back); break; } }
    }
    for (let i = 0; i < 4; i++) if (t >= busy[i] && t >= quiet[i] && Math.abs(gesture(t - .01, i)) >= .999 && Math.abs(gesture(t, i)) < .999) {
      // Small corrections ride on the returning leg; bigger moves are left to ordinary steps (it would cross the other foot).
      // A leg swung through to the other side (forward, then back) is not returning yet: it slides home on its last fold.
      const finish = zeroAfter(i, t);
      let again = false; for (let u = t + .05; u < finish && !again; u += .02) again = Math.abs(gesture(u, i)) >= .999;
      if (again) continue;
      const to = gap(i, poseAt(finish)) < 2 ? land(i, finish) : { ...planted[i] };
      events[i].push({ start: t, end: finish, from: { ...planted[i] }, to, gesture: true });
      Object.assign(planted[i], to); busy[i] = finish;
    }
    // Running (the festa's carried laps, Marc 24/10/2026: «corrent al ritme de la música»): no waiting for a foot to fall
    // behind; one side of both carriers steps on every half beat, the other on the next (each foot once a beat), landing
    // where the body will be half way through its stance; the swing takes `run.share` of the half beat.
    const now = ends(p), mid = { x: (now[0].x + now[1].x) / 2, z: (now[0].z + now[1].z) / 2 }, was = { x: (prev[0].x + prev[1].x) / 2, z: (prev[0].z + prev[1].z) / 2 };
    const speed = Math.hypot(mid.x - was.x, mid.z - was.z) * 100, slower = Math.min(...now.map((c, k) => Math.hypot(c.x - prev[k].x, c.z - prev[k].z))) * 100; prev = now;
    if (speed > STEP.run.speed && slower > STEP.run.carrier) {
      if (!onHalf || t < free - .02) continue;
      const half = .5 / Math.max(beats, 1e-3), finish = Math.min(end, t + STEP.run.share * half), feet = [group, group + 2];
      for (const i of feet) if (t >= busy[i]) {
        // shortcut: running feet keep no leg room (land(…, 0)): sideways at the techno's 4-5 m/s the trailing foot can't
        // close up behind the leading one on half-beat steps (splits) without crossing; it needs a chassé (Marc's choice)
        const to = land(i, Math.min(end, finish + STEP.run.lead * half), 0);
        events[i].push({ start: t, end: finish, from: { ...planted[i] }, to, run: true });
        Object.assign(planted[i], to); busy[i] = finish;
      }
      free = finish; group = 1 - group;
      continue;
    }
    if (t < free) continue;
    const worst = Math.max(...[0, 1, 2, 3].map(i => gap(i, p))), feet = [group, group + 2];
    const lifted = feet.some(i => t < busy[i] || out(i, t) !== 0 || t < busy[i ^ 1] || out(i ^ 1, t) !== 0);
    if (worst <= (onBeat ? STEP.due : onHalf ? STEP.half : STEP.late) || (lifted && worst < 4.5)) continue;
    const finish = Math.min(end, t + Math.max(STEP.min, Math.min(STEP.max, STEP.share * .5 / Math.max(beats, 1e-3))));
    for (const i of feet) {
      // A step out of a stretched leg starts where that leg is, and its gesture rests until the next cycle.
      const from = { ...planted[i] }, a = t < busy[i] ? 0 : out(i, t);
      if (a !== 0) Object.assign(from, stretch(from, i, a));
      const to = land(i, Math.min(end, finish + (finish - t) * STEP.lead));   // a little ahead: the feet keep under a turning body till the next step
      events[i].push({ start: t, end: finish, from, to });
      Object.assign(planted[i], to); busy[i] = finish; rest(i, t, zeroAfter(i, finish));
    }
    free = finish + .01; group = 1 - group;
  }
  return (t, index, res = {}) => {
    const list = events[index]; let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start <= t) lo = mid + 1; else hi = mid; }
    const e = list[lo - 1], p = e?.to ?? initial[index];
    res.tilt = 0; res.y = 0; res.swing = false;
    if (!e || t >= e.end) {
      Object.assign(res, p); res.y = 0; res.contact = true;
      const a = rests[index].some(([a, b]) => a <= t && t < b) ? 0 : gesture(t, index);
      if (a !== 0) Object.assign(res, stretch(p, index, a), { contact: false });
      return res;
    }
    if (e.gesture) {
      // The leg folds back in to its new place: the stretch's own fall, the foot sliding to the landing.
      const s = ease((t - e.start) / (e.end - e.start)), base = { x: e.from.x + (e.to.x - e.from.x) * s,
        z: e.from.z + (e.to.z - e.from.z) * s, yaw: e.from.yaw + (e.to.yaw - e.from.yaw) * s };
      Object.assign(res, base, stretch(base, index, gesture(t, index)), { contact: false });
      // Moving to a new place is a real step: the foot lifts over the floor (and the other shoe) on the way.
      const u = (t - e.start) / (e.end - e.start), moved = clamp(Math.hypot(e.to.x - e.from.x, e.to.z - e.from.z) / .1);
      res.y = Math.max(res.y, .09 * moved * ease(Math.min(u / .15, (1 - u) / .15)));
      return res;
    }
    // the foot travels through most of the swing: no dart in its middle (a running stride: all of it, a gentler peak)
    const u = (t - e.start) / (e.end - e.start), s = e.run ? u * u * (3 - 2 * u) : ease((u - .1) / .8), lift = 1 - ease(u);
    res.x = e.from.x + (e.to.x - e.from.x) * s; res.z = e.from.z + (e.to.z - e.from.z) * s;
    res.yaw = e.from.yaw + (e.to.yaw - e.from.yaw) * s; res.contact = false; res.swing = true;
    res.y = Math.max(STEP.lift * ease(Math.min(u / .1, (1 - u) / .1)), (e.from.y ?? 0) * lift);   // up over the other shoe before it travels res.tilt = (e.from.tilt ?? 0) * lift;
    return res;
  };
}
// Foot pose with the leg stretched by a (0-1): forward and a little out along the carrier's heading, toe up; a < 0
// (-1-0): stretched back instead, on its toes (heel up).
function stretch(p, index, a) {
  const side = index % 2 ? 1 : -1, s = Math.sin(p.yaw), c = Math.cos(p.yaw), m = Math.abs(a), r = a > 0 ? GESTURE.reach * a : GESTURE.back * a;
  return { x: p.x + r * s + m * side * GESTURE.out * c, z: p.z + r * c - m * side * GESTURE.out * s,
    yaw: p.yaw, y: (a > 0 ? GESTURE.heel : GESTURE.tiptoe) * m, tilt: -GESTURE.toe * a };
}
// Live steps (free play, scene/bou-stage.js): the planned dance's layout, trigger (a step unit off) and lift, stepped as
// the body is driven. Each carrier's pair of feet steps diagonally with the other's (0+2, then 1+3) and lands where the
// body will be when it lands (its velocity), so a gallop stays under the shell. reach(i): 0-1, a held leg stretch.
export function liveBouFeet() {
  const planted = [], moves = [null, null, null, null], ahead = { x: 0, z: 0, yaw: 0 };
  let group = 0;
  const turn = a => Math.atan2(Math.sin(a), Math.cos(a)); // a driven heading may wrap: never step the long way round
  const gap = (i, p) => { const n = nominal(p, i), f = planted[i]; return Math.max(Math.hypot(n.x - f.x, n.z - f.z) / .11, Math.abs(turn(n.yaw - f.yaw)) / .2); };
  return (t, p, vx, vz, reach, out) => {
    if (!planted.length) for (let i = 0; i < 4; i++) planted.push(nominal(p, i));
    for (let i = 0; i < 4; i++) if (moves[i] && t >= moves[i].end) { Object.assign(planted[i], moves[i].to); moves[i] = null; }
    if (moves.every(m => !m) && Math.max(...[0, 1, 2, 3].map(i => gap(i, p))) > 1) {
      const speed = Math.hypot(vx, vz), dur = Math.max(.12, Math.min(.22, .3 / (1 + speed)));
      Object.assign(ahead, { x: p.x + vx * dur, z: p.z + vz * dur, yaw: p.yaw });
      for (const i of [group, group + 2]) {
        const to = nominal(ahead, i); to.yaw = planted[i].yaw + turn(to.yaw - planted[i].yaw);
        moves[i] = { start: t, end: t + dur, from: { ...planted[i] }, to };
      }
      group = 1 - group;
    }
    for (let i = 0; i < 4; i++) {
      const m = moves[i], res = out[i];
      res.tilt = 0; res.y = 0;
      if (!m) { Object.assign(res, planted[i]); const a = reach(i); if (a > 0) Object.assign(res, stretch(planted[i], i, a)); continue; }
      const u = clamp((t - m.start) / (m.end - m.start)), e = ease((u - .2) / .6);
      res.x = m.from.x + (m.to.x - m.from.x) * e; res.z = m.from.z + (m.to.z - m.from.z) * e;
      res.yaw = m.from.yaw + (m.to.yaw - m.from.yaw) * e; res.y = .09 * ease(Math.min(u / .2, (1 - u) / .2));
    }
    return out;
  };
}
