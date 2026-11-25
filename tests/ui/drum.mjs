import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The drum from the pad's buttons to the judge: drum.js polls a fake Gamepad API and input.js's real wiring takes its
// hits. press is a stub: what the judge does with a zone is tests/game's.
const strip = file => readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const wiring = strip('ui/input.js').match(/^onDrum\([\s\S]*?^\}, .*\n/m)?.[0]; // input.js's own drum wiring, without the rest of the file's listeners
assert(wiring, 'input.js wires the drum');
function drum(search = '', saved = {}, hid = null) {
  const listeners = {}, frames = [], timers = [], calls = [];
  const G = { state: 'play', paused: false, diff: 1, resT: 0 }, down = { keys: new Set(), ptr: new Map() };
  const pad = { index: 0, connected: true, timestamp: 0, buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const d = { listeners, frames, timers, calls, G, down, pad, titles: 0, now: 0, bou: false, touchRun: false, restarts: 0, syncTaps: [], saved };
  d.context = vm.createContext({
    Q: new URLSearchParams(search), G, down, navigator: { getGamepads: () => [pad, null], hid }, isSecureContext: !!hid, performance: { now: () => d.now },
    setInterval: f => (timers.push(f), timers.length), clearInterval: () => { timers.length = 0; },
    requestAnimationFrame: f => frames.push(f), addEventListener: (type, f) => { listeners[type] = f; },
    store: { get: k => saved[k] ?? null, set: (k, v) => { saved[k] = v; }, remove: k => { delete saved[k]; } },
    sheets: { sync: { open: false, drumTap: e => d.syncTaps.push(e.timeStamp) } },
    clock: 5, sheetUp: () => false, toDrumRun: () => (d.touchRun ? (d.touchRun = false, d.restarts++, true) : false), bouTap: () => d.bou, toTitle: () => d.titles++,
    press: (dir, e, zone) => calls.push([dir, zone, e.timeStamp]),
  });
  vm.runInContext(strip('platform/drum.js'), d.context);
  vm.runInContext(wiring, d.context);
  d.run = code => vm.runInContext(code, d.context);
  d.poll = at => { d.now = at; assert.equal(frames.length, 1, 'one poll loop'); frames.shift()(); };
  // a hit: the button goes down at `at` and is back up 25 ms later, each seen by one poll
  d.hit = (i, at) => { pad.buttons[i].pressed = true; d.poll(at); pad.buttons[i].pressed = false; d.poll(at + 25); };
  return d;
}

const d = drum(), { pad, calls, frames, timers, listeners, G } = d;
assert.equal(frames.length, 0, 'no polling without a pad');
assert.equal(d.run('drumOn()'), false);
// the pad's own timestamp is half a second old (stale on some platforms): the hit is dated at the poll that saw it
pad.buttons[10].pressed = true; pad.timestamp = 100;
listeners.gamepadconnected({ gamepad: pad });
d.poll(600);
assert.deepEqual(calls, [['L', 'FL', 600]], 'the press that announced the pad is a left-face hit, dated at its poll and not from gamepad.timestamp');
assert.equal(d.run('drumOn()'), true);
assert.equal(timers.length, 1, 'a song reads the pad between frames too');
pad.buttons[10].pressed = false; d.poll(625);
d.poll(5000);
assert.equal(calls.length, 1, 'letting go is nothing, and nothing comes later: no latch');
assert.equal(d.down.ptr.size, 0, 'a hit holds nothing down');

// the four zones: each hit is its side, and the judge gets the zone (face or rim)
calls.length = 0;
[10, 11, 6, 7].forEach((i, k) => d.hit(i, 6000 + k * 100));
assert.deepEqual(calls, [['L', 'FL', 6000], ['R', 'FR', 6100], ['L', 'RL', 6200], ['R', 'RR', 6300]]);
// both faces in one poll: two hits, each with its zone (the judge drops an echo)
calls.length = 0;
pad.buttons[10].pressed = pad.buttons[11].pressed = true; d.poll(7000);
assert.deepEqual(calls, [['L', 'FL', 7000], ['R', 'FR', 7000]]);
pad.buttons[10].pressed = pad.buttons[11].pressed = false; d.poll(7025);
// the timer catches a hit between frames, once; an unmapped button is nothing
calls.length = 0;
pad.buttons[6].pressed = pad.buttons[0].pressed = true; d.now = 8000; timers[0](); d.poll(8003);
assert.deepEqual(calls, [['L', 'RL', 8000]]);
// a button kept down (a plain gamepad) is one hit; hitting it again needs it up first
d.poll(8500); pad.buttons[6].pressed = pad.buttons[0].pressed = false; d.poll(8600);
assert.equal(calls.length, 1);

// results: a hit goes on like Space; other screens and the Bou's close-up take none
calls.length = 0;
d.bou = true; d.hit(10, 9000); d.bou = false;
G.state = 'results'; d.hit(10, 9500);
assert.equal(d.titles, 1);
G.state = 'splash'; d.hit(10, 10000);
assert.deepEqual(calls, [], 'no hit is judged outside a song');
timers[0]?.();
assert.equal(timers.length, 0, 'the timer stops outside a song');
d.poll(10500);

// unplugged: no drum, the loop ends
G.state = 'play';
d.hit(10, 11000);
listeners.gamepaddisconnected({ gamepad: pad });
assert.equal(d.run('drumOn()'), false);
d.poll(11100);
assert.equal(frames.length, 0, 'the poll stops with the last pad');

// ?drummap= names each zone's button; a malformed pair is dropped
const m = drum('drummap=FL:0,FR:1,RL:2,RR:3,XX:4,FL:x');
assert.deepEqual({ ...m.run('drumZones') }, { 0: 'FL', 1: 'FR', 2: 'RL', 3: 'RR' });
m.listeners.gamepadconnected({ gamepad: m.pad });
m.poll(0); m.hit(3, 100); m.hit(10, 200);
assert.deepEqual(m.calls, [['R', 'RR', 100]], 'the default buttons are no longer zones');
assert.deepEqual({ ...d.run('drumZones') }, { 6: 'RL', 7: 'RR', 10: 'FL', 11: 'FR' });

// a run begun before the drum was seen (the touch chart): its first drum hit restarts it as a drum run, unjudged
const tr = drum(); tr.listeners.gamepadconnected({ gamepad: tr.pad }); tr.poll(0);
tr.touchRun = true; tr.hit(10, 100); tr.hit(10, 300);
assert.equal(tr.restarts, 1, 'restarted once');
assert.deepEqual(tr.calls, [['L', 'FL', 300]], 'the restarting hit is not judged; the next one is');

// the sync sheet's metronome takes a drum hit as a tap, dated at the poll, and the pad is read every 4 ms meanwhile
const sy = drum(); sy.G.state = 'select'; sy.listeners.gamepadconnected({ gamepad: sy.pad }); sy.poll(0);
sy.run('sheets.sync.open = true'); sy.hit(11, 100); sy.hit(7, 300);
assert.deepEqual(sy.syncTaps, [100, 300], 'face and rim are taps on the metronome');
assert.deepEqual(sy.calls, [], 'and nothing is judged');
assert.equal(sy.timers.length, 1, 'the metronome reads the pad between frames too');

// a learnt map (tools/dev/timbal.html) beats the factory one; saving one plays at once, null forgets it
const l = drum('', { 'drum-map': JSON.stringify({ 4: 'FL', 5: 'FR', 8: 'RL', 9: 'RR', 3: 'XX' }) });
assert.deepEqual({ ...l.run('drumZones') }, { 4: 'FL', 5: 'FR', 8: 'RL', 9: 'RR' });
l.run("saveDrumMap({ 1: 'FL', 2: 'RR' })");
assert.deepEqual({ ...l.run('drumZones') }, { 1: 'FL', 2: 'RR' });
assert.equal(l.saved['drum-map'], JSON.stringify({ 1: 'FL', 2: 'RR' }));
l.run('saveDrumMap(null)');
assert.deepEqual({ ...l.run('drumZones') }, { 6: 'RL', 7: 'RR', 10: 'FL', 11: 'FR' });
assert.equal(l.saved['drum-map'], undefined);
assert.deepEqual({ ...drum('', { 'drum-map': '{bad' }).run('drumZones') }, { 6: 'RL', 7: 'RR', 10: 'FL', 11: 'FR' }, 'a broken saved map is ignored');

// WebHID: a drum this site was once allowed to see is on as the page loads, before any hit; unplugged, it is off
const tick = () => new Promise(r => setTimeout(r, 0));
const hidOn = { devices: [{ vendorId: 0x0f0d, productId: 0x00f0 }], on: {} };
const fakeHid = h => ({ getDevices: async () => h.devices, addEventListener: (type, f) => { h.on[type] = f; }, requestDevice: async () => h.devices });
const w = drum('', {}, fakeHid(hidOn));
await tick();
assert.equal(w.run('drumOn()'), true, 'plugged in and allowed: on with no hit');
hidOn.devices = []; hidOn.on.disconnect(); await tick();
assert.equal(w.run('drumOn()'), false, 'unplugged: off');
const other = drum('', {}, fakeHid({ devices: [{ vendorId: 0x0f0d, productId: 0x00c1 }], on: {} }));
await tick();
assert.equal(other.run('drumOn()'), false, 'another HORI pad is not the drum');
assert.equal(drum().run('drumCanConnect()'), false, 'no WebHID (http, Safari, Firefox): no button');
console.log('drum: edges, zones, dated at the poll, no latch, results and unplug, ?drummap, sync taps, learnt map, WebHID ok');
