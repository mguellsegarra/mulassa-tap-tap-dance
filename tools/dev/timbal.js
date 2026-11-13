// Dev only (/tools/dev/timbal.html): what the drum sends, how old gamepad.timestamp is when a poll sees a hit, how long a
// hit lasts, and how far each hit lands from a metronome click. It polls the pad itself (every 4 ms and every frame, as
// the game does in a song) to see every button, mapped or not; the table is the game's own (src/platform/drum.js).
import { drumZones, saveDrumMap } from '/src/platform/drum.js';

const $ = id => document.getElementById(id), r1 = x => (x == null ? null : Math.round(x * 10) / 10);
const CLICKS = 16, COUNT_IN = 4, STEP = 0.5;
const was = new Map(); // pad index → the open hit of each button (or undefined)
let hits = [], lastPoll = 0, gaps = { n: 0, sum: 0, max: 0 }, dirty = true, ctx = null, test = null, run = 0;
const kind = zone => (zone ? (zone[0] === 'F' ? 'face' : 'rim') : null);

// Where a time on the audio clock is heard, on performance.now()'s clock. getOutputTimestamp pairs the two clocks at the
// output; where it gives nothing (zeros), the context's clock plus its reported output latency.
function heardAt(audioTime) {
  const ts = ctx.getOutputTimestamp?.();
  if (ts?.performanceTime > 0) return ts.performanceTime + (audioTime - ts.contextTime) * 1000;
  return performance.now() + (audioTime - ctx.currentTime + (ctx.outputLatency || 0)) * 1000;
}

function poll() {
  const now = performance.now();
  if (lastPoll) { const gap = now - lastPoll; gaps.n++; gaps.sum += gap; if (gap > gaps.max) gaps.max = gap; }
  lastPoll = now;
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (!pad?.connected) continue;
    let open = was.get(pad.index);
    if (!open) was.set(pad.index, open = []);
    for (let i = 0; i < pad.buttons.length; i++) {
      const on = pad.buttons[i].pressed;
      if (on === !!open[i]) continue;
      dirty = true;
      if (!on) { open[i].ms = r1(now - open[i].at); open[i] = undefined; continue; }
      const zone = drumZones[i] ?? null, hit = { n: hits.length + 1, pad: pad.index, button: i, zone, at: r1(now), stampAge: r1(now - pad.timestamp), ms: null };
      if (test) { // the nearest click, and how far from it: + late, - early
        const first = heardAt(test.t0), k = Math.round((now - first) / (STEP * 1000));
        if (k >= 0 && k < CLICKS) Object.assign(hit, { run: test.run, click: k + 1, off: r1(now - first - k * STEP * 1000), offNoLatency: r1((ctx.currentTime - test.t0 - k * STEP) * 1000) });
      }
      hits.push(open[i] = hit);
      learnHit(i);
    }
  }
}
setInterval(poll, 4);

function startTest() {
  ctx ||= new AudioContext({ latencyHint: 'interactive' });
  ctx.resume();
  const t0 = ctx.currentTime + 0.5 + COUNT_IN * STEP;
  for (let i = -COUNT_IN; i < CLICKS; i++) {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), t = t0 + i * STEP;
    osc.frequency.value = i < 0 ? 600 : 1200;
    gain.gain.setValueAtTime(0.5, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + 0.05);
  }
  test = { t0, run: ++run };
  $('start').disabled = true;
}

const stat = list => {
  if (!list.length) return null;
  const mean = list.reduce((a, b) => a + b, 0) / list.length;
  return { n: list.length, mean: r1(mean), sd: r1(Math.sqrt(list.reduce((a, b) => a + (b - mean) ** 2, 0) / list.length)), min: Math.min(...list), max: Math.max(...list) };
};
const of = (key, pick = () => true) => stat(hits.filter(h => h[key] != null && pick(h)).map(h => h[key]));
function summary() {
  const pads = [...navigator.getGamepads?.() ?? []].filter(Boolean).map(p => ({ index: p.index, id: p.id, mapping: p.mapping, buttons: p.buttons.length, axes: p.axes.length }));
  const tap = {};
  for (const h of hits) if (h.click) tap[kind(h.zone) ?? `button${h.button}`] ??= null;
  for (const k in tap) {
    const mine = h => h.click && (kind(h.zone) ?? `button${h.button}`) === k;
    tap[k] = { off: of('off', mine), offNoLatency: of('offNoLatency', mine), clicksHit: new Set(hits.filter(mine).map(h => `${h.run}:${h.click}`)).size };
  }
  return {
    userAgent: navigator.userAgent, secureContext: isSecureContext, pads, zones: drumZones,
    audio: ctx && { sampleRate: ctx.sampleRate, baseLatencyMs: r1(ctx.baseLatency * 1000), outputLatencyMs: r1(ctx.outputLatency * 1000), outputTimestamp: ctx.getOutputTimestamp?.().performanceTime > 0 },
    poll: { meanGapMs: r1(gaps.sum / (gaps.n || 1)), maxGapMs: r1(gaps.max) },
    stampAgeMs: of('stampAge'), hitMs: of('ms'), runs: run, tap, hits,
  };
}

