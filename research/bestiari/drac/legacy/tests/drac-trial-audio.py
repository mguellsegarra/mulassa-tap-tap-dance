"""The Drac trial's music (tools/build_drac_trial.py) through its production paths, writing nothing.
Run with numpy/scipy in the generator environment (package.json `check`)."""
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from synth import SR

import build_drac as base
import build_drac_trial as trial

tl = base.compile_timeline(trial.FORM)[1]
ev = base.build_events(tl)
ev0 = base.build_events(base.compile_timeline()[1])


def notes(e, a, b, shift=0):
    return [(s + shift, d, m) for s, d, m in e.melody if a <= s < b]


def same(x, y):
    return len(x) == len(y) and all(abs(p[0] - q[0]) < 1e-9 and abs(p[1] - q[1]) < 1e-9 and p[2] == q[2] for p, q in zip(x, y))


# the events the audio is rendered from: the baseline through bar 18, the first pass's 19-51 again, the same coda
assert ev.END == ev0.END + 66 == 227, (ev.END, ev0.END)
assert same(notes(ev, 0, 152), notes(ev0, 0, 152)), 'the current form through bar 18 of the D.S.'
assert same(notes(ev, 152, 218), notes(ev0, 62, 128, 90)), 'bars 19-51 again, note for note'
assert same(notes(ev, 218, 1e9), notes(ev0, 152, 1e9, 66)), 'the same coda and ringing last note'
# one clock: the audio's seconds are the compiler's grid, the MIDI tempo map's microseconds
assert len(ev.US) == ev.END + 8 and all(abs(ev.sec(b) - tl['beats'][b]) < 1e-12 for b in range(ev.END + 1)), 'one clock'
assert all(abs(ev.sec(b + 1) - ev.sec(b) - ev.US[b] / 1e6) < 1e-12 for b in range(ev.END))
# the festive variant keeps the production bell gate and arpeggio rule (build_events/render_stems, not a copy)
for s, pitch in ev.arp:
    assert not any(a < s + .25 - 1e-8 and a + d > s + 1e-8 and (pitch - m) % 12 in (1, 11) for a, d, m in ev.melody), s

# the austere percussion: a pattern for every label, nothing after the final hit, the closing roll only
assert {st for _, _, st in ev.layout[1:]} <= set(trial.STYLE), 'a label without a timbal pattern'
hits = trial.austera_hits(ev)
assert all(s <= ev.END for s, _ in hits['tim'] + hits['don']), 'nothing after the final hit'
assert any(abs(s - ev.END) < 1e-9 for s, _ in hits['don']), 'the final hit'
mid = [a for a, b in ev.BALLOONS if b != ev.END][0]
assert len([s for s, _ in hits['tim'] if mid <= s < mid + 4]) == 6, 'no roll in mid-song: two calm bars, three strokes each'

# the reed stops at its written note-off plus a 40 ms breath: an F#-G step never rings together for longer.
# Controlled mutation: the same probe sees a 0.25 s release.
def overlap(release):
    keep, trial.REL = trial.REL, release
    try:
        one = trial.render_austera_lead(SimpleNamespace(melody=[[0, 0.5, 66]], sec=lambda b: .25 * b, span=lambda s, d: .25 * d), SR)
    finally:
        trial.REL = keep
    idx = np.nonzero(np.abs(one[round(0.125 * SR):, 0]) > 1e-6)[0]   # after the next note (G) starts
    return (idx.max() + 1) / SR if idx.size else 0.0


assert overlap(trial.REL) <= 0.03, overlap(trial.REL)
assert overlap(0.25) > 0.2, 'the probe sees a long release'
rendered = trial.render_austera_lead(SimpleNamespace(melody=[[0, 0.5, 66]], sec=lambda b: .25 * b, span=lambda s, d: .25 * d), SR)
assert np.sqrt(np.mean(rendered[:round(0.1 * SR), 0] ** 2)) > 0.05 and np.isfinite(rendered).all(), 'the reed sounds'
print('Drac trial audio: form events, one clock, austere reed note-offs and percussion ok')
