// The run, no drawing. The mechanics and their numbers follow playus's Lane Rush (game.playus.club/lane-rush): a drum of
// radius R turns under the Mulassa, so the horizon is a few metres ahead and things come over it with little warning.
// Distances are metres of arc along the drum: `d` is how far ahead of its top a thing is, falling as it comes.
export const R = 60;
export const LANES = [-2.3, 0, 2.3];
export const PLAYER_AT = -1.4; // she runs a little on the camera's side of the top
export const SPAWN_AT = 1.15 * R, GONE_AT = -.16 * R; // out of sight behind the drum; behind the camera
const TOWARDS = 7; // m/s: what comes also walks towards her
const HIT_ARC = 1.6, HIT_X = 1.35;

// Speed against the time played: a curve up to 700 m, a straight line after it.
const HURRY = 1.3;
const curve = t => 14 + .55 * t + .0065 * t * t;
const metres = t => 14 * t + .715 * t * t / 2 + .010985 * t * t * t / 3; // the curve's distance at t seconds
const BEND = (() => { // the second the 700 m are reached
  let a = 0, b = 50;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (metres(m) < 700) a = m; else b = m; }
  return (a + b) / 2;
})();
const BEND_SPEED = curve(HURRY * BEND), AFTER = HURRY * (.55 + .013 * HURRY * BEND);
export const speedAt = t => (t <= BEND ? curve(HURRY * t) : BEND_SPEED + AFTER * (t - BEND));

// What comes. `wide` things stand between two lanes and close both.
export const KINDS = ['avia', 'cotxet', 'gos', 'xurros'];
const DRAC_FROM = 20, DRAC_SHARE = .1; // seconds of difficulty before the Drac may come, and how often then
export const midX = t => LANES[t.lane] + (t.wide ? LANES[2] / 2 : 0);

export function newRun(rand = Math.random) {
  return { elapsed: 0, distance: 0, speed: speedAt(0), things: [], clock: 0, nextGap: 30, lastGap: 30, safe: [1], over: false, rand };
}

function kindFor(run) {
  const r = run.rand;
  return HURRY * run.elapsed > DRAC_FROM && r() < DRAC_SHARE ? 'drac' : KINDS[Math.floor(r() * KINDS.length)];
}
// A row always leaves a lane she can reach from one that was free in the row before, in the time between the two.
function spawnRow(run, closing, out) {
  const r = run.rand, time = run.lastGap / closing, reach = Math.max(1, Math.min(2, Math.floor((time - .12) / .24)));
  const reachable = [0, 1, 2].filter(l => run.safe.some(s => Math.abs(l - s) <= reach));
  const hard = HURRY * run.elapsed;
  const add = (kind, lane, d = SPAWN_AT, wide = false) => {
    const t = { kind, lane, wide, d };
    run.things.push(t);
    out.push({ type: 'spawn', thing: t });
  };
  if (hard > 5 && r() < Math.min(.14 + .012 * hard, .85) && reachable.length) { // two lanes closed, one way through
    const free = reachable[Math.floor(r() * reachable.length)];
    if (free === 1) for (const l of [0, 2]) add(kindFor(run), l);
    else add('gegants', free ? 0 : 1, SPAWN_AT, true); // the pair of giants, across the other two
    run.safe = [free];
  } else {
    const can = [0, 1, 2].filter(l => reachable.some(s => s !== l)), was = can.filter(l => run.safe.includes(l));
    const from = was.length && r() < .6 ? was : can, lane = from[Math.floor(r() * from.length)] ?? 1; // mostly where she was safe
    add(kindFor(run), lane, SPAWN_AT + .05 * (r() - .5) * R);
    const rest = [0, 1, 2].filter(l => l !== lane), near = rest.filter(l => reachable.includes(l));
    run.safe = near.length ? near : rest;
  }
}

// Advances dt seconds with the Mulassa at x (she slides between lanes). → what happened: spawn, gone, hit.
export function step(run, dt, x) {
  const out = [];
  if (run.over) return out;
  run.elapsed += dt;
  const speed = speedAt(run.elapsed), closing = speed + TOWARDS;
  run.speed = speed;
  run.distance += speed * dt;
  run.clock += closing * dt;
  if (run.clock >= run.nextGap) {
    run.clock = 0;
    spawnRow(run, closing, out);
    run.lastGap = run.nextGap;
    const least = .34 * closing; // rows closer as the run hardens, never closer than a lane change takes
    run.nextGap = Math.max(least, Math.max(least, 38 - .65 * HURRY * run.elapsed) * (.9 + .25 * run.rand()));
  }
  for (const t of run.things) {
    t.d -= closing * dt;
    if (t.done) continue;
    if (Math.abs(t.d - PLAYER_AT) >= HIT_ARC || Math.abs(midX(t) - x) >= HIT_X + (t.wide ? LANES[2] / 2 : 0)) continue;
    t.done = true;
    run.over = true;
    out.push({ type: 'hit', thing: t });
    break;
  }
  run.things = run.things.filter(t => {
    const gone = t.d < GONE_AT;
    if (gone) out.push({ type: 'gone', thing: t });
    return !gone;
  });
  return out;
}
