// The player's profile (docs/rankings-strategy.md §6): the block at the top of the Perfil sheet (#account-menu,
// src/ui/account-ui.js) and the steps sheet (#profile-menu). A guest («Convidat», no confirmed e-mail) keeps its name with
// four digits («Timbaler#3821») in this browser, with no deadline; confirming an e-mail (a 6-digit code sent there) earns
// the «Correu confirmat» check, brings the profile back on any device (no password, no Google) and asks for a clean name
// («Tria el teu nom», no #). The block shows the name, the state, and only the buttons that fit it:
//   none     no profile                     → Crea · Recupera
//   stale    a name, but no profile here    → Recupera · Oblida el nom (local only)
//   guest    profile, not confirmed         → Confirma el correu · Esborra el perfil
//   named    confirmed, still «nom#1234»    → Tria el teu nom · Tanca la sessió · Esborra el perfil
//   linked   confirmed, a clean name        → Tanca la sessió · Esborra el perfil
// The sheet's steps: alias (create), mail → code (link / recover) → choose (a confirmed guest), confirm (delete / sign
// out), done. «Crea» makes the guest profile with just a nickname, before any result (service.createProfile).
// src/services/leaderboard.js does the work; Turnstile is board-ui.js's (one widget).
import { leaderboard as defaultService, rememberIdentity, TAG_KEY } from '../services/leaderboard.js';
import { cleanEmail } from '../services/feedback.js';
import { checkAlias } from '../services/alias-rules.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton } from './sheet-kit.js';
import { GUEST, GUEST_TEXT, appendName } from './profile-notes.js';
import { tr } from '../i18n/messages.js';

const maskEmail = m => { const [u = '', d = ''] = m.split('@'); return `${u.slice(0, 1)}***@${d}`; };
const CONFIRM = {
  delete: { title: tr('ui.profile.delete.title'), yes: tr('ui.profile.delete.yes'), done: tr('ui.profile.delete.done'),
    lead: () => tr('ui.profile.delete.lead') },
  signout: { title: tr('ui.profile.signout.title'), yes: tr('ui.profile.signout.yes'), done: tr('ui.profile.signout.done'),
    lead: mail => tr('ui.profile.signout.lead', { mail }) },
};
const CHOOSE_LEAD = tr('ui.profile.chooseLead');

