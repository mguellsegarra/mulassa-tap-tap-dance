// The Bou's festa drawn (figures/bou/bou-correfoc.js says when): in its run the TECHNO part turns the plaça to night and lights its
// tiles as a 70s disco floor, with nothing else going on; wherever the others throw confetti it lights its carretilles
// instead, the Drac's jets (common/fire.js) out of small tubes on its back that grow in and shrink away; and at the end
// its banknotes carpet the plaça (bou-bills.js). main.js calls bouFrame once a frame, after dracFrame. Pools are made
// once, nothing per frame.
import * as THREE from 'three';
import { scene, renderProfile, glc, sun, hemi, LIGHT, camera, camFocus } from '../../scene/stage.js';
import { bou, bouGlow } from './bou-objects.js';
import { PAVING } from '../../scene/models.js';
import { SKY, skyTop } from '../../scene/sky.js';
import { createFire } from '../common/fire.js';
import { setConfettiDivert, CONF_LOOK } from '../../scene/confetti.js';
import { bouBillsStart, bouBillsEnd, bouBillsClear, bouBillsFrame, loadBouBill } from './bou-bills.js';
import { M } from '../../scene/figure-springs.js';
import { G } from '../../game/state.js';
import { selectedFigure, song } from '../../game/figure-song.js';
import { BOU } from '../../game/figures.js';
import { BOU_FX, bouTechno, bouHush, bouJetsWant, bouPairBurns, bouUpBurns, bouTileLight, bouTileRing, bouTileColour } from './bou-correfoc.js';
import { beatAtTime } from '../../core/beat-grid.js';
import { CALM } from '../../core/env.js';

export const BOU_SHOW = { night: 0, hush: false, jets: 0, clock: 0, t: 0, song: 0, burstAt: Infinity }; // burstAt: the song s of the last confetti moment; clock: s since the jets lit (which tubes burn); t: the sparks' own clock; song: the song s drawn
// Its confetti: none in its run: a burst of carretilles instead (but in the first disco, which has the
// plaça to itself); the banknotes rain from the final bombo (bouFrame) and the end's throw (reason 'end', the plaça's
// «eeeh!») brings the camera down to them. Other figures, the practice and the menus throw as before.
setConfettiDivert((sec, reason) => {
  if (selectedFigure.id !== BOU.id || G.state !== 'play' || G.practice) return false;
  if (reason === 'end') { bouBillsEnd(camera, camFocus); return true; }
  if (!BOU_SHOW.hush && !G.collapseT) BOU_SHOW.burstAt = BOU_SHOW.song;
  return true;
});

// ---- Night: the sun dims, the sky and the fog go dark blue (the finale's lights own the hemisphere's intensity, fx.js)
const BOU_DAY = { horizon: new THREE.Color(SKY.horizon), top: new THREE.Color(SKY.top), sky: new THREE.Color(LIGHT.sky), ground: new THREE.Color(LIGHT.ground), sun: sun.intensity };
const BOU_DARK = { horizon: new THREE.Color('#0b0d1c'), top: new THREE.Color('#04050c'), sky: new THREE.Color('#1c2038'), ground: new THREE.Color('#2a2030') };
function bouNight(n) {
  sun.intensity = BOU_DAY.sun * (1 - 0.92 * n);
  hemi.color.copy(BOU_DAY.sky).lerp(BOU_DARK.sky, n); hemi.groundColor.copy(BOU_DAY.ground).lerp(BOU_DARK.ground, n);
  scene.fog.color.copy(BOU_DAY.horizon).lerp(BOU_DARK.horizon, n); scene.background.copy(scene.fog.color);
  skyTop.copy(BOU_DAY.top).lerp(BOU_DARK.top, n); SKY.night = n; // (the clouds go dark with it: sky.js)
}

// ---- The disco floor: one lit quad over each of the plaça's tiles (plaza.js PAVING), added light, black = unlit
const BOU_TILES = PAVING.size / PAVING.tile;
const bouFloor = new THREE.InstancedMesh(new THREE.PlaneGeometry(PAVING.tile - 0.06, PAVING.tile - 0.06).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, fog: false }), BOU_TILES * BOU_TILES);
const BOU_DISCO = BOU_FX.disco.map(c => new THREE.Color(c)), bouTint = new THREE.Color(), bouWhite = new THREE.Color('#fff8ec'), bouRingTint = new THREE.Color(), bouM4 = new THREE.Matrix4();
for (let i = 0; i < BOU_TILES; i++) for (let j = 0; j < BOU_TILES; j++) {
  const at = i * BOU_TILES + j, c = PAVING.tile / 2 - PAVING.size / 2;
  bouFloor.setMatrixAt(at, bouM4.makeTranslation(c + i * PAVING.tile, 0.004, c + j * PAVING.tile)); bouFloor.setColorAt(at, bouTint.setRGB(0, 0, 0));
}
bouFloor.visible = false; bouFloor.frustumCulled = false; bouFloor.renderOrder = 1;
scene.add(bouFloor);
function bouDisco(beat, light) {
  const c = PAVING.tile / 2 - PAVING.size / 2;
  for (let i = 0; i < BOU_TILES; i++) for (let j = 0; j < BOU_TILES; j++) {
    const d = Math.hypot(c + i * PAVING.tile - M.pos.x, c + j * PAVING.tile - M.pos.y), at = i * BOU_TILES + j;
    const ring = bouTileRing(beat, d); // the ring whitens whatever the tile shows, lit or not
    bouFloor.setColorAt(at, bouTint.copy(BOU_DISCO[bouTileColour(i, j, BOU_TILES, beat)]).multiplyScalar(bouTileLight(i, j, beat, d) * (1 - ring)).add(bouRingTint.copy(bouWhite).multiplyScalar(0.65 * ring)).multiplyScalar(light));
  }
  bouFloor.instanceColor.needsUpdate = true;
}

