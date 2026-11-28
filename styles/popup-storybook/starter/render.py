"""Export an exact timeline interval or a single still from the editable story."""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image
from film import BOOK, frame

ROOT=Path(__file__).resolve().parent
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--still',type=float)
    ap.add_argument('--start',type=float,default=0)
    ap.add_argument('--end',type=float)
    ap.add_argument('--width',type=int,default=1920)
    ap.add_argument('--output',type=Path,required=True)
    a=ap.parse_args()
    book=BOOK
    if not book['stages']:raise ValueError('Author at least one printed stage first.')
    width=a.width;height=round(width*9/16/2)*2
    a.output.parent.mkdir(exist_ok=True,parents=True)
    if a.still is not None:
        im=Image.frombytes('RGB',(width,height),frame(a.still,width,height))
        im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(a.output)
        return
    fps=book.get('fps',30)
    first=round(a.start*fps); last=round((a.end or book['duration'])*fps)
    if last<=first:raise ValueError('Empty frame interval')
    cmd=[sys.executable,str(ROOT/'engine/ffmpeg_serial.py'),'--','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{width}x{height}','-r',str(fps),'-i','pipe:0','-ss',str(first/fps),'-i',str(ROOT/'audio/mix.wav'),'-map','0:v','-map','1:a','-vf','vflip','-c:v','libx264','-preset','veryfast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','224k','-metadata:s:a:0','language=eng','-t',str((last-first)/fps),'-movflags','+faststart',str(a.output)]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as pipe:
        for n in range(first,last):
            pipe.stdin.write(frame(n/fps,width,height))
            if n%150==0:print(f'Frame {n} / {last}',flush=True)
        pipe.stdin.close()
        if pipe.wait():raise RuntimeError('Film encoding failed')
if __name__=='__main__':main()
