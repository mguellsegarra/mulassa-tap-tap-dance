// The tower in 3D: flat solid slabs whose colour drifts a step each floor through the Plaça del Blat's warm palette, so
// every course reads on its own and the cut is plain to see. An offcut falls whole, out of the frame; a new slab fades in; a perfect
// drop sends a ring out from the top; at the end the camera looks close at the top, then eases back to the whole tower.
// The tower stands on the campanar de Valls' stone from the start; five floors under the top, each course turns into it
// for good, cut to its body's plan (facade.js; textures/, a short white flash). When the tower falls, the floors still
// in colour turn too, one wave up, and the crown grows on the top floor: the tiled pyramid and the small bronze cage.
// The sky and the town are the page's background (style.css), so the canvas is transparent.
import { WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Mesh, Group, MeshLambertMaterial,
  Vector3 } from 'three';
import { SIZE, FLOOR } from './rules.js';
import { colorOf } from './palette.js';
import { createFacade } from './facade.js';
import { box, campanarFoot } from './stone.js';
import { setCopingInner, terraceRail } from './coping.js';
import { createOpenings } from './openings.js';
import { buildCampanarHead, makeStoneSpire, makePinnacles, makeWeathering, disposeCampanarOrnaments } from './crown.js';
import { sameCampanarPlan } from './bodies.js';
import { createFall } from './fall.js';
import { skySettings, skyPan } from './sky.js';
import { createTowerTurn } from './turn.js';
import { endShot, stepEndShot, widenEndShot } from './end-camera.js';
import { createClouds } from './clouds-astra.js';
import { createStars } from './stars-fable.js';
import { STACK_TRY, STACK_LENS, STACK_ZOOM } from './stack.js';
import { createFoot } from './peu.js';
import { perfectEffect, perfectSettle, squareSettle, PERFECT_MARK } from './perfect.js';
import { pixelRatio } from '#plassa/quality.js';

// ?zoom=N puts the camera N times as far (1: the reference game's framing)
const ZOOM = +new URLSearchParams(location.search).get('zoom') || (STACK_TRY ? STACK_ZOOM : 1); // ?stack: far off, a long lens (stack.js)
const VIEW = new Vector3(2.3, 2.3, 2.3).multiplyScalar(SIZE * ZOOM); // the camera's offset from the top
const easeOut = t => 1 - (1 - t) ** 3;

