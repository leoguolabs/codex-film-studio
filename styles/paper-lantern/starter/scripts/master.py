"""Match a finished stereo mix to a delivery loudness while retaining its premaster."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys

project=Path(__file__).resolve().parents[1]
audio=project/'audio'
source=audio/'premaster.wav'
mix=audio/'mix.wav'
# Reuse the premaster on a repeat run, and replace it when sound.py writes a fresh mix.
receipt=audio/'master-measurement.json'
previous=json.loads(receipt.read_text()) if receipt.exists() else {}
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
if not source.exists() or previous.get('output_sha256')!=digest(mix):
    source.write_bytes(mix.read_bytes())
gate=[sys.executable,str(project/'scripts/ffmpeg_serial.py'),'--','-hide_banner','-nostats','-i',str(source)]
target='I=-14:TP=-1.4:LRA=6'
measure=subprocess.run([*gate,'-af','loudnorm='+target+':print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
values=json.loads(re.findall(r'\{\s*"input_i".*?\}',measure.stderr,re.S)[-1])
settings=':'.join(['measured_I='+values['input_i'],'measured_TP='+values['input_tp'],'measured_LRA='+values['input_lra'],'measured_thresh='+values['input_thresh'],'offset='+values['target_offset']])
subprocess.run([*gate,'-loglevel','error','-af','loudnorm='+target+':'+settings+':linear=true','-ar','48000','-c:a','pcm_s24le','-y',str(mix)],check=True)
values['output_sha256']=digest(mix)
receipt.write_text(json.dumps(values,indent=2)+'\n')
