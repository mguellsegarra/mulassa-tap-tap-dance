"""Rhythm-game arrangement of the Mulassa melody: one constant tempo, festa-major party band.

Only input: music/score.json (the melody). Everything else is written here.
A (4/4, slow tune): each quarter of the score = 2 beats, but the band drives at full tempo
(backbeat + oom-pah bass, then four-on-the-floor), with bright major colours around C minor.
B/C (2/4, fast tune): each quarter = 1 beat; offbeat brass, octave bass, bells, fills and "hey!".
Outputs public/music/mulassa-taiko.{wav,mp3,mid}, the menu loop mulassa-taiko-ambient.mp3,
music/taiko-arrangement.json and the game chart src/song.json.
"""
import json
import os
import subprocess
import numpy as np
import soundfile as sf
import mido
from scipy.signal import fftconvolve, lfilter, iirpeak

BPM, SR, LEAD_IN = 152, 44100, 0.1
SPB = 60 / BPM
sec = lambda b: LEAD_IN + b * SPB
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi_of(name):
    acc = name.count('#') - name.count('b')
    return 12 * (int(name[-1]) + 1) + PC[name[0]] + acc


score = dict(json.load(open('music/score.json'))['bars'])


def notes_of(bar, t, scale, override=None):
    out = []
    for tok in (override or score[bar]).split():
        n, d = tok.split(':')
        d = float(d) * scale
        if n != 'R':
            out.append([t, d, midi_of(n)])
        t += d
    return out, t


# ------------------------------------------------------------------ melody layout (beats)
melody, bar_start = [], {}


def lay(bar, t, scale, override=None):
    bar_start[bar] = t
    ns, t = notes_of(bar, t, scale, override)
    melody.extend(ns)
    return t


# The short cut of the song: the whole intro, A A B, then straight from bar 31 into bar 49 (both on G7, so bar 49
# still leads into C as it did after B'), C C and the coda. Bars 32-48 (the break, A' and B') are not played.
t = lay(0, 12, 2)                                   # pickup in the 4th intro measure
for b in range(1, 16): t = lay(b, t, 2)
t = lay(16, t, 1, 'C5:4 R:3 E5:0.5 E5:0.5')         # A bar whose pickup is already at B speed
for b in range(17, 32): t = lay(b, t, 1)
for b in range(49, 74): t = lay(b, t, 1)
assert t == 224, t
melody[-1][1] = 6                                   # final C6 rings into the drum roll
END = 228                                           # last hit

# ------------------------------------------------------------------ harmony
# A is C minor, but coloured like a festa-major pasdoble: the relative major (Eb), its V (Bb),
# bright Ab (lydian over the tune's D) and a V at every phrase end. B/C stay in C major.
CH = {'C': (0, 4, 7), 'Cm': (0, 3, 7), 'Eb': (3, 7, 10), 'Ab': (8, 0, 3), 'Bb': (10, 2, 5), 'G': (7, 11, 2),
      'G7': (7, 11, 2, 5), 'Dm': (2, 5, 9), 'Dm7': (2, 5, 9, 0), 'F': (5, 9, 0)}
A_CH = ['Cm', 'Eb', ['Eb', 'Bb', 'Cm', 'G'], ['Cm', 'G'], 'Ab', 'Eb', 'G', ['Cm', 'G']]
B_CH = ['C', 'G', 'G7', 'C']
C_CH = ['C', 'Dm', 'F', 'C', 'C', 'Dm', 'Dm7', 'C']
bar_chord = {}
for b in range(1, 17): bar_chord[b] = A_CH[(b - 1) % 8]
for b in range(34, 42): bar_chord[b] = A_CH[(b - 34) % 8]
bar_chord[16] = bar_chord[41] = 'C'                  # picardy: lands the B section in major
for b in range(17, 33): bar_chord[b] = B_CH[(b - 17) % 4]
for b in range(42, 50): bar_chord[b] = B_CH[(b - 42) % 4]
for b in range(50, 74): bar_chord[b] = C_CH[(b - 50) % 8]
bar_chord[49], bar_chord[72], bar_chord[73], bar_chord[33] = 'C', 'G7', 'C', 'G'

chords = [(0, 4, 'Cm'), (4, 8, 'Ab'), (8, 12, 'Bb'), (12, 16, 'G')]   # intro: i-VI-VII-V fanfare
bars = sorted(bar_start)
for i, b in enumerate(bars):
    if b in (0,): continue
    s, e = bar_start[b], bar_start[bars[i + 1]] if i + 1 < len(bars) else 224
    c = bar_chord[b]
    if isinstance(c, list):                          # equal slices of the bar
        q = (e - s) / len(c)
        chords += [(s + i * q, s + (i + 1) * q, x) for i, x in enumerate(c)]
    else:
        chords.append((s, e, c))
chords.append((224, END + 4, 'C'))
chord_at = lambda beat: next(c for s, e, c in reversed(chords) if s <= beat + 1e-6)

# ------------------------------------------------------------------ section plan (one style per measure)
# A1: backbeat + oom-pah bass. A2: four-on-the-floor, syncopated bass, bells on the tune.
# X: the last coda phrase (beats 208-224, the game's FINAL ESBOJARRAT) doubles the subdivision so the
# constant tempo feels like it accelerates: 16th hats and shaker, taiko don-ka in 16ths, claps on
# every beat, a snare build and a riser over the last two measures into the closing roll.
plan = ['intro0', 'intro1', 'intro2', 'pickup'] + ['A1'] * 16 + ['A2'] * 16 + ['B'] * 8 + ['C'] * 8 + ['X'] * 4 + ['roll']
assert len(plan) * 4 == END, len(plan) * 4
FILLS = {43, 47, 51}                                 # half-measure fill into a new phrase
BALLOON = {35}                                       # beats 140-143: drum roll, then the E5 E5 pickup
start_of = lambda m: next(k for k in range(m, -1, -1) if k == 0 or plan[k - 1] != plan[m])
MINI = {m for m, st in enumerate(plan) if m not in FILLS | BALLOON and (
    st in ('B', 'C') and (m - start_of(m)) % 2 == 1 or st == 'A2' and (m - start_of(m)) % 4 == 3)}
