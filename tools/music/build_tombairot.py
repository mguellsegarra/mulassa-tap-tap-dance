"""El Tombairot's song: «Aligot», pasdoble by Manel Sederra i Puigferrer, adapted for three gralles by Els Vernets
(Josep Sanz's archive). Score, form, tempo map, chart and audio in one place; music/tombairot/README.md has the sources.

Inputs: music/tombairot/aligot.mxl (the three voices; the PDF next to it rules where they differ, see CORRECTIONS).
2/4, one beat = one quarter; the gralles as written (no transposition, as the Bou), the gralla baixa an octave lower (the MXL says so). Never a fixed BPM:
the tempo map (TEMPO) gives every beat its own length and the game reads the grid (song.beats).
Outputs: src/song-tombairot.json (the game's contract, the Bou's keys), public/music/tombairot-aligot.mp3 (the game's mix,
the default VERSION), music/tombairot/timing.json (phrase map, tempo knots, the tune in beats and seconds) and, for tools/dev/tombairot-music.html only, output/tombairot-music/ (gitignored): the plain
reference melody and each voice alone (the whole form, 120, no ornaments), and the festive mix of every VERSION.
Run: uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/music/build_tombairot.py [--json-only]
"""
import hashlib
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from synth import SR, hz, put, additive, adsr, nylon, perc, swell  # the Drac's sounds: the same lead as the Mulassa's and the Drac's
from build_drac import reverb_ir, master  # and its room and master

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / 'music/tombairot'
PREVIEW = ROOT / 'output/tombairot-music'
MP3 = 'tombairot-aligot.mp3'
FIGURE = 'tombairot-valls'  # provisional: the catalogue entry is the integration's
REVISION = 1
SUB = 12  # the grid's subdivisions a beat, as the Bou's (sixteenths and dotted eighths land on it)

# The PDF rules over its MusicXML export: bar 45, Gralla 1 prints fa (over re/la, as bars 40-41), the MXL says mi.
CORRECTIONS = {(45, 0): {76: 77}}

# The unfolded form, phrase by phrase (source bars). Identical phrases share a group: the preview's selector.
PHRASES = {
    'I':  ('Introducció', list(range(1, 9))),
    'A1': ('A, 1a volta', list(range(9, 25))),
    'A2': ('A, 2a volta', list(range(9, 22)) + [25, 26, 27]),
    'I2': ('Introducció, represa', list(range(28, 36))),
    'B1': ('B, 1a volta', list(range(36, 44))),
    'B2': ('B, 2a volta', list(range(36, 42)) + list(range(44, 51))),
    'T1': ('Trio, 1a volta', list(range(51, 83))),
    'T2': ('Trio, 2a volta (final)', list(range(51, 81)) + [83, 84]),
}
GROUPS = [('Introducció', ['I', 'I2']), ('A', ['A1', 'A2']), ('B', ['B1', 'B2']), ('Trio', ['T1', 'T2'])]
VERSIONS = {
    'complet': ['I', 'A1', 'A2', 'I2', 'B1', 'B2', 'T1', 'T2'],   # the score with every repeat: too long (~2:20)
    'v1': ['I', 'A1', 'A2', 'I2', 'B1', 'B2', 'T2'],               # every repeat but the trio's: straight to its ending
    'v2': ['I', 'A1', 'A2', 'I2', 'B2', 'T2'],                     # and B once
    'v3': ['I', 'A2', 'I2', 'B1', 'B2', 'T2'],                     # A once (its second ending), B twice
}
VERSION = 'v1'  # provisional default, the owner chooses (tools/dev/tombairot-music.html)
INTRO = 8  # beats of the figure's own drum intro after BALLA!, as the Bou's: the first note at 4 s
# bpm at each phrase's start, linear in between: the pasdoble at the score's 120, pushing a little from the represa
# to the trio, 126 on the last note. Energy builds; never a jump.
TEMPO = {'I': 120, 'A1': 120, 'A2': 120, 'I2': 121, 'B1': 122, 'B2': 122, 'T1': 124, 'T2': 124}
END_BPM = 126


