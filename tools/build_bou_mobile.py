"""Render the v13 arrangement with a phone-audible kick. No event/timing edits.
Run: uv run --python 3.11 --with numpy==2.4.6 --with scipy==1.17.1 --with soundfile==0.14.0 --with mido==1.3.3 tools/build_bou_mobile.py
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

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / 'music/bou-tradicional'
OUT = ROOT / 'output/bou-mobile'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

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
        events, bars, tempos, seconds = build.build_events({**score,'order':build.ORDER},festive=True,tempo_fn=build.preferred_tempo,intro_end_bpm=120)
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
        drums, acc, percussion = rhythm.groove(events,bars,seconds,festive=True,club=True,natural=True,club_start_bar=27,hit_shape=production.percussion_shape(bars),refined_ending=True)
        assert percussion == manifest['percussion'], 'Percussion events changed'
        assert events == manifest['events'], 'Score events changed'
        # Fix the master gain to v13: a stronger kick must not turn down the melody or intro.
        source = root/'tools/bou/preferred_production.py'
        source.write_text(source.read_text().replace('drive=.98/peak', 'drive='+repr(manifest['production']['preSaturationGain'])))
        importlib.invalidate_caches()
        production = importlib.reload(production)
        mix, settings = production.produce(trio, drums, events)
        start = manifest['clubStartSeconds']
        assert np.max(np.abs(mix[:int(start*sr)]-old[:int(start*sr)])) < 2e-7, 'Opening changed'
        path = OUT/'bou-tradicional-v14-mobile.mp3'
        encode(path,mix,sr)
        decoded = OUT/'decoded.wav'
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(path),str(decoded)],check=True)
        actual, actual_sr = sf.read(decoded)
        assert actual_sr == sr and len(actual) == len(old)
        assert np.max(np.abs(actual)) < .99, 'Encoded audio clips'
        # Simulation only: band limitation and mono, at the same gain for both versions.
        filt = butter(4,[200,5000],btype='bandpass',fs=sr,output='sos')
        filtered_old = sosfilt(filt,old.mean(axis=1))
        filtered_new = sosfilt(filt,actual.mean(axis=1))
        kick_old = sosfilt(filt,old_kick)
        kick_new = sosfilt(filt,rhythm._CLUB_KICK)
        rms = lambda a: float(np.sqrt(np.mean(a*a)))
        improvement = 20*np.log10(rms(kick_new)/rms(kick_old))
        assert improvement > 8, 'Kick still depends on sub bass'
        for label, a in [('abans-mono-mobil',filtered_old),('ara-mono-mobil',filtered_new)]:
            encode(OUT/(label+'.mp3'),a[int(116*sr):int(132*sr)],sr)
        report = dict(revision=14,audio=path.name,audioSha256=sha(path),duration=len(actual)/sr,
            baseAudio=approved['audio'],baseSha256=approved['audioSha256'],
            change='Mid-bass kick body; original events, tempo, voices and master gain preserved',
            phoneSimulationHz=[200,5000],kickBandGainDb=float(improvement),decodedPeak=float(np.max(np.abs(actual))),
            agentListeningVerified=False,physicalPhoneVerified=False,userListeningAccepted=False,
            activation='Requested by Marc; physical-phone listening pending')
        (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
        # Keep the approved v13 package unchanged. Current playback has its own manifest.
        (PACKAGE/path.name).write_bytes(path.read_bytes())
        (PACKAGE/'playback.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2))

if __name__ == '__main__': main()
