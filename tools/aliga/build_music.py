#!/usr/bin/env python3
"""Generate the editable Àliga reconstruction and its isolated game arrangement."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET

import mido
import numpy as np
import soundfile as sf
import band

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'music/aliga/balladeta.json'
SR = 44100
TPQ = 960
# Explicit game adaptation; the transcription and observed-performance tempi stay untouched.
FESTIVE_BPM = (104, 104, 104, 104, 108, 108, 108, 108, 112, 112, 116, 116)
CODA_BPM = 112
TEMPO_STATUS = ('Adaptació festiva per al joc: intro original a 76 BPM; '
                'cicles a 104, 108 i 112/112/116/116 BPM; coda a 112. '
                'No és una mesura del tempo de plaça.')
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
ORIGINAL_HASHES = {
    'mulassa-taiko-ambient.mp3': '4faea71c39baf8d0435ab9e218a842d774a0227f',
    'mulassa-taiko.mp3': '0abc0441bbce0c8e5066754b4532f23463396759',
}


def pitch_number(pitch):
    return 12 * (int(pitch[-1]) + 1) + NAMES[pitch[0]] + pitch[1:-1].count('#') - pitch[1:-1].count('b')


def assert_originals():
    for name, expected in ORIGINAL_HASHES.items():
        actual = hashlib.sha1((ROOT / 'public/music' / name).read_bytes()).hexdigest()
        assert actual == expected, f'Original changed: {name}'


def timeline(source, reference=False, festive=True):
    written = {bar['id']: bar for bar in source['bars']}
    if reference:
        groups = [(source['reference_performance']['name'], source['reference_performance']['source_bars'], source['reference_performance']['bpm'], 0)]
    else:
        perf = source['performance']
        groups = [('Introducció', perf['intro_source_bars'], perf['intro_bpm'], 0)]
        groups += [(s['name'], s['source_bars'], FESTIVE_BPM[i] if festive else s['bpm'], 0) for i, s in enumerate(perf['segments'])]
        groups += [('Coda adaptada', perf['coda_source_bars'], CODA_BPM if festive else perf['coda_bpm'], perf['coda_transpose'])]
    notes, bars, tempos, sections = [], [], [], []
    beat, seconds = 0.0, 0.0
    for name, ids, bpm, transpose in groups:
        microseconds = mido.bpm2tempo(bpm)
        quarter = microseconds / 1_000_000
        tempos.append({'beat': beat, 't': seconds, 'bpm': 60 / quarter, 'microseconds': microseconds})
        sections.append({'name': name, 'bar': len(bars), 't': seconds, 'beat': beat})
        chunks = []
        for ident in ids:
            if ident == 3 and chunks and chunks[-1] == [2]:
                chunks[-1].append(ident)
            else:
                chunks.append([ident])
        for chunk in chunks:
            ident = chunk[0]
            source_bar = written[ident]
            written_notes = [n for item in chunk for n in written[item]['notes']]
            duration = sum(n['duration'] for n in written_notes)
            bar = {'bar': len(bars), 'sourceBar': ident, 'sourceBars': chunk, 'key': 'F' if source_bar['key']=='F major' and transpose==0 else 'C', 'section': name, 'beat': beat, 't': seconds, 'beats': duration, 'bpm': 60 / quarter, 'transpose': transpose, 'notes': written_notes}
            bars.append(bar)
            for note in written_notes:
                length = note['duration']
                if note['pitch'] != 'R':
                    notes.append({'pitch': pitch_number(note['pitch']) + transpose, 'beat': beat, 'beats': length, 't': seconds, 'duration': length * quarter, 'bar': bar['bar'], 'sourceBar': ident})
                beat += length
                seconds += length * quarter
    return {'notes': notes, 'bars': bars, 'tempoMap': tempos, 'sections': sections, 'beats': beat, 'duration': seconds}


def midi_file(path, score, accompaniment=False):
    midi = mido.MidiFile(type=1, ticks_per_beat=TPQ)
    conductor = mido.MidiTrack()
    midi.tracks.append(conductor)
    conductor.append(mido.MetaMessage('time_signature', numerator=2, denominator=4, time=0))
    events = [(round(t['beat'] * TPQ), mido.MetaMessage('set_tempo', tempo=t['microseconds'])) for t in score['tempoMap']]
    events += [(round(s['beat'] * TPQ), mido.MetaMessage('marker', text=s['name'].encode('latin1', 'replace').decode('latin1'))) for s in score['sections']]
    previous_key = None
    for bar in score['bars']:
        if bar['key'] != previous_key:
            events.append((round(bar['beat']*TPQ), mido.MetaMessage('key_signature', key=bar['key'])))
            previous_key = bar['key']
    previous = 0
    for tick, message in sorted(events, key=lambda e: e[0]):
        conductor.append(message.copy(time=tick - previous))
        previous = tick
    conductor.append(mido.MetaMessage('end_of_track', time=max(0, round(score['beats'] * TPQ) - previous)))
    parts = [(0, 73, score['notes'])]
    if accompaniment:
        bass = []
        for bar in score['bars']:
            if bar['section'] == 'Introducció':
                continue
            root = harmony(bar)[0]
            bass.append({'pitch': root, 'beat': bar['beat'], 'beats': min(0.8, bar['beats'])})
        parts.append((1, 42, bass))
    for channel, program, notes in parts:
        track = mido.MidiTrack()
        midi.tracks.append(track)
        track.append(mido.Message('program_change', channel=channel, program=program, time=0))
        events = []
        for note in notes:
            start = round(note['beat'] * TPQ)
            end = round((note['beat'] + note['beats']) * TPQ)
            events.extend([(start, 1, mido.Message('note_on', channel=channel, note=note['pitch'], velocity=82 if channel == 0 else 52)), (end, 0, mido.Message('note_off', channel=channel, note=note['pitch'], velocity=0))])
        previous = 0
        for tick, _, message in sorted(events, key=lambda e: (e[0], e[1])):
            track.append(message.copy(time=tick - previous))
            previous = tick
        track.append(mido.MetaMessage('end_of_track', time=max(0, round(score['beats'] * TPQ) - previous)))
    midi.save(path)


def harmony(bar):
    # This conservative accompaniment belongs to this adaptation, not to Caselles.
    choices = {'C': (48, 52, 55), 'F': (41, 45, 48), 'G': (43, 47, 50)}
    by_source = {4: 'C', 5: 'G', 6: 'G', 7: 'C', 8: 'C', 9: 'G', 10: 'G', 11: 'C', 12: 'C', 13: 'C', 14: 'F', 15: 'G', 16: 'C', 17: 'C', 18: 'F', 19: 'G', 20: 'C', 21: 'C', 40: 'C', 41: 'G', 42: 'C'}
    return choices[by_source.get(bar['sourceBar'], 'C')]


def add_tone(buffer, start, duration, midi_pitch, amplitude, kind='flute', pan=0.0):
    count = max(1, round((duration + 0.075) * SR))
    t = np.arange(count, dtype=np.float64) / SR
    frequency = 440 * 2 ** ((midi_pitch - 69) / 12)
    partials = {'flute': (1, .16, .055, .018), 'reed': (1, .23, .075, .025), 'bass': (1, .25, .08), 'plucked': (1, .35, .12, .04)}[kind]
    phase = 2 * np.pi * frequency * t
    wave = np.zeros(count)
    for harmonic, weight in enumerate(partials, 1):
        wave += weight * np.sin(harmonic * phase) * math.exp(-frequency * harmonic / 16000)
    attack = .018 if kind == 'plucked' else .025
    envelope = np.minimum(1, t / attack)
    envelope *= np.clip((duration + .075 - t) / .09, 0, 1)
    if kind == 'plucked':
        envelope *= np.exp(-4.2 * t)
    else:
        envelope *= .82 + .18 * np.exp(-4 * t)
    wave *= envelope * amplitude / sum(partials)
    offset = round(start * SR)
    length = min(count, len(buffer) - offset)
    if length <= 0:
        return
    buffer[offset:offset+length, 0] += wave[:length] * math.sqrt((1-pan)/2)
    buffer[offset:offset+length, 1] += wave[:length] * math.sqrt((1+pan)/2)


def arrangement(score):
    return band.plan(score, harmony)


def render(score, arranged=False):
    if arranged:
        return band.render(score, arrangement(score))[0]
    audio = np.zeros((math.ceil((score['duration']+.8)*SR), 2))
    for n in score['notes']:
        add_tone(audio, n['t'], n['duration']*.93, n['pitch'], .38, 'flute')
    return (audio*.84/max(float(np.abs(audio).max()), 1e-12)).astype(np.float32)


def validate_arrangement(score):
    events = arrangement(score)
    for e in events:
        if e['pitch'] is None:
            continue
        for samples, _ in band.sample(e):
            assert np.isfinite(samples).all()
            if e['kind'] in ('lead', 'bell', 'arp'):
                assert len(samples) <= round(e['duration']*SR), 'dry spill'
                assert samples[-1] == 0, 'dry note-off gate missing'
            else:
                assert band.safe(score, e['pitch'], e['t'], len(samples)/SR), 'added harmony clash'
    assert all(a['t']+a['duration'] <= b['t']+1e-7 for a,b in zip(score['notes'],score['notes'][1:]))
    return dict(pitchedEvents=sum(e['pitch'] is not None for e in events),
                dryReleaseSpills=0, addedSemitoneClashes=0, melodyOverlaps=0,
                hallTailSeconds=1.6, dryGateFadeSeconds=.015)


def encode(wav, mp3):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '192k', '-map_metadata', '-1', str(mp3)], check=True)


def musicxml(path, source):
    score = ET.Element('score-partwise', version='4.0')
    work = ET.SubElement(score, 'work')
    ET.SubElement(work, 'work-title').text = source['title'] + ' (transcripció visual provisional)'
    listing = ET.SubElement(score, 'part-list')
    part = ET.SubElement(listing, 'score-part', id='P1')
    ET.SubElement(part, 'part-name').text = 'Melodia publicada, reducció monofònica'
    part = ET.SubElement(score, 'part', id='P1')
    for bar in source['bars']:
        measure = ET.SubElement(part, 'measure', number=str(bar['id']), implicit='yes' if bar['id'] in [0,2,3,42] else 'no')
        if bar['id'] in [0,32]:
            attrs = ET.SubElement(measure, 'attributes')
            ET.SubElement(attrs, 'divisions').text = '4'
            key = ET.SubElement(attrs, 'key')
            ET.SubElement(key, 'fifths').text = '-1' if bar['id']==32 else '0'
            time = ET.SubElement(attrs, 'time')
            ET.SubElement(time, 'beats').text = '2'
            ET.SubElement(time, 'beat-type').text = '4'
            clef = ET.SubElement(attrs, 'clef')
            ET.SubElement(clef, 'sign').text = 'G'
            ET.SubElement(clef, 'line').text = '2'
        direction = ET.SubElement(measure, 'direction')
        dtype = ET.SubElement(direction, 'direction-type')
        text = bar['section'] + ', fragment ' + str(bar['id'])
        if str(bar['id']) in source['notation']['endings']:
            text += '. Casella ' + source['notation']['endings'][str(bar['id'])]
        if bar['id'] == 30:
            text += '. Al segno fins al signe de coda; salta a 31.'
        if bar['id'] == 39:
            text += '. Per repetir. Repeteix 3 vegades accel. i CODA.'
        if bar['id'] == 41:
            text += '. Respiració escrita abans de la quarta corxera.'
        for doubt in source['uncertainties']:
            if bar['id'] in doubt['bars']:
                text += '. ' + doubt['issue']
        ET.SubElement(dtype, 'words').text = text
        if bar['id']==13:
            ET.SubElement(ET.SubElement(ET.SubElement(measure, 'direction'), 'direction-type'), 'segno')
        if bar['id']==40:
            ET.SubElement(ET.SubElement(ET.SubElement(measure, 'direction'), 'direction-type'), 'coda')
        for n in bar['notes']:
            note = ET.SubElement(measure, 'note')
            if n['pitch']=='R':
                ET.SubElement(note, 'rest')
            else:
                pitch = ET.SubElement(note, 'pitch')
                ET.SubElement(pitch, 'step').text = n['pitch'][0]
                if 'b' in n['pitch']:
                    ET.SubElement(pitch, 'alter').text = '-1'
                ET.SubElement(pitch, 'octave').text = n['pitch'][-1]
            ET.SubElement(note, 'duration').text = str(round(n['duration']*4))
            ET.SubElement(note, 'type').text = {.25:'16th', .5:'eighth', 1:'quarter', 1.5:'quarter', 2:'half'}[n['duration']]
            if n['duration']==1.5:
                ET.SubElement(note, 'dot')
    ET.indent(score)
    ET.ElementTree(score).write(path, encoding='utf-8', xml_declaration=True)


def validate(source, score, midi_path):
    for bar in source['bars']:
        duration = sum(n['duration'] for n in bar['notes'])
        assert duration == {0:.5,2:1.5,3:.5,42:.5}.get(bar['id'],2), bar['id']
    assert all(0 < n['pitch'] < 128 for n in score['notes'])
    midi = mido.MidiFile(midi_path)
    assert abs(midi.length-score['duration']) < .002, (midi.length, score['duration'])
    assert sum(m.type=='note_on' and m.velocity>0 for track in midi.tracks for m in track)==len(score['notes'])
    return {'midiDuration':midi.length,'musicalDuration':score['duration'],'noteCount':len(score['notes']),'peakLimit':.76,'perceptualListening':False}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir',type=Path,default=ROOT/'output/aliga')
    args=parser.parse_args()
    output=args.output_dir.resolve()
    output.mkdir(parents=True,exist_ok=True)
    assert_originals()
    source=json.loads(SOURCE.read_text())
    reference=timeline(source,reference=True)
    midi_file(output/'melodia-llibre.mid',reference)
    sf.write(output/'melodia-llibre.wav',render(reference),SR,subtype='PCM_24')
    score=timeline(source)
    midi_path=output/'melodia-placa.mid'
    midi_file(midi_path,score)
    melody=render(score)
    sf.write(output/'melodia-placa.wav',melody,SR,subtype='PCM_24')
    mix, stems, metrics = band.render(score, arrangement(score))
    stem_dir = output/'stems'
    stem_dir.mkdir(exist_ok=True)
    for kind, audio in stems.items():
        sf.write(stem_dir/(kind+'.wav'), audio*band.GAIN[kind], SR, subtype='FLOAT')
    (output/'bus-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
    del stems
    wav=output/'balladeta-aliga.wav'
    sf.write(wav,mix,SR,subtype='PCM_24')
    mp3=output/'balladeta-aliga.mp3'
    encode(wav,mp3)
    public=ROOT/'public/music/aliga/balladeta-aliga.mp3'
    public.parent.mkdir(exist_ok=True)
    shutil.copyfile(mp3,public)
    musicxml(output/'balladeta.musicxml',source)
    report=validate(source,score,midi_path)
    report['releaseAudit']=validate_arrangement(score)
    report['sampleRate']=SR
    original=timeline(source,festive=False)
    signature=lambda s:[(n['pitch'],n['beat'],n['beats'],n['bar']) for n in s['notes']]
    assert signature(score)==signature(original), 'tempo adaptation must preserve all melody events'
    assert score['bars'][:3]==original['bars'][:3], 'complete intro unchanged'
    report['sourceMelodyParity']=True
    report['originalDuration']=original['duration']
    report['tempoStatus']=TEMPO_STATUS
    (output/'events.json').write_text(json.dumps(arrangement(score),indent=2)+'\n')
    report['samples']=len(mix)
    report['wavPeak']=float(np.max(np.abs(mix)))
    report['originalHashes']=ORIGINAL_HASHES
    beat_times=[]
    for b in np.arange(0,score['beats']+1e-8,.5):
        tempo=next(t for t in reversed(score['tempoMap']) if t['beat']<=b)
        beat_times.append({'beat':float(b),'t':tempo['t']+(b-tempo['beat'])*tempo['microseconds']/1e6})
    metadata={'title':source['title'],'status':source['status'],'form':source['performance']['form'],'key':'C major','bpm':source['performance']['intro_bpm'],'tempoMap':score['tempoMap'],'beatTimes':[b['t'] for b in beat_times if (b['beat']-.5).is_integer()],'beatPositions':[b for b in beat_times if (b['beat']-.5).is_integer()],'subBeatTimes':beat_times,'barTimes':[b['t'] for b in score['bars']],'bars':[{k:v for k,v in b.items() if k!='notes'} for b in score['bars']],'sections':score['sections'],'beats':[b['t'] for b in beat_times if (b['beat']-.5).is_integer()],'beatCount':score['beats'],'pickupBeats':.5,'end':score['duration'],'musicalDuration':score['duration'],'duration':len(mix)/SR,'audio':'music/aliga/balladeta-aliga.mp3?v='+hashlib.sha1(public.read_bytes()).hexdigest()[:10],'codaStatus':source['performance']['coda_status'],'tempoStatus':TEMPO_STATUS,'listenValidated':False}
    (ROOT/'src/game/aliga-song.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    (output/'validacio.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    (output/'mapa-placa.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    assert_originals()
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
