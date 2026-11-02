// The badge in the check's place: the catalogue is the server's list, an unknown id draws the check, a guest draws nothing, the
// mark says what it is, and the picker saves only what the server accepted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ASSOCIATION_BADGES, VALLS_BADGES, FLAG_BADGES, TOWN_BADGES, badgeOf } from '../../src/ui/player-badges.js';
import { campanarArt } from '../../src/ui/badge-art.js';
import { checkBadge, appendName, playerOf, VERIFIED } from '../../src/ui/profile-notes.js';
import { setupBadges } from '../../src/ui/badge-picker.js';
import { ALIAS_KEY } from '../../src/services/leaderboard-identity.js';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const all = [...ASSOCIATION_BADGES, ...VALLS_BADGES, ...FLAG_BADGES, ...TOWN_BADGES];
const listed = read('supabase/migrations/202611010001_player_badges.sql').match(/check \(badge_id in \(([^)]*)\)/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
assert.deepEqual(all.map(b => b.id).sort(), listed.sort(), 'the client draws what the server accepts');
for (const b of all) assert(b.art().startsWith('<svg '), `${b.id}: art`);
const a = campanarArt(), b = campanarArt();
assert.notEqual(a, b, 'each drawing has its own ids: a <use> into a closed sheet does not paint');
assert.equal(a.replace(/campanar-\d+/g, 'o'), read('public/campanar-valls.svg').trim().replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg aria-hidden="true" focusable="false" '), 'the settings\' own campanar');

class El {
  constructor(tag = 'div', id = '') { Object.assign(this, { tag, id, className: '', dataset: {}, attrs: {}, kids: [], on: {}, hidden: false, disabled: false, open: false, text: '', html: '' }); }
  get childElementCount() { return this.kids.length; }
  get textContent() { return this.text + this.kids.map(k => k.textContent).join(''); } set textContent(v) { this.text = String(v); this.kids = []; }
  get innerHTML() { return this.html; } set innerHTML(v) { this.html = v; }
  get classList() { return { toggle() {} }; }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  append(...c) { this.kids.push(...c); } appendChild(c) { this.kids.push(c); return c; } prepend() {} replaceChildren(...c) { this.kids = c; this.text = ''; }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); } fire(t, e = {}) { (this.on[t] || []).forEach(f => f(e)); }
  querySelectorAll() { const out = [], walk = e => { for (const k of e.kids) { if (k.attrs.role === 'radio') out.push(k); walk(k); } }; walk(this); return out; }
  showModal() { this.open = true; } close() { if (this.open) { this.open = false; this.fire('close'); } }
}
const els = new Map(), doc = { createElement: t => new El(t), getElementById: id => els.get(id) ?? els.set(id, new El('div', id)).get(id), activeElement: null };

// a group of two shares one row: the rule centring a last row of two in the 3-column groups must not reach it (it pushed UAF aside)
for (const rule of read('src/styles/profile.css').match(/[^}]*:nth-last-child\(2\)[^{]*\{/g)?.filter(r => r.includes('.badge-')) ?? []) assert(rule.includes(':not(.pair)'), rule);
assert(/:not\(\.pair\) > \.badge-cell:nth-last-child\(2\)/.test(read('src/styles/profile.css')), 'the last row of two stays centred');

// the mark
const mark = checkBadge(doc, 'town:valls');
assert.equal(mark.className, 'player-badge'); assert.equal(mark.title, 'Valls', 'its name, on a hover');
assert.equal(mark.attrs['aria-label'], `${VERIFIED}: Valls`, 'it still says the address is confirmed');
for (const id of [null, undefined, 'town:from-the-future']) {
  const c = checkBadge(doc, id);
  assert.equal(c.className, 'verified-check', 'no badge, or one this client does not know: the check');
  assert.equal(c.attrs['aria-label'], VERIFIED);
}
assert.equal(playerOf({ alias: 'A', verified: true, badge_id: 'uaf' }).badgeId, 'uaf', 'as the server names it');
const guest = new El(); appendName(doc, guest, { alias: 'A', verified: false, badgeId: 'uaf' });
assert.equal(guest.kids.length, 1, 'no confirmed address, no mark, whatever a row says');

// the picker
const tick = () => new Promise(r => setTimeout(r, 0));
const store = new Map([[ALIAS_KEY, 'Jo'], [`${ALIAS_KEY}:identity`, JSON.stringify({ prof: { verified: true, publicId: 'me', badgeId: 'uaf' } })]]);
const calls = [], saved = []; let answer = async () => null;
const picker = setupBadges({ focusIn() {}, store, doc, onSaved: id => saved.push(id), service: { setBadge: (id, owner) => { calls.push([id, owner]); return answer(id); } } });
let backs = 0; picker.open(() => backs++);
const menu = doc.getElementById('badge-menu'), choices = doc.getElementById('badge-choices'), save = doc.getElementById('badge-save');
const radios = choices.querySelectorAll(), pick = id => choices.fire('click', { target: { closest: () => radios.find(r => r.dataset.badge === (id ?? '')) } });
const checked = () => radios.filter(r => r.attrs['aria-checked'] === 'true').map(r => r.dataset.badge);
assert.equal(radios.length, all.length + 1, 'the check and every badge');
assert.deepEqual(checked(), ['uaf'], 'it opens on the current one');
pick('town:reus'); assert.deepEqual(checked(), ['town:reus']); assert.deepEqual(calls, [], 'a tap is a draft');
answer = async () => { throw Object.assign(new Error('no'), { code: 'x' }); };
save.fire('click'); await tick();
assert.deepEqual(saved, [], 'refused: nothing saved'); assert.equal(menu.open, true, 'the sheet stays, with the draft'); assert.equal(doc.getElementById('badge-status').text, 'no');
assert.equal(save.disabled, false, 'and can try again');
let release; answer = () => new Promise(r => { release = r; });
save.fire('click'); assert.equal(save.disabled, true); pick('uaf'); assert.deepEqual(checked(), ['town:reus'], 'no change while saving');
menu.close(); assert.equal(backs, 1); release(); await tick();
assert.deepEqual(saved, [], 'a late answer after closing does nothing here');
picker.open(); assert.deepEqual(checked(), ['uaf'], 'closing drops the draft');
answer = async id => id; pick(null); save.fire('click'); await tick();
assert.deepEqual(calls.at(-1), [null, 'me'], 'null puts the check back, for the profile the sheet showed');
assert.deepEqual(saved, [null]); assert.equal(menu.open, false);
console.log('player badges ok');
