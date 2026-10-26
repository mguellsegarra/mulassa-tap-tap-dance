import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as runtime from '../../../src/game/figure-song.js';
import { createHash } from 'node:crypto';
import { makeDanceChart } from '../../../src/game/chart.js';
import { MULASSA, DRAC, BOU, recordKey, readFigureRecord, saveFigureRecord } from '../../../src/game/figures.js';
import { readPreviousDanceRecord } from '../../../src/game/records.js';
import { snapshotResult, EXPECTED_JUDGMENTS } from '../../../src/services/leaderboard-rules.js';
import { challengeEligible, challengeUrl, challengeResult, shareText, HASHTAGS } from '../../../src/services/share.js';

const originalSong = runtime.song, originalBeat = runtime.BEAT;
assert.equal(runtime.setFigureSong(DRAC), true);
assert.equal(runtime.selectedFigure, DRAC);
assert.equal(runtime.BEATS, runtime.song.beats);
assert.equal(runtime.FINALE_T, runtime.song.finale);
assert.notEqual(runtime.song, originalSong);
for (const b of [-3, 0, 11.5, 170.7, 192.1, 200]) {
  assert(Math.abs(runtime.beatAt(runtime.songTimeAtBeat(b)) - b) < 1e-9, `variable beat grid round trip at ${b}`);
}
const t = runtime.songTimeAtBeat(150);
const clicks = runtime.countInAt(t);
assert.deepEqual(clicks, [147, 148, 149].map(runtime.songTimeAtBeat));
assert.equal(runtime.countInDuration(t), t - clicks[0]);
for (const target of [runtime.song.beats[0], runtime.song.beats[150], runtime.song.beats[150] + 0.13]) {
  const at = runtime.countInAt(target);
  for (let i = 0; i < at.length; i++) {
    assert.equal(runtime.countInPhase(at[i], target), i, 'number changes exactly on the audible click');
    assert(runtime.countInPhase(at[i] - 0.001, target) < i);
    assert(runtime.countInPhase(at[i] + 0.001, target) > i);
  }
  assert.equal(runtime.countInPhase(target, target), 3);
}

