// The Àliga de Valls' dance (Anton Gurí's 1991 figure) as a pure function of song time: aligaPose(t, song, timeline, out)
// fills a reused pose for the eagle and her three aligons. No three.js, no randomness, no frame counters: a seek, a
// pause or a restart shows the right pose directly. `song` is src/game/aliga-song.json, `timeline` src/game/aliga-dance.json
// (two tracks keyed by bar: the eagle's moves and the aligons' formation/state; every entry tagged observat / inferit /
// adaptat with its video source). The timeline is compiled once into eased key channels (memoised, so still pure).
//
// OBSERVED (WYMdvjRUn9I = l85rZ9lxCzM, one 2023 performance seen from both sides of the plaça): a rigid figure (wings and
// tail never move on their own) alternating upright with a strong forward tilt plus a half or whole turn, mostly to her
// left (counter-clockwise from above); a ~10 s sustained tilt as the climax; a still stop with the aligons curled up.
// ADAPTATION: the bars each move lands on, amplitudes, the aligons' formations and orbits, the step heights.
//
// The pose is the one schema src/scene/models/aliga.js applies (applyAligaPose), in metres and radians, in the rig's frame:
// x = right as seen from the public, z = towards the public, plaça centre at 0. aliga.x/z = between the carrier's hips;
// yaw 0 = facing the public, + = turning to her left (counter-clockwise from above, three.js rotation.y); pitch + = forward,
// roll + = top to her right, both about the carrier's hips PIVOT_H up (the model's body pivot), Euler 'YXZ'. lift (<= 0) =
// the hips' drop: his knees giving in a tilt, and as far as a planted foot needs to stay in reach. feet[0] left, [1] right:
// { x, z, yaw, h } = the point under the ankle, the shoe's heading and its lift, in the same frame as the root, planted
// while h = 0. Aligons: x, z, yaw (tangent to their positive orbit), crouch 0 standing -> 1 a ball on the ground, arms 0 down -> 1 up,
// lift and feet as hers.

const PI = Math.PI, TAU = 2 * PI, DEG = PI / 180;
export const PIVOT_H = 0.92; // m, the carrier's hips: the shell bows, sways and dips about them, so his feet stay planted
// Legs (m): hip height and half spacing, thigh and shin (knee to ankle), ankle above the sole, the shoe's sole (width, toe and
// heel from under the ankle). The model builds and bends its legs from these; the dance keeps every foot within REACH.
export const LEGS = {
  carrier: { hip: PIVOT_H, hipX: 0.12, stanceX: 0.18, thigh: 0.45, shin: 0.4, ankle: 0.08, sole: [0.13, 0.17, 0.11] },
  aligo: { hip: 0.45, kneel: 0.135, curlZ: -0.18, hipX: 0.07, stanceX: 0.1, thigh: 0.22, shin: 0.175, ankle: 0.06, sole: [0.1, 0.105, 0.065] },
};
const REACH = 0.98; // leave knee flexion in reserve so near-straight legs do not amplify foot acceleration
export const LIMITS = { pitch: 75 * DEG, radius: 7, near: 1.6, apart: 0.9 }; // what tests/aliga-dance.mjs holds it to
const DROP = 0.22; // m the pivot sinks at a 70 deg tilt (WYMdvjRUn9I 291-302: "el bloc baixa ~20 cm")
const BANK = 0.05, BANK_MAX = 18 * DEG; // s, rad: she leans into a turn, a little more the faster it is
const STAGGER = 0.12; // s between the three aligons, so they never move as one
// Alternating feet use the pulse grid independently of torso travel. FAST selects
// the carrier's eighth-note steps; aligons use eighths, with at most one extra
// subdivision when reach demands it. Their short running flight has duty > 1.
const FAST = { yaw: 60 * DEG, travel: 0.3 };
const CLEAR = 0.1; // a swing lifts the shoe at least this fraction of its farthest sole corner's travel (no skating)
// Per move: bars to go down / come back up (clipped to half the segment) and the default step height (m).
const MOVES = {
  upright: { in: 1, out: 1, step: 0.04 },
  sway: { in: 1, out: 1, step: 0.05 },
  tilt: { in: 0.75, out: 0.75, step: 0.09 },
  sustained: { in: 1, out: 1, step: 0.06 },
  stop: { in: 1, out: 1, step: 0 },
};
const RISE = 0.5; // bars for the aligons to curl up or stand up; they only move once standing

