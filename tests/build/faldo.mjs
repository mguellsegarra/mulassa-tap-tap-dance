// The app home's fixed header, the Faldó (owner's pick, 27 Nov 2026), is drawn twice: SwiftUI (LauncherView.swift) and
// Compose (LauncherScreens.kt). Both homes must draw it, with the same measures and palette, and each grid must start a
// margin under its fringe's real tips, or the cartridges at rest would hide behind it (or the page scroll for nothing)
// on one platform only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const read = f => readFileSync(join(root, f), 'utf8');
const ios = read('ios/App/App/Launcher/LauncherView.swift');
const android = read('android/app/src/main/java/cat/mulassa/games/launcher/LauncherScreens.kt');
const block = (src, from, what) => { const a = src.indexOf(from); assert(a >= 0, `${what} not found`); return src.slice(a, src.indexOf('\n}\n', a)); };
const iosHome = block(ios, 'private struct Home', 'iOS Home'), iosFaldo = block(ios, 'struct Faldo', 'iOS Faldo');
const andHome = block(android, 'private fun Home', 'Android Home'), andFaldo = block(android, 'private val FALDO_BELOW', 'Android Faldo');

// both homes draw it
assert.match(iosHome, /Faldo\(cloth: /, 'the iOS home no longer draws the Faldó');
assert.match(andHome, /\n\s*Faldo\(top \+ FALDO_BELOW\)/, 'the Android home no longer draws the Faldó');

const num = (src, re, what) => { const m = src.match(re); assert(m, `${what} not found`); return +m[1]; };
const measures = {};
for (const [key, swift, kotlin] of [['below', /static let below: CGFloat = ([\d.]+)/, /FALDO_BELOW = ([\d.]+)\.dp/],
  ['row', /static let row: CGFloat = ([\d.]+)/, /FALDO_ROW = ([\d.]+)\.dp/],
  ['fringe', /static let fringe: CGFloat = ([\d.]+)/, /FALDO_FRINGE = ([\d.]+)\.dp/]]) {
  measures[key] = num(iosFaldo, swift, `iOS ${key}`);
  assert.equal(measures[key], num(andFaldo, kotlin, `Android ${key}`), `the Faldó's ${key} differs between iOS and Android`);
}

// the strands: same widths, steps and lengths on both; `fringe` is how far the longest hangs under the cloth
const strands = src => [...src.matchAll(/\(([\d.]+)f?, ([\d.]+)f?, /g)].map(m => [+m[1], +m[2]]);
const iosStrands = strands(iosFaldo.slice(iosFaldo.indexOf('strands:'))).slice(0, 3), andStrands = strands(andFaldo.slice(andFaldo.indexOf('GOLDS')));
assert.equal(iosStrands.length, 3, 'iOS strands not found');
assert.deepEqual(andStrands.slice(0, 3), iosStrands, 'the fringe\'s strands differ between iOS and Android');
const tuck = num(iosFaldo, /y: cloth - ([\d.]+), width: 3\.4/, 'iOS strands\' top');
assert.match(andFaldo, new RegExp(`c - ${tuck} \\* d\\), Size\\(3\\.4f \\* d`), 'Android strands start elsewhere than iOS');
assert.equal(Math.max(...iosStrands.map(s => s[1])) - tuck, measures.fringe, '`fringe` is not how far the longest strand hangs');

// the palette, inside each Faldó
for (const hex of ['7d1f35', '3d0a18', 'f2c230', 'd9a521', 'e9b62a', 'fff0b0']) {
  assert.match(iosFaldo, new RegExp(hex, 'i'), `iOS's Faldó lacks #${hex}`);
  assert.match(andFaldo, new RegExp(hex, 'i'), `Android's Faldó lacks #${hex}`);
}

// the grid starts one gap under the fringe (Grid: the side margin when the rows fit, plus what room is left), in its
// padding and in the grid's measures alike
assert.match(iosHome, /\.padding\(\.top, Faldo\.below \+ Faldo\.fringe \+ grid\.side \+ grid\.lead\)/, 'iOS grid does not start under the fringe');
assert.match(iosHome, /fringe: g\.safeAreaInsets\.top \+ Faldo\.below \+ Faldo\.fringe/, 'iOS grid measures ignore the Faldó');
assert.match(andHome, /val fringe = top \+ FALDO_BELOW \+ FALDO_FRINGE/, 'Android grid top ignores the Faldó');
assert.match(andHome, /grid\(.*fringe, rows\.size/, 'Android grid measures ignore the fringe');
assert.match(andHome, /PaddingValues\([^)]*top = fringe \+ grid\.side \+ grid\.lead/, 'Android grid padding ignores the fringe');
console.log('faldó: iOS and Android draw it with the same measures, strands and palette, and start the grid under it ok');
