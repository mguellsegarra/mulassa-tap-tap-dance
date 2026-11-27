// The generic dance engine's universal moves (research/motor-ball/coreografia.md, «Universals»), figure-agnostic.
// A move is built once, when a dance is planned, as plain data; at play time choreoMoveAt() evaluates it in place,
// allocating nothing. Every move starts at home (the dance frame's centre) and ends there, so the pose at any beat is
// a pure function of that beat, seekable; only the heading may end turned, which the planner carries to the next move.
// Frame of a move: its start heading is +z (forward), x its side; metres, radians, beats. hop is 0-1 (the figure says
// how high), bow 0-1 (the figure says what bows), amp the figure's own sway, 1 = its usual.
import { TAU, smooth01 } from '../../core/math.js';

const CHOREO_HOP_LEN = 0.5; // beats: a hop's up and down, landing on its beat

// Keyed move: rows [beat, x, z, yaw, bow] on a design length D, eased (smoothstep) between rows, stretched to its length.
export const choreoKeyed = (id, D, keys, { hops = [], amp = 1 } = {}) => ({ id, kind: 'keys', D, keys, hops, amp });

// U1 Gronxa: on the spot, the figure's sway; a hop on each of `hops`
export const choreoSway = (amp = 1, hops = []) => choreoKeyed('sway', 8, [[0, 0, 0, 0, 0], [8, 0, 0, 0, 0]], { hops, amp });

// U2 / U3 Anar i tornar, a spoke of the clock: turn `face` (rad) to its bearing, walk `dist` out, nod (bow and a hop)
// at the far end, come back to the centre walking backwards (it never turns its back), and end turned `face + after`
// (the clock keeps the heading for the next spoke; the planner unturns a section's last move). 16 beats, or the short
// 8-beat one a whole clock squeezes into when a section has no room for the long one; both give the turn time (beats).
const CHOREO_SPOKE = {
  16: [0, 3, 7, 8, 9, 14, 16, 7.5],
  8: [0, 2.5, 4, 4.5, 5, 7.5, 8, 4.25],
};
export function choreoSpoke(dist, face = 0, after = -face, beats = 16) {
  const x = dist * Math.sin(face), z = dist * Math.cos(face), [b0, b1, b2, b3, b4, b5, b6, hop] = CHOREO_SPOKE[beats];
  return choreoKeyed(face ? 'spoke' : 'outBack', beats, [
    [b0, 0, 0, 0, 0], [b1, 0, 0, face, 0], [b2, x, z, face, 0.2], [b3, x, z, face, 0.8], [b4, x, z, face, 0.2], [b5, 0, 0, face, 0], [b6, 0, 0, face + after, 0],
  ], { hops: [hop] });
}

// U4 Volta: `turns` whole turns about the pivot (dir +1 / -1), smooth start and stop, a nod as it lands. 16 beats by design
// (the owner's «a turn in four bars»), stretched to its phrase.
export function choreoTurn(turns, dir) {
  const a = dir * turns * TAU;
  return choreoKeyed('turn', 16, [[0, 0, 0, 0, 0], [14, 0, 0, a, 0], [15, 0, 0, a, 0.6], [16, 0, 0, a, 0]], { hops: [14] });
}

// U6 Cercle: one circle of radius r through home, to its side `dir`, facing along it (the heading turns a whole turn).
export const choreoArc = (r, dir) => ({ id: 'arc', kind: 'arc', D: 16, r, dir, hops: [8], amp: 1.2 });

// U10 Voltes finals: `turns` turns on the spot that speed up, cruise and brake to face home on the last hit; a hop
// on every beat.
export const choreoSpin = (turns, dir) => ({ id: 'finale', kind: 'spin', D: 0, turns, dir, hops: null, amp: 1.2 });

// The slice of a trapezoid speed profile: up for a quarter, cruise, down for the last quarter (0..1 -> 0..1)
function choreoTrap(f) {
  const a = 0.25, v = 1 / (1 - a);
  return f <= 0 ? 0 : f >= 1 ? 1 : f < a ? 0.5 * v * f * f / a : f < 1 - a ? v * (f - a / 2) : 1 - 0.5 * v * (1 - f) * (1 - f) / a;
}
const choreoHop = (u, at) => { const k = (u - at + CHOREO_HOP_LEN) / CHOREO_HOP_LEN; return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };

// Fills o { x, z, yaw, bow, hop, amp } for move m, u beats into it, its length len beats (the move's own frame).
export function choreoMoveAt(m, u, len, o) {
  o.amp = m.amp; o.bow = 0; o.hop = 0;
  if (m.kind === 'keys') {
    const keys = m.keys, b = u * m.D / len;
    let i = 0; while (i < keys.length - 2 && b >= keys[i + 1][0]) i++;
    const a = keys[i], c = keys[i + 1], f = smooth01((b - a[0]) / (c[0] - a[0]));
    o.x = a[1] + (c[1] - a[1]) * f; o.z = a[2] + (c[2] - a[2]) * f; o.yaw = a[3] + (c[3] - a[3]) * f; o.bow = a[4] + (c[4] - a[4]) * f;
  } else if (m.kind === 'arc') {
    const th = TAU * smooth01(u / len);
    o.yaw = m.dir * th; o.x = m.dir * m.r * (1 - Math.cos(th)); o.z = m.r * Math.sin(th);
  } else { // spin
    o.x = o.z = 0; o.yaw = m.dir * m.turns * TAU * choreoTrap(u / len);
  }
  if (m.hops) for (let i = 0; i < m.hops.length; i++) o.hop = Math.max(o.hop, choreoHop(u, m.hops[i] * len / m.D));
  else if (u < len - 0.5) o.hop = choreoHop(u, Math.ceil(u)); // every beat
  return o;
}

// The same move to the other side (the mirror the grammar asks for when a section comes back)
export function choreoMirror(m) {
  if (m.kind === 'keys') return { ...m, keys: m.keys.map(([b, x, z, yaw, bow]) => [b, -x, z, -yaw, bow]) };
  return { ...m, dir: -m.dir };
}
// The same move a little smaller (to keep clear of the colla, or within the figure's speed); null when it cannot shrink.
export function choreoShrink(m, k) {
  if (m.kind === 'keys') return m.keys.some(r => r[1] || r[2]) ? { ...m, keys: m.keys.map(([b, x, z, yaw, bow]) => [b, x * k, z * k, yaw, bow]) } : null;
  if (m.kind === 'arc') return m.r * k > 0.3 ? { ...m, r: m.r * k } : null;
  return m.turns > 1 ? { ...m, turns: m.turns - 1 } : null;
}
// The heading a move ends turned by (rad)
export const choreoTurnOf = m => (m.kind === 'keys' ? m.keys.at(-1)[3] : m.kind === 'arc' ? m.dir * TAU : m.dir * m.turns * TAU);
