// Music and effects. Soft additive sines, as in Mulassa (docs/agents/audio.md): no square buzz.
const LOOP = { url: '/music/mulassa-taiko-ambient.mp3?v=4faea71c39', start: 6.31578231292517, end: 31.578934240362813 }; // Mulassa's ambientLoop
const KEY = 'bestiari-sound';
let ctx, master, music = false;
const MUTE_URL = new URLSearchParams(location.search).has('mute'); // ?mute: silent for this visit, the saved choice stays
export let soundOn = !MUTE_URL && localStorage.getItem(KEY) !== 'off';

// Needs a user gesture. The game goes on in silence if the file fails.
export function unlockSound() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(ctx.destination);
    document.addEventListener('visibilitychange', () => { document.hidden ? ctx.suspend() : ctx.resume(); });
  }
  ctx.resume();
  if (music) return;
  music = true;
  fetch(LOOP.url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buffer => {
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buffer; src.loop = true; src.loopStart = LOOP.start; src.loopEnd = LOOP.end;
    gain.gain.value = .45; src.connect(gain).connect(master); src.start();
  }).catch(err => { console.warn('music', err); music = false; });
}

export function setSound(on) {
  soundOn = on;
  if (!MUTE_URL) localStorage.setItem(KEY, on ? 'on' : 'off');
  if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .02);
}

function note(freq, at = 0, length = .18, level = .22) {
  if (!ctx) return;
  const t = ctx.currentTime + at, env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + .008);
  env.gain.exponentialRampToValueAtTime(.0001, t + length);
  env.connect(master);
  for (const [mult, amp] of [[1, 1], [2, .3]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq * mult; g.gain.value = amp;
    o.connect(g).connect(env); o.start(t); o.stop(t + length);
  }
}
export const sfx = {
  flip: () => note(620, 0, .09, .14),
  miss: () => { note(233, 0, .2); note(196, .12, .26); },
  match: () => { note(659, 0); note(880, .09); note(1047, .18, .3); },
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, i * .13, .4, .24)),
};
