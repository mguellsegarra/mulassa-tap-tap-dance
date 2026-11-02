// Stable wire kinds: 0 none, 1 platform, 2 setts, 3 red hydraulic, 4 grey hydraulic, 5 ashlar, 6 plaster, 7 tile;
// 16..255 tile rows whose fall line lies at (kind-16)/240*pi in world XZ. Layers are multipliers on the vertex colour.
import * as THREE from 'three';

const SIZE = 128, LAYERS = 7, NEUTRAL = 204; // 204 * the shader's 1.25 leaves the vertex colour as it is
const GROUT = [0.82, 0.76, 0.66], PAVE_GROUT = [0.91, 0.88, 0.81], JOINT = [0.84, 0.77, 0.66];
const PAVING = [[1, 1, 1], [0.985, 0.975, 0.955], [0.97, 0.96, 0.93], [1.015, 1.01, 1], [0.95, 0.93, 0.89], [0.99, 0.985, 0.97]];
const SETTS = [[1, 0.98, 0.94], [0.96, 0.93, 0.87], [1.02, 1, 0.95], [0.93, 0.89, 0.82]];
const BLOCKS = [[1, 0.98, 0.95], [0.97, 0.93, 0.86], [1.03, 1, 0.95], [0.94, 0.89, 0.81]];
const TILES = [[1, 0.98, 0.95], [1.07, 1, 0.9], [0.92, 0.86, 0.82], [1, 0.91, 0.8]];
const hash = (a, b) => Math.abs((a * 73856093) ^ (b * 19349663)) % 1009;

// Warm paving: tiles of 1 to 3 cells, packed once per texture. Bevelled, so each reads as a chunky block.
function pavingLayer() {
  const CELLS = 16, CELL = SIZE / CELLS, owner = new Int16Array(CELLS * CELLS).fill(-1), tones = [];
  for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
    if (owner[y * CELLS + x] >= 0) continue;
    const h = hash(x + 3, y + 11);
    let w = [1, 2, 2, 3][h % 4], t = [1, 1, 2, 2][(h >> 2) % 4];
    while (w > 1 && Array.from({ length: t }, (_, j) => owner[Math.min(y + j, CELLS - 1) * CELLS + x + w - 1] >= 0 || x + w > CELLS).some(Boolean)) w--;
    while (y + t > CELLS) t--;
    for (let j = 0; j < t; j++) for (let i = 0; i < w; i++) owner[(y + j) * CELLS + x + i] = tones.length;
    tones.push(PAVING[hash(x * 7 + 1, y * 5 + 2) % PAVING.length]);
  }
  const at = (x, y) => owner[(((y >> 3) + CELLS) % CELLS) * CELLS + ((x >> 3) + CELLS) % CELLS];
  return (x, y) => {
    const id = at(x, y);
    if (at(x - 1, y) !== id || at(x, y - 1) !== id) return PAVE_GROUT;
    const lit = at(x, y - 2) !== id || at(x - 2, y) !== id, dim = at(x, y + 1) !== id || at(x + 1, y) !== id;
    return tones[id].map(c => c * (lit ? 1.02 : dim ? 0.97 : 1));
  };
}

// Staggered courses of 16 texels: setts, ashlar and tile differ only in joints and tones.
function coursed(table, joint, bevel) {
  return (x, y) => {
    const row = y >> 4, shifted = x + (row % 2 ? 8 : 0), col = (shifted >> 4) % 8, u = shifted % 16, v = y % 16;
    if (u === 0 || v === 0) return joint;
    const tone = table[hash(col + 1, row + 5) % table.length];
    return tone.map(c => c * (bevel && (u === 1 || v === 1) ? 1.04 : bevel && (u === 15 || v === 15) ? 0.94 : 1));
  };
}

