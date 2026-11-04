// The clip's plaça at night turned rave: the game's paving and façades (scene/models/plaza.js) under a dark sky, an LED
// floor on its own 2 m tiles, moving-head beams from the rooftops, lasers from behind the band's side and flashes on the
// drop. All posed by update(t) from the song's grid; nothing here keeps state between frames.
import * as THREE from 'three';
import { buildPlaza, PAVING } from '/src/scene/models/plaza.js';

const TAU = Math.PI * 2;
const PALETTES = { // per section kind: the floor's and beams' colours
  intro: ['#2b3cff', '#7a2bff'], break: ['#1e6bff', '#8f3dff', '#1ee3ff'], vocal: ['#ff4fa3', '#ff8a2b', '#ffd21e'],
  build: ['#ff2bd6', '#1ee3ff', '#b6ff2b'], hard: ['#ffffff', '#ff1e1e', '#ff1e1e'], drop: ['#ff2b2b', '#ffd21e', '#ff2bd6', '#1ee3ff'], outro: ['#3d2bff', '#1e6bff'],
};
const pal = l => (PALETTES[l] ?? PALETTES.build).map(c => new THREE.Color(c));

// a beam that fades along its length (additive; brightest at the lamp)
function beamMaterial(fall = 1.6) { // fall: how fast it fades away from the lamp
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color() }, power: { value: 0 }, fall: { value: fall } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    // (edge: a cone seen side-on fades at its outline, so its sides read as light, not as flat panels with hard edges)
    vertexShader: 'varying float vL, vE; void main(){ vL = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vE = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; uniform float power, fall; varying float vL, vE; void main(){ gl_FragColor = vec4(color * power * (.25 + .75 * pow(vL, fall)) * pow(vE, 1.5), 1.); }',
  });
}

