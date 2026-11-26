"""Render an authored chamber score and effects against retained English voice takes."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly
from math import gcd

root=Path(__file__).resolve().parents[1]
cfg=json.loads((root/'content/narration.json').read_text())
plan=json.loads((root/'content/sound.json').read_text())
cues=json.loads((root/'content/cues.json').read_text())
sr=48000
n=round(sr*cfg['duration'])
rng=np.random.default_rng(421)
score,fx,voice=[np.zeros((n,2)) for _ in range(3)]
clock=np.arange(n)/sr

def add(bus,m,t,pan=0):
    start=round(t*sr)
    if start<0 or start>=n: raise ValueError(f'Event outside film at {t}')
    m=m[:n-start]
    bus[start:start+len(m)]+=m[:,None]*np.sqrt([1-pan,1+pan])

def noise(size,limits):
    return sosfilt(butter(2,limits,btype='bandpass',fs=sr,output='sos'),rng.normal(0,1,size))

def envelope(t,d,a,r):
    return np.minimum(1,t/a)*np.minimum(1,np.maximum(0,(d-t)/r))

for event in plan['notes']:
    at,midi,d,gain,*extra=event
    kind=extra[0] if extra else 'string'
    pan=extra[1] if len(extra)>1 else -.16
    t=np.arange(round(d*sr))/sr
    hz=440*2**((midi-69)/12)
    if kind=='flute':
        phase=2*np.pi*hz*t+.093*np.sin(2*np.pi*4.3*t)
        wave=(np.sin(phase)+.21*np.sin(phase*2)+.045*np.sin(phase*3)+.14*noise(len(t),(850,3900)))*envelope(t,d,.24,.35)
    elif kind in ('string','harmonic'):
        # Plucked modes decay at different rates. A sliding bridge and a quiet buzz colour the attack.
        base=2*np.pi*hz*(t+.00036*(1-np.exp(-t*13)))
        wave=np.zeros_like(t)
        for h in range(1,15):
            amp=np.sin(np.pi*h*.21)/(h**1.38)
            if kind=='harmonic' and h%2:amp*=.32
            wave+=amp*np.sin(h*base*(1+.000027*h*h))*np.exp(-t*(1.05+h*.48))
        wave+=noise(len(t),(450,5100))*.10*np.exp(-t*35)
        wave*=envelope(t,d,.004,.18)
    else:raise ValueError(kind)
    add(score,wave*gain,at,pan)

for ev in plan['effects']:
    at,kind,d,gain,*p=ev
    t=np.arange(round(d*sr))/sr
    if kind in ('wash','brush','wind','splash'):
        bounds={'wash':(110,1320),'wind':(90,860),'brush':(700,6200),'splash':(300,6800)}[kind]
        wave=noise(len(t),bounds)
        if kind=='wind':wave*=.75+.25*np.sin(t*2.3)
        elif kind=='splash':wave*=np.exp(-3.3*t/d)
        else:wave*=np.sin(np.pi*t/d)**.72
    elif kind in ('drop','tap','seal','drum'):
        hz={'drop':660,'tap':105,'seal':88,'drum':62}[kind]
        wave=np.sin(2*np.pi*(hz*t+hz*.035*(1-np.exp(-t*35))))*np.exp(-t*(15 if kind=='drop' else 10))
        wave+=.3*noise(len(t),(350,2700))*np.exp(-t*58)
    else:raise ValueError(kind)
    wave*=envelope(t,d,min(.025,d/12),min(.20,d/4))
    add(fx,wave*gain,at,p[0] if p else .1)

for bus,dt,g in [(score,.083,.18),(fx,.061,.11)]:
    j=round(dt*sr);bus[j:]+=bus[:-j,::-1].copy()*g
duck=np.ones(n)
for cue in cues:
    a=cue['start'];b=cue['speech_end']
    s,source_rate=sf.read(root/cue['wav'])
    if s.ndim==2:s=s.mean(axis=1)
    if source_rate!=sr:
        factor=gcd(sr,source_rate);s=resample_poly(s,sr//factor,source_rate//factor)
    add(voice,s*.76,a)
    depth=np.clip((clock-a+.19)/.19,0,1)*np.clip((b+.24-clock)/.24,0,1)
    duck=np.minimum(duck,1-.59*depth)
for a,b in plan['silences']:
    window=1-np.clip((clock-a+.035)/.035,0,1)*np.clip((b+.05-clock)/.05,0,1)
    score*=window[:,None];fx*=window[:,None]
fade=np.clip((cfg['duration']-clock)/.32,0,1)
out=root/'audio';out.mkdir(exist_ok=True)
for name,bus in [('score',score),('foley',fx),('speech',voice)]:
    sf.write(out/(name+'.wav'),bus*fade[:,None],sr,subtype='PCM_24')
mix=(voice+(score+fx)*duck[:,None])*fade[:,None]
mix*=min(1,.91/max(.01,np.max(abs(mix))))
sf.write(out/'mix.wav',mix,sr,subtype='PCM_24')
