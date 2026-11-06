// The one localStorage adapter. Blocked storage (private modes, embedded views): every call still works, nothing is remembered.
export const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* not remembered */ } },
  remove: k => { try { localStorage.removeItem(k); } catch { /* nothing to forget */ } },
};
