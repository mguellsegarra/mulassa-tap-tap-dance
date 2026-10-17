// ?aliga: the Àliga de Valls (1991) and her three aligons dance the complete song, holding the final tableau
// for comparison with the references; ?aliga=turntable: the eagle alone, turning slowly; ?aliga=<degrees> with ?view: the eagle alone, turned
// that far (90 shows her right side to ?view=front); ?aliga=bow: the group in her big bow, the aligons curled up on the ground.
// ?aligat=N freezes at N seconds, clamped to [0, song.end] (the exact end is held, not wrapped). Invalid N becomes 0.
// It also freezes the turntable; bow/angle modes stay static. For fixed framing use ?mute&aliga&aligat=N&view=front.
// ?mute uses performance.now(), starting when the rig is ready; otherwise the HTML audio clock drives the pose,
// held at 0 until a real tap/key starts the recording. Static inspection modes never play audio.
// __aligaPreview.seek(N) freezes like aligat; seek(null) resumes (audible playback still needs a user gesture).
// Without the flag nothing loads (separate chunks), no handlers or debug globals are installed.
import { Q } from '../core/env.js';
import { TAU } from '../core/anim.js';
import { scene, mula, FRONT } from '../scene/stage.js';
import { engine, setMenuMusic } from '../game/state.js';

const ALIGA_MODE = Q.get('aliga'); // null: off, '': the group, 'turntable', 'bow', or degrees
const YAW = (Number.parseFloat(ALIGA_MODE) || 0) * TAU / 360;
const ALIGA_DANCE = ALIGA_MODE === '';
const ALIGA_VIEWS = { front: [0, 0.8, 1], side: [1, 0.8, 0], left: [-1, 0.8, 0], back: [0, 0.8, -1], top: [0.2, 1, 0.2], low: [0, 0.18, 1] };
const ALIGA_CAMERA = [Math.sin(FRONT), 0.8, Math.cos(FRONT)];
let aligaRig = null, aligaPose = null, aligaApply = null;
let aligaDance = null, aligaSong = null, aligaTimeline = null, aligaAudio = null;
let aligaStart = 0, aligaBase = 0, aligaFrozen = null, aligaReady = false, aligaError = null;
const aligaClamp = n => Math.min(aligaSong.end, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : 0));
function aligaTime() {
  if (!aligaReady) return 0;
  if (aligaFrozen !== null) return aligaFrozen;
  if (ALIGA_DANCE && aligaAudio) return Math.min(aligaSong.end, Math.max(0, aligaAudio.currentTime));
  if (!ALIGA_DANCE) return aligaBase + (performance.now() - aligaStart) / 1000;
  return Math.min(aligaSong.end, aligaBase + (performance.now() - aligaStart) / 1000);
}
function aligaSeek(n) {
  if (!aligaReady) return false;
  const t = n === null ? aligaTime() : aligaClamp(n);
  aligaFrozen = n === null ? null : t;
  aligaBase = t; aligaStart = performance.now();
  if (aligaAudio) {
    aligaAudio.pause();
    try { aligaAudio.currentTime = t; } catch { /* loadedmetadata reapplies the pending seek */ }
  }
  aligaTick(); // a seek is visible without waiting for the next frame
  return true;
}
function aligaSilenceGame() {
  // main.js still prepares its suspended engine. Keep both outputs quiet even if another control wakes it.
  if (engine) { engine.out.gain.value = 0; engine.music.gain.value = 0; }
}
if (ALIGA_MODE !== null) {
  mula.root.visible = false;
  // Keep the normal loader, plaza and camera; hide the game's splash/HUD and controls in this preview only.
  const previewStyle = document.createElement('style');
  previewStyle.textContent = 'body.aliga-preview :is(#hud, #pad, #leaders, #settings, #feedback, #music, #howto, #viewmode, #ios-hint, #fps, #feedback-nudge, #pause, #skip, #results-actions, dialog) { visibility: hidden !important; pointer-events: none !important; }';
  document.head.append(previewStyle);
  document.body.classList.add('aliga-preview');
  setMenuMusic(false); // session only: do not change the player's saved speaker preference
  const blockGame = e => {
    aligaSilenceGame();
    e.stopImmediatePropagation();
    if (e.cancelable) e.preventDefault();
    const gesture = e.isTrusted && !e.repeat && ['pointerup', 'touchend', 'click', 'keydown'].includes(e.type);
    // Keep the final tableau. A new gesture replays the complete performance without a visible loop teleport.
    if (gesture && aligaReady && ALIGA_DANCE && aligaFrozen === null && aligaTime() >= aligaSong.end) {
      aligaSeek(0); aligaSeek(null);
    }
    if (gesture
      && aligaAudio && aligaReady && aligaFrozen === null && aligaAudio.paused) {
      // Never attempt autoplay. A rejected gesture can be retried by the next tap, with no unhandled rejection.
      try { aligaAudio.play()?.catch(() => {}); } catch { /* retry on the next real gesture */ }
    }
  };
  for (const ev of ['pointerdown', 'pointerup', 'pointercancel', 'touchend', 'click', 'keydown', 'keyup'])
    window.addEventListener(ev, blockGame, { capture: true, passive: false });
  window.__aligaPreview = {
    get ready() { return aligaReady; }, get error() { return aligaError; },
    get time() { return aligaTime(); }, get duration() { return aligaSong?.end ?? 0; },
    get mode() { return ALIGA_DANCE ? 'dance' : ALIGA_MODE; }, get frozen() { return aligaFrozen !== null; },
    get clock() { return aligaAudio ? 'audio' : 'performance'; },
    get playing() { return aligaReady && aligaFrozen === null && (!aligaAudio || !aligaAudio.paused); },
    get source() { return { audio: aligaSong?.audio, end: aligaSong?.end, revision: 'band-r3' }; },
    seek: aligaSeek,
  };
  Promise.all([
    import('../scene/models/aliga.js'), import('../game/aliga-dance.js'),
    import('../game/aliga-song.json'), import('../game/aliga-dance.json'),
  ]).then(([{ buildAligaRig, NEUTRAL, applyAligaPose }, dance, song, timeline]) => {
    // Repeatable colour jitter for matched review captures; other scene construction keeps its own randomness.
    const random = Math.random;
    if (Q.has('aligaseed')) {
      let seed = Number(Q.get('aligaseed')) >>> 0;
      Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
    }
    try { aligaRig = buildAligaRig(); } finally { Math.random = random; }
    aligaDance = dance.aligaPose; aligaSong = song.default; aligaTimeline = timeline.default;
    aligaPose = ALIGA_DANCE ? dance.newAligaPose() : structuredClone(NEUTRAL); // reused every frame
    aligaApply = applyAligaPose;
    if (ALIGA_MODE === 'bow') {
      aligaPose.aliga.pitch = 1.15;
      for (const k of aligaPose.aligons) k.crouch = 1;
    } else if (ALIGA_MODE !== '') for (const k of aligaRig.aligons) k.root.visible = false;
    if (ALIGA_MODE !== '' && aligaPose.aliga.feet) dance.standFeet(aligaPose);
    if (ALIGA_DANCE && !Q.has('mute')) {
      aligaAudio = new Audio(aligaSong.audio);
      aligaAudio.loop = false;
      aligaAudio.preload = 'auto';
      aligaAudio.addEventListener('error', () => { aligaError = 'No s’ha pogut carregar la música de l’Àliga.'; });
      // A pre-metadata seek can be ignored by a browser; reapply the held time when the recording is ready.
      aligaAudio.addEventListener('loadedmetadata', () => { aligaAudio.currentTime = aligaFrozen ?? aligaBase; });
      window.addEventListener('pagehide', () => aligaAudio.pause());
    }
    aligaStart = performance.now();
    if (Q.has('aligat')) aligaFrozen = aligaClamp(Q.get('aligat'));
    aligaReady = true;
    aligaTick();
    scene.add(aligaRig.root);
  }).catch(e => { aligaReady = false; aligaError = String(e.message || e); });
}
// The turntable uses the same seekable preview clock. The rig stays anchored to the plaça: planted feet must never inherit the
// hidden Mulassa demo's travel. The camera remains the normal plaza camera;
// ?view faces her front to +z, so front/side/back mean the eagle's own.
export function aligaTick(t) {
  if (ALIGA_MODE === null) return;
  aligaSilenceGame();
  if (!aligaReady) return;
  const time = aligaTime();
  if (ALIGA_DANCE) aligaDance(time, aligaSong, aligaTimeline, aligaPose);
  aligaRig.root.position.set(0, 0, 0);
  aligaRig.root.rotation.y = ALIGA_MODE === 'turntable' ? time * TAU / 24 : Q.has('view') ? YAW : FRONT; // the aligons' ring turns with her
  aligaApply(aligaRig, aligaPose);
}

