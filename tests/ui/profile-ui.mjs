// The Perfil's profile block and its steps sheet (src/ui/profile-ui.js) in a small fake DOM with a mocked service: the states
// and the buttons that fit each (no profile, a stale name, a guest, a released guest, a confirmed profile), creating one (a
// nickname; the statistics' notice is on that step), confirming an e-mail (mail → code), choosing another name when the
// old one was released, recovering (the name comes back), sign out and delete (confirmed, once, failures reported), forgetting
// a stale name, a row gone, publishing off, offline, switching profiles. Names never carry a «#» (docs/rankings/strategy.md §6).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupProfile } from '../../src/ui/profile-ui.js';
import { VERIFIED, GUEST, GUEST_TEXT } from '../../src/ui/profile-notes.js';

class El {
  constructor(id) { Object.assign(this, { id, hidden: false, disabled: false, value: '', readOnly: false, dataset: {}, on: {}, open: false, text: '', attrs: {}, className: '' }); }
  get textContent() { return this.text + (this.kids || []).map(k => (typeof k === 'string' ? k : k.textContent)).join(''); }
  set textContent(v) { this.text = String(v); this.first = null; this.kids = []; }
  get classList() { const c = (this.cls ||= new Set()); return { toggle: (k, on = !c.has(k)) => { if (on) c.add(k); else c.delete(k); }, replace: (a, b) => { if (c.delete(a)) c.add(b); }, contains: k => c.has(k) }; }
  append(...c) { (this.kids ||= []).push(...c); } appendChild(c) { this.append(c); return c; } replaceChildren(...c) { this.text = ''; this.kids = [...c]; }
  setAttribute(k, v) { this.attrs[k] = v; } addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t, ev = {}) { const e = { preventDefault() { this.prevented = true; }, ...ev }; for (const f of this.on[t] || []) f(e); return e; }
  click() { return this.fire('click'); } focus() {} prepend(c) { this.first = c; }
  showModal() { this.open = true; } close() { if (!this.open) return; this.open = false; this.fire('close'); }
}
const ids = ['profile-menu', 'profile-form', 'profile-email', 'profile-code', 'profile-status', 'profile-send', 'profile-cancel', 'profile-keep', 'profile-lead', 'profile-title',
  'profile-alias', 'profile-alias-label', 'profile-alias-field', 'profile-mail-field', 'profile-code-field', 'profile-note', 'profile-stats-note',
  'profile-row', 'profile-name', 'profile-kind', 'profile-sub', 'profile-main', 'profile-alt', 'profile-more'];
const tick = () => new Promise(r => setTimeout(r, 0));

