// The UI's sound: a blip on every keyboard focus move (sheet-keys.js) and, where a page asks for it (soundOnPress), on
// every button press. Each page plugs in its own voice: the main game its chip's 'menu', a game its synth or blipOn().
let voice = null;
export const setUiSound = fn => { voice = fn; };
export const uiSound = () => voice?.();

// A game without a synth: the main game's 'menu' blip (audio-voices.js), on the game's context and bus, so its mute and
// its unlock hold (a context the browser has not let run yet makes no sound and queues none).
export const blipOn = (ctx, out) => () => {
  if (ctx.state !== 'running') return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.06);
};

// Every press of a button or a link drawn as one; the main game keeps its own sounds per action and leaves this off.
export function soundOnPress(root = document) {
  root.addEventListener('click', e => { if (e.target.closest?.('button:not(:disabled), a.btn, a.round-btn, a.exit')) uiSound(); });
}
