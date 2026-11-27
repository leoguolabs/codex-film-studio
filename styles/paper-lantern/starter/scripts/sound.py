"""Synthesize requested narration takes, score an authored note list, and retain the stems."""
import hashlib
import json
import os
from pathlib import Path
import sys
import numpy as np
import soundfile as sf
from sample_notes import perform
from scipy import signal
from scipy.ndimage import maximum_filter1d, gaussian_filter1d

root = Path(__file__).resolve().parents[1]
timeline_file = root / 'timeline.json'
film = json.loads(timeline_file.read_text())
folder = root / 'audio'
takes = folder / 'takes'
takes.mkdir(parents=True, exist_ok=True)
rate = 48000
length = round(film['duration'] * rate)
rng = np.random.default_rng(308)
voice, score, effects = [np.zeros((length, 2), dtype=np.float32) for _ in range(3)]


def add(stem, at, wave, gain, pan=0):
    pos = round(at * rate)
    if pos < 0:
        raise ValueError('Negative sound start')
    n = min(len(wave), length - pos)
    if n > 0:
        stem[pos:pos+n] += wave[:n, None] * gain * np.array([np.sqrt(1-pan), np.sqrt(1+pan)])


def note(kind, key, dur):
    played=perform(kind,key,dur,rate)
    if played is not None:
        return played
    t = np.arange(round(dur * rate)) / rate
    f = 440 * 2 ** ((key - 69) / 12)
    phase = 2*np.pi*f*t
    if kind in ('bow', 'air'):
        phase += .055*np.sin(2*np.pi*4.7*t)
        harmonics = [1,.26,.14,.08,.04] if kind == 'bow' else [1,.18,.045]
        wave = sum(h*np.sin((i+1)*phase) for i,h in enumerate(harmonics))
        env = (1-np.exp(-t*5)) * np.clip((dur-t)/min(.5,dur*.4),0,1)
    elif kind in ('bell','glass'):
        ratios = (1,2.4,3,4.85,6.8) if kind=='bell' else (1,2,3.99,6.01,8)
        wave = sum(a*np.sin(phase*r)*np.exp(-t*(1.6+i*1.3)/max(.45,dur/2)) for i,(r,a) in enumerate(zip(ratios,[1,.43,.27,.15,.07])))
        env=np.minimum(t/.004,1)
    elif kind=='harp':
        wave=sum(np.sin(i*phase)*np.exp(-t*(2+i*.8))/(i**1.3) for i in range(1,8))
        env=np.minimum(t/.008,1)
    else:
        raise ValueError(kind)
    return wave*env*np.minimum((dur-t)/.04,1)


def sr(sec):
    ms=round(sec*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


engine=None
srt=[]
for i,cue in enumerate(film['voice']):
    speaker=cue.get('speaker',film.get('speaker','bm_george'))
    speed=cue.get('speed',film.get('speed',.97))
    identity=hashlib.sha256(json.dumps([cue['text'],speaker,speed]).encode()).hexdigest()[:12]
    wav=takes/f'{i+1:02}-{identity}.wav'
    if not wav.exists():
        if engine is None:
            from kokoro_onnx import Kokoro
            models=Path(os.environ.get('KOKORO_MODELS',Path.home()/'.cache/lightbox-voice'))
            engine=Kokoro(str(models/'kokoro-v1.0.onnx'),str(models/'voices-v1.0.bin'))
        data,sr0=engine.create(cue['text'],voice=speaker,speed=speed,lang='en-gb' if speaker.startswith('b') else 'en-us')
        sf.write(wav,data,sr0,subtype='PCM_24')
    data,sr0=sf.read(wav)
    data=signal.resample_poly(data,rate//np.gcd(sr0,rate),sr0//np.gcd(sr0,rate))
    stop=cue['at']+len(data)/rate
    next_at=film['voice'][i+1]['at'] if i+1<len(film['voice']) else film['duration']
    if stop>next_at+.01:
        raise ValueError(f'Voice {i+1} runs to {stop:.2f}. Allow room before {next_at:.2f}.')
    cue['end']=round(min(next_at,stop+cue.get('hold',.36)),3)
    srt.extend([str(i+1),sr(cue['at'])+' --> '+sr(cue['end']),cue.get('caption',cue['text']).replace('|','\n'),''])
    active=data[np.abs(data)>.014]
    gain=.117/max(.001,np.sqrt(np.mean(active**2)))
    add(voice,cue['at'],data,gain)
for at,kind,key,dur,amp,*pan in film.get('notes',[]):
    wave=note(kind,key,dur)
    side=pan[0] if pan else 0
    add(score,at,wave,amp,side)
    for delay,g in ((.067,.13),(.12,.07),(.215,.04)):
        add(score,at+delay,wave,amp*g,-side)
for e in film.get('effects',[]):
    at,kind,dur,amp=e[:4]
    t=np.arange(round(dur*rate))/rate
    if kind in ('bell','glass','harp'):
        wave=note(kind,e[4] if len(e)>4 else 74,dur)
    else:
        noise=rng.normal(size=len(t));freq={'water':[240,1400],'wind':[70,490],'paper':[650,3800],'tap':[450,2600]}[kind]
        wave=signal.sosfilt(signal.butter(2,freq,fs=rate,btype='band',output='sos'),noise)
        wave/=max(.01,np.std(wave)*3)
        if kind=='tap': wave*=np.exp(-t*55)
        elif kind=='paper':wave*=(.7+.3*np.cos(81*t))*np.sin(np.pi*t/dur)**2
        else:wave*=(.55+.3*np.sin(1.3*t)+.1*np.sin(2.4*t))*np.minimum(1,t/.45)*np.minimum(1,(dur-t)/.7)
    add(effects,at,wave,amp)
duck=np.minimum(1,maximum_filter1d(abs(voice[::480,0]),size=25)*19)
duck=np.interp(np.arange(length),np.arange(len(duck))*480,gaussian_filter1d(duck,8))
mix=voice+score*(1-.45*duck[:,None])+effects*(1-.12*duck[:,None])
for start,end in film.get('silence',[]):
    t=np.arange(length)/rate
    mix*=np.maximum(np.clip((start-t)/.12,0,1),np.clip((t-end)/.18,0,1))[:,None]
for name,stem in [('voice',voice),('score',score),('foley',effects),('mix',mix)]:
    if name=='mix' and np.max(abs(stem))>0:
        stem=stem*min(1.8,.86/np.max(abs(stem)))
    sf.write(folder/(name+'.wav'),stem,rate,subtype='PCM_24')
timeline_file.write_text(json.dumps(film,indent=2)+'\n')
(root/'captions.srt').write_text('\n'.join(srt)+'\n')
