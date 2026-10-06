// The player's profile, in one place (⚙ Configuració «Perfil» block + #profile-menu, index.html). A guest profile lives in one
// browser's storage; like any guest account it can be protected by linking an e-mail (a 6-digit code sent there brings it
// back on any device: no password, no Google), left with «Tanca la sessió» once it has an e-mail, or deleted. The block
// shows the nickname, the state, and only the buttons that fit it:
//   none    no profile                  → Crea · Recupera
//   stale   a name, but no profile here → Recupera · Oblida el nom (local only)
//   guest   profile, no e-mail          → Enllaça un correu · Esborra el perfil
//   linked  profile + e-mail            → Tanca la sessió · Esborra el perfil
// The sheet's steps: alias (create), mail → code (link / recover), confirm (delete / sign out), done. «Crea» makes the
// guest profile with just a nickname, before any result (service.createProfile). src/services/leaderboard.js does the
// work (sendCode: an address that already owns a profile signs in to it instead); Turnstile is board-ui.js's (one widget).
import { leaderboard as defaultService } from '../services/leaderboard.js';
import { cleanEmail } from '../services/feedback.js';
import { checkAlias } from '../services/alias-rules.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton } from './sheet-kit.js';

const maskEmail = m => { const [u = '', d = ''] = m.split('@'); return `${u.slice(0, 1)}***@${d}`; };
const CONFIRM = {
  delete: { title: 'Esborrar el perfil?', yes: 'Sí, esborra-ho tot', done: 'Perfil esborrat. Els rècords d’aquest dispositiu es mantenen.',
    lead: () => 'S’esborraran el sobrenom, els resultats publicats i el correu, a tots els nivells. No es pot desfer. Els rècords d’aquest dispositiu es mantenen.' },
  signout: { title: 'Tancar la sessió?', yes: 'Sí, tanca la sessió', done: 'Sessió tancada.',
    lead: mail => `Aquest navegador oblidarà el perfil. El recuperaràs amb un codi enviat a ${mail}.` },
};

