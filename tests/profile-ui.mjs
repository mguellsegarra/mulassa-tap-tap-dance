// The ⚙ «Perfil» block and its sheet (src/ui/profile-ui.js) in a small fake DOM with a mocked service: the four states and
// the buttons that fit each, creating one (a nickname), linking an e-mail (mail → code), recovering (nickname comes back), sign out and delete
// (confirmed, once, failures reported), forgetting a stale name, publishing off, offline.
import assert from 'node:assert/strict';
import { setupProfile } from '../src/ui/profile-ui.js';

class El {
  constructor(id) { Object.assign(this, { id, hidden: false, disabled: false, value: '', readOnly: false, dataset: {}, on: {}, open: false, text: '', attrs: {} }); }
  get textContent() { return this.text; } set textContent(v) { this.text = String(v); this.first = null; }
  get classList() { return { toggle: () => {} }; }
  setAttribute(k, v) { this.attrs[k] = v; } addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t, ev = {}) { const e = { preventDefault() { this.prevented = true; }, ...ev }; for (const f of this.on[t] || []) f(e); return e; }
  click() { return this.fire('click'); } focus() {} prepend(c) { this.first = c; }
  showModal() { this.open = true; } close() { if (!this.open) return; this.open = false; this.fire('close'); }
}
const ids = ['profile-menu', 'profile-form', 'profile-email', 'profile-code', 'profile-status', 'profile-send', 'profile-cancel', 'profile-lead', 'profile-title',
  'profile-alias', 'profile-alias-field', 'profile-mail-field', 'profile-code-field', 'profile-note', 'settings-profile-row', 'settings-profile-name', 'settings-profile-sub', 'settings-profile-main', 'settings-profile-alt'];
const tick = () => new Promise(r => setTimeout(r, 0));

function make({ configured = true, publishingEnabled = true, session = false, email = '', alias = '', persistent = true, captchaRequired = false } = {}) {
  const els = new Map(ids.map(id => [id, new El(id)]));
  const doc = { getElementById: id => els.get(id), createElement: () => ({ className: '' }) }, $ = id => els.get(id);
  const mem = new Map(alias ? [['alias', alias]] : []);
  const store = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, String(v)), remove: k => mem.delete(k) };
  const calls = [], reports = [], T = { session, email, alias: null, fail: null };
  const service = {
    configured, publishingEnabled, captchaRequired,
    createProfile: async (a, o) => { calls.push(['create', a, o]); if (T.fail) throw T.fail; T.session = true; return a.trim(); },
    identity: async () => ({ hasSession: T.session, email: T.email, persistent }),
    sendCode: async (m, o) => { calls.push(['send', m, o]); return { type: T.session ? 'email_change' : 'email' }; },
    verifyCode: async (m, c, t) => { calls.push(['verify', m, c, t]); if (T.fail) throw T.fail; return { email: m }; },
    myAlias: async () => T.alias ?? null,
    signOut: async () => { calls.push(['signout']); },
    deleteProfile: async () => { calls.push(['delete']); if (T.fail) throw T.fail; return { deleted: true }; },
  };
  const captcha = { token: async () => 'tok', cancel() {} };
  const focused = [];
  const profile = setupProfile({ focusIn: (m, id) => focused.push(id), captcha, store, aliasKey: 'alias', deviceNote: p => (p ? '' : 'NOTE'), service, doc, report: (k, d) => reports.push([k, d]) });
  return { profile, $, mem, calls, reports, T, focused, buttons: () => [$('settings-profile-main'), $('settings-profile-alt')].filter(b => !b.hidden).map(b => `${b.dataset.act}:${b.textContent}`) };
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
  assert.equal(guest.buttons().join(), 'link:Enllaça un correu,delete:Esborra el perfil'); assert.equal(guest.$('settings-profile-sub').textContent, 'Només viu en aquest navegador.');
  const priv = make({ alias: 'takeshi', session: true, persistent: false }); await priv.profile.refresh();
  assert.equal(priv.$('settings-profile-sub').textContent, 'NOTE', 'the browser note when it may lose the profile');
  const linked = make({ alias: 'takeshi', session: true, email: 'jugador@example.com' }); await linked.profile.refresh();
  assert.equal(linked.buttons().join(), 'signout:Tanca la sessió,delete:Esborra el perfil', 'signing out only with an e-mail on it');
  assert.equal(linked.$('settings-profile-sub').textContent, 'Protegit amb j***@example.com');
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
  assert.equal(s.buttons().join(), 'link:Enllaça un correu,delete:Esborra el perfil'); assert.equal(s.$('settings-profile-name').textContent, 'takeshi');
  s.$('profile-menu').close();
}
{ // link an e-mail: mail → code → done
  const s = make({ alias: 'takeshi', session: true, captchaRequired: true }); await s.profile.refresh();
  s.profile.open('link'); assert(s.$('profile-menu').open && s.$('profile-title').textContent === 'Enllaça un correu' && s.focused.at(-1) === 'profile-email');
  enter(s.$, 'profile-email', 'jugador@example.com'); s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls[0], ['send', 'jugador@example.com', { captchaToken: 'tok' }]);
  assert(!s.$('profile-code-field').hidden && s.$('profile-mail-field').hidden && /jugador@example\.com/.test(s.$('profile-lead').textContent) && s.focused.at(-1) === 'profile-code');
  enter(s.$, 'profile-code', '12a34-56'); assert.equal(s.$('profile-code').value, '123456', 'digits only, six');
  s.T.email = 'jugador@example.com'; s.$('profile-form').fire('submit'); await tick(); await tick();
  assert.deepEqual(s.calls[1], ['verify', 'jugador@example.com', '123456', 'email_change']);
  assert.equal(s.$('profile-status').textContent, 'Compte protegit!'); assert.equal(s.$('profile-send').textContent, 'Tanca');
  assert.equal(s.buttons()[0], 'signout:Tanca la sessió', 'the block now offers to sign out');
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
console.log('profile block and sheet ok');
