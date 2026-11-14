#!/usr/bin/env node
// Dev tool: one run on AWS Device Farm's real phones (the owner's account; every run needs their go-ahead). Packages
// farm-test.mjs with the plan's flows, uploads it with farm-spec.yml, runs it on the plan's devices, waits, downloads each
// device's result and video and prints the hitches per flow. The QA build must already be served through a tunnel (the
// flows' urls). Refuses a plan whose metered minutes would pass its `budgetMinutes`; prints the trial minutes left
// before and after. Docs: docs/agents/device-profiling.md («A rented phone»).
// usage: AWS_PROFILE=<profile> node tools/qa/device/farm-run.mjs <plan.json> [outDir=/tmp/mulassa-farm/<time>]
// plan: { project: "mulassa-perf", budgetMinutes: 6, devices: [{ name: "Apple iPhone 8", os: "16.7.11" }],
//         flows: [{ label, url, figure?, diff?, maxSeconds }] }   (farm-test.mjs says what a flow does)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url)), [planFile, outArg] = process.argv.slice(2);
if (!planFile) { console.error('usage: farm-run.mjs <plan.json> [outDir]'); process.exit(2); }
const plan = JSON.parse(readFileSync(planFile, 'utf8')), out = outArg ?? join('/tmp/mulassa-farm', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
const aws = (...args) => JSON.parse(execFileSync('aws', ['devicefarm', ...args, '--region', 'us-west-2', '--output', 'json'], { encoding: 'utf8', maxBuffer: 64e6 }) || 'null');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const left = () => aws('get-account-settings').accountSettings.trialMinutes?.remaining ?? 0;

// metered: only the test's own minutes (2026-11-14: a 44 s flow was 1.7 of the job's 9), ~55 s a flow besides its song
const flowPhases = f => (f.phases ?? []).reduce((s, p) => s + p.seconds, 0);
const estimate = plan.devices.length * plan.flows.reduce((s, f) => s + f.maxSeconds + flowPhases(f) + 55, 0) / 60, before = left();
console.log(`plan: ${plan.devices.length} device(s) x ${plan.flows.length} flow(s), ~${estimate.toFixed(1)} metered minutes (budget ${plan.budgetMinutes}); trial minutes left: ${before}`);
if (!(estimate <= plan.budgetMinutes)) { console.error('over the plan\'s budgetMinutes: nothing was run'); process.exit(1); }

const project = aws('list-projects').projects.find(p => p.name === plan.project)?.arn;
if (!project) { console.error(`no Device Farm project «${plan.project}» (creating one is the owner's call)`); process.exit(1); }
const all = aws('list-devices').devices;
const devices = plan.devices.map(d => all.find(x => x.name === d.name && x.os === d.os) ?? (() => { console.error(`no device ${d.name} ${d.os}`); process.exit(1); })());

// the package: an npm tarball in a zip, as the service's Node test type wants it
const pkg = mkdtempSync(join(tmpdir(), 'mulassa-farm-'));
copyFileSync(join(here, 'farm-test.mjs'), join(pkg, 'farm-test.mjs'));
writeFileSync(join(pkg, 'farm-plan.json'), JSON.stringify({ flows: plan.flows }));
writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'mulassa-farm', version: '1.0.0', private: true, scripts: { test: 'node farm-test.mjs' }, files: ['farm-test.mjs', 'farm-plan.json'] }));
execFileSync('npm', ['pack', '--silent'], { cwd: pkg });
execFileSync('zip', ['-q', 'pkg.zip', readdirSync(pkg).find(f => f.endsWith('.tgz'))], { cwd: pkg });
async function upload(file, name, type) {
  const { upload: u } = aws('create-upload', '--project-arn', project, '--name', name, '--type', type);
  execFileSync('curl', ['-sf', '-T', file, u.url]);
  for (let i = 0; i < 40; i++) { const s = aws('get-upload', '--arn', u.arn).upload; if (s.status === 'SUCCEEDED') return u.arn; if (s.status === 'FAILED') throw new Error(`${name}: ${s.message}`); await sleep(3000); }
  throw new Error(`${name}: the upload never finished`);
}
const testPackage = await upload(join(pkg, 'pkg.zip'), 'pkg.zip', 'APPIUM_WEB_NODE_TEST_PACKAGE'), spec = await upload(join(here, 'farm-spec.yml'), 'farm-spec.yml', 'APPIUM_WEB_NODE_TEST_SPEC');
const pool = aws('create-device-pool', '--project-arn', project, '--name', `run-${Date.now()}`, '--rules', JSON.stringify([{ attribute: 'ARN', operator: 'IN', value: JSON.stringify(devices.map(d => d.arn)) }])).devicePool.arn;
const timeout = Math.ceil(plan.flows.reduce((s, f) => s + f.maxSeconds + flowPhases(f) + 60, 0) / 60) + 4; // (it stops a hung job; farm-test.mjs stops itself first)
const run = aws('schedule-run', '--project-arn', project, '--device-pool-arn', pool, '--name', plan.name ?? planFile.split('/').pop(), '--test', `type=APPIUM_WEB_NODE,testPackageArn=${testPackage},testSpecArn=${spec}`,
  '--execution-configuration', `jobTimeoutMinutes=${timeout},videoCapture=true`).run.arn;
