// The rules, no drawing. A gate is [op, value]; each pair fills the street, so the crew always takes one of the two.

export const FIRST_GATE = 40, GATE_GAP = 44, RUN_OUT = 40; // metres
const CLASH_SECONDS = 2;
const HAZARD_LANE = .62, HAZARD_HALF = .34; // in street half-widths, like run.x

// Hand-made so that the right door depends on the crew at that moment: x2 is not always better than +10.
// Each street is longer and faster than the last, with a stronger rival: the plaça costs more every time.
// hazards: the lane (-1, 0, 1) of the petards after each gate pair but the last.
export const LEVELS = [
  { start: 5, rival: 0, speed: 16, hazards: [1, -1, 0, 1],
    gates: [[['+', 3], ['x', 2]], [['x', 2], ['+', 12]], [['-', 6], ['+', 4]], [['+', 6], ['-', 4]], [['+', 4], ['-', 8]]] },
  { start: 6, rival: 36, speed: 18, hazards: [-1, 1, 1, -1, 0],
    gates: [[['x', 2], ['+', 4]], [['+', 10], ['x', 2]], [['-', 10], ['-', 4]], [['x', 3], ['+', 30]], [['+', 8], ['-', 15]], [['+', 6], ['-', 12]]] },
  { start: 4, rival: 44, speed: 19, hazards: [0, -1, 1, 0, 1, -1, 0],
    gates: [[['x', 3], ['+', 10]], [['+', 10], ['x', 2]], [['-', 20], ['-', 8]], [['+', 12], ['x', 2]], [['-', 12], ['-', 25]], [['x', 2], ['+', 30]], [['+', 24], ['-', 30]], [['+', 10], ['-', 10]]] },
  { start: 3, rival: 70, speed: 20, hazards: [1, 0, -1, 1, 0, -1, 1, 0, -1],
    gates: [[['+', 5], ['x', 3]], [['x', 2], ['+', 6]], [['-', 4], ['-', 9]], [['+', 15], ['x', 2]], [['x', 2], ['+', 20]], [['-', 30], ['-', 12]], [['+', 18], ['x', 2]], [['-', 25], ['-', 40]], [['x', 2], ['+', 35]], [['+', 12], ['-', 20]]] },
  { start: 2, rival: 110, speed: 21, hazards: [0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1],
    gates: [[['x', 3], ['+', 2]], [['+', 6], ['x', 2]], [['-', 3], ['-', 7]], [['x', 2], ['+', 14]], [['+', 12], ['x', 2]], [['-', 22], ['-', 10]], [['x', 2], ['+', 25]], [['+', 30], ['x', 2]], [['-', 45], ['-', 20]], [['x', 2], ['+', 40]], [['-', 60], ['-', 35]], [['+', 15], ['-', 15]]] },
];

export const applyGate = (n, [op, v]) => (op === '+' ? n + v : op === 'x' ? n * v : Math.max(0, n - v));

const SIGN = { '+': '+', x: '×', '-': '−' };
export const gateText = ([op, v]) => SIGN[op] + v;
// null when the door takes more people than there are: "3 − 10 = 0" would teach the wrong sum.
export const equation = (n, g) => (g[0] === '-' && g[1] > n ? null : `${n} ${SIGN[g[0]]} ${g[1]} = ${applyGate(n, g)}`);
export const hazardLoss = n => Math.max(2, Math.ceil(n * .15));

// Half the crew stands in the castell, the other half holds the pinya. Below a 3 de 6 they can only raise a pilar.
// Bottom to top. A 3 de 6 is 3,3,3,2,1,1, the top three floors being the real dosos, acotxador and enxaneta.
const floorsOf = (w, n) => [...Array(n - 3).fill(w), 2, 1, 1];
const TOWERS = [6, 7, 8, 9].map(n => ({ w: 3, n, floors: floorsOf(3, n) }));
const trunk = floors => floors.reduce((a, b) => a + b, 0);
export function castellFor(people) {
  const tower = TOWERS.findLast(t => people >= trunk(t.floors) * 2);
  const n = Math.min(6, Math.max(1, people >> 1));
  const c = tower ?? { w: 1, n, floors: Array(n).fill(1) };
  return { ...c, pinya: people - trunk(c.floors) };
}

export const gateZ = i => FIRST_GATE + i * GATE_GAP;
export const LONGEST = gateZ(Math.max(...LEVELS.map(l => l.gates.length)) - 1) + RUN_OUT;
export const hazardZ = i => gateZ(i) + GATE_GAP / 2;
export const hazardX = lane => lane * HAZARD_LANE;

export function newRun(level, { on = () => {} } = {}) {
  const def = LEVELS[level];
  return { level, gates: def.gates, hazards: def.hazards, speed: def.speed, n: def.start, rival: def.rival, rivalStart: def.rival,
    x: 0, z: 0, next: 0, nextHazard: 0, on, state: 'run', hit: 0, end: gateZ(def.gates.length - 1) + RUN_OUT };
}

export function tick(r, dt) {
  if (r.state === 'run') {
    r.z += (r.speed + r.next * .8) * dt; // a little faster after each door
    if (r.next < r.gates.length && r.z >= gateZ(r.next)) {
      const i = r.next++, side = r.x < 0 ? 0 : 1, gate = r.gates[i][side], before = r.n;
      r.n = applyGate(before, gate);
      r.on('gate', { i, side, gate, text: equation(before, gate), gain: r.n > before });
    } else if (r.nextHazard < r.hazards.length && r.z >= hazardZ(r.nextHazard)) {
      const lane = r.hazards[r.nextHazard++];
      if (Math.abs(r.x - hazardX(lane)) < HAZARD_HALF) {
        const k = Math.min(r.n, hazardLoss(r.n)), before = r.n;
        r.n -= k;
        r.on('hazard', { i: r.nextHazard - 1, text: equation(before, ['-', k]) });
      }
    } else if (r.z >= r.end) {
      r.state = r.rival ? 'clash' : 'castell';
      r.on(r.state);
    }
    if (!r.n && r.state === 'run') { r.state = 'lost'; r.on('lost'); }
  } else if (r.state === 'clash') {
    // one for one, at a pace that ends in the same time whatever the size
    r.hit += dt * r.rivalStart / CLASH_SECONDS;
    const k = Math.min(Math.floor(r.hit), r.n, r.rival);
    if (k > 0) { r.hit -= k; r.n -= k; r.rival -= k; r.on('hit', k); }
    if (!r.n) { r.state = 'lost'; r.on('lost'); }
    else if (!r.rival) { r.state = 'castell'; r.on('castell'); }
  }
}
