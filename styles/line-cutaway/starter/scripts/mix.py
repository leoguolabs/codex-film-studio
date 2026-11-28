"""Original struck-bar and plucked-bass chamber score, contact cues and voice."""
import json
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from math import gcd
ROOT=Path(__file__).resolve().parents[1]; SR=48000
def mix():
    cfg=json.loads((ROOT/'content/cues.json').read_text())
    sound=json.loads((ROOT/'content/sound.json').read_text())
    count=cfg['frames']*2000
    voice,score,foley=[np.zeros((count,2),np.float32) for _ in range(3)]
    def add(stem,t,wave,pan=0):
        start=max(0,round(t*SR)); n=min(len(wave),count-start)
        if n>0:stem[start:start+n]+=wave[:n,None]*np.sqrt([(1-pan)/2,(1+pan)/2])
    for cue in cfg['cues']:
        data,rate=sf.read(ROOT/cue['wav']); d=gcd(rate,SR)
        add(voice,cue['start'],resample_poly(data,SR//d,rate//d)*.96)
    root=sound.get('midi',55); beat=60/sound.get('bpm',92); rng=np.random.default_rng(41)
    notes=sound.get('phrase',[0,None,7,14,None,10,5,None,0,7,None,12,10,None,5,2])
    def note(hz,dur,mode):
        t=np.arange(int(dur*SR))/SR
        partials=([1,2,3] if mode=='bass' else [1,3.97,9.72])
        w=sum(a*np.sin(2*np.pi*hz*r*t)*np.exp(-t*(2.5+j*3)) for j,(r,a) in enumerate(zip(partials,[1,.34,.085])))
        return w*(1-np.exp(-t*230))*np.minimum(1,(dur-t)*16)
    i=0
    while (at:=.24+i*beat*.5)<count/SR-1:
        n=notes[i%len(notes)]; chord=[0,-5,2,-2][(i//(2*len(notes)))%4]
        if n is not None:
            add(score,at,note(440*2**((root+12+n+chord-69)/12),1.35,'mallet')*(.058 if i%2==0 else .036),.25*np.sin(i))
        if i%8==0:add(score,at,note(440*2**((root-12+chord-69)/12),1.15,'bass')*.089,-.17)
        i+=1
    note_list=ROOT/'content/music.json'
    if note_list.is_file():
        import sys
        sys.path.insert(0,str(ROOT))
        from engine.ensemble import play
        score=play(json.loads(note_list.read_text())['notes'],count,SR)
    for e in sound.get('events',[]):
        sec=e['at']; kind=e.get('kind','click'); dur=e.get('duration',.10 if kind=='click' else .38)
        t=np.arange(int(dur*SR))/SR
        if kind=='click':
            w=(rng.normal(0,.35,len(t))+np.sin(2*np.pi*1050*t)) * np.exp(-t*78)
        elif kind=='tone':
            w=np.sin(2*np.pi*e.get('hz',220)*t)*np.sin(np.pi*t/dur)**2
        else:
            noise=rng.normal(0,1,len(t)); w=np.convolve(noise,np.ones(12)/12,'same')*np.sin(np.pi*t/dur)**2
        add(foley,sec,w*e.get('gain',.055),e.get('pan',0))
    target=ROOT/'audio';target.mkdir(exist_ok=True)
    duck=np.ones(count)
    for cue in cfg['cues']:
        a,b=cue['start'],cue['speech_end']
        lo=max(0,int((a-.12)*SR)); hi=min(count,int((b+.24)*SR))
        tt=np.arange(lo,hi)/SR
        duck[lo:hi]=np.minimum(duck[lo:hi],1-.34*np.minimum(np.clip((tt-a+.12)/.12,0,1),np.clip((b+.24-tt)/.24,0,1)))
    if note_list.is_file():
        # Match dialogue/score balance on the actual measured speech intervals.
        voiced=np.zeros(count,bool)
        for cue in cfg['cues']:
            voiced[round(cue['start']*SR):round(cue['speech_end']*SR)]=True
        voice_rms=np.sqrt(np.mean(voice[voiced]**2))
        music_rms=np.sqrt(np.mean((score[voiced]*duck[voiced,None])**2))
        margin=float(sound.get('voice_over_music_db',12.0))
        score*=voice_rms/(max(music_rms,1e-8)*10**(margin/20))
    total=voice+score*duck[:,None]+foley
    if 'master_lufs' in sound:
        import sys
        sys.path.insert(0,str(ROOT))
        from engine.master import gain_curve
        gain=gain_curve(total,float(sound['master_lufs']))
    else:
        gain=min(1.45,.87/max(np.max(np.abs(total)),.001))
    for name,x in [('voice',voice*gain),('score',score*duck[:,None]*gain),('foley',foley*gain),('mix',total*gain)]:sf.write(target/(name+'.wav'),x,SR,subtype='PCM_24')
if __name__=='__main__':mix()
