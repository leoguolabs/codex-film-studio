"""Encode the rendered frames and the accepted stereo mix in presentation order."""
import argparse,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('frames',type=Path)
p.add_argument('output',type=Path)
args=p.parse_args()
base=Path(__file__).resolve().parents[1]
count=round(json.loads((base/'content/narration.json').read_text())['duration']*24)
files=sorted(args.frames.glob('*.png'))
if [x.name for x in files]!=[f'{i:05}.png' for i in range(count)]:raise ValueError('Missing or extra numbered PNG frames')
subprocess.run([sys.executable,str(base/'scripts/master.py')],check=True)
subprocess.run([sys.executable,str(base/'scripts/ffmpeg_serial.py'),'--','-nostdin','-hide_banner','-loglevel','warning','-n','-framerate','24','-i',str(args.frames/'%05d.png'),'-i',str(base/'audio/master.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','veryfast','-crf','16','-tune','grain','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-movflags','+faststart','-t',str(count/24),str(args.output)],check=True)
