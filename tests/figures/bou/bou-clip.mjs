// The Bou's music video (src/figures/bou/bou-clip.js): every cut on a bar's downbeat, each shot at least two bars, never
// into the same kind of shot, the feet only on the opening's leg passes; and the lens follows the Bou's path, never its
// bounce (its height steady inside a shot, its turn slow), from above the crowd through a long lens.
import assert from 'node:assert/strict';
import { BOU_CLIP_CUTS as CUTS, BOU_CLIP_SHOTS as SHOTS, BOU_CLIP_END as CLIP_END, placeBouClip as placeClip } from '../../../src/figures/bou/bou-clip.js';

CUTS.forEach(([b, kind], i) => {
  const next = CUTS[i + 1]?.[0] ?? CLIP_END;
  assert.ok(SHOTS[kind], `${kind} is a shot`);
  assert.equal(b % 4, 0, `the cut at ${b} is on a bar's downbeat`);
  assert.ok(next - b >= 8, `the shot at ${b} lasts two bars or more`);
  assert.notEqual(kind, CUTS[i + 1]?.[1], `no cut into the same shot at ${next}`);
});
assert.deepEqual(CUTS.filter(c => c[1] === 'feet').map(c => c[0]), [8, 24], 'the feet only on the opening\'s two leg passes');
for (const [name, k] of Object.entries(SHOTS)) assert.ok(k.fov <= 38 && Math.min(...k.el) >= 0.2, `${name}: a long lens, not from the floor`);

const cam = { aspect: 16 / 9, fov: 0, position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, up: { set() {} }, lookAt(x, y, z) { this.at = [x, y, z]; }, clearViewOffset() {}, updateProjectionMatrix() {} };
let prev = null;
for (let b = 0; b < CLIP_END - 0.05; b += 1 / 30) { // 60 samples a second at the song's ~2 beats a second
  const i = placeClip(cam, b, -2.2), p = cam.position, d = [cam.at[0] - p.x, cam.at[1] - p.y, cam.at[2] - p.z], l = Math.hypot(...d), u = d.map(v => v / l);
  assert.ok(cam.fov <= SHOTS[CUTS[i][1]].fov + 10 + 1e-9, `beat ${b.toFixed(1)}: never a wide lens`);
  if (prev?.i === i) {
    const turn = Math.acos(Math.min(1, u[0] * prev.u[0] + u[1] * prev.u[1] + u[2] * prev.u[2])) * 60, rise = Math.abs(p.y - prev.y) * 60;
    assert.ok(turn <= 0.3, `beat ${b.toFixed(1)}: the view turns slowly (${turn.toFixed(2)} rad/s)`);
    assert.ok(rise <= 1.5, `beat ${b.toFixed(1)}: the lens does not bob (${rise.toFixed(2)} m/s)`);
  }
  prev = { i, u, y: p.y };
}
console.log('bou-clip ok');