# ------------------------------------------------------------------ the score
def read_score():
    """{bar: [voice 0, 1, 2]}, each a list of [onset (beats in the bar), beats, midi or None, tie start, tie stop]."""
    with zipfile.ZipFile(PKG / 'aligot.mxl') as z:
        root = ET.fromstring(z.read('score.xml'))
    STEP = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    bars = {}
    for v, part in enumerate(root.findall('part')):
        div, shift = 1, 0
        for m in part.findall('measure'):
            n, at, notes = int(m.get('number')), 0, []
            for el in m:
                if el.tag == 'attributes' and el.findtext('divisions'): div = int(el.findtext('divisions'))
                if el.tag == 'attributes' and el.find('transpose') is not None:  # the gralla baixa sounds an octave below its notes
                    tr = el.find('transpose')
                    shift = int(tr.findtext('chromatic') or 0) + 12 * int(tr.findtext('octave-change') or 0)
                if el.tag != 'note': continue
                assert el.find('chord') is None and el.find('grace') is None, f'bar {n}: one line a voice'
                d = int(el.findtext('duration')) / div
                p = el.find('pitch')
                midi = None if p is None else 12 * (int(p.findtext('octave')) + 1) + STEP[p.findtext('step')] + int(p.findtext('alter') or 0)
                midi = CORRECTIONS.get((n, v), {}).get(midi, midi)  # written pitch
                midi = None if midi is None else midi + shift  # sounding pitch
                notes.append([at, d, midi, el.find('tie[@type="start"]') is not None, el.find('tie[@type="stop"]') is not None])
                at += d
            assert abs(at - 2) < 1e-9, f'bar {n} voice {v}: {at} beats'
            bars.setdefault(n, [[], [], []])[v] = notes
    assert sorted(bars) == list(range(1, 85))
    return bars


def unfold(bars, order):
    """The form as played: bars [(source bar, phrase, beat)], voices [[beat, beats, midi, source bar]] (ties joined),
    phrase starts {phrase: beat}. Beat 0 = the song's first beat; the tune starts after the drum intro."""
    seq, voices, starts, b = [], [[], [], []], {}, INTRO
    for ph in order:
        starts[ph] = b
        for n in PHRASES[ph][1]:
            seq.append((n, ph, b))
            for v in range(3):
                for at, d, m, _, stop in bars[n][v]:
                    if m is None: continue
                    last = voices[v][-1] if voices[v] else None
                    if stop and last and last[2] == m and abs(last[0] + last[1] - (b + at)) < 1e-9: last[1] += d
                    else: voices[v].append([b + at, d, m, n])
            b += 2
    # The festive close (the arrangement's, not the score's): bar 84's rest leads up sol-si to a last do, held and faded.
    voices[0] += [[b - 1, 0.5, 67, 0], [b - 0.5, 0.5, 71, 0], [b, 2, 72, 0]]
    # and under the drum intro the bass pulses mi, bar 1's own bass note (no guessed harmony)
    voices[2][:0] = [[i, 1, 40 if i % 2 == 0 else 52, 0] for i in range(INTRO)]
    voices[2] += [[b, 2, 48, 0]]
    seq.append((0, 'coda', b))
    return seq, voices, starts, b


def tempo_grid(starts, final, order):
    """Seconds at every 1/12 beat up to two beats after the final do (TEMPO knots, linear bpm between them)."""
    knots = [(0, TEMPO[order[0]])] + [(starts[p], TEMPO[p]) for p in order] + [(final, END_BPM)]
    xs, ys = zip(*knots)
    sub = np.arange((final + 4) * SUB) / SUB
    bpm = np.interp(sub + 0.5 / SUB, xs, ys)
    return np.r_[0, np.cumsum(60 / bpm / SUB)]


