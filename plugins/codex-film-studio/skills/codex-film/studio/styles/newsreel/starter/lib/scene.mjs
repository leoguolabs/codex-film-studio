import {transitionMask,printFinish,paperTurn,montagePose,settle} from './newsprint.mjs';
import {layers,proofLayers,polygon} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const {width:w,height:h}=s.plan;
  c.save();c.beginPath();c.roundRect(w*.115,0,w*.77,h,28);c.clip();
  transitionMask(c,s.shot.transition||'none',s.progress,w,h);
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  await layers(c,{...s,shot},(c,l)=>{
    const card=(file,width,height)=>{c.fillStyle='#f1ead9';c.shadowColor='#20160f66';c.shadowBlur=12;c.shadowOffsetY=6;c.fillRect(0,0,width,height);c.shadowBlur=0;c.shadowOffsetY=0;if(file){const image=s.assets.get(file);if(!image)throw Error(`Undeclared paper image: ${file}`);c.drawImage(image,8,8,width-16,height-16);}};
    if(l.type==='montage'){
      if(l.files?.length!==9)throw Error('A newsreel montage requires nine declared images');
      const width=l.width||w*.68,height=l.height||h*.7,cardWidth=width/5.4,cardHeight=height/2.15;
      for(let i=0;i<9;i++){const p=montagePose(i,s.localFrame,{fps:s.plan.fps,...l.timing});if(!p.visible)continue;c.save();c.translate(p.x*width,p.y*height+(1-p.enter)*height);c.rotate(p.rotation);card(l.files[i],cardWidth,cardHeight);c.restore();}
      const first=montagePose(0,s.localFrame,{fps:s.plan.fps,...l.timing});
      if(first.flip>0){const index=Math.min(8,Math.floor(first.flip*9)),scale=settle(first.flip);c.save();c.translate(width*.25*scale,height*.02*scale);card(l.files[index],cardWidth+(width*.5-cardWidth)*scale,cardHeight+(height-cardHeight)*scale);c.restore();}
    }else if(l.type==='headline'){
      const p=settle(Math.min(1,s.progress/(l.settleAt||.3)));c.rotate((1-p)*Math.PI*4);c.scale(.15+.85*p,.15+.85*p);card(l.file,l.width||w*.6,l.height||h*.65);
    }else if(l.type==='paper-turn'){const pose=paperTurn(l.progress??s.progress,l.width);c.scale(pose.scaleX,1);card(pose.back?l.backFile:l.file,l.width,l.height);c.fillStyle=`rgba(20,13,7,${pose.shadow})`;c.fillRect(0,0,l.width,l.height);}
    else {c.shadowColor='#20160f44';c.shadowBlur=14;c.shadowOffsetY=7;polygon(c,l.points,l.fill,l.stroke,2);}
  });
  c.restore();printFinish(c,s.frame,w,h);
  c.fillStyle='#19140f';c.fillRect(0,0,w*.115,h);c.fillRect(w*.885,0,w*.115,h);
}
