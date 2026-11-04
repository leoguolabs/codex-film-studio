import {drawCel,drawPaper} from './print.mjs';
import {layers,proofLayers} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  await layers(c,{...s,shot},(c,l)=>drawCel(c,l.points,l.fill,s.frame,{color:l.stroke,width:l.width||4,seed:l.seed||1}));
  drawPaper(c,s.plan.width,s.plan.height,{seed:31});
}
