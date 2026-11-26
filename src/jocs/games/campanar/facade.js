// Lay out Sant Joan's stonework on the player's tower, floor by floor as each turns to stone (AHEAD under the top), and
// never touch a floor again once it is settled: its body's plan (bodies.js) and its course. From the ground up: the
// portal, the big ashlar, a string course; a window in the middle of a tall body, a plain stretch between two; the clock and the cornice of blind arches over it,
// earned once by a clean stretch; a glacis, the top floor of a body sloping in to the next one's plan. The top: the
// parapet over the bell chamber, on the last floor wide enough for bells. A floor too thin for them tells, as soon as
// it is laid, where that top is; a tower that ends wide has it on its last floor, laid on the floors still in colour
// when the run ends. Above it, the floors too thin for bells ('agulla') stay in colour till the end, then go under an
// octagonal stone spire centred on the parapet (crown.js). Each opening belongs to one flat bay: no motif crosses a
// body's joint.
import { SIZE } from './rules.js';
import { TOL, AHEAD, bodyAt, joinsBody, sameCampanarPlan } from './bodies.js';

const campanarWidths = { A: 0.65, C: 0.4, XS: 0.22 };
const sizeOf = v => Object.keys(campanarWidths).find(k => v >= campanarWidths[k]); // a motif's set for a share of the full side
const LEN = { bells: { A: 4, C: 3, XS: 2 }, clock: { A: 3, C: 2 }, portal: { A: 3, C: 2 }, window: { A: 2, C: 2, XS: 2 } };
const FILE = { bells: 'campanes', clock: { A: 'rellotge3', C: 'rellotge' }, portal: 'portal', window: { A: 'mainell', C: 'mainell', XS: 'espitllera' } };
const fileOf = (motif, set) => `${set}/${typeof FILE[motif] === 'string' ? FILE[motif] : FILE[motif][set]}`;
// the big ashlar six floors over the portal; the clock from the twelfth floor; windows at least ten floors apart
const BASE_FLOORS = 6, CLOCK_FROM = 12, WINDOW_GAP = 10;
const AXIS = { x: 0, z: 0 };
const share = r => Math.min(r.w, r.d) / SIZE;
const courseOf = (kind, i) => `A/${kind}-${i % 2 ? 'senar' : 'parell'}`;

