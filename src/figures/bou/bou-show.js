// The Bou's festa drawn (figures/bou/bou-correfoc.js says when): in its run the TECHNO part turns the plaça to night and lights its
// tiles softly yellow (the final keeps its multicolour disco), with nothing else going on; wherever the others throw confetti it lights its carretilles
// instead, the Drac's jets (common/fire.js) out of small tubes on its back (on its head while it is carried) that grow in and shrink away; and at the end
// its banknotes carpet the plaça (bou-bills.js). main.js calls bouFrame once a frame, after dracFrame. Pools are made
// once, nothing per frame.
import * as THREE from 'three';
import { scene, renderProfile, glc, camera, camFocus } from '../../scene/stage.js';
import { bou, bouGlow, bouSpot } from './bou-objects.js';
import { PAVING } from '../../scene/models.js';
import { plazaNight, nightLook } from '../common/night.js';
import { setFinaleDim, setFinaleCalm } from '../../scene/fx.js';
import { bouRave, bouFollowSpot } from './bou-rave.js';
import { createFire } from '../common/fire.js';
import { setConfettiDivert, CONF_LOOK } from '../../scene/confetti.js';
import { bouBillsStart, bouBillsEnd, bouBillsClear, bouBillsFrame, loadBouBill, BOU_FINALE } from './bou-bills.js';
import { M } from '../../scene/figure-springs.js';
import { G } from '../../game/state.js';
import { selectedFigure, song } from '../../game/figure-song.js';
import { BOU } from '../../game/figures.js';
import { BOU_FX, bouTechno, bouHush, bouJetsWant, bouCarried, bouTubeBurns, bouTileLight, bouTileRing, bouTileColour, bouStrobe } from './bou-correfoc.js';
import { beatAtTime, timeAtBeat } from '../../core/beat-grid.js';
import { CALM } from '../../core/env.js';

export const BOU_SHOW = { night: 0, hush: false, jets: 0, t: 0, song: 0, burstAt: Infinity }; // burstAt: the song s of the last confetti moment; t: the sparks' own clock; song: the song s drawn
// Its confetti: none in its run: a burst of carretilles instead (but in the first disco, which has the
// plaça to itself); the banknotes rain from the final bombo (bouFrame) and the end's throw (reason 'end', the plaça's
// «eeeh!») brings the camera down to them. Other figures, the practice and the menus throw as before.
setConfettiDivert((sec, reason) => {
  if (selectedFigure.id !== BOU.id || G.state !== 'play' || G.practice) return false;
  if (reason === 'end') { bouBillsEnd(camera, camFocus); return true; }
  if (!BOU_SHOW.hush && !G.collapseT) BOU_SHOW.burstAt = BOU_SHOW.song;
  return true;
});

// ---- The disco floor: one lit quad over each of the plaça's tiles (plaza.js PAVING), added light, black = unlit
const BOU_TILES = PAVING.size / PAVING.tile;
const bouFloor = new THREE.InstancedMesh(new THREE.PlaneGeometry(PAVING.tile - 0.06, PAVING.tile - 0.06).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, fog: false }), BOU_TILES * BOU_TILES);
const BOU_DISCO = BOU_FX.disco.map(c => new THREE.Color(c)), BOU_GLASS = new THREE.Color(BOU_FX.glass), bouTint = new THREE.Color(), bouWhite = new THREE.Color('#fff8ec'), bouRingTint = new THREE.Color(), bouM4 = new THREE.Matrix4();
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
    bouFloor.setColorAt(at, bouTint.copy(BOU_DISCO[bouTileColour(i, j, BOU_TILES, beat)]).multiplyScalar(bouTileLight(i, j, beat, d) * (1 - ring)).add(bouRingTint.copy(bouWhite).multiplyScalar(0.65 * ring)).add(BOU_GLASS).multiplyScalar(light));
  }
  bouFloor.instanceColor.needsUpdate = true;
}

// ---- The Bou stays lit in the dark (stage.js bouGlow: its own colours, no light on the floor, no shadow)
// and casts no shadow on the disco: its meshes leave the sun's shadow map (a flag on the meshes: no program changes)
const BOU_DARK = nightLook('#040509', '#010104', '#0a0c18', '#0c0a10', 0.985); // darker than the Drac's night: the lights are the show
const BOU_PLAIN = new THREE.Color('#ffffff'), BOU_SPOT = new THREE.Color(BOU_FX.strobe.spot);
const BOU_CASTS = [];
let bouShadowless = false;
function bouLight(n, final) {
  bouGlow.value = (final ? BOU_FX.glow : BOU_FX.strobe.glow) * n;
  bouSpot.top.value = final ? 0 : 1; bouSpot.tint.value.copy(final ? BOU_PLAIN : BOU_SPOT);
  if (!bou || n > 0.5 === bouShadowless) return;
  bouShadowless = n > 0.5;
  if (!BOU_CASTS.length) bou.frame.traverse(o => o.isMesh && o.castShadow && BOU_CASTS.push(o));
  for (const o of BOU_CASTS) o.castShadow = !bouShadowless;
}

// ---- The carretilles: the Drac's jets, its own pool; five burn at once (two pairs and an up tube), longer and flatter
const bouFire = createFire(scene, { jets: renderProfile.jets ?? 0, calm: CALM, grain: BOU_FX.grain }); // thicker sparks than the Drac's (thin by day)
const BOU_E = new Float32Array(40), BOU_GROW = new Float32Array(10), BOU_LIT = new Uint8Array(10),
  bouP = new THREE.Vector3(), bouD = new THREE.Vector3(), bouQ = new THREE.Quaternion();
