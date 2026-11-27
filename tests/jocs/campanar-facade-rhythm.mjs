// Campanar's facade rhythm (Marc, 27 Nov 2026: a dragon on one corner and a spout or a lantern on the other, a clock
// with an oculus glued under it, 40 m of bare wall higher up): a string course's four corners wear one piece, the same
// all round; every face piece keeps two plain floors from the next; and no run shows more than MAX_BARE floors in a row
// with nothing on the wall (string courses and arrow slits count as bare: they hardly show from afar). Over realistic
// runs played with the game's own perfect.
import assert from 'node:assert/strict';

const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : any()), apply: () => any(), set: () => true });
globalThis.document = any(); // stone.js paints its courses on canvases: none needed here
globalThis.location = { search: '' }; // stack.js reads its flag off the page's address
const { SIZE, drop } = await import('../../src/jocs/games/campanar/rules.js');
const { STACK_PERFECT } = await import('../../src/jocs/games/campanar/stack.js');
const { facade } = await import('../../src/jocs/games/campanar/facade.js');
const { ornamentSlice } = await import('../../src/jocs/games/campanar/ornaments.js');
const { upperPieceSlice } = await import('../../src/jocs/games/campanar/upper-pieces.js');

const GAP = 2, MAX_BARE = 10;

// in 3D: a string course wearing a corner piece is the same after a quarter turn round the tower's axis
const points = (r, orn) => {
  const up = upperPieceSlice(r, 0, orn), out = [];
  for (const g of [ornamentSlice(r, 0, orn), up?.lit, up?.dark].filter(Boolean)) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) out.push([p.getX(i), p.getY(i), p.getZ(i)]);
  }
  return out;
};
const key = ([x, y, z]) => [x, y, z].map(v => Math.round(v * 1e4) + 0).join(',');
for (const share of [0.7, 0.45, 0.3]) for (const piece of ['F1', 'H4', 'B5']) {
  const r = { x: 0, z: 0, w: SIZE * share, d: SIZE * share }, p = points(r, ['lesenes', 'lombard', piece]);
  assert.deepEqual(p.map(([x, y, z]) => key([-z, y, x])).sort(), p.map(key).sort(), `${piece} on a ${share} tower: the same on all four corners`);
}

// realistic runs: each drop off by a human error (some players steadier than others) that grows with the height, now and
// then a bad one, until a miss
const rng = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
function run(seed) {
  const r = rng(seed), gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const sigma = [0.03, 0.045, 0.06, 0.08][seed % 4], bad = [0.01, 0.02, 0.04, 0.06][(seed >> 2) % 4];
  let last = { x: 0, z: 0, w: SIZE, d: SIZE };
  const played = [last];
  for (let k = 1; k < 300; k++) {
    let f = gauss() * (sigma + k * 0.0002);
    if (r() < bad) f += (r() < 0.5 ? -1 : 1) * (0.08 + r() * 0.12);
    const axis = k % 2 ? 'x' : 'z', d = drop(last, last[axis] + f * SIZE, axis, SIZE * STACK_PERFECT);
    if (d.miss) break;
    played.push(last = d.placed);
  }
  return played;
}
// the face pieces, [first floor, last floor]: an opening's floors count down to -01 (facade.js motif), the clock with its
// arches, a filler, a piece on the wall (the floors it hangs over)
const FACE = /\/(mainell|espitllera|ocul|rosassa|escala|candela|lluna|rellotge3?|serra)/, WALL = { H1: 3, H3: 2 };
function pieces(courses) {
  const out = [];
  courses.forEach((c, i) => {
    const wall = c.orn?.find(o => WALL[o]), last = out.at(-1);
    if (wall) return out.push({ lo: i, hi: i + WALL[wall] - 1 });
    if (c.key === 'A/arquets' && last?.hi === i - 1) return (last.hi = i);
    if (!FACE.test(c.key)) return;
    const [, stem, n] = /^(.*?)(?:-0(\d))?$/.exec(c.key);
    if (n && last?.stem === stem && last.n === +n + 1 && last.hi === i - 1) Object.assign(last, { hi: i, n: +n });
    else out.push({ lo: i, hi: i, stem, n: +n });
  });
  return out;
}
let longest = 0, tall = 0;
for (let seed = 1; seed <= 400; seed++) {
  const played = run(seed), f = facade(played), c = f.courses;
  tall = Math.max(tall, played.length);
  c.forEach((x, i) => {
    const corners = (x.orn ?? []).filter(o => o === 'F1' || o === 'H4' || o === 'B5');
    assert(corners.length <= 1, `run ${seed}, floor ${i}: one piece on its corners (${corners})`);
  });
  const ps = pieces(c);
  ps.slice(1).forEach((p, k) => assert(p.lo - ps[k].hi - 1 >= GAP, `run ${seed}: floors ${ps[k].lo}-${ps[k].hi} and ${p.lo}-${p.hi}, ${GAP} plain floors between`));
  // bare floors over the imposta and under the bell chamber (an arrow slit is bare)
  const piece = new Set(ps.filter(p => !/espitllera/.test(p.stem)).flatMap(p => Array.from({ length: p.hi - p.lo + 1 }, (_, j) => p.lo + j)));
  let bare = 0;
  for (let i = c.findIndex(x => x.key === 'A/imposta') + 1; i < f.cap - 4; i++) {
    bare = piece.has(i) ? 0 : bare + 1;
    assert(bare <= MAX_BARE, `run ${seed}: more than ${MAX_BARE} bare floors in a row up to floor ${i}`);
    longest = Math.max(longest, bare);
  }
}
assert(tall > 150, `some runs reach the upper stretch (${tall} floors)`);
console.log(`campanar facade rhythm: one piece on all four corners, ${GAP} plain floors between face pieces, at most ${longest} bare floors in a row over 400 runs ok`);
