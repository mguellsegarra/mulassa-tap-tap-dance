// The early night over Tower: one quad over the whole screen deepens the dusk from the zenith down, and the stars come
// out on it as a real dusk brings them, the brightest first and the highest first. Nothing repeats: every star has its
// own place, size, tint and beat, a few bright ones among a lot of dust. One mesh and one draw call, behind the clouds
// (clouds-astra.js) and the tower: the colours are premultiplied, so one blend lays the night and the stars' light on it.
import { BufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial, Vector2 } from 'three';
import { FLOOR } from './rules.js';

// the climb (world units) the night takes: from a couple of floors up to the real campanar's 42
const fableNightFrom = 1, fableNightFull = 42 * FLOOR;
// shortcut: the stars' field is 4.8 screen heights wide, so a window over 2.4:1 has bare sides; widen it then
const fableSkyReach = 2.4;

// How dark the night makes the sky at a height (0 the screen's bottom, 1 its top): it comes down from the zenith and
// stops short of the ridge. The quad's alpha and what each star needs to be seen read the same curve.
const fableNightGlsl = `
  float fableDark(float h, float night) {
    return 0.9 * night * smoothstep(mix(0.42, 0.08, night), 1.12, h);
  }`;

// every quad's corners and values: the night's first, then the stars (drawn in this order, their light over it)
function fableStarQuads() {
  const corners = [], stars = [], hues = [], beats = [], indices = [];
  let seed = 4302, count = 0;
  const rnd = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  function quad(star, hue, beat) {
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { corners.push(u, v, 0); stars.push(...star); hues.push(...hue); beats.push(...beat); }
    const j = 4 * count++;
    indices.push(j, j + 1, j + 2, j, j + 2, j + 3);
  }
  quad([0, 0, 0, -1], [0, 0, 0, 0], [0, 0]);
  // the game's cream, two cold whites, a peach and a rose
  const tints = [[1, 0.953, 0.839], [1, 0.953, 0.839], [1, 0.953, 0.839], [0.8, 0.89, 1], [0.87, 0.93, 1], [1, 0.85, 0.72], [1, 0.8, 0.87]];
  // the first ones out, placed by hand inside the narrowest phone's sky and clear of the HUD: the evening star, then four more
  for (const [x, y, size, rise, tint] of [[0.3, 0.5, 13, 0.02, 0], [-0.3, 0.66, 10, 0.07, 3], [0.16, 0.74, 8.5, 0.1, 5],
    [-0.37, 0.2, 9.5, 0.12, 0], [0.38, 0.06, 8.5, 0.14, 4]]) quad([x, y, size, rise], [...tints[tint], 1], [rnd() * 6.283, 0.5 + rnd()]);
  for (let i = 0; i < 640; i++) {
    const big = rnd() ** 7, tint = tints[Math.floor(rnd() * tints.length)]; // a few big ones, most of them dust
    // from the middle, in screen heights; height (NDC), over the ridge; diameter, CSS px; how dark a sky it needs
    quad([(rnd() * 2 - 1) * fableSkyReach, rnd() * 1.4 - 0.4, 2.2 + 9 * big, 0.06 + 0.4 * (1 - big ** 0.3) + rnd() * 0.1],
      [...tint, 0.4 + 0.6 * big ** 0.35], [rnd() * 6.283, 0.5 + rnd() * 1.3]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(corners, 3));
  geometry.setAttribute('star', new Float32BufferAttribute(stars, 4));
  geometry.setAttribute('hue', new Float32BufferAttribute(hues, 4));
  geometry.setAttribute('beat', new Float32BufferAttribute(beats, 2));
  geometry.setIndex(indices);
  return geometry;
}

const fableNightBase = 0.8; // the night already there at the home screen

export function createStars(scene, camera, renderer) {
  const canvas = renderer.domElement;
  const uniforms = { frame: { value: new Vector2(canvas.width, canvas.height) }, ratio: { value: 1 },
    night: { value: 0 }, seconds: { value: 0 } };
  const material = new ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, premultipliedAlpha: true,
    vertexShader: `
      attribute vec4 star; // x, y, diameter, the dark it needs (under 0: the night's quad)
      attribute vec4 hue;  // its tint, its light
      attribute vec2 beat; // its twinkle: phase, pace
      uniform vec2 frame;  // the drawing buffer, px
      uniform float ratio, night, seconds;
      varying vec4 light;
      varying vec2 disc;
      varying float halo, sky, up, rays, grow;
      ${fableNightGlsl}
      void main() {
        rays = 0.0;
        grow = 1.0;
        light = vec4(0.0);
        disc = vec2(0.0);
        halo = 0.0;
        if (star.w < 0.0) {
          // the night, the whole screen; no area while it is still day, so nothing to fill
          gl_Position = vec4(position.xy * step(0.002, night), 0.99999, 1.0);
          sky = 1.0;
          up = position.y * 0.5 + 0.5;
          return;
        }
        vec2 at = vec2(star.x * frame.y / frame.x, star.y);
        float seen = smoothstep(star.w, star.w + 0.08, fableDark(at.y * 0.5 + 0.5, night));
        // it only dims: brighter than its own light would bleach its tint
        float twinkle = 1.0 - (0.07 + 0.006 * star.z)
          * (1.0 + 0.6 * sin(seconds * beat.y + beat.x) + 0.4 * sin(seconds * beat.y * 2.7 + beat.x * 3.0));
        // centred on a pixel: the dust stays crisp and each star as bright as it was made
        vec2 centre = floor((at * 0.5 + 0.5) * frame) + 0.5;
        // a sparkle (Astra's): now and then a star flares and shows four rays; the big ones always a little
        float flare = pow(max(0.0, sin(seconds * 0.37 + beat.x * 5.0)), 24.0);
        rays = smoothstep(5.0, 10.0, star.z) * (0.25 + 0.5 * flare) + 0.5 * flare * step(3.0, star.z); // small and soft: no star calls for the eye
        grow = 1.0 + 1.3 * rays; // the quad grows for the rays; the dot keeps its size (disc / grow)
        vec2 corner = centre + position.xy * 0.5 * max(2.0, star.z * ratio) * grow * step(0.004, seen); // unseen: no area
        gl_Position = vec4(corner / frame * 2.0 - 1.0, 0.99999, 1.0);
        light = vec4(hue.rgb, 1.0) * (hue.a * seen * twinkle);
        disc = position.xy;
        halo = smoothstep(3.6, 6.5, star.z);
        sky = 0.0;
        up = 0.0;
      }`,
    fragmentShader: `
      uniform float night;
      varying vec4 light;
      varying vec2 disc;
      varying float halo, sky, up, rays, grow;
      ${fableNightGlsl}
      void main() {
        // a star: a soft dot, and the big ones a tight core in a faint halo
        vec2 d = disc * grow;
        float s = max(0.0, 1.0 - dot(d, d)), soft = s * s, core = soft * soft * soft * soft;
        float cross = (exp2(-90.0 * disc.x * disc.x) + exp2(-90.0 * disc.y * disc.y)) * max(0.0, 1.0 - length(disc));
        vec4 colour = light * max(mix(soft, core + 0.14 * soft, halo), rays * 0.7 * cross);
        // the night: indigo at the zenith, through violet, down to the dusk's own colours left over the ridge
        float dark = fableDark(up, night) * sky;
        vec3 tone = mix(mix(vec3(0.47, 0.36, 0.56), vec3(0.23, 0.22, 0.47), smoothstep(0.2, 0.55, up)),
          vec3(0.1, 0.13, 0.31), smoothstep(0.5, 1.0, up));
        // the last light over the ridge, warmer as the rest goes dark
        float ember = 0.3 * night * sky * smoothstep(0.16, 0.3, up) * (1.0 - smoothstep(0.3, 0.6, up));
        colour += vec4(tone * dark, dark) * (1.0 - ember) + vec4(1.0, 0.52, 0.42, 1.0) * ember;
        // a grain under one step of the screen's colour: no bands in so slow a gradient
        float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
        gl_FragColor = colour + vec4(vec3(grain / 255.0) * sky * min(1.0, dark * 40.0), 0.0);
      }`,
  });
  const mesh = new Mesh(fableStarQuads(), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -101; // behind the clouds
  scene.add(mesh);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let peak = 0, night = fableNightBase;
  return { tick(dt, climb) {
    // the end's camera comes down to half the tower: the night it earned stays. Only a new run, the climb back at the
    // foot, brings the dusk again
    peak = climb < peak * 0.45 ? climb : Math.max(peak, climb);
    // the owner wants the night and its stars out from the start: the climb only deepens it the last bit
    const want = fableNightBase + (1 - fableNightBase) * Math.min(1, Math.max(0, (peak - fableNightFrom) / (fableNightFull - fableNightFrom)));
    night += (want - night) * Math.min(1, dt * 1.5);
    uniforms.night.value = night;
    if (!reduced.matches) uniforms.seconds.value += dt; // no twinkle
    const ratio = renderer.getPixelRatio();
    uniforms.frame.value.set(canvas.width, canvas.height);
    uniforms.ratio.value = ratio * Math.min(1.4, Math.max(1, canvas.height / ratio / 720)); // a big window: a little bigger
  } };
}
