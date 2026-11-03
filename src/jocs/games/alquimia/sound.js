// Short synth blips, so the games need no audio files. The context starts on the first tap, as iOS requires.
let ctx;
export function blip(freq, ms = 90, type = 'triangle', gain = .12) {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime, osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + ms / 1000);
}
