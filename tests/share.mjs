// Sharing (src/services/share.js + the static page): the ?repte link, the caption per outcome, the platform
// fallbacks, leaderboard eligibility untouched by a challenge, the Privadesa section and the link-preview tags.
import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { encodeChallenge, challengeUrl, parseChallenge, stripChallenge, challengeTip, challengeResult, outcomeOf, shareText,
  bragWorthy, shareMode, linkMode, shareLinks, isCancel, SITE, HASHTAGS, MULA } from '../src/services/share.js';
import { snapshotResult, EXPECTED_JUDGMENTS } from '../src/services/leaderboard-rules.js';
import { titleLayout, CHIP } from '../src/hud/title-layout.js';

// --- the challenge link: only "<0-100>-<0|1|2>", clamped, junk ignored
assert.equal(encodeChallenge(94.4, 2), '94-2');
assert.equal(encodeChallenge(140, 0), '100-0');
assert.equal(encodeChallenge(-3, 1), '0-1');
for (const bad of [[NaN, 1], [50, 3], [50, -1], [50, 1.5], [50, '1']]) assert.equal(encodeChallenge(...bad), null, `no code for ${bad}`);
assert.equal(challengeUrl(94, 2), `${SITE}?repte=94-2`);
assert.equal(challengeUrl(94, 7), SITE, 'an impossible level: just the game');
assert.deepEqual(parseChallenge('?repte=94-2'), { pct: 94, diff: 2 });
assert.deepEqual(parseChallenge(new URLSearchParams('mute&repte=100-0')), { pct: 100, diff: 0 });
assert.deepEqual(parseChallenge('?repte=250-1'), { pct: 100, diff: 1 }, 'over 100 is clamped');
for (const junk of ['', '?repte=', '?repte=abc', '?repte=94', '?repte=94-3', '?repte=-5-1', '?repte=1234-1', '?repte=94-2-1', '?repte=94_2', '?other=94-2', '?repte=<script>'])
  assert.equal(parseChallenge(junk), null, `junk ignored: ${junk}`);
assert.equal(parseChallenge(null), null);
assert.equal(stripChallenge('https://x.test/?repte=94-2'), '/');
assert.equal(stripChallenge('http://localhost:5178/?mute&repte=94-2#a'), '/?mute=#a', 'other params stay');
assert.equal(challengeTip({ pct: 94, diff: 2 }), 'Repte d’un amic: supera el 94% a DIFÍCIL');
assert(!/utm_|fbclid|ref=|id=/.test(challengeUrl(94, 2) + shareLinks('x', challengeUrl(94, 2)).x), 'no tracking parameters');

// --- the result against the challenge: same level only; "supera" = more than the target (100 = 100 is enough)
const run = (o = {}) => ({ pct: 90, score: 182972, diff: 2, reason: 'clear', stars: 3, newRecord: false, practice: false, ...o });
assert.deepEqual(challengeResult({ pct: 89, diff: 2 }, run()), { beaten: true, missing: 0, line: 'REPTE SUPERAT!' });
assert.deepEqual(challengeResult({ pct: 90, diff: 2 }, run()), { beaten: false, missing: 1, line: 'Gairebé! Et falta un 1%' });
assert.equal(challengeResult({ pct: 94, diff: 2 }, run()).line, 'Gairebé! Et falta un 5%');
assert.equal(challengeResult({ pct: 99, diff: 2 }, run({ pct: 40 })).line, 'Et falta un 60%', 'far off: no "Gairebé"');
assert(challengeResult({ pct: 100, diff: 0 }, run({ pct: 100, diff: 0 })).beaten, 'a perfect run beats a perfect challenge');
assert.equal(challengeResult({ pct: 50, diff: 1 }, run()), null, 'another level: no verdict');
assert.equal(challengeResult({ pct: 50, diff: 2 }, run({ practice: true })), null, 'never the practice');
assert.equal(challengeResult(null, run()), null);

