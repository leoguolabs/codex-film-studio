"""Export representative stills or the full authored picture and mix at 24 fps."""
import argparse, importlib.util, json, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT))
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--still',nargs='+',type=float,help='Seconds at which to render PNGs')
    ap.add_argument('--output',default='media/film.mp4');ap.add_argument('--quality',type=float,default=1.3)
    ap.add_argument('--range',nargs=2,type=int,metavar=('FIRST','END')); args=ap.parse_args()
    import film
    cfg=json.loads((ROOT/'content/cues.json').read_text()); scene=film.Film(cfg,args.quality)
    if args.still:
        out=ROOT/'review/stills';out.mkdir(parents=True,exist_ok=True)
        for t in args.still:scene.frame(t).convert('RGB').save(out/f'{round(t*24):05}.jpg',quality=94)
        return
    target=(ROOT/args.output).resolve(); target.parent.mkdir(parents=True,exist_ok=True)
    a,b=args.range or (0,cfg['frames'])
    if not 0<=a<b<=cfg['frames']:raise ValueError('Invalid frame range')
    with tempfile.TemporaryDirectory(prefix='cutaway-') as cache:
        for idx in range(a,b):
            scene.frame(idx/24).convert('RGB').save(Path(cache)/f'{idx-a:06}.jpg',quality=97,subsampling=0)
            if idx%120==0:print(f'Plate {idx}/{b}',flush=True)
        cmd=[sys.executable,str(ROOT/'scripts/ffmpeg_serial.py'),'--','-hide_banner','-loglevel','error','-y',
             '-framerate','24','-i',str(Path(cache)/'%06d.jpg'),'-ss',str(a/24),'-i',str(ROOT/'audio/mix.wav'),
             '-t',str((b-a)/24),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','16',
             '-pix_fmt','yuv420p','-c:a','aac','-b:a','224k','-movflags','+faststart',str(target)]
        subprocess.run(cmd,check=True)
if __name__=='__main__':main()
