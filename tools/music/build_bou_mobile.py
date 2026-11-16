"""Render the v13 arrangement with a phone-audible kick, no drum on the first note, a full-level intro and the score's corrections
(score.json's notationNotes: only those pitches move). No other event/timing edits.
(Revision 18's techno kick through the run-up, bars 64-71, went with the disco floor to the final.)
Revision 21 shortens the form: the score bars in DROP are not played (the owner's cut, tools/dev/bou-cut.html).
Run: uv run --python 3.11 --with numpy==2.4.6 --with scipy==1.17.1 --with soundfile==0.14.0 --with mido==1.3.3 tools/music/build_bou_mobile.py
The frozen v13 renderer must reproduce its approved MP3 before the remix is made.
"""
import hashlib
import importlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / 'music/bou-tradicional'
OUT = ROOT / 'output/bou-mobile'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
INTRO_GAIN = 3.2
# the first note came 6 s after BALLA!, 1.3 s after the Mulassa's: the intro's first bar (its softest)
# goes, 8 beats are left and the whole song starts 2 s earlier. build_bou_chart.mjs shifts timing.json by the same.
CUT = 4
# 13/11/2026, the owner: the run of bars 43-47 sounded four times on end (43-47, 60-63, 64-67, 68-71); the first goes
# and bar 42 leads into 60, at the same 136 bpm. One stretch of v13's order, whole bars: the time map is v13's with it out.
DROP = (43, 44, 45, 47)

