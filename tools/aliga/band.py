"""Àliga orchestration using the unmodified vendored Drac synthesis kit.

Kernel provenance: the Drac synthesis kit, SHA256
223a4180354034a8d2e2816bfa394dffd79d6eabe0654176d6faeb31c07b4547.
Render parameters, bus gains, ducking and hall architecture: build_drac.py.
Only score scheduling, density and dry melody note-off damping are Àliga-specific.
"""
import numpy as np
from scipy.signal import fftconvolve
from synth import SR, hz, additive, adsr, brass, glock, perc, put, lp

GAIN = dict(lead=.36, pad=.025, stab=.11, arp=.15, bell=.09,
            bass=.22, drums=.45, perc=1.1, taiko=.5)
PAN = dict(kick=0, snare=.05, clap=-.1, hat=.35, ohat=.35,
           shaker=.55, tamb=-.45, cowbell=-.3, crash=-.3, don=-.15, ka=.3)
BUS = dict(don='taiko', ka='taiko', shaker='perc', tamb='perc', cowbell='perc')


def safe(score, pitch, at, duration):
    return all((pitch-n['pitch']) % 12 not in (1, 11) for n in score['notes']
               if n['t'] < at+duration-1e-8 and n['t']+n['duration'] > at+1e-8)


def plan(score, harmony):
    events = []
    def event(kind, t, duration, pitch=None, gain=1, pan=0, melody=False):
        events.append(dict(kind=kind, t=t, duration=duration, pitch=pitch,
                           gain=gain, pan=pan, melody=melody))
    for n in score['notes']:
        event('lead', n['t'], n['duration'], n['pitch'], melody=True)
        events[-1]['beats'] = n['beats']
        name = score['bars'][n['bar']]['section']
        if name.startswith(('A2', 'B2', 'A3', 'B3')) or name == 'Coda adaptada':
            event('bell', n['t'], n['duration'], n['pitch']+12,
                  gain=.45 if '2' in name else .8, pan=.25, melody=True)
    for i, bar in enumerate(score['bars']):
        name, at, beats = bar['section'], bar['t'], bar['beats']
        if name == 'Introducció':
            continue
        cycle = int(name[1]) if name[1:2].isdigit() else 3
        q = 60/bar['bpm']
        root, third, fifth = harmony(bar)
        pc = root % 12
        bass_root = 36+pc if pc < 8 else 24+pc
        tones = sorted(55+(p-55)%12 for p in (root, third, fifth))
        def added(kind, t, duration, pitches, gain=1, pan=0):
            for pitch in pitches:
                if safe(score, pitch, t, duration):
                    event(kind, t, duration, pitch, gain, pan)
        # Sustained backing appears only after the first statement. Check the release too.
        if cycle >= 2:
            added('pad', at, beats*q+.4, tones)
        for beat in np.arange(0, beats, 1):
            t = at+beat*q
            added('bass', t, .75*q+.015, [bass_root if beat == 0 else bass_root+7])
            event('kick', t, 1.6, gain=.8 if cycle == 1 else 1)
            event('don' if beat == 0 else 'ka', t, 1.6, gain=.45)
            if beat % 2 == 1:
                event('clap', t, 1.6, gain=.65 if cycle == 1 else 1)
                if cycle >= 2 or name.startswith('B'):
                    event('snare', t, 1.6, gain=.7)
                if cycle >= 2:
                    event('tamb', t, 1.6, gain=.65)
            for half in (0, .5):
                if beat+half >= beats:
                    continue
                event('shaker' if cycle == 1 else 'hat', t+half*q, 1.6,
                      gain=.55 if half == 0 else .8)
            if beat+.5 < beats:
                # First-cycle B answers alternate bars; later statements have full offbeats.
                if cycle >= 2 or (name.startswith('B') and i % 2 == 1):
                    added('stab', t+.5*q, .3, tones+[tones[0]+12])
                if cycle == 3:
                    event('ohat', t+.5*q, 1.6, gain=.5)
                    if i % 2 == 0:
                        event('cowbell', t+.5*q, 1.6, gain=.45)
                # Sparse decorations, not a continuous sixteenth-note carpet.
                if cycle >= 2 and i % 2 == 0:
                    added('arp', t+.5*q, min(.25, .25*q),
                          [72+(tones[int(beat)%3]-72)%12], gain=.65,
                          pan=-.6 if int(beat)%2 else .6)
        next_section = i+1 == len(score['bars']) or score['bars'][i+1]['section'] != name
        if next_section:
            # Short cadential response beneath the intact written melody.
            for k, velocity in enumerate((.35, .45, .55, .7)):
                pos = beats-.5+k*.125
                if pos >= 0:
                    event('snare', at+pos*q, 1.6, gain=velocity)
            event('don', at+max(0, beats-.5)*q, 1.6, gain=.65)
    return events


