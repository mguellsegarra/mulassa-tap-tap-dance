// experiments/1311 only, never release: ?exp= swaps the song the Mulassa plays and dances (the menu keeps hers).
// guerreres: «Golden» on the house band (tools/music/build_golden_poc.py); figaflawas: «a la freSka» from its YouTube
// embed (tools/music/build_youtube_poc.py, src/platform/youtube.js).
import mulassaSong from '../song-mulassa.json' with { type: 'json' };
import goldenSong from '../song-golden.json' with { type: 'json' };
import figaSong from '../song-figaflawas.json' with { type: 'json' };
import { Q } from '../core/flags.js';

const EXPERIMENTS = { guerreres: goldenSong, guerreras: goldenSong, golden: goldenSong, figaflawas: figaSong };
export const mulassaPlaySong = EXPERIMENTS[Q.get('exp')] ?? mulassaSong;
