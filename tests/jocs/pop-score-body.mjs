// pop-score reads the body with a cumulative byte cap (supabase/functions/pop-score/index.ts readCapped): a chunked body has no
// Content-Length, and req.text() would buffer all of it, and a count in UTF-16 units lets multi-byte text through at three times
// the cap. The function is taken from the Edge Function's own source (types stripped), as Deno is not here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { MAX_BYTES } from '../../supabase/functions/pop-score/verify.js';

const src = stripTypeScriptTypes(readFileSync(new URL('../../supabase/functions/pop-score/index.ts', import.meta.url), 'utf8'));
const code = src.match(/async function readCapped[\s\S]*?\n}\n/)?.[0];
assert.ok(code, 'readCapped is in index.ts');
const readCapped = new Function('MAX_BYTES', `${code}\nreturn readCapped;`)(MAX_BYTES);

// a request whose body arrives in chunks of `chunk` bytes, `total` in all; pulled counts the chunks the server asked for
function chunked(total, chunk, byte = 0x61) {
  const seen = { pulled: 0, cancelled: false };
  let sent = 0;
  const body = new ReadableStream({
    pull(c) { seen.pulled++; const n = Math.min(chunk, total - sent); if (n <= 0) return c.close(); sent += n; c.enqueue(new Uint8Array(n).fill(byte)); },
    cancel() { seen.cancelled = true; },
  });
  return { seen, req: new Request('http://x.test/', { method: 'POST', body, duplex: 'half' }) };
}

assert.equal(await readCapped(new Request('http://x.test/', { method: 'POST', body: '{"a":1}' })), '{"a":1}', 'a small body is read whole');
assert.equal(await readCapped(new Request('http://x.test/', { method: 'POST' })), '', 'no body: empty text');
assert.equal((await readCapped(chunked(MAX_BYTES, 1000).req)).length, MAX_BYTES, 'exactly the cap is accepted');
{ // endless, no Content-Length: refused at the cap, and the stream is cancelled, not read to its end
  const { req, seen } = chunked(1e9, 4096);
  assert.equal(await readCapped(req), null);
  assert.equal(seen.cancelled, true, 'the stream is cancelled');
  assert.ok(seen.pulled <= MAX_BYTES / 4096 + 3, `it read about the cap and no more (${seen.pulled} chunks)`);
}
{ // multi-byte: 3 bytes a character, under the cap in characters and over it in bytes
  const euros = '€'.repeat(Math.floor(MAX_BYTES / 3) + 10);
  assert.ok(euros.length < MAX_BYTES);
  assert.equal(await readCapped(new Request('http://x.test/', { method: 'POST', body: euros })), null, 'the cap is in bytes');
  const fits = '€'.repeat(Math.floor(MAX_BYTES / 3));
  assert.equal(await readCapped(new Request('http://x.test/', { method: 'POST', body: fits })), fits, 'and a body of multi-byte text under it is decoded whole');
}
console.log('pop-score-body: ok');
