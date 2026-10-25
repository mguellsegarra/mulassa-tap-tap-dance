// The Bou Tradicional in the game: its chart (tools/music/build_bou_chart.mjs) is the approved v13 melody on its own tempo
// map, its runtime identity is its own, and nothing of it reaches a server that has no board for it.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import song from '../../../src/song-bou.json' with { type: 'json' };
import approved from '../../../music/bou-tradicional/timing.json' with { type: 'json' };
import playback from '../../../music/bou-tradicional/playback.json' with { type: 'json' };
import { makeDanceChart } from '../../../src/game/chart.js';
import { beatAtTime } from '../../../src/core/beat-grid.js';
import * as runtime from '../../../src/game/figure-song.js';
import { UNRELEASED_IDS } from '../../../src/figures/index.js';
import { BOU, MULASSA, DRAC, playable, hasBoard, recordKey, readFigureRecord, saveFigureRecord } from '../../../src/game/figures.js';
import { snapshotResult, validResult } from '../../../src/services/leaderboard-rules.js';
import { payload, endRun } from '../../../src/game/stats.js';
import { trf } from '../../../src/game/figure-theme.js';
import { PICKER_FIGURES } from '../../../src/ui/figure-picker.js';

// the mix starts `cutBeats` into v13's intro (tools/music/build_bou_mobile.py): v13's times, that much earlier
const T0 = approved.subdivisionTimes[playback.cutBeats * approved.subdivision], early = t => t - T0;
const timing = { ...approved, duration: early(approved.duration), musicEnd: early(approved.musicEnd), finalNoteStart: early(approved.finalNoteStart),
  finaleCandidate: early(approved.finaleCandidate), beats: approved.beats.slice(playback.cutBeats).map(early),
  events: approved.events.map(e => ({ ...e, start: early(e.start), end: early(e.end) })) };
assert.equal(playback.cutBeats, 4); assert(Math.abs(T0 - 2) < 1e-9, 'one 2 s bar of the intro cut');
// Current mix, byte for byte, where the game loads it
const sha = p => createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex');
assert.equal(sha('../../../public/music/' + playback.audio), playback.audioSha256, 'the public MP3 matches the active playback manifest');
assert.equal(song.audio, `music/${playback.audio}?v=${playback.audioSha256.slice(0, 12)}`);
assert(song.tail <= timing.duration && song.tail > timing.musicEnd, 'the run plays the whole fade');

// every tap is an attack of the melody (voice 0) at its own time on the variable map; the last one is the final do
const melody = timing.events.filter(e => e.voice === 0);
const attack = new Map(melody.map(e => [e.start.toFixed(3), e]));
for (const [t, kind, level, big, end] of song.notes) {
  const e = attack.get(t.toFixed(3)) ?? attack.get((t - 5e-5).toFixed(3)) ?? attack.get((t + 5e-5).toFixed(3));
  assert(e, `${t}: a melody note`);
  assert(['don', 'ka'].includes(kind) && [0, 1, 2].includes(level) && !(big && end), `${t}: [t, don|ka, level, big, holdEnd]`);
  if (end) assert(end > t && end <= e.end + 1e-3, `${t}: a hold ends inside its note`);
}
assert.equal(song.notes.at(-1)[0], song.end); assert.equal(song.notes.at(-1)[3], 1, 'the song ends on a GUAPA, the final do');
assert(Math.abs(song.end - timing.finalNoteStart) < 1e-3 && Math.abs(song.finale - timing.finaleCandidate) < 1e-3);
assert.deepEqual(song.beats, timing.beats.map(b => Math.round(b * 1e4) / 1e4), 'the game reads the same variable grid');
assert(new Set(timing.tempoBpm.map(Math.round)).size > 20, 'the tempo is not constant');
// no tap in the melody's rests
const rests = []; for (let i = 1; i < melody.length; i++) if (melody[i].start - melody[i - 1].end > 0.05) rests.push([melody[i - 1].end, melody[i].start]);
for (const [a, b] of rests) assert(!song.notes.some(([t]) => t > a + 1e-3 && t < b - 1e-3), `no tap in the rest ${a.toFixed(2)}-${b.toFixed(2)}`);

