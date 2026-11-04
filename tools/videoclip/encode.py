"""Videoclip export (dev only): numbered JPEG frames + the song's span -> an H.264/AAC MP4 (render.mjs runs it).
encode.py <frames dir> <mix.wav> <from s> <to s> <fps> <out.mp4> [ss] [crf] [h264|hevc]: frames drawn ss times larger come down
with Lanczos. A whole-song export opens on LEAD s of black and silence and fades in from it, and closes fading the
picture to black and the music out (the owner: it began and ended too abruptly)."""
import sys, os, glob
import av, numpy as np, soundfile as sf
from fractions import Fraction

frames_dir, wav, t0, t1, fps, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
ss, crf = int(sys.argv[7]) if len(sys.argv) > 7 else 1, sys.argv[8] if len(sys.argv) > 8 else '19'
hevc = len(sys.argv) > 9 and sys.argv[9] == 'hevc'
tail = int(sys.argv[10]) if len(sys.argv) > 10 else 0  # end-card frames after the song's: silent, outside its fades  # H.265: about half the size at the same quality (YouTube, Instagram and Apple play it)
files = sorted(glob.glob(os.path.join(frames_dir, '*.jpg')))
assert files, 'no frames'
first = av.open(files[0]).decode(video=0).__next__()
c = av.open(out, 'w', options={'movflags': '+faststart'})  # (the index first: a browser plays it while it loads)
v = c.add_stream('libx265' if hevc else 'libx264', rate=fps)
v.width, v.height, v.pix_fmt = first.width // ss // 2 * 2, first.height // ss // 2 * 2, 'yuv420p'
v.options = {'crf': crf, 'preset': 'slow'} if hevc else {'crf': crf, 'preset': 'slow', 'tune': 'animation', 'profile': 'high'}  # (x264: flat colours and hard edges, animation)
if hevc: v.codec_tag = 'hvc1'  # (the tag Apple's players need for H.265 in MP4)
import json
MUSIC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'edit.json'))).get('musicFade', 1.0)  # (1 s cut off audibly into the end card)
loop = os.environ.get('VIDEOCLIP_LOOP') == '1'  # (a perfect loop: no lead-in or fades, it replays seamlessly)
LEAD, FADE_IN, FADE_OUT, MUSIC_OUT = (2.0, 1.5, 2.0, MUSIC) if t0 == 0 and not loop else (0, 0, 0, 0)  # (s; a test span: none)
audio, sr = sf.read(wav, dtype='float32', always_2d=True)
audio = audio[int(t0 * sr):int(t1 * sr)]
fade = 0 if loop else min(len(audio), int(sr * .05))  # 50 ms fades: a cut on a bar should not click (a loop: none, it joins itself)
if fade: audio[:fade] *= np.linspace(0, 1, fade)[:, None]
out_n = max(fade, int(sr * MUSIC_OUT))
if out_n: audio[len(audio) - out_n:] *= np.linspace(1, 0, out_n)[:, None] ** 2
audio = np.concatenate([np.zeros((int(LEAD * sr), 2), np.float32), audio, np.zeros((int(tail / fps * sr), 2), np.float32)])
s = c.add_stream('aac', rate=sr); s.layout = 'stereo'; s.bit_rate = 256000
lead, n = int(LEAD * fps), len(files) - tail
black = av.VideoFrame.from_ndarray(np.zeros((v.height, v.width, 3), np.uint8), format='rgb24').reformat(format='yuv420p')
def frames():
    for _ in range(lead): yield black
    for i, f in enumerate(files):
        img = av.open(f).decode(video=0).__next__().reformat(width=v.width, height=v.height, format='rgb24', interpolation='LANCZOS')
        k = 1 if i >= n else min(1, (i + 1) / (FADE_IN * fps) if FADE_IN else 1, (n - i) / (FADE_OUT * fps) if FADE_OUT else 1)
        if k < 1: img = av.VideoFrame.from_ndarray((img.to_ndarray() * k).astype(np.uint8), format='rgb24')
        yield img.reformat(format='yuv420p')
for i, img in enumerate(frames()):
    img.pts, img.time_base = i, Fraction(1, fps)  # (without them every frame was at 0 s: players showed one frame)
    img.pict_type = av.video.frame.PictureType.NONE  # (a decoded JPEG says 'I': the encoder made every frame a keyframe, 641 MB)
    for p in v.encode(img): c.mux(p)
for p in v.encode(): c.mux(p)
step, pts = 1024, 0
for i in range(0, len(audio), step):
    chunk = np.ascontiguousarray(audio[i:i + step].T)
    fr = av.AudioFrame.from_ndarray(chunk, format='fltp', layout='stereo'); fr.sample_rate = sr; fr.pts = pts; pts += chunk.shape[1]
    for p in s.encode(fr): c.mux(p)
for p in s.encode(): c.mux(p)
c.close()
