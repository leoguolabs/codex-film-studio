#!/usr/bin/env python3
"""Create and render a deterministic external engineering fixture, including audio."""
import argparse
import array
import json
from pathlib import Path
import subprocess
import sys
import re
from new_film import create, ROOT


def run(args, cwd):
    subprocess.run([str(x) for x in args], cwd=cwd, check=True)


def verify_sync(file, expected):
    pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(file), '-map', '0:a:0',
                                   '-f', 's16le', '-ac', '1', '-ar', '48000', '-'])
    values = array.array('h', pcm)
    if sys.byteorder != 'little': values.byteswap()
    windows = [sum(abs(x) for x in values[i:i+480])/480 for i in range(0,len(values),480)]
    active = [i/100 for i,x in enumerate(windows) if x > 200]
    groups = []
    for t in active:
        if not groups or t-groups[-1][-1] > .03: groups.append([])
        groups[-1].append(t)
    onsets = [g[0] for g in groups]
    if len(onsets) != len(expected) or any(abs(a-b) > .04 for a,b in zip(onsets,expected)):
        raise ValueError(f'Encoded audio onset mismatch: {onsets}, expected {expected}')
    return onsets


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--style', required=True)
    p.add_argument('--output', type=Path, required=True)
    a=p.parse_args()
    project=create('smoke-'+a.style,a.style,output=a.output)
    run(['npm','ci','--ignore-scripts','--no-audit','--no-fund'],project)
    run(['node','tools/runtime/smoke_inputs.mjs'],project)
    run([sys.executable,'tools/runtime/build.py','--doctor'],project)
    run([sys.executable,'tools/runtime/build.py','--width','480'],project)
    fps=json.loads((project/'content/production.json').read_text())['fps']
    run([sys.executable,'tools/runtime/build.py','--preview','--start',3*fps,'--end',5*fps,'--width','320'],project)
    report={'full_onsets':verify_sync(project/'media/film.mp4',[1,4]),
            'preview_onsets':verify_sync(project/'media/preview.mp4',[1]),
            'visual_review':'not performed','motion_review':'not performed','listening_review':'not performed'}
    (project/'review').mkdir(exist_ok=True)
    if a.style == 'caption-news':
        # Earlier captions must not leak text alignment into later headline frames.
        run(['node','scripts/render.mjs','--frame',2*fps,'--width','480','--out','review/isolated.png'],project)
        comparison=subprocess.run(['ffmpeg','-hide_banner','-ss','2','-i','media/film.mp4','-i','review/isolated.png',
                                   '-filter_complex','[0:v][1:v]psnr','-frames:v','1','-f','null','-'],cwd=project,
                                  check=True,capture_output=True,text=True)
        match=re.search(r'average:([\d.]+|inf)',comparison.stderr)
        if not match or float(match[1])<35:raise ValueError('Single-frame/sequence mismatch; possible leaked canvas state')
        report['isolated_frame_psnr_db']=float(match[1])
    (project/'review/smoke.json').write_text(json.dumps(report,indent=2)+'\n')
    assert '00:00:01.000 --> 00:00:02.000' in (project/'media/preview.vtt').read_text()
    print(json.dumps({'style':a.style,'project':str(project),'checks':report}))


if __name__=='__main__':main()