// levels: harder charts contain the easier ones, densities per 7 s within the project's targets
const charts = [0, 1, 2].map(l => makeDanceChart(song, l));
for (let l = 1; l < 3; l++) for (const n of charts[l - 1]) assert(charts[l].some(m => Math.abs(m.t - n.t) < 1e-6), `level ${l} contains level ${l - 1} at ${n.t}`);
const per7 = c => { const out = []; for (let t = song.notes[0][0]; t + 7 <= song.end; t += 3.5) out.push(c.filter(n => n.t >= t && n.t < t + 7).length); return out; };
const [easy, normal, hard] = charts.map(per7);
assert(Math.max(...easy) <= 9 && Math.min(...easy.slice(0, -2)) >= 4, `FÀCIL stays flat (${Math.min(...easy)}-${Math.max(...easy)})`);
assert(Math.max(...normal) <= 14, `NORMAL grows to ~12 (max ${Math.max(...normal)})`);
assert(Math.max(...hard) <= 31, `DIFÍCIL ~30 only at its densest (max ${Math.max(...hard)})`);
assert(charts[0].every(n => !n.end || n.balloon) && charts[1].some(n => n.end && !n.balloon), 'MANTÉN from NORMAL up');
// the ESQUELLOT: on every level the last two bars are mashed, up to the final hit, which stays a tap
for (const c of charts) {
  const bl = c.filter(n => n.balloon);
  assert(bl.length === 1 && Math.abs(bl[0].end - song.end) < 1e-6 && bl[0].end - bl[0].t > 3, 'one esquellot, the last two bars');
  assert(c.at(-1).t === song.end && c.at(-1).big, 'the final BRAMA! after it');
}
for (const c of charts) for (let i = 1; i < c.length; i++) assert(c[i].t - c[i - 1].t >= 0.19, 'never two taps closer than a sixteenth at 150');
for (const c of charts) { // at most four in a row on one side
  let run = 0, prev = null;
  for (const n of c) { if (n.big) { prev = null; continue; } run = n.input === prev ? run + 1 : 1; prev = n.input; assert(run <= 4, `a run of ${run} at ${n.t}`); }
}
for (const n of song.notes) { const b = beatAtTime(song.dance.subdivisionTimes, n[0]); assert(Math.abs(b - Math.round(b)) < 0.02, `${n[0]}: on the exact 1/12-beat grid (bar 63 slows down inside its beats)`); }

