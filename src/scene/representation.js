// The plaça's people with approved age/gender weights; ?representation=examples retains the earlier fixed set.
import * as THREE from 'three';
import { Q } from '../core/flags.js';
import { scene, renderer, camera, plaza, renderProfile, setQualityLevel } from './stage.js';
import { mulaColla } from '../figures/mulassa/mula-objects.js';
import { crowd, crowdMesh, RING } from './crowd-build.js';
import { applyRenderQuality } from './quality.js';
import { clock, G, drawT } from '../game/state.js';
import { mood } from './crowd-mood.js';
import { skinCrowd, BAND_LOOKS } from './models.js';
import { CATALOGUE, catalogueSpec, buildFigure } from './representation/models.js';
import { MAT, EYE_COLOURS } from './representation/kit.js';
import { crowdMotion, animatePerson } from './representation/live-pose.js';
import { MUSICIANS, reviewMusician, reviewAttendant, linkRolePose, followRolePose } from './representation/role-models.js';
import { buildPublicSpecs, PUBLIC_GENDER_WEIGHTS, PUBLIC_AGE_WEIGHTS } from './representation/population.js';
import { sootLink, sootHold, sootHoldApply } from '../figures/drac/drac-soot.js';

const PUBLIC_IDS = ['p04', 'p05', 'p08', 'p02', 'p09', 'p12', 'p06', 'p10'];
// Remove only the triangles owned by a replaced person's bones, preserving all the other geometry and rigs.
function omitPeople(mesh, people) {
  const original = mesh.geometry.index, index = [], ids = new Set();
  for (const p of people) for (const b of p.bones ?? [p.torso, ...p.legs, ...p.arms]) ids.add(mesh.skeleton.bones.indexOf(b));
  const skin = mesh.geometry.attributes.skinIndex;
  for (let i = 0; i < original.count; i += 3) {
    if (!ids.has(skin.getX(original.getX(i)))) index.push(original.getX(i), original.getX(i + 1), original.getX(i + 2));
  }
  mesh.geometry.setIndex(index);
  const filtered = mesh.geometry.index;
  // The omitted people's bones drive no triangle any more: the skeleton uploads only the others' (the whole public, on
  // the crowd's mesh: its 464 bones a frame for nothing).
  const skeleton = mesh.skeleton, fullUpdate = skeleton.update, kept = skeleton.bones.map((_, i) => i).filter(i => !ids.has(i));
  function keptUpdate() {
    for (const i of kept) { boneOffset.multiplyMatrices(this.bones[i]?.matrixWorld ?? BONE_IDENTITY, this.boneInverses[i]); boneOffset.toArray(this.boneMatrices, i * 16); }
    if (this.boneTexture !== null) this.boneTexture.needsUpdate = true;
  }
  skeleton.update = keptUpdate;
  return (enabled = false) => { mesh.geometry.setIndex(enabled ? filtered : original); skeleton.update = enabled ? keptUpdate : fullUpdate; };
}
const boneOffset = new THREE.Matrix4(), BONE_IDENTITY = new THREE.Matrix4();
// The represented public's own rigs keep walking and steering (their g: drawn people follow it), but their limbs are
// drawn by nobody: they skip the matrix walk until the representation is switched off.
function quietLimbs(people) {
  const limbs = people.flatMap(p => [p.torso, ...(p.legs ?? [])]).filter(Boolean), skip = () => {};
  const set = on => { for (const o of limbs) if (on) o.updateMatrixWorld = skip; else delete o.updateMatrixWorld; };
  set(true);
  return set;
}
function shown(g) { for (let o = g; o; o = o.parent) if (!o.visible) return false; return true; }

