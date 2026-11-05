// The board's tiles: one instanced box per cell and its colour each frame (checkered, lit by a fuse, frosted by the bell,
// scorched by a blast). board.js places them and owns the scene.
import * as THREE from 'three';
import { FUSE, BOMB_FUSE, SPECIAL_LIFE } from './rules.js';
import { PITCH, PITCH_Z } from './board-framing.js';

const JOINT = .06;
// The cells that light up, yellow to red as their time runs out: the traps too, so a lit cell is never a sure tap; the goodies stay on the board's own tiles.
const LIT = { mula: FUSE, petard: BOMB_FUSE, mulaFalsa: SPECIAL_LIFE, dracFals: SPECIAL_LIFE };
const ICE = [new THREE.Color('#8fb4d8'), new THREE.Color('#7ea3c9')]; // the bell's slow time: the tiles frost over, the figures keep their colours

export function createTiles(scene, cells) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(PITCH - JOINT, .16, PITCH_Z - JOINT), new THREE.MeshLambertMaterial(), cells);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  const col = new THREE.Color(), hot = new THREE.Color();
  mesh.setColorAt(0, col); // the colour attribute exists before the warm-up compiles: its shader variant is the one drawn
  let chill = 0; // 0..1: in fast, out slower
  // blastAt(i): the blast's progress on cell i, < 0 before its wave
  function paint(game, dt, blastAt) {
    chill = game.slow > 0 ? Math.min(1, chill + dt / .15) : Math.max(0, chill - dt / .6);
    game.cells.forEach((c, i) => {
      const odd = (i + Math.floor(i / game.cols)) % 2;
      col.set(odd ? '#4c4d71' : '#424363').lerp(ICE[odd], chill);
      const life = LIT[c.kind];
      if (life) col.set('#f5c518').lerp(hot.set('#ff3b2e'), 1 - c.left / life);
      const k = blastAt(i);
      if (k >= 0) col.set('#fff1c4').lerp(hot.set('#2b2233'), Math.min(1, k)); // white-hot as the wave passes, then scorched
      mesh.setColorAt(i, col);
    });
    mesh.instanceColor.needsUpdate = true;
  }
  return { mesh, paint };
}
