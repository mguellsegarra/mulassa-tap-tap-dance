// The game-over blast. Each one draws its own mix: how the wave runs through the board, how the figures go and the sparks'
// colours; audio.js draws the sound. Everything is on the sparks' pool, the board's meshes and the flash built here:
// nothing new for the GPU at the worst moment.
import { fresh } from './fresh.js';

const BLAST = .32; // how long a figure goes on once the wave reaches its cell

const TAU = Math.PI * 2;
// when each cell goes up, in seconds after the tap; d: its distance from the culprit in cells, a: its angle round it
const WAVES = [
  (d) => d * .08, // a ring
  (d, a, i, rnd) => (d ? .04 + rnd * .5 : 0), // a traca: popping in no order
  (d, a) => d * .05 + ((a / TAU + 1) % 1) * .3, // a spiral
  (d, a, dr) => dr * .11, // row by row
];
// where a figure is, k of the way through its BLAST; (ux, uz): away from the culprit; sign: its spin's way
const FLINGS = [
  (f, k, ux, uz, sign) => { f.y = k * (1.6 - k) * 6; f.rz = k * 5 * sign; f.ry = k * 4; f.sx = f.sy = 1 - k * k; }, // thrown up
  (f, k, ux, uz, sign) => { f.x = ux * k * 6; f.z = uz * k * 6; f.y = k * (1 - k) * 4; f.rz = k * 6 * sign; f.sx = f.sy = 1 - k * k; }, // blown away
  (f, k) => { // squashed, then puffed up like a balloon and popped
    if (k < .35) { const u = k / .35; f.sy = 1 - u * .55; f.sx = 1 + u * .45; } else { const u = (k - .35) / .65; f.sx = f.sy = (1 + u * .9) * (1 - u * u * u); }
  },
  (f, k) => { f.y = k * k * 12; f.ry = k * 22; f.sx = f.sy = 1 - k * k; }, // a rocket
];
const PALETTES = [
  ['#ff8a1e', '#ffe066', '#c0283c', '#fff3d6', '#3a2c22'], // fire
  ['#ff7ac6', '#5ad1ff', '#ffe066', '#7dff8a', '#fff3d6'], // confetti
  ['#f5c518', '#fff3d6', '#ffe066', '#d9a521'], // gold
  ['#ffd21e', '#d0202a'], // the senyera's
];

export function createBlast(canvas, { burst, ring, flame }, sky) {
  const flashEl = Object.assign(document.createElement('div'), { className: 'board-flash' }); // over the board, under the HUD
  canvas.after(flashEl);
  const f = { x: 0, y: 0, z: 0, ry: 0, rz: 0, sx: 1, sy: 1 };
  const nextWave = fresh(WAVES), nextFling = fresh(FLINGS), nextPalette = fresh(PALETTES); // never the last blast's
  const daylight = sky.intensity;
  let fling = FLINGS[0], palette = PALETTES[0], dirs = [], booms = [], glow = 0, at = [], first = -1, stepped = -Infinity; // booms: when each cell goes up; stepped: the last step's time

  function reset(n) {
    booms = Array(n).fill(Infinity);
    glow = 0;
    sky.intensity = daylight;
  }
  // the culprit at `o` (its screen point `s`), at board time `now`
  function start(centres, culprit, s, cols, pitch, pitchZ, now) {
    const o = centres[culprit], wave = nextWave();
    at = centres;
    first = culprit;
    stepped = -Infinity; // the frame that runs next bangs the culprit, whenever the last one ran
    fling = nextFling();
    palette = nextPalette();
    dirs = centres.map(c => { const dx = c.x - o.x, dz = c.z - o.z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; });
    booms = centres.map((c, i) => now + wave(Math.hypot((c.x - o.x) / pitch, (c.z - o.z) / pitchZ), Math.atan2(c.z - o.z, c.x - o.x), Math.abs(Math.floor(i / cols) - Math.floor(culprit / cols)), Math.random()));
    ring(o, palette, 72, 16);
    for (let k = 0; k < 28; k++) flame(o.x + (Math.random() - .5) * 1.4, .6 + Math.random(), o.z + (Math.random() - .5) * 1.4, (Math.random() - .5) * 5, 5 + Math.random() * 7, (Math.random() - .5) * 5, .9);
    flashEl.style.background = `radial-gradient(circle at ${s.x}px ${s.y}px, #fff6dcf2, #ffb04ab0 22%, #ff5a1e40 48%, #ff5a1e00 75%)`;
    flashEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2, .7, .4, 1)' });
  }
  // each cell's bang as the wave reaches it, the light flaring with it; returns the camera's kick: the shake rides the wave
  function step(now, dt) {
    let kick = 0;
    booms.forEach((b, i) => {
      if (b > now || b <= stepped) return; // each bang once: frame times don't add up exactly to now - dt
      const big = i === first;
      burst(at[i], palette, big ? 60 : 22, big ? 1.6 : 1.15);
      kick += .16;
      glow = Math.max(glow, big ? 1 : .3);
    });
    stepped = now;
    glow = Math.max(0, glow - dt * 3);
    sky.intensity = daylight + glow * 2.6;
    return kick;
  }

  // cell i's offsets, k of the way through its BLAST (one object, reused); it blackens `col` as it goes
  function place(i, k, col) {
    col.multiplyScalar(1 - k * .75);
    f.x = f.y = f.z = f.ry = f.rz = 0; f.sx = f.sy = 1;
    fling(f, k, dirs[i][0], dirs[i][1], i % 2 ? 1 : -1);
    return f;
  }
  return { reset, start, step, place, progress: (i, now) => (now - booms[i]) / BLAST };
}
