import * as THREE from "three";
import { buildMulassa } from "../../../src/scene/models/mulassa.js";
import { buildPlaza } from "../../../src/scene/models/plaza.js";
import escutSrc from "../assets/escut-valls.svg"; // the escut de Valls as drawn on Wikimedia Commons (Escudo_de_Valls.svg, public domain drawing)
import uafSrc from "../../../public/uaf-logo.jpg"; // the Unió Anelles de la Flama logo, from the game's public/
const image = (src) => {
  const i = new Image();
  i.src = src;
  return i;
};
const escut = image(escutSrc),
  uaf = image(uafSrc);

// A trading card, 1080×1440: black border, a textured red frame, bevelled title and type bars, the real model in the art box over the
// game's plaça, a parchment text box with the ability, the special move and the flavour line. Type: Source Serif 4 (OFL).
const W = 1080,
  H = 1440,
  SS = 2;
let WIN = { x: 78, y: 158, w: 924, h: 600 }; // SS: the 3D is rendered at 2x and scaled down
const ink = {
  ink: "#1d130c",
  text: "#2b1d12",
  soft: "#5a4330",
  gold: "#d9ab3c",
  goldLight: "#f7dc8a",
  goldDark: "#7a5414",
  red: "#a3192e",
  redDeep: "#5a0c19",
  green: "#1f5c34",
  orange: "#ff7a1a",
  teal: "#14b8a6",
  cream: "#f4e6c4",
};
const canvas = document.querySelector("#card"),
  ctx = canvas.getContext("2d");
canvas.width = W;
canvas.height = H;

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(WIN.w * SS, WIN.h * SS, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
function lights(scene) {
  // warm key from the front-left, soft fill, a cream rim from behind
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6f5a4c, 2.4));
  const key = new THREE.DirectionalLight(0xffe2b8, 3.1);
  key.position.set(-4, 8, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff3d6, 1.6);
  rim.position.set(5, 5, -6);
  scene.add(rim);
}
// Two passes: the plaça (softened on the 2D canvas for depth), then the figure and its contact shadow, sharp.
const back = new THREE.Scene(),
  front = new THREE.Scene();
lights(back);
lights(front);
let seed = 421;
const random = Math.random;
Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const mula = buildMulassa();
const plaza = buildPlaza({ backdrop: 0, balconies: 14 });
Math.random = random;
plaza.band.forEach((p) => (p.g.visible = false));
back.add(plaza.group);
mula.jaw.rotation.x = 0.25;
mula.neck.rotation.x = -0.04;
let model = mula.root,
  points = [];
const shadow = (() => {
  // two soft ellipses under the figure, sized to its footprint
  const t = document.createElement("canvas");
  t.width = t.height = 128;
  const c = t.getContext("2d");
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#000000");
  g.addColorStop(0.55, "#00000088");
  g.addColorStop(1, "#00000000");
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(t),
    group = new THREE.Group();
  for (const [s, o] of [
    [1.5, 0.38],
    [1.08, 0.34],
  ]) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: o,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.userData.s = s;
    group.add(m);
  }
  return group;
})();
front.add(shadow);
function place(next) {
  // stand any model on the ground, centred, with its shadow
  if (model) front.remove(model);
  model = next;
  front.add(model);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model),
    c = box.getCenter(new THREE.Vector3()),
    size = box.getSize(new THREE.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  model.updateMatrixWorld(true);
  for (const m of shadow.children) {
    m.scale.set(size.x * m.userData.s, size.z * m.userData.s, 1);
    m.position.y = 0.015;
  }
  sample();
}
place(model);

