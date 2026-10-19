// The comparison's 3D view (dev only): the game's Drac rig (buildDrac, DRAC_SCALE, unchanged geometry) posed as one
// rigid shell through poseRigid / poseDrac at a video second, on a floor with a 0.5 m grid, static axes at the origin,
// the inferred root path, the active phrase's planned footprints, the reference camera's station and the helpers' marks. render(t) depends
// on t and the camera settings only (no history). The caller owns the clock.
import * as THREE from 'three';
import { buildDrac, DRAC_SCALE, FOOT_X, FOOT_Z } from '../../scene/models/drac.js';
import { poseCompare } from './rig.js';
import { poseAt, newPose, EXPRESSION_DEFAULT } from './pose.js';
import { feetAt, newFeet, PLAN } from './steps.js';
import { rootAt, END } from './path.js';
import { createCameraTrack, newCamera } from './camera.js';
import { buildHelpers, HELPERS } from './helpers.js';

export const STATUS_COLOUR = { observed: '#3ddc84', probable: '#f5c518', support: '#4fc3f7', adaptation: '#ff6ec7' };
const SOLE = { x: 0.21, toe: 0.43, heel: -0.27 }; // the shoe's sole box in its own frame (models/drac.js)
const DEG = Math.PI / 180;

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); // capturable
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setClearColor('#9fb4c8');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 120);
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6a6458, 2.2));
  const sun = new THREE.DirectionalLight(0xffe8cb, 2.6); sun.position.set(3, 8, 6); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#c9bba3', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.004; scene.add(floor);
  const grid = new THREE.GridHelper(12, 24, 0x6d5f4a, 0x9a8b74); grid.position.y = -0.002; scene.add(grid);
  const axes = new THREE.AxesHelper(1); axes.position.y = 0.002; scene.add(axes); // x red, y green, z blue (towards the camera)
  // the model's world, in model units
  const units = new THREE.Group(); units.scale.setScalar(DRAC_SCALE); scene.add(units);
  const rig = buildDrac(); rig.feet = newFeet(); units.add(rig.root);
  const pose = newPose();
  { // the inferred root path, sampled once
    const pts = [], R = { x: 0, z: 0, yaw: 0 };
    for (let t = 0; t <= END + 1e-9; t += 0.1) { rootAt(R, t); pts.push(R.x, 0.01, R.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    units.add(Object.assign(new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#fff3d6' })), { name: 'path' }));
  }
  const helpers = buildHelpers(); scene.add(helpers); // fixed in the world, not on the rig
  const prints = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true }));
  prints.name = 'prints'; units.add(prints);
  // the reference camera's station and its aim
  const station = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: '#202020' }));
  const aimLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)), new THREE.LineBasicMaterial({ color: '#202020' }));
  scene.add(station, aimLine);

  const cams = createCameraTrack(), cam = newCamera(), ref = newCamera();
  let expression = EXPRESSION_DEFAULT;
  let view = 'referencia', printsFor = null, last = -1;

  // a footprint outline per planned landing whose arrival falls in [t0, t1]
  function showPrints(t0, t1) {
    const key = `${t0}-${t1}`;
    if (printsFor === key) return;
    printsFor = key;
    const pos = [], col = [], c = new THREE.Color(), f = { x: 0, z: 0, yaw: 0 };
    for (const s of PLAN) {
      if (s.down < t0 - 1e-6 || s.down > t1 + 1e-6) continue;
      const corners = soleCorners(s.anchor, s.i, f);
      c.set(STATUS_COLOUR[s.status]);
      for (let k = 0; k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4]; pos.push(a[0], 0.015, a[1], b[0], 0.015, b[1]); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    }
    prints.geometry.dispose();
    prints.geometry = new THREE.BufferGeometry();
    prints.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    prints.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function aim(c) {
    camera.position.set(...c.pos); camera.up.set(...c.up); camera.lookAt(c.target[0], c.target[1], c.target[2]);
    if (c.roll) camera.rotateZ(c.roll * DEG);
    if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  }
  // poses the rig at video second t and draws it from the current view
  function render(t) {
    last = t;
    poseAt(pose, t, expression);
    poseCompare(rig, pose);
    cams.cameraAt(ref, t, 'referencia');
    station.position.set(...ref.pos); station.lookAt(ref.target[0], ref.target[1], ref.target[2]);
    const a = aimLine.geometry.attributes.position;
    a.setXYZ(0, ...ref.pos); a.setXYZ(1, ...ref.target); a.needsUpdate = true;
    station.visible = aimLine.visible = view !== 'referencia';
    cams.cameraAt(cam, t, view); aim(cam);
    scene.updateMatrixWorld();
    renderer.render(scene, camera);
  }
  const ndc = new THREE.Vector3(), v = new THREE.Vector3();
  const toScreen = p => { ndc.copy(p).project(camera); return { x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2, behind: ndc.z > 1 }; };
  const world = o => o.getWorldPosition(new THREE.Vector3());
  const metres = p => [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)];
  // the last render's numbers: pose, camera, shoes (centres and sole corners, m), projected silhouette box and
  // landmarks (0-1 of the frame, y down). Exact per vertex; for calibration, not per frame.
  function snapshot() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = 0;
    rig.root.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      const p = o.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld).project(camera);
        if (v.z > 1) { behind++; continue; }
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
    });
    const shoes = rig.legs.map(({ shoe }, i) => ({
      leg: i ? 'C' : 'F', centre: metres(world(shoe)), lift: rig.feet[i].lift,
      corners: [[SOLE.x, SOLE.toe], [-SOLE.x, SOLE.toe], [-SOLE.x, SOLE.heel], [SOLE.x, SOLE.heel]].map(([x, z]) => metres(shoe.localToWorld(v.set(x, 0, z)))),
    }));
    const heads = rig.necks.map(n => world(n.head)), body = world(rig.body), root = world(rig.root);
    return {
      t: last, view, expression, pose: { ...pose }, camera: { view, ...cams.cameraAt(newCamera(), last, view), tune: { ...cams.tune } },
      shoes, feetRoot: feetAt(newFeet(), last, false, 0).map(f => ({ ...f })),
      bounds: { x0: (x0 + 1) / 2, x1: (x1 + 1) / 2, y0: (1 - y1) / 2, y1: (1 - y0) / 2, behindVertices: behind },
      landmarks: { heads: heads.map(toScreen), body: toScreen(body), root: toScreen(root), shoes: rig.legs.map(l => toScreen(world(l.shoe))) },
      world: { heads: heads.map(metres), body: metres(body), root: metres(root) },
      helpers: HELPERS.map(h => ({ id: h.id, x: h.x, z: h.z, facingDeg: +(h.yaw / DEG).toFixed(1), shown: helpers.visible, screen: toScreen(v.set(h.x, 0, h.z)) })),
    };
  }
  function setView(next) { if (['referencia', 'fixa', 'planta'].includes(next)) view = next; if (last >= 0) render(last); return view; }
  function setLayers({ grid: g, axes: x, prints: p, path: q, helpers: a } = {}) {
    if (g !== undefined) grid.visible = !!g;
    if (x !== undefined) axes.visible = !!x;
    if (p !== undefined) prints.visible = !!p;
    if (q !== undefined) units.getObjectByName('path').visible = !!q;
    if (a !== undefined) helpers.visible = !!a;
    if (last >= 0) render(last);
  }
  resize();
  // the comic layer's gain, 0 (the base) to 1 (default); the clock and the video are untouched
  function setExpression(g) { if (Number.isFinite(g)) expression = Math.min(1, Math.max(0, g)); if (last >= 0) render(last); return expression; }
  return { render, resize, snapshot, setView, setLayers, setExpression, showPrints, cams, rig, pose, referenceCamera: ref, get view() { return view; }, get expression() { return expression; }, renderer };
}

// a sole's four floor corners (model units) for a planted anchor of leg i at front 0: [[x, z] x4]
export function soleCorners(anchor, i, f = { x: 0, z: 0, yaw: 0 }) {
  const side = i ? -anchor.wide : anchor.wide, c = Math.cos(anchor.yaw), s = Math.sin(anchor.yaw);
  f.x = anchor.x + c * side; f.z = anchor.z - s * side;
  const rx = i ? -FOOT_X : FOOT_X, fz = FOOT_Z;
  return [[SOLE.x, SOLE.toe], [-SOLE.x, SOLE.toe], [-SOLE.x, SOLE.heel], [SOLE.x, SOLE.heel]].map(([x, z]) => {
    const lx = rx + x, lz = fz + z;
    return [f.x + c * lx + s * lz, f.z - s * lx + c * lz];
  });
}
