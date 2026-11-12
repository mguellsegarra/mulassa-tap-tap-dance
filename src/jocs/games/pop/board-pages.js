// The board sheet's rows, by row index as get_pop_board pages them (ties share a position, never an index): the top grows a
// page at a time from row 0 up to CAP, and the player's own row further down comes with NEAR neighbours each side, apart
// until the top reaches them. As mulassa.cat's board (src/ui/board-list.js), without its DOM: ranking-ui.js draws this.
export const PAGE = 50, CAP = 500, NEAR = 5;

// fetchPage(offset, limit) → rows; place: the player's { position } or null
export async function openPages(fetchPage, place) {
  const top = await fetchPage(0, PAGE);
  const total = Number(top[0]?.total ?? 0);
  let near = [], nearFrom = 0;
  // the own row sits at index position - 1 or later: the players tied with it who got there first come before it (rank()
  // shares the position, the earlier best first). One page from NEAR rows above that index finds it after a tie of up to
  // PAGE - NEAR - 1 rows; a longer one leaves near empty and the caller shows the own row apart (ranking-ui.js)
  if (place && !top.some(r => r.is_self)) {
    const from = Math.max(top.length, place.position - 1 - NEAR), rows = await fetchPage(from, PAGE), at = rows.findIndex(r => r.is_self);
    const lo = from === top.length ? 0 : Math.max(0, at - NEAR); // right under the first page: every row down to it, no gap of a few
    if (at >= 0) { nearFrom = from + lo; near = rows.slice(lo, at + NEAR + 1); }
  }
  const s = { top, near, nearFrom, total };
  if (near.length && nearFrom === top.length) join(s); // just under the first page: one list, no gap
  return s;
}

// the rows the top still lacks; 0 when it has them all or the CAP
export function wanted(s) {
  const end = Math.min(s.total, CAP, s.near.length ? s.nearFrom : Infinity);
  return Math.max(0, Math.min(PAGE, end - s.top.length));
}
export const capped = s => s.top.length >= CAP && s.top.length < s.total;

// the next page onto the top; the rows added, and whether the own row's window joined it (its gap gone)
export async function nextPage(fetchPage, s) {
  const n = wanted(s);
  if (!n) return { rows: [], joined: false };
  const rows = await fetchPage(s.top.length, n);
  s.top.push(...rows);
  if (rows.length < n) s.total = s.top.length; // the board shrank since the first page: nothing past here, no asking again
  const joined = !!s.near.length && s.top.length >= s.nearFrom;
  if (joined) join(s);
  return { rows, joined };
}
function join(s) { s.top.push(...s.near.slice(s.top.length - s.nearFrom)); s.near = []; }
