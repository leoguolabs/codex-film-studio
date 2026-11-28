"""Record separate British English Kokoro takes, then time the drawing to their duration."""
import argparse, hashlib, json, os
from pathlib import Path
import numpy as np
import soundfile as sf
ROOT=Path(__file__).resolve().parents[1]
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--models',type=Path); args=ap.parse_args()
    cfg=json.loads((ROOT/'content/narration.json').read_text())
    if not cfg['lines']:raise ValueError('Author the English narration first.')
    dest=ROOT/'audio/takes'; dest.mkdir(parents=True,exist_ok=True)
    t=cfg.get('lead',.42); cues=[]; voice=None
    for i,line in enumerate(cfg['lines']):
        txt=line.get('speak',line['text']); speaker=cfg.get('voice','bm_george'); speed=cfg.get('speed',.90)
        digest=hashlib.sha256(json.dumps([txt,speaker,speed]).encode()).hexdigest()[:12]
        take=dest/f'{i+1:02}-{digest}.wav'
        if not take.exists():
            if not args.models:raise ValueError('Pass --models PATH to generate changed speech.')
            if voice is None:
                import espeakng_loader
                os.environ.setdefault('ESPEAK_DATA_PATH',espeakng_loader.get_data_path())
                import onnxruntime as ort
                from kokoro_onnx import Kokoro
                options=ort.SessionOptions(); options.intra_op_num_threads=2; options.inter_op_num_threads=1
                session=ort.InferenceSession(str(args.models/'kokoro-v1.0.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
                voice=Kokoro.from_session(session,str(args.models/'voices-v1.0.bin'))
            samples,sr=voice.create(txt,voice=speaker,speed=speed,lang=cfg.get('lang','en-gb'))
            nz=np.flatnonzero(np.abs(samples)>.003)
            sf.write(take,samples[max(0,nz[0]-1000):nz[-1]+2000],sr)
        dur=sf.info(take).duration; end=t+dur+line.get('hold',.65)
        cues.append(dict(**line,start=round(t,5),speech_end=round(t+dur,5),end=round(end,5),wav=str(take.relative_to(ROOT))))
        t=end
    length=int(np.ceil((t+cfg.get('tail',.85))*24))
    (ROOT/'content/cues.json').write_text(json.dumps(dict(frames=length,cues=cues),indent=2)+'\n')
    print('frames',length,'seconds',length/24)
if __name__=='__main__':main()
