import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PLANS } from '../../src/jocs/games/murdoku/plans.js';
import { CASES, CLUES, FIGURE_NAMES, OBJECT_NAMES, OBJECT_SHORT, PART_NAMES, THING_NAMES } from '../../src/jocs/games/murdoku/text.js';
import { OBJECT, boardOf, culpritOf, deduce, hintFor, isSolution, peopleOf, solutions } from '../../src/jocs/games/murdoku/rules.js';

const root = new URL('../../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('src/jocs/games/murdoku/levels.json', root)));
const LEVELS = data.map(l => ({ ...PLANS.find(p => p.id === l.id), ...l }));
const picture = name => existsSync(new URL(`public/jocs/murdoku/cards/${name}`, root));

// A 3×3 of two zones, A on the top row and B below, with nothing else to narrow it down.
const tiny = clues => ({ zones: ['AAA', 'BBB', 'BBB'], parts: {}, things: {}, suspects: ['mulassa', 'drac'], object: 'clau', clues });

test('every case has exactly one answer, reached by deduction, and needs the culprit rule', () => {
  assert.equal(LEVELS.length, 10);
  for (const level of LEVELS) {
    const found = solutions(level, 2);
    assert.equal(found.length, 1, `${level.id}: ${found.length} answers`);
    const { solved, at } = deduce(level);
    assert.ok(solved, `${level.id} needs a guess`);
    assert.deepEqual(at, { ...found[0], ...at }, level.id);
    for (const p of peopleOf(level)) assert.equal(at[p], found[0][p], `${level.id}: ${p}`);
    assert.ok(culpritOf(level, at), level.id);
    assert.ok(!deduce(level, { culprit: false }).solved, `${level.id} never uses the culprit rule`);
  }
});

test('each person has one card of one or two facts, and N-1 suspects fit an N×N board', () => {
  for (const level of LEVELS) {
    assert.equal(level.suspects.length, level.zones.length - 1, level.id);
    for (const p of peopleOf(level)) {
      const facts = level.clues.filter(c => c.who === p).length;
      assert.ok(facts >= 1 && facts <= 2, `${level.id}: ${p} has ${facts}`);
    }
  }
});

test('a placement breaking the rules is not the answer', () => {
  const level = LEVELS[0];
  const { at } = deduce(level);
  assert.ok(isSolution(level, at));
  const [a, b] = peopleOf(level);
  const { n, cells } = { ...boardOf(level), n: level.zones.length };
  assert.ok(!isSolution(level, { ...at, [a]: at[b] }), 'two people on one cell');
  const sameRow = cells.find(c => c.free && c.r === cells[at[b]].r && c.i !== at[b]);
  assert.ok(!isSolution(level, { ...at, [a]: sameRow.i }), `same row of ${n}`);
  const blocked = LEVELS.flatMap(l => boardOf(l).cells.filter(c => !c.free).map(c => [l, c])).find(([l]) => l === level);
  assert.ok(!isSolution(level, { ...at, [a]: blocked[1].i }), 'on a blocked thing');
  const { [a]: _, ...partial } = at;
  assert.ok(!isSolution(level, partial), 'someone missing');
});

test('the culprit is the only suspect in the object\'s zone, or nobody', () => {
  const level = tiny([]);
  assert.equal(culpritOf(level, { mulassa: 0, drac: 4, [OBJECT]: 8 }), 'drac');
  assert.equal(culpritOf(level, { mulassa: 3, drac: 7, [OBJECT]: 2 }), null, 'alone with no suspect');
  assert.equal(culpritOf(level, { mulassa: 3, drac: 7, [OBJECT]: 1 }), null);
  assert.equal(culpritOf({ ...level, zones: ['BBB', 'BBB', 'BBB'] }, { mulassa: 0, drac: 4, [OBJECT]: 8 }), null, 'two suspects');
});

test('deduction refuses a case that needs a guess', () => {
  const level = tiny([]);
  assert.ok(solutions(level, 2).length > 1);
  assert.ok(!deduce(level).solved);
});

test('a hint names a wrong piece first, then the next settled person with its cell', () => {
  const level = LEVELS[1];
  const { at, order } = deduce(level);
  assert.deepEqual(hintFor(level, {}), { type: 'next', who: order[0], cell: at[order[0]] });
  const off = boardOf(level).cells.find(c => c.free && c.i !== at[order[1]]);
  assert.deepEqual(hintFor(level, { [order[1]]: off.i }), { type: 'wrong', who: order[1] });
  assert.equal(hintFor(level, at), null);
});

test('every name and picture a case asks for exists', () => {
  for (const level of LEVELS) {
    assert.ok(CASES[level.id]?.title && CASES[level.id].place, level.id);
    assert.ok(OBJECT_NAMES[level.object] && OBJECT_SHORT[level.object] && picture(`obj-${level.object}.png`), `object ${level.object}`);
    for (const s of level.suspects) assert.ok(FIGURE_NAMES[s] && picture(`fig-${s}.jpg`), s);
    for (const { key, floor } of Object.values(level.parts)) assert.ok(PART_NAMES[key] && picture(`floor-${floor}.jpg`), `${key} ${floor}`);
    for (const t of Object.values(level.things)) assert.ok(THING_NAMES[t] && picture(`thing-${t}.png`), t);
    for (const c of level.clues) assert.ok(CLUES[c.t], c.t);
  }
});

test('one guided case comes first, and the page is reachable but linked from nowhere', () => {
  assert.deepEqual(LEVELS.map(l => l.guided).filter(Boolean).length, 1);
  assert.ok(LEVELS[0].guided);
  const headers = readFileSync(new URL('public/_headers', root), 'utf8');
  assert.match(headers, /\/jocs\/murdoku\/\n\s+Cache-Control: no-cache/);
  assert.ok(!readFileSync(new URL('index.html', root), 'utf8').includes('murdoku'));
});
