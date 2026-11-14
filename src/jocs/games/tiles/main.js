// Composition root of the tiles POC: the lanes' canvas, the run, the taps and the page's covers.
// The tune and its columns are song.js, the sound synth.js; the page's shell is Plassa's.
// The run's clock is the audio clock: tiles are drawn and taps judged against it, and a note in a streak sounds at its
// written time, not at the tap, so the tune never drifts off the accompaniment.
import { buildNotes, chordFor, SPB, LEAD, END, OPEN, HIT, MISS, HELD } from './song.js';
import { createView, GOLD, CREAM } from './view.js';
import { createSynth } from './synth.js';
import { deviceBest } from '#plassa/best.js';
import { setupOrientation } from '#plassa/orientation.js';
import { onPageLeave } from '#plassa/page-leave.js';
import { errors } from '#plassa/errors.js';
import { stopDoubleTapZoom } from '#plassa/double-tap.js';
import { bootLines } from '#plassa/boot-lines.js';
import { haptic } from '#plassa/haptics.js';
import { setupSheetKeys } from '#plassa/sheet-keys.js';
import { onEveryGesture } from '#plassa/gesture.js';
import { setUiSound, soundOnPress, blipOn } from '#plassa/ui-sound.js';
import { closeOnBackdrop } from '#plassa/backdrop.js';
import '#plassa/focus.js';

const $ = id => document.getElementById(id);
window.__gameBootWords = { title: 'Alguna cosa ha fallat', text: 'Torna-ho a provar.', retry: 'Torna-hi' }; // provisional words
const lines = bootLines($('boot-line'));
const canvas = $('game'), view = createView(canvas);
const best = deviceBest('jocs.tiles.best');
const AUTO = import.meta.env.DEV && new URLSearchParams(location.search).has('auto'); // dev: the run plays itself
const EARLY = .25, LATE = .16, PERFECT = .055; // seconds before and after a note that count, and either side that shine
const SLACK = .12; // a held note let go this close to its end is whole
const AHEAD = .12; // seconds of sound given to the audio clock in advance
const KEYS = { d: 0, f: 1, j: 2, k: 3 };

const synth = createSynth();
let mode = 'menu', notes = [], ghosts = [], nextGhost = 0, total = 0, t0 = 0, score = 0, combo = 0, longest = 0;
let deadAt = 0; // the run's time when a note was missed: the lanes stop there
let nextBeat = 0, first = 0; // the next beat of accompaniment to schedule, the first note still on screen
const holds = new Map(); // a finger or a key → the note it holds
let lastFrame = 0;
const page = () => performance.now() / 1000;

// the run's time as the player hears it: what the audio clock schedules now reaches the ear a little later
const now = () => synth.ctx.currentTime - t0 - (synth.ctx.outputLatency || synth.ctx.baseLatency || 0);

