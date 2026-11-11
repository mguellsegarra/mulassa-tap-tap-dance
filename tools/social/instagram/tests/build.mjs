// The archived generator must work outside the artifact machine and escape ranking names.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const scratch = mkdtempSync(join(tmpdir(), 'mulassa-instagram-'));
const tool = fileURLToPath(new URL('..', import.meta.url));
try {
  const campaign = join(scratch, 'custom campaign');
  cpSync(join(tool, 'campaigns/1.3.0'), campaign, {recursive: true});
  writeFileSync(join(campaign, 'ranking.json'), JSON.stringify({alias: '<img src=x onerror=alert(1)>', score: 123456}));
  const output = join(scratch, 'rendered stories');
  execFileSync('python3', [join(tool, 'build.py'), '--campaign', campaign, '--out', output]);
  const html = readFileSync(join(output, 'stories.html'), 'utf8');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('123.456'));
  assert.ok(!html.includes('{{'));
  assert.ok(!html.includes('/Volumes/') && !html.includes('/Users/') && !html.includes('/tmp/'));
  assert.equal((html.match(/data-story="[123]"/g) ?? []).length, 3);
  assert.ok(html.includes('data:font/woff2;base64,'));
  writeFileSync(join(campaign, 'template.html'), '{{MISSING_ASSET}}');
  assert.throws(() => execFileSync('python3', [join(tool, 'build.py'), '--campaign', campaign, '--out', output], {stdio: 'pipe'}));
  console.log('Instagram: portable build, escaped ranking and missing-token failure OK');
} finally {
  rmSync(scratch, {recursive: true, force: true});
}
