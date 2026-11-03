// Hints you ask for. Free until you own FREE_UNTIL elements; then a store of MAX that refills one every EVERY.
// Pure: the caller passes the time and saves the state. state: { credits, nextAt, lastSeen, introDone, pair }.
export const MAX = 3, EVERY = 80 * 60e3, FREE_UNTIL = 12;

const fresh = now => ({ credits: MAX, nextAt: null, lastSeen: now, introDone: false, pair: null });

// Whatever localStorage held, as a valid state. Broken or missing: a full store.
export function restoreHints(raw, now, foundCount) {
  let s = fresh(now);
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : null;
    if (v && Number.isInteger(v.credits) && v.credits >= 0 && v.credits <= MAX) {
      s = {
        credits: v.credits,
        nextAt: v.credits < MAX && Number.isFinite(v.nextAt) ? v.nextAt : null,
        lastSeen: Number.isFinite(v.lastSeen) ? v.lastSeen : now,
        introDone: v.introDone === true,
        pair: Array.isArray(v.pair) && v.pair.length === 2 && v.pair.every(id => typeof id === 'string') ? v.pair : null,
      };
      if (s.credits < MAX && s.nextAt === null) s.nextAt = now + EVERY;
    }
  } catch { /* a full store */ }
  return refreshHints(seen(s, foundCount), now);
}

// The free start ends for good once you own enough, even if you start again.
export const seen = (s, foundCount) => (s.introDone || foundCount < FREE_UNTIL ? s : { ...s, introDone: true });

// Refills, never above MAX. A clock set back gives nothing and keeps the wait that was left.
export function refreshHints(s, now) {
  let { credits, nextAt } = s;
  if (nextAt !== null && now < s.lastSeen) nextAt += now - s.lastSeen;
  if (nextAt !== null && now >= nextAt) {
    credits = Math.min(MAX, credits + 1 + Math.floor((now - nextAt) / EVERY));
    nextAt = credits < MAX ? nextAt + (1 + Math.floor((now - nextAt) / EVERY)) * EVERY : null;
  }
  return { ...s, credits, nextAt, lastSeen: now };
}

// pair: two elements that make something new, or null. status: free, spent, repeat (the hint you already have), empty, none.
export function requestHint(s, pair, now, foundCount) {
  s = seen(refreshHints(s, now), foundCount);
  if (s.pair) return { state: s, pair: s.pair, status: 'repeat' };
  if (!pair) return { state: s, pair: null, status: 'none' };
  if (!s.introDone) return { state: { ...s, pair }, pair, status: 'free' };
  if (!s.credits) return { state: s, pair: null, status: 'empty' };
  return { state: { ...s, pair, credits: s.credits - 1, nextAt: s.nextAt ?? now + EVERY }, pair, status: 'spent' };
}

export const hintView = (s, now) => ({ free: !s.introDone, credits: s.credits, remainingMs: s.nextAt === null ? 0 : Math.max(0, s.nextAt - now) });
