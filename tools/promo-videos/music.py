# The promo's soundtrack: the game's own arrangement, rendered again with its events laid out in the promo's order
# (src/timeline.json `segs`). tools/music/build_taiko.py is only READ: its event-building part runs as is, the events are
# rearranged here, then its own synthesis, sidechain, hall and glue run on them. So a join is played, not spliced: a note
# sounding across a join ends with its own release, one already sounding where the next stretch begins is struck on
# that beat, and the reverb flows across. Nothing of the game is written: the output is public/music-edit.wav.
# Then the promo's touches: the opening muffled and quiet until the pickup, a fade to nothing at the end.
# Usage: uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python music.py
import json, os, pathlib
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
tl = json.loads((HERE / 'src/timeline.json').read_text())
SRC = (ROOT / 'tools/music/build_taiko.py').read_text()
SYN = '# ------------------------------------------------------------------ synthesis'
WRITE = "sf.write('public/music/mulassa-taiko.wav'"
assert SRC.count(SYN) == 1 and SRC.count(WRITE) == 1, 'build_taiko.py changed shape: update the markers'

g = {'__name__': 'build_taiko_events', '__file__': str(ROOT / 'tools/music/build_taiko.py')}  # the generator finds the repo from its own path
cwd = os.getcwd(); os.chdir(ROOT)  # it reads music/score.json
try:
    exec(compile(SRC[:SRC.index(SYN)], 'build_taiko.py', 'exec'), g)  # events only: writes nothing
finally:
    os.chdir(cwd)

SEGS = [(s['vb'], s['song'], s['to']) for s in tl['segs']]


def places(b):  # an onset: its beats in the piece (a stretch of the song may be played more than once; none if left out)
    return [(vb + b - s0, s1 - b) for vb, s0, s1 in SEGS if s0 <= b < s1]  # (beat, beats left in that stretch)


def spans(b, e):  # a note [b, e): its parts inside the kept stretches, as (start, end) beats of the piece
    out = []
    for vb, s0, s1 in SEGS:
        lo, hi = max(b, s0), min(e, s1)
        if hi - lo > 0.05: out.append((vb + lo - s0, vb + hi - s0))
    return out


hits = {k: [] for k in g['hits']}
for k, lst in g['hits'].items():
    for b, v in lst:
        for p, left in places(b):
            hits[k].append((p, min(v, left) if k == 'swell' else v))  # a roll's wash never runs past its stretch
g['hits'] = hits
g['melody'] = [[p0, p1 - p0, m] for b, d, m in g['melody'] for p0, p1 in spans(b, b + d)]
g['bass'] = [(p0, p1 - p0, m) for b, d, m in g['bass'] for p0, p1 in spans(b, b + d)]
g['chords'] = [(p0, p1, c) for b, e, c in g['chords'] for p0, p1 in spans(b, e)]
g['stabs'] = [(p, c) for b, c in g['stabs'] for p, _ in places(b)]
g['arp'] = [(p, m) for b, m in g['arp'] for p, _ in places(b)]
# one style per measure (only the bells' level reads it): each of the piece's measures takes the style of the song's
# measure its first beat comes from
song_plan, total = g['plan'], SEGS[-1][0] + SEGS[-1][2] - SEGS[-1][1]
g['plan'] = []
for m in range(int(np.ceil(total / 4))):
    vb, s0, _ = max((x for x in SEGS if x[0] <= m * 4), key=lambda x: x[0])
    g['plan'].append(song_plan[min(int((s0 + m * 4 - vb) // 4), len(song_plan) - 1)])
g['END'] = places(g['END'])[-1][0]

exec(compile(SRC[SRC.index(SYN):SRC.index(WRITE)], 'build_taiko.py', 'exec'), g)  # synthesis + mix, stops before its write
sr, out = g['SR'], g['mix']
n_out = round(tl['frames'] / tl['fps'] * sr)
out = np.pad(out, ((0, max(0, n_out - len(out))), (0, 0)))[:n_out]  # the piece's time is the render's (beat 0 at 0.1 s, like the song)

# The opening: a low-pass that opens on the pickup (the song's beats 12 -> 16) and a gain that rises with it.
t = np.arange(n_out) / sr
b12, b16 = tl['open']  # output seconds of the song's beats 12 and 16
cut = np.where(t < b12, 420 * (1 + t / b12), 840 * (18000 / 840) ** np.clip((t - b12) / (b16 - b12), 0, 1) ** 2)
gain_db = np.where(t < b12, -9 + 4 * t / b12, -5 + 5 * np.clip((t - b12) / (b16 - b12), 0, 1))
blk = 256
wet = np.zeros_like(out)
zi = np.zeros((2, 2, 2))  # 2 biquads x 2 channels
end = round((b16 + 0.05) * sr)
for s in range(0, end, blk):
    sos = butter(4, min(cut[s], 0.45 * sr), fs=sr, output='sos')
    for ch in range(2):
        wet[s:s + blk, ch], zi[:, ch] = sosfilt(sos, out[s:s + blk, ch], zi=zi[:, ch])
# past the pickup the filter is wide open: crossfade back to the untouched signal over the last 50 ms
fx = np.clip((t - b16) / 0.05, 0, 1)[:, None]
out = np.where(t[:, None] < b16 + 0.05, wet * (1 - fx) + out * fx, out) * (10 ** (gain_db / 20))[:, None]
fi = round(tl['lead'] * sr); out[:fi] *= (np.sin(np.linspace(0, np.pi / 2, fi)) ** 2)[:, None]  # from silence over the black lead
fo = round(tl['fadeOut'] * sr); out[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]  # the ring-out fades to nothing at the last frame
peak = np.abs(out).max()
if peak > 0.89: out *= 0.89 / peak  # -1 dBFS headroom for the AAC encode
sf.write(HERE / 'public/music-edit.wav', out, sr, subtype='PCM_24')
print(f'{n_out / sr:.3f} s, peak {20 * np.log10(np.abs(out).max()):.2f} dBFS')
