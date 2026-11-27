import * as THREE from 'three';
import { MAT } from '../../scene/models/voxel.js';

// Sculpt on a square lattice. Only exposed rectangles enter the draw call.
export class ClothGridAstra {
  constructor(step, origin, size) {
    this.step = Array.isArray(step) ? step : [step, step, step];
    this.origin = origin;
    this.size = size;
    this.cells = new Uint32Array(size[0] * size[1] * size[2]);
  }

  stamp(lo, hi, sample) {
    const [nx, ny] = this.size;
    const min = lo.map((v, d) => Math.max(0, Math.floor((v - this.origin[d]) / this.step[d])));
    const max = hi.map((v, d) => Math.min(this.size[d], Math.ceil((v - this.origin[d]) / this.step[d])));
    for (let k = min[2]; k < max[2]; k++) {
      for (let j = min[1]; j < max[1]; j++) {
        for (let i = min[0]; i < max[0]; i++) {
          const color = sample(
            this.origin[0] + (i + 0.5) * this.step[0],
            this.origin[1] + (j + 0.5) * this.step[1],
            this.origin[2] + (k + 0.5) * this.step[2],
          );
          if (color !== undefined) this.cells[i + nx * (j + ny * k)] = color;
        }
      }
    }
  }

  oval(x, y, z, rx, ry, rz, color, tilt = 0) {
    const reach = ry + Math.abs(tilt * rx);
    this.stamp([x - rx, y - reach, z - rz], [x + rx, y + reach, z + rz], (a, b, c) => {
      if (((a - x) / rx) ** 2 + ((b - y - tilt * (a - x)) / ry) ** 2 + ((c - z) / rz) ** 2 <= 1) return color;
    });
  }

  mesh(name) {
    const positions = [],
      colors = [],
      indices = [],
      palette = new Map();
    const stride = [1, this.size[0], this.size[0] * this.size[1]];
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3,
        v = (d + 2) % 3,
        w = this.size[u],
        h = this.size[v];
      const mask = new Int32Array(w * h);
      for (let slice = 0; slice <= this.size[d]; slice++) {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const idx = slice * stride[d] + x * stride[u] + y * stride[v];
            const a = slice ? this.cells[idx - stride[d]] : 0;
            const b = slice < this.size[d] ? this.cells[idx] : 0;
            mask[y * w + x] = a && !b ? a : b && !a ? -b : 0;
          }
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const code = mask[y * w + x];
            if (!code) continue;
            let width = 1,
              height = 1;
            while (x + width < w && mask[y * w + x + width] === code) width++;
            rows: while (y + height < h) {
              for (let dx = 0; dx < width; dx++) if (mask[(y + height) * w + x + dx] !== code) break rows;
              height++;
            }
            for (let dy = 0; dy < height; dy++) mask.fill(0, (y + dy) * w + x, (y + dy) * w + x + width);
            const start = positions.length / 3,
              rgb = Math.abs(code);
            if (!palette.has(rgb)) palette.set(rgb, new THREE.Color(rgb).toArray());
            for (const [dx, dy] of [
              [0, 0],
              [width, 0],
              [width, height],
              [0, height],
            ]) {
              const p = [...this.origin];
              p[d] += slice * this.step[d];
              p[u] += (x + dx) * this.step[u];
              p[v] += (y + dy) * this.step[v];
              positions.push(...p);
              colors.push(...palette.get(rgb));
            }
            const corners = code > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
            for (const i of corners) indices.push(start + i);
          }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, MAT);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}
