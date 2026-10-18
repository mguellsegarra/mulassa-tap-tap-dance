import { comparableScore, CURRENT_SCORE_VERSION, LEGACY_SCORE_VERSION } from './score-scale.js';

export const recordFamilyKey = difficulty => `record-family-mulassa-${difficulty}`;
// Points-first records live apart: a still-open older client keeps rewriting the family key by %.
export const recordPointsKey = difficulty => `record-points-mulassa-${difficulty}`;
const recordScale = 'mulassa-family-v1';
// Most comparable points wins, like the board (get_leaderboard_all) and submit_result; the % only breaks a tie.
export function beatsRecord(quality, score, previous) {
  if (!previous) return true;
  if (score !== previous.score) return score > previous.score;
  // Different chart denominators can put equal rational percentages a few ulps apart.
  return quality - previous.quality > 1e-9;
}
function readRecord(store, key, difficulty, legacy = false) {
  try {
    const value = JSON.parse(store.get(key));
    if (!value || !Number.isFinite(value.quality) || value.quality < 0 || value.quality > 100
      || !Number.isSafeInteger(value.score) || value.score < 0) return null;
    legacy ||= value.sourceVersion === LEGACY_SCORE_VERSION; // a legacy record carried over to the points key
    if (!legacy && (value.scoreScale !== recordScale || value.sourceVersion !== CURRENT_SCORE_VERSION
      || !Number.isSafeInteger(value.rawScore) || value.rawScore < 0
      || comparableScore(value.rawScore, difficulty) !== value.score)) return null;
    return { ...value, sourceVersion: legacy ? LEGACY_SCORE_VERSION : value.sourceVersion };
  } catch { return null; }
}
export function bestRecord(store, difficulty) {
  // Re-read all three every run: older cached clients may still improve the legacy or family record later.
  const kept = readRecord(store, recordPointsKey(difficulty), difficulty);
  const best = [readRecord(store, `record-v2-duet-${difficulty}`, difficulty, true), readRecord(store, recordFamilyKey(difficulty), difficulty)]
    .reduce((b, r) => r && beatsRecord(r.quality, r.score, b) ? r : b, kept);
  // Carry a better older record over: those clients may still rewrite their own keys by %, losing it.
  if (best && best !== kept) store.set(recordPointsKey(difficulty), JSON.stringify(best));
  return best;
}
export function saveRecord(store, difficulty, quality, rawScore, combo) {
  store.set(recordPointsKey(difficulty), JSON.stringify({ quality, rawScore, score: comparableScore(rawScore, difficulty),
    combo, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: recordScale }));
}
