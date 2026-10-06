// Crowd speech belongs in musical rests, never among the notes.
// Pure logic (no DOM, no three.js); main.js measures, anchors and draws.
export const TALK = Array.from({ length: 3 }, () => ({ max: 1, gap: 8, crowd: true, chatter: true, celebrate: [20, 0.8] }));
export const BUBBLE_SECONDS = 2;

// Starts and cumulative ends are prepared once per chart, including holds and drumrolls.
export function restTimeline(chart) {
  const starts = [], ends = [];
  let end = -Infinity;
  for (const n of chart) { starts.push(n.t); ends.push(end = Math.max(end, n.t, n.end ?? n.t)); }
  return { starts, ends, cursor: 0, lastTime: -Infinity, previousEnd: -Infinity, remaining: 0, available: false };
}
export function updateRest(rest, t, blocked = false) {
  if (t < rest.lastTime) rest.cursor = 0; // practice restarts its beat clock
  rest.lastTime = t;
  while (rest.cursor < rest.starts.length && rest.starts[rest.cursor] <= t) rest.cursor++;
  rest.previousEnd = rest.cursor ? rest.ends[rest.cursor - 1] : -Infinity;
  rest.remaining = (rest.starts[rest.cursor] ?? Infinity) - t;
  rest.available = !blocked && rest.cursor > 0 && t - rest.previousEnd >= 0.4 - 1e-9 && rest.remaining >= 2.2 - 1e-9;
  return rest;
}

export const CHATTER = ['QUINA CALOR!', 'ON ÉS EL GEGANT?', 'UN CALÇOT, SISPLAU!', 'VISCA VALLS!', 'AMUNT!', 'QUIN RITME!',
  'MIRA, LA MULASSA!', 'QUI VOL COCA?', 'ENS VEIEM ALS CASTELLS!', 'QUINA FESTA!', 'VINGA, VINGA!'];
export const CELEBRATE = ['QUIN CRAC!', 'BRAVO!', 'IMPRESSIONANT!', 'VISCA!', 'OLÉ!'];
const QUIET_AFTER_MISS = 2; // s of calm after any miss

// Struggling latch: on with a miss streak >= 2 or the ànim under half, off again after 4 hits in a row with it >= half.
export const recovered = ({ combo, energy }) => combo >= 4 && energy >= 0.5;
export function rattled(was, s) {
  if (s.streak >= 2 || s.energy < 0.5) return true;
  return was && !recovered(s);
}
// Optional lines must fit a rest and leave time to read the next notes.
export function mayTalk(kind, s) {
  if (kind === 'must') return false; // collapse has its own caption; energy warnings use the meter
  const row = TALK[s.diff] ?? TALK[1];
  if (kind === 'ooh' || kind === 'peek') return false; // misses react through movement, not speech
  if (!s.live || !s.restAvailable || s.rattled || s.sinceMiss < QUIET_AFTER_MISS) return false;
  if (s.onScreen >= row.max || s.sinceLast < row.gap) return false;
  if (kind === 'chatter') return row.chatter;
  if (kind === 'celebrate') return s.combo >= row.celebrate[0] && s.energy >= row.celebrate[1];
  return row.crowd;
}

// Where a bubble goes. a: the speaker's anchor on screen [x, y] (null: behind the camera); w, h: the body;
// tail: wanted tail length; view: { l, t, r, b } the free area (safe area, under the HUD/lane/headline, over the pad);
// taken: bodies already on screen ({ x0, y0, x1, y1 }). The body stays whole inside `view`, above the speaker with
// the tail's tip on them (shortened when squeezed). null when the speaker is off the free area or there's no room.
export function placeBubble(a, w, h, tail, view, taken = []) {
  if (!a) return null;
  const [ax, ay] = a, { l, t, r, b } = view;
  if (w > r - l || ax < l || ax > r || ay > b || ay - t < h + 3) return null; // off-screen, behind the pad, or too high
  const x = Math.max(l + w / 2, Math.min(r - w / 2, ax));
  const y0 = Math.max(t, ay - tail - h), y1 = y0 + h; // body; the tail runs from y1 down to ay (3..tail long)
  for (const o of taken) if (x - w / 2 < o.x1 && x + w / 2 > o.x0 && y0 < o.y1 && y1 > o.y0) return null;
  return { x, y0, y1, tipX: ax, tipY: ay, baseX: Math.max(x - w / 2 + 6, Math.min(x + w / 2 - 6, ax)) };
}
