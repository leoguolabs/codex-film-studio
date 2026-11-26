"""Pair every frame by chronological position and separately by low-level distance inside its shot function."""
import argparse,csv,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=argparse.ArgumentParser()
p.add_argument('reference',type=Path);p.add_argument('candidate',type=Path);p.add_argument('roles',type=Path);p.add_argument('output',type=Path)
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
rr=json.loads((a.reference/'frames.json').read_text());cc=json.loads((a.candidate/'frames.json').read_text())
plan=json.loads(a.roles.read_text())
keys=['luma','saturation','bright_area','dark_area','edge_density','texture','frame_delta']
ref=np.array([[r[k] for k in keys] for r in rr]);can=np.array([[c[k] for k in keys] for c in cc])
scale=np.maximum(ref.std(axis=0),[.04,.035,.07,.015,.015,.02,.006])
role_ref=[None]*len(rr);role_can=[None]*len(cc)
for tag,start1,end1,start2,end2 in plan:
    for array,start,end in [(role_ref,start1,end1),(role_can,start2,end2)]:
        for i in range(round(start*24),round(end*24)):
            if array[i] is not None:raise ValueError(('overlap',i))
            array[i]=tag
if None in role_ref or None in role_can:raise ValueError('Unlabelled frames')
def compare(left,right,rleft,rright):
    rows={}
    for name in dict.fromkeys(rleft):
        ids=np.flatnonzero(np.array(rleft)==name);js=np.flatnonzero(np.array(rright)==name)
        dst=np.sqrt(np.mean(((left[ids,None,:]-right[js][None,:,:])/scale)**2,axis=2))
        for k,idx in enumerate(ids):
            at=round(k*(len(js)-1)/max(1,len(ids)-1));j=int(np.argmin(dst[k]))
            rows[int(idx)]=[int(idx),int(js[at]),int(js[j]),name,round(float(dst[k,at]),5),round(float(dst[k,j]),5)]+[round(float(v),7) for v in left[idx]-right[js[at]]]
    return [rows[i] for i in range(len(left))]
forward=compare(can,ref,role_can,role_ref);reverse=compare(ref,can,role_ref,role_can)
for name,rows in [('output-to-reference',forward),('reference-to-output',reverse)]:
    with (a.output/(name+'.csv')).open('w') as f:
        w=csv.writer(f);w.writerow(['frame','paired_by_progress','nearest_in_role','role','role_progress_distance','nearest_distance']+['delta_'+k for k in keys]);w.writerows(rows)
(a.output/'maps.json').write_text(json.dumps({'forward':[r[1:4] for r in forward],'reverse':[r[1:4] for r in reverse]},separators=(',',':')))
summary={}
for name in dict.fromkeys(role_can):
    ix=np.array(role_can)==name;jx=np.array(role_ref)==name
    summary[name]={'output_frames':int(ix.sum()),'reference_frames':int(jx.sum()),'output_means':dict(zip(keys,can[ix].mean(axis=0))), 'reference_means':dict(zip(keys,ref[jx].mean(axis=0)))}
(a.output/'comparison.json').write_text(json.dumps({'reference':json.loads((a.reference/'report.json').read_text())['sha256'],'candidate':json.loads((a.candidate/'report.json').read_text())['sha256'],'coverage':[len(reverse),len(forward)],'scale':scale.tolist(),'roles':summary,'feature_keys':keys,'range_policy':'All decoded frames in both directions. Progress pairing preserves within-role chronology. Nearest pairing is diagnostic only.'},indent=2))
# Each top/bottom pair in the ledger is a consecutive candidate frame and its chronological role counterpart.
pages=a.output/'sheets';pages.mkdir(exist_ok=True);cols=12;rows=10;w=112;h=63;stride=134
for start in range(0,len(forward),cols*rows):
    ledger=Image.new('RGB',(cols*w,rows*stride),'#39352f');dr=ImageDraw.Draw(ledger)
    for k,row in enumerate(forward[start:start+cols*rows]):
        i,j=row[:2];x=(k%cols)*w;y=(k//cols)*stride
        for off,src,idx in [(0,a.reference,j),(h,a.candidate,i)]:
            with Image.open(src/'frames'/f'{idx:05d}.jpg') as im:ledger.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+off))
        dr.line((x,y+2*h+3,x+w-1,y+2*h+3),fill='#6e6355')
    ledger.save(pages/f'{start:04d}.jpg',quality=90)
print(a.output,len(reverse),len(forward))
