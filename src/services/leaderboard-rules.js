import { checkAlias } from './alias-rules.js';
import { CURRENT_SCORE_VERSION, SHORT_SCORE_VERSION, DRAC_SCORE_VERSION, BOU_SCORE_VERSION } from '../game/score-scale.js';
// Charts retain their own raw counts and validation; the server combines their comparable points.
export const LEADERBOARD_VERSION = CURRENT_SCORE_VERSION;
export const EXPECTED_JUDGMENTS = Object.freeze([108, 133, 240]);
// The most a human can score per level, +5% (tools/score-ceiling.mjs: a perfect run, balloons mashed at 30 taps/s).
// The server refuses more (versions.max_score, 202609280015_score_ceiling.sql); tests/score-ceiling.mjs keeps both in
// step with the chart and the scoring.
export const MAX_SCORES = Object.freeze([109000, 122000, 193000]);
// extras_max: the most holds and balloons pay whatever the judgments say (tools/score-ceiling.mjs, same +5%).
export const EXTRAS_MAX = Object.freeze([50000, 48000, 51000]);
const rules = (judgments, ceilings, extras, figureId) => Object.freeze({ judgments: Object.freeze(judgments), ceilings: Object.freeze(ceilings), extras: Object.freeze(extras), figureId });
// Every version belongs to one figure and one score family; mulassa-v1 and v2-short only stay for history.
export const VERSION_RULES = Object.freeze({
  'mulassa-v1': rules([150, 181, 318], [147000, 163000, 250000], [63000, 60000, 65000], 'mulassa-valls'),
  [SHORT_SCORE_VERSION]: rules([108, 133, 240], [109000, 122000, 193000], [50000, 48000, 51000], 'mulassa-valls'),
  [LEADERBOARD_VERSION]: rules(EXPECTED_JUDGMENTS, MAX_SCORES, EXTRAS_MAX, 'mulassa-valls'),
  [DRAC_SCORE_VERSION]: rules([106, 200, 277], [157000, 205000, 237000], [104000, 103000, 92000], 'drac-valls'),
  // the server's rows wait in supabase/pending/202610230001_bou_board.sql: not publishable until that is applied
  [BOU_SCORE_VERSION]: rules([131, 225, 423], [69000, 126000, 237000], [0, 5000, 5000], 'bou-tradicional-valls'),
});
// Only these may be published from this client.
const PUBLISHABLE = [LEADERBOARD_VERSION, DRAC_SCORE_VERSION];

// the server's rules (202609280009_alias_hardening.sql) mirrored by src/services/alias-rules.js: one check for both
export function normalizeAlias(value) {
  if (typeof value !== 'string') return null;
  const r = checkAlias(value, { extras: true });
  return r.ok ? r.alias : null;
}

export function validResult(result) {
  if (!result || !Object.hasOwn(VERSION_RULES, result.version) || (result.figureId != null && result.figureId !== VERSION_RULES[result.version].figureId) || !Number.isInteger(result.difficulty) || result.difficulty < 0 || result.difficulty > 2) return false;
  const contract = VERSION_RULES[result.version];
  const c = result.counts;
  return c && ['perfect', 'good', 'miss'].every(k => Number.isSafeInteger(c[k]) && c[k] >= 0)
    && c.perfect + c.good + c.miss === contract.judgments[result.difficulty]
    && Number.isSafeInteger(result.score) && result.score >= 0 && result.score <= contract.ceilings[result.difficulty]
    && Number.isSafeInteger(result.maxCombo) && result.maxCombo >= 0 && result.maxCombo <= c.perfect + c.good;
}

export function snapshotResult(game, { reason, query, debugUsed = false }) {
  const version = game.figureVersion ?? LEADERBOARD_VERSION;
  if (!PUBLISHABLE.includes(version) || (game.figureId != null && game.figureId !== VERSION_RULES[version].figureId)) return null;
  if (reason !== 'end' || game.practice || debugUsed || ['autoplay', 'from', 'view', 'perf'].some(k => query.has(k))) return null;
  const result = { version, difficulty: game.diff,
    counts: Object.freeze({ perfect: game.counts.perfect, good: game.counts.good, miss: game.counts.miss }),
    score: game.score, maxCombo: game.maxCombo };
  return validResult(result) ? Object.freeze(result) : null;
}
