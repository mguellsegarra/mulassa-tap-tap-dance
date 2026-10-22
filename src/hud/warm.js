// Pre-paints the count-in and title words in spare frames.
import { tr } from '../i18n/messages.js';
import { fontsReady, warmups, C } from './sprites.js';
import { G } from '../game/state.js';
import { titleWarmups } from './title.js';
import { text } from './primitives.js';
import { BANNER } from './layout.js';
import { bigWord } from './praise.js';
import { W } from './canvas.js';
import { streakWarmups } from './lane.js';

fontsReady.then(() => warmStart()); // the splash waits for a tap: time to paint them (after the web fonts: they reset sprites)
export function warmStart() {
  warmups.length = 0;
  if (G.state === 'splash') warmups.push(...titleWarmups()); // the tap shows the title: its words first
  warmups.push(() => text(tr('hud.banner.ready'), 0, 0, BANNER.ready(), C.cream),
    ...['3', '2', '1'].map(n => () => bigWord(n, 0, 0, 1, BANNER.count, 0, W - 12, BANNER.big())),
    () => bigWord(tr('hud.banner.go'), 0, 0, 1, BANNER.goCols, -0.05, W - 12, BANNER.go()), ...streakWarmups());
}
