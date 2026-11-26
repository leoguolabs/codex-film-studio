"""Two-pass EBU R128 mastering for a finished production mix and its stereo delivery WAV."""
import argparse,json,re,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--lufs',type=float,required=True)
p.add_argument('--range',type=float,default=9)
p.add_argument('--peak',type=float,default=-1.6)
a=p.parse_args();root=Path(__file__).resolve().parents[1];audio=root/'audio'
gate=[sys.executable,str(root/'scripts/ffmpeg_serial.py'),'--','-hide_banner','-nostats','-y','-i',str(audio/'mix.wav')]
target=f'loudnorm=I={a.lufs}:TP={a.peak}:LRA={a.range}'
def run(filt,dest):
    cmd=[*gate,'-af',filt,*dest]
    result=subprocess.run(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    if result.returncode:raise RuntimeError(result.stderr[-2000:])
    match=re.search(r'\{\s*"input_i".*?\}',result.stderr,re.S)
    if not match:raise ValueError('FFmpeg did not report measurements')
    return json.loads(match.group())
first=run(target+':print_format=json',['-f','null','-'])
values=':'.join(key+'='+first[source] for key,source in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
partial=audio/'master.partial.wav'
second=run(target+':'+values+':linear=true:print_format=json',['-ar','48000','-ac','2','-c:a','pcm_s24le',str(partial)])
partial.replace(audio/'master.wav')
(audio/'mastering.json').write_text(json.dumps(dict(target={'lufs':a.lufs,'range':a.range,'true_peak':a.peak},first=first,second=second),indent=2)+'\n')
print(second)
