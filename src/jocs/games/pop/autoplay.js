// Dev only (?autoplay): plays by itself from where the red Dracs start (a progression of BOT_FROM, rules.js g.progress), then errs on purpose to show the explosion.
export const BOT_FROM = 25;
const BOT_ERR = 60, BOT_GIVE_UP = 65, SEEN_MIN = 1, SEEN_MAX = 2.8; // under the shortest fuse (rules.js FUSES), so none burns out

const tapAfter = new Map(); // cell index: how long this Mulassa stays on show

// The cell to tap this frame, or -1.
export function botTap(g, rng = Math.random) {
  const err = (g.progress >= BOT_ERR && g.cells.find(c => c.kind === 'dracFals'))
    || (g.progress >= BOT_GIVE_UP && g.cells.find(c => c.kind === 'drac' && c.age >= 0));
  if (err) return err.i;
  const bomb = g.cells.find(c => c.kind === 'petard' && c.left < 2); // put out each petard half way down its fuse
  if (bomb) return bomb.i;
  for (const c of g.cells) {
    if (c.kind !== 'mula') { tapAfter.delete(c.i); continue; }
    if (!tapAfter.has(c.i)) tapAfter.set(c.i, SEEN_MIN + rng() * (SEEN_MAX - SEEN_MIN));
    if (c.age >= tapAfter.get(c.i)) { tapAfter.delete(c.i); return c.i; }
  }
  return -1;
}
