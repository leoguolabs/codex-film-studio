#!/usr/bin/env python3
"""Decode every frame, retain a visual index, and compute style diagnostics.

This is exhaustive machine coverage, not a substitute for visual/audio review.
Requires numpy, opencv-python and Pillow. It never declares perceptual identity.
"""
import argparse
import csv
import fcntl
import hashlib
import json
import os
from pathlib import Path
import time
import cv2
import numpy as np
from PIL import Image,ImageDraw
from ffmpeg_serial import active_ffmpeg

FEATURES=['luma','saturation','bright_area','dark_area','edge_density','texture','frame_delta','mint_area']


def scan(source,out):
    out.mkdir(parents=True,exist_ok=True)
    frames=out/'frames';frames.mkdir(exist_ok=True)
    atlas=out/'atlases';atlas.mkdir(exist_ok=True)
    cap=cv2.VideoCapture(str(source))
    if not cap.isOpened():raise RuntimeError(f'Cannot open {source}')
    fps=cap.get(cv2.CAP_PROP_FPS);width=int(cap.get(3));height=int(cap.get(4))
    expected=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    rows=[];previous=None;sheet=None;draw=None;sheetno=-1
    while True:
        ok,im=cap.read()
        if not ok:break
        idx=len(rows);small=cv2.resize(im,(240,135),interpolation=cv2.INTER_AREA)
        hsv=cv2.cvtColor(small,cv2.COLOR_BGR2HSV);gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
        lap=cv2.Laplacian(gray,cv2.CV_32F)
        edges=cv2.Canny(small,60,140)
        diff=0 if previous is None else float(np.mean(np.abs(gray-previous)))
        previous=gray
        row=dict(frame=idx,time=idx/fps,luma=float(gray.mean()),saturation=float(hsv[:,:,1].mean()/255),
                 bright_area=float(np.mean(gray>.88)),dark_area=float(np.mean(gray<.12)),
                 edge_density=float(np.mean(edges>0)),texture=float(np.abs(lap).mean()),frame_delta=diff,
                 mint_area=float(np.mean((hsv[:,:,0]>65)&(hsv[:,:,0]<99)&(hsv[:,:,1]<130)&(hsv[:,:,2]>180))))
        rows.append(row)
        cv2.imwrite(str(frames/f'{idx:05d}.jpg'),cv2.resize(im,(480,270),interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,85])
        sn=idx//64
        if sn!=sheetno:
            if sheet is not None:sheet.save(atlas/f'{sheetno:03d}.jpg',quality=90)
            sheetno=sn;sheet=Image.new('RGB',(1536,8*128),'#f8f6ee');draw=ImageDraw.Draw(sheet)
        cell=idx%64;x=(cell%8)*192;y=(cell//8)*128
        thumb=Image.fromarray(cv2.cvtColor(small,cv2.COLOR_BGR2RGB)).resize((192,108))
        sheet.paste(thumb,(x,y));draw.text((x+4,y+110),f'{idx:05d}  {idx/fps:.3f}s',fill='#333333')
        if idx%500==0:print(f'{source.name}: {idx}/{expected}',flush=True)
    if sheet is not None:sheet.save(atlas/f'{sheetno:03d}.jpg',quality=90)
    cap.release()
    if len(rows)!=expected:raise RuntimeError(f'Decode count mismatch: {len(rows)} != {expected}')
    with (out/'frames.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=['frame','time']+FEATURES);writer.writeheader();writer.writerows(rows)
    (out/'frames.json').write_text(json.dumps(rows))
    report=dict(source=str(source.resolve()),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                fps=fps,width=width,height=height,declared_frames=expected,decoded_frames=len(rows),
                duration_frames=len(rows)/fps,all_frames_measured=True,
                manual_visual_coverage='Not established by this tool',audio_listening='Not performed by this tool',
                large_changes=[r['frame'] for r in rows if r['frame_delta']>.075],
                statistics={k:dict(mean=float(np.mean([r[k] for r in rows])),p05=float(np.percentile([r[k] for r in rows],5)),p95=float(np.percentile([r[k] for r in rows],95))) for k in FEATURES})
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:report[k] for k in ['decoded_frames','fps','width','height','large_changes']}),flush=True)


def compare(reference,production,out,reference_range):
    ref=json.loads((reference/'frames.json').read_text());new=json.loads((production/'frames.json').read_text())
    out.mkdir(parents=True,exist_ok=True)
    lo,hi=reference_range
    usable=[r for r in ref if lo<=r['time']<=hi]
    # Intentionally omit exact hue: a new subject may change character colors.
    keys=['luma','saturation','bright_area','dark_area','edge_density','texture','frame_delta','mint_area']
    a=np.array([[r[k] for k in keys] for r in usable]);b=np.array([[r[k] for k in keys] for r in new])
    scale=np.maximum(np.std(a,axis=0),[.04,.04,.08,.03,.015,.02,.006,.08]);a/=scale;b/=scale
    weights=np.array([.7,.5,.6,.7,1.,1.,.7,.7]);a*=weights;b*=weights
    pairs=[]
    for i,row in enumerate(b):
        dist=np.mean((a-row)**2,axis=1);j=int(np.argmin(dist))
        pairs.append(dict(output_frame=i,reference_frame=usable[j]['frame'],style_distance=float(np.sqrt(dist[j]))))
    with (out/'frame-pairs.csv').open('w') as f:
        w=csv.DictWriter(f,fieldnames=['output_frame','reference_frame','style_distance']);w.writeheader();w.writerows(pairs)
    (out/'frame-pairs.json').write_text(json.dumps(pairs))
    reverse=[]
    for r in ref:
        row=np.array([r[k] for k in keys])/scale*weights
        d=np.mean((b-row)**2,axis=1);j=int(np.argmin(d))
        reverse.append(dict(reference_frame=r['frame'],output_frame=j,style_distance=float(np.sqrt(d[j])),in_analysis_range=lo<=r['time']<=hi))
    (out/'reference-pairs.json').write_text(json.dumps(reverse))
    report=dict(reference_frames=len(ref),output_frames=len(new),output_frames_paired=len(pairs),reference_frames_paired=len(reverse),
                reference_analysis_range_seconds=[lo,hi],method='Nearest low-level style feature vector; new subject colors allowed',
                caveat='Distance is diagnostic. It is not a percentage of style fidelity, perceptual proof, or a review of acting, voice, music or meaning.',
                most_different=sorted(pairs,key=lambda r:r['style_distance'],reverse=True)[:30])
    (out/'comparison.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:report[k] for k in ['reference_frames','output_frames','output_frames_paired','reference_frames_paired']}))


def main():
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    s=sub.add_parser('scan');s.add_argument('source',type=Path);s.add_argument('out',type=Path)
    c=sub.add_parser('compare');c.add_argument('reference',type=Path);c.add_argument('production',type=Path);c.add_argument('out',type=Path);c.add_argument('--reference-range',nargs=2,type=float,default=[0,float('inf')])
    args=p.parse_args()
    if args.command=='compare':return compare(args.reference,args.production,args.out,args.reference_range)
    lockpath=Path(os.environ.get('TMPDIR','/tmp'))/'codex-film-ffmpeg.lock'
    with lockpath.open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        while active_ffmpeg():
            print('Waiting for existing FFmpeg:',active_ffmpeg(),flush=True);time.sleep(5)
        scan(args.source,args.out)


if __name__=='__main__':main()