// Key channels: flat [q0, v0, q1, v1, ...], q = seconds or a step clock. Quintic ease between keys: zero velocity and
// acceleration at every key, so segments join smoothly whatever the values.
function add(k, q, v) {
  const n = k.length;
  if (n && q <= k[n - 2] + 1e-9) { k[n - 1] = v; return; } // same instant: the later entry wins
  k.push(q, v);
}
function key(k, q, rate, cruise = false) {
  const n = k.length >> 1;
  if (q <= k[0] || n === 1) return rate ? 0 : k[1];
  if (q >= k[2 * n - 2]) return rate ? 0 : k[2 * n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (k[2 * m] <= q) lo = m; else hi = m; }
  const q0 = k[2 * lo], d = k[2 * hi] - q0, dv = k[2 * hi + 1] - k[2 * lo + 1], u = (q - q0) / d;
  if (cruise) {
    // Smooth acceleration into a sustained walking speed, then decelerate to rest.
    // A quintic position curve peaks at 1.875 times average and bunches the steps.
    const ramp = 0.2, v = Math.min(u, 1 - u) / ramp;
    const integral = v < 1 ? ramp * (v ** 3 - 0.5 * v ** 4) : Math.min(u, 1 - u) - ramp / 2;
    const e = u < 0.5 ? integral / (1 - ramp) : 1 - integral / (1 - ramp);
    const velocity = (v < 1 ? v * v * (3 - 2 * v) : 1) / (1 - ramp);
    return rate ? dv * velocity / d : k[2 * lo + 1] + dv * e;
  }
  return rate ? dv * 30 * u * u * (1 - u) * (1 - u) / d : k[2 * lo + 1] + dv * u * u * u * (u * (u * 6 - 15) + 10);
}

// Steps: `times` are when each step starts. phase() = index + fraction of the current one (-1 before the first), timeAt()
// its inverse. Root channels advance continuously; contact belongs to the feet.
function phase(times, t) {
  const n = times.length;
  if (t < times[0]) return -1;
  if (t >= times[n - 1]) { const d = times[n - 1] - times[n - 2]; return n - 1 + (t - times[n - 1]) / d; }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
  return lo + (t - times[lo]) / (times[hi] - times[lo]);
}
function timeAt(times, p) {
  const n = times.length, i = Math.min(Math.max(Math.floor(p), 0), n - 2);
  return times[i] + (p - i) * (times[i + 1] - times[i]);
}

function barTime(song, bar) {
  const T = song.barTimes, n = T.length;
  const b = Math.min(Math.max(bar, 0), n), i = Math.min(Math.floor(b), n - 1);
  const t0 = T[i], t1 = i + 1 < n ? T[i + 1] : song.end;
  return t0 + (b - i) * (t1 - t0);
}
function barAt(song, t) { return phase(song.barTimes, t); }

