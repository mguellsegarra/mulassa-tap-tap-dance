"""POC: the Mulassa dances «Golden» (HUNTR/X, KPop Demon Hunters), the whole song. Local only, never release: copyrighted.

Melody and harmony: music/golden/score.json (PianoGumi's full piano arrangement, 192 bars of 6/8; one game beat = one
dotted quarter, 123 BPM, 117 in the bridge, bars 99-130). Sound: the house band's kit, reverb, master and bass
(build_drac.py, synth.py, untouched), with this file's own arrangement: a darker lead that plays the piano's octave-up
passages an octave lower, nylon arpeggio, pad, strings and a horn under the choruses, fills and risers into them.
Form: two bars of count-in, the 192 bars as written, a two-bar drumroll (balloon) and the final hit; bar 97's rest is a
balloon too. Writes public/music/golden-poc.mp3 and writes src/song-golden.json: the Mulassa's song with this chart, beats and audio (?exp=guerreres).
Run: uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/music/build_golden_poc.py
"""
import hashlib, json, sys
from fractions import Fraction
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/music'))
import build_drac as band  # noqa: E402
from synth import SR, midi_of, hz, put, additive, adsr, brass, nylon, perc, swell  # noqa: E402

score = json.loads((ROOT / 'music/golden/score.json').read_text())
BARS, CHORD = dict(score['bars']), dict(score['chords'])
NBARS = len(BARS)
LEAD = 2                                  # count-in bars before bar 1
bar0 = lambda n: 2 * (n - 1 + LEAD)       # first game beat of source bar n (a 6/8 bar = two dotted-quarter beats)
ROLL = bar0(NBARS + 1)
END = ROLL + 4
BREAK = (bar0(97), bar0(98))              # the score's rest bar before the bridge: a balloon

