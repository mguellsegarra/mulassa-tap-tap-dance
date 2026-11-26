// The tower's foot. It fades downward into the valley's colour under the hills (as Stack's tower fades into its
// ground), solid all the way: nothing shows through the stone, the shaft just ends in the valley's haze. three's fog
// re-read by height: two shader chunks set before anything compiles, so every built-in material (stone, slabs, offcuts,
// weatherings) takes that colour between two world heights with no extra pass; the heights are the foot's own, fixed,
// so the tower grows up out of it. And at the home the foot is sunk out of sight; on Juga it rises out of the haze.
// shortcut: the chunks are global to the page, fine while Tower has its own page; a shared page needs a material flag.
import { Color, Fog, SRGBColorSpace, ShaderChunk } from 'three';
import { SIZE } from './rules.js';

const FOOT_AT = [-0.2 * SIZE, -2.6 * SIZE]; // the foot, fixed in the world: whole above the first, valley below the second
const FOOT_SUNK = 2.4 * SIZE; // how far down it waits at the home: just under the haze, so its top never shows through it

// base: the foot's mesh (stone.js) → { home(on), tick(dt), risen }
export function createFoot(scene, base) {
  // the valley strip as the page shows it (carena.json groundColor under sky.js's night filter), in sRGB as the page has
  // it. near: all valley below this height; far: all stone above this one
  scene.fog = new Fog(new Color().setRGB(0.442, 0.396, 0.453, SRGBColorSpace), FOOT_AT[1], FOOT_AT[0]);
  // the vertex's world height, from its view position (the view matrix is a rotation and a move)
  ShaderChunk.fog_vertex = '#ifdef USE_FOG\n vFogDepth = dot( viewMatrix[ 1 ].xyz, mvPosition.xyz - viewMatrix[ 3 ].xyz );\n#endif';
  ShaderChunk.fog_fragment = `#ifdef USE_FOG
    gl_FragColor.rgb = mix( fogColor, gl_FragColor.rgb, smoothstep( fogNear, fogFar, vFogDepth ) );
  #endif`;
  const y = base.position.y;
  let to = 1, sunk = 1; // the home: sunk (1), risen (0), eased
  return {
    home(on) { to = on ? 1 : 0; },
    tick(dt) {
      sunk += (to - sunk) * Math.min(1, dt * (to ? 8 : 2.6)); // down at once, up out of the haze in about a second
      base.position.y = y - sunk * FOOT_SUNK;
    },
    get risen() { return sunk < 0.03; },
  };
}
