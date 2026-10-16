import { comparableScore, CURRENT_SCORE_VERSION, LEGACY_SCORE_VERSION } from './score-scale.js';

export const recordFamilyKey = difficulty => `record-family-mulassa-${difficulty}`;
const recordScale = 'mulassa-family-v1';
function readRecord(store, key, difficulty, legacy = false) {
  try {
    const value = JSON.parse(store.get(key));
    if (!value || !Number.isFinite(value.quality) || value.quality < 0 || value.quality > 100
      || !Number.isSafeInteger(value.score) || value.score < 0) return null;
    if (!legacy && (value.scoreScale !== recordScale || value.sourceVersion !== CURRENT_SCORE_VERSION
      || !Number.isSafeInteger(value.rawScore) || value.rawScore < 0
      || comparableScore(value.rawScore, difficulty) !== value.score)) return null;
    return { ...value, sourceVersion: legacy ? LEGACY_SCORE_VERSION : value.sourceVersion };
  } catch { return null; }
}
export function bestRecord(store, difficulty) {
  // Re-read both every run: an older cached client may improve its legacy record later.
  const old = readRecord(store, `record-v2-duet-${difficulty}`, difficulty, true);
  const current = readRecord(store, recordFamilyKey(difficulty), difficulty);
  if (!old) return current;
  if (!current) return old;
  return current.quality > old.quality || (current.quality === old.quality && current.score > old.score) ? current : old;
}
export function saveRecord(store, difficulty, quality, rawScore, combo) {
  store.set(recordFamilyKey(difficulty), JSON.stringify({ quality, rawScore, score: comparableScore(rawScore, difficulty),
    combo, sourceVersion: CURRENT_SCORE_VERSION, scoreScale: recordScale }));
}
