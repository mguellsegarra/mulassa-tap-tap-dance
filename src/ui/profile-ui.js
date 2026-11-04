// The player's profile (docs/rankings/strategy.md §6): the block at the top of the Perfil sheet (#account-menu,
// src/ui/account-ui.js) and the steps sheet (#profile-menu). A guest («Convidat», no confirmed e-mail) keeps its plain name in
// this browser; confirming an e-mail (a 6-digit code sent there) earns the «Correu confirmat» check, keeps the name for good
// and brings the profile back on any device (no password, no Google). A guest idle for 30 days can lose its name to somebody
// else (released): it keeps its results and is asked for another name. The block shows the name, the state, and only the
// buttons that fit it:
//   none     no profile                     → Crea · Recupera
//   stale    a name, but no profile here    → Recupera · Oblida el nom (local only)
//   guest    profile, not confirmed         → Confirma el correu · Esborra el perfil
//   released its name is somebody else's    → Tria un altre nom · Esborra el perfil
//   linked   confirmed                      → Tanca la sessió · Esborra el perfil
//   unnamed  confirmed, no name yet         → Crea · Tanca la sessió · Esborra el perfil
// The sheet's steps: alias (create, or the new name of a released profile), mail → code (link / recover), confirm (delete /
// sign out), switch (the address owns another profile: go there, this guest is deleted, or another address), done. «Crea» makes the guest profile with just a nickname, before any result (service.createProfile).
// src/services/leaderboard.js does the work; Turnstile is board-ui.js's (one widget).
import { leaderboard as defaultService } from '../services/leaderboard.js';
import { rememberIdentity } from '../services/leaderboard-identity.js';
import { cleanEmail } from '../services/feedback.js';
import { checkAlias } from '../services/alias-rules.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton, trMarked } from './sheet-kit.js';
import { GUEST, GUEST_TEXT, appendName, BADGE_PENCIL, labelProfileBtn } from './profile-notes.js';
import { tr } from '../i18n/messages.js';

const CONFIRM = {
  delete: { title: tr('ui.profile.delete.title'), yes: tr('ui.profile.delete.yes'), done: tr('ui.profile.delete.done'),
    lead: () => tr('ui.profile.delete.lead') },
  signout: { title: tr('ui.profile.signout.title'), yes: tr('ui.profile.signout.yes'), done: tr('ui.profile.signout.done'),
    lead: mail => tr('ui.profile.signout.lead', { mail }) },
};

