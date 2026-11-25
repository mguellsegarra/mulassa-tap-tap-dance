// The main game's update check (update-watch.js): quiet is the menus with nothing open.
import { G } from '../game/state.js';
import { quietMoment } from './update-rules.js';
import { watchUpdates } from './update-watch.js';

watchUpdates(() => quietMoment(G.state, document), false); // the app switches bundles on a games page, never mid-game here
// the start needs no check here: index.html's #build-check already compared the build before the game booted