assert.notEqual(runtime.songTimeAtBeat(150) - runtime.songTimeAtBeat(149), runtime.songTimeAtBeat(12) - runtime.songTimeAtBeat(11));
assert.deepEqual(runtime.song.balloons, [[124, 128], [225, 233]]); // the closing roll under the held last note (docs/figures/drac-music.md)
for (let diff = 0; diff < 3; diff++) {
  const chart = makeDanceChart(runtime.song, diff), balloons = chart.filter(n => n.balloon);
  assert.equal(balloons.length, 2);
  assert.equal(balloons[0].t, runtime.BEATS[124]);
  assert.equal(balloons[0].end, runtime.BEATS[128]);
  assert.equal(balloons[1].t, runtime.BEATS[225]);
  assert.equal(balloons[1].end, runtime.BEATS[233]);
  for (const n of chart) {
    assert(Number.isFinite(n.t) && Number.isFinite(n.phrase));
    if (n.end) assert(Number.isFinite(n.end) && n.end > n.t);
  }
  const last = chart.findLast(n => !n.balloon);
  assert.equal(last.phrase, Math.floor(Math.floor(runtime.beatAt(last.t) + 0.01) / 8));
  // Counts matching the Mulassa's chart are not the Drac's: no publishable Drac result (its own: tests/services/leaderboard.mjs).
  const fake = { figureId: DRAC.id, figureVersion: DRAC.version, diff,
    counts: { perfect: EXPECTED_JUDGMENTS[diff], good: 0, miss: 0 }, score: 100, maxCombo: 1 };
  const options = { reason: 'end', query: new URLSearchParams() };
  assert.equal(snapshotResult(fake, options), null);
  assert.equal(snapshotResult({ ...fake, figureVersion: 'mulassa-v1' }, options), null);
  assert.equal(snapshotResult({ ...fake, figureId: MULASSA.id }, options), null);
  assert.equal(snapshotResult({ ...fake, figureVersion: 'mulassa-v2-short', figureId: MULASSA.id }, options), null, 'a retired Mulassa version is never published');
  assert(snapshotResult({ ...fake, figureId: MULASSA.id, figureVersion: MULASSA.version }, options));
}
for (const key of ['audio', 'ambient']) {
  const [file, hash] = runtime.song[key].split('?v=');
  const bytes = readFileSync(new URL(`../../../public/${file}`, import.meta.url));
  assert.equal(createHash('sha1').update(bytes).digest('hex').slice(0, 10), hash, `${key}: generated URL matches copied audio`);
}
assert.equal(recordKey(MULASSA, 1), 'record-points-mulassa-v3-1');
assert.notEqual(recordKey(DRAC, 1), recordKey(MULASSA, 1));
const dracRun = { figureId: DRAC.id, pct: 100, diff: 1 };
assert.equal(challengeEligible(dracRun), true);
assert.equal(challengeResult({ pct: 95, diff: 1 }, dracRun), null, 'a Mulassa challenge is not the Drac\'s');
assert(challengeResult({ pct: 95, diff: 1, figure: DRAC.id }, dracRun).beaten);
assert.equal(challengeUrl(100, 1, 'https://mulassa.cat/', DRAC.id), 'https://mulassa.cat/?repte=100-1-drac');
assert(shareText(dracRun).includes('Drac'));
assert(!shareText(dracRun).replace(HASHTAGS, '').includes('Mulassa'), 'the Drac\'s caption names the Drac (the game\'s hashtag aside)');
assert(shareText(dracRun).startsWith('🐉'));
// The Bou's challenge needs no board: the link and the caption are made on the device
const bouRun = { figureId: BOU.id, pct: 94, diff: 2 };
assert.equal(challengeEligible(bouRun), true);
assert.equal(challengeResult({ pct: 95, diff: 2, figure: DRAC.id }, bouRun), null, 'a Drac challenge is not the Bou\'s');
assert(challengeResult({ pct: 90, diff: 2, figure: BOU.id }, bouRun).beaten);
assert.equal(challengeUrl(94, 2, 'https://mulassa.cat/', BOU.id), 'https://mulassa.cat/?repte=94-2-bou');
for (const ch of [null, { pct: 90, diff: 2, figure: BOU.id }]) for (const r of [bouRun, { ...bouRun, newRecord: true, score: 1000 }, { ...bouRun, reason: 'clear' }]) {
  const text = shareText(r, ch);
  assert(text.startsWith('🐂') && text.includes('Bou') && !text.replace(HASHTAGS, '').includes('Mulassa'), `the Bou's caption names the Bou: ${text}`);
}
assert.equal(runtime.setFigureSong('aviat-reus'), false);
assert.equal(runtime.selectedFigure, DRAC);
assert.equal(runtime.setFigureSong(MULASSA.id), true);
assert.equal(runtime.song, originalSong);
assert.equal(runtime.BEAT, originalBeat);
assert.equal(makeDanceChart(runtime.song, 0).filter(n => n.balloon).length, 2);
console.log('figure runtime: atomic song/grid/finale switching, variable chart timing, assets and publication isolation ok');

// Exercise the public selector boundary too: the game identity, audio and frozen publication snapshot switch together.
let cleared = 0, switchedSong;
const context = { parseChallenge: () => null, stripChallenge: () => '', store: { get: () => null },
  Q: new URLSearchParams(), playFrom: 0, LEAD: 3.2, WINDOWS: [{}], Chip: class {},
  setFigureSong: runtime.setFigureSong, clearLeaderboardResult: () => { cleared++; },
  audioStub: { setSong: s => { switchedSong = s; } } };
