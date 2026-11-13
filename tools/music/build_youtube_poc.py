"""POC: the Mulassa dances a song played by a YouTube embed (?yt mode, src/platform/youtube.js). Local only, never release.

Reads the song's audio and its drums stem (analysis only: none of it is kept in the repo or served; the game plays the
embed) and writes src/song-figaflawas.json (the Mulassa's song with these beats, chart and dance, plus song.youtube; ?exp=figaflawas).
The beat is the kick's own pulse (tracked on the kick alone: on the whole mix the tracker locked onto 1.5x the kick's period,
so every other beat fell between two kicks). Notes sit on that beat and its eighths: the kick is DON, the snare / claps KA;
each level takes the strongest hits that fit its shortest gap (tests/game/chart-playable.mjs) up to the Mulassa's own
density in notes per second, and keeps the easier one's notes.
Run: uv run --python 3.11 --with librosa --with scipy --with soundfile python tools/music/build_youtube_poc.py \
       <song audio> <no_vocals.wav> <youtube-id> [clicks.mp3]
  (stem: demucs -d cpu -n htdemucs --two-stems=vocals <song audio>; clicks.mp3: the song with a click on every DIFÍCIL note)
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, librosa
from scipy.signal import savgol_filter

ROOT = Path(__file__).resolve().parents[2]
SR, HOP = 22050, 128
audio, band, yt_id = sys.argv[1:4]
y, _ = librosa.load(audio, sr=SR, mono=True)
dur = len(y) / SR
dp = librosa.effects.percussive(librosa.load(band, sr=SR, mono=True)[0])
fr = lambda t, n: min(n - 1, max(0, int(t * SR / HOP)))

kick = librosa.onset.onset_strength(y=dp, sr=SR, hop_length=HOP, fmax=150, n_mels=32)
snare = librosa.onset.onset_strength(y=dp, sr=SR, hop_length=HOP, fmin=1500, fmax=8000)
_, bf = librosa.beat.beat_track(onset_envelope=kick, sr=SR, hop_length=HOP, start_bpm=170, tightness=400)
B = savgol_filter(librosa.frames_to_time(bf, sr=SR, hop_length=HOP), 9, 1)  # the tracker's jitter off, drifts kept
kicks = librosa.onset.onset_detect(onset_envelope=kick, sr=SR, hop_length=HOP, units='time')
B += np.median([kicks[np.argmin(abs(kicks - b))] - b for b in B])  # onto the kicks themselves
BEAT = float(np.median(np.diff(B)))
# no kick in the intro: it has its own, slightly slower pulse (~165 bpm), tracked on the whole mix up to the first kick;
# no kick in the outro either: the kick's pulse carries on to the end of the music
cut = int(B[0] * SR / HOP)
_, ib = librosa.beat.beat_track(onset_envelope=librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)[:cut], sr=SR, hop_length=HOP, start_bpm=165, tightness=300)
intro = librosa.frames_to_time(ib, sr=SR, hop_length=HOP)
intro = intro[intro < B[0] - 0.8 * BEAT]
B = np.concatenate([intro, B, B[-1] + BEAT * np.arange(1, int((dur - 1 - B[-1]) / BEAT))])
B = B[B > 0.05]  # the song clock begins at 0

rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
loud = np.array([rms[fr(B[i], len(rms)):fr(B[i + 1], len(rms))].mean() for i in range(len(B) - 1)])
loud /= np.percentile(loud, 90)
FIRST = 8 + int(np.argmax(loud > 0.4))  # a few beats of music before the first tap
ROLL = len(B) - 17  # the balloon: the last 16 beats (about 5.6 s)
END = ROLL + 16

lowe, highe = kick / np.percentile(kick, 98), snare / np.percentile(snare, 98)
peak = lambda e, t: e[max(0, fr(t, len(e)) - 3):fr(t, len(e)) + 4].max()  # a hit within ±17 ms
slots = []
for i in range(FIRST, ROLL):
    for half in (0, 1):
        t = B[i] + half * (B[i + 1] - B[i]) / 2
        lo, hi = peak(lowe, t), peak(highe, t)
        slots.append(dict(t=t, i=i, half=half, s=min(1.5, max(lo, hi)) * (1 if half == 0 else 0.85), side='don' if lo >= hi else 'ka'))

for w in range(FIRST, ROLL, 16):  # against its own phrase (16 beats): a quiet stretch still gets its notes
    group = [n for n in slots if w <= n['i'] < w + 16]
    top = max(n['s'] for n in group) or 1
    for n in group: n['s'] /= top
GAP, PER_S = (0.39, 0.39, 0.19), (0.95, 1.3, 2.7)  # shortest gap; notes per second (near the Mulassa's 1.24, 1.52, 2.83: here
# a beat is 0.35 s, under the 0.39 gap, so FÀCIL and NORMAL can only take every other beat at most, 1.42/s)
level = {}
for lv in range(3):  # each phrase (16 beats) its share of notes, its strongest hits first
  taken = sorted(level)
  for w in range(FIRST, ROLL, 16):
    group = [n for n in slots if w <= n['i'] < w + 16]
    want = round(PER_S[lv] * (group[-1]['t'] - group[0]['t'] + BEAT / 2)) - sum(1 for t in taken if group[0]['t'] <= t <= group[-1]['t'])
    for n in sorted(group, key=lambda n: -n['s']):
        if want <= 0: break
        t = n['t']
        if t in level or n['s'] < 0.2 or (lv < 2 and n['half']): continue  # FÀCIL and NORMAL on the beat only
        k = np.searchsorted(taken, t)
        if (k and t - taken[k - 1] < GAP[lv] - 1e-3) or (k < len(taken) and taken[k] - t < GAP[lv] - 1e-3): continue
        level[t] = lv
        taken.insert(k, t)
        want -= 1
side = {n['t']: n['side'] for n in slots}
for lv in range(3):  # never 5 on the same side in a row
    run, prev = 0, None
    for t in sorted(t for t, l in level.items() if l <= lv):
        run = run + 1 if side[t] == prev else 1
        if run > 4: side[t] = 'ka' if side[t] == 'don' else 'don'; run = 1
        prev = side[t]
big = {B[i] for i in range(FIRST + 16, ROLL, 16) if loud[i:i + 16].mean() > 1.15 * loud[i - 16:i].mean() and level.get(B[i]) == 0}
notes = [[round(t, 4), side[t], level[t], int(t in big), 0] for t in sorted(level)]
notes.append([round(B[END], 4), 'don', 0, 1, 0])

for lv in range(3):  # the same check as tests/game/chart-playable.mjs
    ts = [n[0] for n in notes if n[2] <= lv]
    assert min(np.diff(ts)) >= GAP[lv] - 1e-3, lv

def style(i):  # the Mulassa's dance styles by loudness, a phrase (8 beats) at a time
    r = loud[i:i + 8].mean()
    return 'A1' if r < 0.55 else 'A2' if r < 0.75 else 'B' if r < 0.9 else 'C'
dance = [[0, 'intro1'], [FIRST - 4, 'pickup']]
for i in range(FIRST, ROLL, 8):
    if style(i) != dance[-1][1]: dance.append([i, style(i)])
dance.append([ROLL, 'roll'])

song_path = ROOT / 'src/song-mulassa.json'
song = json.loads(song_path.read_text())
B = B[:END + 1]
end_t = round(B[END], 4)
song.update({
    'bpm': round(60 / BEAT, 1), 'duration': round(dur, 3), 'end': end_t, 'tail': round(end_t + 2.5, 4),
    'finale': round(B[ROLL - 32], 4), 'sections': [[round(B[0], 4), 'A']], 'beats': [round(b, 4) for b in B], 'notes': notes,
    'balloonBeats': [[ROLL, END]], 'arrangement': dance,
    'ref': [[notes[0][0], 0], [round(B[ROLL], 4), 161.3], [round(B[ROLL] + 3.9, 4), 166.2]], 'refEnd': 166.2,
    'youtube': yt_id,
})
(ROOT / 'src/song-figaflawas.json').write_text(json.dumps(song, separators=(',', ':')))  # the experiment's own song: ?exp= picks it
span = B[ROLL] - B[FIRST]
print(f'join: intro beats {len(intro)}, gap at the join {B[len(intro)] - B[len(intro) - 1]:.3f} s')
print(f'{len(B)} beats, bpm {song["bpm"]}, beat {BEAT:.4f} s (min {np.diff(B).min():.3f}, max {np.diff(B).max():.3f}), first tap {notes[0][0]:.2f} s, big {len(big)}')
for lv, name in enumerate(('FÀCIL', 'NORMAL', 'DIFÍCIL')):
    m = [n for n in notes if n[2] <= lv]
    print(f'{name}: {len(m)} notes, {len(m) / span:.2f}/s, ka {sum(n[1] == "ka" for n in m) / len(m):.0%}, longest gap {max(b[0] - a[0] for a, b in zip(m, m[1:])):.1f} s')

if len(sys.argv) > 4:  # listening check: DON a low click, KA a high one, on every DIFÍCIL note (FÀCIL ones louder)
    mix = y * 0.6
    for t, kind, lv, b, _ in notes:
        n = np.arange(int(0.04 * SR))
        click = np.sin(2 * np.pi * (900 if kind == 'don' else 2400) * n / SR) * np.exp(-n / (0.008 * SR)) * (0.5 if lv == 0 else 0.35)
        s = int(t * SR)
        mix[s:s + len(click)] += click[:max(0, len(mix) - s)]
    import soundfile as sf
    wav = Path(sys.argv[4]).with_suffix('.wav')
    sf.write(wav, mix / max(1, np.abs(mix).max()), SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-b:a', '160k', sys.argv[4]], check=True)
    wav.unlink()
