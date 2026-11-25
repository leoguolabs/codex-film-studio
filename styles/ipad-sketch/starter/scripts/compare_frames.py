"""Measure every decoded frame and pair only shots doing comparable work."""
import argparse
import csv
import fcntl
import os
import time
from ffmpeg_serial import active_ffmpeg
import hashlib
import json
import math
from pathlib import Path
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw

cv2.setNumThreads(2)
PAPER=np.array([243,234,219])
FEATURES={"paper_r":(10,.30),"paper_g":(10,.30),"paper_b":(10,.30),"paper_area":(.08,1),
          "graphite_area":(.012,.75),"pigment_area":(.047,.80),"edge_density":(.021,.85),
          "grain_rms":(.70,.65),"change":(.010,.65),"page_speed":(.012,.65),
          "zoom_step":(.009,.38),"turn_step":(.35,.35),"caption_area":(.030,.55),"stylus_candidate":(.75,.20)}
def hash_file(p):
    h=hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda:f.read(2**20),b""):h.update(chunk)
    return h.hexdigest()
def probe(file):
    data=subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0","-show_frames","-show_entries",
         "frame=best_effort_timestamp_time:stream=width,height,nb_frames,avg_frame_rate","-of","json",str(file)])
    data=json.loads(data)
    return data["streams"][0],[float(row["best_effort_timestamp_time"]) for row in data["frames"]]
def estimate_motion(prev,cur):
    if prev is None:return (0.,0.,0.,0)
    k=cv2.goodFeaturesToTrack(prev[:int(.83*cur.shape[0])],maxCorners=60,qualityLevel=.015,minDistance=7)
    if k is None or len(k)<5:return (0.,0.,0.,0)
    end,status,_=cv2.calcOpticalFlowPyrLK(prev,cur,k,None,winSize=(17,17),maxLevel=2)
    if status is None:return (0.,0.,0.,0)
    valid=status.ravel().astype(bool)
    if valid.sum()<5:return (0.,0.,0.,0)
    mat,inliers=cv2.estimateAffinePartial2D(k[valid],end[valid],method=cv2.RANSAC,ransacReprojThreshold=1.8)
    if mat is None or inliers is None or inliers.sum()<5:return (0.,0.,0.,0)
    center=np.array([cur.shape[1]/2,cur.shape[0]/2])
    delta=mat[:,:2]@center+mat[:,2]-center
    return (float(np.linalg.norm(delta)/cur.shape[1]),float(abs(math.hypot(*mat[0,:2])-1)),
            abs(math.degrees(math.atan2(mat[1,0],mat[0,0]))),int(inliers.sum()))
def paper_grain(frame):
    h,w=frame.shape[:2]; values=[]
    for x,y in ((.19,.18),(.51,.18),(.80,.20),(.18,.48),(.49,.48),(.81,.46),(.42,.73),(.72,.75)):
        tile=frame[round(y*h):round(y*h)+64,round(x*w):round(x*w)+80]
        gray=cv2.cvtColor(tile,cv2.COLOR_BGR2GRAY)
        mask=(gray>211)&(gray<245)&(cv2.dilate(gray,None).astype(int)-cv2.erode(gray,None)<13)
        if mask.mean()<.45:continue
        lum=gray.astype(np.float32)
        hi=lum-cv2.GaussianBlur(lum,(0,0),1.25)
        values.append(np.mean((hi[mask])**2))
    return math.sqrt(float(np.median(values))) if values else 0.
