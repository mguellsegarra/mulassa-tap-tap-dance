// ?final&review=<state> (dev hosts only: finalMode in src/dev/final-test.js): the profile and e-mail flows for review, over
// the in-memory mock (no network, nothing stored outside memory). Each state is reached by pressing the real sheets' own
// buttons and fields, as a player would, so their animations and focus run for real; a reload starts it again.
// `&review` alone: the list of states (links), over the results screen. Loaded as its own chunk, only in that mode.
import { REVIEWS, OTHER_MAIL, MOCK_CODE } from './final-test.js';
import { G } from '../game/state.js';
import { ROW_KEY, ALIAS_KEY } from '../ui/board-ui.js';

const LABELS = {
  'share-drac': 'Comparteix el Drac',
  publish: 'Abans de publicar (s’obre sol)', published: 'Publicat! + Confirma el correu', email: 'Correu: escriu l’adreça', code: 'Correu: el codi',
  verified: 'Correu confirmat!', share: 'Confirmat → Comparteix', switch: 'Correu d’un altre perfil (canvi)', 'legacy-publish': 'Perfil antic: publicar (avís dels 7 dies)',
  'profile-new': 'Perfil: cap', 'profile-reserved': 'Perfil: nom reservat', 'profile-pending': 'Perfil: caduca el…', 'profile-legacy': 'Perfil antic: avís dels 7 dies',
  'profile-verified': 'Perfil: correu confirmat', 'profile-expired': 'Perfil: caducat', board: 'Classificació amb marques', 'board-tip': 'Marca: explicació',
  taken: 'Sobrenom agafat', recover: 'Sobrenom agafat → Recupera', retry: 'Publicar sense connexió → Torna-ho a provar',
};
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(test, what, ms = 20000) {
  const t0 = performance.now();
  while (!test()) { if (performance.now() - t0 > ms) throw new Error(`review: ${what}`); await sleep(50); }
}
const shown = el => Boolean(el && !el.closest('[hidden]') && el.getClientRects().length);
function type(id, value) { const el = $(id); el.focus(); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }
const press = id => $(id).click();
const href = state => `?final&mute&review=${state}`;

function panel(list) { // inline styles: dev only, never in the product's CSS
  const box = document.createElement('nav');
  box.id = 'review-panel';
  box.setAttribute('aria-label', 'Revisió del perfil');
  const look = 'z-index:50;border-left:3px solid #c62828;border-radius:6px;background:#1d120cf2;color:#fff3d6;font:600 14px/1.35 system-ui,sans-serif;';
  const link = (text, url, css) => { const a = document.createElement('a'); a.href = url; a.textContent = text; a.style.cssText = `color:#fff3d6;${css}`; return a; };
  if (list) { // the hub: every state, over the results screen (no sheet open)
    box.style.cssText = `position:fixed;${look}inset:max(12px,env(safe-area-inset-top)) 12px auto auto;max-height:calc(100dvh - 24px);overflow:auto;padding:10px 12px;`;
    const head = document.createElement('p');
    head.style.cssText = 'margin:0 0 6px;font-weight:800;letter-spacing:.04em;';
    head.textContent = 'REVISIÓ · estats del perfil';
    const note = document.createElement('p'); // the mock's rules, so a reviewer can walk the flows by hand
    note.style.cssText = 'margin:0 0 6px;max-width:30em;font-weight:500;font-size:13px;';
    note.textContent = `Tot és de prova, en memòria: no s’envia cap correu ni es desa res. Codi: ${MOCK_CODE}. ${OTHER_MAIL} = el correu d’un altre perfil.`;
    box.append(head, note);
    for (const k of Object.keys(REVIEWS)) box.append(link(LABELS[k] || k, href(k), 'display:flex;align-items:center;min-height:44px;padding:0 2px;'));
    document.body.append(box);
    return;
  }
  // in a state: one small row in the top-left corner, clear of the sheets' title and close button
  box.style.cssText = `position:fixed;${look}inset:max(6px,env(safe-area-inset-top)) auto auto max(6px,env(safe-area-inset-left));display:flex;margin:0;padding:0 4px;`;
  const css = 'display:flex;align-items:center;min-height:44px;padding:0 10px;font-weight:800;text-decoration:none;';
  box.append(link('← estats', '?final&mute&review', css), link('↻', location.search, css));
  box.lastChild.setAttribute('aria-label', 'Torna a començar aquest estat');
  // an open modal sheet makes the rest of the page inert (popovers too): the row lives inside the topmost open one
  const follow = () => { const top = [...document.querySelectorAll('dialog[open]')].filter(d => (d.matches(':modal') ?? true)).pop(); if (box.parentNode !== (top || document.body)) (top || document.body).append(box); };
  document.body.append(box);
  new MutationObserver(follow).observe(document.body, { subtree: true, attributeFilter: ['open'] });
}