// ---- The Bou stays lit in the dark (stage.js bouGlow: its own colours, no light on the floor, no shadow)
// and casts no shadow on the disco: its meshes leave the sun's shadow map (a flag on the meshes: no program changes)
const BOU_CASTS = [];
let bouShadowless = false;
function bouLight(n) {
  bouGlow.value = BOU_FX.glow * n;
  if (!bou || n > 0.5 === bouShadowless) return;
  bouShadowless = n > 0.5;
  if (!BOU_CASTS.length) bou.frame.traverse(o => o.isMesh && o.castShadow && BOU_CASTS.push(o));
  for (const o of BOU_CASTS) o.castShadow = !bouShadowless;
}

// ---- The carretilles: the Drac's jets, its own pool; five burn at once (two pairs and an up tube), longer and flatter
const bouFire = createFire(scene, { jets: renderProfile.jets ?? 0, calm: CALM, grain: BOU_FX.grain }); // thicker sparks than the Drac's (thin by day)
const BOU_E = new Float32Array(40), BOU_GROW = new Float32Array(15), bouP = new THREE.Vector3(), bouD = new THREE.Vector3(), bouQ = new THREE.Quaternion();
const BOU_JET_NOZZLE = 0.19, BOU_JET_REACH = 0.27 * 2 * 2; // (common/fire.js: the jets' speed goes with the root of this)
const bouBurns = (i, c) => i < 12 ? bouPairBurns(c, i >> 1) : bouUpBurns(c, i - 12);
let bouLit = false;

// once a frame; t: the song time drawn
export function bouFrame(dt, t) {
  const mine = selectedFigure.id === BOU.id;
  CONF_LOOK.bills = mine;
  const run = mine && G.state === 'play' && !G.practice && !!bou?.frame.visible;
  const techno = run && bouTechno(t);
  BOU_SHOW.hush = run && bouHush(t);
  // night and the floor
  const was = BOU_SHOW.night;
  BOU_SHOW.night += ((techno ? 1 : 0) - was) * (1 - Math.exp(-dt / BOU_FX.night));
  if (!run && BOU_SHOW.night < 0.01) BOU_SHOW.night = 0;
  if (BOU_SHOW.night || was) { bouNight(BOU_SHOW.night); bouLight(BOU_SHOW.night); }
  bouFloor.visible = BOU_SHOW.night > 0.01;
  if (bouFloor.visible) bouDisco(beatAtTime(song.beats, t), BOU_SHOW.night);
  // the banknotes: from the final bombo, out through its results, gone with the next game (a song that starts again) or the menu
  if (mine) loadBouBill();
  if (!mine || G.state !== 'play' && G.state !== 'results' || G.state === 'play' && t < song.finale - 0.5) bouBillsClear();
  else if (run && t >= song.finale && !G.collapseT) bouBillsStart(t, song.end, camera); // the bombo: it rains money
  bouBillsFrame(dt);
  // the jets: a burst wherever the confetti would have flown; eased in and out like the Drac's, never in the first disco
  BOU_SHOW.song = t;
  if (!run) BOU_SHOW.burstAt = Infinity;
  const want = run && !BOU_SHOW.hush && !G.collapseT && bouJetsWant(t, BOU_SHOW.burstAt);
  BOU_SHOW.jets = Math.max(0, Math.min(1, BOU_SHOW.jets + (want ? dt : -dt) / 0.3));
  if (!BOU_SHOW.jets && !bouLit) return;
  if (!bou) return;
  BOU_SHOW.clock = BOU_SHOW.jets ? BOU_SHOW.clock + dt : 0; BOU_SHOW.t += dt;
  let slot = 0, live = false;
  BOU_E.fill(0);
  for (let i = 0; i < bou.fire.length; i++) {
    const tube = bou.fire[i], on = BOU_SHOW.jets > 0 && bouBurns(i, BOU_SHOW.clock);
    BOU_GROW[i] += ((on ? 1 : 0) - BOU_GROW[i]) * (1 - Math.exp(-dt / BOU_FX.grow));
    if (BOU_GROW[i] < 0.01) BOU_GROW[i] = 0;
    tube.visible = BOU_GROW[i] > 0; tube.scale.setScalar(BOU_GROW[i] || 1);
    live ||= tube.visible;
    if (!on || BOU_GROW[i] < 0.9 || slot >= 5) continue;
    tube.getWorldPosition(bouP); tube.getWorldQuaternion(bouQ); bouD.set(0, 0, 1).applyQuaternion(bouQ); bouP.addScaledVector(bouD, BOU_JET_NOZZLE);
    const o = slot++ * 8;
    BOU_E[o] = bouP.x; BOU_E[o + 1] = bouP.y; BOU_E[o + 2] = bouP.z; BOU_E[o + 3] = bouD.x; BOU_E[o + 4] = bouD.y; BOU_E[o + 5] = bouD.z;
    BOU_E[o + 6] = BOU_SHOW.jets * BOU_FX.dense; BOU_E[o + 7] = BOU_JET_REACH;
  }
  bouFire.cap(renderProfile.jets ?? 0);
  bouFire.update(dt, BOU_SHOW.t, BOU_E, glc.height);
  bouLit = live || !bouFire.idle;
  if (!bouLit) bouFire.clear();
}
