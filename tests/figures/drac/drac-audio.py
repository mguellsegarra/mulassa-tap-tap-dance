"""Rendered melodic note-off regression. Run with numpy/scipy in the generator environment."""
import copy
import json
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'tools' / 'music'))
from synth import SR, glock, hz, note_gate

import build_drac

# The production event path (form -> compiled timeline -> events), without synthesis or writing generated files.
ns = build_drac.build_events(build_drac.compile_timeline()[1])
assert not any(abs(s - 91.75) < 1e-8 for s, _ in ns.arp), 'the added F# must not attack against written G'
assert ns.arp, 'keep decorative notes that do not conflict'
# Slider beat92 is printed bar34, D5 written -> A4 sounding (gralla in G).
# Its preceding G must stop, rather than ringing over the new A.
assert any(abs(s - 92) < 1e-8 and d == 1 and m == 69 for s, d, m in ns.melody)
assert any(abs(s - 91.75) < 1e-8 and d == .25 and m == 67 for s, d, m in ns.melody)
for s, pitch in ns.arp:
    assert not any(a < s + .25 - 1e-8 and a + d > s + 1e-8 and (pitch - m) % 12 in (1, 11)
                   for a, d, m in ns.melody), 'inspect melody attacks inside an arpeggio step'

# Execute the actual production synthesis loops on tiny isolated fixtures. This catches
# deleting a gate at its call site, unlike testing the helper alone. No output is written.
def render(melody, arp):
    ev = SimpleNamespace(melody=melody, arp=arp, chords=[], stabs=[], bass=[],
                         sec=lambda b: .4 * b, span=lambda s, d: .4 * d, style_of=lambda b: 'D')
    return build_drac.render_stems(ev, SR)

# Printed bar33: a G5 sixteenth followed immediately by F#5. A fixed 1.4s bell
# leaves a strong obsolete G ringing over F#. Verify samples, not just event durations.
written = 0.25 * 60 / 126
old = glock(hz(79))
fixed = note_gate(old, written)
boundary = round(written * SR)
assert np.sqrt(np.mean(old[boundary:boundary + 1000] ** 2)) > 0.4, 'fixture reproduces the sustained old pitch'
assert len(fixed) <= boundary and fixed[-1] == 0, 'old pitch ends smoothly before the next attack'
fade = round(0.015 * SR)
assert np.array_equal(fixed[:-fade], old[:len(fixed) - fade]), 'retain the bell attack and body'
assert abs(fixed[-2]) < 0.003, 'release reaches silence without a hard cutoff'

# Faster sixteenths and triplets must obey real note-offs too; long ending bells
# can decay naturally rather than being forced to the shortest-note envelope.
for duration in (60 / 148 / 4, 60 / 148 / 6, 60 / 126 / 6, 7 * 60 / 135):
    rendered = note_gate(old, duration)
    assert len(rendered) <= round(duration * SR)
    assert rendered[-1] == 0 and np.isfinite(rendered).all()
assert len(note_gate(old, 3)) == len(old), 'preserve natural sustained ending length'

rendered = render([[0, written / .4, 67]], [])
assert np.sqrt(np.mean(rendered['bell'][:boundary - fade] ** 2)) > .1, 'production bell attack remains audible'
assert np.count_nonzero(rendered['bell'][boundary:]) == 0, 'production bell cannot retain obsolete pitch'
assert np.sqrt(np.mean(rendered['lead'][boundary:boundary + round(.06 * SR)] ** 2)) > .01, 'preserve the accepted lead release/legato'
assert np.count_nonzero(rendered['lead'][boundary + round(.101 * SR):]) == 0, 'lead release stays bounded; not the old 1.4-second bell tail'
rendered = render([], [(0, 79)])
step_end = round(.4 * .25 * SR)
assert np.count_nonzero(rendered['arp'][:step_end]) > 0
assert np.count_nonzero(rendered['arp'][step_end:]) == 0, 'arpeggio duration follows tempo rather than fixed seconds'
# EDITED forms through the same path as the generator (compile_timeline(path) -> build_events): no synthesis.
form0, tl0 = build_drac.compile_timeline()


def events_of(edit):
    f = copy.deepcopy(form0)
    edit(f)
    with tempfile.NamedTemporaryFile('w', suffix='.json') as fh:
        json.dump(f, fh); fh.flush()
        tl = build_drac.compile_timeline(fh.name)[1]
    return tl, build_drac.build_events(tl)