// window.__review: 'ready' once the state is reached (or the error that stopped it), for QA scripts
export async function startReview(o) {
  try { await reach(o); window.__review = 'ready'; } catch (e) { window.__review = `error: ${e.message}`; throw e; }
}
async function reach({ state, board, openSettings, toTitle, store }) {
  panel(!state);
  if (!state) return;
  if (state === 'share-drac') {
    await until(() => G.state === 'results', 'the initial results');
    const { setSelectedFigure } = await import('../game/state.js');
    const { startFinal } = await import('../game/flow.js');
    setSelectedFigure('drac-valls');
    startFinal();
    await until(() => !$('results-actions').hidden && !$('results-share').hidden && G.shareRun?.figureId === 'drac-valls', 'the Drac result');
    await sleep(1200);
    press('results-share');
    await until(() => $('share-menu').open && !$('share-image').disabled, 'the Drac share image');
    return;
  }
  await until(() => G.state === 'results' && board().publishable, 'the results screen');
  await sleep(1200); // the results card settles (its buttons take taps after a second)
  const ready = () => $('publish-menu').open && !$('publish-send').disabled && !$('publish-form').dataset.view;
  const publish = async (alias = 'Prova123') => {
    board().openPublish(); await until(ready, 'the publish sheet');
    if (shown($('publish-alias'))) type('publish-alias', alias);
    press('publish-send');
  };
  const published = async () => { await publish(); await until(() => $('publish-form').dataset.view === 'done' && !$('publish-send').disabled, 'Publicat!'); };
  const mail = async (address = 'prova@exemple.cat') => {
    await until(() => $('profile-menu').open && shown($('profile-email')), 'the e-mail step');
    type('profile-email', address); press('profile-send');
    await until(() => shown($('profile-code')) && !$('profile-send').disabled, 'the code step');
  };
  // Configuració opens from the selector, as a player reaches it after a run
  const settings = async () => { toTitle(); await until(() => (G.state === 'select' || G.state === 'title') && !$('select').hidden, 'the visible selector'); openSettings(); await until(() => !$('settings-profile-row').dataset.pending && $('settings-profile-row').dataset.state, 'the profile block'); };
  switch (state) {
    case 'publish': board().openPublish({ auto: true }); return;
    case 'published': return published();
    case 'share': case 'verified': case 'code': case 'email':
      await published(); press('publish-confirm');
      if (state === 'email') return;
      await mail(); if (state === 'code') return;
      type('profile-code', MOCK_CODE); press('profile-send');
      await until(() => $('profile-status').textContent === 'Correu confirmat!', 'Correu confirmat!');
      if (state === 'share') await until(() => $('share-menu').open, 'Comparteix');
      return;
    case 'switch': await settings(); press('settings-profile-main'); return mail(OTHER_MAIL);
    case 'legacy-publish': board().openPublish(); return until(ready, 'the publish sheet'); // the notice, before Publica (read: its 7 days start)
    case 'board': case 'board-tip':
      store.set(ROW_KEY, store.get(ALIAS_KEY)); board().openBoard();
      await until(() => document.querySelector('#board-rows .verified-check'), 'the board');
      if (state === 'board-tip') (document.querySelector('#board-rows tr.me .verified-check') || document.querySelector('#board-rows .verified-check')).click(); // the own row: in view
      return;
    case 'taken': case 'recover':
      await publish('Timbaler321');
      await until(() => !$('publish-error').hidden && !$('publish-send').disabled, 'the taken nickname');
      if (state === 'recover') $('publish-error').querySelector('button').click();
      return;
    case 'retry': // the first publication gets no answer: the sheet says so and offers «Torna-ho a provar»
      await publish();
      return until(() => $('publish-status').textContent && !$('publish-send').disabled && !$('publish-form').dataset.view, 'the failed publication');
    default: return settings(); // profile-*
  }
}
