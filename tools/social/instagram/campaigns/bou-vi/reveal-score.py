"""Add the Bou's first four score notes and a stereo hall to the accepted drums.

uv run --with numpy --with scipy python tools/social/instagram/campaigns/bou-vi/reveal-score.py
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

CAMPAIGN = Path(__file__).resolve().parent
ROOT = CAMPAIGN.parents[4]
sys.path.insert(0, str(ROOT / 'tools' / 'music'))
from synth import SR, additive, adsr, hz, put

with wave.open(str(CAMPAIGN / 'assets' / 'bombo.wav')) as source:
    assert source.getframerate() == SR and source.getnchannels() == 1
    original = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2')
drums = original.astype(np.float64) / 32768
score = json.loads((ROOT / 'music/bou-tradicional/score.json').read_text())
grid = json.loads((ROOT / 'src/song-bou.json').read_text())['beats']
beat_seconds = grid[1] - grid[0]
notes = []
for bar in score['bars']:
    for note in bar['voices'][0]:
        if note['pitch'] is not None:
            notes.append({**note, 'scoreBeat': (bar['bar'] - 1) * score['meter'][0] + note['beat']})
    if len(notes) >= 4:
        break
notes = notes[:4]
lead = np.zeros((len(drums), 2))
for note in notes:
    duration = note['duration'] * beat_seconds
    for detune, pan, gain in ((0, 0, 1), (7, -.5, .3), (-7, .5, .3)):
        tone, time = additive(hz(note['pitch']), duration + .1, 1.35, .35, detune,
                              .004 if note['duration'] >= 2 else 0, fmax=9000)
        envelope = adsr(time, duration + .1, .01, .12, .80, .25)
        if note['duration'] == 2:
            envelope *= np.linspace(.55, 1.1, len(envelope))
        put(lead, 12 + note['scoreBeat'] * beat_seconds, tone * envelope * gain, pan)
lead *= .30 / np.max(np.abs(lead))

# A damped, diffuse hall, with distinct stereo reflections instead of a repeated echo.
rng = np.random.default_rng(1911)
time = np.arange(round(4.5 * SR)) / SR
lowpass = butter(2, 3600, fs=SR, output='sos')
wet = np.zeros_like(lead)
reveal_drums = drums.copy()
reveal_drums[:12 * SR] = 0
for channel in range(2):
    impulse = sosfilt(lowpass, rng.standard_normal(len(time))) * np.exp(-6.908 * time / 3.2)
    impulse[:round(.035 * SR)] = 0
    impulse /= np.sqrt(np.sum(impulse ** 2))
    for delay, gain in ((.047, .32), (.079, .23), (.113, .16)):
        impulse[round((delay + channel * .007) * SR)] += gain
    signal = lead[:, channel] * .55 + reveal_drums * .13
    wet[:, channel] = fftconvolve(signal, impulse)[:len(drums)]

mix = np.column_stack((drums, drums)) + lead + wet
start = 12 * SR
peak = float(np.max(np.abs(mix[start:])))
mix[start:] *= min(1, .94 / peak)
# The original opening stays byte-identical; only the reveal is remixed.
mix[-round(.7 * SR):] *= np.linspace(1, 0, round(.7 * SR))[:, None]
pcm = np.round(mix * 32768).astype('<i2')
assert np.array_equal(pcm[:start, 0], original[:start])
assert np.array_equal(pcm[:start, 1], original[:start])
assert np.max(np.abs(mix)) < 1
with wave.open(str(CAMPAIGN / 'assets' / 'bombo-final.wav'), 'wb') as output:
    output.setparams((2, 2, SR, 0, 'NONE', 'not compressed'))
    output.writeframes(pcm.tobytes())
report = {
    'duration': len(drums) / SR, 'melodyStart': 12, 'notes': [n['name'] for n in notes],
    'onsets': [12 + n['scoreBeat'] * beat_seconds for n in notes],
    'source': 'music/bou-tradicional/score.json · Francesc Bofarull · Gralla I',
    'instrument': 'tools/music/synth.py · Bou additive voice settings',
    'reverbT60Seconds': 3.2, 'peak': float(np.max(np.abs(mix))),
    'opening12SecondsBitIdentical': True, 'agentListeningVerified': False,
    'userListeningAccepted': False,
}
(ROOT / 'output/instagram/bou-vi/reveal-audio.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