// identity: its own song, version, words, records; no board, no publication, no statistics upload
assert(playable(BOU) === !UNRELEASED_IDS.has(BOU.id) && !hasBoard(BOU) && hasBoard(MULASSA) && hasBoard(DRAC));
assert.equal(BOU.version, 'bou-v1');
assert(!PICKER_FIGURES.includes(BOU), 'no Classificació for the Bou');
assert.equal(runtime.setFigureSong(BOU), true);
assert.equal(runtime.song, song); assert.equal(runtime.FINALE_T, song.finale);
assert.equal(trf('collapse.line1'), 'EL BOU'); assert.deepEqual(['input.left', 'input.right', 'input.both'].map(k => trf(k)), ['BRA', 'MA', 'BRAMA'], 'its own drums');
runtime.setFigureSong(MULASSA);
const mem = new Map(), store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
assert.equal(recordKey(BOU, 2), 'record-bou-tradicional-valls-2');
saveFigureRecord(store, BOU, 2, 91, 123456, 200);
assert.equal(readFigureRecord(store, BOU, 2).score, 123456);
assert.equal(readFigureRecord(store, MULASSA, 2), null, 'never the Mulassa\'s record');
const game = { figureId: BOU.id, figureVersion: BOU.version, diff: 1, practice: false, counts: { perfect: 220, good: 0, miss: 0 }, score: 1000, maxCombo: 220 }; // a valid NORMAL run
assert.equal(snapshotResult(game, { reason: 'end', query: new URLSearchParams() }), null, 'a Bou run is never published');
assert.equal(snapshotResult({ ...game, figureVersion: 'mulassa-v3' }, { reason: 'end', query: new URLSearchParams() }), null, 'nor under the Mulassa\'s version');
assert(validResult({ version: 'bou-v1', difficulty: 1, counts: { perfect: 220, good: 0, miss: 0 }, score: 1, maxCombo: 1, figureId: BOU.id }) && !validResult({ version: 'bou-v1', difficulty: 1, counts: { perfect: 220, good: 0, miss: 0 }, score: 1, maxCombo: 1, figureId: MULASSA.id }), 'bou-v1 is the Bou\'s, mirrored for when its board exists');
const stats = { deviceId: 'd', owners: {} };
endRun(stats, 'none', { kind: 'end', date: '2026-10-23', figureId: BOU.id, version: BOU.version, level: 1, completed: true, seconds: 150, counts: { perfect: 1, good: 0, miss: 0 } });
endRun(stats, 'none', { kind: 'end', date: '2026-10-23', figureId: MULASSA.id, version: MULASSA.version, level: 1, completed: true, seconds: 88, counts: { perfect: 1, good: 0, miss: 0 } });
assert.deepEqual(Object.keys(payload(stats, 'none').buckets), [`${MULASSA.id}/${MULASSA.version}/1`], 'the Bou\'s statistics stay on the device');
console.log(`bou chart ok: ${charts.map(c => c.length).join(' / ')} taps, per 7 s FÀCIL ${Math.min(...easy)}-${Math.max(...easy)}, NORMAL ${Math.min(...normal)}-${Math.max(...normal)}, DIFÍCIL ${Math.min(...hard)}-${Math.max(...hard)}; identity, records and server isolation`);

// Exercise the production startGame call site: the Bou counts in like the others (lead-in, jingle, timbals), its recorded intro after BALLA!.
const flowSource = readFileSync(new URL('../../../src/game/flow.js', import.meta.url), 'utf8');
const startSource = flowSource.slice(flowSource.indexOf('export function startGame('), flowSource.indexOf('// The demo (')).replace('export ', '');
for (const [figure, from] of [[BOU, 0], [BOU, 30], [MULASSA, 0], [DRAC, 0]]) {
  runtime.setFigureSong(figure);
  const calls = [], G = {};
  const ctx = vm.createContext({ ...runtime, G, playFrom: from, LEAD: 3.2, CLICKS: false, songWait: null,
    leaveRun() {}, warmStart() {}, makeDanceChart, recordKey, readFigureRecord: () => null, store: {},
    beginRun(diff, chart) { G.chart = chart; },
    chip: { buf: {}, start(...args) { calls.push(['start', ...args]); return Promise.resolve(true); }, countIn(times) { calls.push(['countIn', times]); } },
    loader: { done() {} }, errors: { report() { throw new Error('unexpected audio failure'); } },
  });
  vm.runInContext(startSource + '; startGame(1);', ctx);
  await Promise.resolve();
  assert.equal(calls.find(c => c[0] === 'start')[1], 3.2, 'every figure gets the same lead-in');
  assert.deepEqual(calls.find(c => c[0] === 'countIn')[1], runtime.countInAt(runtime.startCueAt(from)), 'and the same timbals');
}
// BALLA! on the song's first beat for every figure: the Bou's own 8-beat intro follows it (4 s: the Mulassa's 4.7, the Drac's 5.6).
runtime.setFigureSong(BOU);
assert.equal(runtime.startCueAt(0), 0); assert.equal(song.notes[0][0], 4);
runtime.setFigureSong(MULASSA);
console.log('Bou counts in like the Mulassa and the Drac');
