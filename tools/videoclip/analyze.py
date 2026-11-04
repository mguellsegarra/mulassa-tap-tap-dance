"""Videoclip (dev only): a Suno song's stems (and its mix) -> media/mix.wav and clip.json, the grid the clip's dance,
lights and cuts follow.

uv run --python 3.11 --with numpy --with scipy --with soundfile --with librosa python -I tools/videoclip/analyze.py \
    <stems dir> [--mix=<Suno's mp3 or wav>] [--bpm=166]

Suno's "164 BPM" is nominal and its tempo drifts (Mulassa-Frases v2: 166 -> 168 bpm): the beats are tracked one by one
(librosa's dynamic programming on the drums' and the mix's onsets), then moved onto the kicks (its onset curve peaks
~16 ms late). With --mix the stems are moved onto the mix's clock (an MP3's decoder delay, ~23 ms) and the mix is the
clip's audio; without it the stems are summed. clip.json: beat times, bars (the first drop starts a bar), the kicks,
snares, hats and the vocal shouts (s), each stem's level a beat (0..1), and sections cut where the kick comes and goes,
in phrases of at most 8 bars, with a guessed kind (intro, build, drop, hard, break, outro) the tool lets the owner relabel.
"""
import json, sys, glob, os
import numpy as np, soundfile as sf, librosa
from scipy.signal import butter, sosfiltfilt, find_peaks, correlate

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
files = sorted(glob.glob(os.path.join(args[0], '*.mp3')) + glob.glob(os.path.join(args[0], '*.wav')))
assert files, 'no stems'

stems, sr = {}, None
for f in files:
    x, r = sf.read(f, dtype='float32', always_2d=True)
    assert sr in (None, r), 'stems at different rates'
    sr = r
    # "1 Drums.mp3" -> "drums", "0 Lead Vocals.mp3" -> "lead_vocals"
    stems[os.path.splitext(os.path.basename(f))[0].split(' ', 1)[-1].lower().replace(' ', '_')] = x
# Suno trims a stem after its last sound (a synth stem ended 39 s early): pad them all to the longest
n = max(len(x) for x in stems.values())
stems = {k: np.pad(x, ((0, n - len(x)), (0, 0))) for k, x in stems.items()}
total = sum(stems.values())
if 'mix' in opts:
    mix, r = sf.read(opts['mix'], dtype='float32', always_2d=True)
    assert r == sr, 'mix at another rate than the stems'
    lags = []
    for t0 in np.linspace(10, len(mix) / sr - 20, 6):
        a, b = mix[int(t0 * sr):int((t0 + 8) * sr), 0], total[int(t0 * sr):int((t0 + 8) * sr), 0]
        lags.append(np.argmax(correlate(a, b, 'full', method='fft')) - len(b) + 1)
    lag = int(np.median(lags))
    assert max(abs(l - lag) for l in lags) < sr // 1000, f'mix and stems drift apart: {lags}'
    stems = {k: (x[-lag:] if lag < 0 else np.pad(x, ((lag, 0), (0, 0)))) for k, x in stems.items()}
    n = min(len(mix), min(len(x) for x in stems.values()))
    stems = {k: x[:n] for k, x in stems.items()}; mix = mix[:n]
    print(f'mix vs stems: {lag / sr * 1000:.1f} ms')
else:
    mix = total * 10 ** (-1 / 20) / np.abs(total).max()
os.makedirs(os.path.join(HERE, 'media'), exist_ok=True)
sf.write(os.path.join(HERE, 'media', 'mix.wav'), mix, sr, subtype='PCM_16')
dur = n / sr

HOP = 240  # 5 ms at 48 kHz
def band(x, lo=None, hi=None):
    m = x.mean(1)
    if lo or hi:
        m = sosfiltfilt(butter(4, [lo, hi] if lo and hi else (hi or lo), btype='band' if lo and hi else ('low' if hi else 'high'), fs=sr, output='sos'), m)
    return m
def env(m):
    k = len(m) // HOP * HOP
    return np.sqrt(np.add.reduceat(m[:k] ** 2, np.arange(0, k, HOP)) / HOP)
onset = lambda e: np.maximum(0, np.diff(np.log(e + 1e-5), prepend=np.log(e[0] + 1e-5)))
fps = sr / HOP
drums = stems.get('drums', mix)
def events(o, min_gap, rel):
    pk, _ = find_peaks(o, distance=max(1, int(min_gap * fps)), height=rel * np.percentile(o[o > 0], 99))
    return np.array([p / fps for p in pk])
kicks = events(onset(env(band(drums, hi=150))), .22, .35)
snares = events(onset(env(band(drums, lo=180, hi=2500))), .22, .45)
hats = events(onset(env(band(drums, lo=7000))), .07, .4)

# ---- beats: tracked, then moved onto the kicks
LH = 256
oe = lambda y: librosa.onset.onset_strength(y=y, sr=sr, hop_length=LH)
a, b = oe(mix.mean(1)), oe(drums.mean(1)); k = min(len(a), len(b))
_, beats = librosa.beat.beat_track(onset_envelope=a[:k] / a.max() + 2 * b[:k] / b.max(), sr=sr, hop_length=LH,
                                   start_bpm=float(opts.get('bpm', 166)), tightness=400, units='time', trim=False)
near = lambda x: beats[np.argmin(np.abs(beats - x))]
bias = float(np.median([kk - near(kk) for kk in kicks if abs(kk - near(kk)) < .06]))
beats = beats + bias
print(f'beats {len(beats)}, moved {bias * 1000:.1f} ms onto the kicks; bpm {60 / np.median(np.diff(beats)):.2f}')

