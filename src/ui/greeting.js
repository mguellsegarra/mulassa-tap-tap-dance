// What the selector tells a profile once, when nothing else is up (docs/rankings/strategy.md §4, decision 17): an ended season's
// news, else the statistics' notice for a profile made before them, else the badges' news (badge-news.js), else the new games' news (news-sheet.js), else a device tip (device-hint.js: no network needed, so
// offline it is still told), else (?mock&card=Nom) a player's card. One of those sheets per visit (page load):
// what else is pending waits for the next visit, in the same order, a new owner's after an account change too
// (its statistics stay on the device until it has seen the notice, stats-sync.js). The seen-marks
// are per profile (seasonSeenKey, the stats notice), so what is pending belongs to whoever owns the session NOW. Nothing is
// settled for the session: every selector shown idle asks again, and so do a sheet closing and an account change, until the
// owner has nothing left to hear or this visit's sheet is told. An older ended season waits its turn behind the newest (seasons-ui.js marks only what it shows).
//   free()      a bare, visible selector (no sheet, not playing, not in photo mode)
//   identity()  the share image's cached name, refreshed once the account is known (never rejects)
//   extra()     a dev-only last item; true when it showed something
//   asked()     a whole pass ended: whatever this visit tells is up by now (the first-time hints wait for it)
export function setupGreeting({ stats, seasonEnd, account, hint = { show: () => false }, badgeNews = { show: async () => false }, newGame = { show: async () => false }, free, back = () => {}, identity = async () => {}, extra = () => false, asked = () => {} }) {
  let answered = false, init = null, settled = false, running = false, rerun = false, owner = 0, told = false; // owner: counts the account changes seen
  async function pass() {
    if (settled || !free()) return;
    if (told) { if (!extra()) settled = true; return; } // this visit's greeting is told
    const mine = owner;
    init ??= Promise.all([stats.init(), identity()]); // the owner is read here, at the first selector, not at page load
    await init;
    if (!free() || mine !== owner) return;
    let news;
    try { news = await seasonEnd.news(); } catch { if (free()) told = (await newGame.show(back, () => free() && mine === owner)) || hint.show(back); answered = true; return; } // offline: the next visit asks again
    if (!free() || mine !== owner) return;
    if (news) { answered = true; seasonEnd.show(news, back); told = true; return; }
    if ((told = account.notice(back))) { answered = true; return; }
    told = await badgeNews.show(back, () => free() && mine === owner);
    answered = true; // not before: the heart's ribbon (asked) must not be spent behind a sheet about to open
    if (told || !free() || mine !== owner) return;
    if ((told = (await newGame.show(back, () => free() && mine === owner)) || hint.show(back)) || extra()) return;
    settled = true;
  }
  async function greet() {
    if (running) { rerun = true; return; }
    running = true;
    try { do { rerun = false; await pass(); } while (rerun); } catch { /* quiet: the next visit asks again */ } finally { running = false; if (answered) asked(); }
  }
  return {
    greet,
    get answered() { return answered; },
    // a sheet closed: after its own close handlers (the notice marks itself seen there)
    poke() { if (!settled) setTimeout(greet, 0); },
    // another profile may own the session now: its notices are pending until shown (this visit, if nothing was told yet)
    accountChanged() { owner++; init = null; settled = false; greet(); }, // told stays: one sheet per visit, whoever owns it
  };
}
