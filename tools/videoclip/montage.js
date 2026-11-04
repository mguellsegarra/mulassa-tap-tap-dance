// The tool's montages (proposals/*.json, README there): the list for the selector, gapless playback of a proposal's
// pieces of the song (Web Audio: each piece scheduled on one clock, 30 ms crossfades at the joins, the proposal's fades)
// and its overlays (a small mulassa.cat watermark, a title line, the end card, the fades to black) drawn over a frame.
import { checkProposal, proposalLength, sourceAt } from './proposal.js';
import { CARDS } from './endcard.js';
import { STYLES } from './textfx.js';
import clip from './clip.json';
import edit from './edit.json';

// a shout laid over the montage anywhere (overlay {type: 'shout', at, index}): the lead vocal's own shout (its stem,
// moved onto the mix's clock: analyze.py measured the stems 23 ms behind the mix) and its full-screen letters
const STEM_LAG = .023, PRE = .05, BEAT = 60 / clip.bpm;
export const shoutLen = i => (clip.shoutLens?.[i] ?? .8) + (edit.texts?.[i]?.after ?? 1.5) * BEAT;
const shoutOn = (p, u) => (p.overlays ?? []).find(o => o.type === 'shout' && u >= o.at && u < o.at + shoutLen(o.index));

const ORDER = ['youtube', 'reel', 'stories', 'tiktok'];
export const CARD_FADE = 4.5; // s: the music fades out under the end card, silent before its fade to black
// every proposal file, valid or not (the selector shows why one cannot play)
export async function listMontages(clip) {
  const files = await fetch('/__videoclip/proposals').then(r => r.json()).catch(() => []);
  return files.map(p => ({ p, ...checkProposal(p, clip) }))
    .sort((a, b) => ORDER.indexOf(a.p.group) - ORDER.indexOf(b.p.group) || a.p.id.localeCompare(b.p.id));
}
export { proposalLength, sourceAt };