// one run's facade. settle(known) settles the next floor (known: the slabs as built, bottom up) → { rect, key, cx, cz,
// batter? }; finish(known) settles the rest, the top on the last floor if it has none yet → { courses, rects, bodies,
// top: 'crown' | 'vane', cap } (cx, cz: where a motif is centred; cap: the parapet's floor, -1 when the tower has none)
export function createFacade(tol = TOL) {
  const floors = [], pending = new Map(); // pending: a motif's upper pieces, chosen with its first floor
  let baseUntil = BASE_FLOORS, clock = false, lastWindow = -Infinity;

  // the parapet's floor: under the first slab too thin for bells, or the last one when the run has ended
  const capOf = (known, ended) => {
    const k = known.findIndex(r => !sizeOf(share(r)));
    return k >= 0 ? k - 1 : ended ? known.length - 1 : null;
  };

  function settle(known, ended = false) {
    const i = floors.length, cap = capOf(known, ended);
    if (!sizeOf(share(known[i])) && i > 0) { // too thin for bells: left in colour, under the spire when the run ends
      const f = { body: floors[i - 1].body, rect: known[i], key: 'agulla', cx: 0, cz: 0 };
      floors.push(f);
      return f;
    }
    const below = cap === null ? known : known.slice(0, cap + 1); // no body crosses the parapet
    const body = bodyAt(below, i, floors[i - 1]?.body, tol);
    const rect = i === 0 ? known[0] : body.plan; // only the ground floor keeps its own plan
    const limit = cap ?? Infinity;
    const joins = j => j <= limit && joinsBody(below, j, body, tol);
    const at = j => (j === i ? rect : joins(j) ? body.plan : known[j]); // floor j's plan as far as it is known now
    const flat = hi => { for (let j = i + 1; j <= hi; j++) if (!joins(j) || !sameCampanarPlan(at(j), at(j - 1))) return false; return true; };
    const f = { body, rect, key: null, cx: 0, cz: 0 };
    const put = (key, c = rect) => Object.assign(f, { key, cx: c.x, cz: c.z });
    const motif = (name, set, top = null) => { // over floors i.. upwards, centred on its top floor; top: one more course over it
      const k = LEN[name][set], hi = i + k - 1, file = fileOf(name, set);
      for (let j = 1; j < k; j++) pending.set(i + j, { key: `${file}-0${k - j}`, c: at(hi), group: hi + (top ? 1 : 0) });
      if (top) pending.set(hi + 1, { key: top, c: at(hi + 1), group: hi + 1 });
      put(`${file}-0${k}`, at(hi));
      f.group = hi + (top ? 1 : 0);
    };
    const p = pending.get(i);
    if (p) { put(p.key, p.c); f.group = p.group; } else if (cap !== null && i === cap) put('A/remat');
    else if (cap !== null && i < cap && i >= cap - 4) { // the bell chamber under the parapet: the biggest bells that reach it whole
      const set = Object.keys(campanarWidths).find(k => share(at(cap - 1)) >= campanarWidths[k] && i === cap - LEN.bells[k] && flat(cap - 1));
      if (set) motif('bells', set);
      else if (i === cap - 1) put('XS/campanes-master'); // one complete opening on a shallow bay
    } else if (i === 0) {
      const portal = known[2] && share(at(2)) >= 0.65 && flat(2) ? 'A' : known[1] && share(at(1)) >= 0.4 && flat(1) ? 'C' : null;
      if (portal) { motif('portal', portal); baseUntil += LEN.portal[portal]; }
    }
    if (!f.key) {
      const set = known[i + 1] && sizeOf(share(at(i + 1))), cset = sizeOf(share(rect)), tall = joins(body.lo + 4);
      const clockSet = !clock && i >= CLOCK_FROM && (cset === 'A' ? 'A' : cset === 'C' ? 'C' : null);
      const room = cap === null || i + 5 < cap - 4; // the clock and its arches stay clear of the bell chamber
      if (i < baseUntil) put(courseOf('base', i), AXIS);
      else if (i === baseUntil) put('A/imposta', AXIS);
      else if (clockSet && room && known[i + LEN.clock[clockSet]] && flat(i + LEN.clock[clockSet])) { motif('clock', clockSet, 'A/arquets'); clock = true; }
      else if (i === body.lo + 2 && tall && set && i - lastWindow >= WINDOW_GAP && flat(i + 1)) { motif('window', set); lastWindow = i; }
    }
    // the top floor of a body under a narrower one: a glacis, sloping in to that plan
    if ((!f.key || f.key.startsWith('A/base') || f.key === 'A/imposta') && known[i + 1] && i + 1 <= limit && !joins(i + 1)) {
      const next = bodyAt(below, i + 1, body, tol);
      if (!sameCampanarPlan(next.plan, rect)) f.batter = next.plan;
    }
    if (!f.key) put(courseOf('fust', i), AXIS);
    // the floors still in colour that will wear this body's plan, or the next body's one it slopes in to: [floor, plan]
    f.ahead = [];
    for (let j = i + 1; joins(j); j++) f.ahead.push([j, body.plan]);
    if (f.batter) {
      const next = bodyAt(below, i + 1, body, tol);
      for (let j = i + 1; j <= limit && known[j] && (j === i + 1 || joinsBody(below, j, next, tol)); j++) f.ahead.push([j, next.plan]);
    }
    floors.push(f);
    return f;
  }

  function finish(known) {
    while (floors.length < known.length) settle(known, true);
    const n = known.length, cap = capOf(known, true) ?? -1;
    const list = [];
    floors.forEach((f, i) => (list.at(-1)?.body === f.body ? (list.at(-1).hi = i) : list.push({ lo: i, hi: i, rect: f.body.plan, body: f.body })));
    return { courses: floors.map(f => ({ key: f.key, cx: f.cx, cz: f.cz, batter: f.batter })), rects: floors.map(f => f.rect), bodies: list,
      top: cap === n - 1 ? 'crown' : 'vane', cap };
  }
  // can the next floor settle? AHEAD floors over it are known: one floor turns to stone with each one laid
  const ready = known => known.length - 1 - floors.length >= AHEAD;
  return { settle, finish, ready, get settled() { return floors.length; } };
}

// the whole tower as the game paints it, floor by floor as each is laid (rects: the slabs bottom up {x, z, w, d})
export function facade(rects, tol) {
  const f = createFacade(tol);
  for (let k = 1; k <= rects.length; k++) while (f.ready(rects.slice(0, k))) f.settle(rects.slice(0, k));
  return f.finish(rects);
}
