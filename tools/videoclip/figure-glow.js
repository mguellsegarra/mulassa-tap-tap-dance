// The Mulassa glowing, now and then: her own colours added after the lights (the game's glowMaterial in
// figures/common/night.js does the same for the Bou and the Drac; that module builds the game's stage on import, so the
// clip has its own copy). Only now and then: through the dark breaks (where she stands out the most), the hardstyle
// passage on the kick, each drop's first bar, a flash on a shout.
import * as THREE from 'three';

export function createFigureGlow(root, skip, labelOf) {
  const glow = { value: 0 }, done = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || skip?.(o) || !o.material?.isMeshLambertMaterial) return;
    let m = done.get(o.material);
    if (!m) {
      m = o.material.clone();
      m.onBeforeCompile = sh => { sh.uniforms.uGlow = glow; sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * uGlow;\n#include <opaque_fragment>'); };
      m.customProgramCacheKey = () => 'videoclip-glow';
      done.set(o.material, m);
    }
    o.material = m;
  });
  // how much she glows at t (0..1)
  function update(g, t, label, ph) {
    const sh = g.shout(t), b = g.beatAt(t), run = g.runOf(ph.index, labelOf), soft = Math.min(1, (b - run.beat) / 2, (run.end - b) / 2); // (in and out over 2 beats)
    glow.value = Math.max(
      label === 'break' || label === 'vocal' ? soft * (.45 + .15 * Math.sin(b * Math.PI / 4)) : 0,
      label === 'hard' ? .35 + .45 * g.kick(t) : 0,
      label === 'drop' && ph.beatIn < 4 ? .7 * (1 - ph.beatIn / 4) ** 2 : 0,
      sh.s < .6 ? .8 * (1 - sh.s / .6) : 0);
  }
  return { update };
}
