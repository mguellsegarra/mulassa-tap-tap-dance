import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const metadataFile = path => /^(\.github\/|docs\/|tests\/|workers\/backup-scheduler\/)/.test(path)
  || ['README.md', 'AGENTS.md', '.gitignore', 'tools/db_backup.py',
    'tools/db-backup-requirements.txt', 'tools/pages-deploy-needed.mjs'].includes(path);

function buildPackage(pkg) {
  const copy = { ...pkg, scripts: { ...pkg.scripts } };
  for (const name of Object.keys(copy.scripts)) {
    if (name === 'check' || name.startsWith('check:')) delete copy.scripts[name];
  }
  const sorted = value => Array.isArray(value) ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
  return JSON.stringify(sorted(copy));
}

export function pagesDeployNeeded(paths, { manual = false, unknownBase = false, beforePackage, afterPackage } = {}) {
  if (manual) return true;
  if (unknownBase) return true;
  if (paths.some(path => path !== 'package.json' && !metadataFile(path))) return true;
  if (!paths.includes('package.json')) return false;
  if (!beforePackage || !afterPackage) return true;
  return buildPackage(beforePackage) !== buildPackage(afterPackage);
}

function main() {
  const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  let deploy = true; // A missing base must not silently suppress a real game update.
  if (process.env.DEPLOY_EVENT_NAME !== 'workflow_dispatch') {
    const base = process.env.DEPLOY_BASE_SHA || '';
    if (/^[a-f0-9]{40}$/.test(base) && !/^0+$/.test(base)) {
      try {
        const paths = git(['diff', '--name-only', '--no-renames', '-z', base, 'HEAD']).split('\0').filter(Boolean);
        const packages = paths.includes('package.json') ? {
          beforePackage: JSON.parse(git(['show', `${base}:package.json`])),
          afterPackage: JSON.parse(git(['show', 'HEAD:package.json'])),
        } : {};
        deploy = pagesDeployNeeded(paths, packages);
      } catch {
        deploy = true;
      }
    }
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
  console.log(deploy ? 'Pages deployment needed' : 'No game or public build changes; Pages deployment skipped');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