export function createStage(scene, g, labelOf) {
  scene.background = new THREE.Color('#020309'); scene.fog = new THREE.FogExp2('#03040c', .03);
  const hemi = new THREE.HemisphereLight('#26305a', '#0c0812', .5);
  const key = new THREE.DirectionalLight('#b8c4ff', .6); key.position.set(3, 9, 8); // the figure's moonlight from the front
  const rim = new THREE.PointLight('#ff2bd6', 0, 14, 1.5), fill = new THREE.PointLight('#1ee3ff', 0, 14, 1.5);
  rim.position.set(-3, 3.5, -3); fill.position.set(3.5, 2.5, -2);
  scene.add(hemi, key, rim, fill);
  { // (without the game's band and cobla: they stand at the game's crowd line, inside this clip's floor, and read as a
    // stranger dancing beside her)
    const pl = buildPlaza({ backdrop: 0, balconies: 0 }); pl.band.forEach(p => pl.group.remove(p.g)); scene.add(pl.group, ...pl.props.map(p => p.mesh)); }

  // ---- LED floor: one glowing quad per paving tile (InstancedMesh, colour per tile)
  const S = PAVING.size, T = PAVING.tile, N = S / T, tiles = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) tiles.push({ x: -S / 2 + T * (i + .5), z: -S / 2 + T * (j + .5), i, j });
  const floor = new THREE.InstancedMesh(new THREE.PlaneGeometry(T - .08, T - .08).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), tiles.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  tiles.forEach((t, k) => { floor.setMatrixAt(k, m4.makeTranslation(t.x, .03, t.z)); floor.setColorAt(k, col.setRGB(0, 0, 0)); });
  // the LED panels' glass over the paving: dark grey, not black, so the carriers' black shoes read on the unlit tiles (the owner)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#262838', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  glass.position.y = .015; // (mm above the paving flickered against it: depth precision)
  scene.add(glass, floor);

  // ---- moving heads: 8 lamps on the rooftops round the plaça, each a fading cone aimed at a point near her
  const BEAM_LEN = 16, heads = [];
  const coneGeo = new THREE.CylinderGeometry(.12, 1.5, BEAM_LEN, 24, 1, true).translate(0, -BEAM_LEN / 2, 0);
  // (a cylinder's uv.y is 1 at its top: the narrow end, now at the lamp)
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU + TAU / 16, lamp = new THREE.Group();
    lamp.position.set(Math.sin(a) * 13, 8.5, Math.cos(a) * 13);
    const cone = new THREE.Mesh(coneGeo, beamMaterial()); lamp.add(cone); scene.add(lamp);
    heads.push({ a, lamp, cone });
  }
  // ---- the follow spot (intro, outro): a beam from high above onto her, a pool of light at her feet, a real spot on her
  const followGeo = new THREE.CylinderGeometry(.3, 2.6, 1, 48, 1, true).translate(0, -.5, 0); // (as wide as she is long at the floor: 1.25 m looked cut off)
  const follow = new THREE.Group(), followCone = new THREE.Mesh(followGeo, beamMaterial(.6)); follow.add(followCone); scene.add(follow);
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.6, '#ffffffbb'); gr.addColorStop(.93, '#ffffff22'); gr.addColorStop(1, '#fff0'); /* (radius 2.6 m of 2.8: the cone's foot) */ x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#dfe8ff' })); // (cool white: the warm one read as a beige floor)
  pool.position.y = .045; scene.add(pool);
  const spot = new THREE.SpotLight('#eef2ff', 0, 30, .36, .6, 1); scene.add(spot, spot.target);
  // ---- the façades washed from below in the section's colours (unlit, the plaça read as a black hole behind her)
  const washes = [...Array(6)].map((_, k) => { const a = k / 6 * TAU + .3, l = new THREE.PointLight('#fff', 0, 16, 1.2); l.position.set(Math.sin(a) * 15.5, 1.2, Math.cos(a) * 15.5); scene.add(l); return l; });
  // ---- lasers: two sources behind her (z < 0), a fan of thin beams each
  const lasers = [], laserGeo = new THREE.BoxGeometry(.035, .035, 40).translate(0, 0, 20);
  for (const sx of [-6, 6]) for (let k = 0; k < 7; k++) {
    const m = new THREE.Mesh(laserGeo, new THREE.MeshBasicMaterial({ color: '#39ff6a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(sx, 6.5, -15); scene.add(m); lasers.push({ m, sx, k });
  }

  const aim = new THREE.Vector3();
  // where she stands this frame (the floor ripples from it, the beams aim round it)
  function update(t, at) {
    const ph = g.phraseAt(t), label = labelOf(ph.index) ?? ph.label, P = pal(label), b = Math.max(0, g.beatAt(t)), beat = Math.floor(b), f = b - beat;
    const kick = g.kick(t), hat = g.hat(t), bass = g.level('bass', t);
    const hot = label === 'drop' || label === 'hard'; // the hardstyle passage plays the drop's lights, harder
    const run = g.runOf(ph.index, labelOf), runAt = (b - run.beat) / (run.end - run.beat); // (the whole intro, not its 8-bar chunk: they restarted the fade)
    const fadeIn = label === 'intro' ? runAt : label === 'outro' ? 1 - runAt : 1;

    // floor patterns, as an LED floor plays them: whole tiles on or off, in square rings round the tile she stands on
    const hi = Math.floor((at.x + S / 2) / T), hj = Math.floor((at.z + S / 2) / T), spinBar = ph.beatIn % 16 >= 12;
    for (let k = 0; k < tiles.length; k++) {
      const tl = tiles[k], ring = Math.max(Math.abs(tl.i - hi), Math.abs(tl.j - hj)); let v = 0, c = P[0];
      if (label === 'hard' || (label === 'drop' && spinBar)) { // the spin bar and the hardstyle: the whole floor in two colours, swapping on every beat
        v = Math.pow(1 - f, 2); c = P[(tl.i + tl.j + beat) % 2];
      } else if (label === 'drop') { // a square ring running out from her feet on each beat, a colour a beat
        v = ring === Math.floor(f * 6) ? 1 : ring < Math.floor(f * 6) && ring % 2 === beat % 2 ? .18 : 0; c = P[beat % P.length];
      } else if (label === 'build') { // a checker swapping on the beat, brighter as the phrase climbs; the last two bars close in on her
        const closing = ph.end - b <= 8 ? 8 - Math.floor(ph.end - b) : -1;
        v = (tl.i + tl.j + beat) % 2 ? 0 : .3 + .5 * ph.at; c = P[(tl.i + beat) % P.length];
        if (closing >= 0) v = ring === 7 - closing ? 1 : ring > 7 - closing ? 0 : v;
      } else if (label === 'break' || label === 'vocal') { // slow diagonal bands of colour crossing the whole floor, a band a bar (lone lit tiles read as a bare floor)
        const w = (tl.i - tl.j) / 4 - b / 4; v = .12 + .38 * Math.max(0, Math.sin(w * Math.PI)) ** 2; c = P[((Math.floor(w) % P.length) + P.length) % P.length];
      } // intro, outro: the floor is dark (the follow spot's pool lights her)
      floor.setColorAt(k, col.copy(c).multiplyScalar(v * fadeIn));
    }
    floor.instanceColor.needsUpdate = true;

    // the follow spot and the floor's glass: the intro and outro are hers alone, on a near-black floor
    const alone = label === 'intro' || label === 'outro', fs = alone ? fadeIn * .8 + .2 : 0;
    follow.visible = pool.visible = fs > 0;
    if (fs) {
      follow.position.set(at.x, 13, at.z); aim.set(at.x, 0, at.z); follow.rotation.set(0, 0, 0); // straight down: its footprint is the round pool (slanted it was an ellipse over a circle)
      followCone.scale.set(1, follow.position.distanceTo(aim), 1);
      const u = followCone.material.uniforms; u.color.value.set('#dfe8ff'); u.power.value = .22 * fs;
      pool.position.x = at.x; pool.position.z = at.z; pool.material.opacity = .45 * fs;
    }
    spot.position.copy(follow.position); spot.target.position.set(at.x, 1.2, at.z); spot.intensity = 260 * fs;
    glass.material.color.set(alone ? '#0e0f16' : '#262838'); // (cool dark grey: the warm one read beige)
    for (const [k, l] of washes.entries()) { l.color.copy(P[k % P.length]); l.intensity = (alone ? 18 : 40 + bass * 30) * (label === 'intro' ? runAt : 1); }

    // beams: off in the intro, slow sweeps in breaks, crossing on the beat in the drop
    const beamOn = label === 'intro' ? 0 : label === 'outro' ? fadeIn * .6 : hot ? .9 + kick * .6 : label === 'build' ? .45 + .35 * ph.at : .35;
    for (const [n, h] of heads.entries()) {
      const sweep = hot ? Math.sin(b * Math.PI / 2 + h.a * 2) : Math.sin(b * TAU / 32 + h.a);
      aim.set(at.x + Math.sin(h.a + sweep) * 4, 0, at.z + Math.cos(h.a + sweep * .7) * 4);
      h.lamp.lookAt(aim); h.lamp.rotateX(-Math.PI / 2); // the cone hangs along -y: point -y at the target
      const u = h.cone.material.uniforms; u.color.value.copy(P[n % P.length]);
      u.power.value = beamOn * (hot && (beat + n) % 2 ? .35 : 1) * .55;
    }
    // lasers: only in the drop and a build's second half; the fan opens and closes on the bar
    const laserOn = hot ? 1 : label === 'build' && ph.at > .5 ? (ph.at - .5) * 2 * .6 : 0;
    for (const l of lasers) {
      const spread = (l.k - 3) * (.08 + .07 * Math.sin(b * Math.PI / 4)), tilt = -.18 + .12 * Math.sin(b * Math.PI / 8 + l.sx);
      l.m.rotation.set(tilt, spread + (l.sx < 0 ? .25 : -.25), 0);
      l.m.material.opacity = laserOn * (.55 + hat * .45); l.m.visible = laserOn > 0;
      l.m.material.color.set(hot && beat % 8 >= 4 ? '#ff2bd6' : '#39ff6a');
    }
    // the light on her (the flashes are fx.js's screen layer)
    hemi.intensity = .45 + kick * (hot ? .4 : .15);
    key.intensity = .35 + .45 * fadeIn;
    rim.color.copy(P[0]); rim.intensity = (8 + bass * 22) * fadeIn; fill.color.copy(P[1 % P.length]); fill.intensity = (6 + kick * 26) * fadeIn;
    scene.fog.density = .022 + (hot ? .008 * kick : 0);
    return { label, ph, tint: P[beat % P.length] };
  }
  return { update };
}
