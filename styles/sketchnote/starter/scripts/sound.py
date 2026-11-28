"""Record timed English cues and mix editable mallet, bass and pen stems."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy import signal
from scipy.ndimage import gaussian_filter1d, minimum_filter1d

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
CONTENT, AUDIO = Path('content'), Path('audio')
AUDIO.mkdir(exist_ok=True)
SR = 48000


def read(name):
    return json.loads((CONTENT / name).read_text())


def save(name, obj):
    (CONTENT / name).write_text(json.dumps(obj, indent=2) + '\n')


def stamp(seconds):
    n = round(seconds * 1000)
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'


def voice():
    story = read('narration.json')
    takes = AUDIO / 'takes'
    takes.mkdir(exist_ok=True)
    at, cues, engine = .55, [], None
    for row in story['lines']:
        speaker, speed = story.get('voice', 'af_heart'), story.get('speed', 1.0)
        digest = hashlib.sha256(json.dumps([row['text'], speaker, speed]).encode()).hexdigest()[:12]
        name = takes / f"{row['id']}-{digest}.wav"
        if not name.exists():
            if engine is None:
                from kokoro_onnx import Kokoro
                models = Path(os.environ.get('KOKORO_MODELS', Path.home() / '.cache/lightbox-voice'))
                engine = Kokoro(str(models/'kokoro-v1.0.onnx'), str(models/'voices-v1.0.bin'))
            wave, rate = engine.create(row['text'], voice=speaker, speed=speed,
                                       lang='en-gb' if speaker.startswith('b') else 'en-us')
            sf.write(name, wave, rate, subtype='PCM_24')
        at = max(at, row.get('at', 0))
        length = sf.info(name).duration
        end = at + length
        gap = row.get('gap', .42)
        caption = row.get('caption', row['text'])
        cues.append(dict(id=row['id'], text=caption, c0=round(at,4), end=round(end,4),
                         c1=round(end + min(gap*.85,.48),4), take=str(name)))
        at = end + gap
    if not cues:
        raise ValueError('Author the English narration first.')
    save('cues.json', cues)
    duration = math.ceil((at + story.get('tail',1.8))*24)/24
    save('clock.json', {'duration':duration,'fps':24})
    (CONTENT/'captions.srt').write_text('\n\n'.join(
        f"{i}\n{stamp(c['c0'])} --> {stamp(c['c1'])}\n{c['text']}" for i,c in enumerate(cues,1))+'\n')
    print('Film clock:', duration, [(c['id'],c['c0']) for c in cues])


def tone(pitch, length, kind):
    t = np.arange(round(SR*length))/SR
    phase = 2*np.pi*440*2**((pitch-69)/12)*t
    modes = {'wood':[(1,1,4), (4,.31,11), (9.2,.09,21)], 'bell':[(1,1,1.9),(2.75,.38,3.4),(5.32,.16,6)],
             'bass':[(1,1,4.3),(2,.65,7),(3,.39,9),(4,.17,12)], 'harp':[(1,1,2),(2,.43,3.8),(3,.24,5.2),(4,.11,7)]}
    wave = sum(gain*np.sin(r*phase)*np.exp(-decay*t) for r,gain,decay in modes[kind])
    return wave*np.minimum(t/.007,1)*np.minimum((length-t)/.045,1)


def mix():
    cues = read('cues.json')
    duration = read('clock.json')['duration']
    total = round(duration*SR)
    voice, score, foley = [np.zeros((total,2),np.float32) for _ in range(3)]
    def add(track, at, wave, amp, pan=0):
        start = round(at*SR)
        length = min(len(wave),total-start)
        if start>=0 and length>0:
            track[start:start+length] += (amp*wave[:length,None])*np.sqrt([1-pan,1+pan])
    for cue in cues:
        wave, rate = sf.read(cue['take'])
        if wave.ndim>1: wave = wave.mean(1)
        div = math.gcd(SR,rate)
        wave = signal.resample_poly(wave,SR//div,rate//div)
        level = max(.01,np.sqrt(np.mean(wave[abs(wave)>.012]**2)))
        add(voice,cue['c0'],wave,.112/level)
    arrangement = read('score.json')
    times = {c['id']:c['c0'] for c in cues}
    for section in arrangement['sections']:
        start = times.get(section['at'],section['at'])
        stop = times.get(section['until'],section['until']) if 'until' in section else duration
        chord, beat = section['chord'],60/section.get('bpm',102)
        for i,at in enumerate(np.arange(start,stop-.06,beat)):
            if i%4==0: add(score,at,tone(chord[0],.85,'bass'),.055,-.18)
            note = chord[1+(i*2+i//4)%(len(chord)-1)]
            add(score,at+.02,tone(note,.85,'wood'),.038 if i%2 else .049,.21)
            if i%8==3: add(score,at+.5*beat,tone(note+12,1.25,'bell'),.020,-.26)
    for event in arrangement.get('notes',[]):
        at,delta,pitch,kind,length,amp,pan=event
        add(score,times.get(at,at)+delta,tone(pitch,length,kind),amp,pan)
    rng = np.random.default_rng(619)
    # Each sound has a bounded contact envelope. Multiple simultaneous nibs share headroom.
    for e in read('events.json'):
        d = max(.035,e['d'])
        t = np.arange(round(d*SR))/SR
        marker = e['type']=='marker'
        band = [650,3200] if marker else [1900,6600]
        raw = signal.sosfilt(signal.butter(2,band,fs=SR,btype='bandpass',output='sos'),rng.normal(size=len(t)))
        env = np.minimum(1,t/.014)*np.minimum(1,(d-t)/.023)*(.6+.4*np.cos(2*np.pi*(8 if marker else 11)*t)**2)
        add(foley,e['t'],raw*env,.033 if marker else .024,e['pan']*.5)
    foley = .11*np.tanh(foley/.11)
    block = np.abs(voice[:,0])
    activity = np.maximum.reduceat(block,np.arange(0,total,480))
    mask = gaussian_filter1d(np.minimum(1,activity*16),6)
    duck = np.interp(np.arange(total),np.arange(len(mask))*480,mask)
    score *= (1-.43*duck[:,None])
    foley *= (1-.30*duck[:,None])
    fade = np.clip((duration-np.arange(total)/SR)/.35,0,1)[:,None]
    # A linked look-ahead envelope gives all stems the same attenuation and stereo image.
    premix = (voice+score+foley)*fade
    meter = pyln.Meter(SR)
    target = arrangement.get('loudness',-14.2)
    boost = 10**((target-meter.integrated_loudness(premix))/20)
    block = 240
    starts = np.arange(0,total,block)
    peaks = np.maximum.reduceat(np.max(np.abs(premix),axis=1),starts)
    for _ in range(2):
        controls = np.minimum(1,.87/np.maximum(peaks*boost,1e-8))
        controls = gaussian_filter1d(minimum_filter1d(controls, size=7),1)
        limit = np.interp(np.arange(total),starts,controls)
        gain = (boost*limit)[:,None]
        gain *= min(1,.885/max(.001,np.max(abs(premix*gain))))
        mix = premix*gain
        loudness = meter.integrated_loudness(mix)
        boost *= 10**((target-loudness)/20)
    for name,stem in [('voice',voice),('music',score),('pen',foley)]:
        sf.write(AUDIO/f'{name}.wav',stem*fade*gain,SR,subtype='PCM_24')
    sf.write(AUDIO/'mix.wav',mix,SR,subtype='PCM_24')
    save('master.json', {'integrated_lufs':round(float(loudness),3),'sample_peak':round(float(np.max(abs(mix))),5),
                          'frames':round(duration*24),'stereo_samples':total})
    print('Final mix',round(loudness,2),'LUFS.')


if __name__ == '__main__':
    mode = argparse.ArgumentParser()
    mode.add_argument('mode',choices=['voice','mix'])
    (voice if mode.parse_args().mode=='voice' else mix)()
