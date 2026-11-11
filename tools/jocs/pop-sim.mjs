// Copies Mulassa Pop's simulation into the pop-score Edge Function: the server replays a run with these very files.
// Run after changing any of them (tests/jocs/pop-replay.mjs fails until the copies match). Usage: node tools/jocs/pop-sim.mjs
import { copyFileSync } from 'node:fs';
export const POP_SIM = ['run.js', 'rules.js', 'conductor.js', 'melody.js'];
const from = new URL('../../src/jocs/games/pop/', import.meta.url), to = new URL('../../supabase/functions/pop-score/sim/', import.meta.url);
if (import.meta.url === `file://${process.argv[1]}`) for (const f of POP_SIM) copyFileSync(new URL(f, from), new URL(f, to));