const cells = (tag, list) => `<tr>${list.map(c => `<${tag}>${c ?? '·'}</${tag}>`).join('')}</tr>`;
function draw() {
  requestAnimationFrame(draw);
  poll();
  if (test && ctx) {
    const beat = Math.floor((performance.now() - heardAt(test.t0)) / (STEP * 1000));
    if (beat !== test.beat) { test.beat = beat; dirty = true; }
    if (beat > CLICKS) { test = null; $('start').disabled = false; }
  }
  const pads = [...navigator.getGamepads?.() ?? []].filter(Boolean);
  if (!navigator.getGamepads) $('pad').innerHTML = '<span class="warn">Aquest navegador no dona navigator.getGamepads aquí (cal HTTPS o localhost?).</span>';
  else if (pads.length) $('pad').innerHTML = pads.map(p => `#${p.index} · id: ${p.id}<br>mapping: «${p.mapping}» · ${p.buttons.length} botons · ${p.axes.length} eixos`).join('<br>');
  // the buttons are redrawn every frame (16 cells); the tables only when something changed
  $('buttons').innerHTML = pads.flatMap(p => p.buttons.map((b, i) => `<span class="mono${b.pressed ? ' on' : ''}${kind(drumZones[i]) === 'rim' ? ' rim' : ''}">${i}<b>${drumZones[i] ?? '·'}</b></span>`)).join('');
  $('axes').textContent = pads.map(p => `eixos #${p.index}: ${p.axes.map(a => a.toFixed(2)).join('  ')}`).join(' · ');
  if (!dirty) return;
  dirty = false;
  const s = summary();
  $('clicks').innerHTML = Array.from({ length: CLICKS }, (_, i) => `<i class="${test && i < test.beat ? 'on' : ''}"></i>`).join('');
  $('stats').innerHTML = cells('th', ['', 'cops', 'clics tocats', 'mitjana ms', 'desviació ms', 'mín', 'màx', 'mitjana sense latència'])
    + Object.entries(s.tap).map(([k, t]) => cells('td', [k, t.off.n, `${t.clicksHit}/${run * CLICKS}`, t.off.mean, t.off.sd, t.off.min, t.off.max, t.offNoLatency.mean])).join('')
    + (s.audio ? `<tr><td colspan="8" style="text-align:left;opacity:.7">+ tard, − aviat · latència de sortida ${s.audio.outputLatencyMs} ms · getOutputTimestamp ${s.audio.outputTimestamp ? 'sí' : 'no'} · sondeig: mitjana ${s.poll.meanGapMs} ms, màx ${s.poll.maxGapMs} ms</td></tr>` : '');
  $('hits').innerHTML = cells('th', ['#', 'botó', 'zona', 'edat del segell ms', 'durada ms', 'clic', 'desfasament ms'])
    + hits.slice(-40).reverse().map(h => `<tr class="${kind(h.zone) ?? ''}">${cells('td', [h.n, h.button, h.zone ?? 'sense zona', h.stampAge, h.ms, h.click && `${h.run}:${h.click}`, h.off]).slice(4)}`).join('');
  $('out').value = JSON.stringify(s);
}
requestAnimationFrame(draw);

$('start').onclick = startTest;
$('reset').onclick = () => { hits = []; gaps = { n: 0, sum: 0, max: 0 }; run = 0; for (const open of was.values()) open.length = 0; dirty = true; };
$('copy').onclick = async () => {
  const out = $('out');
  out.value = JSON.stringify(summary());
  out.select();
  // navigator.clipboard exists only on HTTPS or localhost; over the LAN the old command copies the selection
  const ok = await navigator.clipboard?.writeText(out.value).then(() => true, () => false) || document.execCommand('copy');
  $('copied').textContent = ok ? `Copiat (${hits.length} cops).` : 'No s\'ha pogut copiar: el text és seleccionat a sota, copia\'l a mà.';
};

// «Aprèn el timbal»: each zone in turn, 3 hits each; the button hit most in a step is that zone (one not taken yet).
const LEARN = [['FL', 'el CENTRE ESQUERRE'], ['FR', 'el CENTRE DRET'], ['RL', 'la VORA ESQUERRA (a dalt)'], ['RR', 'la VORA DRETA (a dalt)']];
let learn = null;
const say = text => { $('learn-say').textContent = text; };
function learnHit(button) {
  if (!learn) return;
  const step = learn.steps[learn.at];
  if (Object.values(learn.map).length && button in learn.map) return say(`Aquest botó (${button}) ja és ${learn.map[button]}. Pica ${LEARN[learn.at][1]}.`);
  step.push(button);
  if (step.length < 3) return say(`Pica ${LEARN[learn.at][1]}: ${step.length}/3`);
  const best = Object.entries(step.reduce((n, b) => ({ ...n, [b]: (n[b] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0];
  learn.map[best] = LEARN[learn.at][0];
  if (++learn.at < LEARN.length) return say(`Botó ${best} = ${LEARN[learn.at - 1][0]}. Ara pica ${LEARN[learn.at][1]}: 0/3`);
  saveDrumMap(learn.map);
  say(`Desat: ${Object.entries(learn.map).map(([b, z]) => `${z} = botó ${b}`).join(' · ')}`);
  learn = null; dirty = true;
}
$('learn').onclick = () => { learn = { at: 0, map: {}, steps: LEARN.map(() => []) }; say(`Pica ${LEARN[0][1]}: 0/3`); };
$('forget').onclick = () => { saveDrumMap(null); learn = null; say('Mapa oblidat: el joc torna al de fàbrica.'); dirty = true; };
