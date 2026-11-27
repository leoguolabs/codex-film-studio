"""Play supplied one-note recordings at the closest available pitch."""
from functools import lru_cache
import json
from pathlib import Path
import numpy as np
import soundfile as sf

bank=Path(__file__).resolve().parents[1]/'audio/instruments'
config=bank/'map.json'
mapping=json.loads(config.read_text()) if config.exists() else {}

@lru_cache(maxsize=24)
def recording(name):
    x,sr=sf.read(bank/name,always_2d=True)
    x=x.mean(axis=1)
    # Trim leading silence to keep note attacks attached to the score clock.
    active=np.flatnonzero(np.abs(x)>max(.0004,.012*np.max(abs(x))))
    if len(active):x=x[max(0,active[0]-round(.004*sr)):]
    return x/max(.001,np.percentile(abs(x),99.8)),sr

def perform(kind,key,duration,rate):
    options=mapping.get(kind)
    if not options:return None
    chosen=min(options,key=lambda entry:abs(entry['pitch']-key))
    x,sr=recording(chosen['file'])
    t=np.arange(round(duration*rate))/rate
    wave=np.interp(t*sr*2**((key-chosen['pitch'])/12),np.arange(len(x)),x,right=0)
    attack=.004 if kind=='harp' else .085
    release=min(duration*.32,.15 if kind=='harp' else .39)
    return wave*np.minimum(1,t/attack)*np.minimum(1,(duration-t)/release)
