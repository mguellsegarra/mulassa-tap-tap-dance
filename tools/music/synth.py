"""Small synthesis kit for the beast arrangements (build_drac.py): additive tones, struck bells, brass, a drum kit.
Same sounds as build_taiko.py's (which keeps its own copy so the Mulassa audio stays bit-identical)."""
import numpy as np
from scipy.signal import lfilter

SR = 44100
rng = np.random.default_rng(7)
noise = rng.standard_normal(SR * 3)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
lp = lambda x, a: lfilter([1 - a], [1, -a], x)      # one-pole lowpass
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi_of(name):
    return 12 * (int(name[-1]) + 1) + PC[name[0]] + name.count('#') - name.count('b')


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


def partials(f, dur, parts):
    t = np.arange(int(dur * SR)) / SR
    out = sum(a * np.exp(-t / d) * np.sin(2 * np.pi * f * r * t) for r, a, d in parts if f * r < 16000)
    return out * np.minimum(1, t / 0.002)


glock = lambda f, dur=1.4: partials(f, dur, [(1, 1, 0.8), (2.76, 0.3, 0.22), (5.40, 0.12, 0.08), (8.93, 0.05, 0.04)])


def note_gate(wave, duration, release=0.015):
    """End a melodic voice at its written note-off, with a short click-free release.

    Resonant samples must not keep earlier pitches sounding over the next melody note.
    Reverb is mixed separately and remains free to decay.
    """
    n = min(len(wave), max(1, int(round(duration * SR))))
    out = wave[:n].copy()
    fade = min(n, max(2, int(round(release * SR))))
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def brass(f, dur, detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    scoop = 1 - 0.012 * np.exp(-t / 0.03)
    ph = 2 * np.pi * f * 2 ** (detune / 1200) * np.cumsum(scoop) / SR
    tilt = 2.6 - 1.2 * (1 - np.exp(-t / 0.035)) * np.exp(-t / 0.3)
    out = sum(np.exp(-tilt * np.log(n)) * np.sin(n * ph) for n in range(1, 11) if n * f < 5000)
    return out, t


def nylon(f, dur, pos=0.18, bright=1.0):
    t = np.arange(int(dur * SR)) / SR
    out = sum(n ** -1.9 * abs(np.sin(np.pi * n * pos)) * np.exp(-t * (2.0 + 1.2 * bright * (n - 1) ** 1.25))
              * np.sin(2 * np.pi * f * n * t) for n in range(1, 10) if f * n < 3500)
    return out * np.minimum(1, t / 0.012) * np.clip((dur - t) / 0.1, 0, 1)


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
        elif kind == 'shaker':
            x = 0.2 * lp(nz - lp(nz, 0.55), 0.3) * np.minimum(1, t / 0.008) * np.exp(-t / 0.035)
        elif kind == 'tamb':
            ring = sum(np.sin(2 * np.pi * fq * t) for fq in (6200, 7900, 9400))
            x = 0.16 * ((nz - lp(nz, 0.35)) + 0.25 * ring * nz) * np.exp(-t / 0.07)
        elif kind == 'cowbell':
            x = 0.22 * (np.sin(2 * np.pi * 587 * t) + 0.7 * np.sin(2 * np.pi * 845 * t)) \
                * (0.6 * np.exp(-t / 0.012) + 0.4 * np.exp(-t / 0.11))
        elif kind == 'crash':
            x = 0.25 * (nz - lp(nz, 0.3)) * np.exp(-t / 0.9)
        elif kind == 'don':   # big barrel drum: pitched thump with a skin slap
            f = 72 + 70 * np.exp(-t / 0.05)
            x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.33) + 0.35 * lp(nz, 0.8) * np.exp(-t / 0.03)
        elif kind == 'ka':    # rim: wooden click
            x = 0.45 * (np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.018) + 0.5 * (lp(nz, 0.2) - lp(nz, 0.7)) * np.exp(-t / 0.012))
        elif kind == 'tim':   # timbal: the dry high drum that plays with the gralles
            f = 150 + 90 * np.exp(-t / 0.03)
            x = 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) + 0.3 * (lp(nz, 0.5) - lp(nz, 0.9)) * np.exp(-t / 0.02)
        PERC[kind] = x
    return v * PERC[kind]


def swell(beats, spb):
    t = np.arange(int(beats * spb * SR)) / SR
    nz = np.resize(noise, len(t))
    x = nz - lp(nz, 0.45)
    return 0.3 * lp(x, 0.2) * (t / t[-1]) ** 2.5
