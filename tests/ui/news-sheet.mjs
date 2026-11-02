// «Novetats»: told once, only to who had played before; several unseen tell only the newest; offline-safe in the greeting's queue.
import assert from 'node:assert/strict';
import { setCatalog } from '../../src/i18n/messages.js';
setCatalog({ 'test.a.title': 'A', 'test.a.text': 'ta', 'test.b.title': 'B', 'test.b.text': 'tb' });
import { setupNews } from '../../src/ui/news-sheet.js';
import { hasPlayed, recordPointsKey } from '../../src/game/records.js';

const kv = init => { const m = new Map(init); return { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v), m }; };
const NEWS = [{ id: 'a', title: 'test.a.title', text: 'test.a.text', games: ['pica'] }, { id: 'b', title: 'test.b.title', text: 'test.b.text', games: ['memory', 'crush'] }];
function make({ played = true, store = kv(), news = NEWS, force = false } = {}) {
  const on = {}, els = {};
  const el = id => (els[id] ??= { id, style: { setProperty: (k, v) => { el(id).style[k] = v; } }, offsetWidth: 80, getBoundingClientRect: () => ({ left: 200, right: 244, top: 10, width: 44, height: 44, bottom: 54 }), addEventListener: (k, f) => { on[`${id}:${k}`] = f; } });
  const menu = el('news-menu'); menu.open = false;
  let pics = []; el('news-pics').replaceChildren = (...k) => { pics = k; };
  menu.showModal = () => { menu.open = true; }; menu.close = () => { menu.open = false; on['news-menu:close']?.(); };
  let games = 0, backs = 0, resize;
  const sheet = setupNews({ focusIn: () => {}, store, played: () => played, onGames: () => games++, force, news, doc: { getElementById: el, querySelector: q => ({ textContent: `name of ${q.match(/"(\w+)"/)[1]}` }), createElement: () => { const n = { kids: [], append(...k) { n.kids.push(...k); } }; return n; } }, win: { innerWidth: 393, addEventListener: (k, f) => { resize = f; } } });
  return { sheet, menu, el, on, store, resize, back: () => backs++, get pics() { return pics; }, get games() { return games; }, get backs() { return backs; } };
}

const fresh = make({ played: false });
assert.equal(fresh.sheet.show(), false, 'who starts today is not told');
assert.equal(fresh.store.get('news-seen'), '["a","b"]', 'and is not told these later either');

const told = make();
assert.equal(told.sheet.show(told.back), true);
assert.equal(told.el('news-title').textContent, 'B', 'only the newest of the unseen');
assert.deepEqual(told.pics.map(f => [f.kids[0].src, f.kids[1].textContent]), [['/jocs/menu/cards/memory.jpg', 'name of memory'], ['/jocs/menu/cards/crush.jpg', 'name of crush']], 'each picture with its game\'s name');
told.resize();
assert.equal(told.el('news-tip').style.top, '74px', 'the ribbon hangs under the button, clear of it');
assert.equal(told.el('news-tip').style['--tail'], '40px', 'its tail points at the button\'s centre');
told.on['news-x:click']();
assert.equal(told.backs, 1); assert.equal(told.games, 0, '× only goes back');
assert.equal(told.sheet.show(told.back), false, 'told once');

const go = make();
go.sheet.show(go.back); go.on['news-go:click']();
assert.equal(go.games, 1); assert.equal(go.backs, 0, 'the button opens the games instead of going back');

const through = make();
through.sheet.show(through.back);
through.on['news-menu:pointerdown']({ target: through.menu, clientX: 220, clientY: 30 });
through.on['news-menu:cancel'](); through.menu.close();
assert.equal(through.games, 1, 'a tap on the button seen through the backdrop opens the games');
const margin = make();
margin.sheet.show(margin.back);
margin.on['news-menu:pointerdown']({ target: margin.menu, clientX: 20, clientY: 400 });
margin.on['news-menu:cancel'](); margin.menu.close();
assert.equal(margin.games, 0); assert.equal(margin.backs, 1, 'any other tap outside only closes');
const ribbon = make();
ribbon.sheet.show(ribbon.back); ribbon.on['news-tip:click']();
assert.equal(ribbon.games, 1, 'the ribbon goes there too');

const later = make({ store: kv([['news-seen', '["a"]']]) });
assert.equal(later.sheet.show(), true, 'a new game is told to who saw the last one');
const bad = make({ store: kv([['news-seen', 'not json']]) });
assert.equal(bad.sheet.show(), true, 'a broken mark is no crash');
const dev = make({ store: kv([['news-seen', '["a","b"]']]), force: true });
assert.equal(dev.sheet.show(), true); assert.equal(dev.store.get('news-seen'), '["a","b"]');

assert.equal(hasPlayed(kv()), false);
assert.equal(hasPlayed(kv([['stats-v1', '{}']])), true);
assert.equal(hasPlayed(kv([[recordPointsKey(2), '{}']])), true);
assert.equal(hasPlayed(kv([['record-v2-duet-1', '5']])), true, 'an older scoring\'s record counts');
