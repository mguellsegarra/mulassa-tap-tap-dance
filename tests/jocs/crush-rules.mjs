import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, swap, findGroups, findMoves, starsFor, praiseTier, assistFor, helpFor, CARRETILLA } from '../../src/jocs/games/crush/rules.js';
import { LEVELS, SEGUICI, levelFor, MIN_ROWS, MAX_ROWS } from '../../src/jocs/games/crush/levels.js';

const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const LEVEL = { goal: 'a', n: 99, moves: 5, kinds: ['a', 'b', 'c', 'd'], stars: [2, 4] };
// A board of the given letters, replacing the random one; ids stay unique.
function withBoard(rows, level = LEVEL) {
  const g = newGame(level, seeded(7), rows[0].length, rows.length);
  let id = 1000;
  g.board = rows.map(row => [...row].map(kind => ({ id: id++, kind })));
  return g;
}
const full = g => g.board.every(row => row.every(Boolean));

test('a new board has no match ready and at least one move, at every height', () => {
  for (let rows = MIN_ROWS; rows <= MAX_ROWS; rows++) for (let s = 1; s < 40; s++) {
    const g = newGame(LEVELS[19], seeded(s), 7, rows);
    assert.equal(findGroups(g.board).length, 0);
    assert.ok(findMoves(g.board).length > 0);
  }
});

test('a swap that matches nothing goes back and costs no move', () => {
  const g = withBoard(['abcd', 'cdab', 'abcd', 'cdab']);
  const ev = swap(g, { r: 0, c: 0 }, { r: 0, c: 1 });
  assert.equal(ev.at(-1).t, 'back');
  assert.equal(g.moves, 5);
  assert.equal(g.board[0][0].kind, 'a');
});

test('a match costs a move, counts toward the goal and leaves the board full', () => {
  const g = withBoard(['bacd', 'abcd', 'adbc', 'cdab']);
  swap(g, { r: 0, c: 0 }, { r: 0, c: 1 }); // the three a's of column 0 line up
  assert.equal(g.moves, 4);
  assert.ok(g.collected >= 3);
  assert.ok(full(g));
  assert.equal(findGroups(g.board).length, 0);
});

test('only adjacent pieces swap', () => {
  const g = withBoard(['abcd', 'cdab', 'abcd', 'cdab']);
  assert.deepEqual(swap(g, { r: 0, c: 0 }, { r: 2, c: 0 }), []);
  assert.equal(g.moves, 5);
});

test('four in line leave a line special behind', () => {
  const g = withBoard(['aabacd', 'bcadbc', 'cdbcda', 'dbcdbc', 'bcdbcd']);
  const clear = swap(g, { r: 0, c: 2 }, { r: 1, c: 2 }).find(e => e.t === 'clear');
  assert.ok(clear.spawned.some(s => s.piece.special === CARRETILLA));
});

test('the goal wins and running out of moves loses', () => {
  const win = withBoard(['bacd', 'abcd', 'adbc', 'cdab'], { ...LEVEL, n: 3 });
  swap(win, { r: 0, c: 0 }, { r: 0, c: 1 });
  assert.equal(win.status, 'won');
  const lose = withBoard(['bacd', 'abcd', 'adbc', 'cdab'], { ...LEVEL, moves: 1 });
  swap(lose, { r: 0, c: 0 }, { r: 0, c: 1 });
  assert.equal(lose.status, 'lost');
});

test('stars follow the moves left', () => {
  assert.equal(starsFor({ level: LEVEL, moves: 1 }), 1);
  assert.equal(starsFor({ level: LEVEL, moves: 2 }), 2);
  assert.equal(starsFor({ level: LEVEL, moves: 4 }), 3);
});

test('every level can be played: its goal is on the board and goals grow with the rows', () => {
  for (const [i, l] of LEVELS.entries()) {
    assert.ok(l.kinds.includes(l.goal), `level ${i + 1}`);
    assert.equal(new Set(l.kinds).size, l.kinds.length);
    assert.ok(l.kinds.every(k => SEGUICI.includes(k)));
    assert.ok(l.stars[0] < l.stars[1] && l.stars[1] < l.moves);
    assert.ok(levelFor(i, MAX_ROWS).n >= levelFor(i, MIN_ROWS).n);
  }
});

