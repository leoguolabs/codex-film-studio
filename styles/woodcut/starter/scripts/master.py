"""Measure and master a stereo WAV under the same FFmpeg lock as the film encoder."""
import argparse, json, re, subprocess, sys
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('input',type=Path);parser.add_argument('output',type=Path)
args=parser.parse_args()
if args.input.resolve()==args.output.resolve():parser.error('Choose a different output file.')
guard=Path(__file__).with_name('ffmpeg_serial.py')
base=[sys.executable,str(guard),'--','-nostdin','-hide_banner','-nostats','-i',str(args.input)]
target='loudnorm=I=-14:TP=-1.3:LRA=9'
def measure(command):
    log=subprocess.run(command,capture_output=True,text=True,check=True).stderr
    match=re.search(r'\{\s*"input_i".*?\}',log,re.S)
    if not match:raise ValueError('Missing loudness report')
    return json.loads(match.group())
first=measure(base+['-af',target+':print_format=json','-f','null','-'])
settings=':'.join(f'{needed}={first[key]}' for needed,key in [
 ('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),
 ('measured_thresh','input_thresh'),('offset','target_offset')])
result=measure(base+['-af',target+':'+settings+':linear=true:print_format=json','-ar','48000','-c:a','pcm_s24le','-y',str(args.output)])
args.output.with_suffix('.loudness.json').write_text(json.dumps(result,indent=2)+'\n')
print(result['normalization_type'],result['output_i'],result['output_tp'])
