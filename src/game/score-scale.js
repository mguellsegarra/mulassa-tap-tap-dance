// mulassa-v3 (the reference-led dance), drac-v1 and bou-v1 are score families of their own: raw points, never compared with
// older versions. mulassa-v1 (raw) and mulassa-v2-short (scaled) stay readable as history only.
// The v2 anchors come from the full and short charts: chronological perfect judgments, full holds, actual finale,
// 12 balloon taps/s (tools/reference-score.mjs). Security ceilings use a separate conservative bound.
// This is a proportional calibration, not an exact reconstruction of removed player inputs.
export const CURRENT_SCORE_VERSION = 'mulassa-v3';
export const SHORT_SCORE_VERSION = 'mulassa-v2-short';
export const DRAC_SCORE_VERSION = 'drac-v1';
export const BOU_SCORE_VERSION = 'bou-v1'; // local records only: the server has no such version yet
export const LEGACY_SCORE_VERSION = 'mulassa-v1';
export const FULL_SCORE_ANCHORS = Object.freeze([96572, 113940, 196572]);
export const SHORT_SCORE_ANCHORS = Object.freeze([69350, 83540, 149972]);

export function comparableScore(raw, difficulty, version = CURRENT_SCORE_VERSION) {
  if (version === CURRENT_SCORE_VERSION || version === LEGACY_SCORE_VERSION || version === DRAC_SCORE_VERSION || version === BOU_SCORE_VERSION) return raw;
  if (version !== SHORT_SCORE_VERSION || !Number.isInteger(difficulty) || difficulty < 0 || difficulty > 2)
    throw new RangeError('Unknown score version or difficulty');
  return Math.round(raw * FULL_SCORE_ANCHORS[difficulty] / SHORT_SCORE_ANCHORS[difficulty]);
}
