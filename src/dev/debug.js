// Debug hooks: using one marks the run as never publishable.
import { markLeaderboardDebugUse } from '../services/leaderboard-result.js';

export let debugUsed = false; // the run statistics skip a session that used a debug hook, like the leaderboard
export const debugAction = fn => (...args) => { debugUsed = true; markLeaderboardDebugUse(); return fn(...args); };
