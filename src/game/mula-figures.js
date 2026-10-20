// The Mulassa's song dance as FIGURES on the music's phrases (Marc, 2026-10-19: traced from the 2017 video, the path read
// as erratic drift; the dance is a few clear figures, sober at first and more comic as the music livens): four runs out
// and back (W, E, N, S), the circle, the passada, eight culades, the charges, the turns on the spot. Authored in BEATS
// of the song's grid, so a faster phrase dances faster. The root path is sampled, eased across every join (no stop and
// start between figures) and read back as C1 curves; the accents (front up, rear kicks, hops, a head shake, a tremble)
// ride on top. Frame: game/mula-layout.js's (compass from W, + yaw W -> S -> E -> N), centred on MULA_CENTRE.
// Pure, no three.js; at(beat, out) and accent(beat, t, out) fill reused objects.
import { mulaTrack } from './mula-path.js';
import { MULA_W, MULA_CENTRE } from './mula-layout.js';

const FQ = Math.PI / 2;
// [first beat, beats, move, ...]: walk(m forward, < 0 backs off), charge(m: accelerates, then skids to a stop), turn(rad,
// pivot m ahead of her centre: 0.4 the 2017 half turns' rear sweep, 0.6 a culada on her head), arc(rad round a centre
// `radius` m on her +x side), spin(rad on the spot, faster and faster, braking at the end). Gaps hold her where she is.
export const MULA_FIGURES = [
  // A1: four runs out and back, one to each mark (W, E, N, S), a half turn at the far end, always the same way round
  [16, 5, 'walk', 1.5], [21, 5, 'turn', 2 * FQ, 0.4], [26, 5, 'walk', 2.3],
  [32, 5, 'walk', 1.5], [37, 5, 'turn', 2 * FQ, 0.4], [42, 5, 'walk', 2.3],
  [48, 2, 'turn', -FQ, 0], [50, 5, 'walk', 1.5], [55, 4, 'turn', 2 * FQ, 0.4], [59, 5, 'walk', 2.3],
  [64, 5, 'walk', 1.5], [69, 4, 'turn', 2 * FQ, 0.4], [73, 5, 'walk', 2.3], [78, 2, 'turn', FQ, 0],
  // A2: the circle round the middle; the passada right across, a half turn, home to face the lens for the drumroll
  [80, 6, 'walk', 1.5], [86, 4, 'turn', FQ, 0], [90, 20, 'arc', 4 * FQ, 1.5], [112, 4, 'turn', FQ, 0],
  [116, 10, 'walk', 3.0], [126, 4, 'turn', 2 * FQ, 0.4], [130, 6, 'walk', 2.3], [136, 2, 'turn', FQ / 2, 0],
  // B: eight culades on her head: four back and forth (her rear to the plaça and back), four the same way round
  ...[1, -1, 1, -1, 1, 1, 1, 1].map((s, i) => [144 + 4 * i, 4, 'turn', s * 2 * FQ, 0.6]),
  // C: a charge at S, a skid, she backs off; reverses; charges through the middle towards N; reverses back; home
  [176, 2, 'turn', FQ / 2, 0], [178, 4, 'charge', 2.0], [182, 2, 'walk', -0.5], [184, 4, 'turn', -2 * FQ, 0],
  [188, 6, 'charge', 3.2], [194, 2, 'walk', -0.5], [196, 4, 'turn', 2 * FQ, 0], [200, 4, 'walk', 1.2],
  // X into the roll: turns on the spot, faster and faster, braking onto W (her opening heading) at the final hit
  [204, 23, 'spin', 11 * FQ],
];
// The accents, all on the beat: [beat, half width (beats), kind, size]. pitch (rad, + = rear up), lift (m), nod (a
// head shake, rad), tremble (rad of roll at 9 Hz real time). Sober in A1, a little play in A2, comic from the drumroll.
const FIG_ACCENTS = [
  ...[21, 37, 55, 69].map(b => [b, 1.5, 'pitch', -0.16]), // A1: she lifts her front at each far end (2017, 21-31 s)
  ...[31.5, 47.5, 64, 78].map(b => [b, 0.6, 'lift', 0.05]), // and hops home
  ...[92, 96, 100, 104, 108].map(b => [b, 0.6, 'lift', 0.04]), // A2: a skip round the circle
  [110.5, 1.5, 'nod', 0.4], [120, 0.7, 'lift', 0.07], [124, 0.7, 'lift', 0.07], // a head shake, hops on the passada
  [141, 3, 'tremble', 0.04], [143.5, 1.2, 'pitch', -0.28], // the drumroll: she trembles at the lens, then rears up
  ...[148, 152, 156, 160, 164, 168, 172, 176].flatMap(b => [[b, 1.2, 'pitch', 0.3], [b, 0.8, 'lift', 0.07]]), // B: rear kicks
  [180, 2, 'pitch', 0.14], [182.3, 1, 'pitch', -0.38], [183, 1.2, 'tremble', 0.035], [184.8, 1.2, 'nod', 0.45], // C: head
  [191, 3, 'pitch', 0.14], [194.3, 1, 'pitch', -0.38], [195, 1.2, 'tremble', 0.035], [196.6, 1.2, 'nod', 0.45], // down, skid
  ...Array.from({ length: 16 }, (_, i) => [208 + i, 0.45, 'lift', 0.08]), // X: a hop on every beat
  [228, 1.5, 'pitch', -0.4], // the final hit: front up high
];