export function setupRepresentation() {
  if (window.__representation) return window.__representation;
  const entries = [], restore = [], oldBefore = scene.onBeforeRender;
  const params = Q, population = params.get('representation') !== 'examples';
  const rawSeed = params.get('representationSeed'), seed = rawSeed == null ? 20261020 : Number(rawSeed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Invalid representationSeed');
  const eligible = crowd.filter(p => population || (p.row === 0 && p.slot % 2 === 0 && !p.rider))
    .sort((a, b) => Math.abs(Math.atan2(Math.sin(a.ang), Math.cos(a.ang))) - Math.abs(Math.atan2(Math.sin(b.ang), Math.cos(b.ang))));
  const specs = population ? buildPublicSpecs(eligible, CATALOGUE, seed) : PUBLIC_IDS.slice(0, eligible.length).map(catalogueSpec);
  specs.forEach((spec, i) => {
    const source = eligible[i], id = spec.id, p = buildFigure(spec), oldRad = source.rad, oldKid = source.kid, oldComfort = source.comfort;
    source.rad = Math.max(p.rad, 0.46) * p.g.scale.x;
    source.kid = spec.age === 'infant';
    source.comfort += (Number(source.kid) - Number(oldKid)) * RING.kid;
    const oldAvoidKnock = source.avoidKnock;
    source.avoidKnock = !!spec.mobility;
    entries.push({ role: 'public', id, spec, source, p, size: p.g.scale.x, oldSize: source.scale, oldRad, oldKid, oldComfort, oldAvoidKnock,
      motion: crowdMotion(p, source) });
  });
  for (const lineup of Object.keys(BAND_LOOKS)) plaza.band.filter(m => m.lineup === lineup).slice(0, MUSICIANS[lineup].length).forEach((source, i) => {
    const spec = MUSICIANS[lineup][i], p = reviewMusician(spec, source.kind, BAND_LOOKS[lineup]);
    entries.push({ role: 'music', id: lineup === 'banda' ? spec.id : `${lineup}-${spec.id}`, spec, source, p, size: 1, oldSize: 1, poseLinks: linkRolePose(p, source) });
  });
  if (mulaColla) ['p11', 'p03'].forEach((id, i) => {
    const source = mulaColla.crew[i], p = reviewAttendant(catalogueSpec(id), i);
    entries.push({ role: 'acompanyant', id, source, p, size: 1, oldSize: 1, poseLinks: linkRolePose(p, source) });
  });
  restore.push(omitPeople(crowdMesh, entries.filter(e => e.role !== 'acompanyant').map(e => e.source)));
  restore.push(quietLimbs(entries.filter(e => e.role === 'public').map(e => e.source)));
  if (mulaColla) {
    const mesh = mulaColla.helpers.children.find(o => o.isSkinnedMesh);
    restore.push(omitPeople(mesh, entries.filter(e => e.role === 'acompanyant').map(e => e.source)));
  }
  for (const e of entries) e.source.g.parent.add(e.p.g);
  const mesh = skinCrowd(entries.map(e => e.p), MAT);
  mesh.material = sootLink(mesh, entries.map(e => [e.p, e.source]), EYE_COLOURS); // free mode's fire chars them with the person they draw
  scene.add(mesh);
  let enabled = true, lastTime = clock;
  function update() {
    if (!enabled) return;
    const t = clock;
    const dt = Math.max(0, t - lastTime); lastTime = t;
    for (const e of entries) {
      const { source: s, p } = e;
      const scale = shown(s.g) ? s.g.scale.x / e.oldSize * e.size : 0, held = sootHold(p, s);
      p.g.scale.setScalar(scale || e.size); // contact solvers must never divide by a hidden figure's zero scale
      if (e.role === 'public') {
        // the Bou's conga (bou-parade.js, crowd.js): a bar both arms up waving, a bar clapping, hopping on the beat as it runs
        const cg = s.conga || 0, clap = mood.clapK * (1 - mood.calmK), festa = mood.festK;
        animatePerson(p, s, e.motion, cg ? { dt, time: t, clap: s.congaUp ? clap : Math.max(clap, cg), festa: s.congaUp ? Math.max(festa, cg) : festa * (1 - cg), upper: cg }
          : { dt, time: t, clap, festa });
      } else followRolePose(e.poseLinks, dt);
      if (held) sootHoldApply(p, held); // charred: limbs held as they were
      const y = p.g.position.y;
      p.g.position.copy(s.g.position); p.g.rotation.copy(s.g.rotation);
      // Standing people follow the simulation's fall. Mobility variants evade the impact in the simulation itself.
      if (e.role === 'public') {
        if (s.avoidKnock) p.g.rotation.x = p.g.rotation.z = 0;
        p.g.position.y = (p.hop ? y + 0.15 * (s.fall || 0) : 0) + (s.conga ? s.congaHop || 0 : 0);
      }
      p.g.scale.setScalar(scale);
      p.g.updateWorldMatrix(true, true);
    }
    mesh.castShadow = renderer.shadowMap.enabled;
  }
  scene.onBeforeRender = function (...args) { oldBefore.apply(this, args); update(); };
  const ray = new THREE.Raycaster(), pt = new THREE.Vector3(), world = new THREE.Vector3();
  const api = {
    entries, mesh, population, seed,
    enable(on = true) { enabled = on; restore.forEach(f => f(on)); mesh.visible = on; update(); },
    quality(level, transition = false) { setQualityLevel(level); applyRenderQuality({ transition }); update(); return renderProfile.name; },
    report() {
      scene.updateMatrixWorld(true); update(); camera.updateMatrixWorld();
      const occluders = [];
      scene.traverseVisible(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) occluders.push(o); });
      return { population, seed, targets: population ? { gender: PUBLIC_GENDER_WEIGHTS, age: PUBLIC_AGE_WEIGHTS } : null, quality: renderProfile.name, state: G.state, songTime: drawT, clock, camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov }, calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles, geometryBytes: Object.values(mesh.geometry.attributes).reduce((n, a) => n + a.array.byteLength, 0) + mesh.geometry.index.array.byteLength,
        examples: entries.map(e => {
          world.set(0, e.role === 'public' && e.p.base ? 0.8 : 1.2, 0).applyMatrix4(e.p.g.matrixWorld);
          pt.copy(world).project(camera);
          ray.setFromCamera(new THREE.Vector2(pt.x, pt.y), camera);
          const hit = ray.intersectObjects(occluders, false)[0], distance = camera.position.distanceTo(world);
          return { id: e.id, role: e.role, active: e.p.g.scale.x > 0, row: e.source.row ?? null, slot: e.source.slot ?? null,
            inFrame: Math.abs(pt.x) < 1 && Math.abs(pt.y) < 1 && pt.z >= -1 && pt.z <= 1,
            staticOccluder: hit && hit.distance < distance - 0.3 ? hit.object.name || hit.object.type : null,
            x: e.p.g.position.x, z: e.p.g.position.z, meta: e.p.meta, skin: (e.spec ?? catalogueSpec(e.id)).skin };
        }) };
    },
    dispose() {
      scene.onBeforeRender = oldBefore; restore.forEach(f => f());
      for (const e of entries) { e.p.g.removeFromParent(); if (e.role === 'public') { e.source.rad = e.oldRad; e.source.kid = e.oldKid; e.source.comfort = e.oldComfort; e.source.avoidKnock = e.oldAvoidKnock; } }
      mesh.removeFromParent(); mesh.geometry.dispose(); mesh.skeleton.dispose(); mesh.material.dispose(); MAT.dispose();
      delete window.__representation;
    },
  };
  window.__representation = api;
  update();
  return api;
}
