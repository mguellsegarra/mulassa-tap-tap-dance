import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBouMusicians } from '../../../src/figures/bou/bou-musicians.js';
import { poseBand } from '../../../src/scene/models/band.js';
import { poseBouPercussion } from '../../../src/figures/bou/bou-percussion.js';
import song from '../../../src/song-bou.json' with { type: 'json' };
import { beatAtTime } from '../../../src/core/beat-grid.js';
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
const scene = new THREE.Scene(); scene.background = new THREE.Color('#c9b895');
const sun = new THREE.DirectionalLight('#fff0cf', 2.2); sun.position.set(-5, 8, 5);
scene.add(new THREE.HemisphereLight('#fff4df', '#867253', 2.3), sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: '#c9b895' }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.006; scene.add(ground);
const band = buildBouMusicians(); band.forEach(p => scene.add(p.g));
band.forEach(p => { p.lineup = 'grallers'; });
const music = $('music'); music.src = '/' + song.audio;
const camera = new THREE.PerspectiveCamera(35, 1, .05, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = .7; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * .52;
const box = new THREE.Box3(), centre = new THREE.Vector3(), size = new THREE.Vector3();
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, beat = 0, last = null, needsFrame = true;
function frameModel() {
  box.makeEmpty();
  const selected = $('focus').value;
  const shown = selected === 'all' ? band : [band[+selected]];
  $('names').replaceChildren(...shown.map(p => Object.assign(document.createElement('span'), { textContent: `${p.id} · ${p.name}` })));
  $('names').style.gridTemplateColumns = `repeat(${shown.length}, 1fr)`;
  band.forEach((p, i) => { p.g.visible = selected === 'all' || +selected === i; if (p.g.visible) box.expandByObject(p.g); });
  box.getCenter(centre); box.getSize(size);
  const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.3;
  controls.target.copy(centre); const view = $('view').value;
  camera.position.copy(centre).add(new THREE.Vector3(view === 'side' ? distance : 0, distance * .12, view === 'back' ? -distance : view === 'side' ? .15 : distance));
  controls.update(); needsFrame = false;
}
function resize() {
  const { width, height } = $('stage').getBoundingClientRect();
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); frameModel();
}
$('focus').onchange = frameModel; $('view').onchange = frameModel; $('reset').onclick = frameModel;
function playLabel() { $('play').textContent = playing ? 'Pausa' : 'Reprèn'; $('play').setAttribute('aria-pressed', String(!playing)); }
$('play').onclick = () => {
  playing = !playing;
  if (!playing) music.pause();
  else if (music.currentTime > 0) music.play().catch(() => { $('status').textContent = 'Prem el reproductor per reprendre la música.'; });
  playLabel();
}; playLabel();
music.onplay = () => { playing = true; playLabel(); };
music.onpause = () => { playing = false; playLabel(); };
const observer = new ResizeObserver(resize); observer.observe($('stage'));
renderer.setAnimationLoop(now => {
  if (document.hidden) { last = null; return; }
  if (!music.paused || music.currentTime > 0) beat = beatAtTime(song.beats, music.currentTime);
  else if (playing && last != null) beat += Math.min(.05, (now - last) / 1000) * 1.5;
  last = now; poseBand(band, beat);
  poseBouPercussion(band, beat);
  if (needsFrame) frameModel(); controls.update(); renderer.render(scene, camera);
});
$('status').textContent = 'Prem el reproductor per escoltar el Bou i revisar els cops del timbaler.';
window.__bouMusics = { band, camera, controls, renderer, pose(t) { beat = t; playing = false; music.pause(); music.currentTime = 0; poseBand(band, beat); poseBouPercussion(band, beat); playLabel(); renderer.render(scene, camera); } };
addEventListener('pagehide', () => {
  renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
  music.pause(); music.removeAttribute('src'); music.load();
  const geometries = new Set(), materials = new Set();
  scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose();
}, { once: true });
