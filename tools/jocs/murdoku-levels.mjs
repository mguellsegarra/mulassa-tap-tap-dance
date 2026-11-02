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
    for (const b of cells) if (b.thing && b.zone === a.zone && Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1) pool.push({ t: 'beside', who, thing: b.thing });
    if (relative) for (const other of peopleOf(level)) {
      if (other === who || other === OBJECT) continue;
      const o = cells[at[other]];
      if (a.r < o.r) pool.push({ t: 'above', who, other });
      if (a.c < o.c) pool.push({ t: 'leftOf', who, other });
    }
  }
  return pool.filter((cl, i) => pool.findIndex(x => JSON.stringify(x) === JSON.stringify(cl)) === i);
}

// Sound: solved at this case's tier, and one answer even if "tocant" is read with diagonals and across walls.
const sound = (level, clues, tier) => deduce({ ...level, clues }, { tier }).solved && solutions({ ...level, clues }, 2, { loose: true }).length === 1;

// Drop clues in random order while the case stays sound, down to a card per person with one or two facts, like the books.
function trim(level, pool, tier, rng) {
  let clues = shuffle(pool, rng);
  if (!sound(level, clues, tier)) return null;
  for (const cl of shuffle(pool, rng)) {
    const rest = clues.filter(x => x !== cl);
    if (rest.some(x => x.who === cl.who) && sound(level, rest, tier)) clues = rest;
  }
  const most = Math.max(...peopleOf(level).map(p => clues.filter(c => c.who === p).length));
  return most <= 2 ? clues : null;
}

// The scene is the point: reward clues about its things.
const scoreOf = clues => clues.filter(c => c.t === 'beside').length * 4 - clues.filter(c => c.t === 'above' || c.t === 'leftOf').length * 3 - clues.length;

const levels = PLANS.map((plan, index) => {
  const n = plan.zones.length;
  let best = null, kept = 0;
  for (let seed = 1; seed < 3000 && kept < 12; seed++) { // the best of a dozen: a full search takes too long on 6×6
    const rng = random((index + 1) * 7919 + seed * 104729);
    const level = { ...plan, suspects: shuffle(FIGURES, rng).slice(0, n - 1), clues: [] };
    const at = place(level, rng);
    if (!at) continue;
    const clues = trim(level, cluePool(level, at, plan.tier >= 2), plan.tier, rng);
    if (!clues) continue;
    if (plan.tier >= 2 && deduce({ ...level, clues }, { culprit: false }).solved) continue;
    kept++;
    const score = scoreOf(clues);
    if (!best || score > best.score) best = { score, level: { ...level, clues } };
  }
  if (!best) throw new Error(`${plan.id}: no case found`);
  if (solutions(best.level).length !== 1) throw new Error(`${plan.id}: not unique`);
  const { level } = best;
  console.log(plan.id, `${n}x${n}`, 'tier', plan.tier, 'clues', level.clues.length, JSON.stringify(level.clues.map(c => c.t)));
  return { id: level.id, suspects: level.suspects, clues: level.clues };
});
writeFileSync(new URL('../../src/jocs/games/murdoku/levels.json', import.meta.url), `${JSON.stringify(levels, null, 1)}\n`);
