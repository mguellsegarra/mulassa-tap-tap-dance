// The clip's dance: the Mulassa's own figures (figures/mulassa/mula-figures.js: runs out and back with a half turn, the
// circle, the passada, the culades with rear kicks, the charges, the spin on the spot) laid on the techno song's phrases,
// one 32-beat stretch of her dance per phrase, chosen by the section kind; a techno groove rides on top (the game's
// comic dip and waddle on every beat, a kick bounce). Each phrase starts where the last one ended (no jump at a join)
// and is drawn back towards the middle of the floor as it plays. Pure: the same t gives the same pose; yaw is
// continuous over the song (a spin adds whole turns), so the shoes never see a 2π jump.
import { planSupports } from '/src/figures/mulassa/mula-supports.js';
import { figureAt, accentAt, cheerAt } from '/src/figures/mulassa/mula-figures.js';
import { mulaComic } from '/src/figures/mulassa/mula-dance.js';
import edit from './edit.json';

const ease = x => x * x * (3 - 2 * x), DEG = Math.PI / 180;
// her dance's beats [from, to] per section kind, cycled by how many of that kind came before (to - from <= 32)
const STRETCHES = {
  intro: [[0, 16]], // her opening stance, held (the entrance walks her in: edit.json entry)
  build: [[16, 48], [48, 80]], // the runs out and back, a half turn and front up at each far end, a hop home
  break: [[80, 112], [112, 144]], // the circle round the middle; the passada right across
  vocal: [[112, 144], [80, 112]],
  drop: [[144, 176], [176, 208], [204, 236]], // eight culades with rear kicks; the charges and skids; the spin and the final hit
  hard: [[176, 208]], // the hardstyle passage: the charges and skids
  outro: [[196, 228]],
};
// the groove per kind: comic layer (dip m, waddle, nod, see-saw deg: mula-dance.js STYLE), kick bounce (m), sway (deg)
const GROOVE = {
  intro: [.02, 1, .5, 0, 0, 2], break: [.03, 1.5, 1, 0, 0, 6], vocal: [.04, 2, 1.2, 0, 0, 7],
  build: [.07, 2.5, 1.5, 1.5, .03, 3], hard: [.13, 4.5, 3, 4.5, .09, 3], drop: [.1, 3.5, 2, 3.5, .06, 4], outro: [.03, 1, .5, 0, 0, 3],
};
const PULL = .7; // share of the way back to the middle a phrase covers (her runs reach 2.3 m; the crowd stands at 5.6)

export function createClipDance(g, labelOf) {
  const label = i => labelOf(i) ?? g.phrases[i].label;
  let plan = []; // per phrase: { from, len, F0 (her pose at `from`), base (where the phrase starts) }
  const F = {}, C = {}, out0 = {};
  // where she stands at beatIn of phrase i (x, z, yaw), before the groove
  function place(i, beatIn, o) {
    const p = plan[i], b = p.from + Math.min(beatIn, p.len);
    figureAt(b, F);
    const c0 = Math.cos(p.F0.yaw), s0 = Math.sin(p.F0.yaw), dx = F.x - p.F0.x, dz = F.z - p.F0.z;
    const lx = dx * c0 - dz * s0, lz = dx * s0 + dz * c0; // her move since `from`, in her own frame then
    const c = Math.cos(p.base.yaw), s = Math.sin(p.base.yaw), k = 1 - PULL * ease(Math.min(1, beatIn / (g.phrases[i].end - g.phrases[i].beat)));
    o.x = p.base.x * k + lx * c + lz * s; o.z = p.base.z * k - lx * s + lz * c; o.yaw = p.base.yaw + F.yaw - p.F0.yaw;
    return b;
  }
  function replan() {
    const seen = {}; plan = [];
    for (const [i, ph] of g.phrases.entries()) {
      const kind = label(i), list = STRETCHES[kind] ?? STRETCHES.build, [from, to] = list[(seen[kind] = (seen[kind] ?? -1) + 1) % list.length];
      // (the phrase before is planned already: where it ends is where this one starts)
      if (i) place(i - 1, g.phrases[i - 1].end - g.phrases[i - 1].beat, out0);
      const base = i ? { x: out0.x, z: out0.z, yaw: out0.yaw } : { x: 0, z: 0, yaw: 0 };
      plan.push({ from, len: to - from, F0: figureAt(from, {}), base });
    }
    supports = planSupports((t, o) => pose(o, t), g.clip.duration - .5, 0);
  }
  const groove = (kind, o, b, t) => {
    const [dip, waddle, nod, seesaw, bounce, sway] = GROOVE[kind] ?? GROOVE.build;
    mulaComic(C, b, { dip, waddle: waddle * DEG, nod: nod * DEG, seesaw: seesaw * DEG });
    o.lift += C.lift + g.kick(t) * bounce; o.waddle += C.roll; o.pitch += C.pitch;
    o.roll += Math.sin(b * Math.PI / 4) * sway * DEG;
  };
  function pose(o, t) {
    const ph = g.phraseAt(t), kind = label(ph.index), b = g.beatAt(t);
    o.roll = o.pitch = o.lift = o.waddle = o.headRoll = o.headYaw = o.shake = o.rollAmp = o.pitchAmp = 0;
    const hb = place(ph.index, ph.beatIn, o);
    if (edit.entry && t < edit.entry.end) { // the entrance: through the crowd from behind to the middle, slowing to a stop
      const u = Math.min(1, t / edit.entry.end), k = 1 - (1 - u) ** 2;
      o.z += edit.entry.z * (1 - k);
    }
    accentAt(hb, t, o); // her own accents: front up at a far end, the rear kicks, hops, the head shake, the tremble
    groove(kind, o, b, t);
    // the first beat of a phrase blends the groove's change of kind
    if (ph.index > 0 && ph.beatIn < 1) {
      const k = 1 - ease(ph.beatIn), prev = label(ph.index - 1);
      if (prev !== kind) { const a = { lift: 0, waddle: 0, pitch: 0, roll: 0 }, n = { lift: 0, waddle: 0, pitch: 0, roll: 0 };
        groove(prev, a, b, t); groove(kind, n, b, t); for (const f in a) o[f] += (a[f] - n[f]) * k; }
    }
    const sh = g.shout(t); if (sh.s < 1.5) o.pitch -= .4 * Math.sin(Math.PI * Math.min(1, sh.s / 1.5)) ** .7; // a shout: she rears up, front high
    o.lift += Math.max(0, 1.25 * Math.sin(Math.abs(o.pitch)) - .06); // the carriers lift the shell as its front rises (mula-dance.js)
    o.headRoll = o.roll * .12 + g.snare(t) * (kind === 'drop' ? .12 : .05);
    o.drive = kind === 'drop' || kind === 'hard' ? 1 : kind === 'build' ? .8 : .5;
    o.beat = b; o.cheer = cheerAt(hb) * (hb < plan[ph.index].from + plan[ph.index].len ? 1 : 0);
    return o;
  }
  let supports = null;
  replan();
  return { pose, foot: (t, i, out) => supports.foot(t, i, out), replan };
}