test('a long chain earns one phrase, at its end, stronger as it grows', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map(praiseTier), [0, 0, 2, 2, 3, 3, 4, 4]);
  let seen = 0;
  for (let s = 1; s < 200; s++) {
    const g = newGame({ ...LEVEL, moves: 12 }, seeded(s), 7, 11), pick = seeded(s + 50);
    while (g.status === 'playing') {
      const m = findMoves(g.board), c = m[Math.floor(pick() * m.length)], ev = swap(g, c.a, c.b);
      const steps = ev.filter(e => e.t === 'clear').length, phrases = ev.filter(e => e.t === 'praise');
      assert.equal(phrases.length, steps >= 3 ? 1 : 0);
      if (phrases.length) {
        seen++;
        assert.equal(phrases[0].tier, praiseTier(steps));
        assert.ok(ev.indexOf(phrases[0]) > ev.findLastIndex(e => e.t === 'clear'));
      }
    }
  }
  assert.ok(seen > 0);
});

test('help only grows with losses, stays capped, and is off on a first try', () => {
  assert.equal(assistFor(0), 0);
  for (let l = 1; l < 50; l++) assert.ok(assistFor(l) >= assistFor(l - 1));
  assert.ok(assistFor(1000) <= .3);
});

test('help makes a level easier and never harder', () => {
  const play = help => {
    let total = 0;
    for (let s = 1; s <= 150; s++) {
      const g = newGame({ ...LEVELS[19], n: 9999, moves: 12 }, seeded(s), 7, 11, help), pick = seeded(s + 50);
      while (g.status === 'playing') {
        const m = findMoves(g.board), c = m[Math.floor(pick() * m.length)];
        swap(g, c.a, c.b);
      }
      total += g.collected;
    }
    return total;
  };
  assert.ok(play({ assist: assistFor(6) }) > play({}) * 1.1);
});

test('after two losses the richest of several boards is dealt, and it is a fair one', () => {
  const value = g => findMoves(g.board).length + g.board.flat().filter(p => p.kind === g.level.goal).length;
  let plain = 0, chosen = 0;
  for (let s = 1; s <= 200; s++) {
    const g = newGame(LEVELS[19], seeded(s), 7, 11, helpFor(2));
    assert.equal(findGroups(g.board).length, 0);
    assert.ok(findMoves(g.board).length > 0);
    chosen += value(g);
    plain += value(newGame(LEVELS[19], seeded(s), 7, 11, helpFor(1)));
  }
  assert.ok(chosen > plain * 1.1);
  assert.equal(helpFor(1).boards, 1);
});

test('three losses start the level with one carretilla, and it fires when swapped', () => {
  assert.equal(helpFor(2).gift, false);
  for (let s = 1; s <= 50; s++) {
    const g = newGame(LEVELS[0], seeded(s), 7, 8, helpFor(3)), gifts = g.board.flat().filter(p => p.special);
    assert.equal(gifts.length, 1);
    assert.equal(gifts[0].special, CARRETILLA);
    assert.ok(['row', 'col'].includes(gifts[0].dir));
    assert.equal(findGroups(g.board).length, 0);
    const r = g.board.findIndex(row => row.includes(gifts[0])), c = g.board[r].indexOf(gifts[0]);
    const to = c < 6 ? { r, c: c + 1 } : { r, c: c - 1 };
    const fired = swap(g, { r, c }, to).find(e => e.t === 'clear').fired;
    assert.ok(fired.some(f => f.special === CARRETILLA));
  }
});

test('each level keeps its goal first and never repeats a figure', () => {
  for (const l of LEVELS) {
    assert.equal(l.kinds[0], l.goal);
    assert.equal(new Set(l.kinds).size, l.kinds.length);
  }
});

test('each level keeps its goal first and never repeats a figure', () => {
  for (const l of LEVELS) {
    assert.equal(l.kinds[0], l.goal);
    assert.equal(new Set(l.kinds).size, l.kinds.length);
  }
});
