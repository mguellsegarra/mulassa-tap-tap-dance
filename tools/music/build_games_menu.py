"""Mulassa Games' music (the games selector): mulassa.cat's menu tune (build_taiko.py's AMBIENT loop, the call and answer
both homes play) as lo-fi: slow (78, not 152), the tune on a felt piano, muted electric-piano sevenths, a lazy beat. The
owner's pick among several styles (10 Nov 2026), without the vinyl dust it had. Rendered once to an MP3.

    uv run --python 3.11 --with numpy --with scipy --with lameenc tools/music/build_games_menu.py

Writes tmp/audio/games-menu.mp3 for review; with OUT=game, src/jocs/menu/music.mp3 (Vite hashes its URL) and its loop
points, music.json. Each layer is levelled by its measured RMS (LAYERS: dB under the tune), not by its synth's volume.
"""
import json, os
import numpy as np
import lameenc
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
SPB = 60 / 78
LOOP = int(round(64 * SPB * SR))     # the tune's 16 bars, once
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda n: 12 * (int(n[-1]) + 1) + PC[n[0]]
rng = np.random.default_rng(1)

# --- the menu's tune, as build_taiko.py writes it; its three chords as sevenths, a colour per bar ---
call, answer = 'R:0.5 C4:0.5 E4:1 G4:1 E4:1', 'E4:0.5 D4:0.5 C4:2 R:1'
TUNE = [call, answer, 'R:0.5 C4:0.5 F4:1 F4:1 C4:1', 'C4:1 A3:2 R:1', 'R:0.5 B3:0.5 D4:1 G4:1 D4:1', 'D4:1 B3:2 R:1', call, answer] * 2
CHORDS = [(48, (60, 64, 67, 71)), (45, (60, 64, 67, 69)), (53, (60, 64, 65, 69)), (50, (60, 62, 65, 69)),   # (bass, the keys' four notes)
          (55, (60, 62, 65, 67)), (55, (59, 62, 65, 69)), (48, (59, 62, 64, 67)), (48, (57, 60, 64, 67))] * 2

# --- instruments: all soft; the bass keeps partials a phone's speaker can play ---
def tail(x, secs=.03):
    k = int(secs * SR); x[-k:] *= np.linspace(1, 0, k); return x
def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(t / attack, 1) * np.exp(-np.maximum(t - attack, 0) / decay)
def felt(m, dur):                    # a felt piano: round, a soft hammer
    n = int((dur + 1.0) * SR); t = np.arange(n) / SR; f = hz(m)
    tone = np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .5) + .1 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / .2)
    return tail(tone * env(n, .012, 1.3))
def keys(m, dur):                    # an electric piano: a sine bent by itself, the bite gone in a moment
    n = int((dur + .6) * SR); t = np.arange(n) / SR; f = hz(m)
    bite = .7 * np.exp(-t / .12) + .2
    return tail(np.sin(2 * np.pi * f * t + bite * np.sin(2 * np.pi * f * t)) * env(n, .006, .9) * np.clip((dur + .5 - t) / .5, 0, 1))
def bass(m, dur):
    n = int((dur + .1) * SR); t = np.arange(n) / SR; f = hz(m)
    return tail((np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) + .15 * np.sin(2 * np.pi * 3 * f * t)) * env(n, .012, .6))
def noise(secs, lo, hi, decay):
    n = int(secs * SR); t = np.arange(n) / SR
    return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / decay) * np.minimum(t / .004, 1)
def kick():
    n = int(.22 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(150 * (65 / 150) ** np.clip(t / .07, 0, 1)) / SR) * np.exp(-t / .08)

LAYERS = dict(tune=0, keys=-5, bass=-4, kick=-9, snare=-15, hat=-22)   # each one's level, dB under the tune
WET = dict(tune=.25, keys=.2, snare=.1)                               # how much of each goes to the room
bufs = {k: np.zeros(LOOP + 8 * SR) for k in LAYERS}
def put(k, beat, x, vel=1.0, late=0.0):
    i = int(round((beat * SPB + late) * SR)); b = bufs[k]; n = min(len(x), len(b) - i); b[i:i + n] += x[:n] * vel
lazy = lambda b: b + (.09 if (b * 2) % 1 else 0)   # the off-sixteenths lean back

for bar, line in enumerate(TUNE):                  # the tune, an octave up and a touch behind the beat
    t = bar * 4
    for tok in line.split():
        n, d = tok.split(':')
        if n != 'R': put('tune', t, felt(midi(n) + 12, float(d) * SPB), rng.uniform(.8, 1), .03)
        t += float(d)
for bar, (root, notes) in enumerate(CHORDS):
    b0 = bar * 4
    for at, d in ((0, 2.2), (2.5, 1.3)):           # two chords a bar, each rolled a little from the bottom
        for k, m in enumerate(notes): put('keys', b0 + at, keys(m, d * SPB), rng.uniform(.8, 1), k * .018)
    for at, d, v in ((0, 1.4, 1), (2.5, 1.2, .8)): put('bass', b0 + at, bass(root, d * SPB), v)
    for at, v in ((0, 1), (2.5, .8), (3.25, .5) if bar % 2 else (1.75, .4)): put('kick', lazy(b0 + at), kick(), v)
    for at in (1, 3): put('snare', b0 + at, noise(.2, 900, 3500, .05), 1, .012)
    for e in range(8): put('hat', lazy(b0 + e / 2), noise(.05, 3000, 4200, .015), 1 if e % 2 else .6)

# a small room, so nothing sounds dry: decaying noise, kept out of the lows
t = np.arange(2 * SR) / SR
ROOM = sosfilt(butter(2, [400, 5000], 'bandpass', fs=SR, output='sos'), rng.standard_normal(len(t)) * np.exp(-t / .45))
ROOM /= np.sqrt((ROOM ** 2).sum())
mix = np.zeros(LOOP)
for k, x in bufs.items():
    if k in WET: x = x + WET[k] * fftconvolve(x, ROOM)[:len(x)]
    x = sosfilt(butter(2, 150, 'highpass', fs=SR, output='sos'), sosfilt(butter(2, 4200, fs=SR, output='sos'), x))   # lo-fi: no highs
    x = x.copy(); x[:len(x) - LOOP] += x[LOOP:]   # the tails wrapped round: the loop's end flows into its start
    mix += x[:LOOP] * 10 ** (LAYERS[k] / 20) / np.sqrt((x[:LOOP] ** 2).mean())
mix *= .075 / np.sqrt((mix ** 2).mean())           # the main menu's level: well behind the games
out = np.tanh(mix * 1.3) / 1.3
assert np.abs(out).max() < .7, np.abs(out).max()
assert abs(out[-1] - out[0]) < .03, 'loop seam'
out = np.concatenate([out, out[:SR]])              # a second past the loop point, as the other menus' files

enc = lameenc.Encoder(); enc.set_bit_rate(80); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
data = enc.encode((out * 32767).astype(np.int16).tobytes()) + enc.flush()
game = os.environ.get('OUT') == 'game'
path = 'src/jocs/menu/music.mp3' if game else 'tmp/audio/games-menu.mp3'
os.makedirs(os.path.dirname(path), exist_ok=True)
open(path, 'wb').write(data)
if game: json.dump({'start': 0, 'end': LOOP / SR}, open('src/jocs/menu/music.json', 'w'))
print(path, f'{len(data) / 1024:.0f} KB', f'{len(out) / SR:.1f} s', 'loop', round(LOOP / SR, 3), 's', 'peak %.2f' % np.abs(out).max())
