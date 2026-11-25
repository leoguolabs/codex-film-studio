"""Record individual cue takes, or lay out the retained takes on the film clock."""
import argparse
import hashlib
import json
import os
from pathlib import Path

for name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[name] = "2"
import numpy as np
import soundfile as sf

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--models", type=Path, help="Directory containing kokoro-v1.0.onnx and voices-v1.0.bin")
args = parser.parse_args()
config = json.loads((root/"content/narration.json").read_text())
takes = root/"audio/takes"
takes.mkdir(parents=True, exist_ok=True)
voice = None
lines = config["lines"]
if not lines or len({r["id"] for r in lines}) != len(lines):
    raise ValueError("Supply a list of uniquely identified narration cues.")
timings = []
for line in lines:
    text = line.get("speak", line["text"])
    speaker = config.get("voice", "af_heart")
    speed = line.get("speed", config.get("speed", .88))
    digest = hashlib.sha256(json.dumps([text, speaker, speed]).encode()).hexdigest()[:10]
    file = takes / (line["id"] + "-" + digest + ".wav")
    if not file.exists():
        if not args.models:
            raise ValueError(f"Missing retained take {file.name}. Set --models to record it.")
        if voice is None:
            import shutil
            import sys
            cli = shutil.which("espeak-ng")
            if cli and sys.platform == "darwin":
                system_lib = Path(cli).resolve().parents[1]/"lib/libespeak-ng.dylib"
                if system_lib.exists():
                    os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", str(system_lib))
            import espeakng_loader
            os.environ.setdefault("ESPEAK_DATA_PATH", espeakng_loader.get_data_path())
            import onnxruntime as ort
            from kokoro_onnx import Kokoro
            opts=ort.SessionOptions()
            opts.intra_op_num_threads=2
            opts.inter_op_num_threads=1
            model=ort.InferenceSession(str(args.models/"kokoro-v1.0.onnx"),sess_options=opts,providers=["CPUExecutionProvider"])
            voice=Kokoro.from_session(model,str(args.models/"voices-v1.0.bin"))
        sig, sr = voice.create(text, voice=speaker, speed=speed, lang="en-us")
        audible = np.flatnonzero(np.abs(sig) > .003)
        if not len(audible):
            raise ValueError("Silent take " + line["id"])
        sig=sig[max(0,audible[0]-720):audible[-1]+1501]
        sf.write(file,sig,sr)
    info=sf.info(file)
    timings.append(info.frames/info.samplerate)
    line["wav"]=file.relative_to(root).as_posix()
    print(line["id"],round(timings[-1],2),text,flush=True)
lead=config.get("lead",.85)
tail=config.get("tail",4.)
duration=config["duration"]
weights=[line.get("gap",1.) for line in lines[:-1]]
free=duration-lead-tail-sum(timings)
if weights and free/sum(weights)<.13:
    raise ValueError(f"Narration needs more room; recorded speech {sum(timings):.2f}s in {duration}s.")
out=[]
at=lead
for i,(line,seconds) in enumerate(zip(lines,timings)):
    gap=weights[i]*free/sum(weights) if i<len(weights) else tail
    spoken=at+seconds
    out.append(dict(id=line["id"],start=round(at,4),speech_end=round(spoken,4),
                    end=round(min(duration,spoken+min(.66,gap*.85)),4),
                    text=line["text"],side=line.get("side","left"),wav=line["wav"],
                    wav_sha256=hashlib.sha256((root/line["wav"]).read_bytes()).hexdigest()))
    at=spoken+gap
(root/"content/cues.json").write_text(json.dumps(out,indent=2)+"\n")
def stamp(t):
    n=round(t*1000)
    return f"{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}"
(root/"media").mkdir(exist_ok=True)
(root/"media/English.srt").write_text("\n\n".join(f'{i+1}\n{stamp(q["start"])} --> {stamp(q["end"])}\n{q["text"]}' for i,q in enumerate(out))+"\n")
print(f"Speech {sum(timings):.1f}s. Film {duration}s.")
