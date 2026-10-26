// "Ajusta la sincronia", in three steps on one sheet (data-state on the dialog):
//  intro  — why and what to do, the current offset with − / + / Posa a 0, and Comença;
//  run    — a 3-2-1 count-in, then a metronome of CAL.clicks clicks; every tap on the sheet or key press counts;
//  result — the median lag, one line reading it, Desa / Torna-hi.
// Works muted too: the circle pulses when each click would be heard, so it can be done by eye.
// The stored offset is written only when it really changed (offsetDraft), never just by opening or closing.
import { Clicker } from '../platform/clicker.js';
import { CAL, clickTimes, measureOffset, fmtMs, verdict, offsetDraft } from '../game/calibration.js';
import { eventAge } from '../game/progress.js';
import { tr } from '../i18n/messages.js';

const COUNT = 3; // count-in beats before the first click

export function setupSync({ beat = CAL.beat, get, set, onOpen = () => {}, onClose = () => {} }) {
  const $ = id => document.getElementById(id);
  const dlg = $('sync-menu'), circle = $('sync-beat'), count = $('sync-count'), dots = $('sync-dots'), live = $('sync-live');
  const value = $('sync-value'), measured = $('sync-measured'), note = $('sync-verdict'), retry = $('sync-retry'), ok = $('sync-ok');
  dots.replaceChildren(...Array.from({ length: CAL.clicks }, () => document.createElement('i')));
  let clk = null, start = 0, clicks = null, taps = [], raf = 0, result = null, doneAt = 0, draft = offsetDraft(0);

  const state = s => { dlg.dataset.state = s; dlg.focus(); }; // the sheet keeps focus: keys reach it, no button eats a tap
  const now = (ms, saved) => { // "Ara: +40 ms" / "Ara: sense ajust", or "Desat: +73 ms" right after Desa
    value.textContent = tr(saved ? 'ui.sync.saved' : 'ui.sync.now', { value: ms ? fmtMs(ms) : tr('ui.sync.none') });
    value.classList.toggle('saved', !!saved);
  };
  const nudge = d => { draft.set(d == null ? 0 : draft.value + d); now(draft.value); };

  function intro() { stop(); state('intro'); }
  function run() { // a fresh metronome (a new context: clicks of an interrupted run can't sound over it)
    stop();
    clk = new Clicker(); // inside the Comença / Torna-hi gesture: the audio is allowed to start
    clicks = null; taps = [];
    [...dots.children].forEach(d => d.className = '');
    count.textContent = ''; live.textContent = tr('ui.sync.getReady');
    circle.style.setProperty('--p', 0);
    state('run');
    loop();
  }
  function tap(e) { // at the event's timeStamp, as the game's press() judges it
    if (dlg.dataset.state !== 'run' || !clicks) return;
    const now = performance.now();
    taps.push(clk.heard(now - eventAge(e?.timeStamp, now) * 1000));
    circle.classList.remove('tap'); void circle.offsetWidth; circle.classList.add('tap');
  }
  function done() {
    result = measureOffset(taps, clicks);
    stop();
    doneAt = performance.now();
    const fail = result == null;
    dlg.classList.toggle('fail', fail);
    measured.textContent = fail ? '' : fmtMs(result);
    note.textContent = fail ? tr('ui.sync.tooFew') : verdict(result);
    retry.classList.toggle('btn-primary', fail); retry.classList.toggle('btn-link', !fail); // too few taps: Torna-hi is the one thing to do
    state('result');
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!clk) return;
    if (!clicks) { // schedule the count-in and the whole metronome on the audio clock as soon as it runs
      if (clk.ctx.state !== 'running') { Promise.resolve(clk.ctx.resume?.()).catch(() => {}); return; }
      start = clk.ctx.currentTime + 0.3;
      for (let i = 0; i < COUNT; i++) clk.blip(start + i * beat, 1320, 1320, 0.03, 0.04); // soft beeps, not measured
      clicks = clickTimes(start + COUNT * beat, CAL.clicks, beat);
      clicks.forEach((c, i) => clk.click(c, i % 4 === 0));
    }
    const h = clk.heard(), n = clicks.filter(c => c <= h).length; // clicks heard so far
    let since = n ? h - clicks[n - 1] : 9;
    if (!n) { // count-in: 3, 2, 1 on the metronome's own beat
      const k = Math.floor((h - start) / beat);
      const txt = k >= 0 && k < COUNT ? String(COUNT - k) : '';
      if (count.textContent !== txt) count.textContent = txt;
      if (k >= 0) since = (h - start - k * beat) * 1.6; // a softer pulse than the clicks
    } else if (count.textContent) { count.textContent = ''; live.textContent = tr('ui.sync.tapEach'); }
    circle.style.setProperty('--p', Math.max(0, 1 - since / 0.22).toFixed(3)); // flash on the click, fading in 220 ms
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i < n));
    if (h > clicks.at(-1) + beat * 0.8) done();
  }
  function stop() {
    cancelAnimationFrame(raf);
    clk?.close(); clk = null;
    circle.style.setProperty('--p', 0);
  }

  dlg.addEventListener('close', () => { stop(); draft.commit(set); onClose(); }); // Tanca / Esc keep a manual change
  // the metronome has its own context, which the game's suspend never reaches: leaving the page mid-run ends it
  const away = () => { if (dlg.dataset.state === 'run') intro(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
  addEventListener('pagehide', away);
  dlg.addEventListener('pointerdown', e => { // running: a tap anywhere on the sheet (not on Cancel·la) counts
    if (dlg.dataset.state !== 'run' || e.target.closest('#sync-stop, #sync-close')) return;
    e.preventDefault(); tap(e);
  });
  const keys = e => {
    if (e.code === 'Tab' || e.code === 'Escape') return; // Tab moves, Esc closes the sheet, always
    const st = dlg.dataset.state, own = e.target === dlg, down = e.type === 'keydown' && !e.repeat;
    if (st === 'run') { e.preventDefault(); e.stopPropagation(); if (down) tap(e); return; } // every key is a tap
    if (!own) return; // a focused button handles its own Enter / Space
    if (e.code === 'BracketLeft' || e.code === 'BracketRight') { // the game's [ ] knob, on the draft here
      e.preventDefault(); e.stopPropagation();
      if (down && st === 'intro') nudge(e.code === 'BracketLeft' ? -10 : 10);
    } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      e.preventDefault(); e.stopPropagation();
      if (!down) return;
      if (st === 'intro') run();
      else if (st === 'result' && performance.now() - doneAt > 600) (result == null ? run() : ok.click()); // not a late tap
    }
  };
  dlg.addEventListener('keydown', keys);
  dlg.addEventListener('keyup', keys);
  $('sync-minus').addEventListener('click', () => nudge(-10));
  $('sync-plus').addEventListener('click', () => nudge(10));
  $('sync-reset').addEventListener('click', () => nudge(null));
  $('sync-start').addEventListener('click', run);
  retry.addEventListener('click', run);
  $('sync-stop').addEventListener('click', intro);
  $('sync-back').addEventListener('click', intro);
  $('sync-close').addEventListener('click', () => dlg.close());
  ok.addEventListener('click', () => { // save now, and say so on the sheet (no global toast)
    draft.set(result); draft.commit(set);
    now(result, true);
    intro();
  });

  return {
    get open() { return dlg.open; },
    show() {
      if (dlg.open) return;
      draft = offsetDraft(get()); now(draft.value);
      onOpen();
      dlg.showModal();
      intro(); // nothing plays until Comença
    },
  };
}