Object.defineProperties(context, { song: { get: () => runtime.song }, selectedFigure: { get: () => runtime.selectedFigure } });
vm.createContext(context);
const stateSource = readFileSync(new URL('../../../src/game/state.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
vm.runInContext(stateSource, context);
vm.runInContext("engine = audioStub; chip = audioStub; G.state = 'select'; G.shareRun = {};", context);
assert.equal(vm.runInContext("setSelectedFigure('drac-valls')", context), true);
assert.equal(vm.runInContext('G.figureId', context), DRAC.id);
assert.equal(vm.runInContext('G.figureVersion', context), DRAC.version);
assert.equal(vm.runInContext('G.shareRun', context), null);
assert.equal(switchedSong, runtime.song);
assert.equal(vm.runInContext('chip', context), context.audioStub, 'menu and sync controls keep the unlocked engine reference');
assert.equal(cleared, 1);
vm.runInContext("G.state = 'play';", context);
assert.equal(vm.runInContext("setSelectedFigure('mulassa-valls')", context), false);
assert.equal(runtime.selectedFigure, DRAC, 'a live run cannot change arrangements');
vm.runInContext("G.state = 'select'; setSelectedFigure('mulassa-valls');", context);
assert.equal(runtime.song, originalSong);
console.log('selected figure boundary: audio, result identity, pending publication and run guard ok');

// The previous dance's records stay readable for the Profile; the v3 record is its own, and the Drac keeps raw points.
const recordData = new Map(), recordStore = { get: k => recordData.get(k) ?? null, set: (k, v) => recordData.set(k, v) };
recordStore.set('record-v2-duet-1', JSON.stringify({ quality: 90, score: 50000, combo: 40 }));
assert.equal(readFigureRecord(recordStore, MULASSA, 1), null, 'the previous dance’s record is not a v3 record');
assert.equal(readPreviousDanceRecord(recordStore, 1).score, 50000);
saveFigureRecord(recordStore, MULASSA, 1, 95, 40000, 60);
assert.equal(readFigureRecord(recordStore, MULASSA, 1).score, 40000, 'v3 points are raw');
assert.equal(JSON.parse(recordStore.get('record-v2-duet-1')).score, 50000, 'legacy record remains untouched');
saveFigureRecord(recordStore, DRAC, 1, 88, 12345, 30);
assert.equal(readFigureRecord(recordStore, DRAC, 1).score, 12345, 'Drac retains raw score in its own namespace');
assert.equal(readFigureRecord(recordStore, MULASSA, 1).quality, 95, 'switching figures cannot replace the Mulassa record');
// An older tab keeps writing its own keys: it can neither beat nor replace the v3 record.
recordStore.set('record-family-mulassa-1', JSON.stringify({ quality: 100, rawScore: 1, score: 1,
  sourceVersion: 'mulassa-v2-short', scoreScale: 'mulassa-family-v1' }));
recordStore.set('record-points-mulassa-1', JSON.stringify({ quality: 100, score: 999999, combo: 1 }));
assert.equal(readFigureRecord(recordStore, MULASSA, 1).score, 40000, 'an older tab cannot touch the v3 record');
assert.equal(readFigureRecord(recordStore, DRAC, 1).score, 12345, 'Mulassa versions cannot change Drac records');
console.log('short Mulassa and Drac record isolation ok');

// Scene sounds share the run's ownership, independently of which figure (or pending card) is selected.
const figureRequests = [];
context.pageActive = () => true;
context.audioStub.sfx = (...args) => figureRequests.push(args);
for (const state of ['splash', 'select']) {
  vm.runInContext(`G.state = '${state}'; G.paused = false;`, context);
  for (const id of [MULASSA.id, DRAC.id, 'aliga-valls']) {
    vm.runInContext(`setSelectedFigure('${id}');`, context);
    for (const kind of ['flama', 'crack', 'tro', 'gran', 'eh']) vm.runInContext(`figureSfx('${kind}', 3);`, context);
  }
}
assert.equal(figureRequests.length, 0, 'no figure requests reach audio on any menu screen or pending selection');
for (const state of ['play', 'results']) {
  vm.runInContext(`G.state = '${state}';`, context);
  for (const kind of ['flama', 'crack', 'tro', 'gran', 'eh']) vm.runInContext(`figureSfx('${kind}', 3);`, context);
}
assert.deepEqual(figureRequests, Array.from({length: 2}, () => ['flama', 'crack', 'tro', 'gran', 'eh'].map(k => [k, 3])).flat(), 'run and result effects retain their sound and petard index');
vm.runInContext("G.state = 'play'; G.paused = true; figureSfx('flama'); G.paused = false;", context);
context.pageActive = () => false;
vm.runInContext("figureSfx('flama'); G.state = 'select';", context);
context.pageActive = () => true;
vm.runInContext("figureSfx('flama');", context);
assert.equal(figureRequests.length, 10, 'paused, inactive and returning selector events are discarded');
vm.runInContext("figureSfx('flama', 0, true);", context);
assert.deepEqual(figureRequests.at(-1), ['flama', 0, true], 'manual free-mode fire reaches audio independently of menu effects');
vm.runInContext("G.paused = true; figureSfx('flama', 0, true); G.paused = false;", context);
context.pageActive = () => false;
vm.runInContext("figureSfx('flama', 0, true);", context);
assert.equal(figureRequests.length, 11, 'manual effects also respect pause and page activity');
console.log('scene audio ownership: menu/pending discard, active run/results preserve, no wake replay ok');
