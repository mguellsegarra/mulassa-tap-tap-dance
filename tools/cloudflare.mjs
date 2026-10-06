import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { loadCloudflareConfig } from './cloudflare-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { accountId: account, project } = await loadCloudflareConfig(root);
const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: account, WRANGLER_SEND_METRICS: 'false',
  XDG_CONFIG_HOME: join(homedir(), '.config', 'mulassa-cloudflare') };
// Use the project's isolated OAuth profile, never another client's token from the shell.
for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL',
  'CF_API_TOKEN', 'CF_API_KEY', 'CF_EMAIL']) delete env[key];

function run(command, args, capture = false) {
  const result = spawnSync(command, args, { cwd: root, env,
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}
const wrangler = (...args) => run('npx', ['--yes', 'wrangler@4.142.0', ...args]);
const action = process.argv[2];
console.log(`Cloudflare target: configured local account, Pages ${project}`);
switch (action) {
  case 'login':
    wrangler('login', '--scopes', 'pages:write', 'account:read', 'user:read');
    break;
  case 'whoami':
    wrangler('whoami');
    break;
  case 'projects':
    wrangler('pages', 'project', 'list', '--json');
    break;
  case 'deployments':
    wrangler('pages', 'deployment', 'list', '--project-name', project, '--json');
    break;
  case 'deploy': {
    // Wrangler auto-compiles root functions; never let that turn a static deploy into compute.
    for (const name of ['functions', '_worker.js', 'wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) {
      let exists = false;
      try { await access(resolve(root, name)); exists = true; } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (exists) throw new Error(`Review unexpected server/config path before deployment: ${name}`);
    }
    const projects = JSON.parse(run('npx', ['--yes', 'wrangler@4.142.0', 'pages', 'project', 'list', '--json'], true));
    if (!projects.some(entry => entry['Project Name'] === project)) {
      throw new Error('Expected Pages project missing in configured account');
    }
    run('npm', ['run', 'build:pages']);
    wrangler('pages', 'deploy', 'dist', '--project-name', project, '--branch', 'main', '--commit-dirty=true');
    break;
  }
  default:
    throw new Error('Choose login, whoami, projects, deployments or deploy');
}
