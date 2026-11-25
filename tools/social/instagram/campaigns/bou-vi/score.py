"""Original 20-second trailer percussion: 120 BPM, bass drum, skin and rolls.

No game audio or third-party recording is used. Standard-library-only synthesis.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE, DURATION = 44100, 20
samples = [0.0] * (RATE * DURATION)
random.seed(19)

def drum(start, strength=1, roll=False):
    length = .24 if roll else 1.4
    phase = 0
    for n in range(int(RATE * length)):
        index = round(start * RATE) + n
        if index >= len(samples):
            break
        t = n / RATE
        frequency = (110 if roll else 46) + 95 * math.exp(-t * 30)
        phase += 2 * math.pi * frequency / RATE
        skin = math.sin(phase) + .28 * math.sin(phase * 1.59) * math.exp(-t * 9)
        attack = random.uniform(-1, 1) * math.exp(-t * 55)
        envelope = math.exp(-t * (19 if roll else 4.3)) * min(1, t * 1700)
        samples[index] += strength * (.65 * skin * envelope + .2 * attack)

for start in (0, 2, 4, 5.5, 6, 7, 8, 9, 10, 10.75, 11, 12, 14, 16, 18):
    drum(start, 1.1 if start in (0, 4, 8, 12) else .7)
for n in range(12):
    drum(10.5 + n * .125, .12 + n * .022, roll=True)
peak = max(abs(x) for x in samples)
with wave.open(str(Path(__file__).parent / 'assets' / 'bombo.wav'), 'wb') as output:
    output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
    output.writeframes(b''.join(struct.pack('<h', round(x / peak * 28000 * min(1, (DURATION-i/RATE)/.6))) for i, x in enumerate(samples)))
