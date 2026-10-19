"""Rhythm-game arrangement of the Ball del Drac de Valls (F. Bofarull, 1985), festa-major party band.

Inputs: music/drac-score.json (the gralla 1 line) and music/drac-form.json (which phrases, in which order, labels, tempo
knots, balloons, holds, the ending). The form is compiled by the SAME browser-safe compiler the music editor uses
(`node tools/compile-music-form.mjs drac`, src/music-form/CONTRACT.md) into a timeline of bars, melody, tempo and events;
this file turns that timeline into sound and chart. `MUSIC_FORM=<path>` compiles another form file instead (experiments).
2/4, one beat = one quarter; the tune is written in C and sounds in G major (gralla in sol), so everything here is
placed in G major (the form's `source.transpose` below the written pitch).
Still hardcoded here (instruments, not decisions): the harmony table (V_BARS, by source bar), the drum/bass/stab patterns
per label, the 6-bar count-in, which labels get the bell, the chart levels per beat position, and the menu ambience.
Tempo: the form's knots, fitted to the reference recording's pulse (docs/drac-music.md: 117 BPM rising to 128, the
late jump to 151 under the final spins, the rit. under the held last note), made into whole microseconds a beat by the compiler, so the
MIDI tempo map and the audio agree exactly. The form's `reference` anchors become song-drac.json `ref` / `refEnd`: the
map from song seconds to the recording's seconds the Drac's dance is authored in (game/drac-time.js).
Two arrangements, one chosen by VARIANT: festiva (the party band below) and austera (one reed voice, timbal, bass drum).
Outputs tmp/audio/drac-taiko.wav, public/music/drac-taiko.{mp3,mid}, drac-taiko-ambient.mp3,
music/drac-arrangement.json and the game chart src/song-drac.json (same shape as src/song.json + `balloons`, `arrangement`,
`ref`, `refEnd`); the other arrangement only as a dev candidate, tmp/audio/drac-taiko-<variant>.{wav,mp3} (gitignored).
"""
import hashlib
import json
import os
import subprocess
from fractions import Fraction
from pathlib import Path
from types import SimpleNamespace
import mido
import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve
from synth import SR, hz, lp, midi_of, put, additive, adsr, glock, note_gate, brass, nylon, perc, swell, rng

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FORM = ROOT / 'music/drac-form.json'
FORM = Path(os.environ.get('MUSIC_FORM') or DEFAULT_FORM)
# Marc chose festiva (2026-10-19); austera stays renderable as a candidate (docs/drac-music.md).
VARIANT = 'festiva'
VARIANTS = ('festiva', 'austera')
AMB_BPM = 126   # the menu ambience's own tempo (the song's first knot is the recording's 117 now; the loop stays as it was)


# ------------------------------------------------------------------ the form -> a timeline (node, the one compiler)
def compile_timeline(form_path=FORM):
    """(form, timeline). Fails loudly when node fails or the form has anything unresolved."""
    form_path = Path(form_path)
    form = json.load(open(form_path))
    if form_path.resolve() == DEFAULT_FORM.resolve():
        cmd = ['node', str(ROOT / 'tools/compile-music-form.mjs'), 'drac']
    else:   # another form file: the same compileForm, the CLI only reads music/<song>-form.json
        js = ("import { readFileSync } from 'node:fs'; import { compileForm } from %s;"
              "const [f, s] = process.argv.slice(1).map(p => JSON.parse(readFileSync(p, 'utf8')));"
              "const t = compileForm(f, s);"
              "if (t.unresolved.length) { for (const u of t.unresolved) console.error(u.path + ': ' + u.message); process.exit(1); }"
              "process.stdout.write(JSON.stringify(t));") % json.dumps((ROOT / 'src/music-form/compile.js').as_uri())
        cmd = ['node', '--input-type=module', '-e', js, str(form_path), str(ROOT / 'music' / form['source']['score'])]
    run = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if run.returncode: raise SystemExit(f'music form {form_path}: the compiler failed\n{run.stderr.strip()}')
    tl = json.loads(run.stdout)
    if tl['unresolved']: raise SystemExit(f'music form {form_path}: unresolved {tl["unresolved"]}')
    return form, tl


# ------------------------------------------------------------------ harmony (G major) and patterns
CH = {'G': (7, 11, 2), 'D': (2, 6, 9), 'C': (0, 4, 7)}
V_BARS = {3, 7, 10, 11, 12, 13, 16, 20, 25, 29, 31, 33, 34, 37, 41, 45, 49, 53}
chord_of = lambda bar: 'D' if bar in V_BARS else 'G'


