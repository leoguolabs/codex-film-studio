"""Mix retained speech, a supplied stereo score, and pencil Foley from the drawing clock."""
import json
from pathlib import Path

import numpy as np
import pyloudnorm as ln
import soundfile as sf
from scipy import signal

root=Path(__file__).resolve().parents[1]
load=lambda file:json.loads((root/file).read_text())
sr=24000
length=round(load("content/narration.json")["duration"]*sr)
rng=np.random.default_rng(4151)
dialogue=np.zeros(length,dtype=np.float32)
foley=np.zeros((length,2),dtype=np.float32)
cues=load("content/cues.json")
def read(file):
    wav,rate=sf.read(file,dtype="float32")
    if rate!=sr:
        from math import gcd
        d=gcd(sr,rate)
        wav=signal.resample_poly(wav,sr//d,rate//d,axis=0)
    return wav
for cue in cues:
    wav=read(root/cue["wav"])
    if wav.ndim>1: wav=wav.mean(axis=1)
    start=round(cue["start"]*sr)
    rms=np.sqrt(np.mean(wav**2))
    dialogue[start:start+len(wav)]+=wav*.119/max(.04,rms)
def add(t,wav,pan,gain=1):
    first=round(t*sr)
    left=max(0,first); right=min(length,first+len(wav))
    if right<=left:return
    v=wav[left-first:right-first]*gain
    a=(np.clip(pan,-1,1)+1)*np.pi/4
    foley[left:right,0]+=np.cos(a)*v
    foley[left:right,1]+=np.sin(a)*v
def noise(n,low,high):
    sos=signal.butter(2,[low,high],btype="bandpass",fs=sr,output="sos")
    return signal.sosfilt(sos,rng.normal(size=n))
bands={"pencil":(700,4200,5,.047),"light":(1400,5200,7,.023),
       "write":(900,4800,10,.048),"color":(320,2600,13,.076),"gesture":(140,1300,2,.06)}
for e in load("content/events.json"):
    kind=e["type"]; t=e["t"]; pan=e.get("pan",0)*.6
    if kind in bands:
        sec=max(.045,e.get("d",.12)); n=max(2,round(sec*sr))
        tt=np.arange(n)/sr; pos=np.arange(n)/n
        low,high,pulse,gain=bands[kind]
        env=np.minimum(1,np.minimum(tt/.016,(sec-tt)/.035))
        if kind=="gesture":env=np.sin(pos*np.pi)**1.6
        flutter=(.38+.62*np.abs(np.sin(tt*np.pi*pulse+rng.uniform(0,3))))**1.6
        add(t,noise(n,low,high)*env*flutter,pan,gain)
        if kind!="gesture" and sec>.2:
            tap=noise(300,2000,5700)*np.exp(-np.arange(300)/44)
            add(t,tap,pan,.049)
    elif kind in ("tick","pop","chime","rush"):
        sec={"tick":.05,"pop":.10,"chime":.66,"rush":.45}[kind]
        tt=np.arange(round(sec*sr))/sr
        if kind=="chime": sound=(np.sin(2*np.pi*660*tt)+.31*np.sin(2*np.pi*1740*tt))*np.exp(-tt*7)
        elif kind=="rush": sound=noise(len(tt),250,3000)*np.sin(tt/sec*np.pi)**1.6
        else: sound=(noise(len(tt),650,6900)+.45*np.sin(2*np.pi*tt*(680-2400*tt)))*np.exp(-tt*(76 if kind=="pop" else 165))
        add(t,sound,pan,e.get("gain",.18))
sf.write(root/"audio/narration.wav",dialogue,sr,subtype="PCM_16")
sf.write(root/"audio/pencil.wav",foley,sr,subtype="PCM_16")
if (root/"content/music-edit.json").is_file():
    from recorded_score import mix_recording
    mix_recording(root)
    raise SystemExit(0)

score=read(root/"audio/score.wav")
if score.ndim==1: score=np.stack([score,score],axis=1)
music=np.zeros_like(foley)
count=min(length,len(score))
music[:count]=score[:count]
music*=.042/max(.0001,np.sqrt(np.mean(music**2)))
duck=np.ones(length,dtype=np.float32)
for c in cues:
    lo=max(0,round((c["start"]-.14)*sr)); hi=min(length,round((c["speech_end"]+.22)*sr))
    idx=np.arange(lo,hi)/sr
    strength=np.clip((idx-c["start"]+.14)/.14,0,1)*np.clip((c["speech_end"]+.22-idx)/.22,0,1)
    duck[lo:hi]=np.minimum(duck[lo:hi],1-.36*strength)
music*=duck[:,None]
mix=dialogue[:,None]+music+foley
meter=ln.Meter(sr); gain=10**((-14-meter.integrated_loudness(mix))/20)
# A smooth linked limiter keeps transients below the AAC ceiling.
mix*=gain
peak=np.max(np.abs(mix),axis=1)
from scipy.ndimage import maximum_filter1d
envelope=maximum_filter1d(peak,size=193,mode="nearest")
lim=np.minimum(1,.84/np.maximum(.01,envelope))
mix*=lim[:,None]
sf.write(root/"audio/mix.wav",mix,sr,subtype="PCM_24")
print("Mix loudness",round(meter.integrated_loudness(mix),2),"LUFS; sample peak",round(20*np.log10(abs(mix).max()),2),"dBFS")
