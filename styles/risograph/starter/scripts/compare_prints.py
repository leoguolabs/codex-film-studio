"""Pair two complete decoded films by matching scene roles and within-shot progress.

Each list marks shot starts in seconds, followed by the film end. For films with
different editing, use a common sequence of semantic beats in the two lists.
Full-size frames are decoded for spot screen, paper, ink and temporal diagnostics.
"""
import argparse, csv, hashlib, json
from pathlib import Path
import cv2, numpy as np
from PIL import Image, ImageDraw
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('reference',type=Path);p.add_argument('output',type=Path)
p.add_argument('refscan',type=Path);p.add_argument('outscan',type=Path);p.add_argument('directory',type=Path)
p.add_argument('roles',type=Path);args=p.parse_args();folder=args.directory;folder.mkdir(parents=True,exist_ok=True)
roles=json.loads(args.roles.read_text())
def measure(video,scan):
    info=json.loads((scan/'report.json').read_text())
    sha=hashlib.sha256(video.read_bytes()).hexdigest()
    if sha!=info['sha256']:raise ValueError('Stale scan for '+str(video))
    scanrows=json.loads((scan/'frames.json').read_text());cap=cv2.VideoCapture(str(video))
    result=[]
    while True:
        ok,pic=cap.read()
        if not ok:break
        i=len(result);b,g,r=(a.astype(np.int16) for a in cv2.split(pic[::4,::4]))
        # Thresholds are operational proxies for a predominantly visible spot on an area.
        # Printed overlaps, paper highlights and all other colours remain in the measurements.
        blue=(b>r+27)&(g>r+18);yellow=(r>b+42)&(g>b+30);pink=(r>g+42)&(b>g+21)
        paper=(r>221)&(g>215)&(b>198)&(r>=g)&(np.abs(r-b)<31)
        native=cv2.cvtColor(pic,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
        hp=np.abs(native-cv2.GaussianBlur(native,(0,0),1.8))
        row=scanrows[i]
        result.append(dict(blue=float(blue.mean()),yellow=float(yellow.mean()),pink=float(pink.mean()),paper=float(paper.mean()),native_detail=float(hp.mean()),luma=row['luma'],saturation=row['saturation'],change=row['frame_delta']))
    cap.release()
    if len(result)!=info['decoded_frames']:raise ValueError('Decode count mismatch')
    return result,info
def write_csv(name,rows):
    with (folder/name).open('w') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
ref,ri=measure(args.reference,args.refscan);out,oi=measure(args.output,args.outscan)
def mapping(src,dst,ns,nd,srcname,dstname):
    cuts=[round(x[src]*24) for x in roles];others=[round(x[dst]*24) for x in roles]
    if cuts[0]!=0 or cuts[-1]!=ns or others[-1]!=nd or any(a>=b for a,b in zip(cuts,cuts[1:])):raise ValueError('Invalid shot roles')
    pairs=[]
    for j,(a,b,c,d) in enumerate(zip(cuts,cuts[1:],others,others[1:])):
        for i in range(a,b):
            k=c+round((i-a)*(d-c-1)/max(1,b-a-1));pairs.append({srcname:i,dstname:k,'role':roles[j]['name']})
    return pairs
fw=mapping('new','ref',len(out),len(ref),'output_frame','reference_frame'); rev=mapping('ref','new',len(ref),len(out),'reference_frame','output_frame')
for pairs,name in [(fw,'output-to-reference'),(rev,'reference-to-output')]:
    for pair in pairs:
        a=ref[pair['reference_frame']];b=out[pair['output_frame']]
        for key in a:pair['ref_'+key]=round(a[key],6);pair['out_'+key]=round(b[key],6);pair['delta_'+key]=round(b[key]-a[key],6)
    write_csv(name+'.csv',pairs)
# Directed, side-by-side paired strips, one complete row of corresponding source and new frames.
# Repeated mappings are retained to make both the count and temporal direction explicit.
def sheets(pairs,name):
    od=folder/name;od.mkdir(exist_ok=True); per=80;cols=10;w,h=109,61
    for start in range(0,len(pairs),per):
        block=pairs[start:start+per];rows=(len(block)+cols-1)//cols
        im=Image.new('RGB',(w*cols,rows*(2*h+11)),'#f5f1e4');dr=ImageDraw.Draw(im)
        for j,row in enumerate(block):
            x=(j%cols)*w;y=(j//cols)*(2*h+11)
            for offset,scan,key in [(0,args.refscan,'reference_frame'),(h,args.outscan,'output_frame')]:
                with Image.open(scan/'frames'/f"{row[key]:05d}.jpg") as f:im.paste(f.resize((w,h),Image.Resampling.LANCZOS),(x,y+offset))
            dr.text((x+2,y+2*h-1),f"{row['reference_frame']}/{row['output_frame']}",fill='#191d1a')
        im.save(od/f'{start:04}.jpg',quality=91)
sheets(fw,'sheets');different=[r for r in rev if r['reference_frame'] not in {v['reference_frame'] for v in fw}]
if different:sheets(different,'additional-reference-frames')
report={'reference_sha256':ri['sha256'],'output_sha256':oi['sha256'],'reference_frames':len(rev),'output_frames':len(fw),'extra_reference_thumbnails':len(different),'roles':roles,'metrics':{}}
for role in roles[:-1]:
    rows=[r for r in fw if r['role']==role['name']]
    report['metrics'][role['name']]={k:{side:round(float(np.mean([r[side+'_'+k] for r in rows])),4) for side in ('ref','out')} for k in ref[0]}
(folder/'comparison.json').write_text(json.dumps(report,indent=2))
print({k:v for k,v in report.items() if k not in ('roles','metrics')})
