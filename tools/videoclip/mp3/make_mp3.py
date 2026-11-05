# The YouTube video's sound as a tagged MP3 (dev only): uv run --with av --with numpy --with mutagen python -I make_mp3.py
import av, numpy as np
from pathlib import Path
from mutagen.id3 import ID3, TIT2, TPE1, TPE2, TALB, TRCK, TDRC, TCON, COMM, WOAR, APIC
HERE = Path(__file__).parent
SRC, OUT = HERE.parent / 'media/mulassa-videoclip-16x9-opus-b-youtube.mp4', HERE / 'mulassa-guapa.mp3'
c = av.open(str(SRC)); s = c.streams.audio[0]; sr = s.rate
x = np.concatenate([f.to_ndarray() for f in c.decode(s)], axis=1)  # planar float: (channels, n)
lvl = np.abs(x).max(0); on = np.nonzero(lvl > 10 ** (-60 / 20))[0]  # trim the 2 s lead and the silence after the end card
x = x[:, max(0, on[0] - int(.01 * sr)): on[-1] + int(.05 * sr)]
o = av.open(str(OUT), 'w', format='mp3'); a = o.add_stream('libmp3lame', rate=sr); a.bit_rate = 320_000; a.layout = 'stereo'
fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(x.astype(np.float32)), format='fltp', layout='stereo'); fr.sample_rate = sr
for p in a.encode(fr): o.mux(p)
for p in a.encode(): o.mux(p)
o.close()
t = ID3(); t.delete(str(OUT))  # drop the muxer's own tags (TSSE "Lavf…")
t = ID3()
t.add(TIT2(encoding=3, text='GUAPA!')); t.add(TPE1(encoding=3, text='MULASSA')); t.add(TPE2(encoding=3, text='MULASSA'))
t.add(TALB(encoding=3, text='GUAPA!')); t.add(TRCK(encoding=3, text='1/1')); t.add(TDRC(encoding=3, text='2026')); t.add(TCON(encoding=3, text='Techno'))
t.add(COMM(encoding=3, lang='cat', desc='', text='Fes-la ballar a mulassa.cat')); t.add(WOAR(url='https://mulassa.cat'))
t.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=(HERE / 'portada.jpg').read_bytes()))
t.save(str(OUT), v2_version=3)
print(f'{x.shape[1] / sr:.2f} s', OUT)
