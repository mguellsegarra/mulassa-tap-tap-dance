// The plaça at night, for a figure's own festa (the Bou's disco, the Drac's correfoc): the sun dims and the sky, the fog
// and the hemisphere go to a night look; and a figure's voxel material that lights itself in it.
import * as THREE from 'three';
import { scene, sun, hemi, LIGHT } from '../../scene/stage.js';
import { SKY, skyTop } from '../../scene/sky.js';

// a night look: its horizon (fog and background), sky top, hemisphere sky and ground colours, and how much of the sun goes
export const nightLook = (horizon, top, sky, ground, dim) => ({ horizon: new THREE.Color(horizon), top: new THREE.Color(top), sky: new THREE.Color(sky), ground: new THREE.Color(ground), dim });
export const NIGHT_BLUE = nightLook('#0b0d1c', '#04050c', '#1c2038', '#2a2030', 0.92);
const NIGHT_DAY = nightLook(SKY.horizon, SKY.top, LIGHT.sky, LIGHT.ground, 0);
const NIGHT_SUN = sun.intensity, NIGHT_WHITE = new THREE.Color('#ffffff');
export const NIGHT_NOW = { horizon: NIGHT_DAY.horizon.clone() }; // the horizon drawn, for effects that tint the fog over it (the Drac's red smoke)

// n 0 (day) to 1 (`look`); the clouds go dark with it (sky.js). flash 0..1: a strobe's white light over it this frame
export function plazaNight(n, look = NIGHT_BLUE, flash = 0) {
  sun.intensity = NIGHT_SUN * Math.max(1 - look.dim * n, flash);
  hemi.color.copy(NIGHT_DAY.sky).lerp(look.sky, n).lerp(NIGHT_WHITE, flash); hemi.groundColor.copy(NIGHT_DAY.ground).lerp(look.ground, n).lerp(NIGHT_WHITE, flash);
  NIGHT_NOW.horizon.copy(NIGHT_DAY.horizon).lerp(look.horizon, n);
  scene.fog.color.copy(NIGHT_NOW.horizon); scene.background.copy(NIGHT_NOW.horizon);
  skyTop.copy(NIGHT_DAY.top).lerp(look.top, n); SKY.night = n;
}

// A copy of a figure's voxel material that adds its own colours after the lights by glow.value (0-1), as if a spot were
// on it, without lighting the floor or casting anything (a real spot read badly on the Bou's tiles). key: its program's.
// spot (optional): { tint: { value: Color }, top: { value: 0-1 } }: that glow tinted, and by `top` coming from above
// (top faces full, sides at 30%: a follow spot on it, with no light added to the scene)
export function glowMaterial(base, glow, key, spot) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uFigureGlow = glow;
    let add = 'outgoingLight += diffuseColor.rgb * uFigureGlow;';
    if (spot) {
      Object.assign(sh.uniforms, { uFigureTint: spot.tint, uFigureTop: spot.top });
      add = 'outgoingLight += diffuseColor.rgb * uFigureTint * uFigureGlow * mix(1., .3 + .7 * max(dot(normal, normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz)), 0.), uFigureTop);';
    }
    sh.fragmentShader = `uniform float uFigureGlow;${spot ? ' uniform vec3 uFigureTint; uniform float uFigureTop;' : ''}\n` + sh.fragmentShader.replace('#include <opaque_fragment>', add + '\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => key;
  return m;
}
