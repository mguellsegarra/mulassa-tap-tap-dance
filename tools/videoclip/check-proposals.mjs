#!/usr/bin/env node
// Checks every montage proposal (tools/videoclip/proposals/*.json) against the video's timeline: node tools/videoclip/check-proposals.mjs
// Exit 1 on an error (the tool would not play it); warnings are printed for the author.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProposal } from './proposal.js';

const HERE = dirname(fileURLToPath(import.meta.url)), DIR = join(HERE, 'proposals');
const clip = JSON.parse(readFileSync(join(HERE, 'clip.json'), 'utf8'));
let bad = 0; const ids = new Set();
for (const f of readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
  let p; try { p = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch (e) { console.log(`✗ ${f}: ${e.message}`); bad++; continue; }
  const { errors, warnings, length } = checkProposal(p, clip);
  if (ids.has(p.id)) errors.push(`id ${p.id} used twice`); ids.add(p.id);
  bad += errors.length > 0;
  console.log(`${errors.length ? '✗' : '✓'} ${f} · ${p.group} · ${length?.toFixed(1) ?? '?'} s${[...errors.map(e => `\n    error: ${e}`), ...warnings.map(w => `\n    warning: ${w}`)].join('')}`);
}
process.exit(bad ? 1 : 0);