CRASH = [16, 48, 80, 112, 144, 160, 176, 192, 208, 216, 228]
HEY = []                                        # crowd shouts removed (user: synthetic 'hey!' sounded off)

P = {  # 16 steps per measure: x = full hit, o = soft
    'intro0': dict(don='x.......x.......', ka='....o.......o.o.', shaker='o.o.o.o.o.o.o.o.', clap='....x.......x...'),
    'intro1': dict(kick='x.......x.......', don='x.....x.x.......', ka='....o.......o.o.', clap='....x.......x...',
                   shaker='oxooox.ooxooox.o', ohat='..o...o...o...o.'),
    'intro2': dict(kick='x.......x.x.....', snare='....x.......x...', clap='....x.......x...', ohat='..x...x...x...x.',
                   don='x.....x.x.......', ka='....o.......o.o.', shaker='oxoooxoooxoooxoo', tamb='....x.......x...'),
    'pickup': dict(kick='x.......x.......', snare='..........o.oxxx', don='x..x..x.x.......', ohat='..x...x.........',
                   clap='....x...........'),
    'A1': dict(kick='x.......x.x.....', snare='....o.......o...', clap='....x.......x...', ohat='..o...o...o...o.',
               shaker='oxoooxoooxoooxoo'),
    'A2': dict(kick='x...x...x...x...', snare='....x.......x...', clap='....x.......x...', ohat='..x...x...x...x.',
               shaker='oxoooxoooxoooxoo', tamb='....x.......x...', cowbell='..o...o...o...o.'),
    'B': dict(kick='x...x...x...x...', snare='....x.......x...', clap='....x.......x...', hat='o.o.o.o.o.o.o.o.',
              ohat='..x...x...x...x.', shaker='oxoooxoooxoooxoo', tamb='....x.......x...',
              don='x..x....x..x....', ka='....o.o.....o...'),
    'C': dict(kick='x...x...x...x...', snare='....x.......x...', clap='....x.......x...', hat='oooooooooooooooo',
              ohat='..x...x...x...x.', tamb='..x...x...x...x.', cowbell='x.o.x.oox.o.x.oo',
              don='x..x..x.x..x....', ka='....o.o.....o.o.'),
    'X': dict(kick='x...x...x...x.x.', clap='x...x...x...x...', hat='xoxoxoxoxoxoxoxo', ohat='..x...x...x...x.',
              shaker='oxooxoxooxooxoxo', tamb='..x...x...x...x.', cowbell='x.oxx.oxx.oxx.ox',
              don='x.x.x.x.x.x.x.x.', ka='.o.o.o.o.o.o.o.o'),
    'break': dict(don='x.......x.......', clap='x...x...x...x...'),
    'roll': dict(),
}
FILL2 = dict(kick='x.......', snare='oxoxxxxx', don='x.x.x.xx', ka='.x.x....')   # second half of a fill measure
BASS = {  # (step, length in steps, interval above the root)
    'intro1': [(0, 3, 0), (8, 3, 7), (14, 2, 12)], 'intro2': [(0, 3, 0), (6, 2, 0), (8, 3, 7), (14, 2, 12)],
    'pickup': [(0, 3, 0), (8, 3, 0), (12, 1, 12), (14, 1, 12)],
    'A1': [(0, 3, 0), (8, 3, 7), (14, 2, 12)],                                      # oom-pah, root / fifth
    'A2': [(0, 2, 0), (3, 1, 12), (6, 2, 7), (8, 2, 0), (11, 1, 12), (14, 2, 7)],   # bouncy syncopation
    'B': [(i * 2, 2, 12 * (i % 2)) for i in range(8)], 'roll': [(0, 16, 0)],
}
BASS['C'] = BASS['X'] = BASS['B']
STABS = {'intro2': [4, 12], 'pickup': [0, 8], 'A1': [4, 12], 'A2': [4, 12, 14], 'B': [2, 6, 10, 14], 'C': [2, 6, 10, 14], 'X': [2, 6, 10, 14]}

KINDS = ('kick', 'snare', 'clap', 'hat', 'ohat', 'shaker', 'tamb', 'cowbell', 'swell', 'don', 'ka', 'crash', 'hey')
hits = {k: [] for k in KINDS}
bass, stabs, arp = [], [], []


def roll(b0, beats, v0=0.15):
    """crescendo drum roll: snare 32nds and taiko 16ths, with a noise swell."""
    for i in range(beats * 8):
        hits['snare'].append((b0 + i / 8, (v0 + (1 - v0) * i / (beats * 8)) * 0.8))
    for i in range(beats * 4):
        hits['don'].append((b0 + i / 4, 0.3 + 0.7 * i / (beats * 4)))
    hits['swell'].append((b0, beats))


