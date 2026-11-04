"""Decode every frame and emit descriptive metrics; this does not certify style."""
import cv2,numpy as np,pathlib,json,csv,sys,time
from PIL import Image,ImageDraw
from color_decode import VideoReader
cv2.setNumThreads(2)
file=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
cap=VideoReader(file);fps=cap.fps;expected=cap.expected;w=cap.width;h=cap.height;features=[];prev=None;prevhist=None;shots=[0];sample=[];idx=0;t0=time.time();palette=[]
columns=['frame','seconds','luma','saturation','dark_fraction','bright_fraction','edge_density','flat_fraction','frame_delta','hue_delta','occupied_tiles']+[f'hue_{i}'for i in range(12)]
with (out/'frames.csv').open('w') as f:
 writer=csv.writer(f);writer.writerow(columns)
 while True:
  ok,full=cap.read()
  if not ok:break
  im=cv2.resize(full,(320,180),interpolation=cv2.INTER_AREA);hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV);gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);edges=cv2.Canny(gray,60,140);hist=cv2.calcHist([hsv],[0],None,[12],[0,180]).reshape(-1);hist/=hist.sum();motion=0 if prev is None else float(np.abs(gray.astype(float)-prev).mean()/255);hd=0 if prevhist is None else float(np.abs(hist-prevhist).sum()/2)
  local=cv2.Laplacian(gray,cv2.CV_32F);flat=float((np.abs(local)<5).mean());occupied=sum(edges[y:y+30,x:x+40].mean()>4 for y in range(0,180,30) for x in range(0,320,40))/48
  row=[idx,idx/fps,float(gray.mean()/255),float(hsv[:,:,1].mean()/255),float((gray<40).mean()),float((gray>220).mean()),float((edges>0).mean()),flat,motion,hd,occupied]+hist.tolist();features.append(row);writer.writerow(row)
  if (motion>.16 or (hd>.18 and motion>.06)) and idx-shots[-1]>fps*.25:shots.append(idx)
  if idx%round(fps*5)==0:
   p=out/f't{idx/fps:08.2f}.jpg';cv2.imwrite(str(p),cv2.resize(full,(640,360)),[cv2.IMWRITE_JPEG_QUALITY,86]);sample.append((idx,p))
  if idx%6000==0:print(idx,expected,round(time.time()-t0,1),flush=True)
  prev=gray.astype(float);prevhist=hist;idx+=1
cap.close();data=np.array(features,dtype=np.float32);np.savez_compressed(out/'features.npz',features=data,columns=columns)
summary={'source':str(file),'width':w,'height':h,'fps':fps,'expected_frames':expected,'decoded_frames':idx,'all_frames_decoded':idx==expected if expected is not None else None,'decoded_to_eof':True,'conversion':'Explicit SDR BT.709 matrix and declared range to full-range BGR','seconds':idx/fps,'cuts':shots,'feature_quantiles':{col:np.quantile(data[:,i],[.1,.5,.9]).tolist()for i,col in enumerate(columns[2:],2)},'coverage':'Automatic descriptor extraction on every decoded frame. This is not a manual visual review or a perceptual style certification.'};(out/'summary.json').write_text(json.dumps(summary,indent=2))
for start in range(0,len(sample),48):
 sub=sample[start:start+48];sheet=Image.new('RGB',(1920,8*201),'#090724');draw=ImageDraw.Draw(sheet)
 for j,(f,p)in enumerate(sub):
  im=Image.open(p).resize((320,180));x=j%6*320;y=j//6*201;sheet.paste(im,(x,y));draw.text((x+6,y+183),f'{f/fps:.2f}s / frame {f}',fill='white')
 sheet.save(out/f'overview-{start//48:02d}.jpg',quality=90)
print(json.dumps({k:summary[k]for k in ('decoded_frames','fps','seconds','all_frames_decoded')}),flush=True)