function start() {
  synth.ctx.resume();
  const all = buildNotes();
  notes = all.filter(n => !n.ghost);
  ghosts = all.filter(n => n.ghost);
  total = notes.reduce((a, n) => a + 1 + (n.hold ? n.dots + 1 : 0), 0);
  score = combo = longest = nextBeat = first = nextGhost = 0;
  holds.clear();
  view.clear();
  t0 = synth.ctx.currentTime + .15;
  for (const id of ['menu', 'end-menu', 'pause-menu']) $(id).hidden = true;
  $('hud').hidden = false;
  hud();
  mode = 'run';
}
function hud(bump) {
  $('score').textContent = score;
  $('combo').textContent = combo > 4 ? `×${combo}` : '';
  if (bump) $('score').animate([{ scale: 1.22 }, { scale: 1 }], { duration: 130, easing: 'ease-out' });
}
function gain(points) {
  score += points;
  longest = Math.max(longest, ++combo);
  if (combo % 25 === 0) { view.flare(); haptic('combo'); view.say(`×${combo}`, GOLD); } // provisional words, here and below
  hud(true);
}
function sound(n) { n.voice = synth.lead(n.midi, Math.max(synth.ctx.currentTime, t0 + n.t), n.len, !!n.hold); }
function schedule() {
  const ctx = synth.ctx, until = ctx.currentTime + AHEAD;
  for (; nextBeat < END && t0 + nextBeat * SPB < until; nextBeat++) {
    const at = Math.max(ctx.currentTime, t0 + nextBeat * SPB);
    if (nextBeat < LEAD) synth.tick(at); // the count-in
    else if ((nextBeat - LEAD) % 2 === 0) synth.bass(chordFor(nextBeat)[0], at);
    else synth.stab(chordFor(nextBeat), at);
  }
  for (; nextGhost < ghosts.length && t0 + ghosts[nextGhost].t < until; nextGhost++) sound(ghosts[nextGhost]);
  // never a note whose time has gone: a late hit sounds it itself
  for (let i = first; i < notes.length && t0 + notes[i].t < until; i++) {
    const n = notes[i];
    if (!n.voice && t0 + n.t >= ctx.currentTime) sound(n);
  }
}
function hit(n, t, by) {
  n.perfect = Math.abs(n.t - t) <= PERFECT;
  if (!n.voice) sound(n); // tapped early: at its written time; late: now
  if (n.hold) { n.state = HELD; holds.set(by, n); } else n.state = HIT;
  view.hit(n.col, n.perfect, n.t - t);
  if (n.perfect) view.say('Perfecte!', CREAM);
  haptic(n.perfect ? 'hit' : 'tap');
  gain(1);
}
// a note gone by ends the run: the tune stops, its tile blinks, then the end sheet
function miss(n, t) {
  n.state = MISS;
  mode = 'dead';
  deadAt = t;
  view.jolt();
  for (const o of [...notes, ...ghosts]) if (o.voice) synth.cut(o.voice);
  holds.clear();
  haptic('miss');
  setTimeout(() => { if (mode === 'dead') finish(false); }, 1100);
}
// a held note ends: whole when its time is up, cut short when the finger leaves early
function letGo(by, t) {
  const n = holds.get(by);
  if (!n) return;
  holds.delete(by);
  n.state = HIT;
  if (t >= n.t + n.hold - SLACK) {
    view.hit(n.col, true, 0, true);
    haptic('hit');
    gain(1);
  } else if (n.voice) synth.cut(n.voice);
}
function tap(col, by) {
  if (mode !== 'run') return;
  const t = now();
  for (let i = first; i < notes.length && notes[i].t <= t + EARLY; i++) {
    const n = notes[i];
    if (n.state === OPEN && n.col === col && n.t >= t - LATE) { view.press(col); return hit(n, t, by); }
  }
  view.press(col, true);
  combo = 0;
  hud();
}
function finish(whole) {
  mode = 'over';
  const raised = best.raiseBest(score), part = score / total;
  $('end-title').textContent = raised ? 'Rècord!' : whole ? 'Fet!' : 'Ai!'; // i18n-ok: the POC's provisional words
  $('end-score').textContent = `${'★'.repeat(part >= .95 ? 3 : part >= .8 ? 2 : part >= .6 ? 1 : 0).padEnd(3, '☆')} ${score}`;
  $('end-sub').textContent = `De ${total} punts · Ratxa més llarga ${longest} · Rècord ${best.best()}`; // i18n-ok: the POC's provisional words
  $('end-menu').hidden = false;
  $('again').focus({ focusVisible: false });
}
function pause() {
  if (mode !== 'run') return;
  for (const by of [...holds.keys()]) letGo(by, now()); // a finger lifted during the pause would never be seen
  mode = 'paused';
  synth.ctx.suspend(); // the audio clock stops, and the run with it
  $('pause-menu').hidden = false;
}
function resume() {
  $('pause-menu').hidden = true;
  synth.ctx.resume();
  mode = 'run';
}
function toMenu() {
  synth.ctx.resume(); // lets the last scheduled sounds end instead of waiting for the next run
  mode = 'menu';
  notes = [];
  for (const id of ['end-menu', 'pause-menu', 'hud']) $(id).hidden = true;
  $('menu').hidden = false;
  showBest();
}
function showBest() { const b = best.best(); $('menu-best').hidden = !b; $('menu-best').textContent = `Rècord: ${b} punts`; } // i18n-ok: the POC's provisional words

canvas.addEventListener('pointerdown', e => tap(view.colAt(e.clientX), e.pointerId));
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, e => { if (mode === 'run') letGo(e.pointerId, now()); });
addEventListener('keydown', e => {
  if (e.key in KEYS && !e.repeat) tap(KEYS[e.key], e.key);
  else if (e.key === 'Escape' && mode === 'paused') resume();
  else if (e.key === 'Escape') pause();
});
addEventListener('keyup', e => { if (mode === 'run') letGo(e.key, now()); });
$('play').onclick = start;
$('again').onclick = start;
$('to-menu').onclick = toMenu;
$('quit').onclick = toMenu;
$('resume').onclick = resume;
setUiSound(blipOn(synth.ctx, synth.ctx.destination));
soundOnPress();
onEveryGesture(() => { if (mode !== 'paused') synth.ctx.resume(); }); // a pause keeps the audio clock stopped
closeOnBackdrop(() => { if (mode === 'paused') resume(); });
setupSheetKeys({ top: () => document.querySelector('.cover:not([hidden]):not(#boot)') });
onPageLeave(pause);
setupOrientation(pause);
stopDoubleTapZoom();
errors.context(() => ({ game: 'tiles', state: mode }));

function frame() {
  requestAnimationFrame(frame);
  const p = page(), dt = Math.min(.05, p - lastFrame);
  lastFrame = p;
  let t = 0;
  if (mode === 'run') {
    schedule();
    t = now();
    for (let i = first; i < notes.length && notes[i].t <= t; i++) {
      const n = notes[i];
      if (n.state !== OPEN) continue;
      if (AUTO) hit(n, n.t, n);
      else if (n.t < t - LATE) { miss(n, t); break; }
    }
    for (const [by, n] of holds) {
      while (n.got < n.dots && t >= n.t + (n.got + 1) * SPB) { n.got++; view.point(n.col); haptic('tap'); gain(1); }
      if (t >= n.t + n.hold) letGo(by, t);
    }
    while (first < notes.length && notes[first].state !== OPEN && notes[first].state !== HELD && notes[first].t + notes[first].len < t - 2) first++;
    if (mode === 'run' && t > END * SPB + .6) finish(true);
  } else if (mode === 'dead') t = deadAt;
  else if (notes.length) t = now();
  view.draw({ t, dt, notes, first, holds, mode });
}

showBest();
requestAnimationFrame(frame);
await document.fonts.ready;
await lines.finished();
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  errors.start();
  setTimeout(() => { $('boot').hidden = true; }, 400);
});
// dev: __tiles to read the run from the console
if (import.meta.env.DEV) window.__tiles = { get notes() { return notes; }, get mode() { return mode; }, get score() { return score; }, get total() { return total; }, clock: () => (mode === 'run' ? now() : -99), start };
