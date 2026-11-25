// A drum run's rules (docs/agents/drum-mode.md): its chart from beats, the judge's pure decisions, its record key, no board.
import assert from 'node:assert/strict';
import { makeDrumChart, makeDanceChart, drumFromTouch } from '../../src/game/chart.js';
import dracSong from '../../src/song-drac.json' with { type: 'json' };
import bouSong from '../../src/song-bou.json' with { type: 'json' };
import { WINDOWS } from '../../src/game/progress.js';
import { pressTarget, noteOnTime, isPartnerPress, isRim, drumFits, isDrumEcho, DRUM_ECHO, rollAt, pairClosed, pairWindow } from '../../src/game/judge-core.js';
import { drumRecordKey, recordPointsKey } from '../../src/game/records.js';
import { MULASSA, DRAC, recordKey, readFigureRecord, saveFigureRecord } from '../../src/game/figures.js';
import { snapshotResult } from '../../src/services/leaderboard-rules.js';

// --- the chart: beats on the song's own grid (a tempo change at beat 8), never seconds
const song = { beats: [...Array.from({ length: 9 }, (_, k) => k * 0.5), ...Array.from({ length: 16 }, (_, k) => 4 + (k + 1) * 0.25)] };
const fixture = { version: 1, levels: [
  [[1, 'd'], [2, 'k']],
  [[14, 'K'], [1, 'd'], [2.5, 'k'], [4, 'D'], [8, 'r', 12], [16, 'b', 20, 9]],
  [],
] };
const chart = makeDrumChart(song, fixture, 1);
assert.deepEqual(chart.map(n => n.t), [0.5, 1.25, 2, 4, 5.5, 6], 'sorted by time, each beat through the local grid (half beats too)');
assert.deepEqual(chart[0], { t: 0.5, phrase: 0, input: 'L', big: false, end: 0 }, 'd = GUA, the touch game\'s own note (the left face)');
assert.deepEqual(chart[1], { t: 1.25, phrase: 0, input: 'R', big: false, end: 0 }, 'k = PA (the right face)');
assert.deepEqual([chart[2].input, chart[2].big, chart[4].input, chart[4].big], ['B', true, 'B', true], 'D and K: a GUAPA (both rims)');
assert.deepEqual(chart[3], { t: 4, end: 5, roll: true, input: 'P', phrase: 1 }, 'a roll: a span, its phrase from its first beat');
assert.deepEqual(chart[5], { t: 6, end: 7, balloon: true, need: 9, input: 'P', phrase: 2 }, 'a balloon as makeDanceChart builds them');
assert.deepEqual(Object.keys(makeDanceChart({ beats: song.beats, notes: [], balloons: [[16, 20]] }, 1)[0]).sort(), Object.keys(chart[5]).sort());
assert(chart.every(n => !n.end || n.roll || n.balloon), 'no holds in a drum run');
assert.equal(makeDrumChart(song, fixture, 0).length, 2, 'each level is its own list');
assert.throws(() => makeDrumChart(song, { levels: [[[1, 'x']]] }, 0), RangeError, 'an unknown event is refused, not played as something else');

// --- a figure with no drum chart (the Drac, the Bou): its touch chart, each MANTÉN a roll over the same span
for (const [name, figSong] of [['Drac', dracSong], ['Bou', bouSong]]) for (const level of [0, 1, 2]) {
  const touch = makeDanceChart(figSong, level), drum = drumFromTouch(touch), holds = touch.filter(n => n.end && !n.balloon);
  assert.equal(drum.length, touch.length, `${name} ${level}: one event per note`);
  assert(drum.every(n => !n.end || n.roll || n.balloon), `${name} ${level}: no MANTÉN left`);
  assert.deepEqual(drum.filter(n => n.roll).map(n => [n.t, n.end]), holds.map(n => [n.t, n.end]), `${name} ${level}: each hold a roll, same span`);
  assert.deepEqual(drum.filter(n => !n.roll), touch.filter(n => !n.end || n.balloon), `${name} ${level}: every other note as it was`);
}
assert(makeDanceChart(bouSong, 0).some(n => n.end && !n.balloon), 'the Bou holds on FÀCIL: the case is real');

