// DOM for sharing a result: «Comparteix» in the results row (#results-actions, which this module shows; board-ui.js
// owns its other buttons) and the #share-menu sheet. The image is prepared when the sheet opens (and on every
// format/nickname change), so the click that shares calls navigator.share() straight away (iOS wants it inside the
// tap). Nothing leaves the device unless the person shares it; closing the system sheet (AbortError) says nothing.
import { byId } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { lang } from '../i18n/locale.js';
import { DIFFS } from '../game/chart.js';
import { shareText, challengeUrl, challengeResult, bragWorthy, shareMode, linkMode, shareLinks, isCancel } from '../services/share.js';
import { PHOTO, drawCard, cardAlt, toJpeg, loadCardFonts } from '../hud/share-card.js';
import { ALIAS_KEY, savedName, displayName } from '../services/leaderboard-identity.js';
import { errors } from '../services/errors.js';

const FORMAT_KEY = 'share-format';
// the sheet opening by itself (a record, after the publish prompt) is a nudge, not a toll: once a day at most; the button always works
const NUDGE_KEY = 'share-nudge-at', NUDGE_GAP = 24 * 3600e3;
// The photo is a synchronous GPU render and read-back: let the sheet paint and finish coming in (index.html share-in,
// 0.2 s) first, so it never waits behind the publish sheet or freezes mid-way; the shimmer holds the card's place.
const afterEntrance = () => new Promise(r => (globalThis.requestAnimationFrame ?? setTimeout)(() => setTimeout(r, 200)));

