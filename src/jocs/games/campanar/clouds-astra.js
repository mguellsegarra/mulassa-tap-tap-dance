// Shallow banks of cumulus. Bake the sunlit face and optical thickness of each bank once:
// during play the GPU only has to sample a small patch of sky for each one.
import { BufferGeometry, DataTexture, Float32BufferAttribute, LinearFilter, Mesh, ShaderMaterial } from 'three';

const astraCloudWidth = 192, astraCloudHeight = 72;

// Cross-sections from tail to head. A broad foot ties the smaller wind-torn lobes together.
const astraCloudBanks = [
  [[94, 28, 80, 11], [46, 34, 30, 13], [73, 38, 27, 16], [97, 45, 23, 19],
    [119, 40, 21, 15], [142, 34, 17, 11], [160, 28, 18, 6]],
  [[90, 29, 79, 9], [40, 34, 23, 11], [58, 39, 19, 14], [80, 41, 24, 20],
    [103, 37, 16, 13], [118, 36, 23, 15], [147, 31, 24, 8]],
  [[89, 31, 78, 6], [48, 34, 29, 8], [78, 36, 22, 10], [102, 37, 25, 12], [132, 32, 28, 7]],
];

function astraCloudAtlas() {
  const w = astraCloudWidth, h = astraCloudHeight;
  const pixels = new Uint8Array(w * h * astraCloudBanks.length * 4);
  const surface = new Float32Array(w * h);
  // A periodic lattice keeps the silhouette and its shading weathered by the same noise.
  const lattice = new Float32Array(1024);
  let seed = 7217;
  for (let i = 0; i < lattice.length; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    lattice[i] = seed / 4294967296 - 0.5;
  }
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    let u = x - i, v = y - j;
    u *= u * (3 - 2 * u);
    v *= v * (3 - 2 * v);
    const row = (j & 31) * 32, next = ((j + 1) & 31) * 32;
    const a = lattice[row + (i & 31)], b = lattice[next + (i & 31)];
    return (a + (lattice[row + ((i + 1) & 31)] - a) * u) * (1 - v)
      + (b + (lattice[next + ((i + 1) & 31)] - b) * u) * v;
  }
  for (const [bank, lobes] of astraCloudBanks.entries()) {
    surface.fill(0);
    for (const [cx, cy, rx, ry] of lobes) {
      for (let y = cy - ry; y <= cy + ry; y++) {
        const dy = (y - cy) / ry;
        for (let x = cx - rx; x <= cx + rx; x++) {
          const dx = (x - cx) / rx;
          const depth = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)) * ry;
          const i = y * w + x, old = surface[i];
          // Smooth the cleft between overlapping lobes, keeping a hint of their folds.
          const blend = Math.max(0, 1 - Math.abs(depth - old) / 5);
          surface[i] = Math.max(depth, old) + Math.min(old, depth, 1) * blend * blend * 1.25;
        }
      }
    }
    const relief = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const n = noise(x / 15, y / 12 + bank * 8), fine = noise(x / 5, y / 4 + bank);
        const sx = Math.max(0, Math.min(w - 2, x + 11 * n + 3 * fine));
        const sy = Math.max(0, Math.min(h - 2, y + 7 * noise(x / 11 + 7, y / 13) + 2 * fine));
        const ix = Math.floor(sx), iy = Math.floor(sy), u = sx - ix, v = sy - iy, i = iy * w + ix;
        const d = (surface[i] * (1 - u) + surface[i + 1] * u) * (1 - v)
          + (surface[i + w] * (1 - u) + surface[i + w + 1] * u) * v;
        relief[y * w + x] = d * (1 + 0.24 * n + 0.09 * fine);
      }
    }
    for (let i = w; i < relief.length - w; i++) {
      const d = relief[i];
      if (!d) continue;
      const y = Math.floor(i / w);
      const dx = (relief[i + 1] - relief[i - 1]) * 0.5, dy = (relief[i + w] - relief[i - w]) * 0.5;
      const sun = (0.42 * dx - 0.78 * dy + 0.46) / Math.sqrt(1 + dx * dx + dy * dy);
      const light = Math.max(0, Math.min(1, 0.23 + 0.49 * sun + 0.016 * (y - 22)));
      const p = 4 * (bank * w * h + i);
      pixels[p] = 163 + 90 * light;
      pixels[p + 1] = 150 + 78 * light;
      pixels[p + 2] = 174 + 32 * light;
      pixels[p + 3] = 255 * (1 - Math.exp(-d * d / 83));
    }
  }
  const atlas = new DataTexture(pixels, w, h * astraCloudBanks.length);
  atlas.magFilter = atlas.minFilter = LinearFilter;
  atlas.needsUpdate = true;
  return atlas;
}

