// Fetching a recording: its progress, and the failure's phase and status for crash reports (never a URL or a message).
import { errorName } from '../services/errors.js';

const PHASES = ['fetch', 'http', 'read', 'decode'];
export class AudioFailure extends Error {
  constructor(phase, e, status) {
    super(`Recording unavailable: ${status ?? phase}`);
    this.phase = phase; this.status = status; this.errName = errorName(e);
  }
}
export function audioFailureTags(e) {
  if (!(e instanceof AudioFailure)) return { name: errorName(e), phase: 'unknown' };
  const tags = { name: errorName({ name: e.errName }), phase: PHASES.includes(e.phase) ? e.phase : 'unknown' };
  if (Number.isInteger(e.status) && e.status >= 100 && e.status <= 599) tags.status = e.status;
  return tags;
}
// A response's bytes, reporting how much has arrived (0..1) when the size is known: a game waiting on a slow line
// shows it (main.js, «Preparant la música… 40%»).
export async function readAll(response, progress) {
  const total = +response.headers?.get?.('content-length') || 0, reader = total ? response.body?.getReader?.() : null;
  if (!reader) return response.arrayBuffer();
  const parts = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); n += value.length;
    progress(Math.min(1, n / total));
  }
  const out = new Uint8Array(n);
  n = 0;
  for (const p of parts) { out.set(p, n); n += p.length; }
  return out.buffer;
}
