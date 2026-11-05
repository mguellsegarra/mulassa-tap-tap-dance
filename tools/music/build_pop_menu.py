"""Mulassa Pop's home music: mulassa.cat's menu tune (build_taiko.py's AMBIENT loop: the same 64 beats, harmony and
call-and-answer at 152) played with Pop's own soft synth (src/jocs/games/pop/sequencer.js: sine and triangle plucks, sine
pads, a lowpass at 2600 Hz, a short room), rendered once to an MP3 so the home spends nothing on it.

    uv run --python 3.11 --with numpy --with scipy --with soundfile --with lameenc tools/music/build_pop_menu.py [variant]

variant: 'soft' (tune, pads, bass: no drums; the one the owner chose) or 'pulse' (plus a soft kick and shaker), for review in
tmp/audio/pop-menu-<variant>.mp3. With OUT=game, 'soft' goes to the game: src/jocs/games/pop/menu-music.mp3 (Vite hashes its
URL, so a new render never meets an old cache) and its loop points, menu-music.json.
"""
import json, os, sys
import numpy as np
import lameenc
from scipy.signal import lfilter, butter, sosfilt

SR = 44100
VARIANT = sys.argv[1] if len(sys.argv) > 1 else 'soft'
SPB = 60 / 152                      # the menu recording's own clock (build_taiko.py), never the song's
AMB = 64
LOOP = int(AMB * SPB * SR)  # no entrance: the home starts on the tune's first note, faded in by menu-music.js
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
midi = lambda n: 12 * (int(n[-1]) + 1) + PC[n[0]]
CH = {'C': (0, 4, 7), 'F': (5, 9, 0), 'G': (7, 11, 2)}

# --- the menu's composition, as build_taiko.py writes it ---
call, answer = 'R:0.5 C4:0.5 E4:1 G4:1 E4:1', 'E4:0.5 D4:0.5 C4:2 R:1'
BARS = [('C', call), ('C', answer), ('F', 'R:0.5 C4:0.5 F4:1 F4:1 C4:1'), ('F', 'C4:1 A3:2 R:1'),
        ('G', 'R:0.5 B3:0.5 D4:1 G4:1 D4:1'), ('G', 'D4:1 B3:2 R:1'), ('C', call), ('C', answer)] * 2
VOICES = {'C': (55, 60, 64), 'F': (57, 60, 65), 'G': (55, 59, 62)}
mel, chords = [], []
for i, (c, line) in enumerate(BARS):
    t = i * 4
    for tok in line.split():
        n, d = tok.split(':')
        if n != 'R': mel.append((t, float(d), midi(n) + 12))   # up an octave: Pop's tune sings in its lead's register
        t += float(d)
    if chords and chords[-1][2] == c: chords[-1] = (chords[-1][0], t, c)
    else: chords.append((i * 4, t, c))
chord_at = lambda b: next(c for s, e, c in reversed(chords) if s <= b + 1e-6)

# --- Pop's voices (sequencer.js), sample for sample: a linear attack, an exponential fall to 2 % ---
def voice(f, dur, vol, kind='sine', attack=.01):
    n = int((max(dur, attack + .02) + .02) * SR); t = np.arange(n) / SR
    osc = np.sin(2 * np.pi * f * t) if kind == 'sine' else 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    fall = np.exp(np.log(.02) * np.clip((t - attack) / max(dur - attack, 1e-3), 0, 1))
    return osc * np.where(t < attack, t / attack, fall) * vol
def pluck(m, dur, vol):
    a, b = voice(hz(m), dur, vol), voice(hz(m), dur * .6, vol * .35, 'triangle')
    a[:len(b)] += b
    return a
