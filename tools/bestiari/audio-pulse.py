"""Report periodicity candidates, not verified beats. Input: mono WAV; windows: START:END arguments.

Extract a temporary mono WAV with ffmpeg first. Run with uv --with numpy --with scipy.
Example: python audio-pulse.py analysis.wav candidates.json 2:30 36:64
"""
import argparse
import json
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, find_peaks

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('wav')
parser.add_argument('output')
parser.add_argument('windows', nargs='+', help='Start:end in source seconds')
args = parser.parse_args()
sample_rate, audio = wavfile.read(args.wav)
if audio.ndim != 1:
    parser.error('Input must be mono')
freq, times, spectrum = stft(audio.astype(float), sample_rate, nperseg=1024, noverlap=768)
selected = np.abs(spectrum[(freq > 100) & (freq < 8000)])
flux = np.maximum(0, np.diff(np.log1p(selected), axis=1)).mean(axis=0)
rows = []
for window in args.windows:
    start, end = map(float, window.split(':'))
    if not 0 <= start < end <= len(audio) / sample_rate:
        parser.error(f'Window outside source: {window}')
    values = flux[(times[1:] >= start) & (times[1:] < end)].copy()
    values -= values.mean()
    correlation = np.correlate(values, values, 'full')[len(values) - 1:]
    dt = 256 / sample_rate
    peaks, _ = find_peaks(correlation)
    peaks = [i for i in peaks if 0.25 < i * dt < 1.4]
    peaks = sorted(peaks, key=lambda i: correlation[i], reverse=True)[:4]
    rows.append(dict(start=start, end=end, periodCandidatesSeconds=[round(i * dt, 3) for i in peaks],
                     tempoCandidatesBpm=[round(60 / (i * dt), 1) for i in peaks]))
Path(args.output).write_text(json.dumps(dict(
    method=f'Spectral-flux autocorrelation, {sample_rate} Hz mono, 1024 window / 256 hop. Candidates can be harmonics, not confirmed musical beats. No listening verification.',
    windows=rows), indent=2) + '\n')
