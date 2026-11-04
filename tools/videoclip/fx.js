// The clip's atmosphere and hits: low haze the beams cut through, CO2 jets that fire when a drop lands, and a screen
// layer drawn over each format's frame (a white flash, a blackout, a vignette). Particles move in their shaders from
// the song second (pure: no state between frames). The flashes stay at or under one a beat (2.7 Hz at 164 bpm): faster
// flashing risks photosensitive viewers and fails YouTube's and broadcast guidelines.
import * as THREE from 'three';
import { seeded } from './grid.js';

const ease = x => x * x * (3 - 2 * x);
// a soft round puff, alpha from the point's centre
const PUFF = 'float d = length(gl_PointCoord - .5) * 2.; if (d > 1.) discard; float a = (1. - d) * (1. - d);';

export function createFx(scene, g, labelOf) {
  const rnd = seeded(11);
  // ---- haze: slow puffs hanging over heads' height (lower, they covered the LED floor), tinted by the light of the moment
  const N = 260, seeds = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const r = Math.sqrt(rnd()) * 9, a = rnd() * Math.PI * 2; seeds.set([Math.sin(a) * r, 1.2 + rnd() * 2.6, Math.cos(a) * r, rnd()], i * 4); }
  const hazeGeo = new THREE.BufferGeometry();
  hazeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); hazeGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const haze = new THREE.Points(hazeGeo, new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, tint: { value: new THREE.Color() }, density: { value: 0 }, scale: { value: 800 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 seed; uniform float t, scale; varying float vS;
      void main(){ vec3 p = seed.xyz + vec3(sin(t * .07 + seed.w * 40.) * 1.2, sin(t * .11 + seed.w * 9.) * .25, cos(t * .05 + seed.w * 23.) * 1.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = scale * (1.4 + seed.w * 1.2) / -mv.z;
        vS = seed.w * smoothstep(2., 5., -mv.z); }`,
    fragmentShader: `uniform vec3 tint; uniform float density; varying float vS; void main(){ ${PUFF} gl_FragColor = vec4(tint * a * density * (.6 + .4 * vS), 1.); }`,
  }));
  haze.frustumCulled = false; scene.add(haze);

  // ---- CO2 jets: four cannons at the floor's edge, a column of white each burst
  const JETS = [[-3.6, -3.6], [3.6, -3.6], [-4.2, 2.4], [4.2, 2.4]], M = 260, jet = new Float32Array(JETS.length * M * 4);
  JETS.forEach(([x, z], j) => { for (let i = 0; i < M; i++) jet.set([x, z, rnd(), rnd()], (j * M + i) * 4); });
  const jetGeo = new THREE.BufferGeometry();
  jetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(JETS.length * M * 3), 3)); jetGeo.setAttribute('seed', new THREE.BufferAttribute(jet, 4));
  const jets = new THREE.Points(jetGeo, new THREE.ShaderMaterial({
    uniforms: { age: { value: 9 }, scale: { value: 800 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 seed; uniform float age, scale; varying float vA;
      void main(){ float k = clamp(age - seed.z * .25, 0., 3.), h = 7. * (1. - exp(-k * 2.2)), spread = .15 + h * .12;
        vec3 p = vec3(seed.x + (seed.w - .5) * spread, h * (.35 + .65 * seed.w), seed.y + (fract(seed.w * 7.) - .5) * spread);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = scale * (.8 + h * .25) / -mv.z;
        vA = (k > 0. ? exp(-k * 1.4) : 0.) * smoothstep(1.5, 4., -mv.z) * (1. - smoothstep(2.5, 3.5, age)); } // (gone after 3.5 s: a faint column stayed forever)`,
    fragmentShader: `varying float vA; void main(){ ${PUFF} gl_FragColor = vec4(vec3(.92, .94, 1.), a * vA * .3); }`,
  }));
  jets.frustumCulled = false; scene.add(jets);
  // when the jets last fired: the first beat of every drop phrase and every 8 bars inside it
  const bursts = g.phrases.flatMap((p, i) => [p.beat, p.beat + 32].filter(b => b < p.end).map(b => ({ b, i })));

  // ---- the screen layer: flash, blackout, vignette (an orthographic quad drawn over each frame)
  const overlay = new THREE.Scene(), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { flash: { value: 0 }, black: { value: 0 }, vignette: { value: .35 }, aspect: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform float flash, black, vignette, aspect; varying vec2 vUv;
      void main(){ vec2 c = (vUv - .5) * vec2(max(aspect, 1.), max(1. / aspect, 1.)); float v = smoothstep(.35, .95, length(c)) * vignette;
        // over the frame C: C (1 - dark)(1 - flash) + flash, as one alpha blend
        float dark = 1. - (1. - v) * (1. - black), a = 1. - (1. - dark) * (1. - flash); gl_FragColor = vec4(vec3(a > 0. ? flash / a : 0.), a); }`,
  }));
  overlay.add(screen);

  function update(t, label, ph, tint) {
    const hot = label === 'drop' || label === 'hard';
    const b = g.beatAt(t), beat = Math.floor(b), f = b - beat, left = ph.end - b, nx = labelOf(ph.index + 1) ?? g.phrases[ph.index + 1]?.label, next = nx === 'hard' ? 'drop' : nx;
    haze.material.uniforms.t.value = t; haze.material.uniforms.tint.value.copy(tint);
    haze.material.uniforms.density.value = (hot ? .06 : label === 'build' ? .035 + .03 * ph.at : label === 'intro' ? 0 : .045); // (more washed the LED floor out; none in the intro: its puffs read as streaks)
    let last = null; for (const x of bursts) { const xl = labelOf(x.i) ?? g.phrases[x.i].label; if ((xl === 'drop' || xl === 'hard') && x.b <= b) last = x; }
    jets.material.uniforms.age.value = last ? (b - last.b) * g.P : 9;
    // the hits: blackout on the last beat before a drop, a white flash as it lands, a flash a beat on its first bar and
    // on each bar's downbeat after that; a flash on each bar of a build's last four
    let flash = 0, black = 0;
    if (next === 'drop' && left <= 1) black = ease(Math.min(1, (1 - left) * 3)) * .96;
    if (label === 'hard') flash = f < .12 ? .7 : 0; // every beat, at the one-a-beat limit
    else if (label === 'drop') flash = (ph.beatIn < 4 || beat % 4 === 0) && f < .12 ? (ph.beatIn < 1 ? 1 : .6) : 0; // dry: on for the beat's first 12%, then gone
    if (label === 'build' && left <= 16 && left > 1 && beat % 4 === 0) flash = f < .1 ? .35 : 0;
    // (no flash on the shouts: their full-screen words are the hit, textfx.js; under a word the flash washed it out)
    const u = screen.material.uniforms; u.flash.value = flash; u.black.value = black; u.vignette.value = hot ? .5 : .35;
    base = { flash, black };
    return base;
  }
  // a cut's dip through black (shots.js), over this frame only
  let base = { flash: 0, black: 0 };
  const dip = v => { screen.material.uniforms.black.value = Math.max(base.black, v); };
  // a format's frame: the puffs' size in its pixels (px per m at 1 m: half the height over tan(fov / 2))
  const view = (height, fov) => { for (const m of [haze.material, jets.material]) m.uniforms.scale.value = height / 2 / Math.tan(fov * Math.PI / 360) * .5; };
  // draw the screen layer over what the renderer just drew (same viewport)
  function overlayDraw(renderer, aspect) { screen.material.uniforms.aspect.value = aspect; const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(overlay, ortho); renderer.autoClear = ac; }
  return { update, view, dip, overlayDraw };
}
