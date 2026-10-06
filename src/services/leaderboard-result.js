import { snapshotResult } from './leaderboard-rules.js';

let result = null, debugUsed = false;
const listeners = new Set();
function notify() {
  for (const listener of listeners) {
    try { listener(result); } catch { console.error('No s’ha pogut actualitzar la classificació.'); }
  }
}
export const getLeaderboardResult = () => result;
export function subscribeLeaderboardResult(listener) {
  listeners.add(listener);
  listener(result);
  return () => listeners.delete(listener);
}
export function clearLeaderboardResult() { result = null; notify(); }
export function markLeaderboardDebugUse() { debugUsed = true; clearLeaderboardResult(); }
export function captureLeaderboardResult(game, reason, query) {
  result = snapshotResult(game, { reason, query, debugUsed });
  notify();
  return result;
}
