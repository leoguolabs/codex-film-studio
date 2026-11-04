import av,numpy as np,pathlib,sys,json,csv,time
from PIL import Image,ImageDraw,ImageFont
if len(sys.argv)!=3:raise SystemExit('Usage: scan_frames.py VIDEO OUTPUT_DIRECTORY')
src=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
(out/'atlases').mkdir(exist_ok=True);(out/'keyframes').mkdir(exist_ok=True)
container=av.open(str(src));stream=container.streams.video[0];fps=float(stream.average_rate)
cols,rows,tw,th=16,15,160,90;per=cols*rows;atlas=None;draw=None;prev=None;cuts=[];stats=[];start=time.time();n=-1
font=ImageFont.load_default()
cf=open(out/'frames.csv','w');w=csv.writer(cf);w.writerow(['frame','pts_seconds','mean_r','mean_g','mean_b','saturation','value','dark_fraction','bright_fraction','edge_density','delta','dominant_r','dominant_g','dominant_b'])
for n,frame in enumerate(container.decode(stream)):
 im=frame.to_image();small=im.resize((160,90),Image.Resampling.BILINEAR);a=np.asarray(small).astype(np.float32)/255
 mx=a.max(2);mn=a.min(2);sat=np.divide(mx-mn,mx,out=np.zeros_like(mx),where=mx>0);g=a.mean(2);delta=float(np.abs(a-prev).mean()) if prev is not None else 0
 ed=(float(np.abs(np.diff(g,axis=0)).mean())+float(np.abs(np.diff(g,axis=1)).mean()))/2
 quant=(a*7).astype(np.int16);codes=quant[:,:,0]*64+quant[:,:,1]*8+quant[:,:,2];code=np.bincount(codes.ravel(),minlength=512).argmax();dom=[(code//64)/7,(code%64//8)/7,(code%8)/7]
 row=[n,float(frame.time or n/fps),*a.mean((0,1)).tolist(),float(sat.mean()),float(mx.mean()),float((mx<.12).mean()),float((mn>.85).mean()),ed,delta,*dom];w.writerow(row);stats.append(row)
 if delta>.15:cuts.append({'frame':n,'time':n/fps,'delta':delta});im.save(out/'keyframes'/f'cut-{n:06d}.jpg',quality=90)
 if n%int(fps*5)==0:im.save(out/'keyframes'/f'frame-{n:06d}.jpg',quality=92)
 if n%per==0:
  if atlas is not None:atlas.save(out/'atlases'/f'{(n//per)-1:04d}.jpg',quality=88)
  atlas=Image.new('RGB',(cols*tw,rows*(th+14)),(20,17,33));draw=ImageDraw.Draw(atlas)
 k=n%per;x=k%cols*tw;y=k//cols*(th+14);atlas.paste(small,(x,y));draw.text((x+2,y+th),f'{n:05d} {n/fps:.2f}s',font=font,fill='white');prev=a
 if n%3600==0:print('decoded',n,'seconds',round(time.time()-start),flush=True)
if n<0:raise RuntimeError('No video frames decoded')
atlas.save(out/'atlases'/f'{n//per:04d}.jpg',quality=88);cf.close()
arr=np.array(stats);report={'source':src.name,'frames':n+1,'fps':fps,'duration':(n+1)/fps,'atlases':n//per+1,'atlas_frame_size':[tw,th],'automated_coverage':'every decoded frame','manual_review':'tracked separately; atlas generation is not visual review','metrics':{k:{'mean':float(arr[:,j].mean()),'q10':float(np.quantile(arr[:,j],.1)),'q50':float(np.median(arr[:,j])),'q90':float(np.quantile(arr[:,j],.9))} for j,k in [(5,'saturation'),(6,'value'),(7,'dark_fraction'),(8,'bright_fraction'),(9,'edge_density'),(10,'delta')]},'cut_candidates':cuts,'elapsed_seconds':time.time()-start}
(out/'summary.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k not in ['cut_candidates','metrics']}),flush=True)
