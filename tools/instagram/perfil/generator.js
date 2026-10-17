import * as THREE from "three";
import { buildMulassa } from "../../../src/scene/models/mulassa.js";
import { buildPlaza } from "../../../src/scene/models/plaza.js";
const size = 1080,
  canvas = document.querySelector("#portrait"),
  ctx = canvas.getContext("2d");
canvas.width = canvas.height = size;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(size, size);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6b7081, 2.4));
const key = new THREE.DirectionalLight(0xffe6c8, 2.7);
key.position.set(-3, 7, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0xd9edff, 1.1);
fill.position.set(4, 4, -2);
scene.add(fill);
let seed = 421;
const originalRandom = Math.random;
Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const mula = buildMulassa(),
  plaza = buildPlaza({ backdrop: 0, balconies: 0 });
Math.random = originalRandom;
scene.add(mula.root, plaza.group);
plaza.band.forEach((p) => (p.g.visible = false));
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const presets = [
  {
    name: "01-retrat-groc",
    title: "01 · El retrat",
    note: "Tres quarts, fons groc i una expressió tranquil·la.",
    pos: [2.3, 3.7, 5.7],
    target: [0, 3.0, 1.55],
    fov: 32,
    jaw: 0.12,
    roll: 0,
    bg: "#f4c542",
  },
  {
    name: "02-morro",
    title: "02 · Hola, guapa!",
    note: "Més a prop, amb la boca oberta i una mica de perspectiva.",
    pos: [1.05, 3.3, 4.15],
    target: [0, 3.1, 1.65],
    fov: 48,
    jaw: 0.32,
    roll: -0.06,
    bg: "#7bd8cb",
  },
  {
    name: "03-placa",
    title: "03 · A la plaça",
    note: "El mateix model, amb la plaça del joc desenfocada.",
    pos: [2.45, 3.8, 5.9],
    target: [0, 3.0, 1.55],
    fov: 32,
    jaw: 0.16,
    roll: 0.025,
    bg: "plaza",
  },
  {
    name: "04-morro-groc",
    title: "04 · Hola, guapa! · Groc",
    note: "La segona proposta, amb fons groc i un enquadrament una mica més proper.",
    pos: [1.05, 3.3, 4.15],
    target: [0, 3.1, 1.65],
    fov: 44,
    jaw: 0.32,
    roll: -0.06,
    bg: "#f4c542",
  },
  {
    name: "05-morro-groc-ple",
    title: "05 · Més a prop",
    note: "Enquadrament més ple, ajustat al retall circular.",
    pos: [1.45, 3.45, 4.15],
    target: [0.1, 3.15, 1.65],
    fov: 40,
    jaw: 0.32,
    roll: 0.08,
    bg: "#f4c542",
  },
  {
    name: "06-morro-turquesa-ple",
    title: "06 · Més a prop · Turquesa",
    note: "El mateix enquadrament de la proposta 05, amb fons turquesa.",
    pos: [1.45, 3.45, 4.15],
    target: [0.1, 3.15, 1.65],
    fov: 40,
    jaw: 0.32,
    roll: 0.08,
    bg: "#7bd8cb",
  },
];
let current = 5;
function render(index = current) {
  current = index;
  const p = presets[index];
  camera.fov = p.fov;
  camera.position.fromArray(p.pos);
  camera.up.set(Math.sin(p.roll), Math.cos(p.roll), 0);
  camera.lookAt(...p.target);
  camera.updateProjectionMatrix();
  mula.jaw.rotation.x = p.jaw;
  ctx.clearRect(0, 0, size, size);
  if (p.bg === "plaza") {
    mula.root.visible = false;
    plaza.group.visible = true;
    scene.background = new THREE.Color("#e9d5a9");
    renderer.render(scene, camera);
    ctx.save();
    ctx.filter = "blur(20px)";
    ctx.drawImage(renderer.domElement, -40, -40, size + 80, size + 80);
    ctx.restore();
    ctx.fillStyle = "rgba(42,30,22,.18)";
    ctx.fillRect(0, 0, size, size);
  } else {
    const gradient = ctx.createRadialGradient(440, 360, 0, 540, 540, 800);
    gradient.addColorStop(0, p.bg);
    gradient.addColorStop(1, p.bg === "#f4c542" ? "#df9f20" : "#399f99");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  plaza.group.visible = false;
  mula.root.visible = true;
  scene.background = null;
  renderer.setClearColor(0, 0);
  renderer.render(scene, camera);
  ctx.drawImage(renderer.domElement, 0, 0);
  const url = canvas.toDataURL("image/png");
  document.querySelectorAll(".mini").forEach((img) => (img.src = url));
  document.querySelector("#caption").textContent = p.note;
  document
    .querySelectorAll("[data-preset]")
    .forEach((b, i) => b.setAttribute("aria-pressed", i === index));
  return url;
}
window.avatar = { render, presets };
presets.forEach((p, i) => {
  const button = document.createElement("button");
  button.textContent = p.title;
  button.dataset.preset = i;
  button.onclick = () => render(i);
  document.querySelector("#presets").append(button);
});
document.querySelector("#download").onclick = () => {
  const a = document.createElement("a");
  a.download = presets[current].name + ".png";
  a.href = render();
  a.click();
};
document.querySelector("#circle").onchange = (e) =>
  canvas.classList.toggle("circle", e.target.checked);
render();
window.ready = true;