// --- outcome and caption: one per outcome, hashtags, Catalan apostrophes, no link inside (it goes apart)
assert.equal(outcomeOf(run({ newRecord: true }), { pct: 80, diff: 2 }), 'challenge');
assert.equal(outcomeOf(run({ newRecord: true })), 'record');
assert.equal(outcomeOf(run()), 'clear');
assert.equal(outcomeOf(run({ reason: 'fail', pct: 60 })), 'fail');
const texts = [shareText(run(), { pct: 80, diff: 2 }), shareText(run({ newRecord: true })), shareText(run()), shareText(run({ reason: 'fail', pct: 60 }))];
assert.equal(new Set(texts).size, 4, 'a caption per outcome (a collapse is never shared: share-ui.js hides Comparteix)');
for (const t of texts) {
  assert(t.endsWith(HASHTAGS) && HASHTAGS === '#MulassaTapTap #Valls', t);
  assert(/DIFÍCIL/.test(t) && /\d+%/.test(t) && !/https?:/.test(t) && !/'/.test(t), `level, %, no link, ’ only: ${t}`);
}
assert(/Repte superat/.test(texts[0]) && /rècord de punts: 182.972 a DIFÍCIL \(90% d’encerts\)/.test(texts[1]), texts[1]);
// emojis: the donkey (🫏, the nearest to a mulassa) first, one festive emoji by outcome; X's count stays well under 280
// (an emoji weighs 2, the link 23), and the intents carry them UTF-8 percent-encoded, back intact when decoded
const xWeight = t => [...t].reduce((n, c) => n + (c.codePointAt(0) > 0x10ff ? 2 : 1), 0);
for (const t of texts) {
  assert(t.startsWith(MULA) && MULA === '🫏' && /[💃🎉🔥🏆]/u.test(t), `🫏 + a festive emoji: ${t}`);
  assert(xWeight(t) + 1 + 23 <= 200, `short for X (${xWeight(t) + 24}): ${t}`);
  const l = shareLinks(t, challengeUrl(95, 0)), text = new URL(l.x).searchParams.get('text');
  assert(l.x.includes('text=%F0%9F%AB%8F') && l.whatsapp.includes('text=%F0%9F%AB%8F'), 'the donkey percent-encoded as UTF-8');
  assert(text === t && new URL(l.x).searchParams.get('url') === `${SITE}?repte=95-0` && new URL(l.whatsapp).searchParams.get('text') === `${t} ${SITE}?repte=95-0`, 'decoded back intact');
}

// --- «Presumeix-ne!»: record, S/A or a beaten challenge; never the practice or a collapse
assert(bragWorthy(run({ stars: 2, newRecord: true })) && bragWorthy(run({ stars: 3 })) && bragWorthy(run({ stars: 3 })));
assert(bragWorthy(run({ stars: 1, pct: 60 }), { pct: 50, diff: 2 }), 'a beaten challenge');
assert(!bragWorthy(run({ stars: 2 })) && !bragWorthy(run({ stars: 3, practice: true })) && !bragWorthy(run({ stars: 3, reason: 'collapse' })));

// --- how to share: files through the system sheet when it takes them, else save the image; links and cancel
const file = { name: 'mulassa-tap-tap-dance.jpg' };
assert.equal(shareMode({ share() {}, canShare: o => o.files?.length === 1 }, file), 'share');
assert.equal(shareMode({ share() {}, canShare: () => false }, file), 'download', 'the sheet refuses files (desktop Firefox…)');
assert.equal(shareMode({ share() {} }, file), 'download', 'no canShare: assume no files');
assert.equal(shareMode({}, file), 'download');
assert.equal(shareMode({ share() {}, canShare() { throw new Error('x'); } }, file), 'download');
assert.equal(shareMode({ share() {}, canShare: () => true }, null), 'download', 'no image yet');
// Més… (the link only): the system sheet with text + url where there is one, else copy
const linkData = { text: 'a', url: SITE };
assert.equal(linkMode({ share() {}, canShare: d => !d.files }, linkData), 'share');
assert.equal(linkMode({ share() {} }, linkData), 'share', 'no canShare (older Safari): the sheet still takes text');
assert.equal(linkMode({ share() {}, canShare: () => false }, linkData), 'copy');
assert.equal(linkMode({}, linkData), 'copy', 'no Web Share (desktop Firefox…): copy the link');
assert.equal(linkMode({ share() {}, canShare() { throw new Error('x'); } }, linkData), 'copy');
const links = shareLinks('Hola 90% d’encerts #MulassaTapTap', `${SITE}?repte=90-2`);
assert(links.x.startsWith('https://x.com/intent/tweet?text=Hola%2090%25') && links.x.includes('&url=https%3A%2F%2Fmulassa.cat%2F%3Frepte%3D90-2'));
assert(links.whatsapp.startsWith('https://wa.me/?text=') && decodeURIComponent(links.whatsapp.split('text=')[1]).endsWith('?repte=90-2'));
assert(isCancel({ name: 'AbortError' }) && !isCancel({ name: 'NotAllowedError' }) && !isCancel(undefined));

// --- a challenge never changes what the leaderboard accepts
const counts = { perfect: EXPECTED_JUDGMENTS[2], good: 0, miss: 0 };
const game = { diff: 2, counts, score: 1000, maxCombo: 10, practice: null };
assert(snapshotResult(game, { reason: 'end', query: new URLSearchParams('repte=94-2') }), 'still eligible with ?repte');
assert(snapshotResult(game, { reason: 'end', query: new URLSearchParams('mute&repte=junk') }), 'junk repte: eligible too');

// --- the title's challenge chip: inside the budget, never over the logo or the JUGA button
for (const [cw, ch, K] of [[375, 667, 1.5], [393, 852, 1.5], [320, 480, 1.5], [852, 393, 1.5], [667, 375, 1.5], [1280, 800, 2], [1920, 1080, 2]]) {
  const corner = ch <= 500;
  const L = titleLayout({ W: cw / K, HH: ch / K, K, safe: { t: 0, r: 0, b: 0, l: 0 }, keys: true, note: '', logoRatio: 4.85, subW: 104, nameW: 42,
    pill: { w: 170, h: 44 }, hint: null, corner, obstacles: [], chip: true });
  const chip = { top: L.chipY - CHIP / 2, bottom: L.chipY + CHIP / 2 };
  assert(L.fits, `${cw}x${ch}: fits with the chip`);
  assert(chip.top >= L.logo.y + L.logo.h - 0.5, `${cw}x${ch}: chip under the logo`);
  assert(L.buttons.every(b => b.y >= chip.bottom), `${cw}x${ch}: chip over the buttons`);
  assert.equal(titleLayout({ W: cw / K, HH: ch / K, K, safe: { t: 0, r: 0, b: 0, l: 0 }, keys: true, note: '', logoRatio: 4.85, subW: 104, nameW: 42,
    pill: { w: 170, h: 44 }, hint: null, corner, obstacles: [] }).chipY, null, 'no challenge: no chip');
}

// --- the page: Privadesa explains sharing; static link-preview tags with absolute URLs; the image exists and is light
const html = readPage();
const privacy = html.slice(html.indexOf('<dialog id="privacy-menu"'), html.indexOf('</dialog>', html.indexOf('<dialog id="privacy-menu"')));
const section = privacy.slice(privacy.indexOf('data-privacy="share"'), privacy.indexOf('</section>', privacy.indexOf('data-privacy="share"')));
assert(section.length > 50, 'Privadesa has a share section');
assert(/només la imatge/.test(section) && /només el text i l’enllaç/.test(section) && /porta-retalls/.test(section), 'Privadesa says what each way sends: the image alone, or the text + link (copied where there is no sheet)');
assert(/al teu dispositiu/.test(section) && /no els envia/.test(section) && /seva pròpia privadesa/.test(section) && /percentatge d’encerts i el nivell/.test(section), 'on-device, nothing sent, the app’s own privacy, % and level only');
const share = html.slice(html.indexOf('<dialog id="share-menu"'), html.indexOf('</dialog>', html.indexOf('<dialog id="share-menu"')));
assert(/data-privacy-open/.test(share) && /Comparteix el teu ball/.test(share), 'the sheet: title, Privadesa');
// simplified (Marc, 2026-09-28): no challenge tile, no copy link, no notes or Instagram tip; the link rides in the text
for (const gone of ['share-challenge', 'share-copy', 'share-links-note', 'share-tip', 'Repta un amic', 'Copia l’enllaç', 'adhesiu d’enllaç', 'btn-tile'])
  assert(!html.includes(gone), `removed from the page: ${gone}`);
assert(/id="results-share" type="button" class="btn btn-secondary"[^>]*><svg/.test(html), 'Comparteix: a .btn .btn-secondary with its icon first');
// the sheet's hierarchy: the preview first, ONE primary, the format as a compact toggle, the nickname as a switch,
// then two small shortcuts (WhatsApp · X), Tanca as a link; every control a .btn (or the .switch-row checkbox)
assert(share.indexOf('id="share-preview"') < share.indexOf('id="share-image"'), 'the card preview is the hero, before the actions');
assert.equal((share.match(/btn-primary/g) || []).length, 1, 'one primary action');
assert(/<button id="share-image"[^>]*class="btn btn-primary"[^>]*>(<svg[^>]*>.*?<\/svg>){2}<span id="share-image-label"[^>]*>/.test(share), 'primary: share / save icons first, then its label');
assert(/class="share-seg" role="group"/.test(share) && /id="share-format-story"[^>]*aria-pressed="true"[^>]*>Història \(9:16\)</.test(share) && /id="share-format-feed"[^>]*>Publicació \(4:5\)</.test(share), 'Història (9:16) / Publicació (4:5): a segmented toggle');
assert(!/>Story<|Instagram 4:5/.test(share), 'Catalan format names with the ratio (Marc, 2026-10-18), no «Story» / «Instagram 4:5»');
assert(/<p id="share-note" class="share-note" role="status" hidden>/.test(share) && share.indexOf('id="share-note"') > share.indexOf('id="share-title"'), 'after publishing: the place line under the title');
assert(/<div class="share-foot"><button id="share-privacy"/.test(share), 'Privadesa alone at the foot (Tanca is the X, top right)');
assert(/<label id="share-nick-row" class="switch-row[^"]*" for="share-nick" hidden>.*<input id="share-nick" type="checkbox" role="switch" checked>/.test(share), 'the nickname: a .switch-row, hidden until there is an alias, on by default');
const direct = share.match(/<a id="share-(?:whatsapp|x)" class="btn btn-link btn-compact"[^>]*target="_blank" rel="noopener noreferrer"><svg/g) || [];
assert.equal(direct.length, 2, 'WhatsApp · X: quiet icon + label text links (no outline)');
// image first (Marc, 2026-09-28): the primary is the image alone; the text + link is a quiet area under it
const linkArea = share.slice(share.indexOf('class="share-links"'), share.indexOf('class="share-foot"'));
assert(/<div class="share-links" role="group" aria-labelledby="share-links-label">\s*<p id="share-links-label" class="share-links-label"[^>]*>O envia el missatge:<\/p>/.test(share)
  && share.indexOf('id="share-image"') < share.indexOf('class="share-links"') && share.indexOf('id="share-more"') > share.indexOf('id="share-image"'),
  'under the ONE primary: a muted «O envia el missatge:» and its links');
assert(/<button id="share-more" type="button" class="btn btn-link btn-compact" data-mode="share"><svg class="line ico-more"[^>]*>.*?<\/svg><svg class="line ico-copy"[^>]*>.*?<\/svg><span id="share-more-label"[^>]*>Altres<\/span><\/button>/.test(linkArea),
  'Més…: a neutral share icon (a link icon when it copies), the same quiet link');
assert(!/btn-secondary|btn-primary/.test(linkArea), 'the link area has no outlined or filled buttons: clearly lesser than the primary');
assert(/\.share-links-label \{[^}]*color: #e8d8b8a6; font-size: 14px/.test(html), 'the label is small and muted');
assert.equal((share.match(/<(?:button|a) /g) || []).length, 8, 'Història · Publicació · Comparteix · WhatsApp · X · Més… · Privadesa · the X: nothing more');
assert(/<button id="share-close" type="button"[^>]*class="sheet-x" aria-label="Tanca"><svg/.test(share), 'Tanca: the round X, top right');
assert(!/<button(?![^>]*class="(?:btn|sheet-x))/.test(share) && !/<a (?![^>]*class="btn)/.test(share), 'every control is a .btn');
assert(/\.btn-compact \{[^}]*min-width: 44px; min-height: 44px/.test(html) && /\.share-seg \{/.test(html), 'the compact link is part of the .btn component, a 44 px target; the toggle has its style');
// the apps' own marks, filled (Simple Icons), not stroke look-alikes
assert(/id="share-whatsapp"[^>]*><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17\.472 14\.382/.test(share)
  && /id="share-x"[^>]*><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18\.901 1\.153h3\.68/.test(share), 'WhatsApp and X: their real logos');
// no jumps: the preview's box exists before the image (shimmer, then a fade); the format toggle is as wide as the rest;
// the sheet comes in with a short fade; the publish sheet grows smoothly from Publica to «Ets el número…»
assert(/<div id="share-frame" class="share-frame"><img id="share-preview"/.test(share) && /\.share-frame \{[^}]*aspect-ratio: 9 \/ 16/.test(html), 'the preview frame holds the card box');
assert(/#share-preview \{[^}]*opacity: 0; transition: opacity \.18s/.test(html) && /\.share-seg \{ width: 100%/.test(html) && /#share-menu\[open\] \{ animation: share-in/.test(html), 'fade in, full-width toggle, entrance');
// …without a blank hole before publishing: nothing reserved, the end's height eases when «Publicat!» / the place line come
assert(!/\.publish-end \{[^}]*min-height/.test(html) && /\.publish-end \{[^}]*justify-content: flex-end/.test(html)
  && /<div class="publish-end"><div id="publish-end-in">/.test(html), 'the publish sheet keeps no room for its success state');
const boardSrc = readFileSync(new URL('../src/ui/board-ui.js', import.meta.url), 'utf8');
assert(/new ResizeObserver[\s\S]{0,900}endBox\.animate\(\[\{ height: `\$\{from\}px`[\s\S]{0,120}duration: 200/.test(boardSrc)
  && /prefers-reduced-motion: reduce/.test(boardSrc), 'a new status / place line eases the height (0.2 s; none with reduced motion)');
const meta = (attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`))?.[1];
for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:locale']) assert(meta('property', k), `${k}`);
assert.equal(meta('property', 'og:locale'), 'ca_ES');
assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
for (const u of [meta('property', 'og:url'), meta('property', 'og:image'), meta('name', 'twitter:image')]) assert(u.startsWith('https://mulassa.cat/'), `absolute: ${u}`);
assert.equal(meta('property', 'og:image'), 'https://mulassa.cat/og.jpg');
const og = new URL('../public/og.jpg', import.meta.url);
assert(existsSync(og), 'public/og.jpg exists');
assert(statSync(og).size < 300 * 1024, 'og.jpg under 300 KB');
const jpg = readFileSync(og);
assert(jpg[0] === 0xff && jpg[1] === 0xd8, 'og.jpg is a JPEG');
let size = null;
for (let i = 2; i < jpg.length - 8;) { // the frame header (SOF0-2) says its size
  const marker = jpg[i + 1], len = jpg.readUInt16BE(i + 2);
  if (marker >= 0xc0 && marker <= 0xc2) { size = [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)]; break; }
  i += 2 + len;
}
assert.deepEqual(size, [1200, 630], 'og.jpg is 1200×630');
assert.equal(meta('property', 'og:image:width'), '1200');
console.log('share: challenge link, captions, fallbacks, eligibility, privacy and link preview ok');

// --- the sheet's ONE primary: «Comparteix» hands the image + caption + challenge link to the phone's own sheet (so any
// app gets the image), or «Desa la imatge» saves it where files can't be shared; while the card is being prepared it
// waits, disabled. WhatsApp · X carry the same caption + link (their links can't carry an image)
{
  const { setupShare } = await import('../src/ui/share-ui.js');
  const { PHOTO } = await import('../src/hud/share-card.js');
  const nodes = new Map();
  const el = () => ({ hidden: false, disabled: false, textContent: '', dataset: {}, style: {}, listeners: {}, open: false, attrs: {},
    addEventListener(t, f) { this.listeners[t] = f; }, setAttribute(k, v) { this.attrs[k] = v; }, classList: { toggle() {}, add() {}, remove() {} },
    showModal() { this.open = true; }, close() { this.open = false; }, contains: () => false });
  let gate = null; // a list: toBlob waits there (a slow JPEG encode) until the test lets it go
  const canvasCtx = () => { const canvas = { toBlob: (cb, type) => (gate ? gate.push(() => cb(new Blob(['x'], { type }))) : cb(new Blob(['x'], { type }))) }; const c = new Proxy({}, { get: (_, k) => k === 'canvas' ? canvas
    : k === 'measureText' ? s => ({ width: String(s).length * 10 }) : k.startsWith('create') ? () => ({ addColorStop() {} }) : () => {}, set: () => true }); return c; };
  const saved = [];
  const doc = { getElementById: id => nodes.get(id) ?? nodes.set(id, el()).get(id), activeElement: null, body: { appendChild() {} },
    createElement: tag => tag === 'a' ? { click() { saved.push(this.download); }, remove() {} } : { getContext: canvasCtx } };
  const shared = [];
  const phone = { share(d) { shared.push(d); return Promise.resolve(); }, canShare: d => !d.files || d.files.length === 1 };
  for (const [nav, label] of [[phone, 'Comparteix la imatge'], [{}, 'Desa la imatge']]) {
    nodes.clear();
    const ui = setupShare({ focusIn() {}, doc, nav, store: { get: () => null, set() {} }, fonts: null,
      url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} }, settle: () => Promise.resolve() });
    const r = run({ diff: 0, pct: 95, newRecord: true, t: 1 });
    ui.results(true, r, null);
    doc.getElementById('results-share').listeners.click();
    const primary = doc.getElementById('share-image');
    assert(primary.disabled && doc.getElementById('share-image-label').textContent === 'Preparant la imatge…', 'waits while the card is prepared');
    for (let i = 0; i < 20 && primary.disabled; i++) await new Promise(r => setTimeout(r, 0));
    assert(!primary.disabled && doc.getElementById('share-image-label').textContent === label, `ready: enabled, «${label}»`);
    const cap = shareText(r), link = `${SITE}?repte=95-0`;
    assert.equal(doc.getElementById('share-whatsapp').href, shareLinks(cap, link).whatsapp, 'WhatsApp: the caption + the challenge link');
    assert.equal(doc.getElementById('share-x').href, shareLinks(cap, link).x, 'X: the caption + the challenge link');
    primary.listeners.click();
    await new Promise(r => setTimeout(r, 0));
    if (nav === phone) {
      assert(shared.length === 1 && shared[0].files?.length === 1 && shared[0].files[0].name === 'mulassa-tap-tap-dance.jpg', 'Comparteix: the image file to the system sheet');
      assert.deepEqual(Object.keys(shared[0]), ['files'], 'the image alone: no title, text or url (iOS keeps «Desa la imatge»; no target swaps the picture for the link)');
      assert.equal(doc.getElementById('share-status').textContent, 'Compartit!');
    } else {
      assert.deepEqual(saved, ['mulassa-tap-tap-dance.jpg'], 'no file sharing: the image is saved');
      assert(shared.length === 1, 'no system sheet where files cannot be shared');
    }
  }
  assert(/#share-image:enabled \{[^}]*opacity: 1[^}]*-webkit-text-fill-color: #2a1a10/.test(html), 'the ready button is spelled out solid (no lingering faded look on iOS)');
  console.log('share sheet: primary label, states and targets, WhatsApp / X links ok');
  // Més…: the caption + link (no file) to the system sheet; without one «Copia»: the clipboard, else a hidden field's
  // copy, else the link in the status line to copy by hand
  {
    const cases = [
      ['sheet', phone, 'Altres', 'Compartit!'],
      ['clipboard', { clipboard: { writeText: t => (copiedText.push(t), Promise.resolve()) } }, 'Copia', 'Text copiat.'],
      ['execCommand', { clipboard: { writeText: () => Promise.reject(new Error('blocked')) } }, 'Copia', 'Text copiat.', true],
      ['by hand', {}, 'Copia', `Copia aquest text: ${shareText(run({ diff: 0, pct: 95, newRecord: true, t: 1 }))} ${SITE}?repte=95-0`, false],
    ];
    const copiedText = [];
    for (const [name, nav, label, said, execOk] of cases) {
      nodes.clear(); shared.length = 0;
      const d = { ...doc, execCommand: execOk === undefined ? undefined : () => execOk,
        createElement: tag => tag === 'textarea' ? { style: {}, select() {}, remove() {} } : doc.createElement(tag) };
      const menu = d.getElementById('share-menu'); menu.appendChild = () => {};
      const ui = setupShare({ focusIn() {}, doc: d, nav, store: { get: () => null, set() {} }, fonts: null,
        url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} }, settle: () => Promise.resolve() });
      const r = run({ diff: 0, pct: 95, newRecord: true, t: 1 });
      ui.results(true, r, null);
      d.getElementById('results-share').listeners.click();
      const more = d.getElementById('share-more');
      assert.equal(d.getElementById('share-more-label').textContent, label, `${name}: «${label}»`);
      more.listeners.click();
      for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
      assert.equal(d.getElementById('share-status').textContent, said, `${name}: ${said}`);
      if (name === 'sheet') assert.deepEqual(shared, [{ text: shareText(r), url: `${SITE}?repte=95-0` }], 'Més…: the caption + link, no image');
    }
    assert.deepEqual(copiedText, [`${shareText(run({ diff: 0, pct: 95, newRecord: true, t: 1 }))} ${SITE}?repte=95-0`], 'Copia: the caption + the challenge link, as WhatsApp gets it');
  }
  console.log('share sheet: Més… / Copia ok');
  const wait = async () => { await new Promise(r => setTimeout(r, 0)); for (let i = 0; i < 20 && doc.getElementById('share-image').disabled; i++) await new Promise(r => setTimeout(r, 0)); };
  // a run worth showing off opens Comparteix by itself (when no publish prompt does), once, if nothing else is open by then
  {
    const mk = extra => { nodes.clear(); return setupShare({ focusIn() {}, doc, nav: phone, store: { get: () => null, set() {} }, fonts: null,
      url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} }, settle: () => Promise.resolve(), autoDelay: 0, ...extra }); };
    const sheet = () => doc.getElementById('share-menu').open, tick = () => new Promise(r => setTimeout(r, 5));
    let ui = mk({ auto: () => true });
    ui.results(true, run({ diff: 0, pct: 95, newRecord: true, t: 20 }), null); await tick();
    assert(sheet(), 'a record: Comparteix opens by itself');
    ui = mk({ auto: () => true });
    ui.results(true, run({ diff: 0, pct: 60, stars: 2, t: 21 }), null); await tick();
    assert(!sheet(), 'nothing to show off: it stays closed');
    ui = mk({ auto: () => false });
    ui.results(true, run({ diff: 0, pct: 95, newRecord: true, t: 22 }), null); await tick();
    assert(!sheet(), 'the publish prompt will do it: not twice');
    ui = mk({ auto: () => true, ready: () => false });
    ui.results(true, run({ diff: 0, pct: 95, newRecord: true, t: 23 }), null); await tick();
    assert(!sheet(), 'another sheet is up: it does not open over it');
    ui = mk({ auto: () => true, autoDelay: 30 });
    ui.results(true, run({ diff: 0, pct: 95, newRecord: true, t: 24 }), null); ui.results(false, null, null); await new Promise(r => setTimeout(r, 60));
    assert(!sheet(), 'leaving the results first: it never comes late');
  }
  // the nickname switch redraws the card behind a steady primary: no «Preparant…» flash, even for a slow encode (only a format whose
  // photo is still to render says it, keeping its icon); same label, icon (mode) and state; a tap during the redraw
  // never sends the previous card: it waits for the new one and shares that
  {
    nodes.clear(); shared.length = 0;
    const ui = setupShare({ focusIn() {}, doc, nav: phone, store: { get: () => null, set() {} }, fonts: null,
      url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} }, settle: () => Promise.resolve(), hero: (w, h) => ({ width: w, height: h }) });
    ui.results(true, run({ diff: 0, pct: 95, t: 4 }), null);
    doc.getElementById('results-share').listeners.click(); await wait();
    const primary = doc.getElementById('share-image'), label = doc.getElementById('share-image-label');
    const look = () => `${label.textContent}|${primary.disabled}|${primary.dataset.mode}`, ready = 'Comparteix la imatge|false|share';
    assert.equal(look(), ready);
    primary.listeners.click(); await new Promise(r => setTimeout(r, 0));
    const before = shared.at(-1).files[0];
    const releases = gate = [];
    doc.getElementById('share-nick').listeners.change();
    const during = [look()];
    for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 0)); during.push(look()); }
    assert(during.every(l => l === ready), `a redraw: the primary stays «Comparteix», enabled, same icon: ${[...new Set(during)]}`);
    primary.listeners.click();
    assert.equal(shared.length, 1, 'a tap during the redraw does not send the previous card');
    assert.equal(releases.length, 1, 'the new card is being encoded');
    gate = null; releases.shift()(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
    assert(shared.length === 2 && shared[1].files[0] !== before, 'the waiting tap shares the new card as soon as it is ready');
    assert.equal(look(), ready);
    let slow = gate = [];
    doc.getElementById('share-nick').listeners.change();
    await new Promise(r => setTimeout(r, 350));
    assert.equal(look(), ready, 'a slow redraw encode: still no «Preparant…»');
    gate = null; slow.shift()(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
    assert.equal(look(), ready);
    slow = gate = [];
    doc.getElementById('share-format-feed').listeners.click();
    assert.equal(look(), 'Preparant la imatge…|true|share', 'a format whose photo is still to render says so (keeping its icon)');
    for (let i = 0; i < 20 && !slow.length; i++) await new Promise(r => setTimeout(r, 0));
    gate = null; slow.shift()(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
    assert.equal(look(), ready);
    assert.equal(shared.length, 2, 'nothing shared without a tap');
    doc.getElementById('share-close').listeners.click();
    console.log('share sheet: a steady primary while the card is redrawn ok');
  }
  // the profile's answer arrives after the card is drawn (a publication refreshes the cached name): the card is drawn again,
  // with the check; an unchanged name draws nothing
  {
    nodes.clear();
    const mem = { 'leaderboard-alias': 'Portadora', 'share-format': 'feed' }, made = [];
    const ui = setupShare({ focusIn() {}, doc, nav: phone, store: { get: k => mem[k] ?? null, set: (k, v) => { mem[k] = v; } }, fonts: null,
      url: { createObjectURL: () => (made.push(1), `blob:card${made.length}`), revokeObjectURL() {} }, settle: () => Promise.resolve(), hero: (w, h) => ({ width: w, height: h }) });
    doc.getElementById('share-nick').checked = true; // on by default in the page
    ui.results(true, run({ diff: 0, pct: 95, t: 31 }), null);
    ui.refreshName(); // closed: nothing
    doc.getElementById('results-share').listeners.click(); await wait();
    assert.equal(made.length, 1);
    ui.refreshName(); await wait();
    assert.equal(made.length, 1, 'same name: no new card');
    mem['leaderboard-alias:identity'] = JSON.stringify({ prof: { verified: true } });
    ui.refreshName(); await wait(); await new Promise(r => setTimeout(r, 0));
    assert.equal(made.length, 2, 'the check arrived: drawn again');
    ui.refreshName(); await wait();
    assert.equal(made.length, 2, 'and once');
  }
  // Late photo/rank answers from the previous figure must not replace a new run.
  {
    nodes.clear(); shared.length = 0;
    const photos = [], ranks = [];
    let alias = 'PublicAlias';
    const ui = setupShare({ focusIn() {}, doc, nav: phone,
      store: { get: key => key === 'share-format' ? 'square' : alias, set() {} }, fonts: null,
      url: { createObjectURL: () => 'blob:card', revokeObjectURL() {} }, settle: async () => {},
      hero: (w, h, figureId) => new Promise(resolve => photos.push({ figureId, resolve, w, h })),
      standing: figure => new Promise(resolve => ranks.push(Object.assign(resolve, { figure }))) });
    ui.results(true, run({ figureId: 'mulassa-valls', score: 15000, t: 9 }), null);
    doc.getElementById('results-share').listeners.click();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(doc.getElementById('share-menu').dataset.format, 'feed', 'legacy saved square migrates to 4:5');
    assert.equal(photos.length, 1); assert.equal(ranks.length, 1);
    ui.results(true, run({ figureId: 'drac-valls', score: 12000, t: 9 }), null);
    doc.getElementById('results-share').listeners.click();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(photos.length, 2); assert.equal(ranks.length, 2, 'the Drac asks for its own board');
    assert.deepEqual(ranks.map(r => r.figure), ['mulassa-valls', 'drac-valls'], 'each figure its own place');
    ranks[0]({ pos: 2, total: 99 }); photos[0].resolve({ width: 1104, height: 988 });
    await new Promise(r => setTimeout(r, 0));
    assert(doc.getElementById('share-image').disabled, 'old photo cannot finish the current card');
    photos[1].resolve({ width: 1104, height: 988 }); await wait();
    doc.getElementById('share-image').listeners.click(); await new Promise(r => setTimeout(r, 0));
    assert.equal(shared.at(-1).files[0].name, 'drac-de-valls.jpg');
    assert.deepEqual(Object.keys(shared.at(-1)), ['files']);
    assert.equal(photos.length, 2, 'stale rank does not start a new capture');
    assert(doc.getElementById('share-preview').alt.includes('Drac'));
  }
}

// Poster geometry: 4:5 replaces the saved square option. Optional rows determine
// the group's bounds; the shorter Drac ticket receives the same clear space.
{
  const { cardLayout, cardRank, drawCard, loadCardFonts, toJpeg } = await import('../src/hud/share-card.js');
  for (const figureId of ['mulassa-valls', 'drac-valls']) for (const alias of ['', 'UnAliasMoltLlarg']) for (const rank of [null, { pos: 12, total: 86 }]) {
    const d = { figureId, alias, rank, score: 12345, diff: 2, diffName: 'DIFÍCIL', pct: 92, maxCombo: 100 };
    const L = cardLayout('feed', d);
    assert.deepEqual([L.w, L.h], [1080, 1350]);
    assert(Math.abs((L.discY - L.titleBottom) - (L.footY - L.ticketY - L.ticketH - 12)) < .001, 'equal clear space around combined photo/ticket');
    assert(L.discY > L.titleBottom && L.disc === 540, 'centering preserves the figure size');
    assert.equal(Boolean(L.rank), Boolean(rank), 'both figures have a board');
    const story = cardLayout('story', d);
    assert.equal(story.footY, 1652); assert.equal(story.discY, 470);
    assert(story.ticketY + story.ticketH + 12 < story.footY, 'story content clears its anchored footer');
    const text = [], c = new Proxy({ canvas: {} }, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? s => ({ width: String(s).length * 20 }) : k === 'fillText' ? s => text.push(String(s)) : k.startsWith('create') ? () => ({ addColorStop() {} }) : () => {}, set: (t, k, v) => (t[k] = v, true) });
    drawCard(c, 'feed', d, null);
    assert(text.includes('12.345') && text.includes('92%') && text.includes('100'), 'actual points, accuracy and streak');
    assert(text.includes(figureId === 'drac-valls' ? 'DRAC' : 'MULASSA'));
    assert(text.includes('mulassa_cat') && !text.includes('@mulassa_cat'));
    assert.equal(text.some(s => s.includes('#12')), Boolean(rank));
  }
  for (const rank of [{ pos: 0, total: 20 }, { pos: 21, total: 20 }, { pos: '2', total: 20 }, { pos: 1, total: NaN }]) assert.equal(cardRank({ rank }), null);
  // the name as the boards show it: a confirmed address's check drawn after it (the same shape), a guest's «#1234», no check
  for (const [alias, verified] of [['Timbaler', true], ['Timbaler#0042', false]]) {
    const text = [], discs = [], c = new Proxy({ canvas: {} }, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? s => ({ width: String(s).length * 20 }) : k === 'fillText' ? (s, x) => text.push([String(s), x]) : k === 'arc' ? (x, y, r) => discs.push(r) : k.startsWith('create') ? () => ({ addColorStop() {} }) : () => {}, set: (t, k, v) => (t[k] = v, true) });
    drawCard(c, 'story', { figureId: 'mulassa-valls', alias, verified, rank: null, score: 12345, diff: 2, diffName: 'DIFÍCIL', pct: 92, maxCombo: 100 }, null);
    const name = text.find(([s]) => s === alias);
    assert(name, `${alias}: drawn whole`);
    assert.equal(discs.includes(16), verified, `${alias}: the check only for a confirmed address`);
    assert.equal(name[1] < 540, verified, 'the name and its check are centred together');
  }
  { // a rank line too wide for the ticket breaks in two half-size lines (a space-less run just shrinks); one that fits stays a single call
    const run = per => { const calls = [], fonts = []; let font = '';
      const c = new Proxy({ canvas: {} }, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? s => ({ width: String(s).length * per * +/(\d+(?:\.\d+)?)px/.exec(font)[1] / 32 }) : k === 'fillText' ? (s, x, y) => calls.push([String(s), y, font]) : k.startsWith('create') ? () => ({ addColorStop() {} }) : () => {}, set: (t, k, v) => (k === 'font' && (font = v), t[k] = v, true) });
      drawCard(c, 'feed', { figureId: 'mulassa-valls', alias: '', rank: { pos: 12, total: 86 }, score: 12345, diff: 2, diffName: 'DIFÍCIL', pct: 92, maxCombo: 100 }, null);
      return calls; };
    const one = run(20).filter(([s]) => /12/.test(s) && /86/.test(s)), words = one[0][0].split(' '), two = run(60).filter(([s]) => s.split(' ').every(w => words.includes(w)) && s.length > 3 && !/^[A-ZÀ-Ú0-9.%]+$/.test(s));
    assert.equal(one.length, 1, 'fits: one drawing call, as before');
    assert.equal(two.length, 2, 'too wide: two lines');
    assert.equal(two.map(l => l[0]).join(' '), one[0][0], 'the same words');
    assert(two[0][1] < two[1][1] && two[1][1] - two[0][1] <= 32 * 0.55 + .001 && two[1][1] - 32 * .55 / 2 <= one[0][1] + 16 * 1.1, 'both lines stay inside the one-line block');
  }
  const fonts = [];
  await loadCardFonts({ load: async (...args) => fonts.push(args), ready: Promise.resolve() });
  assert(fonts.every(([font]) => font.includes('Baloo 2')) && fonts.length === 2, 'only the local Baloo weights');
  await assert.rejects(loadCardFonts({ load: async () => { throw Error('font unavailable'); } }), 'never silently export a fallback font');
  const file = await toJpeg({ toBlob: cb => cb(new Blob(['x'])) }, .9, 'drac-valls');
  assert.equal(file.name, 'drac-de-valls.jpg');
}
console.log('share poster: format, figure identity, scores, rank validation, optional-row centering and fonts ok');

// --- language in the challenge link: only outside Catalan; stripChallenge keeps it
{
  assert.equal(challengeUrl(94, 2), 'https://mulassa.cat/?repte=94-2', 'ca: no lang, byte-identical');
  assert.equal(stripChallenge('https://x.test/?lang=es&repte=94-2'), '/?lang=es', 'lang survives stripChallenge');
}
