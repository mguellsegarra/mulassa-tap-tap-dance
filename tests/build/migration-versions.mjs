// supabase db push keys its history on a migration's version prefix: two files with one version and the second is refused
// or taken as applied, so its tables never reach the database (202611030001 was given to two files once).
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

const files = readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter(f => f.endsWith('.sql'));
const seen = new Map();
for (const f of files) {
  const version = f.split('_')[0];
  assert.match(version, /^\d{12}$/, `${f}: a migration starts with a 12-digit version`);
  assert(!seen.has(version), `${f} and ${seen.get(version)} share the version ${version}`);
  seen.set(version, f);
}
console.log(`migration versions: ${files.length} files, each its own version ok`);
