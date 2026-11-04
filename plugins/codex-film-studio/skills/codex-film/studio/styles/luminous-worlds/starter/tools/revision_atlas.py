"""Compare decoded revisions exactly and atlas every changed picture.
An identity result supports carrying prior picture inspection, not artistic acceptance.
"""
import argparse,hashlib,json
from pathlib import Path
import cv2,numpy as np
from PIL import Image,ImageDraw
from color_decode import VideoReader
p=argparse.ArgumentParser();p.add_argument('prior',type=Path);p.add_argument('candidate',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
a.output.mkdir(parents=True,exist_ok=True);cv2.setNumThreads(2)
x=VideoReader(a.prior);y=VideoReader(a.candidate)
assert x.fps==y.fps
n=0;identical=[];changed=[];pages=[];page=None;nums=[]
def finish():
 global page,nums
 name=f'changed-{len(pages):04}.jpg';f=a.output/name;page.save(f,quality=94)
 pages.append({'file':name,'frames':nums,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()});page=None;nums=[]
while True:
 ok,b=x.read();ok2,c=y.read();assert ok==ok2,'Frame counts differ'
 if not ok:break
 assert b.shape==c.shape
 if np.array_equal(b,c):identical.append(n)
 else:
  changed.append(n)
  if page is None:page=Image.new('RGB',(1920,896),'#090724');draw=ImageDraw.Draw(page)
  slot=len(nums);xx=slot%12*160;yy=slot//12*112
  im=Image.fromarray(cv2.cvtColor(cv2.resize(c,(160,90)),cv2.COLOR_BGR2RGB))
  page.paste(im,(xx,yy));draw.text((xx+4,yy+93),str(n),fill='white');nums.append(n)
  if len(nums)==96:finish()
 n+=1
 if n%3000==0:print(n,flush=True)
if page is not None:finish()
x.close();y.close()
def runs(vals):
 r=[]
 for v in vals:
  if not r or v!=r[-1][1]:r.append([v,v+1])
  else:r[-1][1]=v+1
 return r
report={'prior_sha256':hashlib.sha256(a.prior.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256(a.candidate.read_bytes()).hexdigest(),'comparison':'Exact equality of every full-resolution decoded BGR pixel; PyAV presentation order with explicit BT.709 matrix and declared range','decoded_frames':n,'identical_frames':len(identical),'changed_frames':len(changed),'identical_ranges':runs(identical),'changed_ranges':runs(changed),'range_convention':'zero-based half-open','thumbnail_size':[160,90],'pages':pages,'viewed_pages':[],'scope':'Atlas generated only. The changed pages require actual inspection. Identical pixels permit inheritance of prior picture observations only at their originally recorded scope.'}
(a.output/'manifest.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k]for k in ['decoded_frames','identical_frames','changed_frames','identical_ranges','changed_ranges']}),flush=True)