P = {
    'pickup': dict(snare='..o.oxxx', don='x.......'),
    'intro0': dict(don='x...x...', ka='..o...o.', shaker='o.o.o.o.'),
    'intro1': dict(kick='x...x...', clap='....x...', shaker='oxoxoxox', ohat='..o...o.', don='x.......'),
    'intro2': dict(kick='x...x...', snare='....x...', clap='....x...', ohat='..x...x.', shaker='oxoxoxox', tamb='....x...'),
    'A1': dict(kick='x.......', shaker='o.o.o.o.', clap='....o...', ohat='..o.....'),
    'A2': dict(kick='x...x...', snare='....o...', clap='....x...', ohat='..o...o.', shaker='oxoxoxox'),
    'B': dict(kick='x...x...', snare='....x...', clap='....x...', hat='o.o.o.o.', ohat='..x...x.', shaker='oxoxoxox', tamb='....x...'),
    'C': dict(kick='x...x...', snare='....x.x.', clap='....x...', hat='oooooooo', ohat='..x...x.', tamb='..x...x.', cowbell='x.o.x.o.'),
    'D': dict(kick='x...x.x.', snare='....x...', clap='....x...', hat='xoxoxoxo', ohat='..x...x.', tamb='..x...x.', cowbell='x.oxx.o.'),
    'E': dict(kick='x...x...', snare='....x...', clap='....x...', hat='o.o.o.o.', ohat='..x...x.', shaker='oxoxoxox', tamb='....x...'),
    'coda': dict(kick='x...x...', snare='....x...', clap='....x...', hat='o.o.o.o.', ohat='..x...x.'),
}
P['A3'] = dict(P['A2'], hat='o.o.o.o.', tamb='....x...')
for k in 'BCDE': P[k + '3'] = dict(P[k], cowbell='x.o.x.o.' if k != 'D' else 'x.oxx.o.', tamb='x.x.x.x.')
BASS = {  # (step, length in steps, interval): oom-pah, root then fifth; walking eighths in C/D
    'A1': [(0, 3, 0), (4, 3, 7)], 'A2': [(0, 3, 0), (4, 3, 7)], 'A3': [(0, 3, 0), (4, 3, 7)],
    'B': [(0, 3, 0), (4, 3, 7)], 'C': [(0, 2, 0), (2, 2, 12), (4, 2, 7), (6, 2, 12)], 'D': [(0, 2, 0), (2, 2, 12), (4, 2, 7), (6, 2, 12)],
    'E': [(0, 3, 0), (4, 3, 7)], 'coda': [(0, 3, 0), (4, 3, 7)],
}
for k in 'BCDE': BASS[k + '3'] = BASS[k]
STABS = {'B': [2, 6], 'C': [2, 6], 'D': [2, 6], 'E': [2, 6], 'B3': [2, 6], 'C3': [2, 6], 'D3': [2, 6], 'E3': [2, 6],
         'A3': [2, 6], 'coda': [2, 6]}
KINDS = ('kick', 'snare', 'clap', 'hat', 'ohat', 'shaker', 'tamb', 'cowbell', 'swell', 'don', 'ka', 'crash', 'tim')
STEMS = ('lead', 'pad', 'stab', 'arp', 'bell', 'bass', 'drums', 'perc', 'taiko')
FRENZY = {'D', 'D3'}
INTRO_STYLES = ['intro0', 'intro0', 'intro1', 'intro1', 'intro2', 'pickup']


def voicing(name, low=55):
    return sorted(low + (pc - low) % 12 for pc in CH[name])


