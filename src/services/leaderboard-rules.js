import { checkAlias } from './alias-rules.js';
// Bump when chart, judging or scoring changes; old runs stay in their own board.
export const LEADERBOARD_VERSION = 'mulassa-v1';
export const EXPECTED_JUDGMENTS = Object.freeze([150, 181, 318]);
// The most a human can score per level, +5% (tools/score-ceiling.mjs: a perfect run, balloons mashed at 30 taps/s).
// The server refuses more (versions.max_score, 202609280015_score_ceiling.sql); tests/score-ceiling.mjs keeps both in
// step with the chart and the scoring.
export const MAX_SCORES = Object.freeze([147000, 163000, 250000]);

// the server's rules (202609280009_alias_hardening.sql) mirrored by src/services/alias-rules.js: one check for both
export function normalizeAlias(value) {
  if (typeof value !== 'string') return null;
  const r = checkAlias(value, { extras: true });
  return r.ok ? r.alias : null;
}

export function validResult(result) {
  if (!result || result.version !== LEADERBOARD_VERSION || !Number.isInteger(result.difficulty) || result.difficulty < 0 || result.difficulty > 2) return false;
  const c = result.counts;
  return c && ['perfect', 'good', 'miss'].every(k => Number.isSafeInteger(c[k]) && c[k] >= 0)
    && c.perfect + c.good + c.miss === EXPECTED_JUDGMENTS[result.difficulty]
    && Number.isSafeInteger(result.score) && result.score >= 0 && result.score <= MAX_SCORES[result.difficulty]
    && Number.isSafeInteger(result.maxCombo) && result.maxCombo >= 0 && result.maxCombo <= c.perfect + c.good;
}

export function snapshotResult(game, { reason, query, debugUsed = false }) {
  if (reason !== 'end' || game.practice || debugUsed || ['autoplay', 'from', 'view', 'perf'].some(k => query.has(k))) return null;
  const result = { version: LEADERBOARD_VERSION, difficulty: game.diff,
    counts: Object.freeze({ perfect: game.counts.perfect, good: game.counts.good, miss: game.counts.miss }),
    score: game.score, maxCombo: game.maxCombo };
  return validResult(result) ? Object.freeze(result) : null;
}
