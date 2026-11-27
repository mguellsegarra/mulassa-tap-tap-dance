// Lay out Sant Joan's stonework on the player's tower, floor by floor as each turns to stone (AHEAD under the top), and
// never touch a floor again once it is settled: its body's plan (bodies.js) and its course. From the ground up: the
// portal, the big ashlar, a string course; the shaft in bays of BAY floors between thin string courses, each with a window or
// an arrow slit in its middle; the clock and the cornice of blind arches over it, earned once by a clean stretch; a glacis, the top floor of a body sloping in to the next one's plan. The top: the
// parapet over the bell chamber, on the last floor wide enough for bells. A floor too thin for them tells, as soon as
// it is laid, where that top is; a tower that ends wide has it on its last floor, laid on the floors still in colour
// when the run ends. Above it, the floors too thin for bells ('agulla') stay in colour till the end, then go under an
// octagonal stone spire centred on the parapet (crown.js). Each opening belongs to one flat bay: no motif crosses a
// body's joint.
import { SIZE } from './rules.js';
import { AHEAD, bodyAt, joinsBody, sameCampanarPlan } from './bodies.js';
import { createOrnamentPlan } from './ornament-plan.js';

const campanarWidths = { A: 0.65, C: 0.4, XS: 0.22 };
const sizeOf = v => Object.keys(campanarWidths).find(k => v >= campanarWidths[k]); // a motif's set for a share of the full side
export const LEN = { bells: { A: 4, C: 3, XS: 2 }, clock: { A: 3, C: 2 }, portal: { A: 3, C: 2 }, window: { A: 2, C: 2, XS: 2 },
  ocul: { A: 1, C: 1, XS: 1 }, rosassa: { A: 3 }, escala: { A: 4, C: 4 }, candela: { A: 2, C: 2, XS: 2 }, lluna: { A: 2, C: 2, XS: 2 } };
const FILE = { bells: 'campanes', clock: { A: 'rellotge3', C: 'rellotge' }, portal: 'portal', window: { A: 'mainell', C: 'mainell', XS: 'espitllera' },
  ocul: 'ocul', rosassa: 'rosassa', escala: 'escala', candela: 'candela', lluna: 'lluna' };
// the shaft's floors that wear the Lombard lesenes (ornament-plan.js B1): plain, a string course, a face piece
const LESENES = /\/(fust|faixa|serra|mainell|espitllera|ocul|rosassa|escala|candela|lluna)/;
const fileOf = (motif, set) => `${set}/${typeof FILE[motif] === 'string' ? FILE[motif] : FILE[motif][set]}`;
// the big ashlar six floors over the portal; the clock from the twelfth floor; windows at least ten floors apart
const BASE_FLOORS = 6, CLOCK_FROM = 12, WINDOW_GAP = 10;
// a body's opening two floors over its foot: a window, or an arrow slit when the last window is nearer than WINDOW_GAP.
// A long body is parted in bays, as Valls' thin string courses part its shaft: a string course BAY floors over the last
// line across the wall (the body's foot, the imposta, the arches over the clock, a string course), and in its bay an
// opening two floors clear of it; none in the bay right over the clock, so its stage reads
export const BAY = 7;
const share = r => Math.min(r.w, r.d) / SIZE;
const courseOf = (kind, i) => `A/${kind}-${i % 2 ? 'senar' : 'parell'}`;

