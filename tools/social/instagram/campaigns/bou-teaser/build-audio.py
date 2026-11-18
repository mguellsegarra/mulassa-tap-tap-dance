"""Teaser A2 audio: an underwater kick at the song's opening tempo that surfaces with each shot, then the song's own
intro bar and its first two melody bars, and a last muffled kick under the end card. Writes only under output/instagram/bou-teaser/ (the game's music is read, never written).
Run: uv run --python 3.11 --with numpy --with scipy --with soundfile tools/social/instagram/campaigns/bou-teaser/build-audio.py"""
from pathlib import Path
import sys, json, subprocess, tempfile, zipfile
import numpy as np
import soundfile as sf
ROOT = Path(__file__).resolve().parents[5]; OUT = ROOT/'output/instagram/bou-teaser'; OUT.mkdir(parents=True, exist_ok=True)
# the Bou's own drum voices: the frozen synth of its approved arrangement (as tools/music/build_bou_mobile.py reads it)
TMP = tempfile.TemporaryDirectory(prefix='bou-teaser-'); SRC = Path(TMP.name)
with zipfile.ZipFile(ROOT/'music/bou-tradicional/source-v13.zip') as z: z.extractall(SRC)
sys.path[:0] = [str(SRC/'tools/bou'), str(SRC/'tools')]
import score_groove as r
from synth import SR, put, perc
song = json.loads((ROOT/'src/song-bou.json').read_text()); beats = song['beats']
B = beats[1] - beats[0]  # the opening's beat, from the grid
assert all(abs(beats[i+1] - beats[i] - B) < 1e-6 for i in range(16)), 'opening is not steady'
BAR = 4*B
# timeline (s): 1 bar black, 3 x (text bar, shot bar), the song's bar before the melody (title), 2 melody bars (feet), end card
V = sys.argv[1] if len(sys.argv) > 1 else 'a'  # a: three swells; b: one steady surfacing; c: short, two swells
P = 2 if V == 'c' else 3; S = (1 + 2*P)*BAR
T = dict(shots=[((2 + 2*i)*BAR, (3 + 2*i)*BAR) for i in range(P)], song=S, feet=S + BAR, card=S + 3*BAR, end=S + 3*BAR + 3*B + 2.4)
SONG0 = beats[8] - BAR  # the song second heard at T['song']: the bar before the melody
N = round(T['end']*SR); dry = np.zeros((N, 2), np.float32)
kick = r._CLUB_KICK
nb = round(T['song']/B)
for i in range(nb):
    at = i*B; bar = i//4
    put(dry, at, kick*(.5 + .04*bar))
    if bar >= 3: put(dry, at + B/2, perc('hat', .10 + .015*bar), .12)       # from the second phrase
    if bar >= 2*P - 1 and i % 2: put(dry, at, perc('clap', .2), -.12)       # the last
for k in range(4): put(dry, T['card'] + k*B, kick*.8)  # one for each line of the end card
# the water: a low-pass whose cutoff follows the picture (shut on black, opening with each shot, a little more each time)
LOW = 240.0  # shut: still heard on a phone's speaker (110 Hz was not)
cut = np.full(N, LOW); t = np.arange(N)/SR
if V == 'b': cut = LOW*(3200/LOW)**np.clip((t - BAR)/(S - BAR), 0, 1)**1.6
else:
    for (a, b), top in zip(T['shots'], (600, 1300, 3200)[-P:]):
        u = np.clip((t - a)/.45, 0, 1)*np.clip((b - t)/.55, 0, 1); cut = np.maximum(cut, LOW*(top/LOW)**(u*u*(3 - 2*u)))
cut[t >= T['card']] = LOW
wet = np.zeros_like(dry); g = 1 - np.exp(-2*np.pi*cut/SR)
for ch in range(2):
    x = dry[:, ch].astype(np.float64); a1 = a2 = a3 = 0.0; out = np.empty(N)
    for n in range(N):  # three one-pole stages (18 dB/oct), cutoff per sample
        k = g[n]; a1 += k*(x[n] - a1); a2 += k*(a1 - a2); a3 += k*(a2 - a3); out[n] = a3
    wet[:, ch] = out
wet *= 1.0  # under the song that follows: the melody is the payoff
# a slow tail on the last kick, as it sinks
last = T['card'] + 3*B; tail = round(last*SR); wet[tail:] *= np.exp(-(t[tail:] - last)/1.1)[:, None]
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(ROOT/'public/music/bou-tradicional-v14-mobile.mp3'), str(SRC/'song.wav')], check=True)
orig, sr = sf.read(SRC/'song.wav', dtype='float32'); assert sr == SR
clip = orig[round(SONG0*SR):round((SONG0 + T['card'] - T['song'])*SR)].copy(); f = round(.012*SR)
clip[:f] *= np.linspace(0, 1, f)[:, None]; f2 = round(.06*SR); clip[-f2:] *= np.linspace(1, 0, f2)[:, None]
clip = np.tanh(clip*2.1/.95)*.95  # the song's quiet opening brought up to the teaser's level, soft-limited
mix = wet.copy(); at = round(T['song']*SR); mix[at:at + len(clip)] += clip
mix[:at] *= np.clip((T['song'] - t[:at])/.03, 0, 1)[:, None]  # the kick lets go as the song comes in
peak = float(abs(mix).max()); mix *= min(1, .91/peak)
LEAD = 3*B  # the owner: it starts sooner, one beat of black instead of a bar
mix = mix[round(LEAD*SR):]
T = {k: ([(a - LEAD, b - LEAD) for a, b in v] if k == 'shots' else v - LEAD) for k, v in T.items()}
sf.write(OUT/f'musica-{V}.wav', mix, SR, subtype='PCM_24')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(OUT/f'musica-{V}.wav'), '-c:a', 'aac', '-b:a', '256k', str(OUT/f'musica-{V}.m4a')], check=True)
(OUT/f'timeline-{V}.json').write_text(json.dumps({**T, 'beat': B, 'bar': BAR, 'song0': SONG0, 'peak': peak}, indent=2))
print(json.dumps(T), SONG0, peak)