export function setupShare({ focusIn, restore = () => {}, hero = () => null, standing = async () => null, sfx = () => {}, doc = document, nav = navigator,
  store, fonts = doc.fonts, url = globalThis.URL, settle = afterEntrance,
  // a run worth showing off (and ≥ 2 stars: a weak one is never pushed) opens Comparteix by itself `autoDelay` ms after its results: `auto()` says nobody else will (the publish
  // prompt, when it opens, ends in Comparteix anyway), `ready()` that nothing is open over the screen by then
  auto = () => false, ready = () => true, autoDelay = 1400, now = Date.now }) {
  const $ = byId(doc);
  const menu = $('share-menu'), row = $('results-actions'), btn = $('results-share'), tag = $('results-share-tag');
  const img = $('share-preview'), frame = $('share-frame'), status = $('share-status'), primary = $('share-image');
  const note = $('share-note'), nick = $('share-nick'), nickRow = $('share-nick-row'), formats = { story: $('share-format-story'), feed: $('share-format-feed') };
  let rank = null, run = null, challenge = null, format = ['square', 'feed'].includes(store.get(FORMAT_KEY)) ? 'feed' : 'story';
  // file: the last card made; fresh: it matches what the sheet now shows (a redraw after the nickname / the format
  // makes it stale until the new one is ready); tapped: a tap on the primary waiting for that new card
  let file = null, fresh = false, tapped = false, previewUrl = '', heroes = {}, req = 0, shownKey = '';
  let named = ''; // the name the card being drawn took ('' until drawn)
  const nameNow = () => (nick.checked && !nickRow.hidden ? savedName(store) : null); // as the boards show it: «nom#1234», or the check
  const data = () => {
    const who = nameNow();
    const alias = who?.alias ? displayName(who.alias, who.tag) : null;
    return { figureId: run.figureId, score: run.score, diff: run.diff, rank, stars: run.stars, pct: run.pct, maxCombo: run.maxCombo, diffName: DIFFS[run.diff].name, reason: run.reason,
      newRecord: run.newRecord, beaten: Boolean(challengeResult(challenge, run)?.beaten), alias, verified: Boolean(alias && who.verified) };
  };
  const say = (text, ok = false) => { status.textContent = text; status.classList.toggle('ok', ok); };
  function setPrimary(mode, busy = !file) { // the label only: the icon (share / save) follows data-mode in CSS
    $('share-image-label').textContent = tr(busy ? 'ui.share.preparing' : mode === 'share' ? 'ui.share.shareImage' : 'ui.share.saveImage');
    primary.disabled = busy;
    primary.dataset.mode = mode;
  }
  // the card lands without a jump: the frame keeps its box (a shimmer until the first image); a new card fades in over
  // the old one, left as the frame's background until the fade is done (then its blob URL goes)
  function show(src) {
    const old = previewUrl;
    frame.style.backgroundImage = old ? `url("${old}")` : '';
    img.classList.remove('ready');
    img.onload = () => {
      img.classList.add('ready'); frame.classList.add('has-img');
      if (old) setTimeout(() => { if (frame.style.backgroundImage.includes(old)) frame.style.backgroundImage = ''; url.revokeObjectURL(old); }, 250);
    };
    img.src = previewUrl = src;
  }
  async function prepare() { // the card for the current format; a newer request (or a closed sheet) wins
    const r = ++req, f = format, d = data();
    // redrawing only the card over a photo already made (the nickname) leaves the button exactly as it is (label,
    // icon, state): no flash of «Preparant…» for the few tens of ms it takes. Only the first card, or a format whose
    // photo is still to render (a visibly slower change), says «Preparant…», keeping its icon
    fresh = false; named = '';
    if (!file) setPrimary('download');
    else if (!heroes[f]) setPrimary(primary.dataset.mode, true);
    img.alt = cardAlt(f, d);
    try {
      const l = lang();
      await loadCardFonts(fonts);
      if (lang() !== l) return prepare(); // the language changed while the fonts loaded: start again in the new one
      if (!heroes[f]) await settle();
      if (r !== req || !menu.open) return;
      if (!heroes[f]) {
        const photo = await hero(...PHOTO[f], d.figureId);
        if (r !== req || !menu.open) return;
        heroes[f] = photo;
      } // rendered once per results screen and format (a render target, then read back)
      named = JSON.stringify(nameNow()); // read now: the profile's answer may have come while the photo rendered
      const canvas = drawCard(doc.createElement('canvas').getContext('2d'), f, data(), heroes[f]);
      const out = await toJpeg(canvas, 0.9, d.figureId);
      if (r !== req || !menu.open) return;
      file = out; fresh = true;
      show(url.createObjectURL(out));
      setPrimary(shareMode(nav, out));
      if (tapped) { tapped = false; use(); } // the tap made during the redraw: with the card it asked for
    } catch (e) {
      errors.report('share-image-failed', { name: e?.name || 'Error' });
      if (r !== req || !menu.open) return;
      file = null; tapped = false; setPrimary('download'); // never the previous card
      say(tr('ui.share.prepareFailed'));
    }
  }
  function selectFormat(f) {
    format = f;
    store.set(FORMAT_KEY, f);
    for (const [k, b] of Object.entries(formats)) b.setAttribute('aria-pressed', String(k === f));
    menu.dataset.format = f;
    prepare();
  }
  // place: after publishing (board-ui.js afterPublish), where they stand, a promise of «Ets el número 7 · top 40%!» (or
  // null): the header says «Publicat!» until it comes
  let opens = 0;
  let autoT = null;
  function open({ published = false, place = null } = {}) {
    if (!run || !shownKey || menu.open || run.reason === 'collapse') return;
    tag.hidden = true; // the nudge has done its job
    say('');
    note.hidden = !published; note.textContent = published ? tr('ui.share.published') : '';
    const o = ++opens, openedRun = run, aliasAtOpen = store.get(ALIAS_KEY);
    rank = null;
    if (aliasAtOpen) Promise.resolve().then(() => standing(run.figureId)).then(value => { // each figure has its own board
      if (o !== opens || run !== openedRun || !menu.open || store.get(ALIAS_KEY) !== aliasAtOpen) return;
      rank = value; prepare();
    }, () => {});
    Promise.resolve(place).then(t => { if (t && menu.open && o === opens) note.textContent = t; }, () => {});
    nickRow.hidden = !store.get(ALIAS_KEY); // the switch only exists for a nickname already chosen (Classificacions)
    const cap = shareText(run, challenge), link = challengeUrl(run.pct, run.diff, undefined, run.figureId), links = shareLinks(cap, link);
    $('share-x').href = links.x; $('share-whatsapp').href = links.whatsapp;
    more.dataset.mode = linkMode(nav, { text: cap, url: link });
    $('share-more-label').textContent = tr(more.dataset.mode === 'share' ? 'ui.share.more' : 'ui.share.copy');
    menu.showModal();
    focusIn(menu, 'share-image');
    selectFormat(format);
  }
  function nudge(o) { // open() by itself, unless it already did within NUDGE_GAP (a clock set back counts as recent)
    const ago = now() - (Number(store.get(NUDGE_KEY)) || 0);
    if (ago >= 0 && ago < NUDGE_GAP) return false;
    open(o);
    if (menu.open) store.set(NUDGE_KEY, String(now()));
    return true;
  }
  btn.addEventListener('click', () => { sfx('menu'); open(); });
  for (const [k, b] of Object.entries(formats)) b.addEventListener('click', () => { if (k !== format) { sfx('menu'); selectFormat(k); } });
  nick.addEventListener('change', () => prepare());
  // synchronous from the tap to navigator.share(): no await before it. The phone's own sheet takes the image ALONE to
  // any app (Instagram, WhatsApp, X, Photos…): no title/text/url with it, since with them iOS drops «Desa la imatge» and
  // some targets take the link instead of the picture or mangle the caption. Where files can't be shared, it's saved.
  // The text + challenge link go only through the quiet links under it (WhatsApp · X · Més…).
  // A tap while the card is being redrawn never sends the previous one (its nickname/format no longer match the
  // row above): it waits for the new card (tens of ms) and goes on with it, still within the tap's user activation.
  primary.addEventListener('click', () => { if (!file) return; if (fresh) use(); else tapped = true; });
  function use() {
    if (primary.dataset.mode === 'share') {
      let p;
      try { p = nav.share({ files: [file] }); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(() => say(tr('ui.share.shared'), true), e => { if (!isCancel(e)) { errors.report('share-failed', { name: e?.name || 'Error' }); say(tr('ui.share.shareFailed')); } });
      return;
    }
    const a = doc.createElement('a'); // no file sharing here: save it, then post it anywhere
    a.href = previewUrl; a.download = file.name; a.rel = 'noopener';
    doc.body.appendChild(a); a.click(); a.remove();
    say(tr('ui.share.saved'), true);
  }
  // Més…: the caption + challenge link (no image) to the system sheet; without one («Copia»), the link to the clipboard,
  // else a hidden field's copy (http, blocked permission), else the link shown in the status line to copy by hand
  const more = $('share-more');
  more.addEventListener('click', () => {
    const text = shareText(run, challenge), link = challengeUrl(run.pct, run.diff, undefined, run.figureId);
    if (more.dataset.mode === 'share') {
      let p;
      try { p = nav.share({ text, url: link }); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(() => say(tr('ui.share.shared'), true), e => { if (!isCancel(e)) { errors.report('share-failed', { name: e?.name || 'Error' }); say(tr('ui.share.linkFailed', { link })); } });
      return;
    }
    const full = `${text} ${link}`; // as WhatsApp gets it: the caption + the link
    const copied = () => say(tr('ui.share.textCopied'), true);
    const byHand = () => {
      try { // inside the dialog: a modal's top layer makes everything outside it inert
        const t = doc.createElement('textarea');
        t.value = full; t.readOnly = true; t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        menu.appendChild(t); t.select(); const ok = doc.execCommand?.('copy'); t.remove();
        if (ok) return copied();
      } catch { /* no copy at all */ }
      say(tr('ui.share.copyByHand', { text: full }));
    };
    try { nav.clipboard.writeText(full).then(copied, byHand); } catch { byHand(); }
  });
  $('share-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => { req++; tapped = false; note.hidden = true; restore(); });

  return {
    get open() { return menu.open; },
    openAfterPublish: ({ place, published = true } = {}) => { if (!nudge({ published, place })) restore(); }, // skipped: focus back on the results
    // the profile's name or check changed under an open sheet (the server answered after the publication): redraw the card
    refreshName() { if (menu.open && run && named && JSON.stringify(nameNow()) !== named) prepare(); },
    // every frame from updateControls(): only real changes touch the DOM. r: the run on the results screen (null: none)
    results(show, r, ch) {
      const key = show && r ? `${r.figureId}|${r.score}|${r.maxCombo}|${r.diff}|${r.pct}|${r.reason}|${r.t}` : '';
      if (key === shownKey) return;
      if (!key && row.contains(doc.activeElement)) doc.activeElement.blur?.();
      if (key && key !== shownKey) { // a new results screen: its heroes, its nudge
        req++; opens++; rank = null;
        if (menu.open) menu.close();
        run = r; challenge = ch; heroes = {};
        if (previewUrl) url.revokeObjectURL(previewUrl); // another run: the shimmer again, never the last run's card
        file = null; fresh = false;
        previewUrl = ''; img.classList.remove('ready'); frame.classList.remove('has-img'); frame.style.backgroundImage = '';
        btn.hidden = r.reason === 'collapse'; // she fell apart: nothing to show off (the row keeps Torna-ho a provar)
        tag.hidden = !bragWorthy(r, ch);
        clearTimeout(autoT); autoT = null;
        if (bragWorthy(r, ch) && r.stars >= 2 && auto()) autoT = setTimeout(() => { autoT = null; if (shownKey === key && ready()) nudge(); }, autoDelay);
      }
      if (!key) { clearTimeout(autoT); autoT = null; }
      if (!key && menu.open) menu.close();
      shownKey = key;
      row.hidden = !key;
    },
  };
}