function compile(tl, song) {
  const end = song.end, endBar = song.barTimes.length, T = b => barTime(song, b);
  const sub = Float64Array.from(song.subBeatTimes, s => s.t);
  const fail = (what, e) => { throw new Error(`aliga-dance: ${what} at bar ${e.bar}`); };
  const check = (track) => track.forEach((e, i) => {
    if (!(e.bar >= 0 && e.bar < endBar) || (i && e.bar <= track[i - 1].bar)) fail('bar out of order or outside the song', e);
    if (!['observat', 'inferit', 'adaptat'].includes(e.tag) || !e.src) fail('entry without tag/source', e);
  });
  check(tl.aliga); check(tl.aligons);
  if (tl.aliga[0].bar !== 0 || tl.aligons[0].bar !== 0) throw new Error('aliga-dance: both tracks start at bar 0');

  // The carrier's steps: every beat (a sub-beat on a whole beat + the pickup's half), every eighth through a FAST move.
  const fast = [];
  let at = tl.aliga[0].to || [0, 0];
  tl.aliga.forEach((e, i) => {
    const L = (i + 1 < tl.aliga.length ? tl.aliga[i + 1].bar : endBar) - e.bar, turn = Math.abs(e.turn ?? 0) * TAU;
    const to = e.to || at, travel = Math.hypot(to[0] - at[0], to[1] - at[1]);
    const din = Math.min(e.in ?? MOVES[e.move]?.in ?? 1, L / 2), yaw = e.move === 'sustained' ? turn / 2 / din : turn / L; // per bar
    if (1.875 * Math.max(yaw / 2 / FAST.yaw, travel / L / 2 / FAST.travel) > 1) fast.push([T(e.bar), T(e.bar + L)]); // quintic peak = 1.875 x mean
    at = to;
  });
  const steps = Float64Array.from(song.subBeatTimes.filter(s => (s.beat - song.pickupBeats) % 1 === 0
    || fast.some(([a, b]) => s.t >= a && s.t < b)), s => s.t);
  const P = t => Math.max(0, phase(steps, t));

  // The eagle: angular channels in seconds, position in continuous musical phase.
  const c = { steps, sub, end, stop: T(tl.aliga.find(e => e.move === 'stop')?.bar ?? endBar), yaw: [], pitch: [], sway: [], step: [], x: [], z: [] };
  let yaw = 0, pos = tl.aliga[0].to || [0, 0];
  add(c.x, 0, pos[0]); add(c.z, 0, pos[1]);
  tl.aliga.forEach((e, i) => {
    const m = MOVES[e.move];
    if (!m) fail(`unknown move "${e.move}"`, e);
    const b0 = e.bar, b1 = i + 1 < tl.aliga.length ? tl.aliga[i + 1].bar : endBar, L = b1 - b0;
    const din = Math.min(e.in ?? m.in, L / 2), dout = Math.min(e.out ?? m.out, L / 2);
    const amp = (e.pitch ?? 0) * DEG, turn = (e.turn ?? 0) * TAU, h = e.step ?? m.step;
    if (amp > LIMITS.pitch || amp < 0) fail('pitch outside 0-75 deg', e);
    if (e.move === 'stop' && (amp || turn || e.to)) fail('the stop holds still', e);
    const t0 = T(b0), ti = T(b0 + din), to = T(b1 - dout), t1 = T(b1);
    add(c.pitch, t0, 0); add(c.pitch, ti, amp); add(c.pitch, to, amp); add(c.pitch, t1, 0);
    add(c.yaw, t0, yaw);
    if (e.move === 'sustained') { add(c.yaw, ti, yaw + turn / 2); add(c.yaw, to, yaw + turn / 2); }
    add(c.yaw, t1, yaw += turn);
    const sw = e.move === 'sway' ? (e.roll ?? 6) * DEG : 0;
    add(c.sway, t0, 0); add(c.sway, ti, sw); add(c.sway, to, sw); add(c.sway, t1, 0);
    const s = Math.min(0.5, L / 4);
    add(c.step, T(e.move === 'stop' ? b0 : b0 + s), h); add(c.step, T(b1 - s), h);
    if (e.to && (e.to[0] !== pos[0] || e.to[1] !== pos[1])) {
      if (!h) fail('travel needs steps', e);
      pos = e.to;
    }
    add(c.x, P(t1), pos[0]); add(c.z, P(t1), pos[1]);
  });

  // The aligons: polar slots round the fixed plaza centre, on a continuous musical clock.
  // Curled up, nobody moves and the anchor holds; standing up, they only set off once up.
  const Q = t => Math.max(0, phase(sub, t)), states = tl.aligonStates, forms = tl.formations;
  c.crouch = []; c.arms = []; c.astep = []; c.aduty = []; c.ax = []; c.az = []; c.th = [[], [], []]; c.r = [[], [], []];
  let base = 0, form = forms[tl.aligons[0].formation], anchor = [0, 0], prev = null;
  const slots = (q) => {
    add(c.ax, q, anchor[0]); add(c.az, q, anchor[1]);
    for (let i = 0; i < 3; i++) { add(c.th[i], q, (base + form.angles[i]) * DEG); add(c.r[i], q, form.r[i]); }
  };
  if (!form) fail('unknown formation', tl.aligons[0]);
  slots(0);
  tl.aligons.forEach((e, j) => {
    const st = states[e.state];
    if (!st) fail(`unknown state "${e.state}"`, e);
    if (e.formation && !forms[e.formation]) fail(`unknown formation "${e.formation}"`, e);
    const b0 = e.bar, b1 = j + 1 < tl.aligons.length ? tl.aligons[j + 1].bar : endBar;
    const t0 = T(b0), tr = Math.min(T(b1), Math.max(T(Math.min(b0 + RISE, b1)), t0 + 0.55)), t1 = T(b1), ground = e.state === 'ground';
    for (const f of ['crouch', 'arms', 'step', 'duty']) {
      const k = c[f === 'step' ? 'astep' : f === 'duty' ? 'aduty' : f];
      // A small running flight: each foot swings for 57.5% of its cycle, with sustained alternating support.
      if (prev) add(k, t0, states[prev][f] ?? (f === 'duty' ? 1.15 : 0));
      add(k, tr, st[f] ?? (f === 'duty' ? 1.15 : 0));
    }
    if (ground && (e.orbit || e.formation)) fail('curled-up aligons stay where they are', e);
    if (!ground) {
      slots(Q(prev === 'ground' ? tr : t0)); // hold until they are up
      base += e.orbit ?? 0; form = forms[e.formation] || form; anchor = [0, 0];
    }
    slots(Q(t1));
    prev = e.state;
  });
  for (const k of ['yaw', 'pitch', 'sway', 'step', 'x', 'z', 'crouch', 'arms', 'astep', 'aduty', 'ax', 'az']) c[k] = Float64Array.from(c[k]);
  c.th = c.th.map(k => Float64Array.from(k)); c.r = c.r.map(k => Float64Array.from(k));
  // Cubic B-spline controls sampled from the carrier's authored channels. The
  // centred kernel carries angular velocity through neighbouring keys instead
  // of demanding a stop and restart in a shortened musical interval.
  c.yawSmooth = smoothChannel(c.yaw, end, 0.75, c.stop);
  limitChannel(c.yawSmooth, 2.5);
  c.pitchSmooth = smoothChannel(c.pitch, end, 0.18, c.stop);
  limitChannel(c.pitchSmooth, 2.8);
  c.heading = [0, 1, 2].map(who => {
    const dt = 0.65, n = Math.ceil(end / dt), r = {};
    let previous;
    // Before setting off, face the first travelling direction already. Choosing
    // an arbitrary orbit tangent at zero speed creates an unnecessary half turn.
    for (let t = 0; t < end; t += 0.05) {
      rootAt(c, who, t, r);
      if (r.pathSpeed > 1e-6) { previous = r.yaw; break; }
    }
    const y = Float64Array.from({ length: n + 4 }, (_, i) => {
      rootAt(c, who, Math.max(0, (i - 1) * dt), r);
      const desired = r.pathSpeed > 1e-6 || previous === undefined ? r.yaw : previous;
      previous = previous === undefined ? desired : previous + Math.atan2(Math.sin(desired - previous), Math.cos(desired - previous));
      return previous;
    });
    // A sole may turn only in its swing. Bound the heading controls before
    // interpolation, allowing the torso to anticipate a turn while still.
    // Both envelopes are 0.9 rad/s Lipschitz; their average retains that bound.
    const lower = y.slice(), upper = y.slice(), limit = 0.9 * dt;
    for (let j = 1; j < y.length; j++) {
      lower[j] = Math.max(lower[j], lower[j - 1] - limit);
      upper[j] = Math.min(upper[j], upper[j - 1] + limit);
    }
    for (let j = y.length - 2; j >= 0; j--) {
      lower[j] = Math.max(lower[j], lower[j + 1] - limit);
      upper[j] = Math.min(upper[j], upper[j + 1] + limit);
    }
    for (let j = 0; j < y.length; j++) y[j] = (lower[j] + upper[j]) / 2;
    return { dt, y };
  });
  c.csteps = footSteps(c, -1);
  c.asteps = [0, 1, 2].map(who => footSteps(c, who));
  c.support = [-1, 0, 1, 2].map(who => support(c, who));
  return c;
}

