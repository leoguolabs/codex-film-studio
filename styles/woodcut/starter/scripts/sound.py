"""Render a hand-scored chamber accompaniment, material Foley and measured English takes."""
from pathlib import Path
import json, math
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

root = Path(__file__).resolve().parents[1]
def read(name):
    return json.loads((root/'content'/f'{name}.json').read_text())

rate = 48000
duration = read('narration')['duration']
score, effects, voice = [np.zeros((round(rate*duration),2)) for _ in range(3)]
rng = np.random.default_rng(67)

def place(stem, at, signal, gain, pan):
    start = round(at*rate)
    length = min(len(signal), len(stem)-start)
    if length>0 and start>=0:
        stem[start:start+length] += (gain*signal[:length,None])*np.sqrt([(1-pan)/2,(1+pan)/2])

def noise(t, low, high):
    return sosfilt(butter(3,[low,high],btype='bandpass',fs=rate,output='sos'),rng.normal(size=len(t)))

def note(kind, midi, length):
    t = np.arange(round(rate*length))/rate
    f = 440*2**((midi-69)/12)
    if kind=='bow':
        phase = 2*np.pi*f*t + .20*np.sin(2*np.pi*4.7*t)
        partials = sum(np.sin(h*phase)*(.9 if h%2 else .63)/h**1.15 for h in range(1,15))
        s = (partials + .06*noise(t,500,3100))*(1-np.exp(-t/.105))*(.85+.13*np.sin(4*t))
    else:
        ratios = {'pluck':[1,2,3,4.02,5.01], 'metal':[1,2.72,4.12,6.83], 'drum':[1,1.53,2.11]}[kind]
        s = sum(np.sin(2*np.pi*f*r*t)*np.exp(-t*(1.8+.95*i))/(i+1) for i,r in enumerate(ratios))
        s *= 1-np.exp(-t/.003)
    return s*np.clip((length-t)/min(.16,length/3),0,1)

def foley(kind, length):
    t = np.arange(round(rate*length))/rate
    low,high = {'knife':(650,4700),'rasp':(840,4800),'paper':(480,6200),'water':(120,2900),
                'wind':(100,1300),'flame':(600,4500),'click':(800,7900),'wood':(230,1900)}[kind]
    s = noise(t,low,high)
    if kind in ['click','wood','knife']:
        s += .32*np.sin(2*np.pi*(370 if kind=='wood' else 1500)*t)*np.exp(-t*42)
        env = (.3+.7*np.exp(-t*12))*np.exp(-t/max(.025,length*.42))
    else:
        env = np.sin(np.pi*t/length)**.66*(.82+.16*np.sin(2*np.pi*(8 if kind=='rasp' else 2)*t))
    return s*env*np.minimum(1,t/.005)*np.minimum(1,(length-t)/.018)

cfg = read('score')
for at,kind,midi,length,gain,pan in cfg['notes']:
    place(score,at,note(kind,midi,length),gain,pan)
for at,kind,length,gain,pan in cfg['effects']:
    place(effects,at,foley(kind,length),gain,pan)
times=np.arange(len(score))/rate
duck=np.ones(len(score))
for cue in read('cues'):
    samples,sr=sf.read(root/cue['wav'])
    if samples.ndim>1: samples=samples.mean(axis=1)
    divisor=math.gcd(sr,rate)
    samples=resample_poly(samples,rate//divisor,sr//divisor)
    gain=.176/max(.001,np.sqrt(np.mean(samples**2)))
    place(voice,cue['start'],samples,gain,0)
    inside=np.minimum(np.clip((times-cue['start']+.18)/.18,0,1),np.clip((cue['speech_end']+.31-times)/.31,0,1))
    duck=np.minimum(duck,1-.63*inside)
tail=np.clip((duration-times)/.30,0,1)
score*=tail[:,None];effects*=tail[:,None]
master=score*duck[:,None]+effects*(.25+.75*duck[:,None])+voice
master*=min(1.65,.93/max(.001,np.max(np.abs(master))))
out=root/'audio';out.mkdir(exist_ok=True)
for name,track in [('score',score),('effects',effects),('voice',voice),('mix',master)]:
    sf.write(out/(name+'.wav'),track,rate,subtype='PCM_24')