export function createClouds(scene, camera, renderer, { night = 0 } = {}) {
  // Position each bank by its shore of the screen. The long lens at the end can then
  // reframe the tower without pulling a cloud across the crown.
  const banks = [
    [-0.80, 0.39, 0.61, 0, 0.86], [0.86, 0.58, 0.48, 1, 0.72],
    [-0.50, 0.72, 0.31, 2, 0.43], [0.72, 0.21, 0.36, 2, 0.49],
  ];
  const vertices = [], anchors = [], texcoords = [], indices = [];
  for (const [i, [x, y, span, bank, distance]] of banks.entries()) {
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      vertices.push((u - 0.5) * span, (v - 0.5) * span * astraCloudHeight / astraCloudWidth, 0);
      anchors.push(x, y, distance);
      texcoords.push(u, (bank + v) / astraCloudBanks.length);
    }
    const j = i * 4;
    indices.push(j, j + 1, j + 2, j, j + 2, j + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(texcoords, 2));
  geometry.setAttribute('bankAnchor', new Float32BufferAttribute(anchors, 3));
  geometry.setIndex(indices);
  const uniforms = { atlas: { value: astraCloudAtlas() }, aspect: { value: camera.aspect },
    seconds: { value: 0 }, height: { value: 0 }, night: { value: night } };
  const material = new ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 bankAnchor;
      uniform float seconds, height, aspect;
      varying vec2 sampleAt;
      varying float mist;
      void main() {
        float layer = bankAnchor.z;
        float passage = fract(seconds * 0.025 * layer + bankAnchor.y);
        vec2 center = bankAnchor.xy + vec2((passage - 0.5) * 0.42, -height * layer * 0.009);
        vec2 size = vec2(min(1.68, 1.16 / aspect), min(1.68 * aspect, 1.16));
        gl_Position = vec4(center + position.xy * size, 0.99998, 1.0);
        sampleAt = uv;
        // Dissolve a bank into the haze before its next passage.
        mist = layer * (0.79 - height * 0.009)
          * smoothstep(0.0, 0.15, passage) * (1.0 - smoothstep(0.85, 1.0, passage));
      }`,
    fragmentShader: `
      uniform sampler2D atlas;
      uniform float night;
      varying vec2 sampleAt;
      varying float mist;
      void main() {
        vec4 cloud = texture2D(atlas, sampleAt);
        // at night the banks lose the day's light: dim and cool
        vec3 tone = cloud.rgb * mix(vec3(1.0), vec3(0.42, 0.44, 0.6), night);
        // at night the body is solid so the stars behind it are hidden; only the very rim stays soft
        float body = cloud.a * mist;
        gl_FragColor = vec4(tone, mix(body, smoothstep(0.02, 0.3, body), night));
      }`,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100; // the slabs that are still fading in draw over the sky too
  scene.add(mesh);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return { tick(dt, climb) {
    uniforms.aspect.value = camera.aspect;
    if (!reduced.matches) uniforms.seconds.value += dt;
    uniforms.height.value = reduced.matches ? 0 : Math.min(22, Math.max(0, climb));
  } };
}