def chip_and_pen(rgb):
    r,g,b=np.moveaxis(rgb.astype(np.int16),2,0);H,W=r.shape
    white=(r>244)&(g>238)&(b>226)&(r-g<16)&(g-b<21)
    contours,_=cv2.findContours(white.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    chip=0.;pen=0
    for shape in contours:
        area=cv2.contourArea(shape)
        if area<12:continue
        x,y,w,h=cv2.boundingRect(shape)
        if y>H*.62 and w>W*.10 and h>H*.030 and h<H*.24 and w/h>2.25:
            chip=max(chip,area/(W*H))
        if w>=8 and h>=12:
            (_, _),(a,b),angle=cv2.minAreaRect(shape)
            if min(a,b)>.5 and max(a,b)/min(a,b)>5.3 and h>H*.07 and .43<w/h<1.07:pen=1
    return chip,pen
def scan(video,out):
    video=video.resolve(); out.mkdir(parents=True,exist_ok=True)
    frames=out/"frames";atlases=out/"frame-index";frames.mkdir(exist_ok=True);atlases.mkdir(exist_ok=True)
    stream,pts=probe(video)
    cap=cv2.VideoCapture(str(video))
    prev=None; rows=[]; manifest=[]
    for i,at in enumerate(pts):
        ok,frame=cap.read()
        if not ok:raise ValueError(f"Decode stopped at {i}")
        rgb=cv2.cvtColor(cv2.resize(frame,(480,270),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2RGB)
        gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
        rgb16=rgb.astype(np.int16)
        paper=(np.abs(rgb16-PAPER).max(axis=2)<23)&(rgb16[:,:,0]-rgb16[:,:,1]>2)&(rgb16[:,:,1]-rgb16[:,:,2]>4)
        # Sample a grid for colour only, retaining the full mask for coverage.
        sample=rgb16[::4,::4][paper[::4,::4]]
        shade=np.median(sample,axis=0) if len(sample)>12 else (0,0,0)
        top=rgb16.max(axis=2);bottom=rgb16.min(axis=2)
        ink=(gray<110)&(top-bottom<72)
        color=(top-bottom>46)&(gray<229)&(~ink)
        edges=cv2.Canny(gray,48,114)
        change=0. if prev is None else float(cv2.absdiff(prev,gray).mean()/255)
        motion=estimate_motion(prev,gray);chip,nib=chip_and_pen(rgb)
        row=dict(frame=i,time=at,paper_r=shade[0],paper_g=shade[1],paper_b=shade[2],
                 paper_area=paper.mean(),graphite_area=ink.mean(),pigment_area=color.mean(),edge_density=(edges>0).mean(),
                 grain_rms=paper_grain(frame),change=change,page_speed=motion[0],zoom_step=motion[1],
                 turn_step=motion[2],tracked_points=motion[3],caption_area=chip,stylus_candidate=nib)
        rows.append({k:int(v) if k in ("frame","tracked_points","stylus_candidate") else round(float(v),7) for k,v in row.items()})
        prev=gray
        thumb=Image.fromarray(rgb)
        thumb.save(frames/f"{i:05d}.jpg",quality=87)
        if i%96==0:
            sheet=Image.new("RGB",(1536,8*88),"#f2eadb");draw=ImageDraw.Draw(sheet)
        k=i%96;x=(k%12)*128;y=(k//12)*88
        sheet.paste(thumb.resize((128,72),Image.Resampling.LANCZOS),(x,y));draw.text((x+3,y+72),str(i),fill="#463a33")
        if k==95 or i==len(pts)-1:
            name=f"{i//96:03d}.jpg";sheet.save(atlases/name,quality=90);manifest.append([i-k,i,name])
        if i%600==0:print(video.name,i,"/",len(pts),flush=True)
    if cap.read()[0] or int(stream["nb_frames"])!=len(rows):raise ValueError("Container and decoded frame counts disagree.")
    cap.release()
    if any(b<=a for a,b in zip(pts,pts[1:])):raise ValueError("Presentation times do not increase.")
    with (out/"style-frames.csv").open("w",newline="") as f:
        wr=csv.DictWriter(f,fieldnames=rows[0]);wr.writeheader();wr.writerows(rows)
    data=dict(sha256=hash_file(video),frames=len(rows),width=stream["width"],height=stream["height"],
              fps=stream["avg_frame_rate"],first_pts=pts[0],last_pts=pts[-1],atlas=manifest,
              metrics={key:[round(float(np.percentile([r[key] for r in rows],s)),5) for s in (5,50,95)] for key in FEATURES})
    (out/"style-scan.json").write_text(json.dumps(data,indent=2)+"\n")
def load_rows(directory,segments):
    with (directory/"style-frames.csv").open() as f: rows=[{k:float(v) for k,v in r.items()} for r in csv.DictReader(f)]
    bounds=[round(float(p[0])*float(len(rows))/(rows[-1]["time"]+1/24)) for p in segments]+[len(rows)]
    if not bounds or bounds[0]!=0 or any(b<=a for a,b in zip(bounds,bounds[1:])):raise ValueError("Roles must cover the timeline in ascending order.")
    for i,(_,role) in enumerate(segments):
        lo,hi=bounds[i:i+2]
        for n in range(lo,hi):
            rows[n]["role"]=role;rows[n]["phase"]=(n-lo)/max(1,hi-lo-1)
    return rows
def compare(ref_dir,new_dir,role_file,out):
    out.mkdir(parents=True,exist_ok=True)
    roles=json.loads(role_file.read_text())
    ref=load_rows(ref_dir,roles["reference"]);film=load_rows(new_dir,roles["film"])
    keys=list(FEATURES)
    vector=lambda rows:np.array([[r[k] for k in keys] for r in rows])
    R,F=vector(ref),vector(film)
    norm=np.maximum(np.percentile(R,85,axis=0)-np.percentile(R,15,axis=0),[v[0] for v in FEATURES.values()])
    weights=np.array([v[1] for v in FEATURES.values()])
    def directed(source,target,S,T,reverse):
        target_role=np.array([r["role"] for r in target]);phase=np.array([r["phase"] for r in target]);pairs=[]
        for i,s in enumerate(source):
            eligible=np.where(target_role==s["role"])[0]
            if not len(eligible):raise ValueError(f'No comparable {s["role"]} interval in the other film')
            candidates=eligible[np.abs(phase[eligible]-s["phase"])<=.22]
            if not len(candidates):candidates=eligible
            cost=(np.abs(T[candidates]-S[i])/norm)
            # When a full-screen colour obscures all paper, its missing RGB estimate isn't a hue.
            if S[i,3]<.02:cost[:,:3]=0
            cost[T[candidates,3]<.02,:3]=0
            distances=np.average(np.minimum(cost,7),axis=1,weights=weights)+.20*np.abs(phase[candidates]-s["phase"])
            b=int(np.argmin(distances));j=int(candidates[b])
            pairs.append(dict(output_frame=j if reverse else i,reference_frame=i if reverse else j,role=s["role"],distance=round(float(distances[b]),5)))
        return pairs
    forward=directed(film,ref,F,R,False); reverse=directed(ref,film,R,F,True)
    for name,pairs in [("output-to-reference",forward),("reference-to-output",reverse)]:
        with (out/(name+".csv")).open("w",newline="") as f:
            wr=csv.DictWriter(f,fieldnames=pairs[0]);wr.writeheader();wr.writerows(pairs)
    info=dict(reference_sha256=json.loads((ref_dir/"style-scan.json").read_text())["sha256"],
              output_sha256=json.loads((new_dir/"style-scan.json").read_text())["sha256"],
              reference_frames=len(reverse),output_frames=len(forward),method="Bidirectional search within the same shot function, local progress within 0.22; robust reference spread and metric floors. Distance is diagnostic.",
              per_role={},largest_deviations=sorted(forward,key=lambda r:-r["distance"])[:32])
    for role in sorted({s["role"] for s in film}):
        x=[p["distance"] for p in forward if p["role"]==role]
        info["per_role"][role]=dict(count=len(x),median=round(float(np.median(x)),4),p95=round(float(np.percentile(x,95)),4))
    (out/"comparison.json").write_text(json.dumps(info,indent=2)+"\n")
    print(info["reference_frames"],info["output_frames"],info["largest_deviations"][:2],flush=True)
if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    cmds=parser.add_subparsers(dest="cmd",required=True)
    a=cmds.add_parser("scan");a.add_argument("video",type=Path);a.add_argument("out",type=Path)
    b=cmds.add_parser("compare")
    for name in ("reference","film","roles","out"):b.add_argument(name,type=Path)
    a=parser.parse_args()
    if a.cmd=="scan":
        lock=Path(os.environ.get("TMPDIR","/tmp"))/"codex-film-ffmpeg.lock"
        with lock.open("a") as handle:
            fcntl.flock(handle,fcntl.LOCK_EX)
            while active_ffmpeg():time.sleep(2)
            scan(a.video,a.out)
    else:compare(a.reference,a.film,a.roles,a.out)
