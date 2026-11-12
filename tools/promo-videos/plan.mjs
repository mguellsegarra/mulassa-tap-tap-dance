// The promo's edit decision list, in the song's beats. Writes the capture list (full/shots.json) and the Remotion
// timeline (src/timeline.json) from one place, so a cut moved here moves the capture, the picture and the music together.
// Usage: node plan.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const song = JSON.parse(readFileSync(resolve(HERE, '../../src/song-mulassa.json'), 'utf8'));
const B = song.beats, BP = 60 / song.bpm, FPS = 60;
const bt = b => { // song time of a fractional beat (past the last beat: the same tempo)
  const i = Math.min(Math.floor(b), B.length - 1);
  return B[i] + (b - i) * (i + 1 < B.length ? B[i + 1] - B[i] : BP);
};

// The music: the game's own arrangement, re-rendered for the promo by music.py with its events laid out in this order:
// one bar of the intro's first measure (taiko and shaker only, muffled, from silence) under black, then the intro again
// + A1's first phrases; from beat 136 (the same place in the tune, in A2's colours) through the GLOBUS roll into B's
// first phrase, left on its cadence (C at 150, before the E5 E5 pickup that belongs to the next phrase); then beat 291:
// the G5 G5 pickup and snare fill the song itself plays into the FINAL ESBOJARRAT (both joins on the 2nd beat of a
// 2/4 bar, on C), to the last hit and its ring-out. vb = beats of the finished piece.
const TAIL = 2.3; // seconds after the last hit: it rings out and fades to nothing
const LEAD = 4; // beats of black and music before the first picture
export const SEGS = [{ vb: 0, song: 0, to: LEAD }, { vb: LEAD, song: 0, to: 40 }, { vb: LEAD + 40, song: 136, to: 151 }, { vb: LEAD + 55, song: 291, to: 312 + TAIL / BP }];
const seg = vb => SEGS.findLast(s => vb >= s.vb - 1e-9);
const songBeat = vb => { const s = seg(vb); return s.song + vb - s.vb; };
const T = vb => B[0] + vb * BP; // output seconds of the piece's beat vb: music.py renders it there (like the song, beat 0 at 0.1 s)
const F = vb => Math.round(T(vb) * FPS);
const END_VB = SEGS.at(-1).vb + SEGS.at(-1).to - SEGS.at(-1).song;
const vbOf = songB => { const s = SEGS.findLast(s => songB >= s.song && songB <= s.to); return s.vb + songB - s.song; };

// The crowd's chant, drawn by the game itself (its big rainbow headline, hud/praise.js), with the game's rhythm
// (flow at the song's end: GUAPA, at 0, GUAPA… at 0.8 s, I GUAPA! at 1.8 s for 1.6 s), here in the middle of the frenzy.
const chant = (beat, word, dur) => ({ beat, js: `window.__dbg.G.praise = { word: ${JSON.stringify(word)}, tier: 'rainbow', pri: 9, dur: ${dur}, t0: window.__dbg.clock, seed: 0.5, big: true }` });

