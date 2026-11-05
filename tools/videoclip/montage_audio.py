"""Videoclip export (dev only): a montage proposal's sound, its pieces of media/mix.wav back to back with the tool's
30 ms equal-power crossfades, and the song fading out over edit.json's musicFade before the song's own end.
montage_audio.py <proposal.json> <out.wav>"""
import json, os, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
p = json.load(open(sys.argv[1])); edit = json.load(open(os.path.join(HERE, 'edit.json'))); clip = json.load(open(os.path.join(HERE, 'clip.json')))
x, sr = sf.read(os.path.join(HERE, 'media', 'mix.wav'), dtype='float32', always_2d=True)
song_end, mf = clip['duration'], edit.get('musicFade', 1.0)
t = np.arange(len(x)) / sr  # the song fades out before its end, as in the full video (and silent past it: the end card's seconds)
x = x * (np.clip((song_end - t) / mf, 0, 1) ** 2)[:, None]
n = int(.03 * sr); fade = np.sin(np.linspace(0, np.pi / 2, n))[:, None]
out = np.zeros((0, 2), np.float32)
for s in p['segments']:
    a, b = int(s['from'] * sr), int(s['to'] * sr)
    piece = np.zeros((b - a, 2), np.float32); have = x[a:min(b, len(x))]; piece[:len(have)] = have  # (past the song: silence)
    if len(out) >= n: out[-n:] = out[-n:] * fade[::-1] + piece[:n] * fade; piece = piece[n:]
    out = np.concatenate([out, piece])
import glob
voice_f = os.path.join(HERE, 'media', 'stems-cut', '0 Lead Vocals.wav')
if os.path.exists(voice_f) and any(o['type'] == 'shout' for o in p.get('overlays', [])):  # laid shouts (montage.js shoutLen, STEM_LAG)
    v, _ = sf.read(voice_f, dtype='float32', always_2d=True); beat = 60 / clip['bpm']
    for o in (o for o in p['overlays'] if o['type'] == 'shout'):
        i = o['index']; d = clip.get('shoutLens', [])[i] + edit['texts'][i].get('after', 1.5) * beat + .05
        src = v[int((clip['shouts'][i] + .023 - .05) * sr):][:int(d * sr)]; at = int((o['at'] - .05) * sr)
        for k in range(len(src)): out[(at + k) % len(out)] += src[k]  # (wraps round in a loop)
if p.get('loop'):  # the wrap: the turn's tail blends into what leads into its start (montage.js loopBuffer)
    f0 = int(p['segments'][0]['from'] * sr); out[-n:] = out[-n:] * fade[::-1] + x[f0 - n:f0] * fade
card = next((o for o in p.get('overlays', []) if o['type'] == 'endcard'), None)
u = np.arange(len(out)) / sr
if card and not card.get('music'):  # under the end card the music fades out (montage.js CARD_FADE), unless it keeps playing
    out *= (np.clip(1 - (u - card['at']) / 4.5, 0, 1) ** 2)[:, None]
fin, fout = (p.get('fade') or {}).get('in', 0), (p.get('fade') or {}).get('out', 0)  # the proposal's own fades, as the tool plays them
if fin: out *= np.clip(u / fin, 0, 1)[:, None]
if fout: out *= np.clip((len(out) / sr - u) / fout, 0, 1)[:, None]
sf.write(sys.argv[2], out, sr, subtype='FLOAT')
print(f'{len(out) / sr:.2f} s')
