"""Mix retained narration, a selected instrumental performance and soft paper Foley."""
import json
import math
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d
import pyloudnorm as loud
from paper_sound import render_foley, rms
from recorded_music import render_music

root=Path(__file__).resolve().parents[1]
read=lambda file:json.loads((root/file).read_text())
sr=48000
length=round(read('content/narration.json')['duration']*sr)
narration=np.zeros((length,2),dtype=np.float32)
speech_mask=np.zeros(length,dtype=bool)
def filtered(samples,freq,mode,order=2):
    return signal.sosfilt(signal.butter(order,freq,btype=mode,fs=sr,output='sos'),samples)
def add(bus,x,t,gain,pan=0):
    start=round(t*sr)
    if start<0:x=x[-start:];start=0
    count=min(len(x),length-start)
    if count<1:return
    a=(1+np.clip(pan,-1,1))*np.pi/4
    bus[start:start+count]+=x[:count,None]*gain*np.array([np.cos(a),np.sin(a)])
for cue in read('content/cues.json'):
    x,rate=sf.read(root/cue['wav'],always_2d=True)
    g=math.gcd(rate,sr)
    x=filtered(signal.resample_poly(x.mean(1),sr//g,rate//g),80,'highpass')
    x/=max(.001,np.max(np.abs(x)))
    x=np.tanh(1.4*x)*.72
    add(narration,x,cue['start'],1)
    speech_mask[round(cue['start']*sr):round(cue['speech_end']*sr)]=True

def render_chart(chart):
    score=np.zeros_like(narration)
    bank={}
    for info in read('instruments/samples.json'):
        x,rate=sf.read(root/'instruments'/info['file'],always_2d=True)
        x=x.mean(1)
        hit=np.flatnonzero(abs(x)>.007*np.max(abs(x)))
        x=x[max(0,hit[0]-int(.008*rate)):] if len(hit) else x
        x=x/(np.max(abs(x))+1e-9)
        bank.setdefault(info['instrument'],[]).append((info['root'],x,rate))
    if not chart['notes']:raise ValueError('Write score notes in content/score.json.')
    for i,(at,inst,key,dur,velocity,*pos) in enumerate(chart['notes']):
        samples=bank[inst]
        pitched=inst not in ('block','shaker','claves')
        base,x,rate= min(samples,key=lambda q:abs(q[0]-key)) if pitched else samples[i%len(samples)]
        step=(rate/sr)*(2**((key-base)/12) if pitched else 1)
        n=min(round(dur*sr),int((len(x)-1)/step))
        if n<2:continue
        part=np.interp(np.arange(n)*step,np.arange(len(x)),x)
        release=min(int(.07*sr),n//3)
        if release:part[-release:]*=np.linspace(1,0,release)**1.4
        pan=pos[0] if pos else {'bass':-.10,'clarinet':.22,'bassoon':-.20,'harp':.18,'bell':.3,'block':.05,'shaker':-.27,'claves':-.12}[inst]
        add(score,part,at,velocity,pan)
    clock=np.arange(length)/sr
    for l,r in chart.get('rests',[]):
        score*=np.clip(np.maximum((l-clock)/.12,(clock-r)/.12),0,1)[:,None]
    score-=np.column_stack([filtered(score[:,i],(300,4000),'bandpass') for i in range(2)])*.5
    return score

music_file=root/'content/music.json'
if music_file.exists():
    edit=read('content/music.json')
    score=render_music(root,edit,length,sr,narration,speech_mask)
    marker_db=edit.get('marker_under_voice_db',-32.0)
    music_name=edit['title']
else:
    chart=read('content/score.json')
    score=render_chart(chart)
    score*=rms(narration[speech_mask])/rms(score[speech_mask])*10**(chart.get('music_db',-20)/20)
    marker_db=-32.0
    music_name=chart.get('title','Authored score')

pen,paper=render_foley(read('content/events.json'),length,sr,narration,speech_mask,marker_db)
foley=pen+paper
mix=narration+score+foley
meter=loud.Meter(sr)
mix*=10**((-15.-meter.integrated_loudness(mix))/20)
peak=maximum_filter1d(np.abs(mix).max(axis=1),size=193,mode='nearest')
mix*=np.minimum(1,0.80/np.maximum(peak,1e-5))[:,None]
voice_level=rms(narration[speech_mask])
def relative(track):
    return round(20*np.log10(rms(track[speech_mask])/voice_level),2)
def peak_db(track):
    return round(20*np.log10(max(1e-10,float(np.abs(track).max()))),2)

for name,track in [('narration',narration),('score',score),('marker',pen),('paper',paper),
                   ('marker-and-paper',foley),('mix',mix)]:
    sf.write(root/'audio'/(name+'.wav'),track,sr,subtype='PCM_24')
levels={'music':music_name,'music_to_speech_db':relative(score),'marker_to_speech_db':relative(pen),
        'foley_to_speech_db':relative(foley),'marker_sample_peak_dbfs':peak_db(pen),
        'paper_sample_peak_dbfs':peak_db(paper),'mix_lufs':round(meter.integrated_loudness(mix),2),
        'mix_sample_peak_dbfs':peak_db(mix),'sample_rate':sr}
(root/'audio/mix-levels.json').write_text(json.dumps(levels,indent=2)+'\n')
print(json.dumps(levels))
