// El Tombairot's song («Aligot», tools/music/build_tombairot.py): the Bou's song contract, every tap a note of the tune
// on its own tempo map, the levels nested and within the density targets, the GLOBUS and the last GUAPA on the close.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import song from '../../../src/song-tombairot.json' with { type: 'json' };
import bou from '../../../src/song-bou.json' with { type: 'json' };
import timing from '../../../music/tombairot/timing.json' with { type: 'json' };
import { makeDanceChart } from '../../../src/game/chart.js';
import { beatAtTime } from '../../../src/core/beat-grid.js';

// the integration imports it as it imports the Bou's: the same keys
assert.deepEqual(Object.keys(song).sort(), Object.keys(bou).sort(), 'the Bou\'s song keys');
assert.deepEqual(Object.keys(song.dance).sort(), Object.keys(bou.dance).sort(), 'and its dance keys');
// the MP3 the game loads is the generator's, byte for byte
const [file, v] = song.audio.split('?v=');
const mp3 = readFileSync(new URL('../../../public/' + file, import.meta.url));
assert.equal(createHash('sha256').update(mp3).digest('hex').slice(0, 12), v, 'song.audio carries the MP3\'s hash');

// the tempo map: a grid, never a constant BPM; bpm is only the opening tempo
const B = song.beats;
for (let i = 1; i < B.length; i++) assert(B[i] > B[i - 1], 'beats grow');
assert.equal(Math.round(60 / (B[9] - B[8])), song.bpm, 'bpm = the opening tempo');
assert(60 / (B[timing.finalBeat] - B[timing.finalBeat - 1]) > song.bpm + 4, 'it pushes towards the end');
assert(Math.abs(B[timing.introBeats] - song.dance.melodyStart) < 1e-3, 'the tune starts after the drum intro');
assert(song.notes[0][0] >= 3.5 && song.notes[0][0] <= 6, `the first note ${song.notes[0][0]} s after BALLA!, as the other figures`);
assert(song.end >= 90 && song.end <= 120 && song.tail <= song.duration, `90-120 s (${song.end})`);
assert(song.notes.every(([t]) => Math.abs(beatAtTime(song.dance.subdivisionTimes, t) - Math.round(beatAtTime(song.dance.subdivisionTimes, t))) < 0.02), 'every tap on the 1/12-beat grid');

// every tap is an attack of the tune; a hold ends inside its note; never a tap in its rests
const attack = new Map(timing.melody.map(m => [m[4].toFixed(3), m]));
for (const [t, kind, level, big, end] of song.notes) {
  const m = attack.get(t.toFixed(3));
  assert(m, `${t}: a note of the tune`);
  assert(['don', 'ka'].includes(kind) && [0, 1, 2].includes(level) && [0, 1].includes(big) && !(big && end), `${t}: [t, don|ka, level, big, holdEnd]`);
  if (end) assert(end > t && end <= m[5] + 1e-3, `${t}: a hold ends inside its note`);
}
const tune = timing.melody;
for (let i = 1; i < tune.length; i++) {
  const [a, b] = [tune[i - 1][5], tune[i][4]];
  if (b - a > 0.05) assert(!song.notes.some(([t]) => t > a + 1e-3 && t < b - 1e-3), `no tap in the rest ${a}-${b}`);
}

// levels: nested, and within docs/agents/gameplay.md's targets per 7 s
const charts = [0, 1, 2].map(l => makeDanceChart(song, l));
for (let l = 1; l < 3; l++) for (const n of charts[l - 1]) assert(charts[l].some(m => Math.abs(m.t - n.t) < 1e-6), `level ${l} contains level ${l - 1} at ${n.t}`);
const per7 = c => { const out = []; for (let t = song.notes[0][0]; t + 7 <= song.end; t += 3.5) out.push(c.filter(n => n.t >= t && n.t < t + 7).length); return out; };
const [easy, normal, hard] = charts.map(per7);
assert(Math.min(...easy) >= 5 && Math.max(...easy) <= 8, `FÀCIL flat (${Math.min(...easy)}-${Math.max(...easy)})`);
assert(Math.min(...normal) >= 8 && Math.max(...normal) <= 12, `NORMAL 8-12 (${Math.min(...normal)}-${Math.max(...normal)})`);
assert(Math.max(...hard) <= 25 && hard[0] <= 20, `DIFÍCIL up to 25, lighter at the start (${hard[0]}, max ${Math.max(...hard)})`);
for (const c of charts) for (let i = 1; i < c.length; i++) assert(c[i].t - c[i - 1].t >= 0.19, `${c[i].t}: never two taps closer than a sixteenth`);
for (const c of charts) { // at most four in a row on one side
  let run = 0, prev = null;
  for (const n of c) { if (n.big) { prev = null; continue; } run = n.input === prev ? run + 1 : 1; prev = n.input; assert(run <= 4, `a run of ${run} at ${n.t}`); }
}
// MANTÉN from NORMAL up, a beat clear of the level's next tap
assert(!song.easyHolds && charts[0].every(n => !n.end || n.balloon) && charts[1].some(n => n.end && !n.balloon));
for (const c of charts) c.forEach((n, i) => { if (n.end && !n.balloon && c[i + 1]) assert(c[i + 1].t - n.end > 0.39, `${n.t}: a hold ends a beat before the next tap`); });

// the GLOBUS on the trio's last cadence, up to the last do, which stays a GUAPA on every level; GUAPAs open the phrases
for (const c of charts) {
  const bl = c.filter(n => n.balloon);
  assert(bl.length === 1 && Math.abs(bl[0].end - song.end) < 1e-6 && bl[0].end - bl[0].t > 1.5, 'one globus, up to the final do');
  assert(c.at(-1).t === song.end && c.at(-1).big, 'the final GUAPA after it');
}
for (const p of timing.phrases) assert(song.notes.some(([t, , l, big]) => big && l === 0 && Math.abs(t - p.time) < 0.3), `a GUAPA opens ${p.id}`);
assert(song.finale > song.sections.at(-2)[0] && song.finale < song.end - 4, 'the finale: the trio\'s last phrase');
console.log(`tombairot chart ok: ${charts.map(c => c.length).join(' / ')} taps, per 7 s FÀCIL ${Math.min(...easy)}-${Math.max(...easy)}, NORMAL ${Math.min(...normal)}-${Math.max(...normal)}, DIFÍCIL ${Math.min(...hard)}-${Math.max(...hard)}; ${song.end} s`);