// acceptStats(): creating a profile here showed the statistics notice (src/services/stats-sync.js may send them now)
export function setupProfile({ focusIn, captcha, store, aliasKey, deviceNote = () => '', service = defaultService, doc = document, report = errors.report,
  acceptStats = () => {} }) {
  const $ = byId(doc);
  const menu = $('profile-menu'), form = $('profile-form'), mailIn = $('profile-email'), aliasIn = $('profile-alias'), codeIn = $('profile-code');
  const status = $('profile-status'), sendBtn = $('profile-send'), cancelBtn = $('profile-cancel'), keepBtn = $('profile-keep'), lead = $('profile-lead');
  const row = $('profile-row'), nameEl = $('profile-name'), kindEl = $('profile-kind'), sub = $('profile-sub');
  const btns = [$('profile-main'), $('profile-alt'), $('profile-more')];
  const online = Boolean(service.configured), canLink = online && service.publishingEnabled; // deleting stays possible with publishing off
  let step = 'mail', kind = '', type = '', mail = '', busy = false, req = 0, back = null, settingsReq = 0, closeTimer = null;
  let email = ''; // the address on the profile shown in the block (for «Tanca la sessió»)

  const setStatus = statusLine(status);
  const label = () => ({ alias: tr('ui.profile.btn.createProfile'), mail: tr('ui.profile.btn.sendCode'), code: tr('ui.profile.btn.checkCode'), choose: tr('ui.profile.btn.saveName'), confirm: CONFIRM[kind]?.yes }[step] ?? tr('ui.profile.btn.close'));
  // disabled = working: a plain ring spins in the button (index.html .btn-spin, as in feedback-ui.js)
  const setSend = (text, disabled = false) => setButton(doc, sendBtn, text, disabled);
  const show = s => {
    step = s;
    $('profile-alias-field').hidden = s !== 'alias' && s !== 'choose'; $('profile-mail-field').hidden = s !== 'mail'; $('profile-code-field').hidden = s !== 'code';
    $('profile-note').hidden = s !== 'mail' && s !== 'code'; $('profile-stats-note').hidden = s !== 'alias';
    $('profile-alias-label').textContent = tr(s === 'choose' ? 'ui.profile.field.name' : 'ui.profile.field.alias');
    keepBtn.hidden = s !== 'confirm'; sendBtn.classList.toggle('btn-primary', s !== 'confirm'); sendBtn.classList.toggle('btn-secondary', s === 'confirm'); // delete / sign out: «Cancel·la» leads
    setSend(label());
  };
  const idle = () => { busy = false; mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = false; setSend(label()); };
  const savedTag = () => { const t = Number(store.get(TAG_KEY)); return store.get(TAG_KEY) != null && Number.isInteger(t) ? t : null; };
  // the server's name for this profile, kept apart: the raw alias under aliasKey, the tag under TAG_KEY (an old tab reads the alias)
  const remember = prof => { if (prof?.alias) rememberIdentity(store, aliasKey, prof); };

  // --- the block (Perfil sheet)
  // the last answer of service.identity() / profile(): the next open paints from it, so nothing jumps. Kept in the store
  // too: after a while away the session needs a network round-trip to refresh, and the block must not sit blank meanwhile.
  const knownKey = `${aliasKey}:identity`;
  let known = null;
  try {
    const k = JSON.parse(store.get(knownKey) || 'null');
    if (k && typeof k.hasSession === 'boolean') known = { hasSession: k.hasSession, mailOn: String(k.mailOn || ''), persistent: k.persistent !== false, prof: k.prof || null };
  } catch {}
  function paint({ alias, hasSession, mailOn, persistent, prof = null }) {
    delete row.dataset.pending;
    // confirmed is the server's answer; without one (offline, an older server) a confirmed address on the session
    const confirmed = prof ? prof.verified : Boolean(mailOn);
    const tag = prof ? prof.tag ?? null : savedTag();
    const state = hasSession ? (confirmed ? (Number.isInteger(tag) ? 'named' : 'linked') : 'guest') : alias ? 'stale' : 'none';
    email = mailOn;
    const set = (i, act, text, on = true) => { const b = btns[i]; b.hidden = !on; b.dataset.act = act; b.textContent = text; };
    nameEl.replaceChildren(); // as the boards show it: a guest's «#1234» quieter, the check for a confirmed address
    if (state !== 'none') appendName(doc, nameEl, { alias, tag: hasSession ? tag : null, verified: confirmed && hasSession });
    kindEl.hidden = state !== 'guest'; kindEl.textContent = GUEST;
    btns[2].hidden = true;
    if (state === 'none') { sub.textContent = tr('ui.profile.sub.none'); set(0, 'create', tr('ui.profile.btn.create'), canLink); set(1, 'recover', tr('ui.profile.btn.recover'), canLink); }
    else if (state === 'stale') { sub.textContent = tr('ui.profile.sub.stale'); set(0, 'recover', tr('ui.profile.btn.recover'), canLink); set(1, 'forget', tr('ui.profile.btn.forget')); }
    else if (state === 'guest') {
      sub.textContent = [GUEST_TEXT, deviceNote(persistent)].filter(Boolean).join(' ');
      set(0, 'link', tr('ui.profile.btn.link'), canLink); set(1, 'delete', tr('ui.profile.btn.delete'));
    } else {
      sub.textContent = tr(`ui.profile.sub.${mailOn ? 'mail' : 'nomail'}${state === 'named' ? 'Named' : ''}`, { mail: mailOn && maskEmail(mailOn) });
      if (state === 'named') { set(0, 'choose', tr('ui.profile.btn.choose'), canLink); set(1, 'signout', tr('ui.profile.btn.signout')); set(2, 'delete', tr('ui.profile.btn.delete')); }
      else { set(0, 'signout', tr('ui.profile.btn.signout')); set(1, 'delete', tr('ui.profile.btn.delete')); }
    }
    row.dataset.state = state;
  }
  async function refresh() {
    if (!online) { row.hidden = true; return; }
    row.hidden = false;
    const r = ++settingsReq, alias = store.get(aliasKey) || '';
    // the first frame: the last answer; with a name but no answer yet, a guest's block in no colour (the commonest answer: the same
    // size, so repainting moves nothing; guessing «stale» moved the buttons and the line under the name); no name: «Encara no en tens cap.»
    if (known && alias) paint({ alias, ...known });
    else if (alias) { row.dataset.pending = '1'; nameEl.replaceChildren(); appendName(doc, nameEl, { alias, tag: 0, verified: false }); kindEl.hidden = false; kindEl.textContent = GUEST; sub.textContent = [GUEST_TEXT, deviceNote(true)].filter(Boolean).join(' '); [tr('ui.profile.btn.link'), tr('ui.profile.btn.delete')].forEach((t, i) => { btns[i].hidden = false; btns[i].textContent = t; delete btns[i].dataset.act; }); btns[2].hidden = true; }
    else paint({ alias, hasSession: false, mailOn: '', persistent: true });
    let id, prof = null, gone = false;
    try {
      id = await service.identity();
    } catch { if (r === settingsReq && row.dataset.pending) paint({ alias, hasSession: false, mailOn: '', persistent: true }); return; } // offline: what the memory says stands
    // no answer from my_profile (offline, an older server): the last one stands
    if (id.hasSession && service.profile) try { prof = await service.profile(); gone = prof === null; } catch { prof = known?.prof ?? null; }
    if (r !== settingsReq) return;
    // the row of a remembered guest is gone (deleted elsewhere, or 12 months without playing): the session left here is
    // useless (as on the publish sheet), so this browser leaves it; the next profile starts from scratch
    if (gone && alias && !id.email) { try { await service.signOut(); } catch { /* the next publication starts over anyway */ } id = { ...id, hasSession: false }; prof = null; }
    if (r !== settingsReq) return;
    if (prof) remember(prof);
    const name = prof?.alias || alias;
    known = { hasSession: id.hasSession, mailOn: id.email || '', persistent: id.persistent !== false, prof };
    store.set(knownKey, JSON.stringify(known));
    paint({ alias: name, ...known });
  }
  function forget() { store.remove(aliasKey); store.remove(TAG_KEY); refresh(); }

  // --- the sheet
  function open(what, onBack = null) {
    if (!online || menu.open) return;
    kind = what; back = onBack; req++; busy = false; mail = ''; type = '';
    mailIn.value = codeIn.value = aliasIn.value = ''; setStatus('');
    mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = false;
    cancelBtn.hidden = false;
    if (what === 'create') {
      $('profile-title').textContent = tr('ui.profile.title.create');
      lead.textContent = tr('ui.profile.lead.create');
      show('alias');
    } else if (what === 'choose') {
      $('profile-title').textContent = tr('ui.profile.title.choose'); lead.textContent = CHOOSE_LEAD;
      show('choose');
    } else if (what === 'link' || what === 'recover') {
      $('profile-title').textContent = tr(`ui.profile.title.${what}`);
      lead.textContent = tr(`ui.profile.lead.${what}`);
      show('mail');
    } else {
      $('profile-title').textContent = CONFIRM[what].title; lead.textContent = CONFIRM[what].lead(email);
      show('confirm');
    }
    menu.showModal();
    focusIn(menu, step === 'alias' || step === 'choose' ? 'profile-alias' : step === 'mail' ? 'profile-email' : 'profile-keep'); // a confirmation starts on the safe button
  }

  mailIn.addEventListener('input', () => { const c = cleanEmail(mailIn.value); if (c !== mailIn.value) mailIn.value = c; });
  codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.replace(/\D/g, '').slice(0, 6); });
  form.addEventListener('submit', e => { e.preventDefault(); send(); });
  function finish(text) { // the result for a beat, then back
    step = 'done'; busy = false; cancelBtn.hidden = keepBtn.hidden = true;
    sendBtn.classList.replace('btn-secondary', 'btn-primary');
    for (const id of ['profile-alias-field', 'profile-mail-field', 'profile-code-field', 'profile-note', 'profile-stats-note']) $(id).hidden = true;
    lead.textContent = ''; setSend(tr('ui.profile.btn.close')); setStatus(text, true);
    closeTimer = setTimeout(() => { if (menu.open) menu.close(); }, 2000);
    refresh();
  }
  // «Tria el teu nom» right after the code confirmed this profile (decision 33): the same sheet, an empty field. Closing it
  // keeps «nom#1234»; the block asks again (named).
  function choose() {
    $('profile-title').textContent = tr('ui.profile.title.choose'); lead.textContent = CHOOSE_LEAD;
    aliasIn.value = ''; show('choose'); idle(); setStatus(tr('ui.profile.done.mailConfirmed'), true);
    focusIn(menu, 'profile-alias');
    refresh();
  }
  async function send() {
    if (step === 'done') { menu.close(); return; }
    if (busy) return;
    const r = ++req;
    if (step === 'alias' || step === 'choose') { const a = checkAlias(aliasIn.value); if (!a.ok) { setStatus(a.message); aliasIn.focus(); return; } } // nothing sent
    busy = true; setStatus('');
    setSend(tr('ui.profile.btn.working'), true); mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = true;
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
        store.set(aliasKey, alias); store.remove(TAG_KEY);
        try { remember(await service.profile?.()); } catch { /* the block asks again */ }
        acceptStats(); // the notice was on this step
        if (r !== req) return;
        finish(tr('ui.profile.done.created'));
      } else if (step === 'choose') {
        const alias = await service.chooseVerifiedAlias(aliasIn.value);
        if (r !== req) return;
        rememberIdentity(store, aliasKey, { alias, tag: null });
        finish(tr('ui.profile.done.nameSaved'));
      } else if (step === 'mail') {
        const out = await service.sendCode(mailIn.value, { captchaToken });
        if (r !== req) return;
        mail = mailIn.value; type = out.type;
        // the address already confirmed another profile: the code switches to that one, nothing is merged
        const other = kind === 'link' && type === 'email', mine = store.get(aliasKey);
        lead.textContent = other ? tr('ui.profile.lead.codeOther', { mail, mine: mine || tr('ui.profile.thisBrowser') })
          : tr('ui.profile.lead.codeSent', { mail });
        codeIn.value = ''; show('code'); idle(); focusIn(menu, 'profile-code');
      } else if (step === 'code') {
        await service.verifyCode(mail, codeIn.value, type);
        if (r !== req) return;
        // the server decides who this browser is now and whether it is confirmed (a code for a pending change alone proves nothing)
        let prof = null;
        try { prof = await service.profile?.(); } catch { /* the block asks again */ }
        if (r !== req) return;
        if (type === 'email') { // signed in to an existing profile: bring its name back to this browser
          if (prof) remember(prof); else try { const alias = await service.myAlias(); if (alias) { store.set(aliasKey, alias); store.remove(TAG_KEY); } } catch { /* asked again on the next publication */ }
          if (r !== req) return;
          finish(tr(kind === 'link' ? 'ui.profile.done.switched' : 'ui.profile.done.recovered'));
          return;
        }
        if (prof) remember(prof);
        if (prof?.verified && Number.isInteger(prof.tag)) { choose(); return; }
        finish(tr(prof?.verified ? 'ui.profile.done.mailConfirmed' : 'ui.profile.done.codeChecked'));
      } else { // confirm
        try { await (kind === 'delete' ? service.deleteProfile() : service.signOut()); } catch (e) {
          if (kind === 'delete') report('leaderboard-delete-failed', { code: e?.code || e?.name || 'Error', ...(e?.detail && { server: String(e.detail).slice(0, 64) }) });
          throw e;
        }
        if (r !== req) return;
        store.remove(aliasKey); store.remove(TAG_KEY); // the name goes with the profile (or the session); local records and settings stay
        finish(CONFIRM[kind].done);
      }
    } catch (e) {
      if (r !== req) return;
      setStatus(e?.message || tr('ui.profile.failed'));
      if (e?.code === 'noprofile') show('mail');
      idle();
      if (step === 'choose' || step === 'alias') aliasIn.focus(); // a name somebody has: another try, right there
    }
  }
  cancelBtn.addEventListener('click', () => { if (!busy) menu.close(); });
  keepBtn.addEventListener('click', () => { if (!busy) menu.close(); });
  menu.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  menu.addEventListener('close', () => {
    req++; busy = false; clearTimeout(closeTimer); captcha?.cancel(); cancelBtn.hidden = false;
    const b = back; back = null; b?.();
  });
  return { open, refresh, forget, get isOpen() { return menu.open; }, get choosing() { return menu.open && step === 'choose'; },
    get state() { return row.dataset.state; } };
}