export function createScene(canvas) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(46, 1, 0.1, STACK_TRY ? 2000 : 400);
  // the sky behind the tower: a night's clouds (Astra's) under Fable's stars
  const clouds = createClouds(scene, camera, renderer, { night: 0.8 }), stars = createStars(scene, camera, renderer);
  // light from above and a fixed sun: from the end's first view the top, the left and the right faces in three tones
  scene.add(new HemisphereLight('#ffffff', '#8a7a6a', 2.2));
  const side = new DirectionalLight('#fff4e0', 1.1);
  side.position.set(0, 0, 2);
  scene.add(side);
  const weather = new Group(); // the weatherings on the settled floors' bare tops (crown.js)
  scene.add(weather);
  let turning = [], holdTurns = 0; // the settled floors still to turn to stone, one a frame (no long frame on the tap); s held
  let slabs = [], fx = [], moving = null, camY = 0, aimY = 0, outro = null, crown = null, plan = createFacade();
  const freeLook = createTowerTurn(Math.atan2(VIEW.x, VIEW.z)); // the end's free look round the tower (turn.js)
  // lift: the shares of the screen's top and bottom kept clear (the end's words, its buttons), eased;
  // aside: the picture moved right by that share of the width (the wide home), eased too
  let lift = [0, 0], lifted = [0, 0], aside = 0, asided = 0, snapping = 0; // snapping: the last perfect's settling time

  // floor n's slab, fading in over 0.25 s (opaque again after: no sorting); the run's first one comes down into place
  // from a little above over 0.5 s, so it arrives instead of popping up
  function slab(n, { x, z, w, d }, y, first = false) {
    const enter = first ? 0.5 : 0.25, lift = first ? FLOOR * 2.5 : 0;
    const m = new Mesh(box, new MeshLambertMaterial({ color: colorOf(n), transparent: true, opacity: 0 }));
    m.scale.set(w, FLOOR, d);
    m.position.set(x, y + FLOOR / 2 + lift, z);
    m.userData.n = n;
    scene.add(m);
    fx.push({ m, tick: t => {
      const k = Math.min(1, t / enter);
      m.material.opacity = easeOut(k);
      if (lift) m.position.y = y + FLOOR / 2 + lift * (1 - easeOut(k));
      if (k === 1) m.material.transparent = false;
      return k < 1;
    } });
    return m;
  }
  // a piece that falls whole and solid, a rigid block (fall.js) pushed a little outward: it bounces off the ledges and
  // terraces under it, tips over their edges, hops off one it settles on, and drops far below the frame and goes
  function tumble(m, axis, side) {
    fx = fx.filter(e => e.m !== m); // a fade in still running would leave it see-through
    m.material.opacity = 1;
    m.material.transparent = false;
    const other = axis === 'x' ? 'z' : 'x', below = m.position.y - FLOOR / 2 + 1e-6;
    const body = createFall({ u: m.position[axis], y: m.position.y, w: m.scale[axis], h: FLOOR, vu: 0.25 * SIZE * side }, side, 9 * SIZE);
    // the tops it can meet: the slabs under where it started, across its own width
    const topOf = s => (s === base ? 0 : s.position.y + FLOOR / 2); // not scale.y: a turning slab swells for a moment
    const ledges = () => [base, ...slabs].filter(s => s.visible && topOf(s) <= below
      && Math.abs(s.position[other] - m.position[other]) < (s.scale[other] + m.scale[other]) / 2)
      .map(s => [s.position[axis] - s.scale[axis] / 2, s.position[axis] + s.scale[axis] / 2, topOf(s)]);
    fx.push({ m, tick: (t, dt) => {
      const b = body.step(dt, ledges());
      m.position[axis] = b.u;
      m.position.y = b.y;
      m.rotation[other] = axis === 'x' ? b.a : -b.a;
      return b.y > -12 * SIZE || (gone(m), false);
    } });
  }

  const base = campanarFoot(); // the foot, down out of sight (stone.js)
  scene.add(base);
  const peu = createFoot(scene, base); // fading into the valley, sunk at the home (peu.js)
  const openings = createOpenings(scene); // what a settled floor wears: the bell chamber's openings and bells (openings.js)

  // a placed slab turns to stone (or, already stone, to another course): a white flash fading out, a small swell
  function turn(m, key, batter) {
    const was = m.userData.stone, id = idOf(key, m, batter);
    if (was === id) return [];
    if (was) m.geometry.dispose();
    m.userData.stone = id;
    for (const x of [m.material].flat()) x.dispose();
    const mats = m.material = openings.dress(m, key, batter); // its geometry and faces, the bell chamber's pierced
    const glow = [...mats, ...openings.flashing(key)];
    fx.push({ m, tick: t => { // a white flash fading into the stone, and a small swell
      const k = Math.min(1, t / 0.35);
      for (const x of glow) x.emissiveIntensity = 0.9 * (1 - k) ** 2;
      const sw = 1 + 0.06 * Math.sin(Math.PI * k);
      m.scale.y = FLOOR * sw;
      return k < 1;
    } });
    return glow; // what flashes: pieces built with it join in
  }
  // what a slab wears: its course, its plan (its body's) and its batter
  const idOf = (key, m, b) => `${key}|${m.position.x},${m.position.z},${m.scale.x},${m.scale.z}|${b ? [b.x, b.z, b.w, b.d] : ''}`;
  const built = () => slabs.map(m => m.userData.built);
  // a slab takes its settled course: cut to its body's plan, then turned
  function settleSlab(m, c, r) {
    m.scale.set(r.w, m.scale.y, r.d);
    m.position.set(r.x, m.position.y, r.z);
    const glow = turn(m, c.key, c.batter);
    // the floors still in colour that will wear this body's plan, or the next one's it slopes in to, take it now: no
    // colour over narrower stone
    for (const [j, p] of c.ahead ?? []) {
      const s = slabs[j];
      if (s && !s.userData.settled) { s.scale.set(p.w, s.scale.y, p.d); s.position.set(p.x, s.position.y, p.z); }
    }
    m.userData.settled = { rect: r, batter: c.batter };
    // the floor below, settled before it, gets its weathering where this one leaves its top bare (none under a glacis),
    // or round a wide terrace a balustrade (coping.js)
    const under = slabs[slabs.indexOf(m) - 1]?.userData.settled, y = m.position.y - FLOOR / 2;
    setCopingInner(slabs[slabs.indexOf(m) - 1] ?? base, r); // and the shadow at this wall's foot on its top
    const rail = under && !under.batter && terraceRail(under.rect, r, y), w = under && !under.batter && !rail && makeWeathering(under.rect, r, y, FLOOR * 0.6);
    if (rail) glow.push(...openings.terrace(rail, c.key));
    if (w) weather.add(w);
  }
  const gone = m => { scene.remove(m); for (const x of [m.material].flat()) x.dispose(); if (m.userData.stone) m.geometry.dispose(); };

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(pixelRatio(w, h));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = 2 * Math.atan(Math.tan(STACK_TRY ? STACK_LENS : 0.4) * Math.max(1, h / w / 1.6)) * 180 / Math.PI; // a tall phone widens it
    camera.updateProjectionMatrix();
  }
  resize();

  return {
    resize,
    reset() {
      for (const m of slabs) gone(m);
      for (const w of [...weather.children]) { weather.remove(w); w.geometry.dispose(); w.material.dispose(); }
      for (const e of fx) if (e.m?.parent) gone(e.m);
      if (moving?.parent) gone(moving);
      if (crown) { scene.remove(crown); disposeCampanarOrnaments(crown); }
      openings.reset();
      slabs = []; turning = []; fx = []; moving = null; outro = null; crown = null; plan = createFacade();
      lift = [0, 0]; lifted = [0, 0];
      camera.clearViewOffset();
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      camY = aimY = 0;
      freeLook.reset();
    },
    // the slab in the player's hands: floor n's colour, the floor below's size
    moving(n, rect, y) { moving = slab(n, rect, y, n === 1); },
    slide(axis, v) { if (moving) moving.position[axis] = v; },
    // axis, v: the slab's travel and speed as it was dropped
    // landed: after a cut, what stood on the floor below: the slab rests there a moment, then squares onto the axis
    place(rect, axis, v = 0, landed = null) {
      const m = moving, from = m.position[axis], whole = !landed; // whole: a perfect
      moving.scale.set(rect.w, FLOOR, rect.d);
      moving.position.x = rect.x;
      moving.position.z = rect.z;
      const settle = whole ? perfectSettle(m, rect, axis, from, v) : squareSettle(m, landed, rect); // its mark waits
      if (settle) fx.push({ tick: settle });
      snapping = holdTurns = whole && settle ? PERFECT_MARK : 0; // the floors below turn to stone with the mark, not before it
      moving.userData.built = { ...rect };
      slabs.push(moving);
      aimY = moving.position.y + FLOOR / 2;
      moving = null;
      while (plan.ready(built())) { // settled for good (facade.js); the floors too thin for bells stay in colour till the spire
        const i = plan.settled, c = plan.settle(built());
        // queued: turned on the next frame, not inside the tap
        if (c.key !== 'agulla') turning.push(() => settleSlab(slabs[i], c, c.rect));
      }
    },
    // the end: one wave up, each floor still in colour takes its place in the real campanar (facade.js) once, each(i) for
    // its sound; then the crown grows over the top, done() for its sound. Nothing already stone changes
    turnAll(each, done) {
      while (turning.length) turning.shift()(); // the floors still waiting turn now, before the wave
      const { courses, rects, cap } = plan.finish(built()); // the floors still in colour settle; the top is laid
      const steps = slabs.map((m, i) => [m, courses[i], rects[i]])
        .filter(([m, c, r]) => c.key !== 'agulla' && m.userData.stone !== idOf(c.key, { position: r, scale: { x: r.w, z: r.d } }, c.batter));
      const gap = Math.min(70, 1200 / Math.max(1, steps.length));
      steps.forEach(([m, c, r], i) => setTimeout(() => { if (m.parent) { settleSlab(m, c, r); each(i); } }, 350 + i * gap));
      const rect = rects[rects.length - 1] ?? { x: 0, z: 0, w: SIZE, d: SIZE };
      setTimeout(() => {
        if (crown || outro === null) return; // a new run already
        crown = new Group();
        const tops = slabs.map(m => m.position.y + FLOOR / 2), parapet = rects[cap] ?? rects[0] ?? rect;
        const thin = courses.filter(c => c.key === 'agulla').length, parts = [];
        if (thin) { // the floors too thin for bells go under an octagonal spire as tall as them (crown.js), centred on the parapet
          for (let i = cap + 1; i < slabs.length; i++) slabs[i].visible = false;
          const spire = makeStoneSpire(parapet, tops[cap], thin * FLOOR), slope = makeWeathering(parapet, spire.foot, tops[cap], FLOOR * 0.4);
          parts.push(spire.g, makePinnacles(parapet, tops[cap]));
          if (slope) crown.add(slope);
        } else parts.push(buildCampanarHead(parapet, tops[cap] ?? 0), makePinnacles(parapet, tops[cap]));
        crown.add(...parts);
        scene.add(crown);
        done();
        fx.push({ m: null, tick: t => { // each grows up out of its place with a little overshoot
          const k = Math.min(1, t / 0.45), s = k < 1 ? 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) * 2 - (1 - k) ** 3 : 1;
          for (const x of parts) x.scale.set(1, Math.max(0.01, s), 1);
          if (k === 1) { // the cuts have settled; only the uncovered tops and the four walls can show
            if (outro) widenEndShot(outro); // grown: the camera eases out to the whole tower (end-camera.js)
            for (let i = 0; i <= cap; i++) {
              const geo = slabs[i].geometry;
              const covered = i < cap && sameCampanarPlan(courses[i].batter ?? rects[i], rects[i + 1]);
              geo.groups = geo.groups.filter(face => face.materialIndex !== 3 && !(covered && face.materialIndex === 2));
            }
          }
          return k < 1;
        } });
      }, 350 + steps.length * gap + 120);
    },
    fall(n, rect, y, axis, side) {
      const m = slab(n, rect, y);
      fx.pop(); // already whole: no fade in
      m.material.opacity = 1;
      tumble(m, axis, side);
    },
    missMoving(axis, side) {
      if (moving) tumble(moving, axis, side);
      moving = null;
    },
    // a perfect drop: a flat ring of the slab's colour widens from its top and fades in 0.6 s, a little wider each in a row
    ripple(n, rect, y, streak) { // a perfect drop's mark (perfect.js), once the slab has settled over it
      const wait = snapping, add = (m, tick) => { m.visible = !wait; scene.add(m); fx.push({ m, tick: t => t < wait || (m.visible = true, tick(t - wait)) || (gone(m), false) }); };
      perfectEffect(add, colorOf(n), rect, y, streak);
    },
    // the end: the camera eases to the top, close, then back until the whole tower fits (end-camera.js); per device
    // (sky.js), the share of its height kept over the aim, and its lens
    pullOut() {
      outro = endShot(camY, aimY, half => Math.max(1, half / Math.tan(camera.fov * Math.PI / 360) / VIEW.length()), skySettings());
    },
    // keep the top and bottom shares of the screen clear: the whole tower is framed in the space between
    lift(top, bottom) { lift = [top, bottom]; },
    aside(share) { aside = share; },
    home: on => peu.home(on),
    look: freeLook.drag, // the end's free look (turn.js)
    letGo: freeLook.letGo,
    frame(dt) {
      if ((holdTurns -= dt) <= 0) turning.shift()?.();
      openings.tick(); // the clock's hands follow the device's time
      for (const e of fx) e.alive = e.tick(e.age = (e.age ?? 0) + dt, dt);
      fx = fx.filter(e => e.alive);
      let k = 1, tilt = 1;
      if (outro) {
        stepEndShot(outro, dt);
        camY = outro.y; k = outro.k; tilt = outro.tilt;
        if (camera.zoom !== outro.zoom) { camera.zoom = outro.zoom; camera.updateProjectionMatrix(); }
      } else camY += (aimY - camY) * (1 - Math.exp(-Math.log(2) / 0.25 * dt)); // half the way every 0.25 s
      lifted = lifted.map((v, i) => v + (lift[i] - v) * Math.min(1, dt * 6));
      asided += (aside - asided) * Math.min(1, dt * 5); // from the home's side to the middle in about half a second, no jump
      peu.tick(dt);
      const [lt, lb] = lifted;
      if (lt + lb > 0.001 || Math.abs(asided) > 0.0005) { // farther, so it fits the space left; the picture shifted to that space's middle
        k /= 1 - lt - lb;
        const w = renderer.domElement.width, h = renderer.domElement.height;
        camera.setViewOffset(w, h, -w * asided, h * (lb - lt) / 2, w, h);
      } else camera.clearViewOffset();
      const across = Math.hypot(VIEW.x, VIEW.z) * k;
      // near a quarter of the way in, not 0.1: the clocks' and windows' millimetres off the wall stop blinking from afar
      if (Math.abs(camera.near - across / 4) > camera.near * 0.01) { camera.near = across / 4; camera.updateProjectionMatrix(); }
      freeLook.place(camera, across, VIEW.y * k * tilt, camY, dt);
      camera.lookAt(0, camY - 0.3 * SIZE, 0);
      clouds.tick(dt, camY, skyPan(freeLook.spin)); // the end's turn: the sky's round, its clouds and stars go with it
      stars.tick(dt, camY, skyPan(freeLook.spin));
      renderer.render(scene, camera);
    },
    get climb() { return camY; },
    get pan() { return skyPan(freeLook.spin); },
    get settled() { return Math.abs(asided - aside) < 0.05 && peu.risen; }, // the tower risen: the first slab comes down as it ends
  };
}
