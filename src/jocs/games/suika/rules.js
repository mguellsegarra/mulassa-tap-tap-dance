// The rules, on top of Planck (Box2D). World units: the container is 100 wide, its height is given; y grows downwards and the rim is y = 0.
import { World, Edge, Circle } from 'planck';

// Radii follow the Suika's proportions: the last figure is about 7.5 times the first.
export const LADDER = [
  { id: 'nan', r: 4 },
  { id: 'barretVerd', r: 5 },
  { id: 'arlequi', r: 7.2 },
  { id: 'diable', r: 8.5 },
  { id: 'drac', r: 10.6 },
  { id: 'aliga', r: 14 },
  { id: 'lleo', r: 16 },
  { id: 'basilisc', r: 19.6 },
  { id: 'mulassa', r: 22 },
  { id: 'gegant', r: 27 },
  { id: 'calcot', r: 30 },
];
export const WIDTH = 100;
export const HOLD_Y = -14; // where the next figure waits, above the rim
export const OVER_SECS = 2; // how long a figure may stay above the rim
const SPAWN = [.2, .2, .2, .2, .2]; // the five smallest, evenly, as in the Suika
const COOLDOWN = .3;
const GROW_SECS = .18; // a merged figure swells instead of appearing full size and shoving its neighbours
const M = .1; // metres per world unit: Box2D is tuned for bodies of about a metre
const GRAVITY = 320, BOUNCE = .15, FRICTION = .3, STEP = 1 / 120;

// Triangular, so each rung is worth clearly more than the last. Two gegants vanish for the top value.
export const mergeScore = tier => (tier + 2) * (tier + 3) / 2;
// The figure two of `tier` become; null when two gegants leave nothing behind.
export const mergeInto = tier => (tier + 1 < LADDER.length ? tier + 1 : null);

export function pick(rng = Math.random) {
  let roll = rng();
  for (let t = 0; t < SPAWN.length; t++) if ((roll -= SPAWN[t]) < 0) return t;
  return 0;
}

export function newGame(height, { rng = Math.random, on = () => {} } = {}) {
  const world = new World({ gravity: { x: 0, y: GRAVITY * M }, allowSleep: true });
  const box = world.createBody();
  const edge = (x1, y1, x2, y2) => box.createFixture(new Edge({ x: x1 * M, y: y1 * M }, { x: x2 * M, y: y2 * M }), { friction: FRICTION });
  edge(0, -500, 0, height);
  edge(WIDTH, -500, WIDTH, height);
  edge(0, height, WIDTH, height);
  const g = { h: height, rng, on, world, state: 'play', bodies: [], merges: [], score: 0, top: 0, held: pick(rng), next: pick(rng), cool: 0, danger: 0, spare: 0, alpha: 0 };
  world.on('begin-contact', c => {
    const a = c.getFixtureA().getBody().getUserData(), b = c.getFixtureB().getBody().getUserData();
    if (a && b && a.tier === b.tier) g.merges.push([a, b]);
  });
  return g;
}

function addBody(g, tier, x, y, vx = 0, vy = 0, from = LADDER[tier].r) {
  const r = from, phys = g.world.createDynamicBody({ position: { x: x * M, y: y * M }, linearVelocity: { x: vx * M, y: vy * M }, angularDamping: .6 });
  phys.createFixture(new Circle(r * M), { density: 1, friction: FRICTION, restitution: BOUNCE });
  const b = { tier, r, full: LADDER[tier].r, grow: from, x, y, rot: 0, px: x, py: y, prot: 0, above: 0, age: 0, phys };
  phys.setUserData(b);
  g.bodies.push(b);
  return b;
}

export const clampX = (x, tier) => Math.min(WIDTH - LADDER[tier].r, Math.max(LADDER[tier].r, x));

export function drop(g, x) {
  if (g.state !== 'play' || g.held === null) return false;
  addBody(g, g.held, clampX(x, g.held), HOLD_Y);
  g.on('drop', g.held);
  g.held = null;
  g.cool = COOLDOWN;
  return true;
}

function merge(g, a, b) {
  if (a.gone || b.gone) return;
  a.gone = b.gone = true;
  const tier = mergeInto(a.tier), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, points = mergeScore(a.tier);
  const va = a.phys.getLinearVelocity(), vb = b.phys.getLinearVelocity(), vx = (va.x + vb.x) / 2 / M, vy = (va.y + vb.y) / 2 / M;
  g.world.destroyBody(a.phys);
  g.world.destroyBody(b.phys);
  g.bodies = g.bodies.filter(o => o !== a && o !== b);
  g.score += points;
  const first = tier !== null && tier > g.top;
  if (first) g.top = tier;
  if (tier !== null) addBody(g, tier, clampX(x, tier), y, vx, vy - 15, a.r);
  g.on('merge', { from: a.tier, tier, x, y, points, first });
}

function step(g) {
  for (const b of g.bodies) { b.px = b.x; b.py = b.y; b.prot = b.rot; }
  for (const b of g.bodies) if (b.r < b.full) {
    b.r = Math.min(b.full, b.r + (b.full - b.grow) * STEP / GROW_SECS);
    b.phys.getFixtureList().getShape().m_radius = b.r * M;
    b.phys.setAwake(true);
    if (b.r === b.full) b.phys.resetMassData();
  }
  g.world.step(STEP, 8, 3);
  // Box2D forbids changing bodies inside its contact callback
  for (const [a, b] of g.merges.splice(0)) merge(g, a, b);
  let danger = 0;
  for (const b of g.bodies) {
    const p = b.phys.getPosition();
    b.x = p.x / M; b.y = p.y / M; b.rot = b.phys.getAngle();
    b.age += STEP;
    b.above = b.y - b.r < 0 ? b.above + STEP : 0;
    danger = Math.max(danger, b.above / OVER_SECS);
  }
  g.danger = danger;
  if (danger >= 1) { g.state = 'over'; g.on('over'); }
}

export function tick(g, dt) {
  if (g.state !== 'play') return;
  if (g.held === null && (g.cool -= dt) <= 0) { g.held = g.next; g.next = pick(g.rng); }
  g.spare += dt;
  while (g.spare >= STEP && g.state === 'play') { step(g); g.spare -= STEP; }
  g.alpha = g.spare / STEP; // how far the screen is between the last two physics steps
}
