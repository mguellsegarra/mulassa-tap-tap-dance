// Applies a render-quality level to the scene (crowd rows, shadows, band, backdrop) and builds the mid crowd.
import { CALM } from '../core/env.js';
import { sessionProfile } from '../platform/render-quality.js';
import { placeBand, lineupIndexes, buildBackdrop } from './models.js';
import * as THREE from 'three';
import { renderProfile, qualityLevel, peopleLevel, renderer, sun, scene, plaza, glc, CAM_DIR, setRenderProfile } from './stage.js';
import { crowd, crowdMesh, BAND_AZ, RAD, BAND_ARC } from './crowd-build.js';
import { COLLAS } from '../figures/objects.js';

export let midCrowd = null; // the mid band (built once the play camera's direction exists, below CAM_DIR)
export let activeCrowd = [];
export let bandSpots = [];
export let crowdStamp = 0; // each change of who's in the crowd: photo-obstacles.js rebuilds its list (not a line-up's: its people aren't in it)
let bandEpoch = 0; // each setBandLineup: a fade started before it no longer writes the band
export let bandLineup = 'banda'; // who plays: the figure on show's, null in free play (setBandLineup, stage-motion.js)
// Only a live quality change animates. Startup installs its final profile under the cover.
// Keep presence separate from gameplay's p.pres; retiring people keep their pose and collision until gone.
let qualityTransition = null;
const qualityInstances = new WeakMap(), qualityMatrix = new THREE.Matrix4(), qualityVector = new THREE.Vector3();
const QUALITY_FADE = 0.4; // s: short, so nobody is seen shrinking (2 s read as people slowly deflating; one skinned mesh: no per-person fade)
// Shadow support is a shader variant in three.js. Mark receivers when switching it; otherwise a
// cached shadow program can sample the released map and darken the whole plaza, not just its shadows.
function qualityShadowMap(size) {
  const enabled = size > 0, changed = renderer.shadowMap.enabled !== enabled;
  if (changed) {
    const materials = new Set();
    scene.traverse(o => { if (o.receiveShadow && o.material) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) materials.add(m); });
    for (const m of materials) m.needsUpdate = true;
  }
  renderer.shadowMap.enabled = enabled;
  if (!enabled || sun.shadow.mapSize.x !== size) {
    sun.shadow.map?.dispose(); sun.shadow.map = null;
  }
  sun.shadow.mapSize.set(size || 512, size || 512);
}
function qualityShadows() {
  const target = renderProfile.shadow;
  if (qualityTransition) {
    if (target && !renderer.shadowMap.enabled) sun.shadow.intensity = 0;
    if (target) qualityShadowMap(target);
    qualityScaleTo(sun.shadow.intensity, target ? 1 : 0, value => { sun.shadow.intensity = value; });
    // A fading shadow must keep its live map until the last frame. Disabled profiles release it below.
  } else {
    sun.shadow.intensity = target ? 1 : 0;
    qualityShadowMap(target);
  }
}
function refreshBandSpots() {
  bandSpots = plaza.band.filter(p => p.g.scale.x).map(({ g: { position: b } }) => {
    const r = Math.hypot(b.x, b.z);
    return { pos: new THREE.Vector2(b.x * (1 - 0.25 / r), b.z * (1 - 0.25 / r)), rad: RAD.band, fixed: true, band: true };
  });
}
function refreshQualityCrowd() {
  activeCrowd = crowd.filter(p => p.g.visible);
  refreshBandSpots();
  crowdStamp++;
}
function qualityScaleTo(from, to, write) {
  if (qualityTransition && from !== to) {
    write(from); // applying a profile must not change the exposed frame
    qualityTransition.items.push(k => write(from + (to - from) * k));
  } else write(to);
}
function qualityStaticCrowd(group, count) {
  if (!group) return;
  const { mesh, n } = group, target = Math.min(n, count);
  if (!qualityTransition && !qualityInstances.has(mesh)) { mesh.count = target; return; }
  let saved = qualityInstances.get(mesh);
  if (!saved) {
    saved = { matrices: [], presence: new Float32Array(n) };
    for (let i = 0; i < n; i++) {
      mesh.getMatrixAt(i, qualityMatrix);
      saved.matrices.push(qualityMatrix.clone());
      saved.presence[i] = i < mesh.count ? 1 : 0;
    }
    qualityInstances.set(mesh, saved);
  }
  mesh.count = qualityTransition ? Math.max(mesh.count, target) : target;
  for (let i = 0; i < n; i++) qualityScaleTo(saved.presence[i], i < target ? 1 : 0, value => {
    saved.presence[i] = value;
    qualityMatrix.copy(saved.matrices[i]).scale(qualityVector.setScalar(value));
    mesh.setMatrixAt(i, qualityMatrix);
    mesh.instanceMatrix.needsUpdate = true;
  });
}
export function animateRenderQuality(dt) {
  if (!qualityTransition) return;
  qualityTransition.elapsed += Math.max(0, dt);
  const t = Math.min(1, qualityTransition.elapsed / QUALITY_FADE), k = t * t * (3 - 2 * t);
  for (const write of qualityTransition.items) write(k);
  refreshQualityCrowd(); // emerging people must already move while small, rather than snapping into place at full size
  if (t < 1) return;
  qualityTransition = null;
  qualityShadowMap(renderProfile.shadow);
  if (plaza.backdrop) plaza.backdrop.mesh.count = Math.min(plaza.backdrop.n, renderProfile.backdrop);
  if (midCrowd) midCrowd.mesh.count = Math.min(midCrowd.n, renderProfile.mid);
  for (const c of COLLAS) c.setProfile(renderProfile);
  refreshQualityCrowd(); // no further per-frame transition work, or simulation of retired spectators
}
export function applyRenderQuality({ transition = false } = {}) {
  qualityTransition = transition && !CALM.matches ? { elapsed: 0, items: [] } : null;
  setRenderProfile(sessionProfile(qualityLevel, peopleLevel));
  qualityShadows();
  crowd.forEach(p => {
    const target = p.row < renderProfile.rows && p.slot % renderProfile.stride === 0 ? 1 : 0;
    if (!qualityTransition) p.pres = 1;
    qualityScaleTo(p.qualityScale ?? (p.g.visible ? 1 : 0), target, value => {
      p.qualityScale = value; p.g.visible = value > 0;
      p.g.scale.setScalar(p.scale * (p.pres ?? 1) * value * (p.lensK ?? 1)); // (crowd.js: shrunk by a low menu lens)
    });
  });
  crowdMesh.castShadow = qualityLevel === 2; crowdMesh.receiveShadow = false;
  plaza.balcony.forEach((p, i) => qualityScaleTo(p.g.scale.x, i < renderProfile.balconies ? 1 : 0, value => p.g.scale.setScalar(value)));
  const bandScales = plaza.band.map(p => p.g.scale.x);
  const bandPositions = plaza.band.map(p => ({ position: p.g.position.clone(), yaw: p.g.rotation.y }));
  placeBand(plaza.band, renderProfile.band, BAND_AZ, bandLineup);
  plaza.band.forEach((p, i) => {
    const previous = bandPositions[i], target = p.g.position.clone(), scale = p.g.scale.x;
    const turn = Math.atan2(Math.sin(p.g.rotation.y - previous.yaw), Math.cos(p.g.rotation.y - previous.yaw));
    // (a figure change mid-fade has placed its players itself: setBandLineup)
    const epoch = bandEpoch;
    qualityScaleTo(0, 1, k => { if (epoch === bandEpoch) { p.g.position.lerpVectors(previous.position, target, k); p.g.rotation.y = previous.yaw + turn * k; } });
    qualityScaleTo(bandScales[i], scale, value => { if (epoch === bandEpoch) p.g.scale.setScalar(value); });
  });
  qualityStaticCrowd(plaza.backdrop, renderProfile.backdrop);
  qualityStaticCrowd(midCrowd, renderProfile.mid);
  for (const c of COLLAS) { // every figure's seated members (one colla is out at a time)
    const target = c.seatedCount[renderProfile.people] ?? 0, previous = c.count;
    c.setProfile(renderProfile, qualityTransition ? Math.max(previous, target) : target);
    c.members.forEach((p, i) => qualityScaleTo(i < previous ? p.g.scale.x : 0, i < target ? 1 : 0, value => p.g.scale.setScalar(value)));
  }
  refreshQualityCrowd();
  glc.dataset.quality = renderProfile.name;
}
applyRenderQuality();
// Only the figure on show's players exist for the frame: the others leave the scene (no matrix walk, no pose) and the
// crowd's index (no vertex work). Their bones stay in its skeleton, whose slots must not move.
export const crowdFullIndex = crowdMesh.geometry.index;
let crowdIndexes = null;
function showBandLineup() {
  for (const p of plaza.band) if (p.lineup === bandLineup) plaza.group.add(p.g); else p.g.removeFromParent();
  crowdMesh.geometry.setIndex(crowdIndexes.get(bandLineup));
}
// (representation.js: it draws some of these people itself, so it changes what the crowd's mesh has left)
export function setCrowdIndexBase(index) {
  crowdMesh.geometry.setIndex(index);
  crowdIndexes = lineupIndexes(crowdMesh, plaza.band);
  crowdMesh.geometry.setIndex(crowdIndexes.get(bandLineup));
}
setCrowdIndexBase(crowdFullIndex);
showBandLineup();
// The figure on show's players take the band's place at once: the indexes are ready, so no rebuild and no hitch.
// Called every frame, it acts on a change.
export function setBandLineup(lineup) {
  if (lineup === bandLineup) return;
  bandLineup = lineup; bandEpoch++;
  placeBand(plaza.band, renderProfile.band, BAND_AZ, lineup);
  showBandLineup();
  refreshBandSpots();
}
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
