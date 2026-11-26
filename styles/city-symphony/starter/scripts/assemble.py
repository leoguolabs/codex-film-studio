"""Cut supplied photographic plates and a soundtrack on one frame clock."""
import argparse
from bisect import bisect_right
from functools import lru_cache
import hashlib
import fcntl
import tempfile
import json
from pathlib import Path
import subprocess
import sys

import cv2
import numpy as np

from print_look import Print, cover, day_ring, grid, split


class Plates:
    """Prepare a timestamp index from actual decoded picture presentation times."""
    def __init__(self, project, assets, width, height):
        self.project = project
        self.assets = {}
        self.width = width
        self.height = height
        for key, entry in assets.items():
            source = (project / entry['file']).resolve()
            if not source.is_file():
                raise ValueError(f'Missing source for {key}: {source}')
            if entry.get('still'):
                image = cv2.imread(str(source))
                if image is None:
                    raise ValueError(f'Unreadable image: {source}')
                self.assets[key] = image
                continue
            start = entry.get('in', 0)
            end = entry.get('out')
            signature = [str(source),source.stat().st_size,source.stat().st_mtime_ns,start,end,width,height]
            digest = hashlib.sha256(json.dumps(signature).encode()).hexdigest()[:20]
            directory = project / '.plate-cache' / digest
            directory.mkdir(exist_ok=True,parents=True)
            index = directory / 'timestamps.json'
            with (directory / "prepare.lock").open("a") as lock:
                fcntl.flock(lock,fcntl.LOCK_EX)
                if not index.exists():
                    cap = cv2.VideoCapture(str(source))
                    times = []
                    while cap.grab():
                        t = cap.get(cv2.CAP_PROP_POS_MSEC)/1000
                        if end is not None and t >= end:
                            break
                        if t < start or (times and t <= times[-1]):
                            continue
                        ok, frame = cap.retrieve()
                        if not ok:
                            raise ValueError(f'Could not decode {source} at {t}')
                        out = directory / f'{len(times):07}.jpg'
                        if not cv2.imwrite(str(out),cover(frame,width,height),[cv2.IMWRITE_JPEG_QUALITY,92]):
                            raise OSError(out)
                        times.append(t)
                    cap.release()
                    if len(times) < 2:
                        raise ValueError(f'No moving interval for {key}')
                    partial = index.with_suffix('.tmp')
                    partial.write_text(json.dumps(times))
                    partial.replace(index)
            self.assets[key] = (directory,json.loads(index.read_text()))

    @lru_cache(maxsize=48)
    def read(self, directory, n):
        image = cv2.imread(str(directory / f'{n:07}.jpg'))
        if image is None:
            raise ValueError(f'Incomplete plate cache at frame {n}')
        return image

    def exposure(self, leaf, age, fps):
        source = self.assets[leaf['asset']]
        zoom = leaf.get('zoom', 1.0)
        if isinstance(zoom,list):
            progress = min(1, max(0, age / max(1,leaf['frames']-1)))
            zoom = zoom[0] + (zoom[1]-zoom[0])*progress*progress*(3-2*progress)
        if isinstance(source,np.ndarray):
            return cover(source,self.width,self.height,zoom,leaf.get('center',(.5,.5)))
        directory, times = source
        speed = leaf.get('speed',1.0)
        t = leaf.get('in',times[0]) + age*speed/fps
        interval = np.median(np.diff(times[:min(40,len(times))]))
        if t < times[0]-interval or t > times[-1]+interval:
            raise ValueError(f'{leaf["asset"]} exhausts its source at {t:.3f} seconds')
        def at(stamp):
            a = max(0,min(len(times)-2,bisect_right(times,stamp)-1))
            u = float(np.clip((stamp-times[a])/(times[a+1]-times[a]),0,1))
            return cv2.addWeighted(self.read(directory,a),1-u,self.read(directory,a+1),u,0)
        if abs(speed)<=1.1:
            image = at(t)
        else:
            n = min(12,max(2,round(abs(speed))))
            offsets = np.linspace(-.45,.45,n)*speed/fps
            image = at(t+offsets[0])
            for j,offset in enumerate(offsets[1:],2):
                image = cv2.addWeighted(image,1-1/j,at(t+offset),1/j,0)
        return cover(image,self.width,self.height,zoom,leaf.get('center',(.5,.5)))


def render(spec_file, output):
    data = json.loads(spec_file.read_text())
    project = spec_file.parent.parent
    width,height,fps = data['width'],data['height'],data['fps']
    shots = data['shots']
    if not shots or any(int(s['frames'])!=s['frames'] or s['frames']<1 for s in shots):
        raise ValueError('Supply at least one positive whole-frame shot.')
    duration = sum(s['frames'] for s in shots)/fps
    audio = (project/data['audio']).resolve()
    if not audio.is_file():
        raise ValueError('Supply a mixed soundtrack covering the authored edit.')
    info = subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(audio)],text=True)
    if float(info)+.5/fps<duration:
        raise ValueError('Soundtrack ends before the last picture frame.')
    plates = Plates(project,data['assets'],width,height)
    treatment = Print(width,height)
    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=output.stem+'-',suffix='.mp4',dir=output.parent,delete=False) as temp:
        pending = Path(temp.name)
    cmd = [sys.executable,str(Path(__file__).with_name('ffmpeg_serial.py')),'--','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{width}x{height}','-r',str(fps),'-i','pipe:0','-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-t',str(duration),'-movflags','+faststart',str(pending)]
    f = 0
    try:
        with subprocess.Popen(cmd,stdin=subprocess.PIPE) as proc:
            try:
                for shot in shots:
                    kind = shot['type']
                    for age in range(shot['frames']):
                        if kind=='black':
                            image = np.zeros((height,width,3),np.uint8)
                        else:
                            if kind in ('clip','still'):
                                image = plates.exposure(shot,age,fps)
                            elif kind=='split':
                                left,right = [plates.exposure(p,age,fps) for p in shot['plates']]
                                image = split(left,right,age,shot.get('gutter',4))
                            elif kind=='grid':
                                cols,rows = shot['grid']
                                if len(shot['plates'])!=cols*rows:
                                    raise ValueError('Grid cells and assigned plates differ.')
                                images = [plates.exposure(p,age,fps) for p in shot['plates']]
                                image = grid(images,cols,rows,width,height,shot.get('gutter',4))
                            elif kind=='flicker':
                                leaf = shot['plates'][(age//shot.get('hold',2))%len(shot['plates'])]
                                image = plates.exposure(leaf,age,fps)
                            else:
                                raise ValueError(f'Unknown shot type: {kind}')
                            image = treatment.grade(image,f,shot.get('night',False))
                            if 'phase' in shot:
                                a,b = shot['phase']
                                day_ring(image,a+(b-a)*age/max(1,shot['frames']-1),shot.get('ring_opacity',.65))
                            treatment.matte(image)
                        proc.stdin.write(image.tobytes())
                        f+=1
            finally:
                proc.stdin.close()
            if proc.wait():
                raise RuntimeError('Encoder failed.')
        pending.replace(output)
    finally:
        pending.unlink(missing_ok=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('cut',type=Path)
    p.add_argument('output',type=Path)
    args=p.parse_args()
    cv2.setNumThreads(2)
    render(args.cut.resolve(),args.output.resolve())
