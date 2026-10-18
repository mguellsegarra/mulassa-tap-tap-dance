import assert from 'node:assert/strict';
import { comparableScore, CURRENT_SCORE_VERSION, FULL_SCORE_ANCHORS, SHORT_SCORE_ANCHORS } from '../src/game/score-scale.js';
import { bestRecord, recordFamilyKey, saveRecord } from '../src/game/records.js';
import { quality } from '../src/game/progress.js';

const data = new Map(), storage = { get: key => data.get(key) ?? null, set: (key, value) => data.set(key, value) };
const legacy = 'record-v2-duet-1', key = recordFamilyKey(1);
data.set(legacy, JSON.stringify({ quality: 90, score: 50000, combo: 90 }));
const original = data.get(legacy);
assert.equal(bestRecord(storage, 1).score, 50000);
saveRecord(storage, 1, 90, 40000, 70);
assert.equal(bestRecord(storage, 1).score, comparableScore(40000, 1), 'compare equivalent points at equal quality');
assert.equal(bestRecord(storage, 1).sourceVersion, CURRENT_SCORE_VERSION);
assert.equal(data.get(legacy), original, 'never overwrite the older cached client record');
assert.equal(bestRecord(storage, 1).score, JSON.parse(data.get(key)).score, 'stored comparable points are not converted twice');
data.set(legacy, JSON.stringify({ quality: 90, score: 80000, combo: 91 }));
assert.equal(bestRecord(storage, 1).score, 80000, 'an older client can still improve its record later');
saveRecord(storage, 1, 91, 10000, 10);
assert.equal(bestRecord(storage, 1).quality, 91, 'keep the existing quality-first local record rule');
data.set(key, JSON.stringify({ quality: 100, score: 999999, rawScore: 1, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: 'mulassa-family-v1' }));
assert.equal(bestRecord(storage, 1).score, 80000, 'incoherent converted records are ignored');
data.set(legacy, '{');
assert.equal(bestRecord(storage, 1), null, 'malformed records do not block a run');
assert.equal(bestRecord({ get() { throw Error('blocked storage'); } }, 0), null);
// Equal rational qualities from different chart sizes may differ in the last floating-point digit.
const oldQuality = quality({ perfect: 265, good: 53, miss: 0 });
const shortQuality = quality({ perfect: 200, good: 40, miss: 0 });
data.clear();
data.set('record-v2-duet-2', JSON.stringify({ quality: oldQuality, score: 182972, combo: 318 }));
saveRecord(storage, 2, shortQuality, 139572, 240);
assert.equal(bestRecord(storage, 2).score, 182972, 'equal-quality family records prefer the higher comparable score');
saveRecord(storage, 2, shortQuality, 139672, 240);
assert.equal(bestRecord(storage, 2).sourceVersion, CURRENT_SCORE_VERSION, 'higher comparable points break an equal-quality tie');
saveRecord(storage, 2, shortQuality + 0.001, 1, 1);
assert.equal(bestRecord(storage, 2).quality, shortQuality + 0.001, 'a real quality improvement still wins');
for (let difficulty = 0; difficulty < 3; difficulty++) {
  assert.equal(comparableScore(SHORT_SCORE_ANCHORS[difficulty], difficulty), FULL_SCORE_ANCHORS[difficulty]);
  assert.equal(comparableScore(0, difficulty), 0);
  assert.equal(comparableScore(54321, difficulty, 'mulassa-v1'), 54321);
  for (let raw = 0, previous = 0; raw < 200000; raw += 97) {
    const score = comparableScore(raw, difficulty);
    assert(Number.isSafeInteger(score) && score >= previous);
    previous = score;
  }
}
console.log('score scale and local record compatibility ok');

assert.equal(comparableScore(12345, 1, 'drac-v1'), 12345, 'Drac scores stay on their own scale');