// The shots. at/len in vb; src: the song beat whose moment is filmed at `at` (default: the music's own, so every visible
// hit lands on its sound; borrowed close-ups keep a whole-beat offset, so the dance still moves on the music's beat).
// grade: 'dusk' = the opening's darker, vignetted look easing to normal. fadeIn/fadeOut in beats.
const SHOTS = [
  // EXPECTATIVA — the intro, muffled: details in the half-dark
  { name: '01-ull', at: LEAD + 0, len: 4.5, src: 20, fadeIn: 3, fadeOut: 1, grade: 'dusk', vcam: { fov: 34, dist: [5.6, 4.6], up: 0.1 }, cam: { target: 'head', azFrom: 'heading', az: [84, 74], el: [2, 5], dist: [2.7, 2.1], fov: 30, up: -0.05, lag: 0.1, yawLag: 0.3 } },
  { name: '02-potes', at: LEAD + 9, len: 3, src: 57, grade: 'dusk', vcam: { az: [80, 66], el: 2, fov: 56, dist: [3.2, 2.9], up: -0.72, fwd: 1.0 }, cam: { target: 'body', azFrom: 'heading', az: [100, 80], el: 3, dist: [3.3, 2.9], fov: 38, up: -0.72, lag: 0.2, yawLag: 0.5 } }, // src in A1: no confetti on the floor yet (that's the festa's); vertical: the narrow frame on the front carriers' legs
  { name: '03-boca', at: LEAD + 12, len: 4, src: 76, grade: 'dusk-open', vcam: { fov: 40, dist: [6.0, 4.8], up: 0 }, cam: { target: 'head', azFrom: 'heading', az: [34, 12], el: [3, 6], dist: [3.3, 2.5], fov: 32, up: 0.1, lag: 0.12 } },
  // RITME — the tune enters on a GUAPA; then the game, long enough to see how it plays
  { name: '04-entra', at: LEAD + 16, len: 4, fadeOut: 0.5, vcam: { az: [-46, -54], fov: 52, dist: [9.6, 8.6], up: 1.2, fwd: 0.6 }, cam: { target: 'body', azFrom: 'world', az: [-28, -36], el: 6, dist: [8.6, 7.6], fov: 38, up: 1.0, lag: 0.3 } },
  { name: '05-joc', at: LEAD + 24, len: 12, fadeOut: 0.5, play: true },
  // CARÀCTER I ESCALADA
  { name: '08-cap', at: LEAD + 40, len: 4, vcam: { fov: 40, dist: [6.2, 5.0], up: 0 }, cam: { target: 'head', azFrom: 'heading', az: [34, 14], el: [3, 7], dist: [3.4, 2.7], fov: 32, up: 0.1, lag: 0.12 } },
  { name: '09-globus', at: LEAD + 44, len: 4, play: true },
  { name: '10-entrebanc', at: LEAD + 48, len: 4, vcam: { fov: 54, dist: [11.2, 10.4], up: 1.5, fwd: 0.6 }, cam: { target: 'body', azFrom: 'world', az: [-30, -38], el: 7, dist: [7.4, 6.6], fov: 40, up: 1.0, lag: 0.3 },
    events: [{ beat: 144, dt: -0.03, js: "window.__dbg.press('R')" }] }, // a wrong button on the B's first GUA: PATAPAM, then the GUAPA at 146 lifts her
  { name: '11-plaça', at: LEAD + 52, len: 3, vcam: { fov: 52, el: 10, dist: [11.0, 10.2], up: 1.5 }, cam: { target: 'body', azFrom: 'world', az: [-100, -92], el: 11, dist: [10.5, 9.3], fov: 40, up: 1.1, lag: 0.4 } },
  // FESTA — cut on the pickup into the FINAL ESBOJARRAT
  { name: '14-focs', at: LEAD + 55, len: 5, vcam: { fov: 60, dist: [10.2, 9.4], up: 2.4 }, cam: { target: 'body', azFrom: 'world', az: [-45, -55], el: 4, dist: [9.5, 8.5], fov: 46, up: 2.2, lag: 0.4 } }, // low, near: the finale's confetti rains round her
  { name: '15-voltes', at: LEAD + 60, len: 4, vcam: { fov: 54, dist: [11.0, 10.2], up: 1.5, fwd: 0.6 }, cam: { target: 'body', azFrom: 'world', az: [-18, -24], el: 8, dist: [7.8, 7], fov: 40, up: 1.0, lag: 0.3 } },
  { name: '16-joc-guapa', at: LEAD + 64, len: 8, play: true, events: [chant(301, 'GUAPA,', 0.8), chant(303, 'GUAPA…', 0.8), chant(305.5, 'I GUAPA!', 1.6)] },
  // the roll and the last hit on a crane pulling back over the plaça, under the closing
  { name: '17-plaça-final', at: LEAD + 72, len: END_VB - LEAD - 72, vcam: { fov: 58, dist: [9.2, 19] }, cam: { target: 'body', azFrom: 'world', az: [-72, -84], el: [12, 34], dist: [10, 19], fov: 44, up: 1.1, lag: 0.5, dur: 7 } },
];
// Text on black (at, len in vb), and the closing on the last hit.
// gold: how many of the last words are gold (the one to remember)
const CARDS = [{ text: 'Ja arriba.', at: LEAD + 5, len: 3.5 }, { text: 'Segueix-li el ritme.', at: LEAD + 20, len: 4 }, { text: 'Que tremoli la plaça!', at: LEAD + 36, len: 4 }];
const CLOSE = { at: vbOf(308), url: 'mulassa.cat', line: 'Fes ballar la Mulassa.' }; // on the final roll: the last hit lands under the logo