// ---- sound: the song decoded once; play(p, u) starts the proposal at its second u, now() reads where it is
export function createMontageAudio(url) {
  const ac = new AudioContext(); let buffer = null, nodes = [], startAt = 0, u0 = 0, running = false;
  let voice = null; const load = u => fetch(u).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b));
  const ready = Promise.all([load(url).then(b => { buffer = b; }), load('media/stems-cut/0%20Lead%20Vocals.wav').then(b => { voice = b; }).catch(() => {})]);
  const XF = .03;
  function stop() { for (const n of nodes) try { n.stop(); } catch {} nodes = []; running = false; }
  // a perfect loop: one turn rendered into its own buffer (the pieces and the wrap joined with the same crossfades), looped
  const loops = new Map();
  function loopBuffer(p) {
    if (loops.has(p)) return loops.get(p);
    const sr = buffer.sampleRate, n = Math.round(XF * sr), ch = [...Array(buffer.numberOfChannels)].map((_, c) => buffer.getChannelData(c));
    const total = p.segments.reduce((a, s) => a + Math.round((s.to - s.from) * sr), 0), out = ac.createBuffer(ch.length, total, sr);
    ch.forEach((src, c) => {
      const dst = out.getChannelData(c); let at = 0;
      for (const [i, s] of p.segments.entries()) {
        const a = Math.round(s.from * sr), len = Math.round((s.to - s.from) * sr);
        for (let k = 0; k < len; k++) dst[at + k] = src[a + k] ?? 0;
        if (i > 0) for (let k = 0; k < n; k++) { const w = Math.sin(k / n * Math.PI / 2); dst[at + k] = dst[at + k] * w + (src[Math.round(p.segments[i - 1].to * sr) + k] ?? 0) * Math.cos(k / n * Math.PI / 2); }
        at += len;
      }
      if (voice) for (const o of (p.overlays ?? []).filter(o => o.type === 'shout')) { // the laid shouts' voice
        const v = voice.getChannelData(Math.min(c, voice.numberOfChannels - 1)), from = Math.round((clip.shouts[o.index] + STEM_LAG - PRE) * sr), at = Math.round((o.at - PRE) * sr), n2 = Math.round((shoutLen(o.index) + PRE) * sr);
        for (let k = 0; k < n2; k++) { const j = (at + k + total) % total; dst[j] += v[from + k] ?? 0; }
      }
      const first = Math.round(p.segments[0].from * sr); // the wrap: the turn's tail blends into what leads into its start
      for (let k = 0; k < n; k++) { const w = Math.sin(k / n * Math.PI / 2), j = total - n + k; dst[j] = dst[j] * Math.cos(k / n * Math.PI / 2) + (src[first - n + k] ?? 0) * w; }
    });
    loops.set(p, out); return out;
  }
  async function play(p, u) {
    await ready; await ac.resume(); stop();
    if (p.loop) {
      const src = ac.createBufferSource(), b = loopBuffer(p); src.buffer = b; src.loop = true; src.connect(ac.destination);
      const t0 = ac.currentTime + .05, off = u % b.duration; src.start(t0, off); nodes.push(src); startAt = t0; u0 = off; running = true; return;
    }
    const len = proposalLength(p), fin = p.fade?.in ?? 0, fout = p.fade?.out ?? 0, t0 = ac.currentTime + .05;
    const master = ac.createGain(); master.connect(ac.destination);
    // the proposal's own fades, on the master (from where playback starts); under an end card the music fades out (cardFade)
    const card = (p.overlays ?? []).find(o => o.type === 'endcard');
    const env = x => Math.min(1, fin ? x / fin : 1, fout ? (len - x) / fout : 1, card ? Math.max(0, 1 - (x - card.at) / CARD_FADE) ** 2 : 1);
    master.gain.setValueAtTime(Math.max(0, env(u)), t0);
    if (fin && u < fin) master.gain.linearRampToValueAtTime(1, t0 + fin - u);
    if (card && !p.loop) for (let x = Math.max(u, card.at); x <= Math.min(len, card.at + CARD_FADE) + .001; x += .1) master.gain.linearRampToValueAtTime(env(x), t0 + x - u); // (a curve as small ramps)
    else if (fout) { const a = Math.max(u, len - fout); master.gain.setValueAtTime(Math.max(0, env(a)), t0 + a - u); master.gain.linearRampToValueAtTime(0, t0 + len - u); }
    let at = 0;
    for (const s of p.segments) {
      const segLen = s.to - s.from, end = at + segLen;
      if (end > u && s.from < buffer.duration) {
        const into = Math.max(0, u - at), when = t0 + Math.max(0, at - u), src = ac.createBufferSource(), gain = ac.createGain();
        src.buffer = buffer; src.connect(gain); gain.connect(master);
        const dur = Math.min(segLen - into, buffer.duration - (s.from + into)) + XF; // (a little past the join: the crossfade)
        gain.gain.setValueAtTime(at > 0 && into === 0 ? 0 : 1, when); if (at > 0 && into === 0) gain.gain.linearRampToValueAtTime(1, when + XF);
        if (end < len) { gain.gain.setValueAtTime(1, when + dur - XF); gain.gain.linearRampToValueAtTime(0, when + dur); }
        if (dur > 0) { src.start(when, s.from + into, dur); nodes.push(src); }
      }
      at = end;
    }
    if (voice) for (const o of (p.overlays ?? []).filter(o => o.type === 'shout')) {
      const a = o.at - PRE, d = shoutLen(o.index) + PRE; if (a + d <= u) continue;
      const src = ac.createBufferSource(); src.buffer = voice; src.connect(master);
      const into = Math.max(0, u - a); src.start(t0 + Math.max(0, a - u), clip.shouts[o.index] + STEM_LAG - PRE + into, d - into); nodes.push(src);
    }
    startAt = t0; u0 = u; running = true;
  }
  return { ready, play, stop, now: () => (running ? u0 + Math.max(0, ac.currentTime - startAt) : null) };
}