# ------------------------------------------------------------------ timeline -> events (beats), chart taps
def build_events(tl):
    """Everything the synthesis and the chart need, from a compiled timeline. No synthesis here, nothing written.
    Beats are floats except the few the old generator kept whole (the pickup's start, the final hit): the written
    files keep their exact bytes."""
    LEAD_IN, BPM = tl['beats'][0], tl['bpm']
    END = int(tl['end']); assert END == tl['end'], 'the final hit sits on a whole beat'
    occ = tl['occurrences']
    pick, body = occ[0], occ[1:]
    assert pick['item'] == 'pickup' and body and all(o['item'] != 'pickup' for o in body), 'one pickup bar, then the sequence'
    INTRO = int(body[0]['start']); assert INTRO == body[0]['start'] == 2 * len(INTRO_STYLES), 'the count-in is 6 bars'
    PICK0 = pick['start']
    B = lambda b: int(b) if b in (PICK0, END) else float(b)
    ROLL = next(b for b, st in tl['arrangement'] if st == 'roll')
    layout = [(o['bar'], B(o['start']), o['label']) for o in occ]            # (source bar, start, style)
    ARR = [[int(b) if st in ('intro', 'pickup') else float(b), st] for b, st in tl['arrangement']]
    BALLOONS = [[B(a), B(b)] for a, b in tl['balloons']]
    melody = [[B(s), d if i == len(tl['melody']) - 1 else float(d), m] for i, (s, d, m) in enumerate(tl['melody'])]
    C0 = melody[-1][0]                                  # the long last note starts here
    assert C0 < ROLL < END, (C0, ROLL, END)

    # tempo: the compiler's whole microseconds a beat -> seconds, for the audio and the MIDI alike
    US = tl['tempo']['beatUs']
    AT = [0.0]
    for u in US: AT.append(AT[-1] + u / 1e6)

    def sec(b):
        k = min(max(int(np.floor(b)), 0), len(US) - 1)
        return LEAD_IN + AT[k] + (b - k) * US[k] / 1e6

    span = lambda s, d: sec(s + d) - sec(s)

    # harmony: per occurrence by source bar
    chords = [(0, INTRO, 'G')]
    for o in body:
        bar, s, dur = o['bar'], B(o['start']), float(o['dur'])
        if bar in (19, 52):                             # C F E: the F is a passing IV
            chords += [(s, s + dur / 2, 'G'), (s + dur / 2, s + dur, 'C')]
        else:
            chords.append((s, s + dur, chord_of(bar)))
    chords.append((ROLL, END + 4, 'G'))
    chords.sort()
    chord_at = lambda beat: next(c for s, e, c in reversed(chords) if s <= beat + 1e-6)

    # chart taps (before the drums, which double them)
    style_of = lambda beat: next(st for bar, s, st in reversed(layout) if s <= beat + 1e-6)

    def tap_of(s, m, prev):
        """(kind, level) of a tune note; level = easiest difficulty with it: 0 FACIL, 1 NORMAL, 2 DIFICIL, 3 none."""
        p = (s - INTRO) % 2
        contour = 'ka' if prev is not None and m > prev else 'don'
        if s < INTRO: return (('don', 0) if s == PICK0 else (contour, 2))    # the pickup: G5 then E5
        base = 'don' if int((s - INTRO) // 2) % 2 == 0 else 'ka'      # bars alternate GUA / PA; beat 2 takes the other side
        if p == 0: return (base, 0)
        if p == 1: return ('ka' if base == 'don' else 'don', 1)
        if p == 1.5: return (contour, 2)
        if p == 0.5: return (contour, 2 if style_of(s) in FRENZY else 3)
        return (contour, 3)                             # sixteenths and triplets: in the audio, never in a chart

    tune_taps, prev = [], None
    for s, d, m in melody:
        if s < END: tune_taps.append((s, *tap_of(s, m, prev)))
        prev = m
    tune_taps = [x for x in tune_taps if x[2] < 3 and not any(a <= x[0] < b for a, b in BALLOONS)]   # level 3: audio only
    BIG = {INTRO, C0, END}
    prev_bar = None
    for o in body:                                      # a pass starts where the tune jumps back (D.S.)
        if prev_bar is not None and o['bar'] < prev_bar: BIG.add(B(o['start']))
        prev_bar = o['bar']
    for bar, s, style in layout:
        if bar in (16, 24, 40) or (bar == 52): BIG.add(s)
    BIG = {b for b in BIG if any(abs(b - x[0]) < 1e-6 for x in tune_taps) or b == END}
    # holds: explicit in the form (start, end, GUA/PA)
    HOLD = {B(s): B(e) for s, e, _ in tl['holds']}
    HOLD_KIND = {B(s): k for s, _, k in tl['holds']}
    tune_taps = [x for x in tune_taps if not any(a < x[0] < he + 1 for a, he in HOLD.items())]    # a beat of air after every hold
    # sides follow the melody: higher than the last tapped note -> ka (MA), lower -> don (CRE), same -> keep.
    # No level may play more than 4 on one side: the 5th flips (holds keep the form's side, the pickup's first stays).
    pitch = {s: m for s, _, m in melody}
    # DIFÍCIL only (Marc, 2026-10-19: more GUAPA where there already are some): from the D.S. on, a phrase that opens on
    # a GUAPA doubles the eighth falling from its peak too. A level-2 note, so the easier charts never see it.
    length = {s: d for s, d, _ in melody}
    DS = max(B(o['start']) for p, o in zip(body, body[1:]) if o['bar'] < p['bar'])
    HARD_BIG = set()
    for _, _, a, b in tl['itemSpans']:
        own = [x for x in tune_taps if a <= x[0] < b and x[0] not in BIG]
        if a < DS or a not in BIG or not own: continue
        peak = max(own, key=lambda x: pitch[x[0]])
        nxt = next((x for x in own if x[0] > peak[0]), None)
        if nxt and nxt[2] == 2 and length[nxt[0]] >= 0.5: HARD_BIG.add(nxt[0])
    side, last_m, prev_s = {}, None, None
    for s, k, lv in tune_taps:
        side[s] = HOLD_KIND.get(s) or ('don' if last_m is None else
                                       ('ka' if pitch[s] > last_m else 'don' if pitch[s] < last_m else side[prev_s]))
        last_m, prev_s = pitch[s], s
    fixed = lambda s: s in HOLD_KIND or s == PICK0
    for lvl in range(3):
        for _ in range(200):
            run, prev_k, flip = 0, None, None
            for s, k, lv in tune_taps:
                if lv > lvl or s in BIG or s in HARD_BIG: continue
                run = run + 1 if side[s] == prev_k else 1
                if run > 4 and not fixed(s): flip = s; break
                prev_k = side[s]
            if flip is None: break
            side[flip] = 'ka' if side[flip] == 'don' else 'don'
        else: raise AssertionError('side runs do not settle')
    taps = []
    for s, k, lv in tune_taps:
        taps.append((s, side[s], lv, int(s in BIG or s in HARD_BIG), HOLD.get(s, 0)))
    taps.append((END, 'don', 0, 1, 0))
    taps = [x for x in taps if not (x[0] == END and any(y[0] == END for y in taps[:-1]))]
    taps.sort()
    assert all(any(x[0] == s and x[4] for x in taps) for s in HOLD), ('a hold must start on a tap', sorted(HOLD))

    # drums: 8 sixteenth steps per 2/4 bar
    hits = {k: [] for k in KINDS}
    bass, stabs, arp = [], [], []

    def roll(b0, beats, v0=0.15):
        n = int(beats * 8)
        for i in range(n): hits['snare'].append((b0 + i / 8, (v0 + (1 - v0) * i / n) * 0.8))
        for i in range(int(beats * 4)): hits['don'].append((b0 + i / 4, 0.3 + 0.7 * i / (beats * 4)))
        hits['swell'].append((b0, beats))

    def pattern(bar_beat, style):
        for inst, s in P.get(style, {}).items():
            for i, c in enumerate(s):
                if c != '.': hits[inst].append((bar_beat + i / 4, 1.0 if c == 'x' else 0.55))

    for i, st in enumerate(INTRO_STYLES): pattern(i * 2, st)
    for bar, s, style in layout[1:]:
        assert style in P, f'no drum pattern for the label {style}'
        pattern(s, style)
        for st, ln, iv in BASS.get(style, []):
            b = s + st / 4
            root = CH[chord_at(b)][0]
            bass.append((b, ln / 4, (36 + root if root < 8 else 24 + root) + iv))
        for st in STABS.get(style, []): stabs.append((s + st / 4, chord_at(s + st / 4)))
        if style in ('D', 'D3', 'C3'):
            for i in range(8):
                b = s + i / 4
                tones = CH[chord_at(b)]
                k = [0, 1, 2, 3, 2, 1][(bar * 8 + i) % 6]
                pitch = 72 + (tones[k % len(tones)] + 12 * (k // len(tones))) % 24
                # This decorative doubling must not introduce a simultaneous semitone against the tune.
                # Inspect the entire step, not only its attack (a melody sixteenth can start halfway through).
                if not any(a < b + 0.25 - 1e-8 and a + d > b + 1e-8 and (pitch - m) % 12 in (1, 11)
                           for a, d, m in melody):
                    arp.append((b, pitch))
    for a, b in BALLOONS: roll(a, b - a, 0.45 if b == END else 0.3)    # the final roll as ever; the mid one a little lighter
    hits['crash'] = [(b, 1.0) for b in sorted(BIG)] + [(INTRO, 0.7)]
    # taiko doubles the tune's strong notes (levels 0-1): the audible drum is the chart
    for s, k, lv, bg, he in taps:
        if lv <= 1 and s >= INTRO and not any(a <= s < b for a, b in BALLOONS):
            hits[k].append((s, 0.8 if k == 'don' else 0.6))
    hits['don'].append((END, 1.0)); hits['kick'].append((END, 1.0))
    bass.append((END, 4, 43)); stabs.append((END, 'G'))
    for i in range(0, INTRO - 1, 1):    # gentle count-in on every beat of the intro
        if i % 2 == 0: hits['tim'].append((i, 0.5))
    return SimpleNamespace(**locals())  # shortcut: every local, the callers pick what they need


# ------------------------------------------------------------------ synthesis of the tune's stems
def render_stems(ev, N):
    """The melodic stems (lead, bell, pad, stab, arp, bass) of an event set, each N samples long."""
    melody, chords, stabs, arp, bass, sec, span, style_of = ev.melody, ev.chords, ev.stabs, ev.arp, ev.bass, ev.sec, ev.span, ev.style_of
    stem = {k: np.zeros((N, 2)) for k in STEMS}

    for s, d, m in melody:
        dur = span(s, d) - 0.02
        if dur < 0.05: dur = 0.05
        for det, pan, g in ((0, 0, 1.0), (7, -0.5, 0.3), (-7, 0.5, 0.3)):
            w, t = additive(hz(m), dur + 0.12, 1.15, 0.35, det, 0.004 if d >= 2 else 0.0)
            # Keep the original short release/legato. The long bell tail, not this lead's
            # articulation, caused the obsolete-pitch overlap; do not choke the whole tune.
            put(stem['lead'], sec(s), w * adsr(t, dur + 0.12, 0.008, 0.12, 0.8, 0.25) * g, pan)
        g = {'C': 0.8, 'D': 1.0, 'E': 0.6, 'B3': 0.8, 'C3': 1.0, 'D3': 1.4, 'E3': 1.0, 'A3': 0.5}.get(style_of(s), 0)
        if g: put(stem['bell'], sec(s), note_gate(glock(hz(m + 12)), span(s, d)) * g, 0.25)



    for s, e, c in chords:
        dur = span(s, e - s)
        for m in voicing(c, 55):
            for det, pan in ((-9, -0.8), (9, 0.8), (0, 0)):
                w, t = additive(hz(m), dur + 0.4, 1.9, 0.8, det)
                put(stem['pad'], sec(s), w * adsr(t, dur + 0.4, 0.25, 0.4), pan)
    for s, c in stabs:
        for m in voicing(c, 57) + [voicing(c, 57)[0] + 12]:
            for det, pan in ((-6, -0.35), (6, 0.35)):
                w, t = brass(hz(m), 0.3, det)
                put(stem['stab'], sec(s), w * adsr(t, 0.3, 0.012, 0.09, 0.35, 0.1), pan)
    for i, (s, m) in enumerate(arp):
        dur = span(s, 0.25)
        w, t = additive(hz(m), dur, 1.7, 8.0)
        put(stem['arp'], sec(s), note_gate(w * np.exp(-t / 0.07), dur) * 0.5, -0.6 if i % 2 else 0.6)
    for s, d, m in bass:
        dur = span(s, d) - 0.015
        w, t = additive(hz(m), dur + 0.03, 1.6, 3.0)
        w = 0.8 * w + 0.6 * np.sin(2 * np.pi * hz(m) * t)
        put(stem['bass'], sec(s), w * adsr(t, dur + 0.03, 0.004, 0.03, 0.75, 0.12))
    return stem


# ------------------------------------------------------------------ the room, the master and the two arrangements
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


PAN = {'kick': 0, 'snare': 0.05, 'clap': -0.1, 'hat': 0.35, 'ohat': 0.35, 'shaker': 0.55, 'tamb': -0.45, 'cowbell': -0.3,
       'crash': -0.3, 'don': -0.15, 'ka': 0.3, 'tim': 0.1}
BUS = dict(don='taiko', ka='taiko', shaker='perc', tamb='perc', cowbell='perc', tim='taiko')
GAIN = dict(lead=0.36, pad=0.025, stab=0.11, arp=0.15, bell=0.09, bass=0.22, drums=0.45, perc=1.1, taiko=0.5)


def festiva(ev, N, ir):
    """The party band: lead, bell, pad, stabs, arpeggio, bass, drums, percussion and the taiko that doubles the chart."""
    stem = render_stems(ev, N)
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


# austera: the score's melody alone on one soft reed-like voice that stops at its written note-off, over a timbal and a
# bass drum. No added harmony, no taiko (so no drum doubles the chart). Neither variant is the xeremiers' real sound.
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
AUSTERA = {'A2': 'calm', 'B': 'calm', 'C': 'calm', 'D': 'walk', 'E': 'calm', 'A3': 'calm', 'B3': 'calm', 'C3': 'calm',
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
        kind = AUSTERA[style]
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


ARRANGEMENTS = {'festiva': festiva, 'austera': austera}


def mp3(wav, out, rate):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', rate, out], check=True)


# ------------------------------------------------------------------ the song
def main():
    form, tl = compile_timeline()
    ev = build_events(tl)
    melody, chords, stabs, bass, hits, taps, layout, BIG, HOLD, BALLOONS, ARR, US, sec, span, END, LEAD_IN, BPM = (
        getattr(ev, k) for k in ('melody chords stabs bass hits taps layout BIG HOLD BALLOONS ARR US sec span END LEAD_IN BPM').split())
    SPB = 60 / AMB_BPM                                  # the base beat: the menu ambience, never the song's clock
    TR = form['source']['transpose']
    score = {}                                          # the menu ambience plays a few of the score's own bars
    for n, line in json.load(open('music/' + form['source']['score']))['bars']:
        out = []
        for tok in line.split():
            name, d = tok.split(':')
            out.append((None if name == 'R' else midi_of(name) + TR, float(Fraction(d))))
        score[n] = out

    N = int(max(sec(END) + 3.5, sec(END + 4) + 1.4) * SR)    # the pad rings to END + 4 (+0.4 s), then the reverb
    assert all(sec(s + d) + 0.12 < N / SR - 1 for s, d, _ in melody + bass) and max(sec(e) + 0.4 for _, e, _ in chords) < N / SR, 'no note cut off'
    assert VARIANT in VARIANTS, VARIANT
    ir = reverb_ir()
    os.makedirs('tmp/audio', exist_ok=True)
    for v in (VARIANT,) + tuple(x for x in VARIANTS if x != VARIANT):   # the game's first, then the candidate
        wav = 'tmp/audio/drac-taiko.wav' if v == VARIANT else f'tmp/audio/drac-taiko-{v}.wav'
        sf.write(wav, ARRANGEMENTS[v](ev, N, ir).astype(np.float32), SR, subtype='PCM_16')
        if v != VARIANT: mp3(wav, wav[:-4] + '.mp3', '160k')       # dev audition only: never into public/


    # ------------------------------------------------------------------ MIDI
    mid = mido.MidiFile(ticks_per_beat=480)
    TP = lambda b: int(round(b * 480))
    conductor = mido.MidiTrack(); mid.tracks.append(conductor)   # MIDI time 0 = beat 0 = audio time LEAD_IN
    conductor.append(mido.MetaMessage('track_name', name='Tempo'))
    now = 0
    for k, u in enumerate(US):
        if k == 0 or u != US[k - 1]: conductor.append(mido.MetaMessage('set_tempo', tempo=u, time=TP(k) - now)); now = TP(k)


    def track(name, ch, prog, notes):
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('track_name', name=name))
        if prog is not None: tr.append(mido.Message('program_change', channel=ch, program=prog))
        ev = []
        for s, d, n, v in notes: ev += [(TP(s), 1, n, v), (TP(s + d), 0, n, 0)]
        now = 0
        for tk, on, n, v in sorted(ev):
            tr.append(mido.Message('note_on' if on else 'note_off', channel=ch, note=n, velocity=v, time=tk - now)); now = tk


    vel = lambda v: max(1, min(127, int(127 * v)))
    track('Lead', 0, 68, [(s, d, m + 12, 100) for s, d, m in melody])      # oboe-ish, an octave up: the gralla's register
    track('Chords', 1, 89, [(s, e - s, m, 60) for s, e, c in chords for m in voicing(c, 55)])
    track('Brass', 4, 61, [(s, 0.25, m, 90) for s, c in stabs for m in voicing(c, 57)])
    track('Bass', 2, 38, [(s, d, m, 100) for s, d, m in bass])
    track('Taiko', 3, 116, [(s, 0.25, 48 if k == 'don' else 60, vel(v)) for k in ('don', 'ka') for s, v in hits[k]])
    GM = dict(kick=36, snare=38, clap=39, hat=42, ohat=46, crash=49, tamb=54, cowbell=56, shaker=70)
    track('Drums', 9, None, [(s, 0.25, GM[k], vel(v)) for k in GM for s, v in hits[k]])
    mid.save('public/music/drac-taiko.mid')
    json.dump({'bpm': BPM, 'offset': LEAD_IN, 'beats_per_bar': tl['beatsPerBar'], 'end_beat': END,
               'tempo_us': [[k, u] for k, u in enumerate(US) if k == 0 or u != US[k - 1]],   # [beat, microseconds a quarter] from there
               'arrangement': ARR, 'balloons': BALLOONS,
               'melody': [[round(s, 3), round(d, 3), m] for s, d, m in melody],
               'don': sorted(round(s, 3) for s, _ in hits['don']), 'ka': sorted(round(s, 3) for s, _ in hits['ka'])},
              open('music/drac-arrangement.json', 'w'), separators=(',', ':'))

    # ------------------------------------------------------------------ checks + game chart
    assert taps[0][0] == ev.PICK0 and taps[0][2] == 0, taps[0]
    assert all(b[0] - a[0] >= 0.5 - 1e-9 for a, b in zip(taps, taps[1:])), [(a, b) for a, b in zip(taps, taps[1:]) if b[0] - a[0] < 0.5]
    onsets = {round(s, 4) for s, _, _ in melody}
    assert all(round(s, 4) in onsets for s, *_ in taps if s < END), 'taps must be melody notes'
    bigs = [(s, k, lv) for s, k, lv, bg, _ in taps if bg]
    assert {s for s, *_ in bigs} == BIG | ev.HARD_BIG | {END} and all(lv == (2 if s in ev.HARD_BIG else 0) for s, _, lv in bigs), bigs
    assert not [s for s, *_ in bigs if any(a <= s < b for a, b in BALLOONS)], 'GUAPA inside a balloon'
    assert all(10 <= sum(lv <= d for *_, lv in bigs) <= 16 for d in range(3)), bigs
    for s, k, lv, bg, he in taps:
        if he: assert not bg and lv == 0 and he - s >= 2 and not any(s < b and he > a for a, b in BALLOONS), (s, he)
    for d in range(3):
        ks = [k for _, k, lv, *_ in taps if lv <= d]
        assert min(ks.count('don'), ks.count('ka')) > 0.3 * len(ks), (d, ks.count('don'), ks.count('ka'))
    sect = [[0, 'A']] + [[s, 'B' if style_ in ('C', 'D', 'C3', 'D3') else 'A'] for _, s, style_ in layout if _ in (16, 24, 40) or _ == 9 or _ == 1]
    sect = [x for i, x in enumerate(sect) if i == 0 or x[1] != sect[i - 1][1]]
    song = {'bpm': BPM, 'duration': round(N / SR, 3), 'end': round(sec(END), 3), 'tail': round(sec(END) + 2.5, 3),
            'finale': round(sec(tl['finale']), 4),
            'sections': [[round(sec(b), 3), k] for b, k in sect],
            'beats': [round(sec(b), 4) for b in range(END + 1)],
            'balloons': BALLOONS, 'arrangement': ARR,
            'notes': [[round(sec(s), 4), k, lv, bg, round(sec(he), 4) if he else 0] for s, k, lv, bg, he in taps]}
    # the recording's clock: the compiler's song seconds are this file's sec() (one clock), kept to the beats' precision
    assert all(abs(sec(b) - s) < 1e-9 for (b, _), (s, _) in zip(tl['refAnchors'], tl['ref'])), 'the reference map is on the audio clock'
    song['ref'] = [[round(s, 4), r] for s, r in tl['ref']]
    song['refEnd'] = tl['refEnd']
    assert all(b[0] > a[0] and b[1] > a[1] for a, b in zip(song['ref'], song['ref'][1:])), 'ref rises in both'

    # ------------------------------------------------------------------ menu ambience: an entrance, then a 32-beat loop
    AMB, INTRO_BEATS = 32, 8
    LOOP, INTRO_N = int(AMB * SPB * SR), int(INTRO_BEATS * SPB * SR)
    amb = {k: np.zeros((LOOP + 5 * SR, 2)) for k in ('pad', 'bass', 'chords', 'melody', 'drums')}
    ab = lambda b: b * SPB
    PAIRS = [(2, 3, 'G'), (4, 5, 'G'), (2, 3, 'D'), (4, 8, 'G'), (9, 10, 'D'), (4, 5, 'C'), (2, 3, 'G'), (4, 8, 'G')]
    amb_voices = {'G': (55, 59, 62), 'D': (54, 57, 62), 'C': (55, 60, 64)}
    touch = (0.96, 1.0, 1.02, 0.94, 0.98, 1.03, 1.0, 0.92)
    for i, (b1, b2, c) in enumerate(PAIRS):
        t0 = i * 4
        tt = t0
        for bar in (b1, b2):
            for m, d in score[bar]:
                if m is not None and d >= 0.5:
                    put(amb['melody'], ab(tt) + 0.006, nylon(hz(m), min(d * SPB, 1.2), 0.24, 1.5) * 0.052 * touch[i], -0.15)
                tt += d
        for det, pan, m in ((-6, -0.9, 0), (6, 0.9, 0)):
            for vi, vm in enumerate(amb_voices[c]):
                w, t_ = additive(hz(vm), 4 * SPB + 0.06, 2.2, 0.5, det)
                put(amb['pad'], ab(t0), w * adsr(t_, 4 * SPB + 0.06, 0.22, 0.12) * 0.01, pan)
        root = CH[c][0]; root += 36 if root < 8 else 24
        for b in (0, 2):
            m = root if b == 0 else root + 7
            w, t_ = additive(hz(m), 0.42, 1.8, 3.0)
            put(amb['bass'], ab(t0 + b) + 0.004, (0.6 * w + 0.6 * np.sin(2 * np.pi * hz(m) * t_)) * adsr(t_, 0.42, 0.014, 0.08, 0.6, 0.1) * 0.11 * touch[i])
        for b in (1, 3):
            for j, vm in enumerate(amb_voices[c]):
                put(amb['chords'], ab(t0 + b) + 0.009 + 0.012 * j, nylon(hz(vm), 0.38, 0.3, 2.0) * 0.065 * touch[i], (-0.35, 0.05, 0.35)[j])
    for beat in range(AMB):
        g = touch[(beat // 4) % 8]
        put(amb['drums'], ab(beat), lp(perc('don' if beat % 2 == 0 else 'clap', (0.4 if beat % 2 == 0 else 0.2) * g), 0.7) * (0.4 if beat % 2 == 0 else 1), -0.1)
        for h in (0, 0.5):
            put(amb['drums'], ab(beat + h), lp(perc('shaker', (0.25 if h == 0 else 0.18) * g), 0.45), 0.35)
    entrance, steady = np.zeros((INTRO_N, 2)), np.zeros((LOOP, 2))
    entry = dict(drums=(0, 4), pad=(1, 5), bass=(2, 6), chords=(3, 7))
    for k, dry_amb in amb.items():
        w_ = np.stack([fftconvolve(dry_amb[:, c], ir[:, c])[:len(dry_amb)] for c in range(2)], 1)
        rendered = dry_amb + w_ * (0.5 if k in ('pad', 'melody', 'chords') else 0.15)
        rendered[:len(rendered) - LOOP] += rendered[LOOP:]
        steady += rendered[:LOOP]
        if k in entry:
            a, b = entry[k]
            fade = np.clip((np.arange(INTRO_N) / SR / SPB - a) / (b - a), 0, 1)
            fade = fade * fade * (3 - 2 * fade)
            entrance += rendered[LOOP - INTRO_N:LOOP] * fade[:, None]
    level = 0.075 / np.sqrt((steady ** 2).mean())
    loop = np.concatenate([entrance, steady, steady[:SR]]) * level
    loop = np.tanh(loop * 1.3) / 1.3
    assert np.abs(loop).max() < 0.7, np.abs(loop).max()
    assert np.max(np.abs(loop[INTRO_N - 1] - loop[INTRO_N])) < 0.03 and np.max(np.abs(loop[INTRO_N + LOOP - 1] - loop[INTRO_N])) < 0.03, 'seam'
    sf.write('tmp/audio/drac-ambient.wav', loop.astype(np.float32), SR, subtype='PCM_16')
    for src, dst, br in (('tmp/audio/drac-taiko.wav', 'public/music/drac-taiko.mp3', '160k'),
                         ('tmp/audio/drac-ambient.wav', 'public/music/drac-taiko-ambient.mp3', '192k')):
        mp3(src, dst, br)
    ver = lambda f: hashlib.sha1(open(f, 'rb').read()).hexdigest()[:10]
    song['audio'] = f"music/drac-taiko.mp3?v={ver('public/music/drac-taiko.mp3')}"
    song['ambient'] = f"music/drac-taiko-ambient.mp3?v={ver('public/music/drac-taiko-ambient.mp3')}"
    song['ambientLoop'] = dict(start=INTRO_N / SR, end=(INTRO_N + LOOP) / SR, beats=AMB)
    json.dump(song, open('src/song-drac.json', 'w'), separators=(',', ':'))
    per = [(sum(lv <= d and k == 'don' for _, k, lv, *_ in taps), sum(lv <= d and k == 'ka' for _, k, lv, *_ in taps)) for d in range(3)]
    print(VARIANT, 'duration', round(N / SR, 1), 's  end beat', END, ' melody notes', len(melody), ' taps per level (don/ka)', per,
          ' holds', sorted(HOLD.items()), ' big', sorted(BIG | {END}), ' DIFÍCIL big', sorted(ev.HARD_BIG), ' balloons', BALLOONS)


if __name__ == '__main__':
    main()
