// Prototype (?toon): Vox's counterpart for smooth figures. Primitives with smooth normals, merged into one coloured mesh per pivot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  const pos = g.attributes.position, normal = g.attributes.normal;
  g.computeBoundingBox();
  const b = g.boundingBox, height = Math.max(.001, b.max.y - b.min.y);
  for (let i = 0; i < n; i++) {
    const t = (pos.getY(i) - b.min.y) / height;
    const shade = .73 + .23 * t + .06 * Math.max(0, normal.getY(i));
    a.set([c.r * shade, c.g * shade, c.b * shade], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export class Soft {
  parts = [];
  push(g) {
    if (g.attributes.uv) g.deleteAttribute('uv');
    this.parts.push(g);
    return this;
  }
  place(g, x, y, z, rot) {
    if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)));
    g.translate(x, y, z);
    return this.push(g);
  }
  // an ellipsoid, centred
  ball(x, y, z, rx, ry, rz, color, rot, seg = 10) {
    const g = new THREE.SphereGeometry(1, seg, Math.max(4, seg - 4));
    g.scale(rx, ry, rz);
    return this.place(paint(g, color), x, y, z, rot);
  }
  // a pillow-edged box, centred
  box(x, y, z, w, h, d, color, r = .07, rot) {
    return this.place(paint(new RoundedBoxGeometry(w, h, d, r > .1 ? 3 : 1, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)), color), x, y, z, rot);
  }
  // One continuous skin along a spline; joint caps stay inside the articulated parent.
  tube(points, color, seg = 10) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p.slice(0, 3))));
    const steps = Math.max(4, (points.length - 1) * 3);
    const frames = curve.computeFrenetFrames(steps, false), vertices = [], indices = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, at = curve.getPointAt(t), k = t * (points.length - 1);
      const lo = Math.min(points.length - 2, Math.floor(k)), f = k - lo;
      const r = THREE.MathUtils.lerp(points[lo][3], points[lo + 1][3], f);
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2;
        const v = at.clone().addScaledVector(frames.normals[i], Math.cos(a) * r).addScaledVector(frames.binormals[i], Math.sin(a) * r);
        vertices.push(v.x, v.y, v.z);
        if (i < steps && j < seg) {
          const q = i * (seg + 1) + j;
          indices.push(q, q + 1, q + seg + 1, q + 1, q + seg + 2, q + seg + 1);
        }
      }
    }
    for (const end of [0, steps]) {
      const at = curve.getPointAt(end / steps), center = vertices.length / 3;
      vertices.push(at.x, at.y, at.z);
      for (let j = 0; j < seg; j++) {
        const q = end * (seg + 1) + j;
        if (end === 0) indices.push(center, q + 1, q);
        else indices.push(center, q, q + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return this.push(paint(g, color));
  }
  // A tailored cloth shell: superellipse cross-sections, no box silhouette.
  cloth(rows, color, exponent = 3.5, seg = 32) {
    const vertices = [], indices = [];
    rows.forEach(([y, rx, rz], i) => {
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
        vertices.push(Math.sign(x) * Math.abs(x) ** (2 / exponent) * rx, y,
          Math.sign(z) * Math.abs(z) ** (2 / exponent) * rz);
        if (i < rows.length - 1 && j < seg) {
          const q = i * (seg + 1) + j;
          indices.push(q, q + seg + 1, q + 1, q + 1, q + seg + 1, q + seg + 2);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices); g.computeVertexNormals();
    return this.push(paint(g, color));
  }
  drape(z, halfLength, color) {
    const vertices = [], indices = [], steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + i / steps * Math.PI;
      const x = Math.sin(a) * .66, y = .16 + Math.cos(a) ** .65 * .67;
      vertices.push(x, y, z - halfLength, x, y, z + halfLength);
      if (i < steps) { const q = i * 2; indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices); g.computeVertexNormals();
    return this.push(paint(g, color));
  }
  // a turned body: rows of [radius, y, colour], squashed to an oval by sz
  lathe(x, y, z, rows, sz = 1, seg = 22) {
    const g = new THREE.LatheGeometry(rows.map(([r, ry]) => new THREE.Vector2(Math.max(r, .001), ry)), seg);
    const n = g.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { c.set(rows[i % rows.length][2]); a.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.scale(1, 1, sz);
    return this.place(g.toNonIndexed(), x, y, z);
  }
  // a flat cut-out with thickness, in the xy plane
  sheet(points, depth, color) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    return this.push(paint(g, color));
  }
  mesh() {
    return new THREE.Mesh(mergeGeometries(this.parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  }
}

// Broad highlights keep large volumes readable without shiny plastic hotspots.
export function toonMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .64, metalness: .02 });
}
