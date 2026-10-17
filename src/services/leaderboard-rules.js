import { checkAlias } from './alias-rules.js';
import { CURRENT_SCORE_VERSION } from '../game/score-scale.js';
// Charts retain their own raw counts and validation; the server combines their comparable points.
export const LEADERBOARD_VERSION = CURRENT_SCORE_VERSION;
export const EXPECTED_JUDGMENTS = Object.freeze([108, 133, 240]);
// The most a human can score per level, +5% (tools/score-ceiling.mjs: a perfect run, balloons mashed at 30 taps/s).
// The server refuses more (versions.max_score, 202609280015_score_ceiling.sql); tests/score-ceiling.mjs keeps both in
// step with the chart and the scoring.
export const MAX_SCORES = Object.freeze([109000, 122000, 193000]);
export const VERSION_RULES = Object.freeze({
  'mulassa-v1': Object.freeze({ judgments: Object.freeze([150, 181, 318]), ceilings: Object.freeze([147000, 163000, 250000]) }),
  [LEADERBOARD_VERSION]: Object.freeze({ judgments: EXPECTED_JUDGMENTS, ceilings: MAX_SCORES }),
});

// the server's rules (202609280009_alias_hardening.sql) mirrored by src/services/alias-rules.js: one check for both
export function normalizeAlias(value) {
  if (typeof value !== 'string') return null;
  const r = checkAlias(value, { extras: true });
  return r.ok ? r.alias : null;
}

export function validResult(result) {
  if (!result || !Object.hasOwn(VERSION_RULES, result.version) || !Number.isInteger(result.difficulty) || result.difficulty < 0 || result.difficulty > 2) return false;
  const contract = VERSION_RULES[result.version];
  const c = result.counts;
  return c && ['perfect', 'good', 'miss'].every(k => Number.isSafeInteger(c[k]) && c[k] >= 0)
    && c.perfect + c.good + c.miss === contract.judgments[result.difficulty]
    && Number.isSafeInteger(result.score) && result.score >= 0 && result.score <= contract.ceilings[result.difficulty]
    && Number.isSafeInteger(result.maxCombo) && result.maxCombo >= 0 && result.maxCombo <= c.perfect + c.good;
}

export function snapshotResult(game, { reason, query, debugUsed = false }) {
  if (reason !== 'end' || game.practice || debugUsed || ['autoplay', 'from', 'view', 'perf'].some(k => query.has(k))) return null;
  const result = { version: LEADERBOARD_VERSION, difficulty: game.diff,
    counts: Object.freeze({ perfect: game.counts.perfect, good: game.counts.good, miss: game.counts.miss }),
    score: game.score, maxCombo: game.maxCombo };
  return validResult(result) ? Object.freeze(result) : null;
}