// ---- overlays over one frame (ctx: the frame's 2D layer, already holding its picture; src: the picture alone)
const FONT = px => `800 ${px}px 'Baloo 2', system-ui, sans-serif`;
const clamp = x => Math.max(0, Math.min(1, x));
const ramp = (u, a, z, f = .25) => clamp(Math.min((u - a) / f, (z - u) / f));
function watermark(ctx, W, H, k, tall) { // small pill, low and centred in a tall frame (above the app's captions), low right in a wide one
  const px = Math.min(W, H) * (tall ? .03 : .026); ctx.font = FONT(px);
  const w = ctx.measureText('mulassa.cat').width + px * 1.3, h = px * 1.7, x = tall ? W / 2 - w / 2 : W - w - W * .03, y = tall ? H * .72 : H - h - H * .05;
  ctx.save(); ctx.globalAlpha = .85 * k; ctx.fillStyle = '#f5c518'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#2a1a10'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('mulassa.cat', x + w / 2, y + h / 2 + px * .08); ctx.restore();
}
// the call to play, small: the question with the mulassa.cat pill under it, low in the frame (tall: above the app's captions)
function cta(ctx, W, H, k, size = 1, u = 0, at = null, question = true, pillAt = null) { // at: its height (share of the frame), else low; question false: the pill alone; pillAt: the pill apart, at that height
  const tall = H > W, px = Math.min(W, H) * (tall ? .052 : .04) * size, pp = px * .82, cy = at != null ? H * at : tall ? H * .6 : H * .72;
  ctx.save(); ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (question) { ctx.font = FONT(px); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = px * .5; ctx.fillText("T'atreveixes a fer-la ballar?", W / 2, cy); }
  ctx.shadowBlur = 0; ctx.font = FONT(pp); const w = ctx.measureText('mulassa.cat').width + pp * 1.4, h = pp * 1.7, y = pillAt != null ? H * pillAt - h / 2 : question ? cy + px * .9 : cy - h / 2;
  ctx.shadowColor = 'rgba(255,220,120,.5)'; ctx.shadowBlur = h * .5; ctx.fillStyle = '#f5c518'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y, w, h, h / 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#2a1a10'; ctx.fillText('mulassa.cat', W / 2, y + h / 2 + pp * .08);
  // the glint, all the time: a soft slanted band across the pill every GLINT_EVERY s, in half a second (endcard.js's)
  const f = (u % GLINT_EVERY) / .5;
  if (f < 1) {
    const e = f * f * (3 - 2 * f), bw = h * 1.1, x = W / 2 - w / 2 - bw + e * (w + 2 * bw);
    ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y, w, h, h / 2); ctx.clip();
    ctx.translate(x, y + h / 2); ctx.transform(1, 0, -.5, 1, 0, 0);
    const gr = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.42, 'rgba(255,255,255,.18)'); gr.addColorStop(.5, 'rgba(255,255,255,.6)'); gr.addColorStop(.58, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(-bw / 2, -h, bw, h * 2);
  }
  ctx.restore();
}
const GLINT_EVERY = 2.5;
// look: over (dims the picture), black, or clean (the picture untouched, the line at height y with a shadow: a hook line)
function title(ctx, W, H, k, text, look, size = 1, y = .5) {
  ctx.save();
  if (look === 'black') { ctx.globalAlpha = k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } else if (look !== 'clean') { ctx.globalAlpha = .55 * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  const px = Math.min(W * (H > W ? .08 : .055), H * .1) * size; ctx.font = FONT(px); ctx.globalAlpha = k; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (look === 'clean') { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = px * .35; ctx.lineJoin = 'round'; ctx.lineWidth = px * .12; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(text, W / 2, H * y); }
  else { ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = px * .4; }
  ctx.fillText(text, W / 2, look === 'clean' ? H * y : H / 2); ctx.restore();
}
// does anything draw over the frame at u? (the tool shows its 2D layer only then)
export const overlayAt = (p, u) => !!p && ((p.fade?.in && u < p.fade.in) || (p.fade?.out && u > proposalLength(p) - p.fade.out) ||
  (p.overlays ?? []).some(o => { const a = o.at ?? o.from, z = o.type === 'endcard' ? a + CARDS.sobre.dur : o.type === 'shout' ? a + shoutLen(o.index) : o.to ?? a + (o.dur ?? 0); return u >= a && u < z; }));
// free: 0..1, how clear of a shout's full-screen letters this moment is (the call to play steps aside for them)
export function drawOverlays(ctx, W, H, p, u, src, free = 1) {
  const len = proposalLength(p), tall = H > W;
  const card = (p.overlays ?? []).find(o => o.type === 'endcard' && u >= o.at && u < o.at + CARDS.sobre.dur);
  if (card) CARDS.sobre.draw(ctx, W, H, u - card.at, src);
  const sh = shoutOn(p, u); // a laid shout's letters, its approved style (textfx.js, edit.json texts)
  if (sh) { const spec = edit.texts[sh.index], sec = u - sh.at; STYLES[spec.style].draw(ctx, W, H, src, { ...spec, b: sec / BEAT, sec, len: clip.shoutLens?.[sh.index] ?? .8, syl: spec.syl ?? clip.shoutSyl?.[sh.index], kick: 0 }); }
  free = Math.min(free, [-.4, -.2, 0, .2, .4].filter(d => !shoutOn(p, u + d)).length / 5); // (the call to play steps aside for laid shouts too)
  for (const o of p.overlays ?? []) {
    if (o.type === 'title') { const k = ramp(u, o.at, o.at + o.dur, o.cut ? .001 : .25); if (k > 0) title(ctx, W, H, k, o.text ?? '', o.look, o.size ?? 1, o.y ?? .5); } // (cut: on and off dry, no fade)
    if (o.type === 'cta' && !card) { const k = ramp(u, o.from, o.to, .3) * free; if (k > 0) cta(ctx, W, H, k, o.size ?? 1, u - o.from, o.y, o.question !== false, o.pillY); }
    if (o.type === 'watermark' && !card) { const k = ramp(u, o.from, o.to, .4); if (k > 0) watermark(ctx, W, H, k, tall); }
  }
  const black = Math.max(p.fade?.in ? 1 - u / p.fade.in : 0, p.fade?.out ? 1 - (len - u) / p.fade.out : 0);
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(black)})`; ctx.fillRect(0, 0, W, H); }
}