def kick(vol):
    t = np.arange(int(.18 * SR)) / SR
    f = 120 * (50 / 120) ** np.clip(t / .1, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * vol * (.001 / 1) ** np.clip(t / .16, 0, 1)
rng = np.random.default_rng(7)
def shaker(vol):
    t = np.arange(int(.06 * SR)) / SR
    return sosfilt(butter(2, [1800, 2600], 'bandpass', fs=SR, output='sos'), rng.standard_normal(len(t))) * vol * (.001 / 1) ** np.clip(t / .05, 0, 1)

# Each instrument's level, as the owner set them by ear on the mixer page (STEMS=1 below, tmp/audio/pop-menu-mix.html)
VOL = dict(melody=.022, bass=.035, pad=.003, pah=.018, kick=.12, shaker=.018)
LAYERS = ['melody', 'bass', 'pad', 'pah'] + (['kick', 'shaker'] if VARIANT == 'pulse' else [])
bufs = {k: np.zeros(LOOP + 5 * SR) for k in LAYERS}
def put(k, at, x):
    b = bufs[k]; i = int(round(at * SR)); n = min(len(x), len(b) - i); b[i:i + n] += x[:n]

for s, d, m in mel:                                   # the tune: Pop's lead pluck
    put('melody', s * SPB, pluck(m, max(.16, min(d * SPB, 1.2)), VOL['melody']))
for s, e, c in chords:                                # the held harmony under everything
    for m in VOICES[c]: put('pad', s * SPB, voice(hz(m), (e - s) * SPB * .95, VOL['pad'], 'sine', .12))
for b in range(0, AMB, 2):                            # a polka: bass on 1 and 3 (root, fifth), a quiet chord on 2 and 4
    root = CH[chord_at(b)][0]; root += 36 if root < 8 else 24
    put('bass', b * SPB, voice(hz(root + 7 if b % 4 else root), SPB * 1.2, VOL['bass']))
    for m in VOICES[chord_at(b + 1)]: put('pah', (b + 1) * SPB, voice(hz(m), SPB * .45, VOL['pah'], 'triangle'))
if VARIANT == 'pulse':
    for b in range(0, AMB, 2): put('kick', b * SPB, kick(VOL['kick']))
    for b in range(AMB * 2): put('shaker', b * SPB / 2, shaker(VOL['shaker'] * (1 if b % 2 else .55)))

def render(buf):
    """The sequencer's chain (a lowpass at 2600 Hz, a 60 ms room at .14), the tails wrapped round so the loop's end flows into
    its start, then the loop and a second to spare."""
    tone = sosfilt(butter(2, 2600, fs=SR, output='sos'), buf)
    d = int(.06 * SR); room = np.zeros_like(tone); room[d:] = tone[:-d] * .14
    mix = tone + room
    mix[:len(mix) - LOOP] += mix[LOOP:]
    steady = mix[:LOOP]
    return np.concatenate([steady, steady[:SR]])

out = render(sum(bufs.values()))
level = .075 / np.sqrt((out[:LOOP] ** 2).mean())  # the main menu's level: well behind the game
def mp3_of(x, kbps):
    enc = lameenc.Encoder(); enc.set_bit_rate(kbps); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
    return enc.encode((x * 32767).astype(np.int16).tobytes()) + enc.flush()   # mono: Pop's synth is (sequencer.js)
if os.environ.get('STEMS'):  # one file per instrument at the mix's own level, for the mixer page; nothing else is written
    os.makedirs('tmp/audio/stems', exist_ok=True)
    for k in LAYERS: open(f'tmp/audio/stems/{k}.mp3', 'wb').write(mp3_of(render(bufs[k]) * level, 96))
    json.dump({k: VOL[k] for k in LAYERS}, open('tmp/audio/stems/vol.json', 'w'))
    print('stems', LAYERS); sys.exit()
out = np.tanh(out * level * 1.3) / 1.3
assert np.abs(out).max() < .7, np.abs(out).max()
assert abs(out[LOOP - 1] - out[0]) < .015, 'loop seam'

mp3 = mp3_of(out, 64)
game = os.environ.get('OUT') == 'game'
path = 'src/jocs/games/pop/menu-music.mp3' if game else f'tmp/audio/pop-menu-{VARIANT}.mp3'
os.makedirs(os.path.dirname(path), exist_ok=True)
open(path, 'wb').write(mp3)
if game:
    json.dump({'start': 0, 'end': LOOP / SR}, open('src/jocs/games/pop/menu-music.json', 'w'))
print(path, f'{len(mp3) / 1024:.0f} KB', f'{len(out) / SR:.1f} s', 'loop', round(LOOP / SR, 3), 's')
