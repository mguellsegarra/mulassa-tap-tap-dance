import { createTeaserStage, DURATION, PRESETS } from './stage.js';

const query = new URLSearchParams(location.search);
if (query.has('record')) document.body.classList.add('record');
const stage = createTeaserStage(document.querySelector('#story'));
let preset = query.get('preset') in PRESETS ? query.get('preset') : 'tail';
let playing = !query.has('capture'), elapsed = 0, previous = performance.now();
const controls = ['az', 'height', 'size', 'shift'];
function sync() {
  document.querySelector('#preset').value = preset;
  for (const id of controls) {
    document.querySelector(`#${id}`).value = stage.settings[id];
    document.querySelector(`#${id}-value`).textContent = stage.settings[id];
  }
  document.querySelector('#record').href = `?record&mute${query.has('night') ? '&night' : ''}&preset=${preset}`;
}
window.setPreset = id => { preset = id; const result = stage.setPreset(id); sync(); return result; };
window.renderAt = seconds => { playing = false; elapsed = seconds; document.querySelector('#play').textContent = 'Reprodueix'; return stage.render(seconds); };
window.teaser = { duration: DURATION, presets: Object.keys(PRESETS), stage };
window.setPreset(preset);
for (const id of controls) document.querySelector(`#${id}`).addEventListener('input', e => { stage.settings[id] = Number(e.target.value); sync(); stage.render(elapsed); });
document.querySelector('#preset').addEventListener('change', e => window.setPreset(e.target.value));
document.querySelector('#record').addEventListener('click', e => { e.preventDefault(); document.body.classList.add('record'); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('record'); });
document.querySelector('#reset').addEventListener('click', () => window.setPreset(preset));
document.querySelector('#play').addEventListener('click', e => { playing = !playing; previous = performance.now(); e.target.textContent = playing ? 'Pausa' : 'Reprodueix'; });
document.querySelector('#guides').addEventListener('change', e => { document.querySelector('.guides').hidden = !e.target.checked; });
function tick(now) { if (playing) { elapsed = (elapsed + Math.min(0.1, (now - previous) / 1000)) % DURATION; stage.render(elapsed); } previous = now; requestAnimationFrame(tick); }
requestAnimationFrame(tick);
window.addEventListener('pagehide', () => stage.dispose(), { once: true });
window.teaserReady = true;
