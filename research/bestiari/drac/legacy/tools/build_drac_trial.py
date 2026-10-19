"""The Drac reference trial's music (dev only: drac-lab.html, docs/drac-reference-trial.md). Never writes the game's files.

The candidate form music/drac-trial-form.json goes through build_drac.py's own path (compile_timeline(path) ->
build_events -> render_stems), rendered twice:
  festiu  - the game's current arrangement (lead, bell, pad, stabs, arpeggio, bass, drums, percussion, taiko) on the
            new form and tempo map: what the form and tempo change alone do. The mix lines are main()'s, copied.
  austera - the score's melody alone on one soft reed-like voice that stops at its written note-off (a 40 ms breath
            of release, no bell), over a timbal and bass drum on the beat. No added harmony, no taiko.
Neither is the xeremiers' real sound, and nothing here has been listened to: that is Marc's call.
Run from the repo root:
  uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/build_drac_trial.py
Writes public/music/drac-trial-v1-{austera,festiu}.mp3, public/music/drac-trial-v1.json (their ?v= hashed URLs, the
form revision and its beat grid) and tmp/audio/drac-trial-v1-*.wav.
"""
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

import build_drac as base
from synth import SR, hz, lp, put, additive, adsr, perc, swell, rng

ROOT = base.ROOT
FORM = ROOT / 'music/drac-trial-form.json'
NAME = 'drac-trial-v1'
VARIANTS = ('austera', 'festiu')
COMMAND = 'uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/build_drac_trial.py'


# ------------------------------------------------------------------ shared: the room and the master (build_drac.main's)
def reverb_ir():
    it = np.arange(int(1.6 * SR)) / SR
    ir = np.stack([lp(rng.standard_normal(len(it)), 0.6) * np.exp(-it / 0.35) for _ in range(2)], 1)
    ir[: int(0.02 * SR)] = 0
    ir /= np.abs(ir).sum(0) ** 0.5 * 12
    return ir


def master(dry, send, ir, N):
    wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
    mix = dry + wet * 0.5
    mix /= np.abs(mix).max() / 0.98
    return np.tanh(mix * 1.6) / np.tanh(1.6) * 0.76


# ------------------------------------------------------------------ festiu: the game's arrangement on the trial form
PAN = {'kick': 0, 'snare': 0.05, 'clap': -0.1, 'hat': 0.35, 'ohat': 0.35, 'shaker': 0.55, 'tamb': -0.45, 'cowbell': -0.3,
       'crash': -0.3, 'don': -0.15, 'ka': 0.3, 'tim': 0.1}
BUS = dict(don='taiko', ka='taiko', shaker='perc', tamb='perc', cowbell='perc', tim='taiko')
GAIN = dict(lead=0.36, pad=0.025, stab=0.11, arp=0.15, bell=0.09, bass=0.22, drums=0.45, perc=1.1, taiko=0.5)


def festiu(ev, N, ir):
    stem = base.render_stems(ev, N)
    for kind, lst in ev.hits.items():
        for s, v in lst:
            x = swell(v, ev.span(s, v) / v) if kind == 'swell' else perc(kind, v)
            put(stem[BUS.get(kind, 'drums')], ev.sec(s), x, PAN.get(kind, 0))
    duck = np.ones(N)
    for s, _ in ev.hits['kick']:
        i = int(ev.sec(s) * SR); n = min(int(0.25 * SR), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.35 * np.exp(-np.arange(n) / SR / 0.08))
    for k in ('pad', 'stab', 'bass'): stem[k] *= duck[:, None]
    dry = sum(stem[k] * g for k, g in GAIN.items())
    send = stem['lead'] * 0.30 + stem['pad'] * 0.03 + stem['stab'] * 0.04 + stem['arp'] * 0.05 + stem['bell'] * 0.05 \
           + stem['drums'] * 0.08 + stem['perc'] * 0.06
    return master(dry, send, ir, N)


# ------------------------------------------------------------------ austera: melody + timbal
REL = 0.04   # s the reed sounds past its written note-off: a breath of legato, never an old pitch held over the next


def reed(f, dur, vib):
    """A soft double-reed colour: every harmonic, gently tilted and darkening, then a one-pole lowpass (no buzz)."""
    w, t = additive(f, dur, 1.05, 0.6, 0.0, vib, 6000)
    return lp(w, 0.35), t


