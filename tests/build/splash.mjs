// The app's walking-Mulassa splash is generated from the web's own art (tools/app/splash.mjs): a change to MULASSA_SVG or
// the ml-* keyframes without regenerating would make the app's launch drift from mulassa.cat's cover.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const files = () => [
  ...readdirSync(join(root, 'android/app/src/main/res/drawable')).filter(f => f.startsWith('splash_')).map(f => `android/app/src/main/res/drawable/${f}`),
  'android/app/src/main/java/cat/mulassa/games/launcher/SplashArt.kt', 'ios/App/App/Launcher/SplashArt.swift',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-rest.svg',
].sort();
const snap = () => Object.fromEntries(files().map(f => [f, readFileSync(join(root, f), 'utf8')]));
const before = snap();
execFileSync(process.execPath, [join(root, 'tools/app/splash.mjs')]); // deterministic: rewrites identical files when fresh
assert.deepEqual(snap(), before, 'the app splash was stale: tools/app/splash.mjs has just regenerated it, review and commit');
assert.ok(Object.keys(before).length > 10, 'the splash has its layers');
console.log(`app splash: ${Object.keys(before).length} generated files match the web art ok`);
