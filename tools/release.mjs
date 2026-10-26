// `npm run release`: the production tag for main's latest commit. A tag vX.Y.Z deploys mulassa.cat (deploy-pages.yml),
// and its name must be the version that commit builds as (tools/app-version.mjs), so the screen shows the tag.
//   npm run release            fetches main and prints the tag it would create (nothing is written)
//   npm run release -- --push  creates that annotated tag on origin/main and pushes it: a production deploy
//   node tools/release.mjs --check v1.1.25   the deploy's guard: exits 1 unless HEAD builds as that tag
import { execFileSync } from 'node:child_process';
import { git, versionAt } from './app-version.mjs';

export const tagFor = version => `v${version}`;
const run = (...a) => execFileSync('git', a, { stdio: 'inherit' }); // throws (and exits non-zero) when git fails

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const want = tagFor(versionAt('HEAD'));
    if (args[1] !== want) { console.error(`tag ${args[1]} does not match this commit's version: ${want}`); process.exit(1); }
    console.log(`tag ${want} matches`);
  } else {
    run('fetch', '--quiet', '--tags', 'origin', 'main');
    const ref = 'origin/main', tag = tagFor(versionAt(ref)), sha = git('rev-parse', '--short=7', ref);
    if (git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`)) { console.log(`${tag} already exists: main ${sha} is released`); process.exit(0); }
    console.log(`main ${sha} ${git('log', '-1', '--format=%s', ref)}\n-> ${tag} (production, mulassa.cat)`);
    if (!args.includes('--push')) { console.log('dry run: `npm run release -- --push` creates and pushes it'); process.exit(0); }
    run('tag', '-a', tag, ref, '-m', `release ${tag}`);
    run('push', 'origin', `refs/tags/${tag}`);
    console.log(`pushed ${tag}: the production deploy starts (deploy-pages.yml)`);
  }
}
