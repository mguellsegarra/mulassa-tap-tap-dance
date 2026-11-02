// Makes src/jocs/games/murdoku/levels.json from plans.js: random answers, then the fewest clues that still solve by deduction alone.
// Every case kept has one solution (exhaustive) and needs no guess (deduce). Usage: node tools/jocs/murdoku-levels.mjs
import { writeFileSync } from 'node:fs';
import { PLANS } from '../../src/jocs/games/murdoku/plans.js';
import { OBJECT, boardOf, culpritOf, deduce, lineFree, peopleOf, solutions } from '../../src/jocs/games/murdoku/rules.js';

const FIGURES = ['mulassa', 'drac', 'bou', 'os', 'aliga', 'basilisc', 'nans', 'gegants', 'cavallets', 'diables'];
const random = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const shuffle = (a, rng) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function place(level, rng) {
  const { cells } = boardOf(level);
  const at = {};
  for (const who of shuffle(peopleOf(level), rng)) {
    const spot = shuffle(cells, rng).find(a => a.free && lineFree(cells, at, who, a.i));
    if (!spot) return null;
    at[who] = spot.i;
  }
  return culpritOf(level, at) ? at : null;
}

function cluePool(level, at, relative) {
  const { cells } = boardOf(level);
  const pool = [];
  const zones = [...new Set(cells.map(a => a.zone))];
  for (const who of peopleOf(level)) {
    const a = cells[at[who]];
    pool.push({ t: 'in', who, zone: a.zone });
    for (const zone of zones) if (zone !== a.zone) pool.push({ t: 'notIn', who, zone });
    if (a.thing) pool.push({ t: 'on', who, thing: a.thing });
    for (const b of cells) if (b.thing && Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1) pool.push({ t: 'beside', who, thing: b.thing });
    if (relative) for (const other of peopleOf(level)) {
      if (other === who || other === OBJECT) continue;
      const o = cells[at[other]];
      if (a.r < o.r) pool.push({ t: 'above', who, other });
      if (a.c < o.c) pool.push({ t: 'leftOf', who, other });
    }
  }
  return pool.filter((cl, i) => pool.findIndex(x => JSON.stringify(x) === JSON.stringify(cl)) === i);
}

// Drop clues in random order while the case still solves, down to a card per person with one or two facts, like the books.
function trim(level, pool, rng) {
  let clues = shuffle(pool, rng);
  if (!deduce({ ...level, clues }).solved) return null;
  for (const cl of shuffle(pool, rng)) {
    const rest = clues.filter(x => x !== cl);
    if (rest.some(x => x.who === cl.who) && deduce({ ...level, clues: rest }).solved) clues = rest;
  }
  const most = Math.max(...peopleOf(level).map(p => clues.filter(c => c.who === p).length));
  return most <= 2 ? clues : null;
}

// The scene is the point: reward clues about its things, then the culprit rule mattering.
const scoreOf = (level, clues) => {
  const full = { ...level, clues };
  const things = clues.filter(c => c.t === 'on' || c.t === 'beside').length;
  const peers = clues.filter(c => c.t === 'above' || c.t === 'leftOf').length;
  const usesCulprit = !deduce(full, { culprit: false }).solved;
  return things * 4 - peers * 3 + (usesCulprit ? 12 : 0) + deduce(full).passes - clues.length;
};

const levels = PLANS.map((plan, index) => {
  const n = plan.zones.length;
  let best = null;
  for (let seed = 1; seed < 2500; seed++) {
    const rng = random((index + 1) * 7919 + seed * 104729);
    const level = { ...plan, suspects: shuffle(FIGURES, rng).slice(0, n - 1), clues: [] };
    const at = place(level, rng);
    if (!at) continue;
    const clues = trim(level, cluePool(level, at, !plan.guided), rng);
    if (!clues) continue;
    if (!deduce({ ...level, clues }, { culprit: true }).solved) continue;
    const score = scoreOf(level, clues);
    if (!best || score > best.score) best = { score, level: { ...level, clues } };
  }
  if (!best) throw new Error(`${plan.id}: no case found`);
  if (solutions(best.level).length !== 1) throw new Error(`${plan.id}: not unique`);
  const { level } = best;
  console.log(plan.id, `${n}x${n}`, 'clues', level.clues.length, JSON.stringify(level.clues.map(c => c.t)), 'culprit rule', !deduce(level, { culprit: false }).solved);
  return { id: level.id, suspects: level.suspects, clues: level.clues };
});
writeFileSync(new URL('../../src/jocs/games/murdoku/levels.json', import.meta.url), `${JSON.stringify(levels, null, 1)}\n`);