// The preview frames the whole formation, independently of the hidden Mulassa's demo camera.
// A high lens also clears the façades on narrow viewports, where the full group needs more distance.
export function aligaFrameCamera(camera) {
  if (ALIGA_MODE === null || !aligaReady) return;
  const focus = Q.has('aligofocus') ? Math.min(2, Math.max(0, Number(Q.get('aligofocus')) || 0)) : null;
  const view = Q.get('view'), radius = focus !== null ? 0.85 : ALIGA_DANCE || ALIGA_MODE === 'bow' ? 5 : 2.5;
  let x = 0, y = 1.2, z = 0;
  if (focus !== null) {
    const q = aligaPose.aligons[focus], yaw = aligaRig.root.rotation.y;
    x = q.x * Math.cos(yaw) + q.z * Math.sin(yaw);
    z = -q.x * Math.sin(yaw) + q.z * Math.cos(yaw);
    y = 0.5;
  }
  const direction = ALIGA_VIEWS[view] || ALIGA_CAMERA;
  const distance = radius / Math.sin(Math.atan(Math.tan(27 * Math.PI / 180) * Math.min(1, camera.aspect)));
  const scale = distance / Math.hypot(...direction);
  camera.fov = 54;
  if (camera.view?.enabled) camera.clearViewOffset();
  camera.position.set(x + direction[0] * scale, y + direction[1] * scale, z + direction[2] * scale);
  camera.lookAt(x, y, z);
  camera.updateProjectionMatrix();
}