const shots = SHOTS.map(s => {
  const f0 = F(s.at), f1 = F(s.at + s.len), src = s.src ?? songBeat(s.at);
  const from = bt(src) + (f0 / FPS - T(s.at)); // the first captured frame is output frame f0 exactly
  const events = (s.events || []).map(e => ({ t: bt(e.beat) + (e.dt || 0), js: e.js }));
  const cam = s.cam && { ...s.cam, ...(s.cam.dur ? { dur: s.cam.dur * BP } : {}) };
  return { ...s, cam, from: +from.toFixed(5), len: (f1 - f0 + 2) / FPS, events, frame: f0, frames: f1 - f0 };
});
writeFileSync(resolve(HERE, 'full/shots.json'), JSON.stringify({ fps: FPS, width: 1280, height: 720, scale: 3, outW: 1920, outH: 1080, out: '../public/clips',
  shots: shots.map(({ name, from, len, cam, play, events }) => ({ name, from, len, cam, play, events, ...(play ? { scale: 1.5 } : {}) })) }, null, 1));
// The vertical cut (9:16): the same shots and times from a phone-shaped viewport. 3D shots: their vertical camera (vcam
// merged over cam: a wider lens and a closer, more frontal angle, so she fits the narrow frame); gameplay: the phone
// itself (the game's portrait layout, touch pad), at the desktop's render quality.
writeFileSync(resolve(HERE, 'full/shots-v.json'), JSON.stringify({ fps: FPS, width: 720, height: 1280, scale: 1.8, outW: 1080, outH: 1920, out: '../public/clips-v',
  shots: shots.map(({ name, from, len, cam, vcam, play, events }) => ({ name, from, len, cam: cam && { ...cam, ...vcam }, play, events,
    ...(play ? { mobile: true, width: 432, height: 768, scale: 2.5 } : {}) })) }, null, 1));
const tl = {
  fps: FPS, frames: F(END_VB), beatFrames: BP * FPS,
  // the audio: where each stretch starts in the finished piece, and in the song (seconds)
  segs: SEGS, // for music.py: the song's beats [song, to) laid out from beat vb of the piece
  // the muffled opening opens up on the pickup (song beats 12 -> 16), in output seconds
  open: [+T(vbOf(12)).toFixed(6), +T(vbOf(16)).toFixed(6)],
  lead: +T(LEAD).toFixed(6), // the music comes in from silence over the black lead
  fadeOut: 2.0, // seconds: the last hit's ring-out fades to nothing; the picture fades to black over its last part
  shots: shots.map(s => ({ name: s.name, from: s.frame, dur: s.frames, fadeIn: Math.round((s.fadeIn || 0) * BP * FPS), fadeOut: Math.round((s.fadeOut || 0) * BP * FPS), grade: s.grade || null })),
  cards: CARDS.map(c => ({ text: c.text, gold: c.gold ?? 1, from: F(c.at), dur: F(c.at + c.len) - F(c.at) })),
  // hit: the last hit, frames into the closing; beat: the song's beat at its first frame (logo.mjs sets the logo's pulse from it)
  close: { from: F(CLOSE.at), hit: F(vbOf(312)) - F(CLOSE.at), beat: +(songBeat(CLOSE.at) + (F(CLOSE.at) / FPS - T(CLOSE.at)) / BP).toFixed(5), line: CLOSE.line, url: CLOSE.url },
};
writeFileSync(resolve(HERE, 'src/timeline.json'), JSON.stringify(tl, null, 1));
console.log(`${(tl.frames / FPS).toFixed(2)} s, ${tl.frames} frames`); console.table(tl.shots); console.table(tl.cards); console.log(tl.segs, tl.close);