const camera = new THREE.PerspectiveCamera(26, WIN.w / WIN.h, 0.1, 200);
const p = new THREE.Vector3();
function sample() {
  // the figure's own vertices (a box's corners overshoot a three-quarter view), at most ~6000
  const all = [];
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const a = o.geometry.attributes.position,
      step = Math.max(1, Math.floor(a.count / 3000));
    for (let i = 0; i < a.count; i += step)
      all.push(
        new THREE.Vector3()
          .fromBufferAttribute(a, i)
          .applyMatrix4(o.matrixWorld),
      );
  });
  points = all;
}
function frame(d) {
  // the distance where the whole figure fills `fill` of the window, then centred with setViewOffset: ears, snout and feet always inside
  const box = new THREE.Box3().setFromObject(model),
    c = box.getCenter(new THREE.Vector3());
  const a = (Number(d.angle) * Math.PI) / 180,
    e = (Number(d.elevation) * Math.PI) / 180,
    fill = Math.min(0.94, 0.88 * Number(d.zoom));
  const extent = (dist) => {
    camera.clearViewOffset();
    camera.position.set(
      c.x + Math.sin(a) * Math.cos(e) * dist,
      c.y + Math.sin(e) * dist,
      c.z + Math.cos(a) * Math.cos(e) * dist,
    );
    camera.lookAt(c);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    let x0 = 9,
      x1 = -9,
      y0 = 9,
      y1 = -9;
    for (const v of points) {
      p.copy(v).project(camera);
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
    return { x0, x1, y0, y1, k: Math.max(x1 - x0, y1 - y0) / 2 / fill };
  };
  let lo = 0.5,
    hi = 300;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    extent(m).k > 1 ? (lo = m) : (hi = m);
  }
  const r = extent(hi),
    w = WIN.w * SS,
    h = WIN.h * SS;
  // Box centre to the window centre, a touch low so the ground and its shadow read under the feet.
  camera.setViewOffset(
    w,
    h,
    ((r.x0 + r.x1) / 4) * w,
    (-((r.y0 + r.y1) / 2 + 0.03) / 2) * h,
    w,
    h,
  );
  camera.updateProjectionMatrix();
}

const defaults = {
  collection: "UNIÓ ANELLES DE LA FLAMA",
  number: "001",
  name: "MULASSA DE VALLS",
  type: "",
  ability: "ÀNIM DE LA PLAÇA",
  abilityText:
    "Cada encert anima la plaça. Cada error la deixa una mica més buida.",
  move: "GUAPA!",
  moveText: "GUA i PA alhora. La Mulassa salta i suma el doble de punts.",
  moveValue: "×2",
  line: "El seu ball posa a prova els teus dits.",
  place: "VALLS",
  url: "mulassa.cat",
  angle: 38,
  elevation: 7,
  zoom: 1,
};
const fields = Object.keys(defaults);
for (const k of fields) document.getElementById(k).value = defaults[k];
const config = () =>
  Object.fromEntries(fields.map((k) => [k, document.getElementById(k).value]));

