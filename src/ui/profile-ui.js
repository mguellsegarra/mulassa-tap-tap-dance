// The player's profile, in one place (⚙ Configuració «Perfil» block + #profile-menu, index.html). A guest profile lives in one
// browser's storage and, without a confirmed e-mail, keeps its nickname and results 7 days from its first publication
// (src/ui/profile-notes.js, 202610180001). Confirming an e-mail (a 6-digit code sent there) removes the deadline, earns the
// «Correu confirmat» check and brings the profile back on any device: no password, no Google. The block shows the
// nickname, the state, and only the buttons that fit it:
//   none     no profile                  → Crea · Recupera
//   stale    a name, but no profile here → Recupera · Oblida el nom (local only)
//   expired  its deadline passed         → Crea · Oblida el nom (this browser leaves the old session)
//   guest    profile, not confirmed      → Confirma el correu · Esborra el perfil (the deadline, or the 7-day notice)
//   linked   confirmed (server's answer) → Tanca la sessió · Esborra el perfil
// The sheet's steps: alias (create), mail → code (link / recover), confirm (delete / sign out), done. «Crea» makes the
// guest profile with just a nickname, before any result (service.createProfile). src/services/leaderboard.js does the
// work (sendCode: an address that already owns a profile signs in to it instead); Turnstile is board-ui.js's (one widget).
import { leaderboard as defaultService } from '../services/leaderboard.js';
import { cleanEmail } from '../services/feedback.js';
import { checkAlias } from '../services/alias-rules.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton, whenSeen } from './sheet-kit.js';
import { KEEP_NOTICE, VERIFIED, EXPIRED_TEXT, RESERVED_TEXT, untilText, checkBadge } from './profile-notes.js';

const maskEmail = m => { const [u = '', d = ''] = m.split('@'); return `${u.slice(0, 1)}***@${d}`; };
const CONFIRM = {
  delete: { title: 'Esborrar el perfil?', yes: 'Sí, esborra-ho tot', done: 'Perfil esborrat. Els rècords d’aquest dispositiu es mantenen.',
    lead: () => 'S’esborraran el sobrenom, els resultats publicats i el correu, a tots els nivells. No es pot desfer. Els rècords d’aquest dispositiu es mantenen.' },
  signout: { title: 'Tancar la sessió?', yes: 'Sí, tanca la sessió', done: 'Sessió tancada.',
    lead: mail => `Aquest navegador oblidarà el perfil. El recuperaràs amb un codi enviat a ${mail}.` },
};

