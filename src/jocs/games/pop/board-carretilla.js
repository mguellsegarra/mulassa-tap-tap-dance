// The carretilla, a correfoc: a ring of fire opens out from her cell over the board, and every Mulassa it reaches goes up.
// When each one pops and what flies meanwhile is this file's; board.js draws her until then, flow.js shows her «+1» with it.
const FIRE = ['#fff3d6', '#ffe066', '#ff8a1e', '#ff5a1e'];
const SPEED = 26; // the ring's speed, board units a second: the far corner in ~.4 s, well inside rules.js BURN

export function createCarretilla({ burst, flame }) {
  let o = null, t0 = 0, until = 0, pops = new Map(), ex = 0, ez = 0; // ex, ez: the board's half size

  // origin: the carretilla's cell; mulas: the cells going up. → each one's pop, in seconds from now
  function start(origin, mulas, centres, time) {
    o = centres[origin]; t0 = time; pops = new Map();
    ex = Math.max(...centres.map(c => Math.abs(c.x))) + .8; ez = Math.max(...centres.map(c => Math.abs(c.z))) + .8;
    for (const i of mulas) pops.set(i, { at: time + Math.hypot(o.x - centres[i].x, o.z - centres[i].z) / SPEED, popped: false });
    until = Math.max(time + Math.hypot(ex, ez) * 2 / SPEED, ...[...pops.values()].map(p => p.at));
    burst(o, FIRE, 24, 1);
    return new Map([...pops].map(([i, p]) => [i, p.at - time]));
  }

  // still to go up (board.js draws her till then)
  const waiting = (i, time) => pops.has(i) && time < pops.get(i).at;

  function step(time, centres) {
    if (!o || time > until) return; // none yet, or her ring is out
    for (const [i, p] of pops) if (!p.popped && time >= p.at) { p.popped = true; burst(centres[i], FIRE, 26, 1.1); }
    const r = (time - t0) * SPEED;
    for (let a = 0; a < 18; a++) { // the ring, on the board only
      const th = a / 18 * Math.PI * 2 + time * 3, x = o.x + Math.cos(th) * r, z = o.z + Math.sin(th) * r;
      if (Math.abs(x) < ex && Math.abs(z) < ez) flame(x, .3, z, 0, 2.5 + Math.random() * 2, 0, .35);
    }
  }
  return { start, step, waiting };
}
