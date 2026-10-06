// Debug hooks: using one marks the run as never publishable.
import { markLeaderboardDebugUse } from '../services/leaderboard-result.js';

export const debugAction = fn => (...args) => { markLeaderboardDebugUse(); return fn(...args); };