for m, style in enumerate(plan):
    pat = dict(P[style])
    if m in FILLS:
        pat = {k: v[:8] + '........' for k, v in pat.items()}
        for k, v in FILL2.items(): pat[k] = pat.get(k, '.' * 16)[:8] + v
    if m in BALLOON:
        pat = {}
    for inst, s in pat.items():
        for i, c in enumerate(s):
            if c != '.':
                if m in MINI and i >= 12 and inst in ('kick', 'snare', 'clap', 'don', 'ka'): continue
                v = 1.0 if c == 'x' else 0.55
                if m in FILLS and inst == 'snare' and i >= 8: v *= 0.5 + 0.5 * (i - 8) / 7    # crescendo
                hits[inst].append((m * 4 + i / 4, v))
    if m in MINI:   # one-beat fill: snare 16ths up into the next phrase, taiko on the 8ths
        for i, v in zip(range(12, 16), (0.45, 0.55, 0.7, 0.85)):
            hits['snare'].append((m * 4 + i / 4, v))
        hits['don'] += [(m * 4 + 3, 0.7), (m * 4 + 3.5, 0.85)]
    if m in BALLOON:   # 3-beat roll, then kick + taiko under the E5 E5 pickup
        roll(m * 4, 3)
        for b, v in ((3, 1.0), (3.5, 1.0)):
            for k in ('kick', 'don', 'clap'): hits[k].append((m * 4 + b, v))
        bass.append((m * 4, 3, 36))
        stabs += [(m * 4 + 3, 'C'), (m * 4 + 3.5, 'C')]
        continue
    if style == 'roll':
        roll(m * 4, 4, 0.45)
    if style == 'X':   # backbeat, then a snare build (8ths, then 16ths) and a riser over the last 2 measures
        k = m - plan.index('X')
        if k < 2: hits['snare'] += [(m * 4 + 1, 1.0), (m * 4 + 3, 1.0)]
        else: hits['snare'] += [(m * 4 + i / (2 * k - 2), 0.35 + 0.55 * ((k - 2) * 4 + i / (2 * k - 2)) / 8)
                                for i in range(4 * (2 * k - 2))]
        if k == 2: hits['swell'].append((m * 4, 8))
    cut = 8 if m in FILLS else 16
    for st, ln, iv in BASS.get(style, []):
        if st >= cut: continue
        b = m * 4 + st / 4
        root = CH[chord_at(b)][0]
        bass.append((b, ln / 4, (36 + root if root < 8 else 24 + root) + iv))
    for st in STABS.get(style, []):
        if st < cut: stabs.append((m * 4 + st / 4, chord_at(m * 4 + st / 4)))
    if style in ('C', 'X'):
        for i in range(16):
            b = m * 4 + i / 4
            tones = CH[chord_at(b)]
            k = [0, 1, 2, 3, 2, 1][(m * 16 + i) % 6]
            arp.append((b, 72 + (tones[k % len(tones)] + 12 * (k // len(tones))) % 24))
hits['crash'] = [(b, 1.0 if b in (144, 176, 208, 228) else 0.7) for b in CRASH] + [(208.02, 0.8)]   # doubled crash into the finale
hits['hey'] = [(b, 1.0 if b == END else 0.6) for b in HEY]
# One don/ka rule for the whole tune, shared by the audible taiko (in A) and the game chart.
# Structural positions alternate like a taiko pattern: the tune's bar downbeats and half-bars are
# DON, the beats between are KA; the in-between notes follow the melody: up = KA (rim), down = DON.
A_RANGES = [(16, 144)]
in_a = lambda s: any(a <= s < b for a, b in A_RANGES) or 12 <= s < 16


def tap_of(s, m, prev):
    """(kind, level) for a tune note; level = easiest difficulty with it (0 FÀCIL, 1 NORMAL, 2 DIFÍCIL)."""
    contour = 'ka' if prev is not None and m > prev else 'don'
    if in_a(s):   # half-time: the tune's quarters are 2 beats; FÀCIL gets them all (~1.3 notes/s at 152 BPM)
        # the two quick E5 pickups into B (half-beat apart) only on DIFÍCIL: elsewhere they'd force tiny notes on phones
        return ('don', 0) if s % 4 == 0 else ('ka', 0) if s % 2 == 0 else (contour, 0) if s % 1 == 0 else (contour, 2)
    # B and coda (the tune in 8ths): a smooth ramp instead of every 8th on DIFÍCIL. Per 4 measures:
    # FÀCIL 8 (every half bar), NORMAL 12, DIFÍCIL 20; every 8th only in the frenzy phrase.
    # Level 3 = in no chart (still a tune note for the audio).
    if s % 4 == 0: return ('don', 0)
    if s % 2 == 0: return ('ka', 0)
    if s % 1 == 0: return (contour, 1 if s % 4 == 1 else 2)
    return (contour, 2 if s % 2 == 1.5 or 208 <= s < 222 else 3)


tune_taps, prev = [], None
for s, d, m in melody:
    if s < 222: tune_taps.append((s, *tap_of(s, m, prev)))
    prev = m
# accents: every other crash moves to the tune's next KA (2 beats later), so big GUA and big PA alternate
ka0 = {t for t, k, lv in tune_taps if k == 'ka' and lv == 0}
BIG, want_pa = {222}, False
for c in CRASH:
    if c in (216, END): continue
    pa = want_pa and c + 2 in ka0
    BIG.add(c + 2 if pa else c)
    want_pa = not want_pa if pa or not want_pa else True   # a crash with no KA after it passes the turn on
# holds are the long tune notes (3+ beats) that aren't accents; every other one is a PA, and the taiko plays it so
HOLD_KA = set(sorted(s for s, d, _ in melody if d >= 3 and s < 222 and s not in BIG)[1::2])
for s, k, _ in tune_taps:     # taiko doubles the tune in A (PA holds sound as KA)
    k = 'ka' if s in HOLD_KA else k
    m = int(s // 4)
    if any(a <= s < b for a, b in A_RANGES) and plan[m] in ('A1', 'A2') and m not in FILLS | BALLOON \
            and not (m in MINI and s % 4 >= 3):
        hits[k].append((s, 0.8 if k == 'don' else 0.6))
hits['don'].append((END, 1.0))
hits['kick'].append((END, 1.0))
bass.append((END, 4, 36))
stabs.append((END, 'C'))

# ------------------------------------------------------------------ synthesis
N = int((sec(END) + 3.5) * SR)
STEMS = ('lead', 'pad', 'stab', 'arp', 'bell', 'bass', 'drums', 'perc', 'taiko')
stem = {k: np.zeros((N, 2)) for k in STEMS}
rng = np.random.default_rng(7)
noise = rng.standard_normal(SR * 3)


def put(buf, at, mono, pan=0.0):
    i = int(round(at * SR))
    n = min(len(mono), len(buf) - i)
    buf[i:i + n, 0] += mono[:n] * np.sqrt(0.5 * (1 - pan))
    buf[i:i + n, 1] += mono[:n] * np.sqrt(0.5 * (1 + pan))


def additive(f, dur, tilt, bright_decay=0.0, detune=0.0, vib=0.0, fmax=9000):
    t = np.arange(int(dur * SR)) / SR
    v = 1 + vib * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.3, 0, 1)
    ph = 2 * np.pi * f * 2 ** (detune / 1200) * np.cumsum(v) / SR
    out = np.zeros_like(t)
    for n in range(1, 16):
        if n * f > fmax: break
        out += n ** -tilt * np.exp(-t * bright_decay * (n - 1)) * np.sin(n * ph)
    return out, t


def adsr(t, dur, a, r, sus=1.0, dec=0.2):
    env = np.minimum(1, t / a) * (sus + (1 - sus) * np.exp(-t / dec))
    return env * np.clip((dur - t) / r, 0, 1)


lp = lambda x, a: lfilter([1 - a], [1, -a], x)      # one-pole lowpass


def partials(f, dur, parts):
    """struck idiophone: (ratio, amplitude, decay seconds) partials with a 2 ms attack."""
    t = np.arange(int(dur * SR)) / SR
    out = sum(a * np.exp(-t / d) * np.sin(2 * np.pi * f * r * t) for r, a, d in parts if f * r < 16000)
    return out * np.minimum(1, t / 0.002)


glock = lambda f, dur=1.4: partials(f, dur, [(1, 1, 0.8), (2.76, 0.3, 0.22), (5.40, 0.12, 0.08), (8.93, 0.05, 0.04)])
marimba = lambda f, dur=0.9: partials(f, dur, [(1, 1, 0.35), (3.93, 0.28, 0.07), (9.2, 0.06, 0.02)])


def brass(f, dur, detune=0.0):
    """soft brass: a warm tone whose upper harmonics bloom in over ~35 ms, capped at 5 kHz (no buzz)."""
    t = np.arange(int(dur * SR)) / SR
    scoop = 1 - 0.012 * np.exp(-t / 0.03)
    ph = 2 * np.pi * f * 2 ** (detune / 1200) * np.cumsum(scoop) / SR
    tilt = 2.6 - 1.2 * (1 - np.exp(-t / 0.035)) * np.exp(-t / 0.3)
    out = sum(np.exp(-tilt * np.log(n)) * np.sin(n * ph) for n in range(1, 11) if n * f < 5000)
    return out, t


# lead: warm additive tone (saw/square in between, highs roll off as it sustains), gentle vibrato
for s, d, m in melody:
    dur = d * SPB - 0.02
    for det, pan, g in ((0, 0, 1.0), (7, -0.5, 0.3), (-7, 0.5, 0.3)):
        w, t = additive(hz(m), dur + 0.12, 1.35, 0.35, det, 0.004 if d >= 2 else 0.0)
        put(stem['lead'], sec(s), w * adsr(t, dur + 0.12, 0.01, 0.12, 0.8, 0.25) * g, pan)
    st = plan[min(int(s // 4), len(plan) - 1)]     # glockenspiel an octave up: sparkle in A2, B and the coda
    g = {'A2': 0.45, 'B': 0.8, 'C': 1.0, 'X': 1.5, 'roll': 1.5}.get(st, 0)
    if g: put(stem['bell'], sec(s), glock(hz(m + 12)) * g, 0.25)


def voicing(name, low=55):
    return sorted(low + (pc - low) % 12 for pc in CH[name])


for s, e, c in chords:
    dur = (e - s) * SPB
    for m in voicing(c, 58):
        for det, pan in ((-9, -0.8), (9, 0.8), (0, 0)):
            w, t = additive(hz(m), dur + 0.4, 1.9, 0.8, det)
            put(stem['pad'], sec(s), w * adsr(t, dur + 0.4, 0.25, 0.4), pan)

for s, c in stabs:   # brass section "pah": short, soft attack, two players a few cents apart
    for m in voicing(c, 57) + [voicing(c, 57)[0] + 12]:
        for det, pan in ((-6, -0.35), (6, 0.35)):
            w, t = brass(hz(m), 0.3, det)
            put(stem['stab'], sec(s), w * adsr(t, 0.3, 0.012, 0.09, 0.35, 0.1), pan)

for i, (s, m) in enumerate(arp):
    w, t = additive(hz(m), 0.25, 1.7, 8.0)
    put(stem['arp'], sec(s), w * np.exp(-t / 0.07) * 0.5, -0.6 if i % 2 else 0.6)

for s, d, m in bass:
    dur = d * SPB - 0.015
    w, t = additive(hz(m), dur + 0.03, 1.6, 3.0)
    w = 0.8 * w + 0.6 * np.sin(2 * np.pi * hz(m) * t)
    put(stem['bass'], sec(s), w * adsr(t, dur + 0.03, 0.004, 0.03, 0.75, 0.12))


def crowd_hey():
    """a few voices shouting "hey!": glottal buzz through e/i formants, breathy onset, jittered."""
    t = np.arange(int(0.4 * SR)) / SR
    out = np.zeros(len(t))
    r = np.random.default_rng(3)
    for _ in range(7):
        f0 = r.uniform(165, 300)
        f = f0 * (1.12 - 0.2 * np.minimum(t / 0.25, 1))                # shouted pitch falls
        ph = 2 * np.pi * np.cumsum(f) / SR
        buzz = sum(np.sin(n * ph) / n for n in range(1, int(3800 / f0)))
        env = np.minimum(1, t / 0.02) * np.clip((0.2 - t) / 0.07, 0, 1)
        v = buzz * env + 0.4 * noise[:len(t)] * np.exp(-t / 0.035)
        lag = int(r.uniform(0, 0.03) * SR)
        out[lag:] += v[:len(t) - lag]
    y = sum(g * lfilter(*iirpeak(fc, q, SR), out) for fc, q, g in ((620, 4, 1.0), (1900, 6, 0.7), (2700, 8, 0.35)))
    return y / np.abs(y).max()


PERC = {}


def perc(kind, v):
    if kind not in PERC:
        t = np.arange(int(1.6 * SR)) / SR
        nz = noise[:len(t)]
        if kind == 'kick':
            f = 48 + 110 * np.exp(-t / 0.035)
            x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28) + 0.3 * lp(nz, 0.5) * np.exp(-t / 0.004)
        elif kind == 'snare':
            body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
            x = 0.8 * (0.6 * body + (lp(nz, 0.25) - lp(nz, 0.9)) * np.exp(-t / 0.13))
        elif kind == 'clap':
            e = sum(np.exp(-np.clip(t - k * 0.009, 0, None) / 0.012) * (t >= k * 0.009) for k in range(3))
            x = 0.5 * (lp(nz, 0.3) - lp(nz, 0.85)) * (e + np.exp(-t / 0.1))
        elif kind == 'hat':
            x = 0.22 * (nz - lp(nz, 0.6)) * np.exp(-t / 0.028)
        elif kind == 'ohat':
            x = 0.18 * (nz - lp(nz, 0.6)) * np.exp(-t / 0.16)
        elif kind == 'shaker':   # soft grains, rounded attack
            x = 0.2 * lp(nz - lp(nz, 0.55), 0.3) * np.minimum(1, t / 0.008) * np.exp(-t / 0.035)
        elif kind == 'tamb':     # jingles: bright noise with a few metallic rings
            ring = sum(np.sin(2 * np.pi * fq * t) for fq in (6200, 7900, 9400))
            x = 0.16 * ((nz - lp(nz, 0.35)) + 0.25 * ring * nz) * np.exp(-t / 0.07)
        elif kind == 'cowbell':  # mellow two-tone bell, sine partials only
            x = 0.22 * (np.sin(2 * np.pi * 587 * t) + 0.7 * np.sin(2 * np.pi * 845 * t)) \
                * (0.6 * np.exp(-t / 0.012) + 0.4 * np.exp(-t / 0.11))
        elif kind == 'crash':
            x = 0.25 * (nz - lp(nz, 0.3)) * np.exp(-t / 0.9)
        elif kind == 'don':   # big barrel drum: pitched thump with a skin slap
            f = 72 + 70 * np.exp(-t / 0.05)
            x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.33) + 0.35 * lp(nz, 0.8) * np.exp(-t / 0.03)
        elif kind == 'ka':    # rim: wooden click, kept soft
            x = 0.45 * (np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.018) + 0.5 * (lp(nz, 0.2) - lp(nz, 0.7)) * np.exp(-t / 0.012))
        elif kind == 'hey':
            x = crowd_hey()
        PERC[kind] = x
    return v * PERC[kind]


def swell(beats):
    """rising noise wash under a roll, cut on the next downbeat."""
    t = np.arange(int(beats * SPB * SR)) / SR
    nz = np.resize(noise, len(t))
    x = nz - lp(nz, 0.45)
    return 0.3 * lp(x, 0.2) * (t / t[-1]) ** 2.5


PAN = {'kick': 0, 'snare': 0.05, 'clap': -0.1, 'hat': 0.35, 'ohat': 0.35, 'shaker': 0.55, 'tamb': -0.45,
       'cowbell': -0.3, 'crash': -0.3, 'don': -0.15, 'ka': 0.3, 'hey': 0}
BUS = dict(don='taiko', ka='taiko', shaker='perc', tamb='perc', cowbell='perc', hey='perc')
for kind, lst in hits.items():
    for s, v in lst:
        x = swell(v) if kind == 'swell' else perc(kind, v)
        put(stem[BUS.get(kind, 'drums')], sec(s), x, PAN.get(kind, 0))

# sidechain: pad, stabs and bass breathe with the kick
duck = np.ones(N)
for s, _ in hits['kick']:
    i = int(sec(s) * SR); n = min(int(0.25 * SR), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.35 * np.exp(-np.arange(n) / SR / 0.08))
for k in ('pad', 'stab', 'bass'):
    stem[k] *= duck[:, None]

GAIN = dict(lead=0.36, pad=0.025, stab=0.11, arp=0.15, bell=0.09, bass=0.22, drums=0.45, perc=1.1, taiko=0.5)
dry = sum(stem[k] * g for k, g in GAIN.items())

# small hall on lead, pad, stabs, bells, snare/clap bus
it = np.arange(int(1.6 * SR)) / SR
ir = np.stack([lp(rng.standard_normal(len(it)), 0.6) * np.exp(-it / 0.35) for _ in range(2)], 1)
ir[: int(0.02 * SR)] = 0
ir /= np.abs(ir).sum(0) ** 0.5 * 12
send = stem['lead'] * 0.30 + stem['pad'] * 0.03 + stem['stab'] * 0.04 + stem['arp'] * 0.05 + stem['bell'] * 0.05 \
       + stem['drums'] * 0.08 + stem['perc'] * 0.06
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = dry + wet * 0.5

mix /= np.abs(mix).max() / 0.98
mix = np.tanh(mix * 1.6) / np.tanh(1.6) * 0.76      # gentle glue, true peak below -1 dBFS in the MP3 too
sf.write('public/music/mulassa-taiko.wav', mix.astype(np.float32), SR, subtype='PCM_16')

# ------------------------------------------------------------------ MIDI + game grid
mid = mido.MidiFile(ticks_per_beat=480)
TP = lambda b: int(round(b * 480))


def track(name, ch, prog, notes):
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name', name=name))
    if name == 'Lead': tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
    if prog is not None: tr.append(mido.Message('program_change', channel=ch, program=prog))
    ev = []
    for s, d, n, v in notes:
        ev += [(TP(s), 1, n, v), (TP(s + d), 0, n, 0)]
    now = 0
    for tk, on, n, v in sorted(ev):
        tr.append(mido.Message('note_on' if on else 'note_off', channel=ch, note=n, velocity=v, time=tk - now)); now = tk


vel = lambda v: max(1, min(127, int(127 * v)))
track('Lead', 0, 80, [(s, d, m, 100) for s, d, m in melody])
track('Chords', 1, 89, [(s, e - s, m, 60) for s, e, c in chords for m in voicing(c, 58)])
track('Brass', 4, 61, [(s, 0.25, m, 90) for s, c in stabs for m in voicing(c, 57)])
track('Glockenspiel', 5, 9, [(s, 0.5, m + 12, 70) for s, d, m in melody if plan[min(int(s // 4), len(plan) - 1)] in ('A2', 'B', 'C', 'X', 'roll')])
track('Bass', 2, 38, [(s, d, m, 100) for s, d, m in bass])
track('Taiko', 3, 116, [(s, 0.25, 48 if k == 'don' else 60, vel(v)) for k in ('don', 'ka') for s, v in hits[k]])
GM = dict(kick=36, snare=38, clap=39, hat=42, ohat=46, crash=49, tamb=54, cowbell=56, shaker=70)
track('Drums', 9, None, [(s, 0.25, GM[k], vel(v)) for k in GM for s, v in hits[k]])
mid.save('public/music/mulassa-taiko.mid')

json.dump({
    'bpm': BPM, 'offset': LEAD_IN, 'beats_per_bar': 4, 'end_beat': END,
    'sections': [[m * 4, s] for m, s in enumerate(plan) if m == 0 or plan[m - 1] != s],
    'drum_rolls': [[m * 4, m * 4 + 3] for m in sorted(BALLOON)] + [[224, END]],
    'melody': [[round(s, 3), round(d, 3), m] for s, d, m in melody],
    'don': sorted(round(s, 3) for s, _ in hits['don']), 'ka': sorted(round(s, 3) for s, _ in hits['ka']),
}, open('music/taiko-arrangement.json', 'w'), separators=(',', ':'))

rms = {k: round(float(20 * np.log10(np.sqrt(((stem[k] * g) ** 2).mean()) + 1e-9)), 1) for k, g in GAIN.items()}
print('duration', round(N / SR, 1), 's  notes', len(melody), ' stems dB', rms)
if os.environ.get('STEMS'):                         # STEMS=1: dump the scaled stems for loudness checks
    os.makedirs('tmp/audio', exist_ok=True)
    for k, g in GAIN.items(): sf.write(f'tmp/audio/taiko-stem-{k}.wav', (stem[k] * g * 0.5).astype(np.float32), SR)

# check: no tune note on a strong beat sits a semitone above a chord tone (the sound of "wrong chord")
strong = lambda s: s % 2 == 0 if any(a <= s < b for a, b in A_RANGES) else s % 1 == 0
clash = [(s, m) for s, d, m in melody if strong(s) and any((m - c) % 12 == 1 for c in CH[chord_at(s)])]
assert not clash, clash

# ------------------------------------------------------------------ game chart (src/song.json)
# Every tap is a tune note. DON (orange, left) on the tune's strong positions, KA (turquoise, right)
# between them; the closing roll (a balloon in the game) before the final hit.
# level = easiest difficulty that gets the note: 0 FÀCIL, 1 NORMAL, 2 DIFÍCIL.
# big = GUAPA (GUA + PA: both buttons at once; FÀCIL: either), on the musical accents: the tune note under
# every crash (phrase starts and landings), the last C and the final hit. The kind still drives the audible
# taiko; in the game a GUAPA is half orange, half turquoise. 216 is left out so the finale's accents stay 208, 222 and 228.
last_c = (222, *tap_of(222, melody[-1][2], melody[-2][2]))
taps = [(s, k, lv, int(s in BIG)) for s, k, lv in tune_taps + [last_c]] \
       + [(224 + i / 2, 'don', 1 if i % 2 == 0 else 2, 0) for i in range(8)] + [(END, 'don', 0, 1)]
taps.sort()
assert all(b[0] - a[0] >= 0.5 for a, b in zip(taps, taps[1:]) if a[0] >= 12), 'overlapping taps'
onsets = {s for s, _, _ in melody}
assert taps[0][0] == 12 and all(s in onsets for s, _, _, _ in taps if s < 224), 'taps must be melody notes'
bigs = [(s, k, lv) for s, k, lv, bg in taps if bg]
assert {s for s, _, _ in bigs} == BIG | {END} and all(lv == 0 for _, _, lv in bigs), bigs    # on every difficulty
assert not [s for s, _, _ in bigs if any(a <= s < b for a, b in ((140, 143), (224, 228)))], 'big note in a balloon'
assert 10 <= len(bigs) <= 16 and bigs[-1] == (END, 'don', 0), bigs
# holds (NORMAL and DIFÍCIL; FÀCIL plays them as taps): the tune's long notes (3+ beats) that aren't GUAPA
# accents. The tail follows the sung note and ends at least a beat before the next tap or balloon.
BALLOON_B = [(140, 143), (224, 228)]
dur_of = {s: d for s, d, _ in melody}
HOLD = {}
for i, (s, k, lv, bg) in enumerate(taps):
    if bg or dur_of.get(s, 0) < 3 or s >= 222: continue
    nxt = min([taps[i + 1][0]] + [a for a, _ in BALLOON_B if a > s])
    HOLD[s] = min(s + dur_of[s], nxt - 1)
# every other hold is a PA (HOLD_KA, defined with the accents so the audible taiko matches)
assert HOLD_KA == set(sorted(HOLD)[1::2]), (HOLD_KA, sorted(HOLD))
taps = [(s, 'ka' if s in HOLD_KA else k, lv, bg, HOLD.get(s, 0)) for s, k, lv, bg in taps]
assert {k for s, k, _, _, he in taps if he} == {'don', 'ka'}, 'holds of both kinds'
for i, (s, k, lv, bg, he) in enumerate(taps):
    if not he: continue
    assert not bg and lv == 0 and he - s >= 2, (s, he)
    assert he <= taps[i + 1][0] - 1, ('hold runs into the next tap', s, he)
    assert not any(s < b and he > a for a, b in BALLOON_B), ('hold in a balloon', s)
assert 5 <= len(HOLD) <= 10, HOLD
# DIFÍCIL only, part A: the audible backbeat (snare on beats 2 and 4) becomes PA taps where the tune rests,
# so the start is as busy as the rest. Never near a tune tap (3/4 beat), inside a hold (+1 beat), fill or balloon.
BACKBEAT = sorted({b for b, v in hits['snare'] if v >= 0.5 and b % 1 == 0 and b % 2 == 1
                   and any(lo <= b < hi for lo, hi in A_RANGES) and int(b // 4) not in FILLS})
busy = [(s - 0.75, s + 0.75) for s, *_ in taps] + [(s, he + 1) for s, _, _, _, he in taps if he] + BALLOON_B
extra = [(b, 'ka', 2, 0, 0) for b in BACKBEAT if not any(lo < b < hi for lo, hi in busy)]
assert 20 <= len(extra) <= 80, len(extra)
taps = sorted(taps + extra)
sect = [(0, 'A'), (144, 'B')]
json.dump({
    'bpm': BPM, 'duration': round(N / SR, 3), 'end': round(sec(END), 3), 'tail': round(sec(END) + 2.5, 3),
    'finale': round(sec(208), 4),               # FINAL ESBOJARRAT: the last coda phrase (bar 66) to the last hit
    'sections': [[round(sec(b), 3), k] for b, k in sect],
    'beats': [round(sec(b), 4) for b in range(END + 1)],
    'notes': [[round(sec(s), 4), k, lv, bg, round(sec(he), 4) if he else 0] for s, k, lv, bg, he in taps],
    'balloonBeats': [list(w) for w in BALLOON_B],   # the GLOBUS windows [start, end) in beats (src/game/chart.js)
}, open('src/song.json', 'w'), separators=(',', ':'))

# ------------------------------------------------------------------ menu ambience: an entrance, then a 16-measure loop
# The groove leads: rounded taiko, handclaps, shaker, bass and muted nylon afterbeats.
# One eight-measure tune, played twice: the same small arch and answering descent.
# Hold each harmony for two measures; expression belongs in the touch, not new sections.
# The entrance builds from the loop's last four measures, without the tune; only the
# steady section repeats, so returning to the menu is gentle without a dip on every lap.
AMB, INTRO_BEATS = 64, 16
LOOP = int(AMB * SPB * SR)
INTRO = int(INTRO_BEATS * SPB * SR)
# The menu loop doesn't depend on the song's form: AMBIENT=1 renders and encodes it again, otherwise its MP3 (and hash) stays.
AMBIENT = bool(os.environ.get('AMBIENT'))
if AMBIENT:
    amb = {k: np.zeros((LOOP + 5 * SR, 2)) for k in ('pad', 'bass', 'chords', 'melody', 'drums')}
    ab = lambda b: b * SPB
    call = 'R:0.5 C4:0.5 E4:1 G4:1 E4:1'            # B's C/E/G colours, one gentle arch
    answer = 'E4:0.5 D4:0.5 C4:2 R:1'
    amb_bars = [
        ('C', call), ('C', answer),
        ('F', 'R:0.5 C4:0.5 F4:1 F4:1 C4:1'), ('F', 'C4:1 A3:2 R:1'),
        ('G', 'R:0.5 B3:0.5 D4:1 G4:1 D4:1'), ('G', 'D4:1 B3:2 R:1'),
        ('C', call), ('C', answer),
    ] * 2
    amb_mel, amb_ch = [], []
    for i, (c, line) in enumerate(amb_bars):
        ns, end = notes_of(17, i * 4, 1, line)
        assert end == (i + 1) * 4, (i, end)
        amb_mel.extend(ns)
        if amb_ch and amb_ch[-1][2] == c:             # one held harmony, not a new pad attack every bar
            amb_ch[-1] = (amb_ch[-1][0], end, c)
        else:
            amb_ch.append((i * 4, end, c))
    assert len(amb_bars) * 4 == AMB
    # Close inner voices soften each change. The loop itself stays on C.
    amb_voices = {'C': (55, 60, 64), 'F': (57, 60, 65), 'G': (55, 59, 62)}
    for a, b in zip(amb_ch, amb_ch[1:] + amb_ch[:1]):
        assert max(abs(x - y) for x, y in zip(amb_voices[a[2]], amb_voices[b[2]])) <= 3, 'jumpy inner voice'


    def nylon(f, dur, pos=0.18, bright=1.0):
        """Thumbed nylon: rounded attack, tuned harmonics, dark body and no sharp pick transient."""
        t = np.arange(int(dur * SR)) / SR
        out = sum(n ** -1.9 * abs(np.sin(np.pi * n * pos)) * np.exp(-t * (2.0 + 1.2 * bright * (n - 1) ** 1.25))
                  * np.sin(2 * np.pi * f * n * t) for n in range(1, 10) if f * n < 3500)
        return out * np.minimum(1, t / 0.012) * np.clip((dur - t) / 0.1, 0, 1)


    amb_chord = lambda beat: next(c for s, e, c in reversed(amb_ch) if s <= beat + 1e-6)
    assert all(m % 12 in CH[amb_chord(s)] for s, d, m in amb_mel if s % 1 == 0), 'unresolved strong-beat note'
    assert max(m for _, _, m in amb_mel) - min(m for _, _, m in amb_mel) <= 10, 'keep the tune in one singing register'
    assert all(e - s >= 8 for s, e, _ in amb_ch), 'let the harmony settle for two measures'
    assert [(s, d, m) for s, d, m in amb_mel if s < 32] == [(s - 32, d, m) for s, d, m in amb_mel if s >= 32], 'repeat the tune before developing it'
    for end in range(8, AMB + 1, 8):
        phrase = [(s, d, m) for s, d, m in amb_mel if end - 8 <= s < end]
        s, d, m = phrase[-1]
        assert m % 12 in CH[amb_chord(s)] and d >= 2 and s + d <= end - 1, 'hold the arrival, then take a breath'
    for voice in range(3):                          # common tones hold through the chord change
        held = []
        for s, e, c in amb_ch:
            m = amb_voices[c][voice]
            if held and held[-1][2] == m:
                held[-1] = (held[-1][0], e, m)
            else:
                held.append((s, e, m))
        for s, e, m in held:
            dur = (e - s) * SPB + 0.06               # a short release, never the old chord over the next whole beat
            for det, pan in ((-6, -0.9), (6, 0.9)):
                w, t_ = additive(hz(m), dur, 2.2, 0.5, det)
                put(amb['pad'], ab(s), w * adsr(t_, dur, 0.22, 0.12) * 0.01, pan)
    # Fixed touch patterns: the drummer anchors the beat; bass and hands settle just behind.
    # These tiny offsets never accumulate or change the tempo, including across the loop.
    touch = (0.96, 1.0, 1.02, 0.94, 0.98, 1.03, 1.0, 0.92)
    for b in range(0, AMB, 2):                     # bass + drum on 1/3, strummed chords answer on 2/4
        c = amb_chord(b); root = CH[c][0]
        root += 36 if root < 8 else 24
        fifth = root + 7 if root + 7 <= 48 else root - 5
        m = fifth if b % 4 else root
        gain = touch[b // 4 % 8]
        w, t_ = additive(hz(m), 0.42, 1.8, 3.0)
        put(amb['bass'], ab(b) + 0.004, (0.6 * w + 0.6 * np.sin(2 * np.pi * hz(m) * t_)) * adsr(t_, 0.42, 0.014, 0.08, 0.6, 0.1) * 0.11 * gain)
        for i, m in enumerate(amb_voices[amb_chord(b + 1)]):
            w = nylon(hz(m), 0.38, 0.3, 2.0)
            put(amb['chords'], ab(b + 1) + 0.009 + (0.012 if b % 4 else 0.016) * i, w * 0.065 * gain,
                (-0.35, 0.05, 0.35)[i % 3])
    for s, d, m in amb_mel:
        dur = min(d * SPB, 1.4)
        ending = int(s // 4) % 2 == 1
        gain = touch[int(s // 4) % 8] * (0.82 if ending else 1.0)
        lag = 0.014 if ending else 0.006             # lean into the arch, relax into its answer
        put(amb['melody'], ab(s) + lag, nylon(hz(m), dur, 0.24, 1.5) * 0.052 * gain, -0.15)
    for mm in range(AMB // 4):
        b0 = mm * 4
        gain = touch[mm % 8]
        for b, v in ((0, 0.42), (2, 0.34)):
            put(amb['drums'], ab(b0 + b), lp(perc('don', v * gain), 0.7) * 0.4, -0.1)
        for b in (1, 3):
            put(amb['drums'], ab(b0 + b) + (0.012 if b == 1 else 0.009), lp(perc('clap', (0.21 if b == 1 else 0.19) * gain), 0.45), -0.15)
        for i in range(8):
            v = (0.18, 0.3, 0.16, 0.27, 0.2, 0.31, 0.15, 0.25)[i]
            put(amb['drums'], ab(b0 + i / 2) + (0.006 if i % 2 else 0), lp(perc('shaker', v * gain), 0.45), 0.35)
        if mm % 8 == 7:                             # just a soft hand-drum reply after the tune has landed
            for b, v in ((3, 0.1), (3.5, 0.13)):
                put(amb['drums'], ab(b0 + b) + 0.008, lp(perc('ka', v), 0.55), 0.25)
    entrance, steady = np.zeros((INTRO, 2)), np.zeros((LOOP, 2))
    # The tails wrap inside the steady section only. Its last measures flow into its first;
    # once every layer has entered, the entrance uses that same continuous join.
    entry = dict(drums=(0, 8), pad=(2, 10), bass=(4, 12), chords=(6, 14))
    for k, dry_amb in amb.items():
        wet = np.stack([fftconvolve(dry_amb[:, c], ir[:, c])[:len(dry_amb)] for c in range(2)], 1)
        rendered = dry_amb + wet * (0.5 if k in ('pad', 'melody', 'chords') else 0.15)
        rendered[:len(rendered) - LOOP] += rendered[LOOP:]
        steady += rendered[:LOOP]
        if k in entry:
            start, end = entry[k]
            fade = np.clip((np.arange(INTRO) / SR / SPB - start) / (end - start), 0, 1)
            fade = fade * fade * (3 - 2 * fade)
            entrance += rendered[LOOP - INTRO:LOOP] * fade[:, None]
    level = 0.075 / np.sqrt((steady ** 2).mean())     # leave the menu comfortably behind the game
    loop = np.concatenate([entrance, steady, steady[:SR]]) * level
    loop = np.tanh(loop * 1.3) / 1.3
    assert np.abs(loop).max() < 0.7, np.abs(loop).max()
    intro_rms = np.sqrt((loop[:SR] ** 2).mean())
    steady_rms = np.sqrt((loop[INTRO:INTRO + LOOP] ** 2).mean())
    assert intro_rms < steady_rms * 0.12, 'the first second must ease in, even outside the game'
    assert np.max(np.abs(loop[INTRO - 1] - loop[INTRO])) < 0.015, 'entrance seam'
    assert np.max(np.abs(loop[INTRO + LOOP - 1] - loop[INTRO])) < 0.015, 'loop seam'
    os.makedirs('tmp/audio', exist_ok=True)
    sf.write('tmp/audio/mulassa-ambient.wav', loop.astype(np.float32), SR, subtype='PCM_16')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', 'public/music/mulassa-taiko.wav', '-c:a', 'libmp3lame', '-b:a', '160k', 'public/music/mulassa-taiko.mp3'], check=True)
if AMBIENT:
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', 'tmp/audio/mulassa-ambient.wav', '-c:a', 'libmp3lame', '-b:a', '192k', 'public/music/mulassa-taiko-ambient.mp3'], check=True)
for d in range(3):  # every difficulty must mix both sides
    ks = [k for _, k, lv, _, _ in taps if lv <= d]
    assert min(ks.count('don'), ks.count('ka')) > 0.3 * len(ks), (d, ks.count('don'), ks.count('ka'))
# cache-busting: song.json points at the audio with a content hash, so browsers never pair new notes with an old MP3
import hashlib
ver = lambda f: hashlib.sha1(open(f, 'rb').read()).hexdigest()[:10]
song_json = json.load(open('src/song.json'))
song_json['audio'] = f"music/mulassa-taiko.mp3?v={ver('public/music/mulassa-taiko.mp3')}"
song_json['ambient'] = f"music/mulassa-taiko-ambient.mp3?v={ver('public/music/mulassa-taiko-ambient.mp3')}"
song_json['ambientLoop'] = dict(start=INTRO / SR, end=(INTRO + LOOP) / SR, beats=AMB)
json.dump(song_json, open('src/song.json', 'w'), separators=(',', ':'))
print('taps per level (don/ka)', [(sum(lv <= d and k == 'don' for _, k, lv, _, _ in taps), sum(lv <= d and k == 'ka' for _, k, lv, _, _ in taps)) for d in range(3)],
      ' holds', sorted(HOLD.items()), ' big', [(s, k) for s, k, _ in bigs], ' ambient loop', round(LOOP / SR, 4), 's')