// --- the judge
const W = WINDOWS[1], HANDOFF = 0.06;
const run = chart.map(n => ({ ...n, hit: null, count: 0 }));
const [gua, pa, guapa, roll] = run;
assert.equal(pressTarget(run, 0, 0.5, W, null).n, gua);
// the faces play GUA and PA by their side; the rims only a GUAPA; a key (no zone) never reaches drumFits
assert.deepEqual(['FL', 'FR', 'RL', 'RR'].map(zone => drumFits(gua, zone[1], zone)), [true, false, false, false], 'GUA: the left face only');
assert.deepEqual(['FL', 'FR', 'RL', 'RR'].map(zone => drumFits(pa, zone[1], zone)), [false, true, false, false], 'PA: the right face only');
assert.deepEqual(['FL', 'FR', 'RL', 'RR'].map(zone => drumFits(guapa, zone[1], zone)), [false, false, true, true], 'a GUAPA: a rim, either side');
assert.deepEqual(['FL', 'RL', undefined].map(isRim), [false, true, false]);
// a GUAPA's pair: the other rim, within the window; a face is not its partner, and one rim alone closes on a miss
const open = { n: guapa, dir: 'L', t: 2, kind: 'perfect', detail: '' };
assert.equal(isPartnerPress(open, 'R') && isRim('RR'), true, 'the other rim completes it');
assert.equal(isPartnerPress(open, 'R') && isRim('FR'), false, 'the right face does not');
assert.equal(isPartnerPress(open, 'L'), false, 'the same rim again does not');
assert.equal(pairClosed(open, 2 + pairWindow(1) + 1e-6, 1), true, 'one rim alone: the window closes, settleBig misses it (not done)');
assert.equal(open.done, undefined, 'a GUAPA is never judged on its first rim');
// one hard hit firing both sensors (measured on the real drum): the other side's same zone right after is an echo
assert.equal(isDrumEcho({ zone: 'RL', t: 10 }, 'RR', 10), true, 'both rims in one poll, off a GUAPA: one hit (press() checks the partner first)');
assert.equal(isDrumEcho({ zone: 'FR', t: 10 }, 'FL', 10 + DRUM_ECHO / 2), true);
assert.equal(isDrumEcho({ zone: 'FL', t: 10 }, 'FL', 10.001), false, 'the same zone again is a new hit');
assert.equal(isDrumEcho({ zone: 'FL', t: 10 }, 'RR', 10.001), false, 'a face then a rim is a new hit');
assert.equal(isDrumEcho({ zone: 'FL', t: 10 }, 'FR', 10 + DRUM_ECHO + 0.001), false, 'a real two-handed roll is no echo');
assert.equal(isDrumEcho({ zone: 'FL', t: 90 }, 'FR', 0.01), false, 'a new run restarts the clock');
assert.equal(isDrumEcho(null, 'FR', 1), false);
// rolls: every hit inside the span is the roll's, whatever the zone; it is never a press target, so never judged or missed
assert.equal(pressTarget(run, 0, 4, W, null), null);
assert.equal(rollAt(run, 0, 4.3, W.good, HANDOFF), roll);
assert.equal(rollAt(run, 0, 4 - W.good, W.good, HANDOFF), roll, 'from a good window early, like a balloon');
assert.equal(rollAt(run, 0, 4 - W.good - 1e-6, W.good, HANDOFF), null);
assert.equal(rollAt(run, 0, 5 - HANDOFF, W.good, HANDOFF), null, 'the last 60 ms belong to the next note');
assert.equal(rollAt(run, 4, 4.3, W.good, HANDOFF), null, 'a roll already behind the run is not found again');
let hits = 0;
for (let t = 3.5; t < 5.2; t += 0.1) if (rollAt(run, 0, t, W.good, HANDOFF) && !noteOnTime(run, 0, t, W, null, 'L')) hits++;
assert.equal(hits, 11, 'ten hits a second over the span and its early window: each one counts');
// a hit on time for the next note of its side leaves the roll; the other side stays in the roll; a GUAPA takes either
const tail = [{ t: 0, end: 1, roll: true, input: 'P' }, { t: 1, input: 'R', big: false }];
assert.equal(noteOnTime(tail, 0, 0.93, W, null, 'R'), true);
assert.equal(noteOnTime(tail, 0, 0.93, W, null, 'L'), false, 'a left hit near a PA is still the roll\'s');
assert.equal(noteOnTime([tail[0], { t: 1, input: 'B', big: true }], 0, 0.93, W, null, 'L'), true, 'a GUAPA takes either, as before');

// --- its own record, apart from the figure's; never a board
assert.equal(drumRecordKey('mulassa-valls', 2), 'record-drum-mulassa-valls-2');
for (const figure of [MULASSA, DRAC]) for (const level of [0, 1, 2]) assert.notEqual(recordKey(figure, level, true), recordKey(figure, level));
assert.equal(recordKey(MULASSA, 1), recordPointsKey(1), 'the keys\' record is where it was');
const data = new Map(), store = { get: k => data.get(k) ?? null, set: (k, v) => data.set(k, v) };
saveFigureRecord(store, MULASSA, 1, 91, 54321, 40, true);
assert.deepEqual(readFigureRecord(store, MULASSA, 1, true), { quality: 91, score: 54321, combo: 40 });
assert.equal(readFigureRecord(store, MULASSA, 1), null, 'a drum record is not the figure\'s record');
assert.deepEqual([...data.keys()], ['record-drum-mulassa-valls-1']);
const game = { figureVersion: MULASSA.version, figureId: MULASSA.id, diff: 1, counts: { perfect: 121, good: 10, miss: 2 }, score: 40000, maxCombo: 80 };
const publish = g => snapshotResult(g, { reason: 'end', query: new URLSearchParams() });
assert(publish(game), 'the same run on the keys can be published');
assert.equal(publish({ ...game, drum: true }), null, 'a drum run is never offered to the board');
console.log('drum judge ok');