def render_austera_lead(ev, N):
    out = np.zeros((N, 2))
    for s, d, m in ev.melody:
        dur = max(0.05, ev.span(s, d) - 0.012)
        total = dur + REL
        w, t = reed(hz(m), total, 0.003 if d >= 1 else 0.0)
        put(out, ev.sec(s), w * adsr(t, total, 0.012, REL, 0.85, 0.3), 0.0)
    return out


# 8 sixteenth steps a 2/4 bar: x full, o soft. Calm phrases mark the beat, the walks and turns fill the off-beats.
TIM = {'calm': 'x...o.o.', 'walk': 'x.o.x.o.', 'turns': 'x.oxx.o.'}
BOMBO = {'calm': 'x.......', 'walk': 'x...x...', 'turns': 'x...x...'}
STYLE = {'A2': 'calm', 'B': 'calm', 'C': 'calm', 'D': 'walk', 'E': 'calm', 'A3': 'calm', 'B3': 'calm', 'C3': 'calm',
         'D3': 'walk', 'E3': 'turns', 'coda': 'walk'}
COUNT_IN = ['x...x...', 'x...x...', 'x...x.o.', 'x...x.o.', 'x.o.x.o.', '..o.oxxx']   # the 12-beat intro, the last into the tune


def austera_hits(ev):
    hits = {'tim': [], 'don': []}

    def pattern(b0, steps, kind, g):
        for i, c in enumerate(steps):
            b = b0 + i / 4
            if c != '.' and b < ev.END: hits[kind].append((b, g * (1.0 if c == 'x' else 0.55)))

    for i, steps in enumerate(COUNT_IN): pattern(2 * i, steps, 'tim', 0.45 + 0.06 * i)
    for bar, s, style in ev.layout[1:]:                 # the pickup bar is the count-in's last
        kind = STYLE[style]
        pattern(s, TIM[kind], 'tim', 0.7)
        pattern(s, BOMBO[kind], 'don', 0.45)
    for a, b in ev.BALLOONS:                            # only the closing roll: the mid-song one is a game GLOBUS
        if b != ev.END: continue
        n = int((b - a) * 4)
        for i in range(n): hits['tim'].append((a + i / 4, 0.35 + 0.55 * i / n))
    hits['don'].append((ev.END, 1.0)); hits['tim'].append((ev.END, 1.0))
    return hits


def austera(ev, N, ir):
    lead, drum = render_austera_lead(ev, N), np.zeros((N, 2))
    for kind, lst in austera_hits(ev).items():
        for s, v in lst: put(drum, ev.sec(s), perc(kind, v), 0.15 if kind == 'tim' else -0.1)
    return master(lead * 0.5 + drum * 0.55, lead * 0.3 + drum * 0.08, ir, N)


# ------------------------------------------------------------------ files
def write(variant, mix):
    assert variant in VARIANTS, variant
    wav, mp3 = ROOT / f'tmp/audio/{NAME}-{variant}.wav', ROOT / f'public/music/{NAME}-{variant}.mp3'
    assert mp3.name.startswith('drac-trial-'), 'the trial never writes the game\'s files'
    wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(wav, mix.astype(np.float32), SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '160k', str(mp3)], check=True)
    return f"music/{mp3.name}?v={hashlib.sha1(mp3.read_bytes()).hexdigest()[:10]}"


def main():
    form, tl = base.compile_timeline(FORM)
    ev = base.build_events(tl)
    END, sec = ev.END, ev.sec
    N = int(max(sec(END) + 3.5, sec(END + 4) + 1.4) * SR)     # build_drac.main's length: the pad rings to END + 4
    assert all(sec(s + d) + 0.12 < N / SR - 1 for s, d, _ in ev.melody + ev.bass), 'no note cut off'
    ir = reverb_ir()
    audio = {'austera': write('austera', austera(ev, N, ir)), 'festiu': write('festiu', festiu(ev, N, ir))}
    meta = {'version': 1, 'form': 'music/drac-trial-form.json', 'revision': tl['revision'], 'end': END,
            'endSec': tl['beats'][END], 'finale': tl['finale'], 'arrangement': tl['arrangement'], 'beats': tl['beats'],
            'duration': {k: N / SR for k in audio}, 'audio': audio, 'command': COMMAND}
    with open(ROOT / f'public/music/{NAME}.json', 'w') as fh: json.dump(meta, fh, separators=(',', ':'))
    print('drac trial:', round(N / SR, 3), 's, final hit', round(tl['beats'][END], 3), 's at beat', END, '|', ', '.join(audio.values()))


if __name__ == '__main__':
    main()
