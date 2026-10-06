// Applies a render-quality level to the scene (crowd rows, shadows, band, backdrop) and builds the mid crowd.
import { profileAt } from '../platform/render-quality.js';
import { placeBand, buildBackdrop } from './models.js';
import * as THREE from 'three';
import { renderProfile, qualityLevel, renderer, sun, plaza, glc, qualityStart, saveQuality, CAM_DIR, setRenderProfile } from './stage.js';
import { crowd, crowdMesh, BAND_AZ, RAD, BAND_ARC } from './crowd-build.js';

export let midCrowd = null; // the mid band (built once the play camera's direction exists, below CAM_DIR)
export let activeCrowd = [];
export let bandSpots = [];
export function applyRenderQuality() {
  setRenderProfile(profileAt(qualityLevel));
  renderer.shadowMap.enabled = renderProfile.shadow > 0;
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
  sun.shadow.mapSize.set(renderProfile.shadow || 512, renderProfile.shadow || 512);
  crowd.forEach(p => {
    p.g.visible = p.row < renderProfile.rows && p.slot % renderProfile.stride === 0;
    p.pres = 1; p.g.scale.setScalar(p.g.visible ? p.scale : 0); // the skinned crowd mesh draws everyone: hidden = zero size
  });
  // The main dancers retain detailed shadows; spectators only cast them at high quality.
  crowdMesh.castShadow = qualityLevel === 2; crowdMesh.receiveShadow = false;
  activeCrowd = crowd.filter(p => p.g.visible);
  plaza.balcony.forEach((p, i) => p.g.scale.setScalar(i < renderProfile.balconies ? 1 : 0));
  placeBand(plaza.band, renderProfile.band, BAND_AZ);
  bandSpots = plaza.band.filter(p => p.g.scale.x).map(({ g: { position: b } }) => { // fixed obstacles for the crowd
    const r = Math.hypot(b.x, b.z);
    return { pos: new THREE.Vector2(b.x * (1 - 0.25 / r), b.z * (1 - 0.25 / r)), rad: RAD.band, fixed: true, band: true };
  });
  if (plaza.backdrop) plaza.backdrop.mesh.count = Math.min(plaza.backdrop.n, renderProfile.backdrop);
  if (midCrowd) midCrowd.mesh.count = Math.min(midCrowd.n, renderProfile.mid);
  glc.dataset.quality = renderProfile.name;
}
applyRenderQuality();
// a retry one step up that holds for a minute becomes the device's level
if (qualityStart.retry) setTimeout(() => { if (qualityLevel === qualityStart.level) saveQuality(); }, 60000);
// The mid band: the backdrop's instanced figures (no bones, no CPU a frame, its material: no new shader program, one
// more draw call) filling the open ground beyond the moving ring on the far side, what every play
// shot looks across. r0..r1: beyond the ring (the moving crowd stops at `edge` there, animCrowd) and short of the
// façades; half: its arc each side of straight across; behind
// the band it starts further out. Counts: PROFILES mid.
export const MID = { r0: 9.4, r1: 12.6, half: 1.45, edge: 8.8, far: Math.atan2(-CAM_DIR[2], -CAM_DIR[0]) };
Object.assign(MID, { fx: Math.cos(MID.far), fz: Math.sin(MID.far), cos: Math.cos(MID.half + 0.15) });
if (plaza.backdrop) {
  midCrowd = buildBackdrop(renderProfile.mid, plaza.inner, plaza.props, { ring: { ...MID, avoid: [[BAND_AZ, BAND_ARC + 0.15, 11.3]] }, share: plaza.backdrop });
  midCrowd.mesh.count = Math.min(midCrowd.n, renderProfile.mid);
  plaza.group.add(midCrowd.mesh);
}
