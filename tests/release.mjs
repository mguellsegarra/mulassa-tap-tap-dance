// The release tag rule (tools/app-version.mjs, tools/release.mjs): the tag is the version the commit builds as.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { versionOf, versionAt } from '../tools/app-version.mjs';
import { tagFor } from '../tools/release.mjs';

assert.equal(versionOf('1.1.0', 25), '1.1.25', 'MAJOR.MINOR from package.json, PATCH = commits');
assert.equal(versionOf('1.1.25', 26), '1.1.26', "package.json's own PATCH is ignored");
assert.equal(versionOf('1.2.0', '7'), '1.2.7');
assert.equal(tagFor('1.1.25'), 'v1.1.25');
const head = versionAt('HEAD');
assert.match(head, /^\d+\.\d+\.\d+$/, 'HEAD builds as a plain MAJOR.MINOR.PATCH');
// the deploy's guard: the matching tag passes, any other fails
const check = tag => { try { execFileSync('node', ['tools/release.mjs', '--check', tag], { stdio: 'ignore' }); return true; } catch { return false; } };
assert(check(tagFor(head)), 'the version HEAD builds as passes the deploy check');
assert(!check('v0.0.1') && !check(head), 'another version, or a bare version without v, is refused');
console.log('release tag rule ok');