let memo = null; // the compiled timeline for the last (timeline, song) pair: a cache, not state the pose depends on
function compiled(tl, song) {
  if (!memo || memo.tl !== tl || memo.song !== song) memo = { tl, song, c: compile(tl, song) };
  return memo.c;
}

const feet = () => [0, 1].map(() => ({ x: 0, z: 0, yaw: 0, h: 0 }));
export const newAligaPose = () => ({
  aliga: { x: 0, z: 0, yaw: 0, pitch: 0, roll: 0, lift: 0, feet: feet() },
  aligons: [0, 1, 2].map(() => ({ x: 0, z: 0, yaw: 0, crouch: 0, arms: 0, armSwing: [0, 0], lift: 0, feet: feet() })),
});

// Where a walker stands at time t (who = -1 the eagle, else an aligó on its own staggered time), into r.x/z/yaw.
function rootAt(c, who, t, r) {
  const q = Math.min(Math.max(t, 0), c.end);
  if (who < 0) {
    const p = Math.max(0, phase(c.steps, q));
    r.x = key(c.x, p); r.z = key(c.z, p); r.yaw = carrierChannel(c, 'yaw', q);
    return;
  }
  const s = Math.max(0, phase(c.sub, q)), th = key(c.th[who], s, false, true), rad = key(c.r[who], s, false, true);
  r.x = key(c.ax, s, false, true) + rad * Math.sin(th); r.z = key(c.az, s, false, true) + rad * Math.cos(th);
  const dx = key(c.ax, s, true, true) + key(c.r[who], s, true, true) * Math.sin(th) + rad * Math.cos(th) * key(c.th[who], s, true, true);
  const dz = key(c.az, s, true, true) + key(c.r[who], s, true, true) * Math.cos(th) - rad * Math.sin(th) * key(c.th[who], s, true, true);
  const nominal = th + PI / 2, speed = Math.hypot(dx, dz);
  // Follow the actual curve, including changing radius/anchor. Fade the correction
  // at rest so a zero derivative never selects an arbitrary atan2 heading.
  const turn = Math.atan2(Math.sin(Math.atan2(dx, dz) - nominal), Math.cos(Math.atan2(dx, dz) - nominal));
  r.yaw = c.heading?.[who] ? smoothAt(c.heading[who], q) : nominal + turn;
  r.pathSpeed = speed;
}
function underHip(c, who, t, side, o) { // foot-home (side 1 = her left, +x locally), wider than the anatomical hips
  rootAt(c, who, t, o);
  const hx = side * (who < 0 ? LEGS.carrier : LEGS.aligo).stanceX;
  o.x += hx * Math.cos(o.yaw); o.z -= hx * Math.sin(o.yaw);
}
// Measure curved root travel, not just the endpoints, to select a reachable step.
// Keep a finer pulse through adjacent intervals so a long stance cannot reach into
// a fast passage. This never gates or changes the torso trajectory.
function footSteps(c, who) {
  const S = who < 0 ? c.steps : c.sub;
  const times = [], a = {}, b = {}, split = [];
  for (let i = 0; i < S.length - 1; i++) {
    const t = S[i], d = S[i + 1] - t;
    rootAt(c, who, t, a);
    let travel = 0, turn = 0;
    for (let j = 1; j <= 4; j++) {
      rootAt(c, who, t + d * j / 4, b);
      travel += Math.hypot(b.x - a.x, b.z - a.z); turn += Math.abs(b.yaw - a.yaw);
      a.x = b.x; a.z = b.z; a.yaw = b.yaw;
    }
    split.push(who < 0 ? (travel > 0.1 || turn > 0.45 ? 2 : 1)
      : travel > 0.3 || turn > 0.4 ? 2 : 1);
  }
  for (let i = 0; i < split.length; i++) {
    let n = split[i];
    for (let j = Math.max(0, i - 2); j <= Math.min(split.length - 1, i + 2); j++) n = Math.max(n, split[j]);
    for (let j = 0; j < n; j++) times.push(S[i] + (S[i + 1] - S[i]) * j / n);
  }
  times.push(S[S.length - 1]);
  return Float64Array.from(times);
}
function corners(a, b, sole) { // the farthest any sole corner travels from a to b
  let m = 0;
  const ca = Math.cos(a.yaw), sa = Math.sin(a.yaw), cb = Math.cos(b.yaw), sb = Math.sin(b.yaw);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const cx = (i ? 1 : -1) * sole[0] / 2, cz = j ? -sole[2] : sole[1];
    m = Math.max(m, Math.hypot(b.x - a.x + cx * (cb - ca) + cz * (sb - sa), b.z - a.z - cx * (sb - sa) + cz * (cb - ca)));
  }
  return m;
}
// A foot (f 0 left, 1 right): planted where its hip will be halfway through its stance (the dance is a pure function of
// time, so that moment can be read ahead), held there, heading included, while down, carried to the next spot only while
// lifted. The lift is the step height, raised to CLEAR of the sole's travel.
const FA = { x: 0, z: 0, yaw: 0 }, FB = { x: 0, z: 0, yaw: 0 };
// The carrier hands support directly from one foot to the other; the children
// may have a short flight between alternating contacts.
function stepDuty(c, who, S, k) { return who < 0 ? 1 : key(c.aduty, timeAt(S, k)); }
function stepFoot(c, who, t, f, out) {
  const S = who < 0 ? c.csteps : c.asteps[who], side = f ? -1 : 1;
  const b = phase(S, t);
  if (b < 0) { underHip(c, who, 0, side, out); out.h = 0; return out; }
  let k = Math.floor(b);
  if ((k - f) & 1) k--; // this foot's last lift
  const dk = stepDuty(c, who, S, k), t0 = timeAt(S, k), duration = timeAt(S, k + dk) - t0, u = (t - t0) / duration;
  underHip(c, who, (timeAt(S, k + dk) + timeAt(S, k + 2)) / 2, side, out);
  if (u >= 1) { out.h = 0; return out; }
  underHip(c, who, (timeAt(S, k - 2 + stepDuty(c, who, S, k - 2)) + t0) / 2, side, FA);
  FB.x = out.x; FB.z = out.z; FB.yaw = out.yaw;
  const e = u * u * u * (u * (u * 6 - 15) + 10), s = Math.sin(PI * u);
  out.x = FA.x + (FB.x - FA.x) * e; out.z = FA.z + (FB.z - FA.z) * e; out.yaw = FA.yaw + (FB.yaw - FA.yaw) * (who < 0 ? e : u * u * (3 - 2 * u));
  const leg = who < 0 ? LEGS.carrier : LEGS.aligo;
  // A faster coda shortens the swing; bound its height by the same velocity/acceleration limits as a slow step.
  const height = Math.min(0.15, 1.15 * duration / PI, 29 * duration * duration / (2 * PI * PI));
  const travel = corners(FA, FB, leg.sole);
  const lift = who < 0 ? key(c.step, timeAt(S, k)) : Math.min(0.045, travel * 0.18);
  out.h = Math.min(height, Math.max(lift, CLEAR * travel)) * s * s;
  return out;
}
// The lift that keeps a planted (or swinging) foot within REACH of its hip: > 0 when it does not bind.
function reach(leg, r, foot, side) {
  const z = (leg.curlZ ?? 0) * (r.crouch ?? 0);
  const hx = r.x + side * leg.hipX * Math.cos(r.yaw) + z * Math.sin(r.yaw);
  const hz = r.z - side * leg.hipX * Math.sin(r.yaw) + z * Math.cos(r.yaw);
  const L = REACH * (leg.thigh + leg.shin), d = Math.hypot(foot.x - hx, foot.z - hz);
  if (d >= L) throw new Error('aliga-dance: step exceeds horizontal leg reach');
  return foot.h + leg.ankle + Math.sqrt(L * L - d * d) - leg.hip;
}
function smin(a, b, k = 0.06) { // a smooth min (C2), never above either
  const h = Math.max(0, 1 - Math.abs(a - b) / k);
  return Math.min(a, b) - k * h * h * h / 6;
}
// Anticipate a short leg's reach instead of dipping the hips abruptly when the limiting foot changes. Each cubic B-spline
// control lies below the ceilings of ALL intervals it influences; their positive weighted sum stays below the envelope.
// Limit adjacent controls to 0.1 m per quarter second (<= 0.4 m/s, 3.2 m/s²). Lower neighbouring controls ahead of a deep
// step, never raise a ceiling to smooth it. The 240 Hz reach scan includes 3 mm reserve; tests recheck at 1 kHz/off-grid.
function support(c, who) {
  const dt = 0.25, n = Math.ceil(c.end / dt), ceiling = new Float64Array(n).fill(0);
  const r = { x: 0, z: 0, yaw: 0 }, f = [{}, {}], leg = who < 0 ? LEGS.carrier : LEGS.aligo;
  for (let i = 0; i < n; i++) {
    const a = i * dt, b = Math.min(c.end, (i + 1) * dt), samples = Math.ceil((b - a) * 240);
    for (let j = 0; j <= samples; j++) {
      const t = a + (b - a) * j / samples;
      rootAt(c, who, t, r);
      r.crouch = who < 0 ? 0 : key(c.crouch, t);
      const crouch = who < 0 ? 0 : r.crouch * (leg.hip - leg.kneel);
      for (let k = 0; k < 2; k++) {
        stepFoot(c, who, t, k, f[k]);
        ceiling[i] = Math.min(ceiling[i], reach(leg, r, f[k], k ? -1 : 1) + crouch - 0.003);
      }
    }
  }
  const y = Float64Array.from({ length: n + 3 }, (_, i) => {
    let h = 0;
    for (let j = i - 3; j <= i; j++) h = Math.min(h, ceiling[Math.min(n - 1, Math.max(0, j))]);
    return h;
  });
  for (let i = 1; i < y.length; i++) y[i] = Math.min(y[i], y[i - 1] + 0.1);
  for (let i = y.length - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] + 0.1);
  return y;
}
function carrierChannel(c, name, t) { return smoothAt(c[name + 'Smooth'], t); }
function smoothChannel(k, end, dt, stop) {
  const n = Math.ceil(end / dt), final = key(k, end);
  // Clamp all controls influencing the authored stop to its exact rest value.
  // Rate constraints propagate the needed anticipation backwards, never delaying
  // that stop. The B-spline remains C2 and its derivative is a convex sum of slopes.
  return { dt, y: Float64Array.from({ length: n + 4 }, (_, i) =>
    (i - 1) * dt >= stop - 2 * dt ? final : key(k, Math.max(0, (i - 1) * dt))) };
}
function limitChannel(channel, rate) {
  const { y, dt } = channel, limit = rate * dt;
  for (let i = y.length - 2; i >= 0; i--) y[i] = Math.max(y[i + 1] - limit, Math.min(y[i + 1] + limit, y[i]));
}
function smoothAt(channel, t) { return splineAt(channel.y, t, channel.dt); }
function supportAt(y, t) { return splineAt(y, t, 0.25); }
function splineAt(y, t, dt) {
  const q = t / dt, i = Math.floor(q), u = q - i, v = 1 - u;
  // Preserve an exactly constant rest, including sole headings, without roundoff
  // from summing identical controls at different fractional times.
  if (y[i] === y[i + 1] && y[i] === y[i + 2] && y[i] === y[i + 3]) return y[i];
  return (v * v * v * y[i] + (3 * u * u * u - 6 * u * u + 4) * y[i + 1]
    + (-3 * u * u * u + 3 * u * u + 3 * u + 1) * y[i + 2] + u * u * u * y[i + 3]) / 6;
}
// A still pose (the preview's static modes): every foot down under its hip.
export function standFeet(pose) {
  const put = (r, leg) => r.feet.forEach((f, i) => {
    const hx = (i ? -1 : 1) * leg.hipX;
    f.x = r.x + hx * Math.cos(r.yaw); f.z = r.z - hx * Math.sin(r.yaw); f.yaw = r.yaw; f.h = 0;
  });
  put(pose.aliga, LEGS.carrier);
  for (const g of pose.aligons) put(g, LEGS.aligo);
  return pose;
}