export function setupProfile({ focusIn, captcha, store, aliasKey, deviceNote = () => '', service = defaultService, doc = document, report = errors.report }) {
  const $ = byId(doc);
  const menu = $('profile-menu'), form = $('profile-form'), mailIn = $('profile-email'), aliasIn = $('profile-alias'), codeIn = $('profile-code');
  const status = $('profile-status'), sendBtn = $('profile-send'), cancelBtn = $('profile-cancel'), lead = $('profile-lead');
  const row = $('settings-profile-row'), nameEl = $('settings-profile-name'), sub = $('settings-profile-sub');
  const mainBtn = $('settings-profile-main'), altBtn = $('settings-profile-alt');
  const online = Boolean(service.configured), canLink = online && service.publishingEnabled; // deleting stays possible with publishing off
  let step = 'mail', kind = '', type = '', mail = '', busy = false, req = 0, back = null, settingsReq = 0, closeTimer = null;
  let email = ''; // the address on the profile shown in the block (for «Tanca la sessió»)

  const setStatus = statusLine(status);
  const label = () => (step === 'alias' ? 'Crea el perfil' : step === 'mail' ? 'Envia el codi' : step === 'code' ? 'Comprova el codi' : step === 'confirm' ? CONFIRM[kind].yes : 'Tanca');
  // disabled = working: a plain ring spins in the button (index.html .btn-spin, as in feedback-ui.js)
  const setSend = (text, disabled = false) => setButton(doc, sendBtn, text, disabled);
  const show = s => {
    step = s;
    $('profile-alias-field').hidden = s !== 'alias'; $('profile-mail-field').hidden = s !== 'mail'; $('profile-code-field').hidden = s !== 'code';
    $('profile-note').hidden = s !== 'mail' && s !== 'code';
    setSend(label());
  };
  const idle = () => { busy = false; mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = false; setSend(label()); };

  // --- the block in ⚙ Configuració
  // the last answer of service.identity(): the next open paints from it, so nothing jumps. Kept in the store too: after a while
  // away the session needs a network round-trip to refresh, and the block must not sit blank until it comes back.
  const knownKey = `${aliasKey}:identity`;
  let known = null;
  try { const k = JSON.parse(store.get(knownKey) || 'null'); if (k && typeof k.hasSession === 'boolean') known = { hasSession: k.hasSession, mailOn: String(k.mailOn || ''), persistent: k.persistent !== false }; } catch {}
  function paint({ alias, hasSession, mailOn, persistent }) {
    delete row.dataset.pending;
    const state = hasSession ? (mailOn ? 'linked' : 'guest') : alias ? 'stale' : 'none';
    email = mailOn;
    const set = (btn, act, text, on = true) => { btn.hidden = !on; btn.dataset.act = act; btn.textContent = text; };
    nameEl.textContent = alias;
    if (state === 'none') { sub.textContent = 'Encara no en tens cap.'; set(mainBtn, 'create', 'Crea', canLink); set(altBtn, 'recover', 'Recupera', canLink); }
    else if (state === 'stale') { sub.textContent = 'Aquest navegador ja no té el perfil.'; set(mainBtn, 'recover', 'Recupera', canLink); set(altBtn, 'forget', 'Oblida el nom'); }
    else if (state === 'guest') { sub.textContent = deviceNote(persistent) || 'Només viu en aquest navegador.'; set(mainBtn, 'link', 'Enllaça un correu', canLink); set(altBtn, 'delete', 'Esborra el perfil'); }
    else { sub.textContent = `Protegit amb ${maskEmail(mailOn)}`; set(mainBtn, 'signout', 'Tanca la sessió'); set(altBtn, 'delete', 'Esborra el perfil'); }
    row.hidden = mainBtn.hidden && altBtn.hidden;
  }
  async function refresh() {
    if (!online) { row.hidden = true; return; }
    const r = ++settingsReq, alias = store.get(aliasKey) || '';
    // the first frame: the last answer; with a name but no answer yet, a blank row of the same size (guessing «stale» and then
    // repainting «Protegit amb…» moved the buttons and the line under the name); no name: «Encara no en tens cap.»
    if (known && alias) paint({ alias, ...known });
    else if (alias) { row.hidden = false; row.dataset.pending = '1'; nameEl.textContent = alias; sub.textContent = '\u00a0'; for (const b of [mainBtn, altBtn]) { b.hidden = false; b.textContent = '\u00a0'; } }
    else paint({ alias, hasSession: false, mailOn: '', persistent: true });
    let id;
    try { id = await service.identity(); } catch { if (r === settingsReq && row.dataset.pending) paint({ alias, hasSession: false, mailOn: '', persistent: true }); return; } // offline: what the memory says stands
    known = { hasSession: id.hasSession, mailOn: id.email || '', persistent: id.persistent !== false };
    store.set(knownKey, JSON.stringify(known));
    if (r === settingsReq) paint({ alias, hasSession: id.hasSession, mailOn: id.email || '', persistent: id.persistent !== false });
  }
  function forget() { store.remove(aliasKey); refresh(); }

  // --- the sheet
  function open(what, onBack = null) {
    if (!online || menu.open) return;
    kind = what; back = onBack; req++; busy = false; mail = ''; type = '';
    mailIn.value = codeIn.value = aliasIn.value = ''; setStatus('');
    mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = false;
    cancelBtn.hidden = false;
    if (what === 'create') {
      $('profile-title').textContent = 'Crea el perfil';
      lead.textContent = 'Tria un sobrenom: és el nom que sortirà a la classificació. 3–16 caràcters, sense espais.';
      show('alias');
    } else if (what === 'link' || what === 'recover') {
      $('profile-title').textContent = what === 'link' ? 'Enllaça un correu' : 'Recupera el perfil';
      lead.textContent = what === 'link' ? 'Enllaça un correu per protegir el teu compte: si perds el perfil, el recuperaràs amb un codi. Sense contrasenya.'
        : 'Escriu el correu del perfil i t’enviarem un codi per entrar-hi. Sense contrasenya.';
      show('mail');
    } else {
      $('profile-title').textContent = CONFIRM[what].title; lead.textContent = CONFIRM[what].lead(email);
      show('confirm');
    }
    menu.showModal();
    focusIn(menu, step === 'alias' ? 'profile-alias' : step === 'mail' ? 'profile-email' : 'profile-cancel'); // a confirmation starts on the safe button
  }

  mailIn.addEventListener('input', () => { const c = cleanEmail(mailIn.value); if (c !== mailIn.value) mailIn.value = c; });
  codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.replace(/\D/g, '').slice(0, 6); });
  form.addEventListener('submit', e => { e.preventDefault(); send(); });
  function finish(text) { // the result for a beat, then back
    step = 'done'; busy = false; cancelBtn.hidden = true;
    $('profile-alias-field').hidden = $('profile-mail-field').hidden = $('profile-code-field').hidden = $('profile-note').hidden = true;
    lead.textContent = ''; setSend('Tanca'); setStatus(text, true);
    closeTimer = setTimeout(() => { if (menu.open) menu.close(); }, 2000);
    refresh();
  }
  async function send() {
    if (step === 'done') { menu.close(); return; }
    if (busy) return;
    const r = ++req;
    if (step === 'alias') { const a = checkAlias(aliasIn.value); if (!a.ok) { setStatus(a.message); return; } } // nothing sent
    busy = true; setStatus('');
    setSend('Un moment…', true); mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = true;
    try {
      let captchaToken;
      if ((step === 'alias' || step === 'mail') && service.captchaRequired && captcha) {
        try { captchaToken = await captcha.token(); } catch (e) {
          if (r === req) { setStatus(e?.code === 'cancel' ? '' : turnstileMessage(e?.code)); idle(); }
          return;
        }
        if (r !== req) return;
      }
      if (step === 'alias') {
        const alias = await service.createProfile(aliasIn.value, { captchaToken });
        if (r !== req) return;
        store.set(aliasKey, alias);
        finish('Perfil creat!');
      } else if (step === 'mail') {
        const out = await service.sendCode(mailIn.value, { captchaToken });
        if (r !== req) return;
        mail = mailIn.value; type = out.type;
        lead.textContent = `T’hem enviat un codi de 6 xifres a ${mail}. Mira també la carpeta de correu brossa.`;
        codeIn.value = ''; show('code'); idle(); focusIn(menu, 'profile-code');
      } else if (step === 'code') {
        await service.verifyCode(mail, codeIn.value, type);
        if (r !== req) return;
        if (type === 'email') { // signed in to an existing profile: bring its nickname back to this browser
          try { const alias = await service.myAlias(); if (alias) store.set(aliasKey, alias); } catch { /* asked again on the next publication */ }
          if (r !== req) return;
        }
        finish(type === 'email' ? 'Perfil recuperat!' : 'Compte protegit!');
      } else { // confirm
        try { await (kind === 'delete' ? service.deleteProfile() : service.signOut()); } catch (e) {
          if (kind === 'delete') report('leaderboard-delete-failed', { code: e?.code || e?.name || 'Error', ...(e?.detail && { server: String(e.detail).slice(0, 64) }) });
          throw e;
        }
        if (r !== req) return;
        store.remove(aliasKey); // the nickname goes with the profile (or the session); local records and settings stay
        finish(CONFIRM[kind].done);
      }
    } catch (e) {
      if (r !== req) return;
      setStatus(e?.message || 'Ara mateix no s’ha pogut. Torna-ho a provar.');
      if (e?.code === 'noprofile') show('mail');
      idle();
    }
  }
  cancelBtn.addEventListener('click', () => { if (!busy) menu.close(); });
  menu.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  menu.addEventListener('close', () => {
    req++; busy = false; clearTimeout(closeTimer); captcha?.cancel(); cancelBtn.hidden = false;
    const b = back; back = null; b?.();
  });
  return { open, refresh, forget, get isOpen() { return menu.open; } };
}