// Seeded grain, made once: the frame and the parchment get a printed-card texture, the same on every export.
const grain = (() => {
  const t = document.createElement("canvas");
  t.width = t.height = 256;
  const c = t.getContext("2d");
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) {
    const v = r() < 0.5 ? 0 : 255;
    c.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.09})`;
    c.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  return ctx.createPattern(t, "repeat");
})();

function font(size, weight = 400, italic = false) {
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px CardSerif`;
}
function spaced(px) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px";
}
function text(
  s,
  x,
  y,
  size,
  color,
  {
    weight = 400,
    italic = false,
    align = "left",
    max = 900,
    track = 0,
    shadow = "",
  } = {},
) {
  spaced(track);
  font(size, weight, italic);
  const w0 = ctx.measureText(s).width;
  if (w0 > max) font((size * max) / w0, weight, italic);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(s, x, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width;
  spaced(0);
  return w;
}
function lines(s, size, max, italic) {
  font(size, 400, italic);
  const out = [];
  let cur = "";
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + " " + word : word;
    if (cur && ctx.measureText(t).width > max) {
      out.push(cur);
      cur = word;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
function para(
  s,
  x,
  y,
  size,
  max,
  color,
  { italic = false, align = "left", most = 2 } = {},
) {
  // up to `most` lines; a longer text shrinks instead of being cut
  let n = size,
    l = lines(s, n, max, italic);
  while (l.length > most && n > 22) l = lines(s, --n, max, italic);
  if (l.length === 2) {
    // no lone word on the second line, nor a one-letter word ending the first
    const words = s.split(/\s+/).filter(Boolean);
    let i = l[0].split(/\s+/).length;
    font(n, 400, italic);
    while (
      i > 1 &&
      (words[i - 1].length < 2 ||
        ctx.measureText(words.slice(i).join(" ")).width <
          0.45 * ctx.measureText(words.slice(0, i).join(" ")).width)
    )
      i--;
    l = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
  }
  l.forEach((t, i) =>
    text(t, x, y + i * n * 1.28, n, color, { italic, align, max }),
  );
  return l.length;
}
const path = (x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};
function goldGrad(y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, ink.goldLight);
  g.addColorStop(0.45, ink.gold);
  g.addColorStop(0.55, "#b5841f");
  g.addColorStop(1, ink.goldLight);
  return g;
}
function bevel(x, y, w, h, r) {
  // dark cut, then a thin metal rim: every box sits in the frame like an inlay
  path(x - 6, y - 6, w + 12, h + 12, r + 6);
  ctx.fillStyle = "#12090599";
  ctx.fill();
  path(x - 4, y - 4, w + 8, h + 8, r + 4);
  ctx.fillStyle = goldGrad(y - 4, y + h + 4);
  ctx.fill();
  path(x - 1, y - 1, w + 2, h + 2, r + 1);
  ctx.fillStyle = ink.goldDark;
  ctx.fill();
}
function parchment(x, y, w, h, r, light = false) {
  bevel(x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, light ? "#f6ecd4" : "#efdfba");
  g.addColorStop(1, light ? "#e9d7b0" : "#dcc392");
  path(x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = grain;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  const edge = ctx.createRadialGradient(
    x + w / 2,
    y + h / 2,
    Math.min(w, h) * 0.3,
    x + w / 2,
    y + h / 2,
    Math.max(w, h) * 0.62,
  );
  edge.addColorStop(0, "#7a4d1e00");
  edge.addColorStop(1, "#7a4d1e30");
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#3a200c26";
  path(x, y, w, h, r);
  ctx.stroke(); // inner shadow along the cut
  ctx.restore();
}
function medallion(cx, cy, r, draw) {
  // a struck-metal coin holding a small mark
  ctx.beginPath();
  ctx.arc(cx, cy + 2, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = "#2a170a55";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = goldGrad(cy - r, cy + r);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.clip();
  draw();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = ink.goldDark;
  ctx.stroke();
}
function crowdIcon(cx, cy, r) {
  // the ability's mark: three heads of the plaça
  medallion(cx, cy, r, () => {
    const g = ctx.createRadialGradient(cx, cy - r * 0.4, 0, cx, cy, r);
    g.addColorStop(0, "#2f7a48");
    g.addColorStop(1, ink.green);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = ink.cream;
    for (const [dx, dy, s] of [
      [-0.42, 0.12, 0.19],
      [0.42, 0.12, 0.19],
      [0, -0.02, 0.24],
    ]) {
      const x = cx + dx * r,
        y = cy + dy * r,
        hr = s * r;
      ctx.beginPath();
      ctx.arc(x, y - hr * 0.2, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y + hr * 2.3, hr * 1.5, hr * 1.25, 0, Math.PI, 0);
      ctx.fill();
    }
  });
}
function guapaIcon(cx, cy, r) {
  // the game's GUAPA note: half GUA orange, half PA turquoise
  medallion(cx, cy, r, () => {
    ctx.fillStyle = ink.orange;
    ctx.fillRect(cx - r, cy - r, r, 2 * r);
    ctx.fillStyle = ink.teal;
    ctx.fillRect(cx, cy - r, r, 2 * r);
    const g = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.5,
      0,
      cx,
      cy,
      r,
    );
    g.addColorStop(0, "#ffffff55");
    g.addColorStop(1, "#00000022");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 1.5, cy - r, 3, 2 * r);
  });
}
let escutBox = null; // the drawing's own bounds inside the SVG (its canvas has uneven empty margins), found once
function trim(img) {
  const c = document.createElement("canvas"),
    k = 400 / img.naturalHeight;
  c.width = Math.round(img.naturalWidth * k);
  c.height = 400;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, c.width, c.height);
  const a = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width,
    y0 = c.height,
    x1 = 0,
    y1 = 0;
  for (let y = 0; y < c.height; y++)
    for (let i = 0; i < c.width; i++)
      if (a[(y * c.width + i) * 4 + 3] > 8) {
        if (i < x0) x0 = i;
        if (i > x1) x1 = i;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
}
function crest(right, cy, h) {
  // the escut de Valls, the official drawing, h tall, its right edge at `right`, centred on cy
  const b = (escutBox ||= trim(escut)),
    w = (h * b.w) / b.h;
  ctx.save();
  ctx.shadowColor = "#2a110855";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.5;
  ctx.drawImage(escut, b.x, b.y, b.w, b.h, right - w, cy - h / 2, w, h);
  ctx.restore();
}
function flame(x, cy, h) {
  // the UAF flame alone, cut from its logo; multiply drops the logo's white on the parchment
  const sx = 40,
    sy = 28,
    sw = 178,
    sh = 274,
    w = (h * sw) / sh;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(uaf, sx, sy, sw, sh, x, cy - h / 2, w, h);
  ctx.restore();
  return w;
}
function tag(s, x, y, fill, size = 26) {
  // a small label before a name, as cards mark an ability
  spaced(1.5);
  font(size, 700);
  const w = ctx.measureText(s).width + size,
    h = size * 1.55;
  spaced(0);
  path(x, y - h / 2, w, h, 5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = ink.goldDark;
  ctx.stroke();
  text(s, x + w / 2, y + 1, size, ink.cream, {
    weight: 700,
    align: "center",
    track: 1.5,
  });
  return w;
}
function rule(y, x0, x1) {
  // a hairline with a small gold lozenge, as between rules text and flavour text
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#6b4a2600");
  g.addColorStop(0.15, "#6b4a2699");
  g.addColorStop(0.85, "#6b4a2699");
  g.addColorStop(1, "#6b4a2600");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y - 1, x1 - x0, 2);
}

function cardFrame() {
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(0, 0, W, H);
  path(8, 8, W - 16, H - 16, 44);
  ctx.fillStyle = "#16110e";
  ctx.fill(); // the black border, a hint of lift at its edge
  path(9, 9, W - 18, H - 18, 43);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff14";
  ctx.stroke();
  const x = 40,
    y = 40,
    w = W - 80,
    h = H - 80;
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  g.addColorStop(0, "#b02236");
  g.addColorStop(0.5, "#8a1729");
  g.addColorStop(1, ink.redDeep);
  path(x, y, w, h, 22);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(x, y, w, h, 22);
  ctx.clip();
  ctx.fillStyle = grain;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#00000014";
  ctx.lineWidth = 1;
  for (let i = -h; i < w; i += 9) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h * 0.35, y + h);
    ctx.stroke();
  } // a faint woven grain, like the faldó's cloth
  const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0, "#ffffff1c");
  sheen.addColorStop(0.4, "#ffffff00");
  sheen.addColorStop(0.75, "#ffffff0a");
  sheen.addColorStop(1, "#00000030");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  path(x + 7, y + 7, w - 14, h - 14, 17);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#e8c06a88";
  ctx.stroke(); // a fine gold filet inside the frame
}
function titleBar(d) {
  const x = 62,
    y = 62,
    w = 956,
    h = 78;
  parchment(x, y, w, h, 14, true);
  text(d.name, x + 28, y + h / 2 + 2, 54, ink.ink, {
    weight: 700,
    max: w - 190,
    track: 2,
  });
  for (const [i, c] of [
    [0, ink.orange],
    [1, ink.teal],
  ]) {
    // GUA and PA, the two buttons of the dance, where a card shows its cost
    const cx = x + w - 92 + i * 52,
      cy = y + h / 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 21, 0, Math.PI * 2);
    ctx.fillStyle = "#2a170a66";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ink.goldDark;
    ctx.stroke();
    const g = ctx.createRadialGradient(cx - 6, cy - 8, 0, cx, cy, 20);
    g.addColorStop(0, "#ffffff77");
    g.addColorStop(1, "#ffffff00");
    ctx.fillStyle = g;
    ctx.fill();
  } // the escut de Valls, where a card shows its mark
}
function artBox(d, rect) {
  WIN = rect;
  renderer.setSize(rect.w * SS, rect.h * SS, false);
  camera.aspect = rect.w / rect.h;
  const { x, y, w, h } = WIN;
  bevel(x, y, w, h, 4);
  ctx.save();
  path(x, y, w, h, 4);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, "#e9b06a");
  sky.addColorStop(0.55, "#f1d29e");
  sky.addColorStop(1, "#c9a26c");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  frame(d);
  back.fog = new THREE.Fog(
    0xe9c48a,
    camera.position.length() + 3,
    camera.position.length() + 40,
  );
  renderer.render(back, camera);
  ctx.filter = "blur(3px)";
  ctx.drawImage(renderer.domElement, x - 6, y - 6, w + 12, h + 12);
  ctx.filter = "none";
  const halo = ctx.createRadialGradient(
    x + w * 0.5,
    y + h * 0.48,
    20,
    x + w * 0.5,
    y + h * 0.48,
    w * 0.5,
  );
  halo.addColorStop(0, "#fff1d060");
  halo.addColorStop(1, "#fff1d000");
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);
  renderer.render(front, camera);
  ctx.drawImage(renderer.domElement, x, y, w, h);
  const vig = ctx.createRadialGradient(
    x + w / 2,
    y + h * 0.48,
    h * 0.32,
    x + w / 2,
    y + h * 0.5,
    w * 0.72,
  );
  vig.addColorStop(0, "#1a0d0500");
  vig.addColorStop(1, "#1a0d05a8");
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#00000040";
  path(x, y, w, h, 4);
  ctx.stroke();
  ctx.restore();
}
function typeBar(d, y) {
  const x = 62,
    w = 956,
    h = 66,
    label = [d.collection, d.type].filter(Boolean).join("  —  ");
  parchment(x, y, w, h, 12, true);
  spaced(1.5);
  font(34, 700);
  const tw = Math.min(ctx.measureText(label).width, w - 140),
    fh = 50,
    fw = (fh * 178) / 274,
    gap = 16;
  spaced(0);
  const left = x + (w - fw - gap - tw) / 2; // the flame and the name centred together
  flame(left, y + h / 2, fh);
  text(label, left + fw + gap, y + h / 2 + 2, 34, ink.ink, {
    weight: 700,
    max: tw,
    track: 1.5,
  });
}
function abilityAndMove(d, y, k) {
  // the two rules blocks; k scales them (1 = the card, bigger on the detail slide)
  const tx = 78 + 48 + 64 * k,
    max = 1002 - 34 - tx,
    gap = 50 * k,
    body = 35 * k,
    lead = body * 1.28;
  crowdIcon(78 + 24 + 30 * k, y, 30 * k);
  const aw = tag("HABILITAT", tx, y, ink.red, 26 * Math.min(k, 1.25)) + 16;
  text(d.ability, tx + aw, y + 1, 38 * k, ink.ink, {
    weight: 700,
    max: max - aw,
    track: 1,
  });
  const n1 = para(d.abilityText, tx, y + gap, body, max, ink.text, {
    most: k > 1 ? 3 : 2,
  });
  const ry = y + gap + (n1 - 1) * lead + lead * 0.5 + 16 * k;
  rule(ry, 110, 970);
  const my = ry + 22 * k + 30 * k;
  guapaIcon(78 + 24 + 30 * k, my, 30 * k);
  const vw = d.moveValue
    ? text(d.moveValue, 972, my + 2, 58 * k, ink.red, {
        weight: 700,
        align: "right",
        max: 160 * k,
      })
    : 0;
  const mw =
    tag("MOVIMENT ESPECIAL", tx, my, ink.green, 26 * Math.min(k, 1.25)) + 16;
  text(d.move, tx + mw, my + 1, 38 * k, ink.red, {
    weight: 700,
    max: max - vw - mw - 20,
    track: 1,
  });
  const n2 = para(d.moveText, tx, my + gap, body, max, ink.text, {
    most: k > 1 ? 3 : 2,
  });
  return my + gap + (n2 - 1) * lead + lead * 0.5; // the last line's bottom
}
function textBox(d, y, h, k) {
  parchment(78, y, 924, h, 8);
  const end = abilityAndMove(d, y + 52 * k, k),
    fy = Math.max((end + y + h) / 2, end + 62 * k); // centred in what is left, never on the rule
  rule(end + 18 * k, 300, 780);
  para(d.line, 540, fy, 34 * k, 840, ink.soft, {
    italic: true,
    align: "center",
  });
}
function footer(d) {
  const nw = text(
    [d.number, d.place].filter(Boolean).join(" · "),
    70,
    1362,
    30,
    ink.goldLight,
    { weight: 700, max: 420, track: 2, shadow: "#00000066" },
  );
  const eh = 52;
  crest(
    70 + nw + 14 + (eh * (escutBox ||= trim(escut)).w) / escutBox.h,
    1360,
    eh,
  ); // the escut de Valls right after the place
  text(d.url, 1010, 1362, 30, ink.cream, {
    align: "right",
    max: 420,
    track: 1,
    shadow: "#00000066",
  });
}
let view = "card"; // 'card': the whole card; 'detail': the carousel's second slide, the same card with the rules text big
function render(v = view) {
  view = v;
  const d = config();
  ctx.clearRect(0, 0, W, H);
  cardFrame();
  titleBar(d);
  if (view === "detail") {
    artBox(d, { x: 78, y: 158, w: 924, h: 400 });
    typeBar(d, 576);
    textBox(d, 660, 656, 1.32);
  } else {
    artBox(d, { x: 78, y: 158, w: 924, h: 600 });
    typeBar(d, 776);
    textBox(d, 860, 456, 1);
  }
  footer(d);
  for (const k of ["angle", "elevation", "zoom"]) {
    const o = document.getElementById("value-" + k);
    if (o) o.textContent = d[k];
  }
  window.lastConfig = d;
  return canvas.toDataURL("image/png");
}