const mulaEase = (u, r) => { // trapezoid speed: ramps over r of the move at each end (peak 1 / (1 - r) of the mean)
  const vp = 1 / (1 - r);
  return u < r ? vp * u * u / (2 * r) : u > 1 - r ? 1 - vp * (1 - u) ** 2 / (2 * r) : vp * (u - r / 2);
};
const FIG_SPIN = (() => { // the spin's speed u^1.2 (1-u)^0.8, integrated: peaks at 60% of it, 1.5x its mean
  const n = 256, e = [0];
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; e.push(e[i] + u ** 1.2 * (1 - u) ** 0.8); }
  return e.map(v => v / e[n]);
})();
const FIG_EASE = {
  walk: u => mulaEase(u, 0.35), turn: u => mulaEase(u, 0.35), arc: u => mulaEase(u, 0.15),
  charge: u => u * u * (2 - u), // from rest to 1.33x the mean at 2/3, still at speed at the end: the join's easing skids it
  spin: u => { const k = u * 256, i = Math.min(255, Math.floor(k)); return FIG_SPIN[i] + (FIG_SPIN[i + 1] - FIG_SPIN[i]) * (k - i); },
};
function figurePose(state, move, u, out) { // state: where the move started; u 0-1 of it
  const [, , kind, a, b] = move, e = FIG_EASE[kind](u), s = Math.sin(state.yaw), c = Math.cos(state.yaw);
  out.x = state.x; out.z = state.z; out.yaw = state.yaw;
  if (kind === 'walk' || kind === 'charge') { out.x += s * a * e; out.z += c * a * e; return out; }
  const th = a * e;
  out.yaw = state.yaw + th;
  if (kind === 'turn' || kind === 'spin') { // about a point `pivot` m ahead on her long axis (forward = (sin, cos) of yaw)
    const p = kind === 'turn' ? b : 0;
    out.x += p * (s - Math.sin(out.yaw)); out.z += p * (c - Math.cos(out.yaw));
  } else { // arc: round the centre `radius` m on her +x side ((cos, -sin) of yaw)
    out.x += b * (c - Math.cos(out.yaw)); out.z += b * (Math.sin(out.yaw) - s);
  }
  return out;
}

const FIG_STEP = 1 / 8, FIG_SIGMA = 0.35, FIG_LAST = 240; // beats: samples, the joins' easing (a Gaussian), the end of the table
function buildFigures() {
  const raw = [], state = { x: MULA_CENTRE[0], z: MULA_CENTRE[1], yaw: MULA_W }, p = {};
  let k = 0;
  for (let i = 0; i * FIG_STEP <= FIG_LAST + 4 * FIG_SIGMA; i++) {
    const b = i * FIG_STEP;
    while (k < MULA_FIGURES.length && b >= MULA_FIGURES[k][0] + MULA_FIGURES[k][1]) figurePose(state, MULA_FIGURES[k++], 1, state);
    const m = MULA_FIGURES[k];
    if (m && b > m[0]) figurePose(state, m, (b - m[0]) / m[1], p); else Object.assign(p, state);
    raw.push([p.x, p.z, p.yaw]);
  }
  const reach = Math.ceil(3 * FIG_SIGMA / FIG_STEP), w = [];
  for (let j = -reach; j <= reach; j++) w.push(Math.exp(-0.5 * (j * FIG_STEP / FIG_SIGMA) ** 2));
  const rows = [];
  for (let i = 0; i * FIG_STEP <= FIG_LAST; i++) {
    const row = [i * FIG_STEP];
    for (let ch = 0; ch < 3; ch++) { // relative to the sample itself: a stretch where she holds stays exactly put
      let sum = 0, W = 0;
      for (let j = -reach; j <= reach; j++) { const q = raw[Math.max(0, i + j)][ch] - raw[i][ch]; sum += w[j + reach] * q; W += w[j + reach]; }
      row.push(raw[i][ch] + sum / W);
    }
    rows.push(row);
  }
  return rows;
}
const FIG_ROWS = buildFigures();
export function figureAt(beat, out) {
  out.x = mulaTrack(FIG_ROWS, beat, 1); out.z = mulaTrack(FIG_ROWS, beat, 2); out.yaw = mulaTrack(FIG_ROWS, beat, 3);
  return out;
}
const mulaBump = (b, at, w) => { const d = Math.abs(b - at) / w; return d < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * d) : 0; };
// Where the plaça answers her: each culada's end, each charge's skid, the final hit (the colla's arms go up, the crowd
// cheers: scene/mula-motion.js).
export const MULA_CHEERS = [148, 152, 156, 160, 164, 168, 172, 176, 182.3, 194.3, 228];
export const cheerAt = beat => MULA_CHEERS.reduce((m, at) => Math.max(m, mulaBump(beat, at, 1.2)), 0);
// Adds the accents at this beat (t: song seconds, the tremble's clock) to out.pitch / roll / lift / headYaw.
export function accentAt(beat, t, out) {
  for (const [at, w, kind, size] of FIG_ACCENTS) {
    const k = mulaBump(beat, at, w);
    if (!k) continue;
    if (kind === 'pitch') out.pitch += size * k;
    else if (kind === 'lift') out.lift += size * k;
    else if (kind === 'nod') out.headYaw += size * k * Math.sin((beat - at) * 2 * Math.PI);
    else out.roll += size * k * Math.sin(t * 18 * Math.PI);
  }
  return out;
}