function hydraulic(square) {
  return (x, y) => {
    const u = x % 16, v = y % 16, dx = Math.abs(u - 8), dy = Math.abs(v - 8), ring = square ? Math.max(dx, dy) : dx + dy;
    if (u === 0 || v === 0) return GROUT;
    return ring >= 5 && ring <= 6 ? [0.84, 0.78, 0.72] : dx <= 1 && dy <= 1 ? [0.88, 0.82, 0.76] : [1, 0.98, 0.95];
  };
}

// Faint large patches, no lines: plaster must not compete with the openings.
const plaster = (x, y) => {
  const t = (hash(x >> 3, y >> 3) % 5 - 2) * 0.008;
  return [1 + t, 1 + t, 1 + t * 1.3];
};

// A tile's lip catches the sun; the course above it throws a thin shadow.
const tile = (x, y) => {
  const row = y >> 4, shifted = x + (row % 2 ? 8 : 0), col = (shifted >> 4) % 8, u = shifted % 16, v = y % 16;
  const tone = TILES[hash(col + 2, row + 9) % TILES.length];
  const light = v < 2 ? 0.58 : v < 4 ? 0.82 : v > 13 ? 1.12 : 1;
  return tone.map(c => c * light * (u === 0 ? 0.74 : 1));
};

export function createGroundTexture() {
  const data = new Uint8Array(SIZE * SIZE * LAYERS * 4);
  const layers = [pavingLayer(), coursed(SETTS, GROUT, true), hydraulic(false), hydraulic(true), coursed(BLOCKS, JOINT, true), plaster, tile];
  layers.forEach((texel, layer) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const rgb = texel(x, y), o = (layer * SIZE * SIZE + y * SIZE + x) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = Math.min(255, Math.round(NEUTRAL * rgb[c]));
      data[o + 3] = 255;
    }
  });
  const texture = new THREE.DataArrayTexture(data, SIZE, SIZE, LAYERS);
  texture.format = THREE.RGBAFormat;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Everything but the single fetch happens per vertex: the kind picks the layer, the scale and the projection.
export function applyGroundTexture(anisotropy, ...materials) {
  const texture = createGroundTexture();
  texture.anisotropy = anisotropy;
  for (const material of materials) {
    material.onBeforeCompile = shader => {
      shader.uniforms.groundTiles = { value: texture };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
attribute float surfaceKind;
varying vec3 vGround;
// Metres per texture repeat, by kind 1..7: 14 cm paving cells (tiles of 14 to 42 cm), 36 x 24 setts, 60 x 30 ashlar, 40 cm tile courses.
const vec2 REPEAT[7] = vec2[7](vec2(2.24), vec2(2.88, 1.92), vec2(1.6), vec2(1.6), vec2(4.8, 2.4), vec2(6.4), vec2(3.2));`).replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 groundWorld = (modelMatrix * vec4(position, 1.0)).xyz;
if (surfaceKind < 0.5) vGround = vec3(0.0, 0.0, -1.0);
else if (surfaceKind > 15.5) {
  float fall = (surfaceKind - 16.0) * 3.14159265 / 240.0;
  vec2 down = vec2(cos(fall), sin(fall));
  vGround = vec3(vec2(dot(groundWorld.xz, vec2(-down.y, down.x)), dot(groundWorld.xz, down)) / REPEAT[6], 6.0);
} else {
  vec2 onTop = surfaceKind < 4.5 ? mat2(0.958, -0.287, 0.287, 0.958) * groundWorld.xz : groundWorld.xz;
  vec2 across = normalize(vec2(-normal.z, normal.x) + 1e-4);
  vec2 plane = abs(normal.y) > 0.7 ? onTop : vec2(dot(groundWorld.xz, across), groundWorld.y);
  vGround = vec3(plane / REPEAT[int(surfaceKind + 0.5) - 1], surfaceKind - 1.0);
}`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
uniform highp sampler2DArray groundTiles;
varying vec3 vGround;`).replace('#include <color_fragment>', `#include <color_fragment>
if (vGround.z > -0.5) diffuseColor.rgb *= texture(groundTiles, vGround).rgb * 1.25;`);
    };
    material.customProgramCacheKey = () => 'ground-array-v3';
  }
  return texture;
}