def encode(path, samples, sr):
    wav = path.with_suffix('.wav')
    sf.write(wav, samples, sr, subtype='PCM_24')
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','192k',str(path)],check=True)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    approved = json.loads((PACKAGE/'approval.json').read_text())
    with tempfile.TemporaryDirectory(prefix='bou-mobile-') as folder:
        root = Path(folder)
        with zipfile.ZipFile(PACKAGE/'source-v13.zip') as z:
            z.extractall(root)
        sys.path[:0] = [str(root/'tools/bou'), str(root/'tools')]
        import build_preferred as build
        import score_groove as rhythm
        import preferred_production as production
        build.main()
        baseline = root/'output/bou-music/preferred'
        assert sha(baseline/'bou.mp3') == approved['audioSha256'], 'Frozen renderer differs from approved v13'
        old, sr = sf.read(baseline/'bou.wav', dtype='float32')
        manifest = json.loads((baseline/'manifest.json').read_text())
        score = json.loads((root/'music/bou-score.json').read_text())
        # the canonical score.json corrects the PDF where its copy is wrong (its notationNotes say where);
        # the frozen v13 rendered the PDF as printed. The trio is played from the corrected score: only those pitches move.
        fixed = json.loads((PACKAGE/'score.json').read_text())
        changed = {(b['bar'], v) for b, o in zip(fixed['bars'], score['bars']) for v, (vs, os) in enumerate(zip(b['voices'], o['voices']))
                   if [n['pitch'] for n in vs] != [n['pitch'] for n in os]}
        events, bars, tempos, seconds = build.build_events({**fixed,'order':build.ORDER},festive=True,tempo_fn=build.preferred_tempo,intro_end_bpm=120)
        pitchless = lambda e: {k: v for k, v in e.items() if k not in ('pitch', 'writtenPitch')}
        moved = [e for e, o in zip(events, manifest['events']) if e != o]
        assert len(events) == len(manifest['events']) and all(pitchless(e) == pitchless(o) for e, o in zip(events, manifest['events'])), 'Score events changed'
        assert moved and all((e['sourceBar'], e['voice']) in changed for e in moved), 'Only the corrected notes may change'
        trio = sum(build.voices(events, len(old)))
        old_kick = rhythm._CLUB_KICK.copy()
        t = rhythm._t
        # Keep the low fundamental; add a short, rounded mid-bass beater.
        # Mono and centred, so stereo collapse cannot cancel the new body.
        phase = 2*np.pi*np.cumsum(205+125*np.exp(-t/.012))/sr
        body = np.sin(phase)*np.exp(-t/.075)
        harmonics = (.32*np.sin(2*phase)+.16*np.sin(3*phase))*np.exp(-t/.045)
        edge = np.minimum(1,t/.0015)*np.clip((.65-t)/.025,0,1)
        rhythm._CLUB_KICK = old_kick + .82*(body+harmonics)*edge
        shape = production.percussion_shape(bars)
        first = bars[0]['beat']
        # no drum on the first melody note; the crash stays.
        def no_first_drum(kind, beat, velocity, pan):
            shaped = shape(kind, beat, velocity, pan)
            return None if shaped and beat == first and shaped[0] == 'tim' else shaped
        # the intro (taiko, kit, roll) after the game's 3 2 1 grooves at the Mulassa's and the
        # Drac's level; at v13's it was a soft pulse that read as a second count-in. Same hits, louder.
        def loud_intro(kind, beat, velocity, pan):
            if beat < CUT: return None
            shaped = no_first_drum(kind, beat, velocity, pan)
            return (shaped[0], shaped[1]*INTRO_GAIN, shaped[2]) if shaped and beat < first else shaped
        quiet, _, _ = rhythm.groove(events,bars,seconds,festive=True,club=True,natural=True,club_start_bar=27,hit_shape=no_first_drum,refined_ending=True)
        drums, acc, percussion = rhythm.groove(events,bars,seconds,festive=True,club=True,natural=True,club_start_bar=27,hit_shape=loud_intro,refined_ending=True)
        # and no gaps between its hits, as the Mulassa's: shaker sixteenths, off-beat hats, a tambourine on
        # 2 and 4 from the second bar, rising to the roll. Added to the stem only, not to the score's hit list.
        # Under them a plucked bass on every beat, C and G: bar 1's own pitches (72/60, 79/67), no guessed harmony.
        def fill_intro(drums, trio):
            band = trio.copy()
            for beat in range(CUT, first):
                rise = beat/(first-1)
                for off in (.25,.75):
                    rhythm.put(drums,float(seconds[round((beat+off)*12)]),rhythm.perc('shaker',(.10+.10*rise)*INTRO_GAIN),-.25)
                if beat >= 2:
                    rhythm.put(drums,float(seconds[round((beat+.5)*12)]),rhythm.perc('hat',(.10+.12*rise)*INTRO_GAIN),.15)
                if beat >= 4 and beat % 2:
                    rhythm.put(drums,float(seconds[round(beat*12)]),rhythm.perc('tamb',(.18+.10*rise)*INTRO_GAIN),.25)
                at, end = float(seconds[round(beat*12)]), float(seconds[round((beat+1)*12)])
                rhythm.put(band,at,rhythm.nylon(rhythm.hz(48 if beat % 2 == 0 else 43),(end-at)+.1)*(.20+.20*beat/(first-1)),-.18)
            return band
        band = fill_intro(drums, trio)
        expected = [h for h in manifest['percussion']['hits'] if not (h['beat'] == first and h['kind'] == 'tim')]
        assert len(expected) == len(manifest['percussion']['hits'])-1, 'First-note drum not found'
        expected = [{**h,'velocity':h['velocity']*INTRO_GAIN} if h['beat'] < first else h for h in expected if h['beat'] >= CUT]
        assert percussion == {**manifest['percussion'],'hits':expected}, 'Percussion events changed'
        # Fix the master gain to v13: a stronger kick must not turn down the melody or intro.
        source = root/'tools/bou/preferred_production.py'
        source.write_text(source.read_text().replace('drive=.98/peak', 'drive='+repr(manifest['production']['preSaturationGain'])))
        importlib.invalidate_caches()
        production = importlib.reload(production)
        mix, settings = production.produce(band, drums, events)
        start = manifest['melodyStart']
        rev15, _ = production.produce(trio, quiet, events)
        tail = int((start+3)*sr) # the roll's 1.6 s hall has died away: from here on it is revision 15, sample for sample
        assert np.max(np.abs(mix[tail:]-rev15[tail:])) < 2e-7, 'Only the intro may change'
        level = lambda a, t0, t1: 20*np.log10(np.sqrt(np.mean(a[int(t0*sr):int(t1*sr)]**2)))
        intro, melody = level(mix, 2, start), level(mix, start, start+8)
        assert melody-6 < intro < melody, (intro, melody)
        # The shortened form: the same score, renderer and master gain on v13's order without DROP.
        order = [n for n in build.ORDER if n not in DROP]
        at_bar = lambda n: next(b['beat'] for b in bars if b['sourceBar'] == n)
        a, b = at_bar(DROP[0]), at_bar(build.ORDER[build.ORDER.index(DROP[-1])+1])
        assert [n for n in build.ORDER if a <= at_bar(n) < b] == list(DROP), 'DROP is one stretch of the order'
        gap = float(seconds[b*12]-seconds[a*12])
        events2, bars2, _, seconds2 = build.build_events({**fixed,'order':order},festive=True,tempo_fn=build.preferred_tempo,intro_end_bpm=120)
        assert np.allclose(seconds2, np.r_[seconds[:a*12], seconds[b*12:]-gap], atol=1e-9), 'The cut moves the tempo map'
        shape = production.percussion_shape(bars2)
        drums2, _, percussion2 = rhythm.groove(events2,bars2,seconds2,festive=True,club=True,natural=True,club_start_bar=27,hit_shape=loud_intro,refined_ending=True)
        whole = mix
        mix, settings = production.produce(fill_intro(drums2, sum(build.voices(events2, round((float(seconds2[-1])+2)*sr)))), drums2, events2)
        join, skip = round(float(seconds[a*12])*sr), round(gap*sr)
        assert len(mix) == len(whole)-skip
        # away from the join it is the whole song: sample for sample before it; after it every hit lands within a sample
        # of its old place (the gap is not a whole number of samples), so its level is compared, in 93 ms blocks
        before = float(np.max(np.abs(mix[:join-sr]-whole[:join-sr])))
        level = lambda x: np.sqrt(np.mean(x[:len(x)//4096*4096].reshape(-1, 4096*x.shape[1])**2, axis=1))
        new, was = level(mix[join+4*sr:]), level(whole[join+skip+4*sr:])
        after = float(np.max(np.abs(20*np.log10(new[was > 1e-3]/was[was > 1e-3]))))
        print('cut', DROP, 'gap s', gap, 'difference from the whole song: before the join', before, '; from 4 s after it, dB', after)
        assert before < 1e-6 and after < .5, 'The cut changed the song away from its join'
        cut = round(float(seconds[CUT*12])*sr) # the cut bar holds no hit nor tail now: silence up to its end
        assert np.max(np.abs(mix[:cut])) < 1e-6, 'Sound before the cut'
        mix = mix[cut:]
        path = OUT/'bou-tradicional-v14-mobile.mp3'
        encode(path,mix,sr)
        decoded = OUT/'decoded.wav'
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(path),str(decoded)],check=True)
        actual, actual_sr = sf.read(decoded)
        assert actual_sr == sr and len(actual) == len(old)-cut-skip
        assert np.max(np.abs(actual)) < .99, 'Encoded audio clips'
        # Simulation only: band limitation and mono, at the same gain for both versions.
        filt = butter(4,[200,5000],btype='bandpass',fs=sr,output='sos')
        filtered_old = sosfilt(filt,old[cut:].mean(axis=1))
        filtered_new = np.r_[np.zeros(skip), sosfilt(filt,actual.mean(axis=1))] # padded by the cut: the old one's seconds after the join
        kick_old = sosfilt(filt,old_kick)
        kick_new = sosfilt(filt,rhythm._CLUB_KICK)
        rms = lambda a: float(np.sqrt(np.mean(a*a)))
        improvement = 20*np.log10(rms(kick_new)/rms(kick_old))
        assert improvement > 8, 'Kick still depends on sub bass'
        for label, heard in [('abans-mono-mobil',filtered_old),('ara-mono-mobil',filtered_new)]:
            encode(OUT/(label+'.mp3'),heard[int(116*sr):int(132*sr)],sr)
        report = dict(revision=21,cutBeats=CUT,cutBars=list(DROP),cutBarsSeconds=gap,cutSeconds=cut/sr,audio=path.name,audioSha256=sha(path),duration=len(actual)/sr,
            baseAudio=approved['audio'],baseSha256=approved['audioSha256'],
            change='Mid-bass kick body; no drum on the first melody note; a full intro (louder hits, shaker, hats, tambourine, C/G bass) of 8 beats, its first bar cut; the score corrections (bar 12, Gralla I: B natural, the PDF misses the sign); bars 43-47 (the first of four runs) not played; other events, tempo, voices and master gain preserved',
            phoneSimulationHz=[200,5000],kickBandGainDb=float(improvement),decodedPeak=float(np.max(np.abs(actual))),
            agentListeningVerified=False,physicalPhoneVerified=False,userListeningAccepted=False,
            activation='Requested by the owner; physical-phone listening pending')
        (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
        # Keep the approved v13 package unchanged; the current mix lives only where the game serves it.
        (ROOT/'public/music'/path.name).write_bytes(path.read_bytes())
        (PACKAGE/'playback.json').write_text(json.dumps(report,indent=2)+'\n')
        # timing.json's notes follow the corrected score too (the chart and tools/dev/notes.html read them)
        timing = json.loads((PACKAGE/'timing.json').read_text())
        key = lambda e: (e['voice'], e['sourceBar'], e['occurrence'], e['beat'], e['chord'])
        now = {key(e): e for e in moved}
        for e in timing['events']:
            if key(e) in now:
                n = now.pop(key(e)); e['writtenPitch'], e['pitch'] = n['writtenPitch'], n['pitch']
        assert not now, 'Corrected notes missing from timing.json'
        if any(x['sourceBar'] in DROP for x in timing['bars']): # still v13's whole form: the same stretch out of its map
            late = lambda x: {**x, 'beat': x['beat']-(b-a), 'occurrence': x['occurrence']-len(DROP), **{k: x[k]-gap for k in ('time', 'start', 'end') if k in x}}
            for k in ('bars', 'events'):
                timing[k] = [late(x) if x['beat'] >= b else x for x in timing[k] if x['sourceBar'] not in DROP]
            for k, n in (('beats', 1), ('subdivisionTimes', 12)):
                timing[k] = timing[k][:a*n] + [t-gap for t in timing[k][b*n:]]
            timing['tempoBpm'] = timing['tempoBpm'][:a*12] + timing['tempoBpm'][b*12:]
            for k in ('duration', 'musicEnd', 'finaleCandidate', 'finalNoteStart', 'finalHit'):
                timing[k] -= gap
        same = lambda x, y: all(x[k] == y[k] if isinstance(x[k], (int, bool)) else abs(x[k]-y[k]) < 1e-6 for k in y)
        assert len(timing['events']) == len(events2) and all(same(x, y) for x, y in zip(timing['events'], events2)), 'timing.json is not the shortened form'
        assert len(timing['bars']) == len(bars2) and all(same(x, y) for x, y in zip(timing['bars'], bars2))
        assert np.allclose(timing['subdivisionTimes'], seconds2, atol=1e-6) and abs(timing['musicEnd']-float(seconds2[-1])) < 1e-6
        (PACKAGE/'timing.json').write_text(json.dumps(timing,indent=2)+'\n')
        print(json.dumps(report,indent=2), 'intro dB', round(intro,1), 'melody dB', round(melody,1))

if __name__ == '__main__': main()
