import assert from 'node:assert/strict';
import { comparableScore, CURRENT_SCORE_VERSION, SHORT_SCORE_VERSION, FULL_SCORE_ANCHORS, SHORT_SCORE_ANCHORS } from '../src/game/score-scale.js';
import { beatsRecord, bestRecord, readPreviousDanceRecord, recordPointsKey, saveRecord } from '../src/game/records.js';

const data = new Map(), storage = { get: key => data.get(key) ?? null, set: (key, value) => data.set(key, value) };
const duet = 'record-v2-duet-1', family = 'record-family-mulassa-1', oldPoints = 'record-points-mulassa-1', key = recordPointsKey(1);
const shortRecord = (quality, raw) => JSON.stringify({ quality, rawScore: raw, score: comparableScore(raw, 1, SHORT_SCORE_VERSION),
  combo: 1, sourceVersion: SHORT_SCORE_VERSION, scoreScale: 'mulassa-family-v1' });
assert.equal(CURRENT_SCORE_VERSION, 'mulassa-v3');
assert.equal(key, 'record-points-mulassa-v3-1');
assert.equal(comparableScore(12345, 1, 'mulassa-v3'), 12345, 'v3 is its own family: raw points');
assert.equal(comparableScore(40000, 1, SHORT_SCORE_VERSION), Math.round(40000 * 113940 / 83540), 'v2-short stays readable on its scale');
assert.throws(() => comparableScore(1, 1, 'nope'));

// v3: points first, % only breaks a tie
assert.equal(bestRecord(storage, 1), null);
saveRecord(storage, 1, 90, 40000, 70);
assert.deepEqual([bestRecord(storage, 1).score, bestRecord(storage, 1).sourceVersion], [40000, CURRENT_SCORE_VERSION], 'no scaling for v3');
assert(beatsRecord(80, 40001, bestRecord(storage, 1)) && !beatsRecord(99, 39999, bestRecord(storage, 1)), 'more points beat a higher %');
assert(beatsRecord(91, 40000, bestRecord(storage, 1)) && !beatsRecord(90, 40000, bestRecord(storage, 1)) && !beatsRecord(89, 40000, bestRecord(storage, 1)), 'equal points: the higher % breaks the tie');

// An old cached tab keeps writing the previous dance's keys: v3 neither reads, compares nor rewrites them
const v3 = data.get(key);
data.set(duet, JSON.stringify({ quality: 100, score: 999999, combo: 90 }));
data.set(family, shortRecord(100, 999999));
data.set(oldPoints, shortRecord(100, 999999));
assert.equal(bestRecord(storage, 1).score, 40000, 'old-tab records never beat the v3 record');
saveRecord(storage, 1, 50, 100, 1);
assert.equal(data.get(duet), JSON.stringify({ quality: 100, score: 999999, combo: 90 }), 'v3 never overwrites the old keys');
assert.equal(data.get(family), shortRecord(100, 999999));
assert.equal(data.get(oldPoints), shortRecord(100, 999999));
data.set(key, v3);
data.clear();
data.set(oldPoints, shortRecord(100, 1));
assert.equal(bestRecord(storage, 1), null, 'only old-key records: no v3 record yet');
for (const bad of ['{', JSON.stringify({ quality: 90, rawScore: 5, score: 6, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: 'mulassa-family-v1' })]) {
  data.set(key, bad);
  assert.equal(bestRecord(storage, 1), null, 'malformed or incoherent v3 records do not block a run');
}
assert.equal(bestRecord({ get() { throw Error('blocked storage'); } }, 0), null);

// The previous dance's record (Profile): read-only, by the old rules, never touched
data.clear();
assert.equal(readPreviousDanceRecord(storage, 1), null);
data.set(duet, JSON.stringify({ quality: 90, score: 50000, combo: 90 }));
assert.equal(readPreviousDanceRecord(storage, 1).score, 50000);
data.set(oldPoints, shortRecord(80, 30000));
assert.equal(readPreviousDanceRecord(storage, 1).score, 50000, 'the most points of the old keys');
data.set(family, shortRecord(100, 70500));
assert.equal(readPreviousDanceRecord(storage, 1).score, comparableScore(70500, 1, SHORT_SCORE_VERSION));
data.set(family, JSON.stringify({ quality: 100, score: 999999, rawScore: 1, sourceVersion: SHORT_SCORE_VERSION, scoreScale: 'mulassa-family-v1' }));
assert.equal(readPreviousDanceRecord(storage, 1).score, 50000, 'incoherent converted records are ignored');
data.set(duet, JSON.stringify({ quality: 95, score: 200000, combo: 9 }));
assert.equal(readPreviousDanceRecord(storage, 1).score, 200000);
data.set(duet, JSON.stringify({ quality: 95, score: 10, combo: 9 }));
data.set(oldPoints, JSON.stringify({ quality: 90, rawScore: 1, score: 150000, sourceVersion: 'mulassa-v1' }));
assert.equal(readPreviousDanceRecord(storage, 1).sourceVersion, 'mulassa-v1', 'a legacy record keeps its own scale');
const snapshot = JSON.stringify([...data]);
readPreviousDanceRecord(storage, 1);
assert.equal(JSON.stringify([...data]), snapshot, 'reading the previous dance writes nothing');
data.clear(); data.set(duet, '{');
assert.equal(readPreviousDanceRecord(storage, 1), null);
for (let difficulty = 0; difficulty < 3; difficulty++) {
  assert.equal(comparableScore(SHORT_SCORE_ANCHORS[difficulty], difficulty, SHORT_SCORE_VERSION), FULL_SCORE_ANCHORS[difficulty]);
  assert.equal(comparableScore(0, difficulty), 0);
  assert.equal(comparableScore(54321, difficulty, 'mulassa-v1'), 54321);
  for (let raw = 0, previous = 0; raw < 200000; raw += 97) {
    const score = comparableScore(raw, difficulty, SHORT_SCORE_VERSION);
    assert(Number.isSafeInteger(score) && score >= previous);
    previous = score;
  }
}
console.log('score scale and local record compatibility ok');

assert.equal(comparableScore(12345, 1, 'drac-v1'), 12345, 'Drac scores stay on their own scale');