// acceptStats(): creating a profile here showed the statistics notice (src/services/stats-sync.js may send them now)
export function setupProfile({ focusIn, captcha, store, aliasKey, deviceNote = () => '', service = defaultService, doc = document, report = errors.report,
  acceptStats = () => {} }) {
  const $ = byId(doc);
  const menu = $('profile-menu'), form = $('profile-form'), mailIn = $('profile-email'), aliasIn = $('profile-alias'), codeIn = $('profile-code');
  const status = $('profile-status'), sendBtn = $('profile-send'), cancelBtn = $('profile-cancel'), keepBtn = $('profile-keep'), lead = $('profile-lead');
  const row = $('profile-row'), nameEl = $('profile-name'), kindEl = $('profile-kind'), sub = $('profile-sub');
  const btns = [$('profile-main'), $('profile-alt'), $('profile-more')];
  const online = Boolean(service.configured), canLink = online && service.publishingEnabled; // deleting stays possible with publishing off
  let step = 'mail', kind = '', type = '', mail = '', leave = null, busy = false, req = 0, back = null, settingsReq = 0, closeTimer = null, linkNext = false;
  let email = ''; // the address on the profile shown in the block (for «Tanca la sessió»)

  const setStatus = statusLine(status);
  const label = () => ({ alias: tr(kind === 'rename' ? 'ui.profile.btn.saveName' : 'ui.profile.btn.createProfile'), mail: tr('ui.profile.btn.sendCode'), switch: tr('ui.profile.btn.sendCode'), code: tr('ui.profile.btn.checkCode'), confirm: CONFIRM[kind]?.yes }[step] ?? tr('ui.profile.btn.close'));
  // disabled = working: a plain ring spins in the button (index.html .btn-spin, as in feedback-ui.js)
  const setSend = (text, disabled = false) => setButton(doc, sendBtn, text, disabled);
  const show = s => {
    step = s;
    $('profile-alias-field').hidden = s !== 'alias'; $('profile-mail-field').hidden = s !== 'mail'; $('profile-code-field').hidden = s !== 'code';
    $('profile-note').hidden = s !== 'mail' && s !== 'code'; $('profile-stats-note').hidden = s !== 'alias' || kind === 'rename'; // a rename is no new profile: no statistics notice
    $('profile-alias-label').textContent = tr(kind === 'rename' ? 'ui.profile.field.name' : 'ui.profile.field.alias');
    const ask = s === 'confirm' || s === 'switch'; // delete / sign out / leave this guest: «Cancel·la» leads
    keepBtn.hidden = !ask; sendBtn.classList.toggle('btn-primary', !ask); sendBtn.classList.toggle('btn-secondary', ask);
    setSend(label());
  };
  const idle = () => { busy = false; mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = false; setSend(label()); };
  // the server's name for this profile, under aliasKey
  const remember = prof => { if (prof?.alias) rememberIdentity(store, aliasKey, prof); };

  // --- the block (Perfil sheet)
  // the last answer of service.identity() / profile(): the next open paints from it, so nothing jumps. Kept in the store
  // too: after a while away the session needs a network round-trip to refresh, and the block must not sit blank meanwhile.
  const knownKey = `${aliasKey}:identity`;
  let known = null;
  // read when the block opens: refreshIdentity (the start) writes this key after this sheet was set up
  function readKnown() {
    try {
      const k = JSON.parse(store.get(knownKey) || 'null');
      if (k && typeof k.hasSession === 'boolean') known = { hasSession: k.hasSession, mailOn: String(k.mailOn || ''), persistent: k.persistent !== false, prof: k.prof || null, noRow: k.noRow === true };
    } catch {}
  }
  readKnown();
  // the mark beside the name is what you tap to change it (src/ui/badge-picker.js), with a pencil saying so
  function badgeEntry() {
    const mark = nameEl.querySelector('.verified-check, .player-badge'), b = doc.createElement('button');
    if (!mark) return;
    b.type = 'button'; b.className = 'badge-edit'; b.dataset.act = 'badge'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', tr('ui.badge.entry'));
    mark.replaceWith(b); b.append(mark); b.insertAdjacentHTML('beforeend', BADGE_PENCIL);
  }
  function paint({ alias, hasSession, mailOn, persistent, prof = null, noRow = false }) {
    if (noRow) alias = ''; // no row on the server: a name kept here is not this session's
    delete row.dataset.pending;
    // confirmed is the server's answer; without one (offline, an older server) a confirmed address on the session
    const confirmed = prof ? prof.verified : Boolean(mailOn);
    // no row, by the server's own answer (a name merely unknown here stays as it was): a guest session is no profile yet («Crea»
    // with a taken name; «Crea» again names that same session), a confirmed one is «unnamed» (update_alias names it)
    const state = hasSession && !(noRow && !confirmed) ? (confirmed ? (noRow ? 'unnamed' : 'linked') : prof?.released ? 'released' : 'guest') : alias ? 'stale' : 'none';
    email = mailOn;
    const set = (i, act, text, on = true) => { const b = btns[i]; b.hidden = !on; b.dataset.act = act; labelProfileBtn(b, act, text); };
    nameEl.replaceChildren(); // as the boards show it: the check for a confirmed address, a released name faded
    if (state !== 'none') appendName(doc, nameEl, { alias, verified: confirmed && hasSession, released: state === 'released', badgeId: prof?.badgeId });
    kindEl.hidden = state !== 'guest'; kindEl.textContent = GUEST;
    btns[2].hidden = true;
    if (state === 'none') { sub.textContent = tr('ui.profile.sub.none'); set(0, 'create', tr('ui.profile.btn.create'), canLink); set(1, 'recover', tr('ui.profile.btn.recover'), canLink); }
    else if (state === 'stale') { sub.textContent = tr('ui.profile.sub.stale'); set(0, 'recover', tr('ui.profile.btn.recover'), canLink); set(1, 'forget', tr('ui.profile.btn.forget')); }
    else if (state === 'guest') {
      sub.textContent = [GUEST_TEXT, deviceNote(persistent)].filter(Boolean).join(' ');
      set(0, 'link', tr('ui.profile.btn.link'), canLink); set(1, 'delete', tr('ui.profile.btn.delete'));
    } else if (state === 'released') {
      sub.textContent = tr('ui.profile.lead.released');
      set(0, 'rename', tr('ui.profile.btn.rename'), canLink); set(1, 'delete', tr('ui.profile.btn.delete'));
    } else if (state === 'unnamed') {
      sub.textContent = tr('ui.profile.sub.none');
      set(0, 'create', tr('ui.profile.btn.create'), canLink); set(1, 'signout', tr('ui.profile.btn.signout')); set(2, 'delete', tr('ui.profile.btn.delete'));
    } else {
      sub.textContent = '';
      if (canLink && prof?.canBadge === true) badgeEntry();
      set(0, 'signout', tr('ui.profile.btn.signout')); set(1, 'delete', tr('ui.profile.btn.delete'));
    }
    row.dataset.state = state;
  }
  async function refresh() {
    if (!online) { row.hidden = true; return; }
    row.hidden = false;
    const r = ++settingsReq, alias = store.get(aliasKey) || '';
    // the first frame: the last answer; with a name but no answer yet, a name and two buttons in no colour (promises no state; a
    // confirmed profile lands on the same size, a guest's line appears under the name); no name: «Encara no en tens cap.»
    if (!known) readKnown();
    if (known && alias) paint({ alias, ...known });
    else if (alias) { row.dataset.pending = '1'; nameEl.replaceChildren(); appendName(doc, nameEl, { alias, verified: false }); kindEl.hidden = true; sub.textContent = ''; [['link', tr('ui.profile.btn.link')], ['delete', tr('ui.profile.btn.delete')]].forEach(([act, t], i) => { btns[i].hidden = false; labelProfileBtn(btns[i], act, t); delete btns[i].dataset.act; }); btns[2].hidden = true; }
    else paint({ alias, hasSession: false, mailOn: '', persistent: true });
    let id, prof = null, gone = false, stillNoRow = false;
    try {
      id = await service.identity();
    } catch { if (r === settingsReq && row.dataset.pending) paint({ alias, hasSession: false, mailOn: '', persistent: true }); return; } // offline: what the memory says stands
    // no answer from my_profile (offline, an older server): the last one stands
    if (id.hasSession && service.profile) try { prof = await service.profile(); gone = prof === null; } catch { prof = known?.prof ?? null; stillNoRow = known?.noRow === true; }
    if (r !== settingsReq) return;
    // the row of a remembered guest is gone (deleted elsewhere): the session left here is
    // useless (as on the publish sheet), so this browser leaves it; the next profile starts from scratch
    if (gone && alias && !id.email) { try { await service.signOut(); } catch { /* the next publication starts over anyway */ } id = { ...id, hasSession: false }; prof = null; gone = false; }
    if (r !== settingsReq) return;
    if (prof) remember(prof);
    const noRow = (gone || stillNoRow) && id.hasSession, name = prof?.alias || alias; // stillNoRow: the last answer, for painting only
    known = { hasSession: id.hasSession, mailOn: id.email || '', persistent: id.persistent !== false, prof, noRow };
    store.set(knownKey, JSON.stringify(known));
    paint({ alias: name, ...known });
  }
  function forget() { store.remove(aliasKey); refresh(); }

  // --- the sheet
  // thenLink: a profile created for something that needs the address goes straight on to it, in this same sheet
  function open(what, onBack = null, { thenLink = false } = {}) {
    if (!online || menu.open) return;
    kind = what; back = onBack; linkNext = thenLink; req++; busy = false; mail = ''; type = ''; leave = null;
    mailIn.value = codeIn.value = aliasIn.value = ''; setStatus('');
    mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = false;
    cancelBtn.hidden = false;
    if (what === 'create') {
      $('profile-title').textContent = tr('ui.profile.title.create');
      lead.textContent = tr('ui.profile.lead.create');
      show('alias');
    } else if (what === 'rename') { // a released profile: its name is somebody else's now; the same field, update_alias
      $('profile-title').textContent = tr('ui.profile.btn.rename'); lead.textContent = tr('ui.profile.lead.released');
      show('alias');
    } else if (what === 'link' || what === 'recover') {
      $('profile-title').textContent = tr(`ui.profile.title.${what}`);
      lead.textContent = tr(`ui.profile.lead.${what}`);
      show('mail');
    } else {
      $('profile-title').textContent = CONFIRM[what].title; lead.textContent = CONFIRM[what].lead(email);
      show('confirm');
    }
    menu.showModal();
    focusIn(menu, step === 'alias' ? 'profile-alias' : step === 'mail' ? 'profile-email' : 'profile-keep'); // a confirmation starts on the safe button
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
  async function send() {
    if (step === 'done') { menu.close(); return; }
    if (busy) return;
    const r = ++req;
    if (step === 'alias') { const a = checkAlias(aliasIn.value); if (!a.ok) { setStatus(a.message); aliasIn.focus(); return; } } // nothing sent
    busy = true; setStatus('');
    setSend(tr('ui.profile.btn.working'), true); mailIn.readOnly = codeIn.readOnly = aliasIn.readOnly = true;
    try {
      const askToken = async () => { // null: Turnstile failed or the sheet went away (already said)
        try { const t = await captcha.token(); return r === req ? t : null; } catch (e) {
          if (r === req) { setStatus(e?.code === 'cancel' ? '' : turnstileMessage(e?.code)); idle(); }
          return null;
        }
      };
      // a token only when sendCode asks for one (a sign-in by code; adding an address needs none, and waiting for Turnstile
      // first made «Envia el codi» slow for nothing); null: no token, already said
      const sendCode = async (address, signIn = false) => {
        try { return await service.sendCode(address, { signIn }); } catch (e) {
          if (e?.code !== 'captcha' || !captcha || r !== req) throw e;
          const t = await askToken();
          return t == null ? null : service.sendCode(address, { captchaToken: t, signIn });
        }
      };
      let captchaToken;
      if (step === 'alias' && kind !== 'rename' && service.captchaRequired && captcha) { // a rename has its session already
        captchaToken = await askToken();
        if (captchaToken == null) return;
      }
      if (step === 'alias') {
        const alias = await service.createProfile(aliasIn.value, { captchaToken });
        if (r !== req) return;
        store.set(aliasKey, alias);
        try { remember(await service.profile?.()); } catch { /* the block asks again */ }
        if (kind !== 'rename') acceptStats(); // the notice was on this step
        if (r !== req) return;
        if (linkNext && kind === 'create') {
          linkNext = false; kind = 'link'; idle(); refresh();
          $('profile-title').textContent = tr('ui.profile.title.link'); lead.textContent = tr('ui.profile.lead.link');
          const typing = doc.activeElement === aliasIn; // still typing: field to field, so iOS keeps its keyboard up
          if (typing) { $('profile-mail-field').hidden = false; mailIn.focus(); }
          show('mail'); setStatus(tr('ui.profile.done.created'), true);
          if (!typing) focusIn(menu, 'profile-email');
          return;
        }
        finish(tr(kind === 'rename' ? 'ui.profile.done.nameSaved' : 'ui.profile.done.created'));
      } else if (step === 'mail' || step === 'switch') { // switch: go to that profile; this guest is deleted once its code is right
        // a recovery is a sign-in, never an address added here
        const out = await sendCode(step === 'mail' ? mailIn.value : mail, kind === 'recover' || step === 'switch');
        if (!out || r !== req) return;
        if (step === 'mail') { mail = mailIn.value; leave = out.guest ?? null; } // the guest the question is about: the only one it deletes
        type = out.type;
        if (type === 'exists') { // the address already confirmed another profile: nothing sent yet, the player chooses
          lead.replaceChildren(...trMarked(doc, 'ui.profile.lead.codeOther', { mail, mine: store.get(aliasKey) || tr('ui.profile.thisBrowser') }, 'profile-hl'));
          idle(); show('switch'); focusIn(menu, 'profile-keep');
          return;
        }
        lead.textContent = tr('ui.profile.lead.codeSent', { mail });
        // still typing (the keyboard's «send»): the code field takes the focus before the address hides, so iOS keeps its keyboard up
        const typing = doc.activeElement === mailIn;
        codeIn.value = ''; idle();
        if (typing) { $('profile-code-field').hidden = false; codeIn.focus(); }
        show('code');
        if (!typing) focusIn(menu, 'profile-code');
      } else if (step === 'code') {
        await service.verifyCode(mail, codeIn.value, type, { leave });
        if (r !== req) return;
        // the server decides who this browser is now and whether it is confirmed (a code for a pending change alone proves nothing)
        let prof = null;
        try { prof = await service.profile?.(); } catch { /* the block asks again */ }
        if (r !== req) return;
        if (type === 'email') { // signed in to an existing profile: bring its name back to this browser
          if (prof) remember(prof); else try { const alias = await service.myAlias(); if (alias) store.set(aliasKey, alias); } catch { /* asked again on the next publication */ }
          if (r !== req) return;
          finish(tr(kind === 'link' ? 'ui.profile.done.switched' : 'ui.profile.done.recovered'));
          return;
        }
        if (prof) remember(prof);
        finish(tr(prof?.verified ? 'ui.profile.done.mailConfirmed' : 'ui.profile.done.codeChecked'));
      } else { // confirm
        try { await (kind === 'delete' ? service.deleteProfile() : service.signOut()); } catch (e) {
          if (kind === 'delete') report('leaderboard-delete-failed', { code: e?.code || e?.name || 'Error', ...(e?.detail && { server: String(e.detail).slice(0, 64) }) });
          throw e;
        }
        if (r !== req) return;
        store.remove(aliasKey); // the name goes with the profile (or the session); local records and settings stay
        finish(CONFIRM[kind].done);
      }
    } catch (e) {
      if (r !== req) return;
      setStatus(e?.message || tr('ui.profile.failed'));
      if (e?.code === 'noprofile') show('mail');
      idle();
      if (step === 'alias') aliasIn.focus(); // a name somebody has: another try, right there
    }
  }
  cancelBtn.addEventListener('click', () => { if (!busy) menu.close(); });
  keepBtn.addEventListener('click', () => {
    if (busy) return;
    if (step !== 'switch') menu.close();
    else { lead.textContent = tr('ui.profile.lead.link'); setStatus(''); show('mail'); focusIn(menu, 'profile-email'); } // another address
  });
  menu.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  menu.addEventListener('close', () => {
    req++; busy = false; clearTimeout(closeTimer); captcha?.cancel(); cancelBtn.hidden = false;
    const b = back; back = null; b?.();
  });
  // a badge just saved (src/ui/badge-picker.js): the block's next first frame already draws it
  function badgeSaved(badgeId) {
    if (!known?.prof) return;
    known = { ...known, prof: { ...known.prof, badgeId } };
    store.set(knownKey, JSON.stringify(known));
  }
  return { open, refresh, forget, badgeSaved, get isOpen() { return menu.open; }, get renaming() { return menu.open && kind === 'rename' && step === 'alias'; },
    get state() { return row.dataset.state; } };
}
