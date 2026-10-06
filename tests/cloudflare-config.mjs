import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCloudflareConfig } from '../tools/cloudflare-config.mjs';

const root = await mkdtemp(join(tmpdir(), 'mulassa-cloudflare-'));
const valid = { accountId: '0'.repeat(32), project: 'example-game' };
try {
  await assert.rejects(loadCloudflareConfig(root), /Copy .cloudflare.example/);
  for (const invalid of ['{', 'null', JSON.stringify({ ...valid, accountId: '' }),
    JSON.stringify({ ...valid, accountId: [valid.accountId] }),
    JSON.stringify({ ...valid, project: '--other-account' }),
    JSON.stringify({ ...valid, apiToken: 'must-not-be-stored' })]) {
    await writeFile(join(root, '.cloudflare.local.json'), invalid);
    await assert.rejects(loadCloudflareConfig(root));
  }
  await writeFile(join(root, '.cloudflare.local.json'), JSON.stringify(valid));
  assert.deepEqual(await loadCloudflareConfig(root), valid);
  console.log('Cloudflare local configuration contracts ok');
} finally {
  await rm(root, { recursive: true, force: true });
}
