// A figure's rotllana (its scene's `rotllana`, figure-scenes.js; the Bou's): the plaça cleared to one perfectly round ring of
// people, as in the Mulassa's music video (tools/videoclip/crowd.js on tool/videoclip-mulassa). Concentric rows, evenly
// spaced, closed all round (no corridor: the owner); the band in its front row with room round it, the moving crowd in slots
// of its first rows (away from the play camera's side, as crowd-build.js keeps them) and the backdrop's instanced figures in
// every other slot. The façades' backdrop and the mid band hide meanwhile. setRotllana is called every frame
// (stage-motion.js) and acts on a change.
import * as THREE from 'three';
import { buildBackdrop, placeBand } from './models.js';
import { plaza, renderProfile, CAM_DIR } from './stage.js';
import { crowd, placeHome, BAND_AZ } from './crowd-build.js';
// the band across the plaça from the play camera, a little off its axis (the figure would hide it): in every screen's shot,
// a phone's narrow one too (at BAND_AZ it was off a phone's frame)
const ROTLLANA_BAND_AZ = Math.atan2(CAM_DIR[2], CAM_DIR[0]) + Math.PI - 0.35;
import { activeCrowd, bandSpots, midCrowd, crowdStamp, bandLineup, refreshBandSpots } from './quality.js';

// r0: the front row (beyond the colla's ring, RING.arenaMula 6.7 m); row / step: m between rows / along one (a shirt is
// 0.46 wide; never under a mover's and a figure's footprints, RAD.adult + 0.33 + 0.04 = 0.73 m: at 0.7 they overlapped,
// shoved every frame and never rested, and separate() cost the S10 frames over 100 ms); mover: the camera's-side wedge the moving crowd leaves (crowd-build.js); band: its front row's radius, m
// between players and the room kept round each (in the ring's rows they were lost among the people: the owner); lens: the
// rows behind the first `keep` thin out within `room` m of where the play camera stands (`at` m out; play-camera.js puts
// it 13.7-15 m out): on a phone their heads filled the bottom of the shot (the owner). The first rows stay closed all round.
export const ROTLLANA = { r0: 7, row: 0.75, step: 0.75, rows: 9, moverFrom: 2.0, moverTo: 3.75, band: { r0: 7.2, gap: 1.15 }, bandRoom: 1.3, lens: { at: 14, room: 6.5, keep: 2 } };
const rotllanaLens = { x: Math.cos(Math.atan2(CAM_DIR[2], CAM_DIR[0])) * ROTLLANA.lens.at, z: Math.sin(Math.atan2(CAM_DIR[2], CAM_DIR[0])) * ROTLLANA.lens.at };
// every slot, front row first (a lower quality's count, a prefix, keeps the front rows)
const rotllanaSlots = [];
for (let k = 0; k < ROTLLANA.rows; k++) {
  const r = ROTLLANA.r0 + k * ROTLLANA.row, n = Math.round(2 * Math.PI * r / ROTLLANA.step);
  for (let i = 0; i < n; i++) {
    const a = (i + (k % 2) * 0.5) / n * 2 * Math.PI, x = Math.cos(a) * r, z = Math.sin(a) * r; // odd rows between shoulders
    if (k >= ROTLLANA.lens.keep && Math.hypot(x - rotllanaLens.x, z - rotllanaLens.z) < ROTLLANA.lens.room) continue;
    const w = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    rotllanaSlots.push({ x, z, k, mover: k < 2 && !(w > ROTLLANA.moverFrom && w < ROTLLANA.moverTo) });
  }
}
// the ring's instanced figures: the backdrop's (its material, no new shader program), as many as backdrop and mid band
export const rotllanaCrowd = plaza.backdrop ? buildBackdrop(rotllanaSlots.length, 0, [], { share: plaza.backdrop, given: rotllanaSlots.map(s => [s.x, s.z]) }) : null;
const rotllanaBase = rotllanaSlots.map((_, i) => { const m = new THREE.Matrix4(); rotllanaCrowd?.mesh.getMatrixAt(i, m); return m; }); // (hidden slots get a zero scale)
// its figures stand packed round the moving crowd's slots: they count for the hard no-overlap limit only (crowd.js steer's
// soft push wants 0.2-0.6 m of air, which no packed ring has: its neighbours shoved every frame and never rested)
if (rotllanaCrowd) { rotllanaCrowd.mesh.visible = false; rotllanaCrowd.hardOnly = true; plaza.group.add(rotllanaCrowd.mesh); }

let rotllanaOn = false, rotllanaStamp = -1;
const rotllanaHidden = new THREE.Matrix4().makeScale(0, 0, 0);
function layRotllana() {
  rotllanaStamp = crowdStamp;
  placeBand(plaza.band, renderProfile.band, ROTLLANA_BAND_AZ, bandLineup, ROTLLANA.band); refreshBandSpots();
  const byBand = s => bandSpots.some(b => Math.hypot(b.pos.x - s.x, b.pos.y - s.z) < ROTLLANA.bandRoom);
  // the moving crowd: evenly over its slots
  const movers = rotllanaSlots.filter(s => s.mover && !byBand(s)), taken = new Set(), A = activeCrowd.length;
  for (const p of crowd) p.ring = null;
  activeCrowd.forEach((p, i) => { const s = movers[Math.floor(i * movers.length / A)]; taken.add(s); p.ring = new THREE.Vector2(s.x, s.z); placeHome(p); });
  // the figures: every other slot, but where the band stands
  const { mesh } = rotllanaCrowd;
  let shown = 0;
  rotllanaSlots.forEach((s, i) => {
    const free = !taken.has(s) && !byBand(s);
    if (free) shown = i + 1;
    mesh.setMatrixAt(i, free ? rotllanaBase[i] : rotllanaHidden);
  });
  mesh.count = Math.min(shown, renderProfile.backdrop + renderProfile.mid);
  mesh.instanceMatrix.needsUpdate = true;
}
export function setRotllana(on) {
  if (!rotllanaCrowd) return;
  if (on === rotllanaOn) { if (on && crowdStamp !== rotllanaStamp) layRotllana(); return; } // (a quality change: who is in the crowd)
  rotllanaOn = on;
  rotllanaCrowd.mesh.visible = on;
  plaza.backdrop.mesh.visible = !on;
  if (midCrowd) midCrowd.mesh.visible = !on;
  if (on) layRotllana();
  else {
    for (const p of crowd) if (p.ring) { p.ring = null; placeHome(p); }
    placeBand(plaza.band, renderProfile.band, BAND_AZ, bandLineup); refreshBandSpots();
  }
}
