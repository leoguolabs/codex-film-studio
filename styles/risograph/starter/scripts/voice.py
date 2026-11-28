"""Record or reuse English takes and bind them to the 24 fps drawing clock."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

import numpy as np
import soundfile as sf

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--models',type=Path,help='Directory with the Kokoro v1.0 ONNX model and voice bank')
args=p.parse_args()
config=json.loads((root/'content/narration.json').read_text())
lines=config['lines']
if not lines or len({line['id'] for line in lines})!=len(lines):
    raise ValueError('Supply voice lines with unique IDs.')
takes=root/'audio/takes'; takes.mkdir(parents=True,exist_ok=True)
voice=None
duration=config['duration']
cues=[]
for i,line in enumerate(lines):
    text=line.get('speak',line['text'])
    speaker=config.get('voice','bm_george')
    lang=config.get('lang','en-gb')
    speed=line.get('speed',config.get('speed',.84))
    digest=hashlib.sha256(json.dumps([text,speaker,lang,speed]).encode()).hexdigest()[:12]
    take=takes/(line['id']+'-'+digest+'.wav')
    if not take.exists():
        if not args.models: raise ValueError('Missing '+str(take)+'. Pass --models to record changed narration.')
        if voice is None:
            exe=shutil.which('espeak-ng')
            if exe and sys.platform=='darwin':
                lib=Path(exe).resolve().parents[1]/'lib/libespeak-ng.dylib'
                if lib.is_file():os.environ.setdefault('PHONEMIZER_ESPEAK_LIBRARY',str(lib))
            import espeakng_loader
            os.environ.setdefault('ESPEAK_DATA_PATH',espeakng_loader.get_data_path())
            import onnxruntime as ort
            from kokoro_onnx import Kokoro
            opt=ort.SessionOptions()
            opt.intra_op_num_threads=2;opt.inter_op_num_threads=1
            sess=ort.InferenceSession(str(args.models/'kokoro-v1.0.onnx'),sess_options=opt,providers=['CPUExecutionProvider'])
            voice=Kokoro.from_session(sess,str(args.models/'voices-v1.0.bin'))
        sig,sr=voice.create(text,voice=speaker,speed=speed,lang=lang)
        active=np.flatnonzero(np.abs(sig)>.003)
        if len(active)==0:raise ValueError('Silent take '+line['id'])
        sf.write(take,sig[max(0,active[0]-720):active[-1]+1501],sr)
    info=sf.info(take)
    start=line['at']; stop=start+info.frames/info.samplerate
    next_start=lines[i+1]['at'] if i+1<len(lines) else duration
    print(line['id'],round(start,2),round(stop,2),text,flush=True)
    if stop>next_start-.035:
        raise ValueError(f"Voice overlaps next cue or film end. Adjust cue {line['id']} or the next start for the measured take.")
    caption=line.get('caption',[line['text']])
    if ' '.join(' '.join(caption).split())!=' '.join(line['text'].split()):
        raise ValueError('Split caption must reproduce the displayed text.')
    cues.append(dict(id=line['id'],start=start,speech_end=round(stop,4),end=round(min(next_start-.04,max(start+1.8,stop+.6)),4),
                     text=line['text'],caption=caption,wav=take.relative_to(root).as_posix(),sha256=hashlib.sha256(take.read_bytes()).hexdigest()))
(root/'content/cues.json').write_text(json.dumps(cues,indent=2)+'\n')
def stamp(t):
    n=round(t*1000)
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
(root/'media').mkdir(exist_ok=True)
(root/'media/English.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n'+ '\n'.join(c['caption']) for i,c in enumerate(cues))+'\n')
