// The representation's props, each built round its own pivots: the standing skirt, the manual wheelchair and the long white cane.
import * as THREE from 'three';
import { PALM, CHAIR, CANE_LEN } from './rig.js';
import { Vox, COLOURS, CANE, SHOE } from './kit.js';

// ---- the standing skirt (a skirt, or a dress's skirt), one garment pinned at the waist: the yoke and the hem as in
// the baseline, on the waist bone (at the hip pivot, the legs' pivot height), plus a front and a back panel over them,
// each a bone at the same pivot. At rest the panels sit 2 mm proud, so the look is the baseline's. In a stride pose.mjs shears each panel by
// the angle of the leg it covers (front: the leg ahead, back: the leg behind): the waist stays put, the hem stays level
// and the cloth slants with that leg, so the skirt flares as one piece instead of splitting or turning blocks.
export function skirtPanels(waist, W, D, c, legX, hem) {
  // Scale the garment's drop in its geometry so the existing waist-pinned shear still follows each stride.
  const drop = hem / 0.38;
  const garmentMesh = vox => {
    const mesh = vox.mesh();
    mesh.geometry.scale(1, drop, 1);
    for (const box of mesh.userData.boxes) { box[2] *= drop; box[3] *= drop; }
    return mesh;
  };
  const v = new Vox();
  v.box(0, -0.18, 0, W + 0.04, 0.22, D + 0.06, c, 0).box(0, -0.38, 0, W + 0.1, 0.2, D + 0.1, c, 0); // yoke, hem
  // the hem's middle, over the legs' width, 6 mm lower: a leg's corner just inside the hem passes under the middle at
  // the bottom of its arc (it swings about the hip, 0.383 m away); at rest the legs hide it
  v.box(0, -0.386, 0, 2 * legX + 0.004, 0.08, 0.12, c, 0);
  waist.add(garmentMesh(v));
  const yz = (D + 0.06) / 2 + 0.002, hz = (D + 0.1) / 2 + 0.002; // the panels' faces
  return [1, -1].map(s => {
    const b = new THREE.Group(), pv = new Vox();
    b.matrixAutoUpdate = false; // a shear, which no position/rotation/scale can express
    // the yoke's and the hem's front (back) half, a few mm short of the middle, the yoke's bottom and the hem's (no
    // shared faces; the hem's own edge is the skirt's lowest)
    pv.box(0, -0.182, s * (yz + 0.006) / 2, W + 0.044, 0.22, yz - 0.006, c, 0).box(0, -0.377, s * (hz + 0.004) / 2, W + 0.104, 0.199, hz - 0.004, c, 0);
    b.add(garmentMesh(pv));
    waist.add(b);
    return b;
  });
}