// one run's facade. settle(known) settles the next floor (known: the slabs as built, bottom up, squares on the axis)
// → { rect, key, batter?, orn?, found? } (orn: the pieces it wears besides its course, found: the ornaments it completes,
// ornament-plan.js); finish(known) settles the rest, the top on the last floor if it has none yet → { courses,
// rects, bodies, top: 'crown' | 'vane', cap } (cap: the parapet's floor, -1 when the tower has none). Every motif is
// centred on the tower's axis, as every floor is
export function createFacade() {
  const floors = [], pending = new Map(); // pending: a motif's upper pieces, chosen with its first floor
  const orn = createOrnamentPlan();
  let baseUntil = BASE_FLOORS, clock = false, lastWindow = -Infinity, lastOpen = -Infinity;
  let line = -Infinity; // the last floor a band crosses (the imposta, the arches, a string course)

  // the parapet's floor: under the first slab too thin for bells, or the last one when the run has ended
  const capOf = (known, ended) => {
    const k = known.findIndex(r => !sizeOf(share(r)));
    return k >= 0 ? k - 1 : ended ? known.length - 1 : null;
  };

  function settle(known, ended = false) {
    const i = floors.length, cap = capOf(known, ended);
    if (!sizeOf(share(known[i])) && i > 0) { // too thin for bells: left in colour, under the spire when the run ends
      const f = { body: floors[i - 1].body, rect: known[i], key: 'agulla' };
      floors.push(f);
      return f;
    }
    const below = cap === null ? known : known.slice(0, cap + 1); // no body crosses the parapet
    const body = bodyAt(below, i, floors[i - 1]?.body);
    const rect = i === 0 ? known[0] : body.plan; // only the ground floor keeps its own plan
    const limit = cap ?? Infinity;
    const joins = j => j <= limit && joinsBody(below, j, body);
    const at = j => (j === i ? rect : joins(j) ? body.plan : known[j]); // floor j's plan as far as it is known now
    const flat = hi => { for (let j = i + 1; j <= hi; j++) if (!joins(j) || !sameCampanarPlan(at(j), at(j - 1))) return false; return true; };
    const f = { body, rect, key: null };
    const put = key => { f.key = key; };
    const motif = (name, set, top = null, found = null) => { // over floors i.. upwards; top: one more course over it
      const k = LEN[name][set], hi = i + k - 1, file = fileOf(name, set);
      for (let j = 1; j < k; j++) pending.set(i + j, { key: `${file}-0${k - j}`, group: hi + (top ? 1 : 0) });
      if (top) pending.set(hi + 1, { key: top, group: hi + 1 });
      if (found) (k > 1 ? pending.get(hi) : f).found = [found]; // collected as its last floor settles
      put(`${file}-0${k}`);
      f.group = hi + (top ? 1 : 0);
      return k;
    };
    const p = pending.get(i);
    if (p) { put(p.key); f.group = p.group; f.found = p.found; } else if (cap !== null && i === cap) {
      put('A/remat');
      const nest = orn.remat(i, known); // E1, the stork's nest on its gable
      if (nest.length) f.orn = f.found = nest;
    }
    else if (cap !== null && i < cap && i >= cap - 4) { // the bell chamber under the parapet: the biggest bells that reach it whole
      const set = Object.keys(campanarWidths).find(k => share(at(cap - 1)) >= campanarWidths[k] && i === cap - LEN.bells[k] && flat(cap - 1));
      if (set) motif('bells', set, null, 'campanes');
      else if (i === cap - 1) { put('XS/campanes-master'); f.found = ['campanes']; } // one complete opening on a shallow bay
    } else if (i === 0) {
      const portal = known[2] && share(at(2)) >= 0.65 && flat(2) ? 'A' : known[1] && share(at(1)) >= 0.4 && flat(1) ? 'C' : null;
      if (portal) { motif('portal', portal, null, 'portal'); baseUntil += LEN.portal[portal]; }
    }
    if (!f.key) {
      const set = known[i + 1] && sizeOf(share(at(i + 1))), cset = sizeOf(share(rect));
      const clockSet = !clock && i >= CLOCK_FROM && (cset === 'A' ? 'A' : cset === 'C' ? 'C' : null);
      const room = cap === null || i + 5 < cap - 4; // the clock and its arches stay clear of the bell chamber
      const bay = i - Math.max(body.lo - 1, line), clear = j => cap === null || j < cap - 4; // so do the bays' pieces
      const spaced = i === body.lo + 2 || i - lastOpen >= 4; // two plain floors over the last opening (or the clock) in a body
      if (i < baseUntil) put(courseOf('base', i));
      else if (i === baseUntil) { put('A/imposta'); line = i; }
      else if (clockSet && room && known[i + LEN.clock[clockSet]] && flat(i + LEN.clock[clockSet])) {
        motif('clock', clockSet, 'A/arquets', 'rellotge');
        clock = true;
        line = lastOpen = i + LEN.clock[clockSet];
      } else if ((i === body.lo + 2 || bay === 3) && spaced && set && clear(i + 1) && flat(i + 2)) { // a plain floor over it
        const big = i - lastWindow >= WINDOW_GAP, pick = orn.slot(i, known, set, n => clear(i + n - 1) && flat(i + n), clock);
        if (pick) lastOpen = i + motif(pick.name, pick.set, null, pick.id) - 2; // as far from the next as a window's
        else {
          motif('window', big ? set : 'XS', null, big ? 'finestral' : 'espitllera');
          if (big) lastWindow = i;
          lastOpen = i;
        }
      } else if (bay >= BAY && spaced && clear(i) && flat(i + 2)) { // never just under a glacis
        put('A/faixa');
        line = i;
        f.orn = ['lombard', ...orn.corners(i, known)]; // the Lombard arches under it, the gargoyles over it
        f.found = ['faixa', ...f.orn.filter(o => o !== 'lombard')];
      } else if (orn.filler() && clear(i) && flat(i + 1)) {
        if (orn.filler() === 'ocul') motif('ocul', cset, null, 'A1');
        else { put('A/serra'); f.found = ['B2']; }
      }
    }
    // the top floor of a body under a narrower one: a glacis, sloping in to that plan
    if ((!f.key || f.key.startsWith('A/base') || f.key === 'A/imposta') && known[i + 1] && i + 1 <= limit && !joins(i + 1)) {
      const next = bodyAt(below, i + 1, body);
      if (!sameCampanarPlan(next.plan, rect)) f.batter = next.plan;
    }
    if (!f.key) put(courseOf('fust', i));
    if (i > baseUntil && !f.batter && LESENES.test(f.key)) f.orn = ['lesenes', ...(f.orn ?? [])];
    orn.after(f.key);
    // the floors still in colour that will wear this body's plan, or the next body's one it slopes in to: [floor, plan]
    f.ahead = [];
    for (let j = i + 1; joins(j); j++) f.ahead.push([j, body.plan]);
    if (f.batter) {
      const next = bodyAt(below, i + 1, body);
      for (let j = i + 1; j <= limit && known[j] && (j === i + 1 || joinsBody(below, j, next)); j++) f.ahead.push([j, next.plan]);
    }
    floors.push(f);
    return f;
  }

  function finish(known) {
    while (floors.length < known.length) settle(known, true);
    const n = known.length, cap = capOf(known, true) ?? -1;
    const list = [];
    floors.forEach((f, i) => (list.at(-1)?.body === f.body ? (list.at(-1).hi = i) : list.push({ lo: i, hi: i, rect: f.body.plan, body: f.body })));
    return { courses: floors.map(f => ({ key: f.key, batter: f.batter, orn: f.orn, found: f.found })), rects: floors.map(f => f.rect), bodies: list,
      top: cap === n - 1 ? 'crown' : 'vane', cap };
  }
  // can the next floor settle? AHEAD floors over it are known: one floor turns to stone with each one laid
  const ready = known => known.length - 1 - floors.length >= AHEAD;
  return { settle, finish, ready, get settled() { return floors.length; } };
}

// the whole tower as the game paints it, floor by floor as each is laid (rects: the slabs bottom up {x, z, w, d})
export function facade(rects) {
  const f = createFacade();
  for (let k = 1; k <= rects.length; k++) while (f.ready(rects.slice(0, k))) f.settle(rects.slice(0, k));
  return f.finish(rects);
}