for (const k of fields)
  document.getElementById(k).addEventListener("input", () => render());
function download(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
document.querySelector("#png").onclick = () =>
  download(
    render(),
    "carta-" + config().number + (view === "detail" ? "-detall" : "") + ".png",
  );
for (const b of document.querySelectorAll("[data-view]"))
  b.onclick = () => {
    render(b.dataset.view);
    for (const o of document.querySelectorAll("[data-view]"))
      o.setAttribute("aria-pressed", o === b);
  };
document.querySelector("#save").onclick = () =>
  download(
    "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(config(), null, 2)),
    "carta-" + config().number + ".json",
  );
document.querySelector("#reset").onclick = () => {
  for (const k of fields) document.getElementById(k).value = defaults[k];
  render();
};
document.querySelector("#load").onchange = async (e) => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (typeof d !== "object" || !d) throw Error();
    for (const k of fields)
      if (d[k] !== undefined) document.getElementById(k).value = d[k];
    render();
  } catch {
    alert("No he pogut llegir aquesta configuració.");
  }
  e.target.value = "";
};
document.querySelector("#model").onchange = async (e) => {
  try {
    const next = new THREE.ObjectLoader().parse(
      JSON.parse(await e.target.files[0].text()),
    );
    if (!next.isObject3D) throw Error();
    place(next);
    render();
  } catch {
    alert("Cal un model Three.js JSON exportat amb Object3D.toJSON().");
  }
  e.target.value = "";
};
window.poster = { render, config };
Promise.all([
  escut.decode(),
  uaf.decode(),
  document.fonts.load("700 50px CardSerif"),
  document.fonts.load("400 31px CardSerif"),
  document.fonts.load("italic 400 31px CardSerif"),
])
  .then(() => {
    render();
    window.ready = true;
  })
  .catch((e) => {
    document.querySelector("#status").textContent =
      "No s’han pogut carregar les fonts.";
    console.error(e);
  });
