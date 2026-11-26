"""Edit an accepted instrumental and recorded foley on the picture clock."""
import json, math
from functools import lru_cache
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

root=Path(__file__).resolve().parents[1]
plan=json.loads((root/'content/recording-edit.json').read_text())
cues=json.loads((root/'content/cues.json').read_text())
sr=48000
n=round(json.loads((root/'content/narration.json').read_text())['duration']*sr)
score,foley,speech=[np.zeros((n,2)) for _ in range(3)]
clock=np.arange(n)/sr

@lru_cache(maxsize=20)
def read(path):
    src,rate=sf.read(root/path,always_2d=True)
    factor=math.gcd(rate,sr)
    return resample_poly(src,sr//factor,rate//factor,axis=0)

def place(target,at,a):
    start=round(at*sr);length=min(len(a),len(target)-start)
    if length>0:target[start:start+length]+=a[:length]

def envelope(length,attack,release):
    t=np.arange(length)/sr
    return np.sin(.5*np.pi*np.clip(t/max(attack,1/sr),0,1))*np.sin(.5*np.pi*np.clip((length/sr-t)/max(release,1/sr),0,1))

if not plan['music_source_file']:
    raise SystemExit('Set music_source_file in content/recording-edit.json.')
source=read(plan['music_source_file'])
for e in plan['music_edits']:
    at,start,duration,attack,release,gain=e
    a=source[round(sr*start):round(sr*(start+duration))]
    place(score,at,a*envelope(len(a),attack,release)[:,None]*gain)
for start,end,down,up,floor in plan['music_space']:
    amt=np.minimum(np.clip((clock-start+down)/down,0,1),np.clip((end+up-clock)/up,0,1))
    score*=1-(1-floor)*amt[:,None]

for event in plan['recorded_foley']:
    label,key,at,start,length,rate,peak,pan,lo,hi,attack,release=event
    a=read(str(Path(plan['field_directory']) / (key+'.flac')))
    a=a[round(start*sr):round((start+length)*sr)].mean(axis=1)
    a=sosfilt(butter(2,[lo,hi],btype='bandpass',fs=sr,output='sos'),a)
    # Pitch and duration change together, as on a tape edit.
    if rate!=1:a=np.interp(np.arange(0,len(a)-1,rate),np.arange(len(a)),a)
    a*=envelope(len(a),attack,release)
    a*=peak/max(np.max(np.abs(a)),1e-6)
    stereo=np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
    place(foley,at,a[:,None]*stereo)
# The two early room reflections are quieter than the attack and do not repeat it.
dry=foley.copy()
for dt,gain in [(.035,.077),(.067,.039)]:
    delay=round(dt*sr);foley[delay:]+=dry[:-delay,::-1]*gain

speech_duck=np.ones(n)
for c in cues:
    a=read(c['wav']).mean(axis=1)
    place(speech,c['start'],a[:,None]*.76/np.sqrt(2))
    s,e=c['start'],c['speech_end']
    depth=np.minimum(np.clip((clock-s+.15)/.15,0,1),np.clip((e+.31-clock)/.31,0,1))
    speech_duck=np.minimum(speech_duck,1-.57*depth)
score*=speech_duck[:,None]
foley*=(.50+.50*speech_duck[:,None])
fade=envelope(n,.012,.20)[:,None]
buses={'score':score*fade,'foley':foley*fade,'speech':speech*fade}
total=sum(buses.values());gain=min(1,.94/np.max(np.abs(total)))
for k,b in {**buses,'mix':total}.items():sf.write(root/'audio'/(k+'.wav'),b*gain,sr,subtype='PCM_24')
