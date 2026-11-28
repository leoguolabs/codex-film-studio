"""Play an authored note list using local CC0 acoustic instrument recordings."""
import json
from functools import lru_cache
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt
SAMPLES=Path(__file__).parent/'samples'
@lru_cache(maxsize=8)
def instrument(name):
    spec=next(i for i in json.loads((SAMPLES/'credits.json').read_text()) if i['name']==name)
    x,rate=sf.read(SAMPLES/(name+'.flac'))
    return x/max(np.max(np.abs(x)),1e-7),rate,spec['note']

def play(notes,length,rate=48000):
    m=np.zeros((length,2),np.float32)
    for name,at,pitch,hold,level,pan in notes:
        x,sr,original=instrument(name)
        t=np.arange(round(hold*rate))/rate
        wave=np.interp(t*sr*2**((pitch-original)/12),np.arange(len(x)),x,left=0,right=0)
        release=min(.27,hold*.57)
        envelope=np.minimum(1,t/.005)*np.clip((hold-t)/release,0,1)**1.4
        s=max(0,round(at*rate));n=min(len(wave),length-s)
        if n>0:m[s:s+n]+=(level*wave[:n]*envelope[:n])[:,None]*np.sqrt([(1-pan)*.5,(1+pan)*.5])
    room=m.copy()
    for delay,vol in ((.035,.11),(.063,.061),(.091,.036)):
        d=round(delay*rate)
        room[d:]+=m[:-d,::-1]*vol
    presence=sosfilt(butter(2,[320,3400],btype='bandpass',fs=rate,output='sos'),room,axis=0)
    return (room-.26*presence).astype('f4')
