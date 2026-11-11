// The player's best score, kept on this device. The board's (ranking-ui.js) raises it: a best made on another device or
// browser under the same name is this player's too, so a run here is measured against it.
import { deviceBest } from '#plassa/best.js';

export const { best, raiseBest } = deviceBest('pica-best'); // the game's first name: kept, so a best score survives the rename
