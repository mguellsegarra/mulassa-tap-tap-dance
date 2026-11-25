"""cut.json for film.mjs from the music's timeline: night details and the colla on the muffled kick (a cut a beat), a held
detail while the sound is in the open, the Bou whole under the follow spot on the melody. After build-audio.py: python3 tools/social/instagram/campaigns/bou-teaser/make-cut.py"""
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[4]; OUT = ROOT/'output/instagram/bou-teaser'
song = json.load(open(ROOT/'src/song-bou.json')); beats = song['beats']
T = json.load(open(OUT/'timeline-a.json')); B, BAR = T['beat'], T['bar']; shots = json.load(open(HERE/'shots.json'))
i0 = min(range(len(beats)), key=lambda i: abs(beats[i] - song['dance']['technoStart']))
t_bar = lambda n: T['shots'][0][0] + (n - 2)*BAR            # the film second bar n starts (bar 2: the first open one)
sb = lambda t: beats[i0 + round((t - t_bar(1))/B)]           # its song second: the techno runs from the film's bar 1
# (a wide lens from near: from further in, the Bou itself stood between the lens and them)
# its colla, each once (a wide lens from near: from further in, the Bou itself stood between the lens and them)
who = lambda w, az: dict(who=w, size=2.0, y=1.1, fov=60, az=az, lit=.55)
# (ease: the shot's own second; over 8, a shot aimed ahead of or behind its middle took the heading it would have 3 s later, and sat off centre)
k = lambda kind: dict(kind=kind, ease=2*B, lit=.25)  # (lit: under the spot alone a detail read as black on a phone)
# a second each (two kicks), its details and its colla in turn; each comes out of black on its kick and goes back
capatas = who('C', -.45)  # whole, with his staff, as the others (the owner: the close shot sat too high; from the other side the public stood in front)
order = [k('tail'), capatas, k('flank'), k('hornTip'), who('N', -.35), k('rear'), k('back'), who('E', .7), k('horn'), k('rearLow'), {**who('W', .7), 'size': 1.6}, k('tailTop')]  # (no shot of its legs from the side: one of its colla always stood in the way)
segs = []
for n, shot in enumerate(order):
    t0 = t_bar(1) + n*2*B; segs.append({'t0': t0, 't1': t0 + 2*B, 'song': sb(t0), 'in': .12, 'out': .3, **({'lit': 1} if 'who' in shot else {}), **shot})
# the song's bar before the melody: its face in the dark, hardly moving (the stillest two seconds of its dance with a lively
# head, still-probe.mjs), its eyes rolling, and its tongue out as the roll ends
# (the owner: no tongue; its eyes from near for a second and a half, a fade to black, half a second of dark, and the Bou on the melody's first note)
e0 = T['song']
segs.append({'t0': e0, 't1': e0 + 3*B, 'song': 88.1, 'free': 1, 'eyes': .5, 'ey': .14, 'noColla': 1, 'noStrobe': 1,  # its eyes alone, the lens riding with its head: no more of its face
              'in': .3, 'out': .45, 'ease': 4})
segs.append({'t0': T['feet'], 't1': T['card'], 'song': T['song0'] + BAR, 'kind': 'feetX', 'in': .25, 'out': .02, 'noStrobe': 1, 'noColla': 1})
assert all(a['t1'] <= b['t0'] + 1e-9 for a, b in zip(segs, segs[1:])) and segs[0]['t0'] >= 0, 'segments overlap or start before 0'
json.dump({'end': T['end'], 'beat': B, 'grade': 1.5, 'shots': shots, 'segs': segs, 'card': {'t0': T['card'], 't1': T['end']}}, open(OUT/'cut.json', 'w'), indent=1)
print(T, len(segs))