# a removed phrase (D's last three; its first carries a tempo knot) shortens the song; the tempo map and the audio clock
# still agree. Every item has a reference anchor: the edit removes those too.
GONE = ('s10', 's11', 's12')


def drop(f):
    f['sequence'] = [s for s in f['sequence'] if s['id'] not in GONE]
    f['reference']['anchors'] = [a for a in f['reference']['anchors'] if a['at'].get('item') not in GONE]


tl, ev = events_of(drop)
assert ev.END == ns.END - 24 and sum(st == 'D' for _, _, st in ev.layout) == 4
assert abs(tl['refAnchors'][-1][0] - (ns.END + 1.1 - 24)) < 1e-9 and all(abs(ev.sec(b) - s) < 1e-9 for (b, _), (s, _) in zip(tl['refAnchors'], tl['ref']))
assert len(ev.US) == ev.END + 8 and all(abs(ev.sec(b) - tl['beats'][b]) < 1e-12 for b in range(ev.END + 1)), 'one clock'
assert all(abs(ev.sec(b + 1) - ev.sec(b) - ev.US[b] / 1e6) < 1e-12 for b in range(ev.END)), 'the MIDI tempo map is the audio clock'
assert len(ev.HOLD) == 1 and all(any(x[0] == s and x[4] for x in ev.taps) for s in ev.HOLD)

# a repeated phrase repeats its chords (they follow the source bar)
tl, ev = events_of(lambda f: next(s for s in f['sequence'] if s['id'] == 's05').update(repeat=2))
first = [(s, e, c) for s, e, c in ev.chords if 42 <= s < 50]
assert len(first) == 4 and first == [(s - 8, e - 8, c) for s, e, c in ev.chords if 50 <= s < 58], first

# a tempo knot change changes only the beats after it, and the audio follows
tl, ev = events_of(lambda f: f['tempo']['knots'][-1].update(bpm=120))
assert ev.US[:222] == ns.US[:222] and ev.US[223:] != ns.US[223:], 'only the rit. under the held last note moves'

# a hold has to start on a tap (a level-3 note is audio only): refused, not silently dropped
try:
    events_of(lambda f: f['events']['holds'][0]['start'].update(offset=0.5))
except AssertionError:
    pass
else:
    raise SystemExit('a hold on a note without a tap must fail')

# the two arrangements (one switch, build_drac.VARIANT; docs/figures/drac-music.md). Ported from the reference trial's checks.
assert build_drac.VARIANT in build_drac.VARIANTS == ('festiva', 'austera') and set(build_drac.ARRANGEMENTS) == set(build_drac.VARIANTS)
# austera: a timbal pattern for every label, nothing after the final hit, the final hit, no roll under the mid-song GLOBUS
assert {st for _, _, st in ns.layout[1:]} <= set(build_drac.AUSTERA), 'a label without a timbal pattern'
hits = build_drac.austera_hits(ns)
assert all(s <= ns.END for s, _ in hits['tim'] + hits['don']), 'nothing after the final hit'
assert any(abs(s - ns.END) < 1e-9 for s, _ in hits['don']), 'the final hit'
mid = [a for a, b in ns.BALLOONS if b != ns.END][0]
assert len([s for s, _ in hits['tim'] if mid <= s < mid + 4]) == 6, 'no roll in mid-song: two calm bars, three strokes each'


# the reed stops at its written note-off plus a 40 ms breath: an F#-G step never rings together for longer.
# Controlled mutation: the same probe sees a 0.25 s release.
def overlap(release):
    keep, build_drac.REL = build_drac.REL, release
    try:
        one = build_drac.render_austera_lead(SimpleNamespace(melody=[[0, 0.5, 66]], sec=lambda b: .25 * b, span=lambda s, d: .25 * d), SR)
    finally:
        build_drac.REL = keep
    idx = np.nonzero(np.abs(one[round(0.125 * SR):, 0]) > 1e-6)[0]   # after the next note (G) starts
    return (idx.max() + 1) / SR if idx.size else 0.0


assert overlap(build_drac.REL) <= 0.03, overlap(build_drac.REL)
assert overlap(0.25) > 0.2, 'the probe sees a long release'
reed = build_drac.render_austera_lead(SimpleNamespace(melody=[[0, 0.5, 66]], sec=lambda b: .25 * b, span=lambda s, d: .25 * d), SR)
assert np.sqrt(np.mean(reed[:round(0.1 * SR), 0] ** 2)) > 0.05 and np.isfinite(reed).all(), 'the reed sounds'
print('Drac audio: obsolete bell pitch is silent at note-off; attacks and sustained ending preserved; austera reed and timbal ok')
