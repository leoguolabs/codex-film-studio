"""Decode every encoded frame and retain non-skipping sequential review atlases.
This generates evidence, not a visual acceptance decision.
"""
import argparse,json,hashlib
from pathlib import Path
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('out');p.add_argument('--cols',type=int,default=6);p.add_argument('--rows',type=int,default=8);p.add_argument('--thumb-width',type=int);p.add_argument('--label-height',type=int,default=21);p.add_argument('--expect-frames',type=int);a=p.parse_args()
if min(a.cols,a.rows,a.label_height)<1 or (a.thumb_width is not None and a.thumb_width<32):p.error('Positive atlas geometry required; thumbnail width must be at least 32')
v=Path(a.video);o=Path(a.out);o.mkdir(parents=True,exist_ok=True)
c=cv2.VideoCapture(str(v));fps=c.get(cv2.CAP_PROP_FPS);w=int(c.get(3));h=int(c.get(4));declared=int(c.get(cv2.CAP_PROP_FRAME_COUNT))
if not c.isOpened() or min(fps,w,h)<=0:raise SystemExit('Unreadable video or invalid geometry')
tw=a.thumb_width or (240 if w>=h else 150);th=round(tw*h/w);pad=a.label_height;count=0;metrics=[];prev=None;sheet=None
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',max(6,min(12,pad-2)))
except OSError:font=ImageFont.load_default()
while True:
 ok,bgr=c.read()
 if not ok:break
 rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB);small=cv2.resize(rgb,(tw,th));gray=cv2.cvtColor(small,cv2.COLOR_RGB2GRAY)
 metrics.append({'frame':count,'seconds':round(count/fps,6),'mean':round(float(gray.mean()),3),'std':round(float(gray.std()),3),'change':None if prev is None else round(float(np.abs(gray.astype(float)-prev).mean()),3),'sha256':hashlib.sha256(rgb.tobytes()).hexdigest()});prev=gray.astype(float)
 slot=count%(a.cols*a.rows)
 if slot==0:sheet=Image.new('RGB',(tw*a.cols,(th+pad)*a.rows),'#101118')
 x=(slot%a.cols)*tw;y=(slot//a.cols)*(th+pad);sheet.paste(Image.fromarray(small),(x,y));ImageDraw.Draw(sheet).text((x+4,y+th+3),f'{count:05d}   {count/fps:07.3f}s',font=font,fill='white')
 if slot==a.cols*a.rows-1:sheet.save(o/f'atlas-{count//(a.cols*a.rows):03d}.jpg',quality=92)
 if count%round(fps)==0:Image.fromarray(rgb).resize((min(w,960),round(h*min(w,960)/w))).save(o/f'second-{count//round(fps):03d}.jpg',quality=92)
 count+=1
if count%(a.cols*a.rows):sheet.save(o/f'atlas-{(count-1)//(a.cols*a.rows):03d}.jpg',quality=92)
c.release()
(o/'frames.json').write_text(json.dumps({'source':str(v),'sha256':hashlib.sha256(v.read_bytes()).hexdigest(),'fps':fps,'width':w,'height':h,'frames':count,'declared_frames':declared,'atlas':{'cols':a.cols,'rows':a.rows,'thumbnail':[tw,th],'label_height':pad},'rows':metrics,'visual_review':'pending; atlases are generated evidence, not inspected evidence'},indent=2))
if not count or (a.expect_frames is not None and count!=a.expect_frames):raise SystemExit(f'Decoded frame count {count} differs from expected {a.expect_frames}')
print(json.dumps({'frames':count,'fps':fps,'size':[w,h],'atlas_count':(count+a.cols*a.rows-1)//(a.cols*a.rows)}))