# tempo: dotted-quarter BPM per beat (the score's quarter marks / 1.5)
qbpm = lambda n: next(q for b, q in reversed(score['tempo']) if b <= max(n, 1))
spb = [60 / (qbpm(b // 2 + 1 - LEAD) / 1.5) for b in range(END + 8)]
T = [0.1]
for d in spb: T.append(T[-1] + d)
sec = lambda b: T[min(int(b), len(T) - 2)] + (b - min(int(b), len(T) - 2)) * spb[min(int(b), len(spb) - 1)]
span = lambda s, d: sec(s + d) - sec(s)

# melody: (beat, beats, midi, source bar, eighth position in the bar); "_" ties onto the previous note
mel = []
for n in range(1, NBARS + 1):
    pos = 0
    for tok in BARS[n].split():
        name, d = tok.split(':'); d = int(d)
        if name == '_': mel[-1][1] += d
        elif name != 'R': mel.append([Fraction(bar0(n)) + Fraction(pos, 3), d, midi_of(name), n, pos])
        pos += d


def section(n):  # (drum style, the Mulassa dance's style)
    if n < 1: return 'intro', 'intro1'
    if n <= 8: return 'intro', 'intro1'
    if n <= 16: return 'light', 'A1'
    if n == 17 or n == 98: return 'pickup', 'pickup'
    if n <= 25: return 'light', 'A1'
    if n <= 33: return 'mid', 'A2'
    if n <= 48: return 'full', 'B'
    if n <= 63: return 'full', 'C'
    if n <= 80: return 'mid', 'A2'
    if n <= 96: return 'full', 'C'
    if n == 97: return 'break', 'roll'
    if n <= 114: return 'light', 'A1'
    if n <= 130: return 'mid', 'A2'
    if n <= 146: return 'full', 'B'
    if n <= 162: return 'full', 'C'
    if n <= 178: return 'frenzy', 'X'
    return 'light', 'A1'


bar_of = lambda beat: int(beat // 2) + 1 - LEAD

# chart: every tap a tune note. FÀCIL: each bar's downbeat, the second beat under a dotted quarter, the long notes;
# NORMAL: every beat and every quarter; DIFÍCIL: the eighths too. Then the game's shortest gaps thin each level.
BIG_BARS = {34, 49, 81, 131, 147, 163, 171, 86, 94, 152, 160, 176}
taps, seen = [], set()
for s, d, m, n, pos in mel:
    sparse = section(n)[0] in ('intro', 'light', 'pickup')  # the busy sections keep FÀCIL to one tap a bar
    level = 0 if pos == 0 or d >= 6 or (sparse and pos == 3 and d >= 3) else 1 if pos in (0, 3) or d >= 2 else 2
    big = int(n in BIG_BARS and n not in seen and pos in (0, 3))
    if any(0 < sec(b) - sec(s) < 0.39 for b in (BREAK[0], ROLL)): level = 3  # leave room before a balloon
    if big: seen.add(n)
    hold = sec(s + Fraction(d - 1, 3)) if d >= 6 and not big else 0
    taps.append([s, m, level, big, hold])
for lv, gap in enumerate((0.39, 0.39, 0.19)):  # tests/game/chart-playable.mjs
    last, kept = None, None
    for t in taps:
        if t[2] > lv: continue
        if last is not None and sec(t[0]) - last < gap - 1e-3:
            if not t[3]: t[2] = lv + 1; continue  # 3 = audio only
            kept[2] = lv + 1  # a GUAPA wins: the note before it goes up a level
        last, kept = (t[4] if t[4] and lv else sec(t[0])), t  # after a hold (NORMAL up), the gap counts from its end
side, last_m, prev = {}, None, None
for t in taps:  # up = PA, down = GUA, same = keep; never 5 in a row on one side
    side[t[0]] = 'don' if last_m is None else 'ka' if t[1] > last_m else 'don' if t[1] < last_m else side[prev]
    last_m, prev = t[1], t[0]
for lv in range(3):
    run, prev_k = 0, None
    for t in taps:
        if t[2] > lv or t[3]: continue
        run = run + 1 if side[t[0]] == prev_k else 1
        if run > 4: side[t[0]] = 'ka' if side[t[0]] == 'don' else 'don'; run = 1
        prev_k = side[t[0]]
r4 = lambda x: round(float(x), 4)
notes = [[r4(sec(s)), side[s], lv, big, r4(h)] for s, m, lv, big, h in taps if lv < 3]
notes.append([r4(sec(END)), 'don', 0, 1, 0])

# ---------------------------------------------------------------- the band, on the 6/8 grid (6 eighth steps a bar)
# Harmony: score.json's one chord a bar ("D/F#" = D over an F# bass). A chord tone a semitone under the tune on a strong
# beat (C sung over G's B: a minor ninth) is left out of that bar's pad; the voices that reach the tune's octave (strings,
# stabs, horn, arpeggio) also leave out the one a semitone over it (C under a B: fine as a major seventh, not as a second).
CH = dict(band.CH, Em=(4, 7, 11), Bm=(11, 2, 6))
at = {}  # eighth step -> pitch classes of the tune sounding on it
for s, d, m, *_ in mel:
    for k in range(round(s * 3), round(s * 3) + d): at.setdefault(k, set()).add(m % 12)
clash = lambda pc, k0, k1=None, iv=(1, 11): any((q - pc) % 12 in iv for k in range(k0, k1 or k0 + 1) for q in at.get(k, ()))


def harmony(n):  # (chord tones, the pad's, the upper voices', bass pitch class) of bar n, None where the left hand rests
    name = CHORD.get(n)
    if not name: return None
    base, _, slash = name.partition('/')
    k = bar0(n) * 3
    keep = lambda iv: [pc for pc in CH[base] if not clash(pc, k, iv=iv) and not clash(pc, k + 3, iv=iv)]
    return CH[base], keep((1,)), keep((1, 11)), midi_of(slash + '0') % 12 if slash else CH[base][0]


def energy(n):  # how much band plays: builds by section, the bridge a breakdown, bars 163-178 the peak
    for last, e in ((0, 'count'), (8, 'intro'), (16, 'intro2'), (25, 'light'), (33, 'mid'), (48, 'full'), (64, 'big'), (72, 'mid'),
                    (80, 'full'), (95, 'big'), (96, 'hold'), (97, 'break'), (98, 'pickup'), (114, 'bridge'), (122, 'light'),
                    (130, 'mid'), (146, 'full'), (162, 'big'), (178, 'peak'), (188, 'light'), (192, 'intro')):
        if n <= last: return e


P = {
    'count': dict(shaker='o.oo.o', tim='o..o..'),
    'intro': dict(shaker='o.oo.o'),
    'intro2': dict(kick='x.....', clap='...o..', shaker='o.oo.o'),
    'light': dict(kick='x.....', clap='...x..', shaker='o.oo.o'),
    'bridge': dict(kick='x.....', shaker='o..o..'),
    'hold': dict(kick='x.....'),
    'pickup': dict(snare='...xxx', kick='x.....'),
    'mid': dict(kick='x..x..', snare='...o..', clap='...x..', hat='o.oo.o', shaker='oooooo'),
    'full': dict(kick='x..x.o', snare='...x..', clap='...x..', hat='xoxxox', ohat='.....o', tamb='...o..'),
    'big': dict(kick='x..x.o', snare='...x..', clap='...x..', hat='xoxxox', ohat='.....o', tamb='o..x..'),
    'peak': dict(kick='x.ox.x', snare='...x.o', clap='...x..', hat='xoxxox', ohat='..o..o', tamb='x..x..'),
}
BASS = {  # (step, steps long, r = the bass note, o = its octave, 5 = the chord tone a fifth or so above)
    'intro2': 'r0-6', 'bridge': 'r0-6', 'light': 'r0-4 r5-1', 'mid': 'r0-2 r3-2 55-1',
    'full': 'r0-2 o2-1 r3-1 54-1 o5-1', 'peak': 'r0-1 r1-1 o2-1 r3-1 54-1 o5-1'}
BASS['big'] = BASS['full']
ARP = {e: (0, 2, 3, 5) for e in ('intro', 'intro2', 'light', 'bridge')} | {e: range(6) for e in ('mid', 'full', 'big', 'peak')}
FILL = {16: 0.5, 25: 0.5, 33: 1, 48: 1, 64: 1, 72: 0.5, 80: 1, 114: 0.5, 122: 0.5, 130: 1, 146: 1, 162: 1, 170: 1, 178: 0.5}  # a tom fill, the kit drops out
BUILD = (32, 79, 129)   # two bars of snare climbing into the fill
RISER = (34, 81, 131, 163)
DOWN = lambda n, pos: 49 <= n <= 96 or (122, 3) <= (n, pos) < (162, 5) or 171 <= n <= 178  # the piano's octave-up passages, back down

hits = {k: [] for k in band.KINDS}
bass, stabs, arp, pads, strings, horn = [], [], [], [], [], []
raw_clash = []
for n in range(1 - LEAD, NBARS + 1):
    b0, e, k0 = bar0(n), energy(n), bar0(n) * 3
    fill = FILL.get(n)
    for inst, p in P.get(e, {}).items():
        for i, c in enumerate(p):
            if c != '.' and not (fill and i >= 3 and inst not in ('shaker',)): hits[inst].append((b0 + i / 3, 1.0 if c == 'x' else 0.55))
    if fill:
        for i, v in ((3, 0.55), (4, 0.7), (5, 0.9)): hits['tim'].append((b0 + i / 3, v * fill))
        if fill == 1: hits['snare'] += [(b0 + 4.5 / 3, 0.5), (b0 + 5 / 3, 0.8)]
    if n in BUILD: hits['snare'] += [(b0 + i / 3, 0.25 + 0.05 * j) for j, i in enumerate((0, 3, 6, 7, 8))]
    h = harmony(n)
    if not h: continue
    tones, soft, kept, root = h
    if len(soft) < len(tones): raw_clash.append(n)
    low = 36 + root if root < 8 else 24 + root
    fifth = next(((t - root) % 12 for t in tones if 5 <= (t - root) % 12 <= 9), 7)
    for tok in BASS.get(e, '').split():
        i, ln = map(int, tok[1:].split('-'))
        iv = {'r': 0, 'o': 12, '5': fifth}[tok[0]]
        bass.append((b0 + i / 3, ln / 3, low + (0 if clash(low + iv, k0 + i) else iv)))
    voice = lambda base, pcs=kept: sorted(base + (pc - base) % 12 for pc in pcs)
    if pads and pads[-1][1] == b0 and pads[-1][2] == voice(55, soft): pads[-1][1] = b0 + 2   # the same chord again: one long pad
    else: pads.append([b0, b0 + 2, voice(55, soft)])
    if e in ('big', 'peak'):
        strings.append((b0, b0 + 2, voice(62)))
        for beat, pc in enumerate((tones[1] if n % 2 else tones[0], tones[2])):  # the horn's slow answer under the tune
            if not clash(pc, k0 + 3 * beat, k0 + 3 * beat + 3): horn.append((b0 + beat, 1, 57 + (pc - 57) % 12))
    if e in ('full', 'big', 'peak') and not fill:
        stabs += [(b0 + i / 3, voice(57)) for i in ((3, 5) if e == 'peak' else (3,))]
    up = sorted((pc - root) % 12 for pc in tones)
    for j, i in enumerate(ARP.get(e, ())):  # nylon arpeggio: root, fifth, octave, tenth and back
        q = (0, 2, 3, 4, 3, 2)[i]
        p = 55 + (root - 55) % 12 + up[q % 3] + 12 * (q // 3)
        if not clash(p, k0 + i): arp.append((b0 + i / 3, p, 1.0 if i in (0, 3) else 0.7))
for a, b in (BREAK, (ROLL, END)):
    k = int((b - a) * 6)
    for i in range(k): hits['snare'].append((a + i / 6, (0.35 + 0.65 * i / k) * 0.8))
    for i in range(int((b - a) * 3)): hits['don'].append((a + i / 3, 0.3 + 0.7 * i / ((b - a) * 3)))
    hits['swell'].append((a, b - a))
hits['swell'] += [(bar0(n) - 4, 4) for n in RISER]
hits['crash'] = [(s, 0.8) for s, m, lv, big, h in taps if big] + [(bar0(n), v) for n, v in ((1, 0.6), (17, 0.4), (65, 0.5), (99, 0.4), (179, 0.5))] + [(END, 0.8)]
for s, m, lv, big, h in taps:
    if lv <= 1: hits[side[s]].append((s, 0.8 if side[s] == 'don' else 0.6))  # the taiko doubles the chart
hits['don'].append((END, 1.0)); hits['kick'].append((END, 1.0))
pads += [[ROLL, END, [57, 62, 66]], [END, END + 2, [55, 59, 62]]]   # the roll hangs on D, the last hit lands on G
bass.append((END, 2, 43)); stabs.append((END, [59, 62, 67]))
# the lead: (beat, beats, sounding midi, thick). Ends with the house's rising close into the last note.
lead = [(float(s), d / 3, m - 12 * DOWN(n, pos), DOWN(n, pos) or energy(n) == 'peak') for s, d, m, n, pos in mel]
lead += [(END - 1 + i / 3, 1 / 3, p, False) for i, p in enumerate((74, 76, 78))] + [(END, 2, 79, True)]


def render(N):
    stem = {k: np.zeros((N, 2)) for k in GAIN}
    for s, d, m, thick in lead:  # the house's additive lead, darker: steeper tilt the higher it goes, soft attack, slow vibrato
        dur = max(span(s, d) - 0.02, 0.06)
        tilt, g0 = 1.5 + 0.4 * min(max((m - 72) / 12, 0), 1), 10 ** (-0.075 * (m - 69) / 12)  # 1.5 dB less per octave above A4
        for det, pan, g, oct in ((0, 0, 1.0, 0), (6, -0.4, 0.25, 0), (-6, 0.4, 0.25, 0)) + (((0, 0, 0.3, 12),) if thick else ()):
            w, t = additive(hz(m - oct), dur + 0.1, tilt + oct / 16, 0.6, det, 0.005 if d >= 2 / 3 else 0.0, 4000)
            put(stem['lead'], sec(s), w * adsr(t, dur + 0.1, 0.02, 0.1, 0.8, 0.25) * g * g0, pan)
        if thick: put(stem['pluck'], sec(s), nylon(hz(m), min(dur + 0.1, 0.5)), 0.15)   # a soft pick under each chorus note
    for name, lst, tilt, att, vib in (('pad', pads, 1.9, 0.25, 0.0), ('strings', strings, 1.7, 0.3, 0.004)):
        for s, e, ps in lst:
            dur = span(s, e - s)
            for m in ps:
                for det, pan in ((-9, -0.8), (9, 0.8), (0, 0)):
                    w, t = additive(hz(m), dur + 0.4, tilt, 0.8, det, vib, 4000)
                    put(stem[name], sec(s), w * adsr(t, dur + 0.4, att, 0.4), pan)
    for s, d, m in horn:
        dur = span(s, d)
        w, t = brass(hz(m), dur + 0.08)
        put(stem['horn'], sec(s), w * adsr(t, dur + 0.08, 0.05, 0.12, 0.7, 0.3), -0.3)
    for s, ps in stabs:
        for m in ps + [ps[0] + 12]:
            for det, pan in ((-6, -0.35), (6, 0.35)):
                w, t = brass(hz(m), 0.3, det)
                put(stem['stab'], sec(s), w * adsr(t, 0.3, 0.012, 0.09, 0.35, 0.1), pan)
    for i, (s, m, v) in enumerate(arp): put(stem['arp'], sec(s), nylon(hz(m), 0.45) * v, -0.5 if i % 2 else 0.5)
    for s, d, m in bass:
        dur = span(s, d) - 0.015
        w, t = additive(hz(m), dur + 0.03, 1.6, 3.0)
        put(stem['bass'], sec(s), (0.8 * w + 0.6 * np.sin(2 * np.pi * hz(m) * t)) * adsr(t, dur + 0.03, 0.004, 0.03, 0.75, 0.12))
    t = np.arange(int(0.25 * SR)) / SR   # a knock above the house kick's sub, for phone speakers
    kick = perc('kick', 1.0).copy(); kick[:len(t)] += 0.5 * np.sin(2 * np.pi * np.cumsum(110 + 140 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06)
    for kind, lst in hits.items():
        for s, v in lst:
            x = swell(v, span(s, v) / v) * 0.6 if kind == 'swell' else kick * v if kind == 'kick' else perc(kind, v)
            put(stem[band.BUS.get(kind, 'drums')], sec(s), x, band.PAN.get(kind, 0))
    duck = np.ones(N)
    for s, _ in hits['kick']:
        i = int(sec(s) * SR); k = min(int(0.25 * SR), N - i)
        duck[i:i + k] = np.minimum(duck[i:i + k], 1 - 0.35 * np.exp(-np.arange(k) / SR / 0.08))
    for k in ('pad', 'strings', 'horn', 'stab', 'bass'): stem[k] *= duck[:, None]
    for k, g in GAIN.items():   # tuned stems are levelled by their sounding RMS (nobody listened: see the report), drums keep the house gains
        if k not in ('drums', 'perc', 'taiko'):
            p = (stem[k] ** 2).sum(1); g /= np.sqrt(p[p > 1e-6 * p.max()].mean())
        stem[k] *= g
    return stem


GAIN = dict(lead=0.21, pluck=0.035, pad=0.05, strings=0.03, horn=0.04, stab=0.06, arp=0.045, bass=0.15, drums=0.45, perc=0.9, taiko=0.5)
SEND = dict(lead=0.7, pluck=0.4, pad=1.0, strings=1.0, horn=0.6, stab=0.36, arp=0.4, drums=0.18, perc=0.05)   # reverb, relative to dry
N = int((sec(END) + 3.5) * SR)
stem = render(N)
mix = band.master(sum(stem.values()), sum(stem[k] * g for k, g in SEND.items()), band.reverb_ir(), N)
wav = ROOT / 'tmp/audio/golden-poc.wav'
wav.parent.mkdir(parents=True, exist_ok=True)
sf.write(wav, mix, SR)
OUT = ROOT / 'public/music/golden-poc.mp3'
band.mp3(str(wav), str(OUT), '160k')
if '--stems' in sys.argv:
    for k, x in stem.items(): sf.write(wav.with_name(f'golden-poc-{k}.wav'), x, SR)
assert not any(clash(pc, bar0(n) * 3 + i, iv=(1,)) for n in CHORD for i in (0, 3) if harmony(n) for pc in harmony(n)[1])
print('bars whose pad leaves out a chord tone a semitone under the tune on a strong beat:', raw_clash)

end_t = r4(sec(END))
song_path = ROOT / 'src/song-mulassa.json'
song = json.loads(song_path.read_text())
dance, last = [], None
for n in range(1 - LEAD, NBARS + 1):
    d = section(n)[1]
    if d != last: dance.append([bar0(n), d]); last = d
dance.append([ROLL, 'roll'])
finale = r4(sec(bar0(163)))
song.update({
    'bpm': 123, 'duration': round(N / SR, 3), 'end': end_t, 'tail': r4(sec(END) + 2.5), 'finale': finale,
    'sections': [[0.1, 'A'], [finale, 'B']], 'beats': [r4(sec(b)) for b in range(END + 1)], 'notes': notes,
    'balloonBeats': [list(BREAK), [ROLL, END]], 'arrangement': dance,
    'ref': [[notes[0][0], 0], [r4(sec(ROLL)), 161.3], [r4(sec(ROLL) + 3.9), 166.2]], 'refEnd': 166.2,
    'audio': 'music/golden-poc.mp3?v=' + hashlib.sha1(OUT.read_bytes()).hexdigest()[:10],
})
(ROOT / 'src/song-golden.json').write_text(json.dumps(song, separators=(',', ':')))  # the experiment's own song: ?exp= picks it
first = notes[0][0]
per7 = lambda lv: [sum(1 for x in notes if x[2] <= lv and a <= x[0] < a + 7) for a in range(int(first), int(end_t) - 7, 7)]
print(f'{len(mel)} tune notes, {len(notes)} taps, song {end_t:.1f} s (+3.5 s tail), first tap {first:.2f} s')
for lv, name in enumerate(('FÀCIL', 'NORMAL', 'DIFÍCIL')): print(name, 'per 7 s:', per7(lv))