// `seen(el, cb)`: cb once el has been read on screen (src/ui/sheet-kit.js; returns a cancel): the 7-day notice is
// acknowledged only then; `now`: the clock
export function setupProfile({ focusIn, captcha, store, aliasKey, deviceNote = () => '', service = defaultService, doc = document, report = errors.report,
  seen = whenSeen, now = () => Date.now() }) {
  const $ = byId(doc);
  const menu = $('profile-menu'), form = $('profile-form'), mailIn = $('profile-email'), aliasIn = $('profile-alias'), codeIn = $('profile-code');
  const status = $('profile-status'), sendBtn = $('profile-send'), cancelBtn = $('profile-cancel'), lead = $('profile-lead');
  const row = $('settings-profile-row'), nameEl = $('settings-profile-name'), sub = $('settings-profile-sub');
  const mainBtn = $('settings-profile-main'), altBtn = $('settings-profile-alt');
  const online = Boolean(service.configured), canLink = online && service.publishingEnabled; // deleting stays possible with publishing off
  let step = 'mail', kind = '', type = '', mail = '', busy = false, req = 0, back = null, settingsReq = 0, closeTimer = null;
  let email = ''; // the address on the profile shown in the block (for «Tanca la sessió»)
  let acking = false, unwatch = null; // the notice being watched (its cancel), and one acknowledgement on its way at a time
  let badge = null; // the «Correu confirmat» check next to the name, made when first needed

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
  // prof: the server's view (service.profile()), null = unknown or no row; expired: this browser's profile ran out (kept
  // until a new profile or «Oblida el nom»)
  try {
    const k = JSON.parse(store.get(knownKey) || 'null');
    if (k && typeof k.hasSession === 'boolean') known = { hasSession: k.hasSession, mailOn: String(k.mailOn || ''), persistent: k.persistent !== false, prof: k.prof || null, expired: k.expired === true };
  } catch {}
  function paint({ alias, hasSession, mailOn, persistent, prof = null, expired = false }) {
    delete row.dataset.pending;
    // confirmed is the server's answer; without one (offline, an older server) a confirmed address on the session
    const confirmed = prof ? prof.verified : Boolean(mailOn);
    // a remembered deadline already past (the first frame, or offline): it ran out, whatever the next answer says
    const past = !confirmed && prof?.expiresAt != null && prof.expiresAt <= now();
    const state = (expired || past) && alias ? 'expired' : hasSession ? (confirmed ? 'linked' : 'guest') : alias ? 'stale' : 'none';
    email = mailOn;
    const set = (btn, act, text, on = true) => { btn.hidden = !on; btn.dataset.act = act; btn.textContent = text; };
    nameEl.textContent = alias;
    if (state === 'linked') nameEl.append?.(badge ??= checkBadge(doc));
    if (state === 'none') { sub.textContent = 'Encara no en tens cap.'; set(mainBtn, 'create', 'Crea', canLink); set(altBtn, 'recover', 'Recupera', canLink); }
    else if (state === 'stale') { sub.textContent = 'Aquest navegador ja no té el perfil.'; set(mainBtn, 'recover', 'Recupera', canLink); set(altBtn, 'forget', 'Oblida el nom'); }
    else if (state === 'expired') { sub.textContent = EXPIRED_TEXT; set(mainBtn, 'create', 'Crea', canLink); set(altBtn, 'forget', 'Oblida el nom'); }
    else if (state === 'guest') {
      sub.textContent = prof?.expiresAt ? untilText(prof.expiresAt) : prof?.noticeNeeded ? KEEP_NOTICE : prof?.published === false ? RESERVED_TEXT : deviceNote(persistent) || 'Només viu en aquest navegador.';
      set(mainBtn, 'link', 'Confirma el correu', canLink); set(altBtn, 'delete', 'Esborra el perfil');
    } else { sub.textContent = mailOn ? `${VERIFIED}: ${maskEmail(mailOn)}` : VERIFIED; set(mainBtn, 'signout', 'Tanca la sessió'); set(altBtn, 'delete', 'Esborra el perfil'); }
    row.hidden = mainBtn.hidden && altBtn.hidden;
    row.dataset.state = state;
    if (state === 'guest' && prof?.noticeNeeded) acknowledge(alias); else stopWatch();
  }
  const stopWatch = () => { unwatch?.(); unwatch = null; };
  row.closest?.('dialog')?.addEventListener('close', stopWatch); // Configuració closed: nothing more is read
  // An old profile with results meets the 7-day notice here: once it has been read on screen (a second, scrolled into
  // view, nothing over it), the server starts its 7 days (once; a failed call leaves the notice up and tries again on the
  // next opening, never sooner than the notice is read again)
  function acknowledge(alias) {
    if (unwatch || acking) return;
    unwatch = seen(sub, async () => {
      unwatch = null;
      if (row.dataset.state !== 'guest' || sub.textContent !== KEEP_NOTICE || store.get(aliasKey) !== alias) return; // repainted since
      acking = true;
      try {
        const until = await service.ackNotice();
        // the answer is this profile's only while the block still shows it (a recovery may have switched profiles meanwhile)
        if (!until || !known?.prof?.noticeNeeded || store.get(aliasKey) !== alias) return;
        known = { ...known, prof: { ...known.prof, expiresAt: until, noticeNeeded: false } };
        store.set(knownKey, JSON.stringify(known));
        if (row.dataset.state === 'guest') paint({ alias, ...known });
      } catch { /* the notice stays; acknowledged on a later opening */ } finally { acking = false; }
    });
  }
  async function refresh() {
    if (!online) { row.hidden = true; return; }
    const r = ++settingsReq, alias = store.get(aliasKey) || '';
    // the first frame: the last answer; with a name but no answer yet, a blank row of the same size (guessing «stale» and then
    // repainting «Protegit amb…» moved the buttons and the line under the name); no name: «Encara no en tens cap.»
    if (known && alias) paint({ alias, ...known });
    else if (alias) { row.hidden = false; row.dataset.pending = '1'; nameEl.textContent = alias; sub.textContent = '\u00a0'; for (const b of [mainBtn, altBtn]) { b.hidden = false; b.textContent = '\u00a0'; } }
    else paint({ alias, hasSession: false, mailOn: '', persistent: true });
    let id, prof = null, gone = false;
    try {
      id = await service.identity();
    } catch { if (r === settingsReq && row.dataset.pending) paint({ alias, hasSession: false, mailOn: '', persistent: true }); return; } // offline: what the memory says stands
    // no answer from my_profile (offline, an older server): the last one stands
    if (id.hasSession && service.profile) try { prof = await service.profile(); gone = prof === null; } catch { prof = known?.prof ?? null; }
    if (r !== settingsReq) return;
    // a deadline the server gave this name, now past (a confirmed profile has none)
    const knownPast = Boolean(alias && !known?.prof?.verified && known?.prof?.expiresAt && known.prof.expiresAt <= now());
    // ran out: the server says so, or the row is gone after that deadline
    const ranOut = id.hasSession && alias && (prof?.expired || (!prof && knownPast));
    // no session any more (the purge took the account with it): still «expired», not «stale», when it is known to have run out
    const expired = ranOut || (!id.hasSession && (known?.expired === true || knownPast));
    // either way, or the row of a remembered name without a confirmed address is gone (its account with it): the session
    // left here is useless (as on the publish sheet), so this browser leaves it; the next profile starts from scratch
    if (ranOut || (gone && alias && !id.email)) { try { await service.signOut(); } catch { /* the next publication starts over anyway */ } id = { ...id, hasSession: false }; prof = null; }
    if (r !== settingsReq) return;
    known = { hasSession: id.hasSession, mailOn: id.email || '', persistent: id.persistent !== false, prof, expired };
    store.set(knownKey, JSON.stringify(known));
    paint({ alias, ...known });
  }
  function forget() { store.remove(aliasKey); if (known) store.set(knownKey, JSON.stringify(known = { ...known, expired: false })); refresh(); }

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
      $('profile-title').textContent = what === 'link' ? 'Confirma el correu' : 'Recupera el perfil';
      lead.textContent = what === 'link' ? 'Amb el correu confirmat, el teu nom i els resultats es conserven sense data de caducitat, i pots recuperar el perfil amb un codi en qualsevol dispositiu. Sense contrasenya. Si algun dia hi ha tornejos, també caldrà tenir-lo confirmat.'
        : 'Escriu el correu que vas confirmar al perfil i t’enviarem un codi per entrar-hi. Sense contrasenya.';
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
        if (known) store.set(knownKey, JSON.stringify(known = { ...known, expired: false })); // a new profile: the old one's notice goes
        finish('Perfil creat!');
      } else if (step === 'mail') {
        const out = await service.sendCode(mailIn.value, { captchaToken });
        if (r !== req) return;
        mail = mailIn.value; type = out.type;
        // the address already confirmed another profile: the code switches to that one, nothing is merged
        const other = kind === 'link' && type === 'email', mine = store.get(aliasKey);
        lead.textContent = other ? `Aquest correu ja és d’un altre perfil. Amb el codi que t’hem enviat a ${mail} entraràs en aquell perfil: ${mine || 'el d’aquest navegador'} i els seus resultats no s’hi afegeixen.`
          : `T’hem enviat un codi de 6 xifres a ${mail}. Mira també la carpeta de correu brossa.`;
        codeIn.value = ''; show('code'); idle(); focusIn(menu, 'profile-code');
      } else if (step === 'code') {
        await service.verifyCode(mail, codeIn.value, type);
        if (r !== req) return;
        if (type === 'email') { // signed in to an existing profile: bring its nickname back to this browser
          try { const alias = await service.myAlias(); if (alias) store.set(aliasKey, alias); } catch { /* asked again on the next publication */ }
          if (r !== req) return;
          if (known) store.set(knownKey, JSON.stringify(known = { ...known, expired: false }));
          finish(kind === 'link' ? 'Ara fas servir aquell perfil.' : 'Perfil recuperat!');
          return;
        }
        // the server decides it is confirmed (a code for a pending change alone proves nothing to the board)
        let ok = false;
        try { ok = (await service.profile?.())?.verified === true; } catch { /* the block asks again */ }
        if (r !== req) return;
        finish(ok ? 'Correu confirmat!' : 'Codi comprovat.');
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
