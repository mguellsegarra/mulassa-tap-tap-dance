import { drawGameNote } from "virtual:instagram-game-notes";
import * as THREE from "three";
import { buildMulassa } from "../../../src/scene/models/mulassa.js";
import { buildPlaza } from "../../../src/scene/models/plaza.js";
import { buildPerson } from "../../../src/scene/models/people.js";
const c = document.querySelector("canvas"),
  x = c.getContext("2d");
c.width = 1080;
c.height = 1440;
const r = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
r.setSize(1080, 1080);
r.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff3d6, 0x726054, 2.7));
const light = new THREE.DirectionalLight(0xffeed6, 2.6);
light.position.set(-3, 9, 7);
scene.add(light);
let seed = 41;
const random = Math.random;
Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const mula = buildMulassa();
scene.add(mula.root);
const plaza = buildPlaza({ backdrop: 0, balconies: 15 });
scene.add(plaza.group);
plaza.band.forEach((p) => (p.g.visible = false));
const crowd = new THREE.Group();
scene.add(crowd);
for (let row = 0; row < 3; row++)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.cos(a) > 0.6) continue;
    const p = buildPerson();
    p.g.position.set(
      Math.sin(a) * (5 + row * 0.9),
      0,
      Math.cos(a) * (5 + row * 0.9),
    );
    p.g.rotation.y = a + Math.PI;
    crowd.add(p.g);
  }
