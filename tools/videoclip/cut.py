"""Videoclip (dev only): the song shortened, its stems and its mix cut at the same downbeats, for analyze.py to read.

uv run --python 3.11 --with numpy --with soundfile python -I tools/videoclip/cut.py <stems dir> <mix> <out dir>

Removes edit.json's songCuts ([from, to] s of the full song, each on a downbeat where the music before `to` sounds like
the music before `from`: picked by comparing chroma and MFCC round every 4-bar point), joining each with a 30 ms
equal-power crossfade so no click is heard. Writes <out dir>/*.wav (the stems) and <out dir>/mix.wav.
"""
import json, os, sys, glob
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
stems_dir, mix_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
cuts = sorted(json.load(open(os.path.join(HERE, 'edit.json')))['songCuts'])
assert all(a < b for a, b in cuts) and all(b <= c for (_, b), (c, _) in zip(cuts, cuts[1:])), 'songCuts must be ordered spans'
XF = .03

def cut(x, sr):
    n = int(XF * sr); fade = np.sin(np.linspace(0, np.pi / 2, n))[:, None]  # equal power
    keep, at = [], 0
    for a, b in cuts:
        ia, ib = int(a * sr), int(b * sr)
        keep.append(x[at:ia - n]); keep.append(x[ia - n:ia] * fade[::-1] + x[ib - n:ib] * fade); at = ib
    keep.append(x[at:])
    return np.concatenate(keep)

os.makedirs(out, exist_ok=True)
full = sf.info(mix_path).frames  # (Suno trims a stem after its last sound: pad each to the song's length before cutting)
for f in sorted(glob.glob(os.path.join(stems_dir, '*.mp3')) + glob.glob(os.path.join(stems_dir, '*.wav'))) + [mix_path]:
    x, sr = sf.read(f, dtype='float32', always_2d=True)
    x = np.pad(x, ((0, max(0, full - len(x))), (0, 0)))
    name = 'mix.wav' if f == mix_path else os.path.splitext(os.path.basename(f))[0] + '.wav'
    sf.write(os.path.join(out, name), cut(x, sr), sr, subtype='FLOAT')
    if f == mix_path: print(f'{len(x) / sr:.2f} s -> {len(cut(x, sr)) / sr:.2f} s')
