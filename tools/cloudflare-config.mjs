import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function loadCloudflareConfig(root) {
  let config;
  try {
    config = JSON.parse(await readFile(join(root, '.cloudflare.local.json'), 'utf8'));
  } catch {
    throw new Error('Copy .cloudflare.example.json to .cloudflare.local.json and configure your deployment account.');
  }
  // Fail before invoking Wrangler; never fall back to an unrelated shell account.
  if (!config || Array.isArray(config) || typeof config !== 'object' ||
      Object.keys(config).some(key => !['accountId', 'project'].includes(key)) ||
      typeof config.accountId !== 'string' || !/^[a-f0-9]{32}$/.test(config.accountId) ||
      typeof config.project !== 'string' || !/^[a-z0-9][a-z0-9-]{0,57}[a-z0-9]$/.test(config.project)) {
    throw new Error('Invalid local Cloudflare configuration: expected accountId and Pages project only, no credentials.');
  }
  return { accountId: config.accountId, project: config.project };
}
