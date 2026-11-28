"""Arrange original plucks, bass, brushes, tuned metal, drum and paper against measured speech."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt,resample_poly
from math import gcd
base=Path(__file__).resolve().parents[1]
cfg=json.loads((base/'content/score.json').read_text())
cues=json.loads((base/'content/cues.json').read_text())
sr=48000
duration=json.loads((base/'content/narration.json').read_text())['duration']
n=round(sr*duration)
score=np.zeros((n,2),np.float32);fx=np.zeros_like(score);vo=np.zeros_like(score)
rng=np.random.default_rng(227)
def place(stem,t,s,gain,pan=0):
    pos=round(t*sr);samples=min(n-pos,len(s))
    if samples>0 and pos>=0:stem[pos:pos+samples]+=s[:samples,None]*gain*np.sqrt(np.array([(1-pan)/2,(1+pan)/2]))
def tone(midi,length,kind):
    t=np.arange(round(length*sr))/sr;f=440*2**((midi-69)/12)
    partials={'guitar':[(1,1),(2,.48),(3,.29),(4,.12),(5,.09)],'bass':[(1,1),(2,.48),(3,.18)],'metal':[(1,1),(3,.26),(4.02,.18),(7.1,.06)],'flute':[(1,1),(2,.2),(3,.09)]}[kind]
    decay={'guitar':3.5,'bass':2.8,'metal':2.9,'flute':.9}[kind]
    s=sum(a*np.sin(2*np.pi*f*r*t+(.018*np.sin(2*np.pi*5*t) if kind=='flute' else .11*np.sin(2*np.pi*f*t)*np.exp(-t*24)))*np.exp(-t*(decay+.5*r)) for r,a in partials)
    attack=.06 if kind=='flute' else .005
    return s*(1-np.exp(-t/attack))*np.minimum(1,np.maximum(0,(length-t)/.065))
def noise(length,low,high,k):
    t=np.arange(round(length*sr))/sr
    a=sosfilt(butter(3,[low,high],btype='bandpass',fs=sr,output='sos'),rng.normal(size=len(t)))
    return a*np.exp(-t*k)*np.minimum(1,t/.004)*np.minimum(1,(length-t)/.02)
beat=60/cfg.get('bpm',120);start=cfg.get('start',2);yellow,pink=cfg['arrivals'];progression=cfg['chords']
bar=0
while start+bar*4*beat<duration-.3:
    a=start+bar*4*beat;ch=progression[bar%len(progression)]
    for j in [0,1.5,2.5,3.5]:
        for k,key in enumerate(ch[1:]):place(score,a+j*beat+.012*k,tone(key,.83,'guitar'),.058,-.18+k*.11)
    if a>=yellow and a<duration-3:
        for h in range(8):place(score,a+h*beat/2,noise(.11,4300,11200,31),.14*(.6 if h%2==0 else 1),-.27)
        for h in [1,2.5]:place(score,a+h*beat,tone(83,.09,'metal'),.07,.37)
    if a>=pink and a<duration-4:
        for h,key in [(0,ch[0]),(2,ch[0]+7)]:place(score,a+h*beat,tone(key,.8,'bass'),.22,-.04)
        for h,key in enumerate(cfg['melody'][bar%len(cfg['melody'])]):
            if key:place(score,a+h*beat,tone(key,.41 if h%2 else .7,'flute' if bar%3==0 else 'metal'),.075,.28)
    bar+=1
for at,kind in cfg.get('effects',[]):
    if kind=='drum':
        place(fx,at,noise(.29,350,7200,6),.45,-.18)
        place(fx,at+.16,tone(35,.32,'bass'),.5)
    elif kind=='paper':place(fx,at,noise(.63,580,6800,4),.53,.2)
    elif kind=='bell':place(fx,at,tone(91,.95,'metal'),.32,.16)
    elif kind=='clack':
        place(fx,at,noise(.09,700,4000,63),.66);place(fx,at+.012,tone(60,.09,'guitar'),.27)
    else: raise ValueError(kind)
t=np.arange(n)/sr
duck=np.ones(n)
for c in cues:
    sig,rate=sf.read(base/c['wav']);sig=sig.mean(axis=1) if sig.ndim==2 else sig
    d=gcd(sr,rate);sig=resample_poly(sig,sr//d,rate//d)
    sig*=min(7,.145/max(1e-7,np.sqrt(np.mean(sig**2))))
    place(vo,c['start'],sig,1.35)
    duck=np.minimum(duck,1-.63*np.minimum(np.clip((t-c['start']+.18)/.18,0,1),np.clip((c['speech_end']+.38-t)/.38,0,1)))
for a,b in cfg.get('rests',[]):
    gate=1-np.minimum(np.clip((t-a)/.06,0,1),np.clip((b-t)/.04,0,1));score*=gate[:,None]
score*=np.minimum(1,np.maximum(0,(duration-t)/.65))[:,None]
master=score*duck[:,None]+fx+vo
factor=min(.93/max(.001,np.max(np.abs(master))),1.55)
folder=base/'audio';folder.mkdir(exist_ok=True)
for name,s in [('score',score),('effects',fx),('voice',vo),('mix',master*factor)]:
    sf.write(folder/(name+'.wav'),s,sr,subtype='PCM_24')
