// «Novetats»: told once, only to who had played before; several unseen tell only the newest; offline-safe in the greeting's queue;
// seen once per profile on any device (the seen-notices registry), this device's own list without a profile.
import assert from 'node:assert/strict';
import { setCatalog } from '../../src/i18n/messages.js';
setCatalog({ 'test.a.title': 'A', 'test.a.text': 'ta', 'test.b.title': 'B', 'test.b.text': 'tb' });
import { setupNews } from '../../src/ui/news-sheet.js';
import { hasPlayed, recordPointsKey } from '../../src/game/records.js';
import { createSeenNotices } from '../../src/services/seen-notices.js';

const kv = init => { const m = new Map(init); return { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v), m }; };
const NEWS = [{ id: 'a', title: 'test.a.title', text: 'test.a.text', games: [{ id: 'pica', name: 'Pica Pica' }] }, { id: 'b', title: 'test.b.title', text: 'test.b.text', games: [{ id: 'memory', name: 'Mulassa Memory' }, { id: 'crush', name: 'Mulassa Crush' }] }];
function make({ played = true, store = kv(), news = NEWS, force = false, service = null } = {}) {
  const on = {}, els = {};
  const el = id => (els[id] ??= { id, style: { setProperty: (k, v) => { el(id).style[k] = v; } }, offsetWidth: 80, getBoundingClientRect: () => ({ left: 200, right: 244, top: 10, width: 44, height: 44, bottom: 54 }), addEventListener: (k, f) => { on[`${id}:${k}`] = f; } });
  const menu = el('news-menu'); menu.open = false;
  let pics = []; el('news-pics').replaceChildren = (...k) => { pics = k; };
  menu.showModal = () => { menu.open = true; }; menu.close = () => { menu.open = false; on['news-menu:close']?.(); };
  let games = 0, backs = 0;
  const sheet = setupNews({ focusIn: () => {}, store, service, notices: createSeenNotices({ service, kv: store }), played: () => played, onGames: () => games++, force, news, doc: { getElementById: el, querySelector: q => ({ textContent: `name of ${q.match(/"(\w+)"/)[1]}` }), createElement: () => { const n = { kids: [], append(...k) { n.kids.push(...k); } }; return n; } } });
  return { sheet, menu, el, on, store, back: () => backs++, get pics() { return pics; }, get games() { return games; }, get backs() { return backs; } };
}

const fresh = make({ played: false });
assert.equal(await fresh.sheet.show(), false, 'who starts today is not told');
assert.equal(fresh.store.get('news-seen'), '["a","b"]', 'and is not told these later either');

const told = make();
assert.equal(await told.sheet.show(told.back), true);
assert.equal(told.el('news-title').textContent, 'B', 'only the newest of the unseen');
assert.deepEqual(told.pics.map(f => [f.kids[0].src, f.kids[1].textContent, f.kids[1].className]),
  [['/jocs/menu/cards/memory.jpg', 'Mulassa Memory', 'news-memory'], ['/jocs/menu/cards/crush.jpg', 'Mulassa Crush', 'news-crush']], 'each picture with its game\'s name, in that game\'s colour');
told.on['news-x:click']();
assert.equal(told.backs, 1); assert.equal(told.games, 0, '× only goes back');
assert.equal(await told.sheet.show(told.back), false, 'told once');

const go = make();
await go.sheet.show(go.back); go.on['news-go:click']();
assert.equal(go.games, 1); assert.equal(go.backs, 0, 'the button opens the games instead of going back');

const later = make({ store: kv([['news-seen', '["a"]']]) });
assert.equal(await later.sheet.show(), true, 'a new game is told to who saw the last one');
const bad = make({ store: kv([['news-seen', 'not json']]) });
assert.equal(await bad.sheet.show(), true, 'a broken mark is no crash');
const dev = make({ store: kv([['news-seen', '["a","b"]']]), force: true });
assert.equal(await dev.sheet.show(), true); assert.equal(dev.store.get('news-seen'), '["a","b"]');

// a profile: the server's list says seen on another device, so this one is not told; told here, it goes up
const server = ids => { const sent = []; return { sent, ownerId: async () => 'u1', seenNotices: async () => ids, markNoticeSeen: async id => { sent.push(id); } }; };
const elsewhere = make({ service: server(['news:a', 'news:b']) });
assert.equal(await elsewhere.sheet.show(), false, 'seen on another device with the same profile');
const there = server([]), first = make({ service: there });
assert.equal(await first.sheet.show(), true);
await Promise.resolve(); await Promise.resolve();
assert.deepEqual(there.sent, ['news:a', 'news:b'], 'shown here: marked on the server for the other devices');
const old = server([]), before = make({ service: old, store: kv([['news-seen', '["a","b"]']]) });
assert.equal(await before.sheet.show(), false);
await Promise.resolve(); await Promise.resolve();
assert.deepEqual(old.sent, ['news:a', 'news:b'], 'seen here before the registry: sent up once');
const offline = make({ service: { ownerId: async () => { throw new Error('offline'); } } });
assert.equal(await offline.sheet.show(), true, 'offline: this device\'s list answers alone');
assert.equal(await offline.sheet.show(), false);
const busy = make({ service: server([]) });
assert.equal(await busy.sheet.show(null, () => false), false, 'the selector moved on during the read: not shown');
assert.equal(busy.store.get('news-seen'), null, 'and still pending');

assert.equal(hasPlayed(kv()), false);
assert.equal(hasPlayed(kv([['stats-v1', '{}']])), true);
assert.equal(hasPlayed(kv([[recordPointsKey(2), '{}']])), true);
assert.equal(hasPlayed(kv([['record-v2-duet-1', '5']])), true, 'an older scoring\'s record counts');
