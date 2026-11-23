"""Compare each decoded frame inside a directed shot-role match.

Input CSVs come from scan. A roles JSON supplies reference intervals keyed by name
and an ordered output list [start_seconds, name]. Inspect the images as well.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np

FEATURES = ('light', 'spread', 'chroma', 'accent_area', 'fine_relief', 'broad_relief',
            'directionality', 'change', 'moving_area', 'flow')
FLOOR = np.array([.05,.025,.035,.055,.6,.8,.045,.004,.035,.12])
def save_csv(path, rows):
    with path.open('w',newline='') as file:
        writer=csv.DictWriter(file,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)
def scan(source, output):
    capture=cv2.VideoCapture(str(source))
    fps=capture.get(cv2.CAP_PROP_FPS);declared=round(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    rows=[];prev=None
    while True:
        ok,image=capture.read()
        if not ok:break
        n=len(rows); pts=capture.get(cv2.CAP_PROP_POS_MSEC)/1000
        if abs(pts-n/fps)>.015:raise ValueError(f'Expected constant frame rate; inspect PTS at frame {n}')
        # Sample one common screen scale regardless of delivery resolution.
        small=cv2.resize(image,(640,360),interpolation=cv2.INTER_AREA)
        g=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY).astype(np.float32)
        hsv=cv2.cvtColor(small,cv2.COLOR_BGR2HSV);sat=hsv[:,:,1]
        blur1=cv2.GaussianBlur(g,(0,0),.85);blur6=cv2.GaussianBlur(g,(0,0),4.0)
        dx=cv2.Sobel(blur1,cv2.CV_32F,1,0);dy=cv2.Sobel(blur1,cv2.CV_32F,0,1)
        xx=cv2.boxFilter(dx*dx,-1,(11,11));yy=cv2.boxFilter(dy*dy,-1,(11,11))
        xy=cv2.boxFilter(dx*dy,-1,(11,11))
        coherence=np.sqrt((xx-yy)**2+4*xy**2)/(xx+yy+36)
        grid=cv2.resize(g,(160,90),interpolation=cv2.INTER_AREA).astype(np.uint8)
        if prev is None:change=area=flow=0.
        else:
            diff=cv2.absdiff(grid,prev)
            vec=cv2.calcOpticalFlowFarneback(prev,grid,None,.5,2,11,2,5,1.1,0)
            speed=np.hypot(vec[:,:,0],vec[:,:,1]);flow=float(np.percentile(speed,85))
            change=diff.mean()/255;area=(diff>5).mean()
        prev=grid
        vals=[g.mean()/255,g.std()/255,sat.mean()/255,((sat>78)&(hsv[:,:,2]>60)).mean(),
              np.abs(g-blur1).mean(),np.abs(blur1-blur6).mean(),coherence.mean(),change,area,flow]
        rows.append(dict(frame=n,time=round(pts,6),**{k:round(float(v),7) for k,v in zip(FEATURES,vals)}))
    capture.release()
    if not rows or len(rows)!=declared:raise ValueError(f'Decoded {len(rows)} of {declared} frames')
    save_csv(output,rows)
    with source.open('rb') as f:sha=hashlib.file_digest(f,'sha256').hexdigest()
    output.with_suffix('.json').write_text(json.dumps(dict(file=source.name,sha256=sha,fps=fps,frames=len(rows),features=FEATURES),indent=2))
def read(p):
    with p.open() as f:rows=list(csv.DictReader(f))
    return np.array([float(r['time']) for r in rows]),np.array([[float(r[k]) for k in FEATURES] for r in rows])
def compare(reference,film,roles,out):
    rt,rv=read(reference);ft,fv=read(film);cfg=json.loads(roles.read_text())
    starts=np.array([s for s,_ in cfg['output']]);names=[n for _,n in cfg['output']]
    if starts[0]!=0 or (np.diff(starts)<=0).any() or starts[-1]>ft[-1]:raise ValueError('Invalid output roles')
    scale=np.maximum(np.percentile(rv,90,axis=0)-np.percentile(rv,10,axis=0),FLOOR)
    ref_ids={name:np.flatnonzero(np.logical_or.reduce([(rt>=a)&(rt<b) for a,b in spans])) for name,spans in cfg['reference'].items()}
    rows=[];reverse=[];group_summary=[]
    role_of=np.searchsorted(starts,ft,side='right')-1
    lookup=np.empty(len(ft),dtype=int)
    for i,role in enumerate(names):
        rr=ref_ids[role];ff=np.flatnonzero(role_of==i)
        if not len(rr) or not len(ff):raise ValueError('Empty role '+role)
        for f in ff:
            dist=np.mean(np.abs(rv[rr]-fv[f])/scale,axis=1)
            j=int(np.argmin(dist));r=int(rr[j]);lookup[f]=r
            rows.append(dict(output_frame=int(f),reference_frame=r,output_time=ft[f],reference_time=rt[r],role=role,
                distance=round(float(dist[j]),6),**{k+'_delta':round(float(v),6) for k,v in zip(FEATURES,fv[f]-rv[r])}))
        group_summary.append(dict(start=float(ft[ff[0]]),role=role,frames=len(ff),output_median=dict(zip(FEATURES,np.median(fv[ff],axis=0))),reference_median=dict(zip(FEATURES,np.median(rv[rr],axis=0)))))
    for r in range(len(rt)):
        matching=[i for i,name in enumerate(names) if r in ref_ids[name]]
        ff=np.flatnonzero(np.isin(role_of,matching))
        if not len(ff):raise ValueError(f'No matching output role for reference frame {r}')
        dist=np.mean(np.abs(fv[ff]-rv[r])/scale,axis=1);j=int(np.argmin(dist))
        reverse.append(dict(reference_frame=r,output_frame=int(ff[j]),distance=round(float(dist[j]),6)))
    out.mkdir(exist_ok=True,parents=True);save_csv(out/'by-output-frame.csv',rows);save_csv(out/'by-reference-frame.csv',reverse)
    (out/'lookup.json').write_text(json.dumps(lookup.tolist()))
    (out/'summary.json').write_text(json.dumps(dict(reference=json.loads(reference.with_suffix('.json').read_text()),film=json.loads(film.with_suffix('.json').read_text()),normalizers=dict(zip(FEATURES,scale)),shots=group_summary),indent=2))
if __name__=='__main__':
    cv2.setNumThreads(2)
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='mode',required=True)
    scan_args=sub.add_parser('scan');scan_args.add_argument('source',type=Path);scan_args.add_argument('output',type=Path)
    comp=sub.add_parser('compare')
    for name in ['reference','film','roles','out']:comp.add_argument(name,type=Path)
    args=p.parse_args()
    if args.mode=='scan':scan(args.source,args.output)
    else:compare(args.reference,args.film,args.roles,args.out)
