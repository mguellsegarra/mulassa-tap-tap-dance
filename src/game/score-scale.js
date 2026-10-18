// Keep published points on their original scale. These anchors come from the full and short
// charts: chronological perfect judgments, full holds, actual finale, 12 balloon taps/s
// (tools/reference-score.mjs). Security ceilings use a separate conservative bound.
// This is a proportional calibration, not an exact reconstruction of removed player inputs.
export const CURRENT_SCORE_VERSION = 'mulassa-v2-short';
export const LEGACY_SCORE_VERSION = 'mulassa-v1';
export const FULL_SCORE_ANCHORS = Object.freeze([96572, 113940, 196572]);
export const SHORT_SCORE_ANCHORS = Object.freeze([69350, 83540, 149972]);

export function comparableScore(raw, difficulty, version = CURRENT_SCORE_VERSION) {
  if (version === LEGACY_SCORE_VERSION || version === 'drac-v1') return raw;
  if (version !== CURRENT_SCORE_VERSION || !Number.isInteger(difficulty) || difficulty < 0 || difficulty > 2)
    throw new RangeError('Unknown score version or difficulty');
  return Math.round(raw * FULL_SCORE_ANCHORS[difficulty] / SHORT_SCORE_ANCHORS[difficulty]);
}