# per-beat level of each stem (rms over the beat, over the stem's own loud level so quiet stems still read)
edges = np.append(beats, beats[-1] + np.median(np.diff(beats)))
def per_beat(m):
    e = env(m); out = np.array([e[int(edges[i] * fps):max(int(edges[i] * fps) + 1, int(edges[i + 1] * fps))].mean() for i in range(len(beats))])
    return np.clip(out / (np.percentile(out, 95) or 1), 0, 1)
levels = {k: per_beat(band(v)) for k, v in stems.items()}
kick_level = per_beat(band(drums, hi=150))

# ---- sections: bars with a kick vs without (a gap of up to two bars inside a drop is one of its dips)
first_kick = int(np.argmax(kick_level > .5))
down = first_kick % 4  # bars start where the first drop starts
bars = list(range(down, len(beats), 4)); bars = ([0] if down else []) + bars
has = [kick_level[s:s + 4].mean() > .45 for s in bars]
for i in range(len(has)):  # fill dips of <= 2 bars between kick bars
    if not has[i] and i and has[i - 1]:  # (only a gap that starts right after a kick bar)
        j = i
        while j < len(has) and not has[j]: j += 1
        if j < len(has) and j - i <= 2: has[i:j] = [True] * (j - i)
for i in range(1, len(has) - 1):  # a lone kick bar (a build's hits) is not a drop
    if has[i] and not has[i - 1] and not has[i + 1]: has[i] = False
runs = []  # [first bar, last bar + 1, kick?]
for i, h in enumerate(has):
    if runs and runs[-1][2] == h: runs[-1][1] = i + 1
    else: runs.append([i, i + 1, h])

# vocal shouts: short bursts of the lead vocal (the spoken "Mulassa!", "Guapa!")
v = env(band(stems['lead_vocals'])) if 'lead_vocals' in stems else np.zeros(1)
on = v > max(.02, np.percentile(v, 99) * .15); bursts = []; i = 0
while i < len(on):
    if on[i]:
        j = i
        while j < len(on) and on[j:j + 20].any(): j += 1
        if bursts and i / fps - bursts[-1][1] < .6: bursts[-1][1] = j / fps  # "Gua-pa": one shout
        else: bursts.append([i / fps, j / fps])
        i = j
    else: i += 1
shouts = [round(a, 3) for a, b in bursts if .3 <= b - a < 1.6]
shout_lens = [round(b - a, 3) for a, b in bursts if .3 <= b - a < 1.6]  # (how long each is said: the words' letters follow it)
# where each syllable starts inside a shout (s from its start): a dip under 20% of its loudest for >= 40 ms splits them
# ("GUA ... PA"); none found: [0] and the words split themselves evenly
def syllables(a, n):
    seg = np.convolve(v[int(a * fps):int((a + n) * fps)], np.ones(6) / 6, 'same'); low = seg < seg.max() * .2; out = [0.0]; i = 0
    while i < len(seg):
        if low[i]:
            j = i
            while j < len(seg) and low[j]: j += 1
            if (j - i) / fps >= .04 and i > 0 and j < len(seg): out.append(round(j / fps, 3))
            i = j
        else: i += 1
    return out
shout_syl = [syllables(a, l) for a, l in zip(shouts, shout_lens)]

phrases = []
for r, (b0, b1, kick) in enumerate(runs):
    first, last = r == 0, r == len(runs) - 1
    before = [s for s in shouts if beats[bars[b0]] - 16 < s < beats[bars[b0]]]  # (the three GUAPA span ~6 s and end ~6 s before)
    last_shouted = all(not runs[q][2] or len([x for x in shouts if beats[bars[runs[q][0]]] - 16 < x < beats[bars[runs[q][0]]]]) < 3 for q in range(r + 1, len(runs)))
    if kick: kind = 'hard' if len(before) >= 3 and b1 - b0 <= 10 and last_shouted else 'drop'  # (only the last drop after three shouts: the hardstyle)
    else: kind = 'outro' if last else 'intro' if first else 'break'
    # a quiet run before a drop ends in a build: its last 8 bars (all of it when shorter)
    split = max(b0, b1 - 8) if not kick and not last and b1 - b0 >= 4 else b1
    if split - b0 < 4: split = b0  # (under 4 bars left before the build: all of it builds)
    for lo, hi, k2 in ((b0, split, kind), (split, b1, 'build')):
        for s in range(lo, hi, 8):
            if s > lo and hi - s < 4: continue  # a stub under 4 bars stays in the phrase before
            phrases.append({'beat': bars[s], 'label': k2})
for p in phrases: p['start'] = round(float(beats[p['beat']]), 3)

r3 = lambda a: [round(float(x), 3) for x in a]
r2 = lambda a: [round(float(x), 2) for x in a]
clip = {
    'source': os.path.basename(os.path.normpath(args[0])), 'audio': 'media/mix.wav', 'duration': round(dur, 3),
    'bpm': round(float(60 / np.median(np.diff(beats))), 2), 'beatTimes': r3(beats), 'downbeat': down, 'beats': len(beats),
    'phrases': phrases, 'shouts': shouts, 'shoutLens': shout_lens, 'shoutSyl': shout_syl, 'kicks': r3(kicks), 'snares': r3(snares), 'hats': r3(hats),
    'levels': {k: r2(v) for k, v in levels.items()}, 'kickLevel': r2(kick_level),
}
with open(os.path.join(HERE, 'clip.json'), 'w') as f: json.dump(clip, f, separators=(',', ':'))
print('shouts', shouts)
for p in phrases: print(f"  {p['start']:7.2f}s beat {p['beat']:4d} {p['label']}")
