"""Export the current Bou's percussion cues without rendering or changing audio.

Run with the same Python dependencies as build_bou_mobile.py.
"""
import json
from pathlib import Path
import sys
import tempfile
import zipfile
import numpy as np
from build_bou_mobile import CUT, INTRO_GAIN

ROOT = Path(__file__).resolve().parents[2]


def main():
    package = ROOT / 'music/bou-tradicional'
    timing = json.loads((package / 'timing.json').read_text())
    playback = json.loads((package / 'playback.json').read_text())
    assert playback['cutBeats'] == CUT, 'Update the cue export when the mobile intro cut changes'
    with tempfile.TemporaryDirectory(prefix='bou-percussion-') as folder:
        root = Path(folder)
        with zipfile.ZipFile(package / 'source-v13.zip') as source:
            source.extractall(root)
        sys.path[:0] = [str(root / 'tools/bou'), str(root / 'tools')]
        import score_groove as rhythm
        from preferred_production import percussion_shape
        shape = percussion_shape(timing['bars'])
        first = timing['bars'][0]['beat']

        def current_shape(kind, beat, velocity, pan):
            if beat < CUT:
                return None
            shaped = shape(kind, beat, velocity, pan)
            if shaped and beat == first and shaped[0] == 'tim':
                return None
            if shaped and beat < first:
                return shaped[0], shaped[1] * INTRO_GAIN, shaped[2]
            return shaped

        # Execute the approved event scheduler, bypassing only waveform synthesis/mixing.
        rhythm.SR = 1
        rhythm.perc = lambda *args: np.zeros(1)
        rhythm.put = lambda *args: None
        _, _, percussion = rhythm.groove(timing['events'], timing['bars'], timing['subdivisionTimes'],
            festive=True, club=True, natural=True, club_start_bar=27,
            hit_shape=current_shape, refined_ending=True)
    hits = percussion['hits']
    # A drum player represents drums, not the shaker, hats, tambourine or cymbals.
    hits = [h for h in hits if h['kind'] in ('don', 'ka', 'tim', 'snare', 'kick', 'technoKick')]
    # Simultaneous instruments share a stroke: two hands cannot play every layer separately.
    groups = {}
    for hit in hits:
        beat = round(hit['beat'] - CUT, 6)
        groups.setdefault(beat, []).append(hit)
    hands = [[], []]
    for beat, group in sorted(groups.items()):
        bass = [h for h in group if h['kind'] in ('kick', 'technoKick', 'don')]
        other = [h for h in group if h not in bass]
        if bass:
            hands[0].append([beat, round(min(1, max(h['velocity'] for h in bass)), 4)])
        if other:
            hand = 1 if bass else min(range(2), key=lambda i: hands[i][-1][0] if hands[i] else -1)
            hands[hand].append([beat, round(min(1, max(h['velocity'] for h in other)), 4)])
    result = dict(audioSha256=playback['audioSha256'], hands=hands)
    (ROOT / 'src/figures/bou/bou-percussion.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f'Bou percussion: {len(hits)} sounds, {sum(map(len, hands))} hand strokes')


if __name__ == '__main__':
    main()
