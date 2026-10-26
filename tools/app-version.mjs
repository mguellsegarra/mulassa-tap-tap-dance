// The build's version, one rule for vite.config.js, the deploy's tag check and `npm run release` (tools/release.mjs):
// MAJOR.MINOR from package.json (bumped by hand for a milestone), PATCH = commits on the commit built. Its PATCH is unused.
import { execFileSync } from 'node:child_process';

export const versionOf = (pkgVersion, commits) => `${String(pkgVersion).split('.').slice(0, 2).join('.')}.${commits}`;
export const git = (...args) => { try { return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
// the version a commit builds as (its own package.json and history): what its tag must be called
export function versionAt(ref = 'HEAD') {
  const pkg = git('show', `${ref}:package.json`), commits = git('rev-list', '--count', ref);
  if (!pkg || !commits) throw new Error(`cannot read the version of ${ref}`);
  return versionOf(JSON.parse(pkg).version, commits);
}
