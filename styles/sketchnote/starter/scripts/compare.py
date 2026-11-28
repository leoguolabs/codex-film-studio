"""Decode consecutive frames, retain their PTS and compare like narrative actions in both directions."""
import argparse
import csv
import fcntl
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from ffmpeg_serial import active_ffmpeg


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save_rows(path, rows):
    with path.open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=rows[0])
        writer.writeheader()
        writer.writerows(rows)


def scan(movie, out):
    out.mkdir(parents=True, exist_ok=True)
    (out / 'atlas').mkdir(exist_ok=True)
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_frames',
        '-show_entries', 'frame=best_effort_timestamp_time:stream=width,height,avg_frame_rate,nb_frames',
        '-of', 'json', str(movie)]))
    pts = [float(row['best_effort_timestamp_time']) for row in info['frames']]
    cap = cv2.VideoCapture(str(movie))
    cv2.setNumThreads(2)
    rows = []
    prev = None
    sheet = None
    while True:
        ok, im = cap.read()
        if not ok:
            break
        i = len(rows)
        if i % 36 == 0:
            sheet = Image.new('RGB', (256 * 6, 144 * 6), (42, 42, 42))
        rgb = cv2.cvtColor(cv2.resize(im, (384, 216), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
        r, g, b = np.moveaxis(rgb.astype(np.int16), 2, 0)
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        paper = (r > 220) & (g > 220) & (b > 210) & (r-b < 25)
        ink = (np.max(rgb, axis=2) < 155)
        accent = (r > 155) & (g > 85) & (r > b+52) & (g > b+22)
        grey = (np.max(rgb, axis=2) - np.min(rgb, axis=2) < 24) & (gray > 75) & (gray < 213)
        paper_rgb = np.median(rgb[paper], axis=0) if paper.any() else [0, 0, 0]
        crop = im[::4, ::4, 1]
        flat = (crop > 222) & (cv2.dilate(crop, None).astype(int)-cv2.erode(crop, None) < 12)
        grain = crop.astype(np.float32) - cv2.GaussianBlur(crop.astype(np.float32), (3, 3), .9)
        delta = cv2.absdiff(prev, gray) if prev is not None else np.zeros_like(gray)
        row = dict(frame=i, pts=pts[i], paper_r=paper_rgb[0], paper_g=paper_rgb[1], paper_b=paper_rgb[2],
                   paper_fraction=paper.mean(), black_fraction=ink.mean(), accent_fraction=accent.mean(), grey_marker_fraction=grey.mean(),
                   edges=(cv2.Canny(gray, 45, 110) > 0).mean(), paper_texture=np.sqrt(np.mean(grain[flat] ** 2)) if flat.any() else 0.,
                   change=delta.mean()/255, change_area=(delta>16).mean(),
                   upper_ink=ink[:70].mean(), middle_ink=ink[70:187].mean(), caption_ink=ink[189:212,24:-24].mean())
        rows.append({k: int(v) if k=='frame' else round(float(v), 7) for k,v in row.items()})
        prev = gray
        tile = cv2.cvtColor(cv2.resize(im,(256,144),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2RGB)
        j = i % 36
        sheet.paste(Image.fromarray(tile), ((j%6)*256,(j//6)*144))
        if j == 35 or i == len(pts)-1:
            sheet.save(out/'atlas'/f'{i//36:03d}.jpg', quality=89)
    cap.release()
    if len(rows) != len(pts) or len(pts) != int(info['streams'][0]['nb_frames']):
        raise ValueError('Frame count disagrees with the container or the presentation timestamps.')
    save_rows(out/'frames.csv',rows)
    summary = dict(file=movie.name, sha256=digest(movie), decoded=len(rows), stream=info['streams'][0],
                   atlas=dict(width=256,height=144,cols=6,rows=6), stats={})
    for k in rows[0]:
        if k not in ('frame','pts'):
            summary['stats'][k]=np.percentile([row[k] for row in rows],[5,50,95]).round(6).tolist()
    (out/'scan.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(movie.name, len(rows), summary['stats']['black_fraction'], flush=True)


def pair(reference, output, roles_file, out):
    out.mkdir(parents=True,exist_ok=True)
    roles=json.loads(roles_file.read_text())
    def read(p):
        with (p/'frames.csv').open() as f:
            return [{key:float(v) for key,v in r.items()} for r in csv.DictReader(f)]
    a,b=read(reference),read(output)
    names=[r['role'] for r in roles]
    metrics=[k for k in a[0] if k not in ('frame','pts')]
    def mapping(src,dst,forward):
        rows=[]
        for group in roles:
            sb,db=(group['output'],group['reference']) if forward else (group['reference'],group['output'])
            lo,hi=sb; dl,dh=db
            if not (0<=lo<hi<=len(src) and 0<=dl<dh<=len(dst)):
                raise ValueError(f'Invalid half-open frame range in {group}')
            for i in range(lo,hi):
                j=dl+round((i-lo)*(dh-dl-1)/max(1,hi-lo-1))
                ai,bi=(j,i) if forward else (i,j)
                row=dict(role=group['role'], reference_frame=ai, output_frame=bi, reference_pts=a[ai]['pts'],output_pts=b[bi]['pts'])
                row.update({k+'_delta':round(b[bi][k]-a[ai][k],7) for k in metrics})
                rows.append(row)
        if [r['output_frame' if forward else 'reference_frame'] for r in rows]!=list(range(len(src))):
            raise ValueError('Roles must cover every frame once in presentation order.')
        return rows
    forward=mapping(b,a,True)
    reverse=mapping(a,b,False)
    save_rows(out/'output-to-reference.csv',forward)
    save_rows(out/'reference-to-output.csv',reverse)
    summaries={}
    for role in names:
        group=[q for q in forward if q['role']==role]
        summaries[role]={k:round(float(np.median([v[k+'_delta'] for v in group])),7) for k in metrics}
    report=dict(reference_sha256=json.loads((reference/'scan.json').read_text())['sha256'],
                output_sha256=json.loads((output/'scan.json').read_text())['sha256'],roles=roles,
                output_rows=len(forward),reference_rows=len(reverse),median_signed_deltas=summaries,
                method='Frames paired by progress within corresponding narrative actions. All interval bounds are zero-based and half-open.')
    (out/'comparison.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'{out.name}: {len(forward)} forward, {len(reverse)} reverse pairs.')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='action',required=True)
    sc=sub.add_parser('scan'); sc.add_argument('movie',type=Path); sc.add_argument('out',type=Path)
    pa=sub.add_parser('pair')
    for key in ['reference','output','roles','out']: pa.add_argument(key,type=Path)
    args=p.parse_args()
    if args.action=='scan':
        lockfile=Path(os.environ.get('TMPDIR','/tmp'))/'codex-film-ffmpeg.lock'
        with lockfile.open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            while active_ffmpeg(): time.sleep(3)
            scan(args.movie,args.out)
    else:
        pair(args.reference,args.output,args.roles,args.out)
