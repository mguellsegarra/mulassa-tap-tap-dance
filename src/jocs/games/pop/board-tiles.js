// The board's tiles: one instanced box per cell and its colour each frame (checkered, lit by a fuse, frosted by the bell,
// scorched by a blast). board.js places them and owns the scene.
import * as THREE from 'three';
import { SPECIAL_LIFE } from './rules.js';
import { PITCH, PITCH_Z } from './board-framing.js';

const JOINT = .06;
// The cells that light up, yellow to red as their time runs out: the traps too, so a lit cell is never a sure tap; the goodies stay on the board's own tiles.
// each cell's whole life: a Mulassa's own fuse (rules.js c.life, it shortens with the progression), the level's for the petard (game.bombFuse)
const LIT = { mula: (g, c) => c.life, petard: g => g.bombFuse, mulaFalsa: () => SPECIAL_LIFE, dracFals: () => SPECIAL_LIFE };
const TILE = [new THREE.Color('#424363'), new THREE.Color('#4c4d71')], LIT_FROM = new THREE.Color('#f5c518'), LIT_TO = new THREE.Color('#ff3b2e'), HOT = new THREE.Color('#fff1c4'), SCORCHED = new THREE.Color('#2b2233'); // made once: a colour parsed per cell per frame is garbage
const ICE = [new THREE.Color('#8fb4d8'), new THREE.Color('#7ea3c9')]; // the bell's slow time: the tiles frost over, the figures keep their colours

export function createTiles(scene, cells) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(PITCH - JOINT, .16, PITCH_Z - JOINT), new THREE.MeshLambertMaterial(), cells);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  const col = new THREE.Color();
  mesh.setColorAt(0, col); // the colour attribute exists before the warm-up compiles: its shader variant is the one drawn
  let chill = 0; // 0..1: in fast, out slower
  // blastAt(i): the blast's progress on cell i, < 0 before its wave
  function paint(game, dt, blastAt) {
    chill = game.slow > 0 ? Math.min(1, chill + dt / .15) : Math.max(0, chill - dt / .6);
    game.cells.forEach((c, i) => {
      const odd = (i + Math.floor(i / game.cols)) % 2;
      col.copy(TILE[odd]).lerp(ICE[odd], chill);
      const life = LIT[c.kind]?.(game, c);
      if (life) col.copy(LIT_FROM).lerp(LIT_TO, 1 - c.left / life);
      const k = blastAt(i);
      if (k >= 0) col.copy(HOT).lerp(SCORCHED, Math.min(1, k)); // white-hot as the wave passes, then scorched
      mesh.setColorAt(i, col);
    });
    mesh.instanceColor.needsUpdate = true;
  }
  return { mesh, paint };
}
