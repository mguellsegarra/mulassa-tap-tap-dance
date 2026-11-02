// The three.js side: a plaça floor, the cards and their moves. Knows nothing about the rules.
import * as THREE from 'three';
import { bestGrid, CARD } from './game.js';
import { frontCanvas, backCanvas } from './card-art.js';
import { pictureOf } from './figures.js';

const CW = CARD.w, CH = CARD.h, GAP = CARD.gap, THICK = .12, TILT = THREE.MathUtils.degToRad(14);
const SHARPEN = '-0.9'; // mipmap bias, chosen comparing captures at retina density
const CONFETTI = ['#c0283c', '#f5c518', '#fff3d6', '#14b8a6', '#ff7a1a'];
const still = matchMedia('(prefers-reduced-motion: reduce)');
const ease = t => t * t * (3 - 2 * t);

function cardShape() {
  const r = .28, x = CW / 2, y = CH / 2, s = new THREE.Shape();
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0);
  s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2);
  s.lineTo(-x + r, y); s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + r); s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

function faceGeometry(shape) {
  const g = new THREE.ShapeGeometry(shape, 8), uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / CW + .5, p.getY(i) / CH + .5);
  return g;
}

function tileTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (const [x, y, fill] of [[0, 0, '#4f3322'], [128, 0, '#452b1c'], [0, 128, '#452b1c'], [128, 128, '#4f3322']]) { g.fillStyle = fill; g.fillRect(x, y, 128, 128); }
  g.strokeStyle = '#2a1a10'; g.lineWidth = 5; g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export async function createBoard(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); // throws without WebGL: main.js shows it
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, 1, 1, 900);
  scene.background = new THREE.Color('#140c07');
  scene.add(new THREE.HemisphereLight('#fff3d6', '#6b4a32', 2.1));
  const sun = new THREE.DirectionalLight('#fff3d6', 1.4);
  sun.position.set(-8, 30, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 70 });
  sun.shadow.radius = 4; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ map: tileTexture() }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -THICK / 2 - .01; floor.receiveShadow = true; scene.add(floor);

  // Loop: draws only while something moves. Clearing `active` abandons every running move for good (a restart):
  // whoever awaits one never resumes, so no late flip-back can touch the new game.
  const active = new Set();
  let looping = false;
  const draw = () => renderer.render(scene, camera);
  const frame = now => {
    for (const m of active) {
      m.start ??= now;
      const p = m.ms ? Math.min(1, (now - m.start) / m.ms) : 1;
      m.step(p);
      if (p === 1) { active.delete(m); m.done(); }
    }
    draw();
    if ((looping = active.size > 0)) requestAnimationFrame(frame);
  };
  const tween = (ms, step = () => {}) => new Promise(done => {
    active.add({ ms: still.matches ? 0 : ms, step, done, start: null });
    if (!looping) { looping = true; requestAnimationFrame(frame); }
  });
  canvas.addEventListener('webglcontextrestored', draw);

  // Art
  const campanar = new Image(); campanar.src = '/jocs/memory/cards/back.svg';
  await Promise.all([document.fonts.load("800 40px 'Baloo 2'"), campanar.decode()]);
  // Sharper when a card is drawn small: the GPU's default mipmap level blurs the picture and its name.
  const crisp = m => {
    m.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
        diffuseColor *= texture2D(map, vMapUv, ${SHARPEN});
      #endif`); };
    return m;
  };
  const material = source => {
    const t = new THREE.CanvasTexture(source); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return crisp(new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0 })); // the picture itself lights up: hover()
  };
  let fronts = new Map(); // only the current level's: 30 canvases at once are too much GPU memory for a phone
  const backMat = material(backCanvas(campanar));
  const edgeMat = new THREE.MeshLambertMaterial({ color: '#7a5a1c' }), edgeWon = new THREE.MeshLambertMaterial({ color: '#f5c518', emissive: '#a87a10' });

  // Cards: a holder that lies on the floor and is flipped around its long side.
  const shape = cardShape();
  const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false, curveSegments: 8 });
  edgeGeo.rotateX(-Math.PI / 2); edgeGeo.translate(0, -THICK / 2, 0);
  const frontGeo = faceGeometry(shape); frontGeo.rotateX(-Math.PI / 2); frontGeo.translate(0, THICK / 2 + .006, 0);
  const backGeo = faceGeometry(shape); backGeo.rotateZ(Math.PI); backGeo.rotateX(Math.PI / 2); backGeo.translate(0, -THICK / 2 - .006, 0);
  let cards = [];
  const makeCard = () => {
    const holder = new THREE.Group(), edge = new THREE.Mesh(edgeGeo, edgeMat), front = new THREE.Mesh(frontGeo), back = new THREE.Mesh(backGeo, crisp(backMat.clone())); // one per card, sharing the texture: each lights up alone
    edge.castShadow = true; holder.add(edge, front, back); holder.rotation.z = Math.PI; scene.add(holder);
    return { holder, edge, front, back };
  };
  const confetti = new THREE.Group(); scene.add(confetti);
  const clearConfetti = () => { for (const m of [...confetti.children]) { m.geometry.dispose(); m.material.dispose(); m.dispose(); confetti.remove(m); } };

  let bw = 0, bh = 0;
  const corners = (x, z, w, h) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => new THREE.Vector3(x + a * w / 2, THICK / 2, z + b * h / 2).project(camera));

  const board = {
    // Loads a level's pictures and sets out its cards. Rejects if a picture can't load.
    async setLevel(figures, count) {
      const list = [...new Set(figures)];
      const pictures = await Promise.all(list.map(async x => { const i = new Image(); i.src = pictureOf(x); await i.decode(); return i; }));
      active.clear(); clearConfetti();
      for (const m of fronts.values()) { m.map.dispose(); m.dispose(); }
      fronts = new Map(list.map((x, i) => [x, material(frontCanvas(x, pictures[i]))]));
      for (const c of cards) { scene.remove(c.holder); c.front.material.dispose(); c.back.material.dispose(); }
      cards = Array.from({ length: count }, makeCard);
      for (const c of cards) c.holder.position.y = 1e4; // out of sight until deal(): layout() draws in between
    },

    // Fits the board inside `rect` (px) and returns each card's rectangle on the screen.
    layout(rect) {
      const W = innerWidth, H = innerHeight;
      renderer.setSize(W, H, false);
      const count = cards.length;
      const { cols, rows } = bestGrid(count, rect.width, rect.height, CW, CH, GAP);
      bw = cols * CW + (cols - 1) * GAP; bh = rows * CH + (rows - 1) * GAP;
      cards.forEach((c, i) => {
        const row = Math.floor(i / cols), inRow = row === rows - 1 ? count - row * cols : cols;
        c.holder.position.set((i % cols - (inRow - 1) / 2) * (CW + GAP), c.holder.position.y, (row - (rows - 1) / 2) * (CH + GAP));
      });
      camera.aspect = W / H; camera.clearViewOffset(); camera.updateProjectionMatrix();
      const box = points => {
        const xs = points.map(p => (p.x + 1) / 2 * W), ys = points.map(p => (1 - p.y) / 2 * H);
        return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
      };
      const place = d => { camera.position.set(0, d * Math.cos(TILT), d * Math.sin(TILT)); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); return box(corners(0, 0, bw, bh)); };
      let lo = 5, hi = 800; // perspective has no closed form for the near edge: search the closest camera that fits
      for (let i = 0; i < 24; i++) {
        const d = (lo + hi) / 2, b = place(d);
        if (b.right - b.left <= rect.width && b.bottom - b.top <= rect.height) hi = d; else lo = d;
      }
      const b = place(hi);
      camera.setViewOffset(W, H, (b.left + b.right) / 2 - (rect.left + rect.right) / 2, (b.top + b.bottom) / 2 - (rect.top + rect.bottom) / 2, W, H);
      camera.updateMatrixWorld();
      draw();
      return cards.map(c => box(corners(c.holder.position.x, c.holder.position.z, CW, CH)));
    },

    // A new game: every card face down, dropping in one after another.
    deal(game) {
      active.clear(); clearConfetti();
      return Promise.all(cards.map((c, i) => {
        c.front.material.dispose();
        c.front.material = crisp(fronts.get(game.cards[i].figure).clone());
        c.back.material.emissiveIntensity = 0;
        c.edge.material = edgeMat;
        c.holder.rotation.set(0, 0, Math.PI); c.holder.scale.setScalar(1);
        // from above the camera, so none is seen waiting; quick past the lens, slowing onto the table
        const from = camera.position.y * 1.3;
        c.holder.position.y = from;
        return tween(i * Math.min(35, 900 / cards.length)).then(() => tween(520, p => { c.holder.position.y = from * (1 - p) ** 3; }));
      }));
    },

    // The card lights up under the mouse or the keyboard's focus.
    hover(i, on) {
      const { front, back } = cards[i], from = back.material.emissiveIntensity, to = on ? .32 : 0;
      tween(120, p => { front.material.emissiveIntensity = back.material.emissiveIntensity = from + (to - from) * p; });
    },

    flip(i, up) {
      const h = cards[i].holder, from = h.rotation.z, to = up ? 0 : Math.PI;
      return tween(360, p => { h.rotation.z = from + (to - from) * ease(p); h.position.y = Math.sin(Math.PI * p) * 2.2; });
    },

    miss(i) {
      const h = cards[i].holder;
      return tween(280, p => { h.rotation.y = Math.sin(p * Math.PI * 4) * .06 * (1 - p); });
    },

    match(a, b) {
      for (const i of [a, b]) cards[i].edge.material = edgeWon;
      const pop = i => tween(380, p => cards[i].holder.scale.setScalar(1 + Math.sin(Math.PI * p) * .1));
      const A = cards[a].holder.position, B = cards[b].holder.position;
      board.confetti(A.x, A.z, 30); board.confetti(B.x, B.z, 30);
      return Promise.all([pop(a), pop(b)]);
    },

    finale() {
      for (let i = 0; i < 6; i++) tween(i * 160).then(() => board.confetti((Math.random() - .5) * bw, (Math.random() - .5) * bh, 90));
    },

    confetti(x, z, n) {
      if (still.matches) return;
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.26, .4), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
      const pieces = Array.from({ length: n }, (_, i) => {
        mesh.setColorAt(i, new THREE.Color(CONFETTI[i % CONFETTI.length]));
        return { v: new THREE.Vector3((Math.random() - .5) * 9, 9 + Math.random() * 9, (Math.random() - .5) * 9), spin: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), rate: 4 + Math.random() * 8 };
      });
      mesh.frustumCulled = false; confetti.add(mesh);
      const o = new THREE.Object3D();
      tween(1500, p => {
        const t = p * 1.5; // long enough for the highest piece to fall through the floor
        pieces.forEach((q, i) => {
          o.position.set(x + q.v.x * t, 1 + q.v.y * t - 13 * t * t, z + q.v.z * t);
          o.rotation.set(q.spin.x + q.rate * t, q.spin.y + q.rate * t, 0);
          o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }).then(() => {
        mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); confetti.remove(mesh);
        draw(); // the loop may have stopped: without this the last frame keeps the pieces on screen
      });
    },

    // Rests between moves; dies with a restart like any other move.
    wait: ms => tween(ms),
  };
  return board;
}