const BOU_JET_REACH = 0.27 * 2 * 2; // (common/fire.js: the jets' speed goes with the root of this)
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
  const rain = t >= song.finale; // the banknotes: the disco off, a warm spot on the Bou and the rain (also as the night fades after the song: with techno the disco and its lasers flashed back on)
  BOU_SHOW.night += ((techno ? rain ? BOU_FX.rainNight : 1 : 0) - was) * (1 - Math.exp(-dt / BOU_FX.night));
  if (!run && BOU_SHOW.night < 0.01) BOU_SHOW.night = 0;
  const beat = BOU_SHOW.night || was ? beatAtTime(song.beats, t) : 0, b = Math.floor(beat), final = t >= BOU_FX.finalStart;
  const flash = BOU_SHOW.hush && !CALM.matches ? bouStrobe(t - timeAtBeat(song.beats, b), timeAtBeat(song.beats, b + 1) - timeAtBeat(song.beats, b)) : 0;
  if (BOU_SHOW.night || was) { plazaNight(BOU_SHOW.night, BOU_DARK, flash); bouLight(BOU_SHOW.night, final && !rain); setFinaleDim(BOU_SHOW.night); } // (the finale's lights, scene/fx.js, kept low in its dark: the rain)
  bouFloor.visible = BOU_SHOW.night > 0.01 && final && !rain; // the first techno's floor stays dark: the strobe is its light
  if (bouFloor.visible) bouDisco(beat, BOU_SHOW.night);
  const raveN = final && !rain ? BOU_SHOW.night : 0;
  bouRave(raveN, t, beat, beatAtTime(song.beats, BOU_FX.finalStart), M.pos.x, M.pos.y, BOU_DISCO[b % BOU_DISCO.length], t - BOU_FX.co2);
  bouFollowSpot(final && !rain ? 0 : BOU_SHOW.night, M.pos.x, M.pos.y, rain ? 1.8 : 1); // the first techno and the rain: the follow spot
  // the banknotes: from the final bombo, out through its results, gone with the next game (a song that starts again) or the menu
  if (mine) loadBouBill();
  if (!mine || G.state !== 'play' && G.state !== 'results' || G.state === 'play' && t < song.finale - 0.5) bouBillsClear();
  else if (run && t >= song.finale && !G.collapseT) bouBillsStart(t, song.end, camera); // the bombo: it rains money
  bouBillsFrame(dt);
  setFinaleCalm(BOU_FINALE.k); // the crane down to the notes: the finale's lights ease to the day's (fx.js)
  // the jets: a burst wherever the confetti would have flown; eased in and out like the Drac's, never in the first disco
  BOU_SHOW.song = t;
  if (!run) BOU_SHOW.burstAt = Infinity;
  const want = run && !BOU_SHOW.hush && !G.collapseT && t < song.finale && bouJetsWant(t, BOU_SHOW.burstAt); // (none while the banknotes rain)
  BOU_SHOW.jets = Math.max(0, Math.min(1, BOU_SHOW.jets + (want ? dt : -dt) / 0.3));
  if (!BOU_SHOW.jets && !bouLit) return;
  if (!bou) return;
  BOU_SHOW.t += dt;
  let lit = 0, live = false;
  const carried = bouCarried(t);
  for (let i = 0; i < bou.fire.length; i++) {
    const tube = bou.fire[i], on = BOU_SHOW.jets > 0 && bouTubeBurns(i, carried);
    BOU_GROW[i] += ((on ? 1 : 0) - BOU_GROW[i]) * (1 - Math.exp(-dt / BOU_FX.grow));
    if (BOU_GROW[i] < 0.01) BOU_GROW[i] = 0;
    tube.visible = BOU_GROW[i] > 0; tube.scale.setScalar(BOU_GROW[i] || 1);
    live ||= tube.visible;
    if (on && BOU_GROW[i] >= 0.9) BOU_LIT[lit++] = i;
  }
  if (bou.cap?.jaw) bou.cap.jaw.userData.bite = Math.min(1, 2 * BOU_GROW[BOU_FX.back + 2]); // its lips hold the tube in its mouth (bou-heads.js; set before the tube is full size)
  // common/fire.js draws five jets a call: more tubes burning take turns within the frame, sharing the same sparks
  // (each jet thinner, the pool and its cost the same)
  const calls = Math.max(1, Math.ceil(lit / 5)), level = BOU_SHOW.jets * BOU_FX.dense * calls * 5 / Math.max(5, lit);
  bouFire.cap(renderProfile.jets ?? 0);
  for (let c = 0; c < calls; c++) {
    BOU_E.fill(0);
    for (let s = 0; s < 5 && c * 5 + s < lit; s++) {
      const tube = bou.fire[BOU_LIT[c * 5 + s]], o = s * 8;
      tube.getWorldPosition(bouP); tube.getWorldQuaternion(bouQ); bouD.set(0, 0, 1).applyQuaternion(bouQ); bouP.addScaledVector(bouD, bou.fire.nozzle);
      BOU_E[o] = bouP.x; BOU_E[o + 1] = bouP.y; BOU_E[o + 2] = bouP.z; BOU_E[o + 3] = bouD.x; BOU_E[o + 4] = bouD.y; BOU_E[o + 5] = bouD.z;
      BOU_E[o + 6] = level; BOU_E[o + 7] = BOU_JET_REACH;
    }
    bouFire.update(dt / calls, BOU_SHOW.t, BOU_E, glc.height);
  }
  bouLit = live || !bouFire.idle;
  if (!bouLit) bouFire.clear();
}
