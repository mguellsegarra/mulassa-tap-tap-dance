// Runs the Python tests of tools/data/db_backup.py (stdlib unittest, fake tools, no network).
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const test = fileURLToPath(new URL('./db_backup_test.py', import.meta.url))
// The backup runs on Python 3.11+ (subprocess's process_group); the system python3 may be older.
const r = spawnSync('uv', ['run', '--no-project', '--python', '3.11', 'python', '-I', test], { stdio: 'inherit' })
if (r.error || r.status !== 0) {
  console.error('db-backup tests failed' + (r.error ? ': uv not available' : ''))
  process.exit(1)
}
console.log('db-backup tests ok')
