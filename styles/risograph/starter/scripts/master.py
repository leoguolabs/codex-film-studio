"""Measure and master the final stereo mix with the project's serialized FFmpeg runner."""
from pathlib import Path
import json,re,subprocess,sys
base=Path(__file__).resolve().parents[1]
guard=[sys.executable,str(base/'scripts/ffmpeg_serial.py'),'--','-nostdin','-nostats','-hide_banner','-i',str(base/'audio/mix.wav')]
target='loudnorm=I=-14:LRA=8:TP=-1.2'
scan=subprocess.run(guard+['-af',target+':print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
m=json.loads(re.search(r'\{\s*"input_i".*?\}',scan.stderr,re.S)[0])
args=[('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')]
second=target+':'+':'.join(k+'='+m[v] for k,v in args)+':linear=true'
out=base/'audio/master.wav'
subprocess.run(guard+['-loglevel','error','-af',second,'-ar','48000','-c:a','pcm_s24le','-y',str(out)],check=True)
