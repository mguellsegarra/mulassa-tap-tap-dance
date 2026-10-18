// The ⚙ «Perfil» block and its sheet (src/ui/profile-ui.js) in a small fake DOM with a mocked service: the states and
// the buttons that fit each, creating one (a nickname), confirming an e-mail (mail → code), recovering (nickname comes back), sign out and delete
// (confirmed, once, failures reported), forgetting a stale name, publishing off, offline; temporary profiles (202610180001): the
// deadline, the 7-day notice acknowledged only once painted, the check only on the server's word, expiry, switching profiles.
import assert from 'node:assert/strict';
import { setupProfile } from '../src/ui/profile-ui.js';
import { KEEP_NOTICE, VERIFIED, EXPIRED_TEXT, RESERVED_TEXT, untilText } from '../src/ui/profile-notes.js';

class El {
  constructor(id) { Object.assign(this, { id, hidden: false, disabled: false, value: '', readOnly: false, dataset: {}, on: {}, open: false, text: '', attrs: {} }); }
  get textContent() { return this.text; } set textContent(v) { this.text = String(v); this.first = null; this.kids = []; }
  get classList() { return { toggle: () => {} }; }
  append(...c) { (this.kids ||= []).push(...c); }
  setAttribute(k, v) { this.attrs[k] = v; } addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t, ev = {}) { const e = { preventDefault() { this.prevented = true; }, ...ev }; for (const f of this.on[t] || []) f(e); return e; }
  click() { return this.fire('click'); } focus() {} prepend(c) { this.first = c; }
  showModal() { this.open = true; } close() { if (!this.open) return; this.open = false; this.fire('close'); }
}
const ids = ['profile-menu', 'profile-form', 'profile-email', 'profile-code', 'profile-status', 'profile-send', 'profile-cancel', 'profile-lead', 'profile-title',
  'profile-alias', 'profile-alias-field', 'profile-mail-field', 'profile-code-field', 'profile-note', 'settings-profile-row', 'settings-profile-name', 'settings-profile-sub', 'settings-profile-main', 'settings-profile-alt'];
const tick = () => new Promise(r => setTimeout(r, 0));

function make({ configured = true, publishingEnabled = true, session = false, email = '', alias = '', persistent = true, captchaRequired = false,
  prof, known = null, now = () => Date.parse('2026-10-18T12:00:00Z') } = {}) { // prof: my_profile's answer; known: the stored last answer
  const els = new Map(ids.map(id => [id, new El(id)]));
  const doc = { getElementById: id => els.get(id), createElement: tag => Object.assign(new El(''), { tag, className: '' }) }, $ = id => els.get(id);
  const mem = new Map(alias ? [['alias', alias]] : []);
  if (known) mem.set('alias:identity', JSON.stringify(known));
  const store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, String(v)), remove: k => mem.delete(k) };
  const calls = [], reports = [], paints = [], T = { session, email, alias: null, fail: null, prof, profiles: 0, acks: 0, unwatched: 0, ackFail: false, ackAt: null, sendType: null };
  const service = {
    configured, publishingEnabled, captchaRequired,
    createProfile: async (a, o) => { calls.push(['create', a, o]); if (T.fail) throw T.fail; T.session = true; return a.trim(); },
    identity: async () => ({ hasSession: T.session, email: T.email, persistent }),
    sendCode: async (m, o) => { calls.push(['send', m, o]); return { type: T.sendType ?? (T.session ? 'email_change' : 'email') }; },
    profile: async () => { T.profiles++; if (T.prof === undefined) throw new Error('rpc:PGRST202:404'); return T.prof; }, // undefined: an older server, no my_profile
    ackNotice: async () => { T.acks++; if (T.ackFail) throw new Error('offline'); T.prof = { ...T.prof, expiresAt: T.ackAt, noticeNeeded: false }; return T.ackAt; },
    verifyCode: async (m, c, t) => { calls.push(['verify', m, c, t]); if (T.fail) throw T.fail; return { email: m }; },
    myAlias: async () => T.alias ?? null,
    signOut: async () => { calls.push(['signout']); T.session = false; },
    deleteProfile: async () => { calls.push(['delete']); if (T.fail) throw T.fail; return { deleted: true }; },
  };
  const captcha = { token: async () => 'tok', cancel() {} };
  const focused = [];
  const profile = setupProfile({ focusIn: (m, id) => focused.push(id), captcha, store, aliasKey: 'alias', deviceNote: p => (p ? '' : 'NOTE'), service, doc, report: (k, d) => reports.push([k, d]),
    seen: (el, cb) => { assert.equal(el, $('settings-profile-sub'), 'the notice line itself is watched'); paints.push(cb); return () => { T.unwatched++; }; }, now });
  return { profile, $, mem, calls, reports, T, focused, paints, badge: () => ($('settings-profile-name').kids || []).find(k => k.className === 'verified-check'), buttons: () => [$('settings-profile-main'), $('settings-profile-alt')].filter(b => !b.hidden).map(b => `${b.dataset.act}:${b.textContent}`) };
}
const enter = ($, id, v) => { $(id).value = v; $(id).fire('input'); };

