// The game's shared state: G, the audio engine, the song clock, the held keys, the balloon window.
import { parseChallenge, stripChallenge } from '../services/share.js';
import { store } from '../platform/storage.js';
import { Chip } from '../platform/audio.js';
import song from '../song.json';
import { Q, offsetMs, playFrom, LEAD, WIN } from '../core/env.js';

// ------------------------------------------------------------------ game
// G is the one shared record. Most fields appear on first write, so this is the map of who owns what:
//   the run (game/flow.js starts and ends it; game/judge.js scores it)
//     chart, balloons, next (the next unjudged note), diff, counts {perfect, good, miss}, errors, score, combo, maxCombo, streak
//     (misses in a row), guapo (the ENCERTS %), energy (l'ànim), energyWarn, hold, activePhrase / phraseCounts, doublePoints,
//     sec ('A' | 'B'), go (the first note's time), finale / eeeh / collapseT (the coda, its shout, the fall), previous / newRecord /
//     recordKey / stars / reason / challenge / shareRun / resT (the result), practice, resuming
//   what the screens show (eased or stamped with `clock`, read by hud/* and the crowd; the rules never read them)
//     shown, shownE (the smoothed guapo and energy), judge, praise, ring, pop, popT, pumpT, tapT, flash, holdDone, energyT,
//     energyWarnT, doubleT, finaleT, chantT, offsetT, uiT, clapBeat, finBeat, lastBeat
//   the app (which screen, what is open)
//     state ('splash' | 'title' | 'play' | 'results'), sel (the highlighted level), paused, pendingAction, audioError
export const G = { chart: [], balloons: [], state: 'splash', sel: 0, diff: 0, paused: false, guapo: 20, shown: 20, combo: 0, chantT: -99, collapseT: 0, sec: 'A', energy: 1, shownE: 1, energyWarn: [true, true], energyT: -9 };
// A friend's challenge (?repte=94-2, share.js): its level comes preselected and the title shows it; the address bar
// drops it (a reload doesn't bring it back). Only a % and a level: it never changes what the leaderboard accepts.
export const CHALLENGE = parseChallenge(Q);
if (CHALLENGE) {
  G.sel = CHALLENGE.diff;
  try { history.replaceState(history.state, '', stripChallenge(location.href)); } catch { /* no history API */ }
}
export let chip = null;
export const setChip = v => (chip = v);
export let clock = 0;
export const setClock = v => (clock = v);
// at: a performance.now() time (a frame's, an input event's; default now): the de-stepped audio clock (audio.js audioClock)
export const songTime = at => (chip?.t0 != null ? chip.now(at) - offsetMs / 1000 : playFrom - LEAD); // still loading the recording: hold at the count-in's start
export const JUDGE_WORDS = { perfect: 'PERFECTE', good: 'BÉ', miss: 'ERROR' };
// The audio engine is made (suspended) right after the first frame, so the menu loop and the song download and decode
// while the splash waits for its tap; the tap only has to resume it. `chip` stays null until then.
export let engine = null;
// the title's speaker button: the menu loop on/off, remembered here ('menu-music': 'off'); off = never fetched nor started
export let menuMusic = store.get('menu-music') !== 'off';
export const setMenuMusic = v => (menuMusic = v);
export const audioEngine = () => (engine ||= new Chip(song, { menuMusic }));
// GLOBUS: every tap in its window (any side) scores and pumps it, the more the better: each `need` taps it pops
// and a fresh one starts. It hands over to the next note HANDOFF early and is judged once, at the end.
export const HANDOFF = 0.06; // the balloon counts until 60 ms before its end, then taps go to the next note
export const balloonAt = t => G.balloons.find(n => t >= n.t - WIN.good && t < n.end - HANDOFF);
export const balloonShown = t => { const bl = balloonAt(t); return bl && t >= bl.t ? bl : null; }; // hanging under the ring
export const BALLOON_DROP = 8 + 2 * 29; // lane units under the lane its biggest balloon (r 26 + the pump pulse) reaches
export let bigPending = null; // { n, dir, t, kind, done }: a GUAPA pressed with one side, waiting for (or swallowing) the other
export const setBigPending = v => (bigPending = v);
export const down = { keys: new Set(), ptr: new Map() }; // key codes held; pad pointerId -> side
export const isDown = side => [...down.keys].some(c => c === 'Space' || KEYS[c] === side) || [...down.ptr.values()].includes(side);
export const KEYS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', KeyD: 'L', KeyF: 'D', KeyJ: 'U', KeyK: 'R' };
export let drawT = 0; // the song time the last frame was drawn at (tests)
export const setDrawT = v => (drawT = v);