def damp(wave, duration):
    """Keep the exact kernel; apply the documented dry note-off correction."""
    wave = wave[:round(duration*SR)].copy()
    count = min(len(wave), max(2, round(.015*SR)))
    wave[-count:] *= np.linspace(1, 0, count)
    return wave


def sample(e):
    kind, dur, pitch = e['kind'], e['duration'], e['pitch']
    if pitch is None:
        return [(perc(kind, e['gain']), PAN[kind])]
    f = hz(pitch)
    result = []
    if kind == 'lead':
        sustain = max(.05, dur-.02)
        for det, pan, gain in ((0, 0, 1), (7, -.5, .3), (-7, .5, .3)):
            w, t = additive(f, sustain+.12, 1.15, .35, det,
                            .004 if e.get('beats', 0) >= 2 else 0)
            result.append((damp(w*adsr(t, sustain+.12, .008, .12, .8, .25), dur)*gain, pan))
    elif kind == 'bell':
        result.append((damp(glock(f, max(1.4, dur)), dur), .25))
    elif kind == 'pad':
        for det, pan in ((-9, -.8), (9, .8), (0, 0)):
            w, t = additive(f, dur, 1.9, .8, det)
            result.append((w*adsr(t, dur, .25, .4), pan))
    elif kind == 'stab':
        for det, pan in ((-6, -.35), (6, .35)):
            w, t = brass(f, .3, det)
            result.append((w*adsr(t, .3, .012, .09, .35, .1), pan))
    elif kind == 'arp':
        w, t = additive(f, .25, 1.7, 8)
        result.append((damp(w*np.exp(-t/.07)*.5, dur), e['pan']))
    elif kind == 'bass':
        w, t = additive(f, dur, 1.6, 3)
        result.append(((.8*w+.6*np.sin(2*np.pi*f*t))*adsr(t, dur, .004, .03, .75, .12), 0))
    return [(w*e['gain'], pan) for w, pan in result]


def render(score, events):
    n = int(np.ceil((score['duration']+3.5)*SR))
    stems = {kind: np.zeros((n, 2)) for kind in GAIN}
    for e in events:
        for wave, pan in sample(e):
            put(stems[BUS.get(e['kind'], e['kind'] if e['pitch'] is not None else 'drums')], e['t'], wave, pan)
    duck = np.ones(n)
    for e in events:
        if e['kind'] == 'kick':
            i = int(e['t']*SR); size = min(int(.25*SR), n-i)
            duck[i:i+size] = np.minimum(duck[i:i+size], 1-.35*np.exp(-np.arange(size)/SR/.08))
    for kind in ('pad', 'stab', 'bass'):
        stems[kind] *= duck[:, None]
    dry = sum(stems[k]*g for k, g in GAIN.items())
    it = np.arange(int(1.6*SR))/SR
    rng = np.random.default_rng(7)
    rng.standard_normal(SR*3)  # Same noise draw before the Drac hall impulse.
    ir = np.stack([lp(rng.standard_normal(len(it)), .6)*np.exp(-it/.35) for _ in range(2)], 1)
    ir[:int(.02*SR)] = 0
    ir /= np.abs(ir).sum(0)**.5*12
    send = sum(stems[k]*g for k, g in dict(lead=.30, pad=.03, stab=.04, arp=.05, bell=.05, drums=.08, perc=.06).items())
    wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:n] for c in range(2)], 1)
    mix = dry+wet*.5
    scale = .98/np.abs(mix).max()
    mix = np.tanh(mix*scale*1.6)/np.tanh(1.6)*.76
    metrics = {k:dict(peak=float(np.abs(v*GAIN[k]).max()), rms=float(np.sqrt(np.mean((v*GAIN[k])**2)))) for k,v in stems.items()}
    return mix.astype(np.float32), stems, metrics
