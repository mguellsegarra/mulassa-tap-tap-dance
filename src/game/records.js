import { comparableScore, CURRENT_SCORE_VERSION, LEGACY_SCORE_VERSION, SHORT_SCORE_VERSION } from './score-scale.js';

// The current dance's record lives at record-points-mulassa-v3-<level> (the pattern: record-points-<figure>-<version>-<level>).
// The keys before it belong to the previous dance (mulassa-v1 / v2-short): old cached tabs keep rewriting them, so
// v3 code only reads them (readPreviousDanceRecord) and never compares them with a v3 record or writes them.
export const recordPointsKey = difficulty => `record-points-mulassa-v3-${difficulty}`;
const previousKeys = difficulty => [`record-v2-duet-${difficulty}`, `record-family-mulassa-${difficulty}`, `record-points-mulassa-${difficulty}`];
const recordScale = 'mulassa-family-v1';
// Most points wins, like the board (get_leaderboard_all) and submit_result; the % only breaks a tie.
export function beatsRecord(quality, score, previous) {
  if (!previous) return true;
  if (score !== previous.score) return score > previous.score;
  // Different chart denominators can put equal rational percentages a few ulps apart.
  return quality - previous.quality > 1e-9;
}
function readRecord(store, key, difficulty, version, legacy = false) {
  try {
    const value = JSON.parse(store.get(key));
    if (!value || !Number.isFinite(value.quality) || value.quality < 0 || value.quality > 100
      || !Number.isSafeInteger(value.score) || value.score < 0) return null;
    legacy ||= value.sourceVersion === LEGACY_SCORE_VERSION; // a legacy record carried over to the points key
    if (!legacy && (value.scoreScale !== recordScale || value.sourceVersion !== version
      || !Number.isSafeInteger(value.rawScore) || value.rawScore < 0
      || comparableScore(value.rawScore, difficulty, version) !== value.score)) return null;
    return { ...value, sourceVersion: legacy ? LEGACY_SCORE_VERSION : value.sourceVersion };
  } catch { return null; }
}
export const bestRecord = (store, difficulty) => readRecord(store, recordPointsKey(difficulty), difficulty, CURRENT_SCORE_VERSION);
// The previous dance's best at a level (for the Profile): its own scale, read-only, by the old rules.
export function readPreviousDanceRecord(store, difficulty) {
  const [duet, family, points] = previousKeys(difficulty);
  return [readRecord(store, family, difficulty, SHORT_SCORE_VERSION), readRecord(store, points, difficulty, SHORT_SCORE_VERSION)]
    .reduce((b, r) => r && beatsRecord(r.quality, r.score, b) ? r : b, readRecord(store, duet, difficulty, SHORT_SCORE_VERSION, true));
}
export function saveRecord(store, difficulty, quality, rawScore, combo) {
  store.set(recordPointsKey(difficulty), JSON.stringify({ quality, rawScore, score: comparableScore(rawScore, difficulty),
    combo, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: recordScale }));
}
