import assert from 'node:assert/strict';
import { comparableScore, CURRENT_SCORE_VERSION, FULL_SCORE_ANCHORS, SHORT_SCORE_ANCHORS } from '../src/game/score-scale.js';
import { bestRecord, recordFamilyKey, recordPointsKey, saveRecord } from '../src/game/records.js';
import { quality } from '../src/game/progress.js';

const data = new Map(), storage = { get: key => data.get(key) ?? null, set: (key, value) => data.set(key, value) };
const legacy = 'record-v2-duet-1', key = recordPointsKey(1), family = recordFamilyKey(1);
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
assert.equal(bestRecord(storage, 1).score, 80000, 'more points beat a higher % (the board ranks by points)');
data.set(family, JSON.stringify({ quality: 100, score: 999999, rawScore: 1, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: 'mulassa-family-v1' }));
assert.equal(bestRecord(storage, 1).score, 80000, 'incoherent converted records are ignored');
// A still-open pre-points client rewrites the family key by % (same format, its own key): it can no longer erase the
// points record, and whatever it writes still competes by points.
data.clear();
saveRecord(storage, 1, 90, 71500, 120);
const points = data.get(key), familyRecord = (q, raw) => JSON.stringify({ quality: q, rawScore: raw, score: comparableScore(raw, 1),
  combo: 1, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: 'mulassa-family-v1' });
data.set(family, familyRecord(100, 70500));
assert.equal(bestRecord(storage, 1).quality, 90, 'an older client’s higher % with fewer points does not replace the points record');
assert.equal(data.get(key), points);
data.set(family, familyRecord(80, 72000));
assert.equal(bestRecord(storage, 1).rawScore, 72000, 'a family record with more points still wins');
saveRecord(storage, 1, 85, 71000, 1);
assert.equal(bestRecord(storage, 1).rawScore, 72000, 'saving never hides a better record kept elsewhere');
data.set(family, familyRecord(100, 70500));
assert.equal(bestRecord(storage, 1).rawScore, 72000, 'a better record once read from an older key survives that key being rewritten');
data.clear();
data.set(legacy, JSON.stringify({ quality: 90, score: 200000, combo: 90 }));
assert.equal(bestRecord(storage, 1).score, 200000);
data.set(legacy, JSON.stringify({ quality: 95, score: 10, combo: 9 }));
assert.equal(bestRecord(storage, 1).score, 200000, 'also a legacy record, kept on its own scale');
assert.equal(bestRecord(storage, 1).sourceVersion, 'mulassa-v1');
data.clear();
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
assert.equal(bestRecord(storage, 2).score, 182972, 'a higher % with fewer points does not win');
data.set('record-v2-duet-2', JSON.stringify({ quality: 80, score: comparableScore(139672, 2), combo: 100 }));
saveRecord(storage, 2, 81, 139672, 240);
assert.equal(bestRecord(storage, 2).quality, 81, 'equal comparable points: the higher % breaks the tie');
saveRecord(storage, 2, 79, 139672, 240);
assert.equal(bestRecord(storage, 2).quality, 80, 'equal comparable points and a lower %: the older record stays');
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
