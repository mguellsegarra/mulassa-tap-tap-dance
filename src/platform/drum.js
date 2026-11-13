// A Taiko drum plays the game (HORI's for the Switch: a USB gamepad): its face is don, its rim ka, on either side. The
// Gamepad API has no button events, so it is polled, and only while a pad is connected. A leaf module (flags and storage only):
// input.js owns what a hit does, so anyone may read drumOn() without an import cycle. Contract: docs/agents/drum-mode.md.
import { Q } from '../core/flags.js';
import { store } from './storage.js';

// Button index → zone (F face, R rim; L, R its side). UNCONFIRMED until tried on the real drum (VID 0f0d, PID 00f0; read
// from clone firmware): Chrome gives it no standard mapping, so an index is the HID usage - 1: rims = 6, 7 (ZL, ZR),
// faces = 10, 11 (the stick clicks). tools/dev/timbal.html shows what a drum really sends.
export const DRUM_ZONES = { 10: 'FL', 11: 'FR', 6: 'RL', 7: 'RR' };
// The drum's own buttons, learnt on tools/dev/timbal.html («Aprèn el timbal») and kept on the device: drums and platforms
// number them differently (Android, another model). Order: ?drummap (dev hosts), the learnt map, DRUM_ZONES.
export const DRUM_MAP_KEY = 'drum-map';
const drumMapOk = map => Object.fromEntries(Object.entries(map ?? {}).filter(([i, zone]) => /^\d+$/.test(i) && /^[FR][LR]$/.test(zone)));
const drumLearnt = () => { try { return drumMapOk(JSON.parse(store.get(DRUM_MAP_KEY))); } catch { return {}; } };
const drumMap = Q.get('drummap'); // dev hosts only: ?drummap=FL:10,FR:11,RL:6,RR:7, to try a drum's buttons
const drumFirst = drumMap ? drumMapOk(Object.fromEntries(drumMap.split(',').map(pair => pair.split(':').reverse()))) : drumLearnt();
export const drumZones = { ...(Object.keys(drumFirst).length ? drumFirst : DRUM_ZONES) };
// Keep a learnt map (button → zone) and play with it at once; null forgets it.
export function saveDrumMap(map) {
  const ok = drumMapOk(map);
  if (map) store.set(DRUM_MAP_KEY, JSON.stringify(ok)); else store.remove(DRUM_MAP_KEY);
  for (const k of Object.keys(drumZones)) delete drumZones[k];
  Object.assign(drumZones, map ? ok : DRUM_ZONES);
}

const drumWas = new Map(); // pad index → its buttons at the last poll
let drumHit = false, drumRaf = 0, drumFast = 0, drumDown = null, drumPlaying = null;
// The Gamepad API hides a pad until its first hit after each load; WebHID (HTTPS, Chromium) lists at once a drum this site
// was once allowed to see (connectDrum, from ⚙ Configuració), and says when it is plugged in or out: then the very first
// song is a drum run, with no hit to wake it.
export const DRUM_HID = { vendorId: 0x0f0d, productId: 0x00f0 }; // HORI's Taiko drum for the Switch
const drumHid = globalThis.isSecureContext ? globalThis.navigator?.hid : null;
let drumPlugged = false;
const drumSeen = devices => devices.some(d => d.vendorId === DRUM_HID.vendorId && d.productId === DRUM_HID.productId);
const drumHidCheck = () => drumHid.getDevices().then(list => { drumPlugged = drumSeen(list); }, () => {}); // only connected devices
if (drumHid) { drumHidCheck(); drumHid.addEventListener('connect', drumHidCheck); drumHid.addEventListener('disconnect', drumHidCheck); }
export const drumCanConnect = () => !!drumHid; // the browser can be shown the drum
export const drumPluggedIn = () => drumPlugged;
// From a click (the browser asks the player to pick the drum once): true when it was picked.
export async function connectDrum() {
  drumPlugged = drumSeen(await drumHid.requestDevice({ filters: [DRUM_HID] })) || drumPlugged;
  return drumPlugged;
}
// A drum is being played: it is plugged in (WebHID), or a mapped button was hit and its pad is still there (the tutorial's words).
export const drumOn = () => drumPlugged || (drumHit && drumWas.size > 0);
// input.js: hit(zone, e) once per hit; e.timeStamp is when. playing(): a song is on, so the pad is read every 4 ms too.
export function onDrum(hit, playing) { drumDown = hit; drumPlaying = playing; }

// Edges since the last poll; nothing allocated unless a mapped button was hit. Only a rising edge is a hit: a drum never
// holds a button down, so there is no release to tell.
// shortcut: the API keeps only a pad's last state, so a hit that starts and ends between two polls (under 4 ms, or under
// a long main-thread task), or a re-hit of a button seen down both times, is lost. Read WebHID input reports if the real
// drum drops hits (tools/dev/timbal.html measures how long a hit lasts).
function drumPoll() {
  const pads = navigator.getGamepads();
  for (let p = 0; p < pads.length; p++) {
    const pad = pads[p], was = pad?.connected && drumWas.get(pad.index);
    if (!was) continue;
    for (let i = 0; i < pad.buttons.length; i++) {
      const on = pad.buttons[i].pressed, zone = drumZones[i];
      if (on === !!was[i]) continue;
      was[i] = on;
      if (!zone || !on) continue;
      drumHit = true;
      // Dated now, when this poll saw it: at most one poll late (4 ms in a song). Never pad.timestamp, which is stale on
      // some platforms: eventAge takes up to 0.5 s of it, and every hit was judged that early.
      drumDown?.(zone, { timeStamp: performance.now() });
    }
  }
}
// Every frame while a pad is plugged in; in a song a timer too: a hit lasts some 25 ms, less than a frame at an even 30 fps.
function drumFrame() {
  drumRaf = drumWas.size ? requestAnimationFrame(drumFrame) : 0;
  drumPoll();
  if (!drumFast && drumWas.size && drumPlaying?.()) drumFast = setInterval(drumTick, 4);
}
function drumTick() {
  if (drumWas.size && drumPlaying?.()) return drumPoll();
  clearInterval(drumFast); drumFast = 0;
}
// Chrome announces a pad at its first button press, which the first poll then reads as a hit
addEventListener('gamepadconnected', e => { drumWas.set(e.gamepad.index, []); drumRaf ||= requestAnimationFrame(drumFrame); });
addEventListener('gamepaddisconnected', e => {
  drumWas.delete(e.gamepad.index);
  if (!drumWas.size) drumHit = false;
});
