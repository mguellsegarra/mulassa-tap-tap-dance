// node tools/music/compile-music-form.mjs <song> [--original] [--form <path>]
// Prints the compiled timeline (src/music-form/CONTRACT.md) as one line of JSON on stdout. Exit 1 with the problems on
// stderr when the form is invalid or any anchor is unresolved: generators must not run on a broken form.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileForm, compileOriginal } from '../../src/music-form/compile.js';
import { SONGS, isSong } from '../../src/music-form/songs.js';

const [song, ...args] = process.argv.slice(2);
let original = false, formPath, invalid = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--original' && !original) original = true;
  else if (args[i] === '--form' && !formPath && args[i + 1] && !args[i + 1].startsWith('--')) formPath = args[++i];
  else invalid = true;
}
if (!isSong(song) || invalid) {
  console.error(`usage: node tools/music/compile-music-form.mjs <${Object.keys(SONGS).join('|')}> [--original] [--form <path>]`);
  process.exit(2);
}
const read = name => JSON.parse(readFileSync(fileURLToPath(new URL(`../../music/${name}`, import.meta.url)), 'utf8'));
try {
  const form = formPath ? JSON.parse(readFileSync(formPath, 'utf8')) : read(SONGS[song].form);
  if (form.song !== song) throw new Error(`form is for ${form.song}, expected ${song}`);
  const timeline = (original ? compileOriginal : compileForm)(form, read(SONGS[song].score));
  if (timeline.unresolved.length) {
    for (const u of timeline.unresolved) console.error(`${song}-form.json: ${u.path}: ${u.message}`);
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(timeline)}\n`);
} catch (err) {
  console.error(`${song}: ${err.message}`);
  process.exit(1);
}