function make({ configured = true, publishingEnabled = true, session = false, email = '', alias = '', persistent = true, captchaRequired = false,
  prof, known = null } = {}) { // prof: my_profile's answer (undefined: an older server, no my_profile); known: the stored last answer
  const els = new Map(ids.map(id => [id, new El(id)]));
  const doc = { getElementById: id => els.get(id), createElement: tag => Object.assign(new El(''), { tag }) }, $ = id => els.get(id);
  const mem = new Map(alias ? [['alias', alias]] : []);
  if (known) mem.set('alias:identity', JSON.stringify(known));
  const store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, String(v)), remove: k => mem.delete(k) };
  const calls = [], reports = [], T = { session, email, alias: null, fail: null, prof, profiles: 0, sendType: null, accepted: 0 };
  const service = {
    configured, publishingEnabled, captchaRequired,
    createProfile: async (a, o) => { calls.push(['create', a, o]); if (T.fail) throw T.fail; T.session = true; if (T.prof) T.prof = { ...T.prof, alias: a.trim(), released: false }; return a.trim(); },
    identity: async () => ({ hasSession: T.session, email: T.email, persistent }),
    sendCode: async (m, o) => { calls.push(['send', m, o]); return { type: T.sendType ?? (T.session ? 'email_change' : 'email') }; },
    profile: async () => { T.profiles++; if (T.prof === undefined) throw new Error('rpc:PGRST202:404'); return T.prof; },
    verifyCode: async (m, c, t) => { calls.push(['verify', m, c, t]); if (T.fail) throw T.fail; return { email: m }; },
    myAlias: async () => T.alias ?? null,
    signOut: async () => { calls.push(['signout']); T.session = false; },
    deleteProfile: async () => { calls.push(['delete']); if (T.fail) throw T.fail; return { deleted: true }; },
  };
  const captcha = { token: async () => 'tok', cancel() {} };
  const focused = [];
  const profile = setupProfile({ focusIn: (m, id) => focused.push(id), captcha, store, aliasKey: 'alias', deviceNote: p => (p ? '' : 'NOTE'), service, doc,
    report: (k, d) => reports.push([k, d]), acceptStats: () => { T.accepted++; } });
  const find = (el, test) => (test(el) ? el : (el.kids || []).filter(k => typeof k !== 'string').map(k => find(k, test)).find(Boolean) ?? null);
  return { profile, $, mem, calls, reports, T, focused, find,
    badge: () => find($('profile-name'), k => k.className === 'verified-check'),
    buttons: () => [$('profile-main'), $('profile-alt'), $('profile-more')].filter(b => !b.hidden).map(b => `${b.dataset.act}:${b.textContent}`) };
}
const enter = ($, id, v) => { $(id).value = v; $(id).fire('input'); };
const guestProf = o => ({ alias: 'takeshi', verified: false, published: true, released: false, publicId: 'p-1', ...o });

