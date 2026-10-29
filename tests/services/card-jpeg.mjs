// The share card's JPEG leaves the main thread when the browser can (share-card.js toJpeg, hud/card-jpeg-worker.js).
import assert from 'node:assert/strict';

const workers = [];
let mode = 'reply';
class FakeWorker {
  constructor(url, opts) { this.url = String(url); this.opts = opts; this.on = { message: new Set(), error: new Set() }; workers.push(this); }
  addEventListener(type, f) { this.on[type].add(f); }
  removeEventListener(type, f) { this.on[type].delete(f); }
  postMessage(msg, transfer) {
    this.sent = { msg, transfer };
    queueMicrotask(() => mode === 'reply' ? [...this.on.message].forEach(f => f({ data: { id: msg.id, blob: new Blob(['jpeg']) } })) : [...this.on.error].forEach(f => f(new Event('error'))));
  }
}
Object.assign(globalThis, { Worker: FakeWorker, OffscreenCanvas: class {}, createImageBitmap: async c => ({ from: c, close() {} }) });
const { toJpeg } = await import('../../src/hud/share-card.js?worker');
let blobs = 0;
const canvas = { toBlob: (cb, type, q) => { blobs++; assert.equal(type, 'image/jpeg'); cb(new Blob(['main'])); } };

const file = await toJpeg(canvas, 0.9, 'drac-valls');
assert.equal(blobs, 0, 'the main thread encodes nothing when a worker can');
assert(workers[0].url.endsWith('/card-jpeg-worker.js') && workers[0].opts.type === 'module');
assert.equal(workers[0].sent.transfer[0], workers[0].sent.msg.bitmap, 'the bitmap is transferred, not copied');
assert(file instanceof File && file.type === 'image/jpeg' && await file.text() === 'jpeg');
assert.equal(workers[0].on.message.size + workers[0].on.error.size, 0, 'no listener is left behind');

mode = 'error';
assert.equal(await (await toJpeg(canvas, 0.9)).text(), 'main', 'a worker that fails falls back to toBlob');
assert.equal(blobs, 1);
mode = 'reply';
assert.equal(await (await toJpeg(canvas, 0.9)).text(), 'jpeg');
assert.equal(workers.length, 2, 'a failed worker is replaced on the next card');

// the worker itself: draws the bitmap, frees it and answers with the encoded blob under the request's id
const posted = []; let closed = false, asked = null;
globalThis.self = { postMessage: m => posted.push(m) };
globalThis.OffscreenCanvas = class { constructor(w, h) { this.size = [w, h]; } getContext() { return { drawImage() {} }; } async convertToBlob(o) { asked = o; return new Blob(['x']); } };
await import('../../src/hud/card-jpeg-worker.js');
await self.onmessage({ data: { id: 7, quality: 0.9, bitmap: { width: 1080, height: 1350, close() { closed = true; } } } });
assert.deepEqual(asked, { type: 'image/jpeg', quality: 0.9 });
assert(closed && posted[0].id === 7 && posted[0].blob instanceof Blob);
console.log('share card JPEG: encoded in a worker, toBlob fallback, worker replaced after a failure ok');