Math.random = random;
// Original plaza rendered without spectators, independently of the editable hero.
const backdropScene = new THREE.Scene();
backdropScene.background = new THREE.Color("#8bd8cd");
backdropScene.add(new THREE.HemisphereLight(0xfff3d6, 0x726054, 2.7));
const backdropLight = new THREE.DirectionalLight(0xffeed6, 2.6);
backdropLight.position.set(-3, 9, 7);
backdropScene.add(backdropLight);
seed = 41;
Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const emptyPlaza = buildPlaza({ backdrop: 0, balconies: 0 });
Math.random = random;
emptyPlaza.band.forEach((p) => (p.g.visible = false));
backdropScene.add(emptyPlaza.group);
const backdropCamera = new THREE.PerspectiveCamera(55, 1080 / 900, 0.1, 100);
backdropCamera.position.set(2, 4.5, 7);
backdropCamera.lookAt(-2, 3, -12);
r.setSize(1080, 900);
r.render(backdropScene, backdropCamera);
const plazaImage = document.createElement("canvas");
plazaImage.width = 1080;
plazaImage.height = 900;
plazaImage.getContext("2d").drawImage(r.domElement, 0, 0);
function challengeBackdrop() {
  x.save();
  x.beginPath();
  x.rect(0, 585, 1080, 855);
  x.clip();
  x.filter = "blur(7px)";
  x.drawImage(plazaImage, -20, 565, 1120, 915);
  x.filter = "none";
  x.fillStyle = "#43bfb5a6";
  x.fillRect(0, 585, 1080, 855);
  const light = x.createRadialGradient(710, 950, 25, 710, 950, 530);
  light.addColorStop(0, "#fff3d659");
  light.addColorStop(1, "#fff3d600");
  x.fillStyle = light;
  x.fillRect(0, 585, 1080, 855);
  let state = 731;
  const rand = () => (state = (state * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 28; i++) {
    const cx = 20 + rand() * 1040,
      cy = 610 + rand() * 810,
      size = 4 + rand() * 9;
    x.save();
    x.translate(cx, cy);
    x.rotate(rand() * Math.PI);
    x.globalAlpha = 0.65;
    x.fillStyle = ["#ff8d32", "#f5cf32", "#fff3d6"][i % 3];
    x.fillRect(-size / 2, -size, size, size * 1.65);
    x.restore();
  }
  x.restore();
}
const cameraDefaults = {
  angle: -4,
  elevation: 29,
  size: 1200,
  x: 700,
  y: 1190,
};
const challengeDefaults = {
  angle: 89,
  elevation: 28,
  size: 1194,
  x: 341,
  y: 1129,
};
const frames = {};
let framing = { ...cameraDefaults };
try {
  Object.assign(
    framing,
    JSON.parse(localStorage.getItem("mulassa-post02-camera-3x4-v1") || "{}"),
  );
} catch {}
frames[1] = framing;
frames[2] = { ...challengeDefaults };
try {
  Object.assign(
    frames[2],
    JSON.parse(localStorage.getItem("mulassa-post03-camera") || "{}"),
  );
} catch {}
function cameraKey() {
  return current === 2
    ? "mulassa-post03-camera"
    : "mulassa-post02-camera-3x4-v1";
}
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const ink = {
  cream: "#fff3d6",
  gold: "#f5c518",
  dark: "#2a1a10",
  red: "#c0283c",
  orange: "#ff7a1a",
  teal: "#14b8a6",
};
const cards = [
  {
    file: "01-benvinguda",
    title: "La Mulassa de Valls",
    sub: "ja té videojoc!",
    foot: "Gratuït, en català i al navegador.",
  },
  {
    file: "02-com-es-juga",
    title: "GUA. PA.",
    sub: "GUAPA!",
    foot: "Segueix el ritme. Fes-la ballar.",
  },
  {
    file: "03-el-repte",
    title: "Segueixes",
    sub: "el ritme?",
    foot: "Tres dificultats. Una classificació.",
  },
];
let current = 0;
function txt(
  s,
  cx,
  cy,
  size,
  color = ink.cream,
  font = "Baloo",
  outline = false,
) {
  x.font = `${font === "Baloo" ? 800 : 400} ${size}px ${font}`;
  const w = x.measureText(s).width;
  if (w > 950)
    x.font = `${font === "Baloo" ? 800 : 400} ${(size * 950) / w}px ${font}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.lineJoin = "round";
  if (outline) {
    x.strokeStyle = ink.dark;
    x.lineWidth = 10;
    x.strokeText(s, cx, cy);
  }
  x.fillStyle = color;
  x.fillText(s, cx, cy);
}
function rect(a, b, w, h, color, radius = 24) {
  x.fillStyle = color;
  x.beginPath();
  x.roundRect(a, b, w, h, radius);
  x.fill();
}
function photo(mode) {
  r.setSize(1080, mode === 0 ? 1440 : 1080);
  camera.aspect = mode === 0 ? 0.75 : 1;
  plaza.group.visible = crowd.visible = mode === 0;
  scene.background = mode === 0 ? new THREE.Color("#d6b785") : null;
  mula.root.rotation.set(
    0,
    mode === 0 ? -0.2 : mode !== 0 ? (framing.angle * Math.PI) / 180 : 0.1,
    mode === 2 ? -0.06 : 0,
  );
  mula.neck.rotation.x = -0.05;
  mula.jaw.rotation.x = 0.3;
  camera.fov = mode === 0 ? 38 : mode === 1 ? 33 : 30;
  camera.position.set(...(mode === 0 ? [6, 5.8, 10] : [5, 3.7, 7]));
  camera.lookAt(0, mode === 0 ? 1.9 : mode === 1 ? 1.9 : 2, 0);
  if (mode !== 0) {
    const el = (framing.elevation * Math.PI) / 180;
    camera.position.set(
      5 * Math.cos(el),
      1.9 + 8.6 * Math.sin(el),
      7 * Math.cos(el),
    );
    camera.lookAt(0, 1.9, 0);
  }
  camera.updateProjectionMatrix();
  r.render(scene, camera);
}
function base(index) {
  const g = x.createLinearGradient(0, 0, 0, 1440);
  g.addColorStop(0, index === 1 ? "#fff7e4" : "#8be2d5");
  g.addColorStop(1, index === 1 ? "#ecd09d" : "#38b3a8");
  x.fillStyle = g;
  x.fillRect(0, 0, 1080, 1440);
}
function footer(d, index) {
  if (index === 0) {
    const g = x.createLinearGradient(0, 1180, 0, 1440);
    g.addColorStop(0, "#1c110a00");
    g.addColorStop(1, "#1c110aee");
    x.fillStyle = g;
    x.fillRect(0, 1180, 1080, 260);
  }
  if (index === 2) txt(d.foot, 540, 1270, 36, ink.dark);
  rect(376, 1335, 328, 60, ink.gold, 30);
  txt("mulassa.cat", 540, 1365, 34, ink.dark);
}
function confetti() {
  let s = 86;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 50; i++) {
    x.save();
    x.translate(55 + rand() * 970, 320 + rand() * 480);
    x.rotate(rand() * 6);
    x.fillStyle = [ink.gold, ink.orange, ink.teal, "#ff8fb1"][i % 4];
    x.fillRect(-4, -3, 9, 16);
    x.restore();
  }
}
function button(label, cx, cy, color) {
  x.save();
  x.translate(cx, cy);
  x.scale(1.65, 1.65);
  cx = cy = 0;
  const radius = 108;
  const glow = x.createRadialGradient(cx, cy, 0, cx, cy, 170);
  glow.addColorStop(0, ink.gold);
  glow.addColorStop(0.68, ink.gold);
  glow.addColorStop(0.76, "#f5c518aa");
  glow.addColorStop(0.88, "#f5c51844");
  glow.addColorStop(1, "#f5c51800");
  x.fillStyle = glow;
  x.fillRect(cx - 170, cy - 170, 340, 340);
  const disc = (rad, fill, dy = 0) => {
    x.fillStyle = fill;
    x.beginPath();
    x.arc(cx, cy + dy, rad, 0, Math.PI * 2);
    x.fill();
  };
  disc(radius + 12, "#0006", 7);
  disc(radius + 12, ink.dark);
  disc(radius + 6, "#ffffff");
  disc(radius, label === "GUA" ? "#b34d00" : "#0b7f72");
  const g = x.createRadialGradient(cx, cy - 40, 0, cx, cy - 20, 145);
  g.addColorStop(0, label === "GUA" ? "#ffb56b" : "#5eead4");
  g.addColorStop(0.62, color);
  g.addColorStop(1, color);
  disc(radius - 3, g, -5);
  txt(label, cx, cy + 3, 65, "#ffffff", "Baloo", true);
  x.restore();
}
function render(index = current) {
  current = index;
  if (frames[index]) framing = frames[index];
  const d = cards[index];
  base(index);
  photo(index);
  if (index === 0) {
    x.drawImage(r.domElement, 0, 0, 1080, 1440);
    const shade = x.createLinearGradient(0, 0, 0, 390);
    shade.addColorStop(0, "#17100bd9");
    shade.addColorStop(1, "#17100b00");
    x.fillStyle = shade;
    x.fillRect(0, 0, 1080, 390);
    confetti();
    txt(d.title, 540, 116, 92, ink.cream, "Baloo", true);
    txt(d.sub, 540, 222, 104, ink.gold, "Baloo", true);
  }
  if (index === 1) {
    // Seeded celebration backdrop: soft light, distant bursts and paper confetti.
    for (const [cx, cy, color] of [
      [70, 800, "#f5c51835"],
      [970, 800, "#14b8a628"],
      [450, 1350, "#ff7a1a25"],
    ]) {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, 450);
      g.addColorStop(0, color);
      g.addColorStop(1, "#ffffff00");
      x.fillStyle = g;
      x.fillRect(0, 200, 1080, 1240);
    }
    // Stepped pennants use the same palette and three-block silhouette as plaza.js.
    const flags = [
      "#d62828",
      "#f5c518",
      "#2f62d6",
      "#3a9d4b",
      "#ffffff",
      "#f07a1a",
    ];
    for (const [start, end, sag, opacity] of [
      [600, 900, 65, 0.42],
      [1110, 720, 80, 0.32],
    ]) {
      const at = (t) => ({
        x: -70 + 1220 * t,
        y: start + (end - start) * t + Math.sin(t * Math.PI) * sag,
      });
      x.save();
      x.globalAlpha = opacity;
      x.strokeStyle = "#816e50";
      x.lineWidth = 3;
      x.beginPath();
      for (let i = 0; i <= 80; i++) {
        const p = at(i / 80);
        i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y);
      }
      x.stroke();
      for (let i = 0; i < 19; i++) {
        const t = (i + 0.5) / 19,
          p = at(t),
          angle = Math.atan2(
            end - start + Math.cos(t * Math.PI) * Math.PI * sag,
            1220,
          );
        x.save();
        x.translate(p.x, p.y);
        x.rotate(angle);
        x.fillStyle = flags[i % flags.length];
        for (let k = 0; k < 3; k++) {
          const w = 48 - k * 15;
          x.fillRect(-w / 2, k * 15, w, 16);
        }
        x.restore();
      }
      x.restore();
    }
    let seed = 207;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 100; i++) {
      const cx = 25 + rand() * 1030,
        cy = 240 + rand() * 1180;
      const size = 3 + rand() * 7;
      x.save();
      x.translate(cx, cy);
      x.rotate(rand() * Math.PI);
      x.globalAlpha = 0.3 + rand() * 0.4;
      x.fillStyle = [ink.gold, ink.orange, ink.teal, "#ef8296", ink.red][i % 5];
      x.fillRect(-size / 2, -size, size, size * 1.7);
      x.restore();
    }
    for (let i = 0; i < 18; i++) {
      const cx = i % 2 ? 990 + rand() * 70 : 20 + rand() * 80,
        cy = 290 + rand() * 1100,
        size = 12 + rand() * 14;
      x.save();
      x.translate(cx, cy);
      x.rotate(rand() * Math.PI);
      x.globalAlpha = 0.8;
      x.fillStyle = [ink.gold, ink.orange, ink.teal, "#ef8296"][i % 4];
      x.fillRect(-size / 2, -size, size, size * 1.6);
      x.restore();
    }
    txt(d.sub, 540, 180, 190, ink.red);

    x.save();
    x.translate(540, 1390);
    x.scale(1, 0.19);
    const shadow = x.createRadialGradient(0, 0, 10, 0, 0, 235);
    shadow.addColorStop(0, "#6e492e40");
    shadow.addColorStop(1, "#6e492e00");
    x.fillStyle = shadow;
    x.fillRect(-240, -240, 480, 480);
    x.restore();
    x.drawImage(
      r.domElement,
      framing.x - framing.size / 2,
      framing.y - framing.size / 2,
      framing.size,
      framing.size,
    );
    button("GUA", 310, 482, ink.orange);
    button("PA", 770, 482, ink.teal);
  }
  if (index === 2) {
    challengeBackdrop();
    txt(d.title, 540, 155, 130, "#ffffff", "Baloo", true);
    txt(d.sub, 540, 290, 130, "#ffffff", "Baloo", true);
    const cy = 485;
    x.fillStyle = "rgba(42,26,16,.45)";
    x.fillRect(0, 385, 1080, 200);
    x.fillStyle = "rgba(245,197,24,.8)";
    x.fillRect(0, 385, 1080, 5);
    x.fillRect(0, 580, 1080, 5);
    for (let j = 0; j < 10; j++) {
      x.fillStyle = j % 4 ? "#fff3d622" : "#fff3d655";
      x.fillRect(j * 120, 400, j % 4 ? 2 : 4, 170);
    }
    const disc = (cx, rad, color) => {
      x.fillStyle = color;
      x.beginPath();
      x.arc(cx, cy, rad, 0, Math.PI * 2);
      x.fill();
    };
    // Target and note faces follow the game's lane and noteDisc drawing conventions.
    disc(175, 82, ink.gold);
    disc(175, 73, ink.dark);
    disc(175, 63, "#fff3d622");
    for (const [cx, dir] of [
      [-10, "R"],
      [365, "L"],
      [565, "R"],
      [765, "L"],
      [1080, "R"],
    ])
      drawGameNote(x, dir, cx, cy, 4.1);
    x.drawImage(
      r.domElement,
      framing.x - framing.size / 2,
      framing.y - framing.size / 2,
      framing.size,
      framing.size,
    );
  }

  if (index === 0) footer(d, index);
  return c.toDataURL("image/png");
}
function select(i) {
  current = i;
  if (frames[i]) framing = frames[i];
  for (const key of Object.keys(cameraDefaults)) {
    document.getElementById("camera-" + key).value = framing[key];
    document.getElementById("value-" + key).textContent = framing[key];
  }
  document.getElementById("camera-controls").hidden = i === 0;
  document.getElementById("title").closest("label").hidden = i === 1;
  document.getElementById("foot").closest("label").hidden = true;
  for (const k of ["title", "sub", "foot"])
    document.getElementById(k).value = cards[i][k];
  render(i);
  document
    .querySelectorAll("[data-card]")
    .forEach((b, j) => b.setAttribute("aria-pressed", j === i));
}
for (const [i, d] of cards.entries()) {
  const b = document.createElement("button");
  b.textContent = ["01 · Benvinguda", "02 · Com es juga", "03 · El repte"][i];
  b.dataset.card = i;
  b.onclick = () => select(i);
  document.querySelector("nav").append(b);
}
for (const k of ["title", "sub", "foot"])
  document.getElementById(k).oninput = (e) => {
    cards[current][k] = e.target.value;
    render();
  };
document.querySelector("#download").onclick = () => {
  const a = document.createElement("a");
  a.download = cards[current].file + ".png";
  a.href = render();
  a.click();
};
for (const key of Object.keys(cameraDefaults)) {
  const input = document.getElementById("camera-" + key);
  input.value = framing[key];
  const output = document.getElementById("value-" + key);
  output.textContent = input.value;
  input.oninput = () => {
    framing[key] = Number(input.value);
    output.textContent = input.value;
    try {
      localStorage.setItem(cameraKey(), JSON.stringify(framing));
    } catch {}
    render(current);
  };
}
document.getElementById("camera-reset").onclick = () => {
  framing = { ...(current === 2 ? challengeDefaults : cameraDefaults) };
  frames[current] = framing;
  for (const key of Object.keys(cameraDefaults)) {
    document.getElementById("camera-" + key).value = framing[key];
    document.getElementById("value-" + key).textContent = framing[key];
  }
  try {
    localStorage.removeItem(cameraKey());
  } catch {}
  render(current);
};
window.posts = { render, cards, select };
Promise.all([
  document.fonts.load("800 40px Baloo"),
  document.fonts.load("68px Jersey"),
]).then(() => {
  for (const [i, d] of cards.entries()) {
    const a = document.createElement("a");
    a.href = "#";
    a.onclick = (e) => {
      e.preventDefault();
      select(i);
    };
    const img = document.createElement("img");
    img.src = render(i);
    img.alt = ["Benvinguda", "Com es juga", "El repte"][i];
    a.append(img);
    document.querySelector(".gallery").append(a);
  }
  select(2);
  window.ready = true;
});