# ------------------------------------------------------------------ the chart
def chart(seq, voices, starts, final, order, sec):
    """[t, don|ka, level, big, holdEnd] per tap, like the Bou's. Every tap is a melody note (voice 0).
    FÀCIL: one a bar, its first note on a beat (or its first eighth when it starts off the beat); NORMAL: every note on
    a beat (every eighth when none is); DIFÍCIL: every note on the eighth grid but the opening fanfare's repeated
    off-beat mi. Sixteenths stay in the audio."""
    by_bar = {}
    for e in voices[0]: by_bar.setdefault(INTRO + 2 * ((e[0] - INTRO) // 2), []).append(e)
    level = {}
    for b0, notes in by_bar.items():
        pos = lambda e: e[0] - b0
        eighth = [e for e in notes if abs(pos(e) * 2 - round(pos(e) * 2)) < 1e-9]
        beat = [e for e in eighth if abs(pos(e) - round(pos(e))) < 1e-9]
        for e in eighth: level[e[0]] = 2
        if b0 < starts[order[1]]:  # the opening fanfare: DIFÍCIL starts lighter, its off-beat repeated mi come with the represa
            for e in eighth:
                prev = next((p for p in reversed(voices[0]) if p[0] < e[0]), None)
                if pos(e) % 1 and prev and prev[2] == e[2]: del level[e[0]]
        for e in (beat or eighth): level[e[0]] = 1
        if eighth: level[(beat or eighth)[0][0]] = 0
    taps = [dict(beat=e[0], beats=e[1], pitch=e[2], level=level[e[0]]) for e in voices[0] if e[0] in level]
    # GUAPA: each phrase's first note, the trio's inner phrases (bars 59, 67, 75: the finale) and the last do
    big = {next(e[0] for e in voices[0] if e[0] >= starts[p]) for p in order}
    big |= {b for n, p, b in seq if n in (59, 67, 75) and p == order[-1]}
    big.add(final)
    for t in taps:
        t['big'] = t['beat'] in big
        if t['big']: assert t['level'] == 0, f'GUAPA on beat {t["beat"]} is not a FÀCIL note'
    # MANTÉN (NORMAL and DIFÍCIL): a note of two beats or more, held as it sounds up to a beat before the next tap
    for i, t in enumerate(taps):
        nxt = taps[i + 1]['beat'] if i + 1 < len(taps) else 1e9
        end = min(t['beat'] + t['beats'], nxt - 1)
        t['end'] = end if t['level'] <= 1 and not t['big'] and t['beats'] >= 2 and end - t['beat'] >= 1 else 0
    # sides follow the tune: up -> PA (ka), down -> GUA (don), same -> keep; at most 4 on one side in any level
    last = None
    for t in taps:
        t['side'] = 'don' if last is None else 'ka' if t['pitch'] > last['pitch'] else 'don' if t['pitch'] < last['pitch'] else last['side']
        last = t
    for lvl in range(3):
        for guard in range(1000):
            run, flip = [], None
            for t in taps:
                if t['level'] > lvl or t['big']:
                    if t['big']: run = []
                    continue
                run = run + [t] if run and run[0]['side'] == t['side'] else [t]
                if len(run) > 4: flip = next(m for m in reversed(run) if m['level'] == lvl); break
            if not flip: break
            flip['side'] = 'ka' if flip['side'] == 'don' else 'don'
        else: raise AssertionError('side runs do not settle')
    r4 = lambda x: round(x, 4)
    return taps, [[r4(sec(t['beat'])), t['side'], t['level'], int(t['big']), r4(sec(t['end'])) if t['end'] else 0] for t in taps]


# ------------------------------------------------------------------ the arrangement
# drums: 8 sixteenth steps a 2/4 bar, per phrase; 'x' full, 'o' soft. The pasdoble's oom-pah: low on the beats, snare
# between. The fanfare light, a kick on the downbeat from the represa, four on the floor only in the trio.
PAT = {
    'I':  {'tim': 'x...x...', 'shaker': 'oooooooo'},
    'A':  {'tim': 'x...x...', 'snare': '..o...o.', 'shaker': 'oooooooo'},
    'I2': {'kick': 'x.......', 'tim': 'x...x...', 'snare': '..o...o.', 'tamb': '..x...x.', 'shaker': 'oooooooo'},
    'B':  {'kick': 'x.......', 'tim': 'x...x...', 'clap': '..x...x.', 'hat': 'o.o.o.o.', 'shaker': 'oooooooo'},
    'T':  {'kick': 'x...x...', 'clap': '....x...', 'ohat': '..x...x.', 'hat': 'o.o.o.o.', 'tamb': '..o...o.', 'shaker': 'oooooooo'},
    'F':  {'kick': 'x...x...', 'clap': '....x...', 'ohat': '..x...x.', 'hat': 'oooooooo', 'tamb': 'o.o.o.o.', 'cowbell': 'x...x...'},
}
STYLE = {'I': 'I', 'A1': 'A', 'A2': 'A', 'I2': 'I2', 'B1': 'B', 'B2': 'B', 'T1': 'T', 'T2': 'T'}
PAN = {'kick': 0, 'snare': 0.05, 'clap': -0.1, 'hat': 0.35, 'ohat': 0.35, 'shaker': 0.55, 'tamb': -0.45, 'cowbell': -0.3,
       'crash': -0.3, 'don': -0.15, 'ka': 0.3, 'tim': 0.1}
BUS = dict(don='taiko', ka='taiko', shaker='perc', tamb='perc', cowbell='perc', tim='taiko')
OUT_GAIN = 10 ** (-2.0 / 20)  # the busier band at the Drac's and the Mulassa's loudness (-14.5 LUFS), not 2 dB over
GAIN = dict(lead=0.36, second=0.10, bass=0.22, drums=0.45, perc=1.1, taiko=0.5)


def kick(v):
    """The Drac's kick plus the Bou's mid-bass beater (205 Hz falling): heard on a phone's speaker, not only as sub."""
    x = perc('kick', 1.0)
    t = np.arange(len(x)) / SR
    ph = 2 * np.pi * np.cumsum(205 + 125 * np.exp(-t / 0.012)) / SR
    body = (np.sin(ph) + 0.32 * np.sin(2 * ph) + 0.16 * np.sin(3 * ph)) * np.exp(-t / 0.06) * np.minimum(1, t / 0.0015)
    return v * (x + 0.8 * body)


def hits_of(seq, starts, final, order, taps, balloon):
    hits = []  # (beat, kind, velocity)
    finale = next(b for n, p, b in seq if n == 75 and p == order[-1])
    for n, ph, b in seq:
        if ph == 'coda': continue
        style = 'F' if b >= finale else STYLE[ph]
        if balloon[0] <= b < balloon[1]: continue
        for kind, s in PAT[style].items():
            for i, c in enumerate(s):
                if c != '.': hits.append((b + i / 4, kind, 1.0 if c == 'x' else 0.5))
        if b == starts[ph]: hits.append((b, 'crash', 0.8))
        if n == 47: hits += [(b + i / 8, 'snare', 0.25 + 0.5 * i / 16) for i in range(16)]  # the tune rests: a fill
    # the drum intro: as the Bou's, louder towards BALLA!'s first note; shaker, off-beat hats, tambourine, timbal
    # (at the tune's level, not a soft second count-in: the Bou's had to be raised 3.2x)
    for i in range(INTRO):
        rise = (i + 1) / INTRO
        hits += [(i + o, 'shaker', 1.0 + 1.0 * rise) for o in (0.25, 0.75)]
        hits += [(i, 'tim', 0.8 + 0.6 * rise), (i, 'don', 0.35 + 0.45 * rise)]
        if i >= 2: hits.append((i + 0.5, 'hat', 1.0 + 1.0 * rise))
        if i >= 4 and i % 2: hits.append((i, 'tamb', 1.2 + 0.6 * rise))
    hits += [(INTRO - 1 + i / 8, 'snare', 0.6 + 0.6 * i / 8) for i in range(8)]
    # the taiko doubles the chart from NORMAL down: the drum the player hears is the note to tap
    for t in taps:
        if t['level'] <= 1 and not (balloon[0] <= t['beat'] < balloon[1]):
            hits.append((t['beat'], t['side'], 0.8 if t['side'] == 'don' else 0.6))
    # the GLOBUS: a festive roll up to the last do, then the final hit
    a, z = balloon
    hits += [(a + i / 8, 'snare', (0.35 + 0.65 * i / ((z - a) * 8)) * 0.8) for i in range(int((z - a) * 8))]
    hits += [(a + i / 4, 'don', 0.3 + 0.7 * i / ((z - a) * 4)) for i in range(int((z - a) * 4))]
    hits += [(a, 'swell', z - a), (final, 'crash', 1.0), (final, 'don', 1.0), (final, 'kick', 1.0)]
    return hits


def render(voices, hits, sec, final, plain=None):
    """The festive mix (plain=None) or, for the preview, the given voices alone on the lead's tone, dry."""
    N = int((sec(final + 2) + 2.0) * SR)
    stem = {k: np.zeros((N, 2)) for k in ('lead', 'second', 'bass', 'drums', 'perc', 'taiko')}
    span = lambda b, d: sec(b + d) - sec(b)
    for s, d, m, _ in voices[0] if plain is None else []:
        dur = max(0.05, span(s, d) - 0.02)
        if s == final: dur = span(s, 2)  # the last do: the same voice, a plain fade over two beats
        for det, pan, g in ((0, 0, 1.0), (7, -0.5, 0.3), (-7, 0.5, 0.3)):
            w, t = additive(hz(m), dur + 0.12, 1.15, 0.35, det, 0.004 if d >= 2 else 0.0)
            env = adsr(t, dur + 0.12, 0.008, 0.12, 0.8, 0.25)
            if s == final: env = env * np.clip(1 - t / (dur + 0.12), 0, 1) ** 1.5
            put(stem['lead'], sec(s), w * env * g, pan)
    for v in (plain or []):
        for s, d, m, _ in voices[v]:
            dur = max(0.05, span(s, d) - 0.02)
            w, t = additive(hz(m), dur + 0.08, 1.15, 0.35)
            put(stem['lead'], sec(s), w * adsr(t, dur + 0.08, 0.008, 0.08, 0.8, 0.25), (0, -0.4, 0.4)[v] if len(plain) > 1 else 0)
    if plain is not None:
        out = stem['lead'] / max(1e-9, np.abs(stem['lead']).max()) * 0.7
        return out
    for s, d, m, _ in voices[1]:  # Gralla 2: the same tune's harmony, darker and well under the lead
        dur = max(0.05, span(s, d) - 0.02)
        w, t = additive(hz(m), dur + 0.1, 1.7, 0.6)
        put(stem['second'], sec(s), w * adsr(t, dur + 0.1, 0.012, 0.1, 0.7, 0.2), -0.35)
    for s, d, m, _ in voices[2]:  # Gralla baixa, as it sounds (an octave under its notes): the bass, the score's own line
        dur = max(0.05, span(s, d) - 0.015)
        w, t = additive(hz(m), dur + 0.03, 1.6, 3.0)
        w = 0.8 * w + 0.6 * np.sin(2 * np.pi * hz(m) * t)
        put(stem['bass'], sec(s), w * adsr(t, dur + 0.03, 0.004, 0.03, 0.75, 0.12))
    kicks = []
    for b, kind, v in hits:
        if kind == 'swell': put(stem['drums'], sec(b), swell(v, span(b, v) / v)); continue
        x = kick(v) if kind == 'kick' else perc(kind, v)
        if kind == 'kick': kicks.append(b)
        put(stem[BUS.get(kind, 'drums')], sec(b), x, PAN.get(kind, 0))
    duck = np.ones(N)
    for b in kicks:
        i = int(sec(b) * SR); n = min(int(0.25 * SR), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.3 * np.exp(-np.arange(n) / SR / 0.08))
    stem['bass'] *= duck[:, None]; stem['second'] *= duck[:, None]
    dry = sum(stem[k] * g for k, g in GAIN.items())
    send = stem['lead'] * 0.30 + stem['second'] * 0.04 + stem['drums'] * 0.08 + stem['perc'] * 0.06
    mix = master(dry, send, reverb_ir(), N) * OUT_GAIN
    fade = int(1.5 * SR)  # whatever rings after the last do's fade goes in 1.5 s: nothing rings for seconds
    tail = int((sec(final + 2) + 0.5) * SR)
    mix[tail:tail + fade] *= np.linspace(1, 0, fade)[:, None][:len(mix) - tail]
    mix[tail + fade:] = 0
    return mix


def mp3(mix, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    wav = path.with_suffix('.wav')
    sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '192k', str(path)], check=True)
    wav.unlink()


# ------------------------------------------------------------------ the song
def build(bars, order):
    seq, voices, starts, final = unfold(bars, order)
    ST = tempo_grid(starts, final, order)
    sec = lambda b: float(np.interp(b * SUB, np.arange(len(ST)), ST))
    taps, notes = chart(seq, voices, starts, final, order, sec)
    bar83 = next(b for n, p, b in seq if n == 83)
    balloon = (bar83, final)  # the GLOBUS: bars 83-84, the trio's last cadence, mashed up to the final do
    return dict(seq=seq, voices=voices, starts=starts, final=final, ST=ST, sec=sec, taps=taps, notes=notes, balloon=balloon,
                hits=hits_of(seq, starts, final, order, taps, balloon))


def song_json(s, order, audio_sha):
    sec, seq, ST = s['sec'], s['seq'], s['ST']
    r4, r6 = (lambda x: round(x, 4)), (lambda x: round(x, 6))
    at_bar = lambda n, ph=None: next(b for m, p, b in seq if m == n and (ph is None or p == ph))
    finale = at_bar(75, order[-1])  # the trio's last phrase: the FINAL ESBOJARRAT
    trio = s['starts'][next(p for p in order if p.startswith('T'))]
    B = next(p for p in order if p.startswith('B'))
    duration = sec(s['final'] + 2) + 2.0
    beats = [r4(sec(b)) for b in range(s['final'] + 5)]
    return {
        'figure': FIGURE, 'revision': REVISION,
        'bpm': TEMPO[order[0]],  # the opening tempo only: the grid below changes phrase by phrase
        'duration': r4(duration),
        'end': r4(sec(s['final'])),  # the last do: the last tap
        'tail': float(np.floor(duration * 10) / 10),
        'finale': r4(sec(finale)),
        'sections': [[0, 'A'], [r4(sec(s['starts'][B])), 'B'], [r4(sec(trio)), 'A'], [r4(sec(finale)), 'B']],
        'beats': beats,
        'balloons': [list(s['balloon'])],
        'easyHolds': False,
        'notes': s['notes'],
        'audio': f'music/{MP3}?v={audio_sha[:12]}',
        # the dance's landmarks: the first note, the trio (four on the floor), the finale, bars [source bar, beat, s]
        # (0 = the arrangement's close) and the 1/12-beat grid
        'dance': {'melodyStart': r6(sec(INTRO)), 'technoStart': r6(sec(trio)), 'finaleCandidate': r6(sec(finale)),
                  'bars': [[n, b, r6(sec(b))] for n, _, b in seq], 'subdivision': SUB,
                  'subdivisionTimes': [r6(x) for x in ST[:len(beats) * SUB - SUB + 1]]},
    }


def main():
    bars = read_score()
    order = VERSIONS[VERSION]
    s = build(bars, order)
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    out = ROOT / 'public/music' / MP3
    if '--json-only' not in sys.argv:
        mp3(render(s['voices'], s['hits'], s['sec'], s['final']), out)
        # the preview's: every version's mix, and the plain score (whole form, every repeat, 120 flat, no drum intro)
        for name, o in VERSIONS.items():
            v = build(bars, o)
            mp3(render(v['voices'], v['hits'], v['sec'], v['final']), PREVIEW / f'mix-{name}.mp3')
            json.dump({'phrases': [[p, PHRASES[p][0], round(v['sec'](v['starts'][p]), 3)] for p in o],
                       'end': round(v['sec'](v['final']), 3), 'duration': round(v['sec'](v['final'] + 2) + 2, 3)},
                      open(PREVIEW / f'mix-{name}.json', 'w'))
        full = build(bars, VERSIONS['complet'])
        flat = lambda b: (b - INTRO) * 0.5
        voices = [[e for e in vs if e[3]] for vs in full['voices']]  # the score only, not the arrangement's close
        for name, plain in (('melodia', [0]), ('veu-1', [0]), ('veu-2', [1]), ('veu-3', [2]), ('trio', [0, 1, 2])):
            if name == 'veu-1': continue  # the same file as the melody
            mp3(render(voices, [], flat, INTRO + 2 * 133, plain), PREVIEW / f'{name}.mp3')
    # the phrase map and the tune on the game's clock: what the chart test checks and the dance can read
    sec, r4 = s['sec'], (lambda x: round(x, 4))
    timing = {'version': VERSION, 'order': order, 'versions': VERSIONS, 'groups': GROUPS, 'introBeats': INTRO,
              'tempo': {'knots': [[s['starts'][p], TEMPO[p]] for p in order] + [[s['final'], END_BPM]], 'linear': True},
              'phrases': [{'id': p, 'label': PHRASES[p][0], 'bars': PHRASES[p][1], 'beat': s['starts'][p], 'time': r4(sec(s['starts'][p]))} for p in order],
              'melody': [[b, d, m, n, r4(sec(b)), r4(sec(b + d))] for b, d, m, n in s['voices'][0]],
              'finalBeat': s['final']}
    (PKG / 'timing.json').write_text(json.dumps(timing, ensure_ascii=False) + '\n')
    song = song_json(s, order, sha(out) if out.exists() else '0' * 64)
    (ROOT / 'src/song-tombairot.json').write_text(json.dumps(song, separators=(',', ':')) + '\n')
    per = [sum(1 for n in s['notes'] if n[2] <= l) for l in range(3)]
    print(f'{VERSION}: {len(order)} phrases, end {song["end"]} s, duration {song["duration"]} s, taps per level {per}, '
          f'big {sum(n[3] for n in s["notes"])}, holds {sum(1 for n in s["notes"] if n[4])}, balloon beats {s["balloon"]}')


if __name__ == '__main__':
    main()