// ---- the manual wheelchair: seat 0.48 m, 0.62 m rear wheels with push rims, front casters, footplate, armrests, push
// handles. Its frame is its own bone (base) so a lean or a nod never tilts it; each rear wheel and each caster wheel is a
// bone that rolls. The dimensions the poses read are in rig.mjs (CHAIR).
export function chair(o, W, D, g, wheels, casters) {
  const v = new Vox(), F = o.chairColour ?? '#2f62d6', SEAT = 0.48, { R, caster: K } = CHAIR;
  const base = new THREE.Group();
  g.add(base);
  v.box(0, 0.42, 0, 0.44, 0.06, 0.44, COLOURS.seat);
  v.box(0, SEAT, -0.24, 0.42, 0.36, 0.04, COLOURS.seat);
  for (const s of [1, -1]) {
    const x = s * 0.225, cx = s * K.x;
    v.box(x, 0.3, -0.25, 0.03, 0.62, 0.03, F, 0).box(x, 0.885, -0.31, 0.034, 0.03, 0.1, COLOURS.grip, 0); // back post, push handle
    v.box(x, 0.385, 0, 0.032, 0.03, 0.47, F, 0); // seat rail
    v.box(x, 0.22, K.swivelZ, 0.028, 0.18, 0.028, F, 0); // front post, down to the caster's swivel
    v.bar([x, 0.4, 0.2], [s * 0.17, 0.11, 0.33], 0.026, F); // footrest hanger
    v.box(s * 0.235, 0.48, 0.1, 0.024, 0.22, 0.024, F, 0).box(s * 0.236, 0.7, -0.05, 0.05, 0.03, 0.3, COLOURS.seat, 0); // armrest
    v.box(s * 0.2365, 0.48, -0.08, 0.012, 0.2, 0.26, F, 0); // side guard over the wheel
    // the caster's swivel stem and fork: the axle trails 5 cm behind the stem, as a caster settles rolling forward, and
    // the two prongs stand clear of the wheel's sides
    v.box(cx, 0.195, K.swivelZ, 0.022, 0.04, 0.022, F, 0).box(cx, 0.175, (K.z + K.swivelZ) / 2, 0.068, 0.02, 0.07, F, 0);
    for (const d of [1, -1]) v.box(cx + d * 0.026, K.y - 0.01, K.z, 0.012, 0.185 - K.y, 0.024, F, 0);
    const c = new THREE.Group(), cv = new Vox();
    c.position.set(cx, K.y, K.z);
    cv.add(new THREE.CylinderGeometry(K.r, K.r, K.w, 10).rotateZ(Math.PI / 2), COLOURS.tyre, 0);
    cv.add(new THREE.CylinderGeometry(0.02, 0.02, K.w + 0.006, 6).rotateZ(Math.PI / 2), COLOURS.rim, 0);
    cv.box(0, 0.015, 0, K.w + 0.004, 0.045, 0.014, COLOURS.rim, 0); // a spoke mark: shows the caster turning
    c.add(cv.mesh());
    base.add(c);
    casters.push(c);
    // ...and the rear wheel, its own bone at the axle
    const w = new THREE.Group(), wv = new Vox();
    w.position.set(s * CHAIR.wheelX, R, CHAIR.axleZ);
    wv.add(new THREE.TorusGeometry(CHAIR.tyreR, CHAIR.tyreTube, 4, 20).rotateY(Math.PI / 2), COLOURS.tyre, 0);
    wv.add(new THREE.TorusGeometry(CHAIR.rimR, CHAIR.rimTube, 3, 20).rotateY(Math.PI / 2).translate(s * CHAIR.rimOut, 0, 0), COLOURS.rim, 0);
    for (let i = 0; i < 3; i++) wv.add(new THREE.BoxGeometry(0.008, 2 * (R - 0.04), 0.012).rotateX(i * Math.PI / 3), COLOURS.rim, 0);
    for (let i = 0; i < 4; i++) wv.add(new THREE.BoxGeometry(CHAIR.rimOut, 0.01, 0.01).translate(s * CHAIR.rimOut / 2, CHAIR.rimR, 0).rotateX(i * Math.PI / 2 + 0.4), COLOURS.rim, 0); // rim standoffs
    wv.add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8).rotateZ(Math.PI / 2), COLOURS.grip, 0);
    w.add(wv.mesh());
    g.add(w);
    wheels.push(w);
  }
  v.box(0, 0.08, 0.34, 0.36, 0.02, 0.14, F, 0); // footplate
  // the seated legs ride the frame (they don't swing): thighs on the cushion, shins down to the footplate
  const lx = 0.1 * o.bw, lw = 0.16 * Math.min(o.bw, 1.12), short = o.bottom.kind !== 'pantalons';
  const thigh = o.bottom.kind === 'pantalons' || o.bottom.kind === 'curt' ? o.bottom.colour : o.top.kind === 'vestit' ? o.top.colour : o.bottom.colour;
  const shin = short ? o.bottom.legs ?? o.skin : o.bottom.colour;
  for (const s of [1, -1]) {
    v.box(s * lx, 0.475, 0.08, lw, 0.15, 0.44, thigh);
    v.box(s * lx, 0.13, 0.27, lw - 0.01, 0.37, 0.15, shin).box(s * lx, 0.1, 0.345, lw, 0.06, 0.21, SHOE, 0);
  }
  if (o.bottom.kind === 'faldilla' || o.top.kind === 'vestit') v.box(0, 0.47, 0.08, W + 0.06, 0.2, 0.48, thigh).box(0, 0.34, 0.3, W + 0.05, 0.14, 0.05, thigh); // lap and hem over the knees
  base.add(v.mesh());
  return { base, hip: SEAT + 0.005, back: -0.22 + D / 2 + 0.005 }; // the torso's box just above the cushion and the thighs
}

// ---- the long white cane: its own bone at the holding hand's PALM (a wrist), so pose.mjs can aim it at a ground point
// while the hand stays round its grip. Built along -y: the grip above and through the fist, the shaft, the dark tip.
export function caneBone(forearm) {
  const c = new THREE.Group(), v = new Vox();
  c.position.copy(PALM);
  forearm.add(c);
  v.box(0, -0.1, 0, 0.03, 0.2, 0.03, COLOURS.grip, 0).box(0, 0.04 - CANE_LEN, 0, 0.022, CANE_LEN - 0.14, 0.022, CANE.white, 0).box(0, -CANE_LEN, 0, 0.026, 0.04, 0.026, CANE.tip, 0);
  c.add(v.mesh());
  return c;
}
