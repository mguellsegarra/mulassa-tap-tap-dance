// The plaça at night, for a figure's own festa (the Bou's disco, the Drac's correfoc): the sun dims and the sky, the fog
// and the hemisphere go to a night look; and a figure's voxel material that lights itself in it.
import * as THREE from 'three';
import { scene, sun, hemi, LIGHT } from '../../scene/stage.js';
import { SKY, skyTop } from '../../scene/sky.js';

// a night look: its horizon (fog and background), sky top, hemisphere sky and ground colours, and how much of the sun goes
export const nightLook = (horizon, top, sky, ground, dim) => ({ horizon: new THREE.Color(horizon), top: new THREE.Color(top), sky: new THREE.Color(sky), ground: new THREE.Color(ground), dim });
export const NIGHT_BLUE = nightLook('#0b0d1c', '#04050c', '#1c2038', '#2a2030', 0.92);
const NIGHT_DAY = nightLook(SKY.horizon, SKY.top, LIGHT.sky, LIGHT.ground, 0);
const NIGHT_SUN = sun.intensity;
export const NIGHT_NOW = { horizon: NIGHT_DAY.horizon.clone() }; // the horizon drawn, for effects that tint the fog over it (the Drac's red smoke)

// n 0 (day) to 1 (`look`); the clouds go dark with it (sky.js)
export function plazaNight(n, look = NIGHT_BLUE) {
  sun.intensity = NIGHT_SUN * (1 - look.dim * n);
  hemi.color.copy(NIGHT_DAY.sky).lerp(look.sky, n); hemi.groundColor.copy(NIGHT_DAY.ground).lerp(look.ground, n);
  NIGHT_NOW.horizon.copy(NIGHT_DAY.horizon).lerp(look.horizon, n);
  scene.fog.color.copy(NIGHT_NOW.horizon); scene.background.copy(NIGHT_NOW.horizon);
  skyTop.copy(NIGHT_DAY.top).lerp(look.top, n); SKY.night = n;
}

// A copy of a figure's voxel material that adds its own colours after the lights by glow.value (0-1), as if a spot were
// on it, without lighting the floor or casting anything (a real spot read badly on the Bou's tiles). key: its program's.
export function glowMaterial(base, glow, key) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uFigureGlow = glow;
    sh.fragmentShader = 'uniform float uFigureGlow;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * uFigureGlow;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => key;
  return m;
}
