// Murdoku's rules without a screen. A person is a suspect or the stolen object: every person on a free cell, one per row and
// column, and the culprit is the only suspect in the object's zone. Clues are data: { t, who, zone | thing | other }.
export const OBJECT = 'objecte';
const WALKABLE = new Set(['banc', 'cadira', 'palla', 'reclinatori']); // a figure can stand on these; the other things only take up the cell

export const peopleOf = level => [...level.suspects, OBJECT];
export const cellOf = (r, c, n) => r * n + c;
export function boardOf(level) {
  const n = level.zones.length;
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const thing = level.things[`${r},${c}`] ?? null;
    cells.push({ i: cellOf(r, c, n), r, c, zone: level.zones[r][c], thing, free: !thing || WALKABLE.has(thing) });
  }
  return { n, cells };
}

const touches = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
const ONE = {
  in: (cl, a) => a.zone === cl.zone,
  notIn: (cl, a) => a.zone !== cl.zone,
  on: (cl, a) => a.thing === cl.thing,
  beside: (cl, a, cells) => cells.some(b => b.thing === cl.thing && touches(a, b)),
};
const TWO = {
  above: (a, b) => a.r < b.r,
  leftOf: (a, b) => a.c < b.c,
  sameZone: (a, b) => a.zone === b.zone,
};
const isPair = clue => clue.t in TWO;
const holdsOne = (clue, a, cells) => ONE[clue.t](clue, a, cells);

// Who the culprit is, or null if the object's zone doesn't hold exactly one suspect.
export function culpritOf(level, at) {
  const { cells } = boardOf(level);
  const zone = cells[at[OBJECT]].zone;
  const inside = level.suspects.filter(s => cells[at[s]].zone === zone);
  return inside.length === 1 ? inside[0] : null;
}

export const lineFree = (cells, at, who, i) => Object.entries(at).every(([other, j]) => other === who
  || (cells[j].r !== cells[i].r && cells[j].c !== cells[i].c));

// Is this complete placement the case's answer? at: person → cell index.
export function isSolution(level, at) {
  const { cells } = boardOf(level);
  const people = peopleOf(level);
  if (!people.every(p => at[p] != null && cells[at[p]]?.free)) return false;
  if (!people.every(p => lineFree(cells, at, p, at[p]))) return false;
  const ok = level.clues.every(cl => isPair(cl) ? TWO[cl.t](cells[at[cl.who]], cells[at[cl.other]]) : holdsOne(cl, cells[at[cl.who]], cells));
  return ok && culpritOf(level, at) !== null;
}

// Every answer by exhaustive search, up to limit: the proof that a case has only one.
export function solutions(level, limit = 2) {
  const { cells } = boardOf(level);
  const people = peopleOf(level);
  const found = [];
  const at = {};
  const walk = k => {
    if (found.length >= limit) return;
    if (k === people.length) { if (isSolution(level, at)) found.push({ ...at }); return; }
    const who = people[k];
    const mine = level.clues.filter(cl => cl.who === who && !isPair(cl));
    for (const a of cells) {
      if (a.free && lineFree(cells, at, who, a.i) && mine.every(cl => holdsOne(cl, a, cells))) { at[who] = a.i; walk(k + 1); delete at[who]; }
    }
  };
  walk(0);
  return found;
}

// Reasoning forward only, the way a player can: if this reaches one cell per person, no guess is ever needed.
// culprit: false leaves out the culprit rule, to tell whether a case really uses it.
export function deduce(level, { culprit = true } = {}) {
  const { n, cells } = boardOf(level);
  const people = peopleOf(level);
  const can = new Map(people.map(p => [p, new Set(cells.filter(a => a.free).map(a => a.i))]));
  const keep = (who, test) => {
    let moved = false;
    for (const i of can.get(who)) if (!test(cells[i])) { can.get(who).delete(i); moved = true; }
    return moved;
  };
  for (const cl of level.clues) if (!isPair(cl)) keep(cl.who, a => holdsOne(cl, a, cells));

  const lines = key => {
    let moved = false;
    for (let line = 0; line < n; line++) {
      const able = people.filter(p => [...can.get(p)].some(i => cells[i][key] === line));
      if (able.length === 1) moved = keep(able[0], a => a[key] === line) || moved; // only one person can fill this line
    }
    for (const p of people) {
      const seen = new Set([...can.get(p)].map(i => cells[i][key]));
      if (seen.size !== 1) continue;
      const line = [...seen][0]; // p is on this line for sure, so nobody else is
      for (const q of people) if (q !== p) moved = keep(q, a => a[key] !== line) || moved;
    }
    return moved;
  };
  const pairs = () => {
    let moved = false;
    for (const cl of level.clues) {
      if (!isPair(cl)) continue;
      const other = [...can.get(cl.other)], mine = [...can.get(cl.who)];
      moved = keep(cl.who, a => other.some(j => TWO[cl.t](a, cells[j]))) || moved;
      moved = keep(cl.other, b => mine.some(i => TWO[cl.t](cells[i], b))) || moved;
    }
    return moved;
  };
  const zoneRule = () => {
    let moved = false;
    const within = zone => level.suspects.filter(s => [...can.get(s)].some(i => cells[i].zone === zone));
    const sure = zone => level.suspects.filter(s => [...can.get(s)].every(i => cells[i].zone === zone));
    moved = keep(OBJECT, a => within(a.zone).length > 0 && sure(a.zone).length < 2);
    const zones = new Set([...can.get(OBJECT)].map(i => cells[i].zone));
    if (zones.size !== 1) return moved;
    const zone = [...zones][0];
    const [only] = within(zone);
    if (within(zone).length === 1) moved = keep(only, a => a.zone === zone) || moved;
    const [fixed] = sure(zone);
    if (fixed) for (const s of level.suspects) if (s !== fixed) moved = keep(s, a => a.zone !== zone) || moved;
    return moved;
  };

  let passes = 0;
  const order = []; // who becomes certain, in the order a player can work it out
  const settle = () => { for (const p of people) if (can.get(p).size === 1 && !order.includes(p)) order.push(p); };
  settle();
  for (let moved = true; moved;) {
    passes++;
    moved = lines('r');
    settle();
    moved = lines('c') || moved;
    settle();
    moved = pairs() || moved;
    settle();
    if (culprit) moved = zoneRule() || moved;
    settle();
  }
  const solved = people.every(p => can.get(p).size === 1);
  return { solved, passes, order, at: solved ? Object.fromEntries(people.map(p => [p, [...can.get(p)][0]])) : null };
}

// What a hint says: first a piece that can't be right, otherwise the next person the clues settle, and where.
export function hintFor(level, at) {
  const { order, at: answer } = deduce(level);
  const wrong = order.find(p => at[p] != null && at[p] !== answer[p]);
  if (wrong) return { type: 'wrong', who: wrong };
  const who = order.find(p => at[p] == null);
  return who ? { type: 'next', who, cell: answer[who] } : null;
}
