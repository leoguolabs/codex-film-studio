"""Measure every decoded frame of a matched pair. Decode with OpenCV, pair within camera roles."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from scipy.spatial import cKDTree

FEATURES = ['light','contrast','chroma','paper_area','warm_earth_area','fine_mark','broad_mark',
            'orientation','tooth_native','hatch_native','frame_change','moving_area','motion']
MIN_SCALE = np.array([.06,.045,.055,.075,.09,.9,1.1,.05,.8,1.2,.004,.04,.12])

def write_rows(path, rows):
    with path.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=rows[0])
        w.writeheader()
        w.writerows(rows)

def scan(src,out):
    cap=cv2.VideoCapture(str(src))
    rate=cap.get(cv2.CAP_PROP_FPS)
    count=round(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    rows=[]
    prev=None
    while True:
        ok,im=cap.read()
        if not ok:break
        idx=len(rows)
        pts=cap.get(cv2.CAP_PROP_POS_MSEC)/1000
        if abs(pts-idx/rate)>.012:raise ValueError(f'Unexpected timestamp at {idx}')
        thumb=cv2.resize(im,(640,360),interpolation=cv2.INTER_AREA)
        hsv=cv2.cvtColor(thumb,cv2.COLOR_BGR2HSV)
        h,s,v=cv2.split(hsv)
        g=cv2.cvtColor(thumb,cv2.COLOR_BGR2GRAY).astype('f')
        b=cv2.GaussianBlur(g,(0,0),.85)
        broad=cv2.GaussianBlur(g,(0,0),4)
        dx=cv2.Sobel(b,cv2.CV_32F,1,0)
        dy=cv2.Sobel(b,cv2.CV_32F,0,1)
        xx=cv2.blur(dx*dx,(11,11)); yy=cv2.blur(dy*dy,(11,11)); xy=cv2.blur(dx*dy,(11,11))
        angle=np.hypot(xx-yy,2*xy)/(xx+yy+36)
        # Twelve 96px patches retain the actual size of the grain and short hatches.
        H,W=im.shape[:2]
        fine=[];medium=[]
        for fy in (.18,.5,.82):
            for fx in (.12,.37,.63,.88):
                y,x=int(H*fy),int(W*fx)
                patch=cv2.cvtColor(im[max(0,y-48):y+48,max(0,x-48):x+48],cv2.COLOR_BGR2GRAY).astype('f')
                low=cv2.GaussianBlur(patch,(0,0),.85)
                fine.append(np.abs(patch-low).mean())
                medium.append(np.abs(low-cv2.GaussianBlur(patch,(0,0),3.8)).mean())
        grid=cv2.resize(g,(160,90),interpolation=cv2.INTER_AREA).astype('uint8')
        change=area=motion=0.
        if prev is not None:
            dif=cv2.absdiff(grid,prev)
            vec=cv2.calcOpticalFlowFarneback(prev,grid,None,.5,2,11,2,5,1.1,0)
            change=dif.mean()/255; area=(dif>5).mean()
            motion=np.percentile(np.hypot(vec[:,:,0],vec[:,:,1]),85)
        prev=grid
        vals=[g.mean()/255,g.std()/255,s.mean()/255,((v>215)&(s<46)).mean(),
              ((h<23)&(s>38)&(v<225)).mean(),np.abs(g-b).mean(),np.abs(b-broad).mean(),
              angle.mean(),np.mean(fine),np.mean(medium),change,area,motion]
        rows.append(dict(frame=idx,time=round(pts,6),**{k:round(float(x),7) for k,x in zip(FEATURES,vals)}))
    cap.release()
    if not rows or len(rows)!=count:raise ValueError(f'Decoded {len(rows)} of {count}')
    out.parent.mkdir(exist_ok=True,parents=True);write_rows(out,rows)
    digest = hashlib.sha256()
    with src.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    sha = digest.hexdigest()
    out.with_suffix('.json').write_text(json.dumps(dict(file=src.name,sha256=sha,fps=rate,frames=len(rows),features=FEATURES),indent=2))

def read_csv(p):
    with p.open() as f:rows=list(csv.DictReader(f))
    return np.array([float(r['time']) for r in rows]),np.array([[float(r[k]) for k in FEATURES] for r in rows])

def intervals(times,spans):
    return np.flatnonzero(np.logical_or.reduce([(times>=a)&(times<b) for a,b in spans]))

def compare(ref,film,roles,out):
    rt,rv=read_csv(ref); ft,fv=read_csv(film)
    cfg=json.loads(roles.read_text());starts=np.array([a for a,_ in cfg['output']]);names=[n for _,n in cfg['output']]
    if starts[0]!=0 or np.any(np.diff(starts)<=0) or starts[-1]>ft[-1]:raise ValueError('Invalid shot starts')
    scale=np.maximum(np.percentile(rv,90,axis=0)-np.percentile(rv,10,axis=0),MIN_SCALE)
    groups=np.searchsorted(starts,ft,side='right')-1
    lookup=np.full(len(ft),-1); reverse=np.full(len(rt),-1)
    records=[];inverse=[];sections=[]
    for role,spans in cfg['reference'].items():
        ri=intervals(rt,spans); fi=np.flatnonzero(np.isin(groups,[i for i,n in enumerate(names) if n==role]))
        if not len(ri) or not len(fi):raise ValueError(f'Empty role {role}')
        if np.any(reverse[ri]>=0):raise ValueError(f'Overlapping reference roles {role}')
        tree=cKDTree(rv[ri]/scale); d,j=tree.query(fv[fi]/scale,p=1); lookup[fi]=ri[j]
        back=cKDTree(fv[fi]/scale); dr,jr=back.query(rv[ri]/scale,p=1); reverse[ri]=fi[jr]
        phase={}
        # A single continuous shot follows one continuous reference interval, even if
        # several intervals belong to the same role. A lens opening stays an opening.
        candidates=[intervals(rt,[span]) for span in spans]
        for sid in np.unique(groups[fi]):
            shot=np.flatnonzero(groups==sid)
            center=np.median(fv[shot],axis=0)
            span=min(candidates,key=lambda ids:np.abs((np.median(rv[ids],axis=0)-center)/scale).mean())
            aligned=span[np.rint(np.linspace(0,len(span)-1,len(shot))).astype(int)]
            phase.update(zip(shot,aligned))
        for i,r,dist in zip(fi,ri[j],d):
            sid=groups[i];chronological=phase[i]
            records.append(dict(output_frame=i,reference_frame=r,role_phase_reference=chronological,shot=sid,role=role,
                                distance=round(dist/len(scale),5),**{k+'_delta':round(v,6) for k,v in zip(FEATURES,fv[i]-rv[r])}))
        for r,i,dist in zip(ri,fi[jr],dr):inverse.append(dict(reference_frame=r,output_frame=i,role=role,distance=round(dist/len(scale),5)))
        sections.append(dict(role=role,reference_frames=len(ri),film_frames=len(fi),
                         median_reference=dict(zip(FEATURES,np.median(rv[ri],axis=0))),
                         median_film=dict(zip(FEATURES,np.median(fv[fi],axis=0)))))
    if min(lookup)<0 or min(reverse)<0:raise ValueError('Missing frames')
    out.mkdir(parents=True,exist_ok=True)
    write_rows(out/'by-output-frame.csv',sorted(records,key=lambda r:r['output_frame']))
    write_rows(out/'by-reference-frame.csv',sorted(inverse,key=lambda r:r['reference_frame']))
    (out/'summary.json').write_text(json.dumps(dict(reference=json.loads(ref.with_suffix('.json').read_text()),
        film=json.loads(film.with_suffix('.json').read_text()),scale=dict(zip(FEATURES,scale)),roles=sections),indent=2))
    print(f'{len(ft)} output frames and {len(rt)} reference frames accounted for.')

if __name__=='__main__':
    cv2.setNumThreads(2)
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True)
    for name,args in [('scan',['source','csv']),('compare',['reference','film','roles','output'])]:
        cmd=sub.add_parser(name)
        for arg in args:cmd.add_argument(arg,type=Path)
    a=p.parse_args()
    if a.command=='scan':scan(a.source,a.csv)
    else:compare(a.reference,a.film,a.roles,a.output)
