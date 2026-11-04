"""Content-independent exhaustive frame metrics and navigable image atlases.

Usage: scan_frames.py INPUT_VIDEO OUTPUT_DIRECTORY
Requires opencv-python, numpy, Pillow. Never establishes subjective review.
"""
import cv2,numpy as np,json,csv,pathlib,sys,hashlib,time
from PIL import Image,ImageDraw
if len(sys.argv)!=3:raise SystemExit('Usage: scan_frames.py INPUT_VIDEO OUTPUT_DIRECTORY')
src=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
cap=cv2.VideoCapture(str(src));fps=cap.get(cv2.CAP_PROP_FPS);n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));w=int(cap.get(3));h=int(cap.get(4));assert fps>0
thumbw,thumbh=160,90;cols,rows=10,10;per=cols*rows;sheet=None;draw=None;prev=None;cuts=[];allv=[];idx=0
f=(out/'every-frame.csv').open('w');writer=csv.writer(f);writer.writerow(['frame','seconds','luma','saturation','edge_density','difference','dark_fraction','bright_fraction','hue_cool_fraction'])
while True:
 ok,im=cap.read()
 if not ok:break
 small=cv2.resize(im,(160,90),interpolation=cv2.INTER_AREA);hsv=cv2.cvtColor(small,cv2.COLOR_BGR2HSV);g=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY)
 diff=0 if prev is None else float(np.mean(np.abs(g.astype(float)-prev.astype(float))))/255
 v=[float(g.mean()/255),float(hsv[:,:,1].mean()/255),float((cv2.Canny(g,80,160)>0).mean()),diff,float((g<55).mean()),float((g>220).mean()),float(((hsv[:,:,0]>=85)&(hsv[:,:,0]<=145)).mean())]
 writer.writerow([idx,round(idx/fps,6)]+[round(a,6) for a in v]);allv.append(v)
 if diff>.12 and (not cuts or idx-cuts[-1]>fps*.5):cuts.append(idx)
 if idx%per==0:sheet=Image.new('RGB',(cols*thumbw,rows*(thumbh+16)),'#111122');draw=ImageDraw.Draw(sheet)
 x=(idx%per)%cols*thumbw;y=(idx%per)//cols*(thumbh+16);sheet.paste(Image.fromarray(cv2.cvtColor(small,cv2.COLOR_BGR2RGB)),(x,y));draw.text((x+3,y+thumbh),f'{idx} | {idx/fps:.2f}s',fill='white')
 if idx%per==per-1:sheet.save(out/f'all-{idx//per:04d}.jpg',quality=88)
 if idx%round(fps*5)==0:
  cv2.imwrite(str(out/f'sample-{idx:06d}.jpg'),im,[cv2.IMWRITE_JPEG_QUALITY,92])
 if idx%3000==0:print('Decoded',idx,'/',n,flush=True)
 prev=g;idx+=1
if idx%per:sheet.save(out/f'all-{(idx-1)//per:04d}.jpg',quality=88)
f.close();cap.release();a=np.array(allv)
summary=dict(source=str(src),sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h,fps=fps,declared_frames=n,decoded_frames=idx,all_frames_decoded=idx==n,duration=idx/fps,detected_changes=cuts,feature_means=a.mean(axis=0).tolist(),feature_quantiles=np.quantile(a,[.1,.5,.9],axis=0).tolist(),atlas_frames_per_sheet=per,visual_review='not established by this script')
(out/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({k:summary[k] for k in ['fps','decoded_frames','duration','all_frames_decoded']}),flush=True)
# Overview is explicitly sparse; all native decoded frames are in the atlases above.
files=sorted(out.glob('sample-*.jpg'));cw,ch=320,198
for j in range(0,len(files),30):
 sh=Image.new('RGB',(cw*5,ch*6),'#111122');d=ImageDraw.Draw(sh)
 for i,p in enumerate(files[j:j+30]):
  im=Image.open(p);im.thumbnail((320,180));x=i%5*cw;y=i//5*ch;sh.paste(im,(x,y));d.text((x+4,y+180),f'{int(p.stem.split("-")[1])/fps:.1f}s',fill='white')
 sh.save(out/f'overview-{j//30:02d}.jpg',quality=91)