{ // the four states
  const none = make(); await none.profile.refresh();
  assert(!none.$('settings-profile-row').hidden && none.$('settings-profile-name').textContent === '' && none.buttons().join() === 'create:Crea,recover:Recupera', 'no profile: create one or recover yours');
  const stale = make({ alias: 'takeshi' }); await stale.profile.refresh();
  assert.equal(stale.$('settings-profile-name').textContent, 'takeshi'); assert.equal(stale.buttons().join(), 'recover:Recupera,forget:Oblida el nom', 'a name, no profile: recover or forget it');
  stale.profile.forget(); await tick();
  assert(!stale.mem.has('alias') && stale.$('settings-profile-name').textContent === '', 'forgetting is local only');
  const guest = make({ alias: 'takeshi', session: true }); await guest.profile.refresh();
  assert.equal(guest.buttons().join(), 'link:Confirma el correu,delete:Esborra el perfil'); assert.equal(guest.$('settings-profile-sub').textContent, 'Només viu en aquest navegador.');
  assert(!guest.badge(), 'not confirmed: no check');
  const priv = make({ alias: 'takeshi', session: true, persistent: false }); await priv.profile.refresh();
  assert.equal(priv.$('settings-profile-sub').textContent, 'NOTE', 'the browser note when it may lose the profile');
  const linked = make({ alias: 'takeshi', session: true, email: 'jugador@example.com' }); await linked.profile.refresh();
  assert.equal(linked.buttons().join(), 'signout:Tanca la sessió,delete:Esborra el perfil', 'signing out only with an e-mail on it');
  assert.equal(linked.$('settings-profile-sub').textContent, `${VERIFIED}: j***@example.com`, 'the address masked, never in full');
  const off = make({ alias: 'takeshi', session: true, publishingEnabled: false }); await off.profile.refresh();
  assert.equal(off.buttons().join(), 'delete:Esborra el perfil', 'publishing off: nothing to link, deleting stays');
  const none2 = make({ publishingEnabled: false }); await none2.profile.refresh();
  assert(none2.$('settings-profile-row').hidden, 'publishing off, no profile: nothing to show');
  const gone = make({ configured: false }); await gone.profile.refresh(); assert(gone.$('settings-profile-row').hidden, 'offline game: no block');
}
{ // create: a nickname, checked here first; then the block is a guest profile's
  const s = make({ captchaRequired: true }); await s.profile.refresh();
  s.profile.open('create'); assert(s.$('profile-title').textContent === 'Crea el perfil' && s.$('profile-send').textContent === 'Crea el perfil' && s.focused.at(-1) === 'profile-alias');
  assert(!s.$('profile-alias-field').hidden && s.$('profile-mail-field').hidden && s.$('profile-code-field').hidden && s.$('profile-note').hidden);
  enter(s.$, 'profile-alias', 'a b c'); s.$('profile-form').fire('submit'); await tick();
  assert(/espais/.test(s.$('profile-status').textContent) && s.calls.length === 0, 'a bad nickname: said why, nothing sent');
  s.T.fail = Object.assign(new Error('Aquest sobrenom ja és d’algú. Prova’n un altre.'), { code: 'taken' });
  enter(s.$, 'profile-alias', 'takeshi'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert(/ja és d’algú/.test(s.$('profile-status').textContent) && !s.$('profile-send').disabled && !s.mem.has('alias'), 'taken: pick another');
  s.T.fail = null; s.$('profile-form').fire('submit');
  assert(s.$('profile-send').disabled && s.$('profile-send').first?.className === 'btn-spin', 'working: the ring in the button');
  await tick(); await tick(); assert(!s.$('profile-send').first, 'done: no ring');
  assert.deepEqual(s.calls.at(-1), ['create', 'takeshi', { captchaToken: 'tok' }]);
  assert.equal(s.mem.get('alias'), 'takeshi'); assert.equal(s.$('profile-status').textContent, 'Perfil creat!');
  assert.equal(s.buttons().join(), 'link:Confirma el correu,delete:Esborra el perfil'); assert.equal(s.$('settings-profile-name').textContent, 'takeshi');
  s.$('profile-menu').close();
}
{ // confirm an e-mail: mail → code → done, confirmed on the server's word
  const s = make({ alias: 'takeshi', session: true, captchaRequired: true }); await s.profile.refresh();
  s.profile.open('link'); assert(s.$('profile-menu').open && s.$('profile-title').textContent === 'Confirma el correu' && s.focused.at(-1) === 'profile-email');
  assert(/sense data de caducitat/.test(s.$('profile-lead').textContent) && /Si algun dia hi ha tornejos/.test(s.$('profile-lead').textContent), 'what confirming does (and future tournaments, conditionally)');
  enter(s.$, 'profile-email', 'jugador@example.com'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls[0], ['send', 'jugador@example.com', { captchaToken: 'tok' }]);
  assert(!s.$('profile-code-field').hidden && s.$('profile-mail-field').hidden && /jugador@example\.com/.test(s.$('profile-lead').textContent) && s.focused.at(-1) === 'profile-code');
  enter(s.$, 'profile-code', '12a34-56'); assert.equal(s.$('profile-code').value, '123456', 'digits only, six');
  s.T.email = 'jugador@example.com'; s.T.prof = { alias: 'takeshi', verified: true, expiresAt: null, noticeNeeded: false, published: true, expired: false };
  s.$('profile-form').fire('submit'); await tick(); await tick(); await tick();
  assert.deepEqual(s.calls[1], ['verify', 'jugador@example.com', '123456', 'email_change']);
  assert.equal(s.$('profile-status').textContent, 'Correu confirmat!'); assert.equal(s.$('profile-send').textContent, 'Tanca');
  await tick(); await tick();
  assert.equal(s.buttons()[0], 'signout:Tanca la sessió', 'the block now offers to sign out');
  assert(s.badge()?.attrs['aria-label'] === VERIFIED, 'and shows the check next to the name');
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
  s.profile.open('delete'); assert(s.$('profile-title').textContent === 'Esborrar el perfil?' && s.$('profile-send').textContent === 'Sí, esborra-ho tot' && s.focused.at(-1) === 'profile-cancel', 'starts on the safe button');
  assert(s.$('profile-mail-field').hidden && s.$('profile-code-field').hidden && s.$('profile-note').hidden);
  s.T.fail = Object.assign(new Error('No s’ha pogut connectar.'), { code: 'unavailable', detail: 'js:Error' });
  s.$('profile-form').fire('submit'); await tick(); await tick();
  assert(/No s’ha pogut/.test(s.$('profile-status').textContent) && s.mem.has('alias') && !s.$('profile-send').disabled, 'failed: nothing forgotten, retry possible');
  assert.deepEqual(s.reports, [['leaderboard-delete-failed', { code: 'unavailable', server: 'js:Error' }]]);
  s.T.fail = null; s.T.session = false; s.$('profile-form').fire('submit'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.equal(s.calls.filter(c => c[0] === 'delete').length, 2, 'the retry deleted once (a double press is one request)');
  assert(!s.mem.has('alias')); assert(/Perfil esborrat/.test(s.$('profile-status').textContent));
  s.$('profile-menu').close();
  const c = make({ alias: 'takeshi', session: true }); c.profile.open('delete'); c.$('profile-cancel').click(); assert(!c.$('profile-menu').open && c.calls.length === 0, 'the X deletes nothing');
}
{ // sign out (with an e-mail on the profile)
  const s = make({ alias: 'takeshi', session: true, email: 'jugador@example.com' }); await s.profile.refresh();
  s.profile.open('signout'); assert(/jugador@example\.com/.test(s.$('profile-lead').textContent));
  s.T.session = false; s.T.email = ''; s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls, [['signout']]); assert(!s.mem.has('alias')); assert.equal(s.$('profile-status').textContent, 'Sessió tancada.');
  s.$('profile-menu').close();
}
const UNTIL = +new Date(2026, 9, 25, 18, 42), NOW = Date.parse('2026-10-18T12:00:00Z'); // local time: the same words in any time zone
const guestProf = o => ({ alias: 'takeshi', verified: false, expiresAt: null, noticeNeeded: false, published: true, expired: false, ...o });
{ // a deadline running: the date, and «Confirma el correu» always there
  const s = make({ alias: 'takeshi', session: true, prof: guestProf({ expiresAt: UNTIL }) }); await s.profile.refresh();
  assert.equal(s.$('settings-profile-sub').textContent, untilText(UNTIL));
  assert.equal(s.$('settings-profile-sub').textContent, 'Sense confirmar el correu, el perfil caduca el 25 d’octubre a les 18:42.', 'the actual date and time, in the device’s time');
  assert.equal(untilText(+new Date(2026, 10, 1, 9, 5)), 'Sense confirmar el correu, el perfil caduca l’1 de novembre a les 09:05.', '«l’1», «l’11»: the apostrophe');
  assert.equal(untilText(+new Date(2026, 10, 11, 9, 5)).includes('caduca l’11 de novembre'), true);
  assert.equal(s.buttons().join(), 'link:Confirma el correu,delete:Esborra el perfil');
  assert(!s.badge() && s.paints.length === 0 && s.T.acks === 0, 'no check, nothing to acknowledge');
}
{ // an old profile with results: the notice, acknowledged once painted (the server's date then replaces it), once
  const s = make({ alias: 'takeshi', session: true, prof: guestProf({ noticeNeeded: true }) }); s.T.ackAt = UNTIL;
  await s.profile.refresh();
  assert.equal(s.$('settings-profile-sub').textContent, KEEP_NOTICE, 'the notice, word for word');
  assert.equal(s.T.acks, 0, 'not acknowledged before it is on screen');
  assert.equal(s.paints.length, 1); await s.paints.shift()(); await tick();
  assert.equal(s.T.acks, 1, 'painted: acknowledged');
  assert.equal(s.$('settings-profile-sub').textContent, untilText(UNTIL), 'then the deadline the server set');
  await s.profile.refresh(); await tick();
  assert(s.paints.length === 0 && s.T.acks === 1, 'a later opening does not acknowledge again');
  assert.equal(JSON.parse(s.mem.get('alias:identity')).prof.expiresAt, UNTIL, 'the deadline is remembered for the next first frame');
  // the first frame from memory and the server's answer both paint the notice: still one acknowledgement on its way
  const twice = make({ alias: 'takeshi', session: true, prof: guestProf({ noticeNeeded: true }), known: { hasSession: true, mailOn: '', persistent: true, prof: guestProf({ noticeNeeded: true }) } });
  twice.T.ackAt = UNTIL; await twice.profile.refresh();
  assert.equal(twice.paints.length, 1, 'one acknowledgement per opening');
  await twice.paints.shift()(); await tick(); assert.equal(twice.T.acks, 1);
  // repainted before it was read (another state now): the watch is cancelled, and a late callback sends nothing
  const h = make({ alias: 'takeshi', session: true, prof: guestProf({ noticeNeeded: true }) }); await h.profile.refresh();
  h.T.prof = guestProf({ verified: true }); h.T.email = 'jo@example.test'; await h.profile.refresh();
  assert.equal(h.T.unwatched, 1, 'no longer the notice: no longer watched');
  await h.paints.shift()(); await tick();
  assert.equal(h.T.acks, 0, 'stale: no acknowledgement');
  // a switch of profile while it was on its way: the answer belongs to the one before, nothing of it is kept
  const sw = make({ alias: 'takeshi', session: true, prof: guestProf({ noticeNeeded: true }) }); sw.T.ackAt = UNTIL; await sw.profile.refresh();
  sw.mem.set('alias', 'altre'); await sw.paints.shift()(); await tick();
  assert.equal(sw.T.acks, 0, 'another nickname on the block by then: nothing sent');
  // the call fails (offline): the notice stays, no date is invented; the next opening tries again
  const f = make({ alias: 'takeshi', session: true, prof: guestProf({ noticeNeeded: true }) }); f.T.ackFail = true;
  await f.profile.refresh(); await f.paints.shift()(); await tick();
  assert(f.T.acks === 1 && f.$('settings-profile-sub').textContent === KEEP_NOTICE, 'failed: the notice stays');
  f.T.ackFail = false; f.T.ackAt = UNTIL; await f.profile.refresh(); await f.paints.shift()(); await tick();
  assert(f.T.acks === 2 && f.$('settings-profile-sub').textContent === untilText(UNTIL), 'retried on the next opening');
}
{ // confirmed is the server's word: a session address without it is not enough once the server answers otherwise
  const pend = make({ alias: 'takeshi', session: true, email: '', prof: guestProf({ expiresAt: UNTIL }) }); await pend.profile.refresh();
  assert(!pend.badge() && pend.$('settings-profile-row').dataset.state === 'guest', 'a pending address: no check, still temporary');
  const odd = make({ alias: 'takeshi', session: true, email: 'jugador@example.com', prof: guestProf({ expiresAt: UNTIL }) }); await odd.profile.refresh();
  assert(!odd.badge() && odd.$('settings-profile-row').dataset.state === 'guest', 'the server says not confirmed: no check');
  const ok = make({ alias: 'takeshi', session: true, email: 'jugador@example.com', prof: guestProf({ verified: true }) }); await ok.profile.refresh();
  assert(ok.badge() && ok.$('settings-profile-sub').textContent === `${VERIFIED}: j***@example.com`);
  assert(!ok.$('settings-profile-sub').textContent.includes('jugador@'), 'never the full address');
  // a code accepted but the server not (yet) confirming it: no claim, no check
  const c = make({ alias: 'takeshi', session: true, prof: guestProf({ expiresAt: UNTIL }) }); await c.profile.refresh();
  c.profile.open('link'); enter(c.$, 'profile-email', 'jugador@example.com'); c.$('profile-form').fire('submit'); await tick(); await tick();
  enter(c.$, 'profile-code', '123456'); c.$('profile-form').fire('submit'); await tick(); await tick(); await tick();
  assert.equal(c.$('profile-status').textContent, 'Codi comprovat.', 'not «Correu confirmat!» without the server');
  await tick(); await tick(); assert(!c.badge() && c.$('settings-profile-row').dataset.state === 'guest');
  c.$('profile-menu').close();
}
{ // expired: the server says so → this browser leaves the old session; local records untouched; Crea or forget the name
  const s = make({ alias: 'takeshi', session: true, prof: guestProf({ expiresAt: NOW - 1000, expired: true }) });
  s.mem.set('record-v2-duet-1', '{"quality":90}');
  await s.profile.refresh(); await tick();
  assert.deepEqual(s.calls, [['signout']], 'the old session goes');
  assert.equal(s.$('settings-profile-sub').textContent, EXPIRED_TEXT);
  assert.equal(s.buttons().join(), 'create:Crea,forget:Oblida el nom');
  assert(s.mem.get('record-v2-duet-1') && s.mem.get('alias') === 'takeshi', 'device records stay; the name stays until forgotten');
  await s.profile.refresh(); await tick();
  assert.equal(s.$('settings-profile-row').dataset.state, 'expired', 'it keeps saying so (no session now)');
  s.profile.forget(); await tick(); await tick();
  assert(s.buttons().join() === 'create:Crea,recover:Recupera' && !s.mem.has('alias'), 'forgotten: no profile');
  // purged already (no row) after a deadline this browser knew: the same
  const p = make({ alias: 'takeshi', session: true, prof: null, known: { hasSession: true, mailOn: '', persistent: true, prof: guestProf({ expiresAt: NOW - 1000 }) } });
  await p.profile.refresh(); await tick();
  assert(p.calls.some(c => c[0] === 'signout') && p.$('settings-profile-row').dataset.state === 'expired');
  // the purge took the account and its session too: a deadline known to be past still reads «caducat», not «stale»
  const g = make({ alias: 'takeshi', session: false, known: { hasSession: true, mailOn: '', persistent: true, prof: guestProf({ expiresAt: NOW - 1000 }) } });
  await g.profile.refresh(); await tick();
  assert(g.$('settings-profile-row').dataset.state === 'expired' && g.buttons().join() === 'create:Crea,forget:Oblida el nom' && g.mem.get('alias') === 'takeshi');
  const h = make({ alias: 'takeshi', session: false, known: { hasSession: true, mailOn: '', persistent: true, prof: guestProf({ expiresAt: NOW + 1000 }) } });
  await h.profile.refresh(); await tick();
  assert.equal(h.$('settings-profile-row').dataset.state, 'stale', 'a deadline still ahead, no session: stale (recover)');
  // no row, but the deadline still ahead (or never known): not called expired, but the useless session goes (a name
  // this browser no longer has a profile for, as on the publish sheet), so «Confirma el correu» never meets a missing account
  const q = make({ alias: 'takeshi', session: true, prof: null, known: { hasSession: true, mailOn: '', persistent: true, prof: guestProf({ expiresAt: NOW + 1000 }) } });
  await q.profile.refresh(); await tick();
  assert(q.calls.some(c => c[0] === 'signout') && q.$('settings-profile-row').dataset.state === 'stale');
  // a remembered deadline already past paints «caducat» from the first frame, never a date gone by
  const m = make({ alias: 'takeshi', session: true, prof: guestProf({ expired: true, expiresAt: NOW - 1000 }), known: { hasSession: true, mailOn: '', persistent: true, prof: guestProf({ expiresAt: NOW - 1000 }) } });
  const first = m.profile.refresh(); assert.equal(m.$('settings-profile-row').dataset.state, 'expired'); await first;
  // a new profile clears it
  const r = make({ alias: 'takeshi', session: true, prof: guestProf({ expired: true, expiresAt: NOW - 1 }) }); await r.profile.refresh(); await tick();
  r.T.prof = guestProf({ alias: 'nou', published: false }); r.profile.open('create'); enter(r.$, 'profile-alias', 'nou'); r.$('profile-form').fire('submit'); await tick(); await tick(); await tick();
  assert(r.mem.get('alias') === 'nou' && r.$('settings-profile-row').dataset.state === 'guest', 'Crea: a new guest profile, not expired');
  assert.equal(r.$('settings-profile-sub').textContent, RESERVED_TEXT, 'a name and no result: no deadline yet, and it says so');
  r.$('profile-menu').close();
}
{ // an address that already confirmed another profile: the code switches to that one, said before, nothing merged
  const s = make({ alias: 'takeshi', session: true, prof: guestProf({ expiresAt: UNTIL }) }); await s.profile.refresh();
  s.T.sendType = 'email'; s.profile.open('link');
  enter(s.$, 'profile-email', 'altre@example.com'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.equal(s.$('profile-lead').textContent, 'Aquest correu ja és d’un altre perfil. Amb el codi que t’hem enviat a altre@example.com entraràs en aquell perfil: takeshi i els seus resultats no s’hi afegeixen.');
  s.T.alias = 'Castellera777'; s.T.prof = guestProf({ alias: 'Castellera777', verified: true }); s.T.email = 'altre@example.com';
  enter(s.$, 'profile-code', '123456'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls.at(-1), ['verify', 'altre@example.com', '123456', 'email']);
  assert.equal(s.$('profile-status').textContent, 'Ara fas servir aquell perfil.');
  assert.equal(s.mem.get('alias'), 'Castellera777', 'that profile’s name on this browser now');
  s.$('profile-menu').close();
  // recovering says it needs the confirmed address
  const r = make(); await r.profile.refresh(); r.profile.open('recover');
  assert.equal(r.$('profile-lead').textContent, 'Escriu el correu que vas confirmar al perfil i t’enviarem un codi per entrar-hi. Sense contrasenya.');
}
console.log('profile block and sheet ok');
