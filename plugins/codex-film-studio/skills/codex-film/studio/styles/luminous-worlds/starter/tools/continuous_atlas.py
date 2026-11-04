"""Make a presentation-order frame atlas; generation never counts as inspection."""
import argparse,hashlib,json,math
from pathlib import Path
import cv2
from PIL import Image,ImageDraw
from color_decode import VideoReader

parser=argparse.ArgumentParser()
parser.add_argument('video',type=Path)
parser.add_argument('output',type=Path)
parser.add_argument('--width',type=int,default=160)
parser.add_argument('--columns',type=int,default=12)
parser.add_argument('--rows',type=int,default=8)
args=parser.parse_args()
assert args.width>0 and args.columns>0 and args.rows>0
args.output.mkdir(parents=True,exist_ok=True)
cv2.setNumThreads(2)
cap=VideoReader(args.video)
height=round(args.width*cap.height/cap.width)
cell_height=height+22;per_page=args.columns*args.rows
pages=[];frame=0;page=None
while True:
 ok,pixels=cap.read()
 if not ok:break
 if frame%per_page==0:
  page=Image.new('RGB',(args.columns*args.width,args.rows*cell_height),'#090724');draw=ImageDraw.Draw(page)
 slot=frame%per_page;x=slot%args.columns*args.width;y=slot//args.columns*cell_height
 picture=Image.fromarray(cv2.cvtColor(cv2.resize(pixels,(args.width,height)),cv2.COLOR_BGR2RGB))
 page.paste(picture,(x,y));draw.text((x+4,y+height+3),str(frame),fill='white')
 frame+=1
 if frame%per_page==0:
  name=f'frames-{len(pages):04}.jpg';path=args.output/name;page.save(path,quality=94)
  pages.append({'file':name,'range':[frame-per_page,frame],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});page=None
if page is not None:
 name=f'frames-{len(pages):04}.jpg';path=args.output/name;page.save(path,quality=94)
 pages.append({'file':name,'range':[frame-frame%per_page,frame],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
cap.close()
manifest={'video':str(args.video.resolve()),'video_sha256':hashlib.sha256(args.video.read_bytes()).hexdigest(),'decoded_frames':frame,'thumbnail_size':[args.width,height],'conversion':'Explicit SDR BT.709 matrix and declared range to full-range RGB','range_convention':'zero-based half-open','pages':pages,'inspected_pages':[],'note':'Generated only. Record actual viewing and observations separately; atlas creation is not manual review.'}
(args.output/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'decoded_frames':frame,'pages':len(pages),'thumbnail_size':[args.width,height],'conversion':'Explicit SDR BT.709 matrix and declared range to full-range RGB'}),flush=True)