{ // the states
  const none = make(); await none.profile.refresh();
  assert(!none.$('profile-row').hidden && none.$('profile-name').textContent === '' && none.buttons().join() === 'create:Crea,recover:Recupera', 'no profile: create one or recover yours');
  assert(none.$('profile-kind').hidden, 'no «Convidat» without a profile');
  const stale = make({ alias: 'takeshi' }); await stale.profile.refresh();
  assert.equal(stale.$('profile-name').textContent, 'takeshi', 'a name and no session: the name alone');
  assert.equal(stale.buttons().join(), 'recover:Recupera,forget:Oblida el nom', 'a name, no profile: recover or forget it');
  stale.profile.forget(); await tick();
  assert(!stale.mem.has('alias') && stale.$('profile-name').textContent === '', 'forgetting is local only');
  const guest = make({ alias: 'takeshi', session: true, prof: guestProf() }); await guest.profile.refresh();
  assert.equal(guest.$('profile-name').textContent, 'takeshi', 'a guest: its plain name, never a «#»');
  assert(!guest.find(guest.$('profile-name'), k => k.className?.includes?.('released')), 'an active guest is not faded');
  assert(guest.find(guest.$('profile-name'), k => k.className?.includes?.('guest')), 'an active guest: the quieter name');
  assert(!guest.$('profile-kind').hidden && guest.$('profile-kind').textContent === GUEST, '«Convidat» said in words here');
  assert.equal(guest.buttons().join(), 'link:Confirma el correu,delete:Esborra el perfil');
  assert.equal(guest.$('profile-sub').textContent, GUEST_TEXT, 'what a guest risks, and the way out');
  assert(!guest.badge(), 'not confirmed: no check');
  const priv = make({ alias: 'takeshi', session: true, persistent: false, prof: guestProf() }); await priv.profile.refresh();
  assert.equal(priv.$('profile-sub').textContent, `${GUEST_TEXT} NOTE`, 'and the browser note when it may lose the profile');
  // a released guest (its name is somebody else's now): the name faded, the one sentence, the way to choose another
  const rel = make({ alias: 'takeshi', session: true, prof: guestProf({ released: true }) }); await rel.profile.refresh();
  assert.equal(rel.$('profile-row').dataset.state, 'released');
  assert(rel.find(rel.$('profile-name'), k => k.className?.includes?.('released')) && rel.$('profile-kind').hidden, 'faded, no «Convidat» chip');
  assert.equal(rel.$('profile-sub').textContent, 'Has estat un temps sense jugar i el teu nom ara és d’una altra persona. Tria’n un altre.');
  assert.equal(rel.buttons().join(), 'rename:Tria un altre nom,delete:Esborra el perfil');
  const linked = make({ alias: 'takeshi', session: true, email: 'jugador@example.com', prof: guestProf({ verified: true }) }); await linked.profile.refresh();
  assert.equal(linked.buttons().join(), 'signout:Tanca la sessió,delete:Esborra el perfil', 'signing out only with an e-mail on it');
  assert.equal(linked.$('profile-sub').textContent, `${VERIFIED}: j***@example.com.`, 'the address masked, never in full');
  assert(linked.badge()?.attrs['aria-label'] === VERIFIED && linked.$('profile-name').textContent === 'takeshi', 'the check, nothing else');
  const off = make({ alias: 'takeshi', session: true, publishingEnabled: false, prof: guestProf() }); await off.profile.refresh();
  assert.equal(off.buttons().join(), 'delete:Esborra el perfil', 'publishing off: nothing to link, deleting stays');
  const gone = make({ configured: false }); await gone.profile.refresh(); assert(gone.$('profile-row').hidden, 'offline game: no block');
  // confirmed is the server's word: a session address the server does not confirm is not enough
  const odd = make({ alias: 'takeshi', session: true, email: 'jugador@example.com', prof: guestProf() }); await odd.profile.refresh();
  assert(!odd.badge() && odd.$('profile-row').dataset.state === 'guest', 'the server says not confirmed: no check');
  // an older server (no my_profile): the session's confirmed address stands in
  const old = make({ alias: 'takeshi', session: true, email: 'jugador@example.com' }); await old.profile.refresh();
  assert(old.badge() && old.$('profile-row').dataset.state === 'linked');
}
{ // the row is gone (deleted elsewhere): this browser leaves the useless session; the name stays until forgotten
  const s = make({ alias: 'takeshi', session: true, prof: null });
  s.mem.set('record-v2-duet-1', '{"quality":90}');
  await s.profile.refresh(); await tick();
  assert.deepEqual(s.calls, [['signout']], 'the old session goes');
  assert(s.$('profile-row').dataset.state === 'stale' && s.buttons().join() === 'recover:Recupera,forget:Oblida el nom');
  assert(s.mem.get('record-v2-duet-1') && s.mem.get('alias') === 'takeshi', 'device records stay');
  const mail = make({ alias: 'takeshi', session: true, email: 'jo@example.test', prof: null }); await mail.profile.refresh();
  assert.equal(mail.calls.length, 0, 'a confirmed address: kept (its row may come back with a name)');
}
{ // create: a nickname, checked here first; the statistics' notice on the step; then the block is a guest profile's
  const s = make({ captchaRequired: true }); await s.profile.refresh();
  s.profile.open('create'); assert(s.$('profile-title').textContent === 'Crea el perfil' && s.$('profile-send').textContent === 'Crea el perfil' && s.focused.at(-1) === 'profile-alias');
  assert(!s.$('profile-alias-field').hidden && s.$('profile-mail-field').hidden && s.$('profile-code-field').hidden && s.$('profile-note').hidden);
  assert(!s.$('profile-stats-note').hidden, 'creating a profile tells what it keeps of the statistics');
  assert(!/#/.test(s.$('profile-lead').textContent), 'no «#» to explain');
  enter(s.$, 'profile-alias', 'a b c'); s.$('profile-form').fire('submit'); await tick();
  assert(/espais/.test(s.$('profile-status').textContent) && s.calls.length === 0, 'a bad nickname: said why, nothing sent');
  s.T.fail = Object.assign(new Error('Aquest sobrenom ja és d’algú. Prova’n un altre.'), { code: 'taken' });
  enter(s.$, 'profile-alias', 'takeshi'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert(/ja és d’algú/.test(s.$('profile-status').textContent) && !s.$('profile-send').disabled && !s.mem.has('alias'), 'taken: pick another');
  s.T.fail = null; s.T.prof = guestProf({ published: false }); s.$('profile-form').fire('submit');
  assert(s.$('profile-send').disabled && s.$('profile-send').first?.className === 'btn-spin', 'working: the ring in the button');
  await tick(); await tick(); await tick(); assert(!s.$('profile-send').first, 'done: no ring');
  assert.deepEqual(s.calls.at(-1), ['create', 'takeshi', { captchaToken: 'tok' }]);
  assert(s.mem.get('alias') === 'takeshi', 'the name');
  assert.equal(s.T.accepted, 1, 'the statistics may be sent now (the notice was on this step)');
  assert.equal(s.$('profile-status').textContent, 'Perfil creat!');
  await tick(); await tick();
  assert.equal(s.buttons().join(), 'link:Confirma el correu,delete:Esborra el perfil'); assert.equal(s.$('profile-name').textContent, 'takeshi');
  s.$('profile-menu').close();
}
{ // confirm an e-mail: mail → code; the tick, the same name; an address typed elsewhere; a code the server does not confirm
  const s = make({ alias: 'takeshi', session: true, captchaRequired: true, prof: guestProf() }); await s.profile.refresh();
  s.profile.open('link'); assert(s.$('profile-menu').open && s.$('profile-title').textContent === 'Confirma el correu' && s.focused.at(-1) === 'profile-email');
  assert(/no es perd/.test(s.$('profile-lead').textContent) && !/#|caduc|7 dies|torneig/.test(s.$('profile-lead').textContent), 'what confirming does: keeps it, no «#» talk');
  enter(s.$, 'profile-email', 'jugador@example.com'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls[0], ['send', 'jugador@example.com', { captchaToken: 'tok' }]);
  assert(!s.$('profile-code-field').hidden && s.$('profile-mail-field').hidden && /jugador@example\.com/.test(s.$('profile-lead').textContent) && s.focused.at(-1) === 'profile-code');
  enter(s.$, 'profile-code', '12a34-56'); assert.equal(s.$('profile-code').value, '123456', 'digits only, six');
  s.T.email = 'jugador@example.com'; s.T.prof = guestProf({ verified: true });
  s.$('profile-form').fire('submit'); await tick(); await tick(); await tick();
  assert.deepEqual(s.calls[1], ['verify', 'jugador@example.com', '123456', 'email_change']);
  assert.equal(s.$('profile-status').textContent, 'Correu confirmat!');
  assert(!s.profile.renaming && s.$('profile-alias-field').hidden, 'the tick is all: no «Tria el teu nom» step any more');
  await tick(); await tick();
  assert(s.badge() && s.$('profile-name').textContent === 'takeshi' && s.buttons()[0] === 'signout:Tanca la sessió', 'the block: the same name and the check');
  s.$('profile-menu').close();
  // an address typed on the publish sheet's offer: the steps open already sending it the code
  { const t = make({ alias: 'takeshi', session: true, prof: guestProf() }); await t.profile.refresh();
    t.profile.open('link', null, { mail: ' Jugador@Example.com ' }); await tick(); await tick();
    assert(t.calls.some(c => c[0] === 'send' && c[1] === 'Jugador@Example.com') && !t.$('profile-code-field').hidden, 'typed elsewhere: straight to the code');
    t.$('profile-menu').close(); }
  // a code accepted but the server not (yet) confirming it: no claim
  const n = make({ alias: 'takeshi', session: true, prof: guestProf() }); await n.profile.refresh();
  n.profile.open('link'); enter(n.$, 'profile-email', 'jugador@example.com'); n.$('profile-form').fire('submit'); await tick(); await tick();
  enter(n.$, 'profile-code', '123456'); n.$('profile-form').fire('submit'); await tick(); await tick(); await tick();
  assert(n.$('profile-status').textContent === 'Codi comprovat.', 'not «Correu confirmat!» without the server');
  n.$('profile-menu').close();
}
{ // a released guest chooses another name: the existing name sheet with the one sentence, update_alias (createProfile), no captcha, no statistics notice
  const s = make({ alias: 'takeshi', session: true, captchaRequired: true, prof: guestProf({ released: true }) }); await s.profile.refresh();
  s.profile.open('rename'); assert(s.profile.renaming && s.$('profile-title').textContent === 'Tria un altre nom' && s.focused.at(-1) === 'profile-alias');
  assert.equal(s.$('profile-lead').textContent, 'Has estat un temps sense jugar i el teu nom ara és d’una altra persona. Tria’n un altre.');
  assert(s.$('profile-alias').value === '' && !s.$('profile-alias-field').hidden && s.$('profile-stats-note').hidden && s.$('profile-send').textContent === 'Desa el nom', 'an empty field; no new profile, no notice');
  s.T.fail = Object.assign(new Error('Aquest sobrenom ja és d’algú. Prova’n un altre.'), { code: 'taken' });
  enter(s.$, 'profile-alias', 'Timbaler'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert(/ja és d’algú/.test(s.$('profile-status').textContent) && s.profile.renaming && !s.$('profile-send').disabled && s.calls.at(-1)[2].captchaToken === undefined, 'taken: the usual error, another try, no captcha');
  s.T.fail = null; enter(s.$, 'profile-alias', 'Takeshi'); s.$('profile-form').fire('submit'); await tick(); await tick(); await tick();
  assert.deepEqual(s.calls.at(-1).slice(0, 2), ['create', 'Takeshi']); assert.equal(s.T.accepted, 0, 'a rename is no new profile');
  assert.equal(s.mem.get('alias'), 'Takeshi'); assert.equal(s.$('profile-status').textContent, 'Nom desat!');
  await tick(); await tick();
  assert.equal(s.$('profile-row').dataset.state, 'guest', 'the server freed the profile: a plain guest again'); assert.equal(s.$('profile-name').textContent, 'Takeshi');
  s.$('profile-menu').close();
}
{ // recover: the nickname comes back; a wrong code stays on the code step
  const s = make(); await s.profile.refresh(); let backs = 0;
  s.profile.open('recover', () => backs++); assert.equal(s.$('profile-title').textContent, 'Recupera el perfil');
  enter(s.$, 'profile-email', 'jugador@example.com'); s.$('profile-form').fire('submit'); await tick(); await tick();
  s.T.fail = Object.assign(new Error('El codi no és correcte o ha caducat. Demana’n un de nou.'), { code: 'code' });
  enter(s.$, 'profile-code', '000000'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert(/no és correcte/.test(s.$('profile-status').textContent) && !s.$('profile-code-field').hidden && !s.$('profile-send').disabled, 'a wrong code: try again');
  s.T.fail = null; s.T.alias = 'takeshi';
  enter(s.$, 'profile-code', '123456'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.equal(s.mem.get('alias'), 'takeshi'); assert.equal(s.$('profile-status').textContent, 'Perfil recuperat!');
  s.$('profile-menu').close(); assert.equal(backs, 1, 'closing goes back to where it was opened from');
}
{ // delete: confirmed, once; a failure is reported and can be retried
  const s = make({ alias: 'takeshi', session: true }); await s.profile.refresh();
  s.profile.open('delete'); assert(s.$('profile-title').textContent === 'Esborrar el perfil?' && s.$('profile-send').textContent === 'Sí, esborra-ho tot' && s.focused.at(-1) === 'profile-keep', 'starts on the safe button');
  assert(!s.$('profile-keep').hidden && s.$('profile-send').classList.contains('btn-secondary') && !s.$('profile-send').classList.contains('btn-primary'), 'as in the pause: «Cancel·la» is the primary, the irreversible one outlined');
  assert(s.$('profile-mail-field').hidden && s.$('profile-code-field').hidden && s.$('profile-note').hidden);
  s.T.fail = Object.assign(new Error('No s’ha pogut connectar.'), { code: 'unavailable', detail: 'js:Error' });
  s.$('profile-form').fire('submit'); await tick(); await tick();
  assert(/No s’ha pogut/.test(s.$('profile-status').textContent) && s.mem.has('alias') && !s.$('profile-send').disabled, 'failed: nothing forgotten, retry possible');
  assert.deepEqual(s.reports, [['leaderboard-delete-failed', { code: 'unavailable', server: 'js:Error' }]]);
  s.T.fail = null; s.T.session = false; s.$('profile-form').fire('submit'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.equal(s.calls.filter(c => c[0] === 'delete').length, 2, 'the retry deleted once (a double press is one request)');
  assert(!s.mem.has('alias')); assert(/Perfil esborrat/.test(s.$('profile-status').textContent));
  assert(s.$('profile-keep').hidden && s.$('profile-send').classList.contains('btn-primary'), 'done: only «Tanca», primary again');
  s.$('profile-menu').close();
  const c = make({ alias: 'takeshi', session: true }); c.profile.open('delete'); c.$('profile-cancel').click(); assert(!c.$('profile-menu').open && c.calls.length === 0, 'the X deletes nothing');
  c.profile.open('delete'); c.$('profile-keep').click(); assert(!c.$('profile-menu').open && c.calls.length === 0, '«Cancel·la» deletes nothing');
  c.profile.open('create'); assert(c.$('profile-keep').hidden && c.$('profile-send').classList.contains('btn-primary'), 'other steps keep their one gold button');
}
{ // sign out (with an e-mail on the profile)
  const s = make({ alias: 'takeshi', session: true, email: 'jugador@example.com' }); await s.profile.refresh();
  s.profile.open('signout'); assert(/jugador@example\.com/.test(s.$('profile-lead').textContent));
  s.T.session = false; s.T.email = ''; s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls, [['signout']]); assert(!s.mem.has('alias')); assert.equal(s.$('profile-status').textContent, 'Sessió tancada.');
  s.$('profile-menu').close();
}
{ // an address that already confirmed another profile: the code switches to that one, said before, nothing merged
  const s = make({ alias: 'takeshi', session: true, prof: guestProf() }); await s.profile.refresh();
  s.T.sendType = 'email'; s.profile.open('link');
  enter(s.$, 'profile-email', 'altre@example.com'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.equal(s.$('profile-lead').textContent, 'Aquest correu ja és d’un altre perfil. Amb el codi que t’hem enviat a altre@example.com entraràs en aquell perfil: takeshi i els seus resultats no s’hi afegeixen.');
  s.T.prof = guestProf({ alias: 'Castellera777', verified: true }); s.T.email = 'altre@example.com';
  enter(s.$, 'profile-code', '123456'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls.at(-1), ['verify', 'altre@example.com', '123456', 'email']);
  assert.equal(s.$('profile-status').textContent, 'Ara fas servir aquell perfil.');
  assert(s.mem.get('alias') === 'Castellera777', 'that profile’s name on this browser now');
  s.$('profile-menu').close();
  // recovering says it needs the confirmed address
  const r = make(); await r.profile.refresh(); r.profile.open('recover');
  assert.equal(r.$('profile-lead').textContent, 'Escriu el correu que vas confirmar al perfil i t’enviarem un codi per entrar-hi. Sense contrasenya.');
}
{ // no deadline left anywhere in the profile's copy
  const src = readFileSync(new URL('../../src/ui/profile-ui.js', import.meta.url), 'utf8') + readFileSync(new URL('../../src/ui/profile-notes.js', import.meta.url), 'utf8');
  assert(!/7 dies|caduca|temporal|expiresAt|ackNotice|noticeNeeded/.test(src), 'no 7-day copy or API');
}
console.log('profile block and sheet ok');
