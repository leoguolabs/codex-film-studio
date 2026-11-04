import {captionPose} from './caption.mjs';
import {layers,proofLayers,polygon} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  await layers(c,{...s,shot},(c,l)=>{
    if(l.type==='headline'){
      const pose=captionPose(s.localFrame,{start:l.start||0,duration:l.entrance||8,scaleFrom:1.15,travelY:30});
      if(!pose.visible)return;c.translate(0,pose.offsetY);c.scale(pose.scale,pose.scale);
      c.textAlign='left';c.textBaseline='alphabetic';
      c.font=`${l.size||100}px "${s.profile.font}"`;const w=c.measureText(l.text).width;
      if(l.maxWidth&&w>l.maxWidth)throw Error('Headline needs a shorter phrase');
      c.fillStyle=l.highlight||s.profile.accent;c.fillRect(-12,-(l.size||100),w*pose.highlight+24,(l.size||100)*1.2);
      c.fillStyle='#151515';c.fillText(l.text,0,0);
    }else polygon(c,l.points,l.fill,l.stroke,3);
  });
}