const SIN70 = Math.sin(70 * DEG);
export function aligaPose(t, song, timeline, out = newAligaPose()) {
  const c = compiled(timeline, song), tc = Math.min(Math.max(t, 0), c.end); // before / after the song: held
  const a = out.aliga;
  rootAt(c, -1, tc, a);
  a.pitch = carrierChannel(c, 'pitch', tc);
  const s = Math.sin(a.pitch) / SIN70;
  a.roll = key(c.sway, tc) * Math.cos(PI * barAt(song, tc)) // one side per bar, the extremes on the downbeats
    - BANK_MAX * Math.tanh(BANK * (carrierChannel(c, 'yaw', Math.min(c.end, tc + 0.001)) - carrierChannel(c, 'yaw', Math.max(0, tc - 0.001))) / 0.002 / BANK_MAX); // turning to her left leans her left (roll -)
  stepFoot(c, -1, tc, 0, a.feet[0]); stepFoot(c, -1, tc, 1, a.feet[1]);
  a.lift = smin(-DROP * s * s, supportAt(c.support[0], tc));
  for (let i = 0; i < 3; i++) {
    const g = out.aligons[i], ti = Math.min(Math.max(tc - i * STAGGER, 0), c.end);
    rootAt(c, i, ti, g);
    g.crouch = key(c.crouch, ti); g.arms = 0.1 * key(c.arms, ti);
    // Relaxed arms counter the legs: arm 0 goes back as foot 0 travels forward.
    // Grounding and a stationary formation fade the swing instead of posing a frozen raised arm.
    rootAt(c, i, Math.max(0, ti - 0.02), FA); rootAt(c, i, Math.min(c.end, ti + 0.02), FB);
    const speed = Math.hypot(FB.x - FA.x, FB.z - FA.z) / 0.04;
    stepFoot(c, i, ti, 0, g.feet[0]); stepFoot(c, i, ti, 1, g.feet[1]);
    const forward = (g.feet[0].x - g.feet[1].x) * Math.sin(g.yaw) + (g.feet[0].z - g.feet[1].z) * Math.cos(g.yaw);
    const arm = 0.3 * Math.tanh(speed / 0.6) * (1 - g.crouch) * Math.tanh(forward / 0.16);
    g.armSwing[0] = arm; g.armSwing[1] = -arm;
    g.lift = supportAt(c.support[i + 1], ti);
  }
  return out;
}