console.log(`run ${run} (job timeout ${timeout} min); waiting`);
let done;
for (;;) { done = aws('get-run', '--arn', run).run; if (done.status === 'COMPLETED') break; await sleep(15000); }
console.log(`${done.result}: ${done.deviceMinutes?.metered ?? '?'} metered minutes of ${done.deviceMinutes?.total ?? '?'}; trial minutes left: ${left()}`);

mkdirSync(out, { recursive: true });
for (const job of aws('list-jobs', '--arn', run).jobs) {
  const dir = join(out, `${job.device.name} ${job.device.os}`.replace(/[^\w.]+/g, '-')); mkdirSync(dir, { recursive: true });
  for (const a of aws('list-artifacts', '--arn', job.arn, '--type', 'FILE').artifacts) if (/Customer Artifacts$|^Video$|Test spec output/.test(a.name)) execFileSync('curl', ['-sf', '-o', join(dir, `${a.name.replace(/\W+/g, '-')}.${a.extension}`), a.url]);
  if (existsSync(join(dir, 'Customer-Artifacts.zip'))) try { execFileSync('unzip', ['-oqj', join(dir, 'Customer-Artifacts.zip'), '*mulassa-perf.json', '-d', dir], { stdio: 'ignore' }); } catch { /* the test wrote none: said below */ }
  console.log(`\n${job.device.name} (${job.device.os}): ${job.result}, in ${dir}`);
  if (!existsSync(join(dir, 'mulassa-perf.json'))) { console.log('  no mulassa-perf.json: read the test spec output'); continue; }
  for (const f of JSON.parse(readFileSync(join(dir, 'mulassa-perf.json'), 'utf8')).flows) {
    const sec = Object.values(f.sec ?? {}), n = sec.reduce((s, b) => s + b[0], 0), q = [...new Set(f.samples.map(s => s.perf?.quality).filter(Boolean))].join('>');
    console.log(`  ${f.label}: ${sec.length} s played, ${sec.length ? (n / sec.length).toFixed(1) : 0} fps, ${sec.reduce((s, b) => s + b[1], 0)} frames over 25 ms, quality ${q || '?'}; ${f.notes.join('; ')}`);
    for (const p of f.samples.filter(x => x.phase)) console.log(`    phase ${p.phase}: ${p.fps} fps, quality ${p.quality}${p.idle ? ', idle reel' : ''}`);
    console.log(`    in the song (s: ms): ${(f.long ?? []).map(([t, d]) => `${t}: ${d}`).join(', ') || 'no frame over 50 ms'}`);
    if (f.anims) console.log(`    still animating: ${Object.entries(f.anims).map(([k, n]) => `${k}${n > 1 ? ` x${n}` : ''}`).join(', ') || 'nothing'}`);
    console.log(`    out of it (ms since the card, ms): ${(f.menu ?? []).map(([t, d]) => `${t - (f.mark ?? 0)}: ${d}`).join(', ') || 'none'}${f.errors?.length ? `; errors: ${f.errors.join(' | ')}` : ''}`);
  }
}
